/**
 * Apply pass 5 — backlog endpoints for AIBrandVoiceConsistencyChecker.
 *
 * Mounts under `/api/extras`. All endpoints are auth-gated. Heavy/external
 * integrations are gated on env vars and return HTTP 503 + `{ missing: <ENV> }`
 * when unset so the FE can render a clear "not configured" state.
 *
 * Categories applied here:
 *   1. notifications        — NEEDS-CREDS  (SMTP_HOST). Stub email queue.
 *      Env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *   2. webhook-deliveries   — TOO-RISKY    in-memory delivery queue stub
 *                              (no outbound HTTP, no background workers).
 *   3. agent-orchestration  — NEEDS-PRODUCT-DECISION. Default: linear
 *      pipeline (analyze -> tone -> approve) per content item. Documented
 *      in PRODUCT-DECISION comment.
 *   4. rag-brand-docs       — TOO-RISKY. In-memory cosine-sim retrieval over
 *                              hashed pseudo-embeddings. CREATE TABLE IF
 *                              NOT EXISTS for persistence.
 *   5. whitelabel           — NEEDS-PRODUCT-DECISION. Default: single-tenant
 *      branding stored in `whitelabel_config` row with id=1.
 */
const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../lib/aiHelpers');

const router = express.Router();

// Helper: forward AI errors → 503 when key missing, 502 otherwise.
function aiErrorOrPass(res, result) {
  if (result && typeof result === 'object' && result.error) {
    if (typeof result.error === 'string' && result.error.includes('OPENROUTER_API_KEY')) {
      return res.status(503).json({ error: 'AI not configured', missing: 'OPENROUTER_API_KEY' });
    }
    return res.status(502).json({ error: result.error });
  }
  return null;
}

// --- 1. NOTIFICATIONS (NEEDS-CREDS: SMTP_HOST) ------------------------------
// Env vars consumed: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.
// We never actually connect to SMTP here — too many failure modes without
// nodemailer. Endpoint records intent, gates on SMTP_HOST so callers can wire
// a real provider later without changing the surface.
async function ensureNotificationsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications_outbox (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        channel VARCHAR(20) NOT NULL,
        recipient TEXT NOT NULL,
        subject TEXT,
        body TEXT,
        status VARCHAR(20) DEFAULT 'queued',
        meta JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_notif_outbox_user ON notifications_outbox(user_id);
    `);
  } catch (_) { /* lazy table */ }
}
ensureNotificationsTable();

router.post('/notifications/send', auth, async (req, res) => {
  try {
    if (!process.env.SMTP_HOST) {
      return res.status(503).json({
        error: 'Email notifications not configured',
        missing: 'SMTP_HOST',
        also_required: ['SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'],
      });
    }
    const { to, subject, body, channel = 'email' } = req.body || {};
    if (!to || !subject) return res.status(400).json({ error: 'to and subject required' });
    const ins = await pool.query(
      `INSERT INTO notifications_outbox (user_id, channel, recipient, subject, body, status, meta)
       VALUES ($1, $2, $3, $4, $5, 'queued', $6) RETURNING *`,
      [req.user?.id || null, channel, to, subject, body || '', JSON.stringify({ smtp_host: process.env.SMTP_HOST })]
    );
    return res.status(202).json({ queued: true, notification: ins.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/notifications', auth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, channel, recipient, subject, status, created_at
       FROM notifications_outbox WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.user?.id || null]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 2. WEBHOOK DELIVERIES (TOO-RISKY: in-memory queue) ---------------------
// PRODUCT-DECISION: do NOT actually fire outbound HTTP from this endpoint. A
// real implementation would need a durable queue (BullMQ, SQS, etc.) plus a
// worker. Here we record the delivery attempt in a table and an in-process
// queue so the FE can show pending/sent counts.
const inMemDeliveryQueue = [];
async function ensureDeliveriesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id SERIAL PRIMARY KEY,
        webhook_id INTEGER,
        event VARCHAR(100),
        payload JSONB,
        status VARCHAR(20) DEFAULT 'pending',
        attempts INT DEFAULT 0,
        last_error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } catch (_) {}
}
ensureDeliveriesTable();

router.post('/webhook-deliveries/enqueue', auth, async (req, res) => {
  try {
    const { webhook_id, event, payload } = req.body || {};
    if (!event) return res.status(400).json({ error: 'event required' });
    inMemDeliveryQueue.push({ webhook_id, event, payload, ts: Date.now() });
    let row = null;
    try {
      const ins = await pool.query(
        `INSERT INTO webhook_deliveries (webhook_id, event, payload, status)
         VALUES ($1, $2, $3, 'pending') RETURNING *`,
        [webhook_id || null, event, JSON.stringify(payload || {})]
      );
      row = ins.rows[0];
    } catch (_) { /* table missing */ }
    return res.status(202).json({ enqueued: true, in_memory_depth: inMemDeliveryQueue.length, delivery: row });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/webhook-deliveries', auth, async (req, res) => {
  try {
    let rows = [];
    try {
      const r = await pool.query(
        `SELECT id, webhook_id, event, status, attempts, created_at
         FROM webhook_deliveries ORDER BY created_at DESC LIMIT 100`
      );
      rows = r.rows;
    } catch (_) {}
    res.json({ in_memory_depth: inMemDeliveryQueue.length, deliveries: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 3. AGENT ORCHESTRATION (NEEDS-PRODUCT-DECISION) ------------------------
// PRODUCT-DECISION: default agent topology is a linear pipeline that runs
// (a) brand-voice check, (b) tone classification, (c) approval suggestion,
// each with its own short prompt. Multi-agent debate / hierarchical
// supervisors deferred — picked sequential because it costs ~3x one call,
// is deterministic to debug, and matches the existing single-prompt UX.
router.post('/agents/run-pipeline', auth, async (req, res) => {
  try {
    const { content, brand_voice = '' } = req.body || {};
    if (!content) return res.status(400).json({ error: 'content required' });

    const stageA = await callOpenRouter(
      'You are a brand voice consistency checker. Score 0-100 and list deviations as JSON.',
      `Brand voice: ${brand_voice}\nContent: ${content}\nReturn {"score": int, "deviations": [string]}.`,
      { temperature: 0.2, max_tokens: 600 }
    ).catch(e => ({ error: e.message }));
    const errA = aiErrorOrPass(res, stageA); if (errA) return errA;

    const stageB = await callOpenRouter(
      'You are a tone classifier. Identify primary tone and confidence. JSON only.',
      `Content: ${content}\nReturn {"tone": string, "confidence": 0..1, "secondary_tones": [string]}.`,
      { temperature: 0.2, max_tokens: 400 }
    ).catch(e => ({ error: e.message }));
    if (stageB && stageB.error) return res.status(502).json({ error: stageB.error, stage: 'tone' });

    const stageC = await callOpenRouter(
      'You are an approval-workflow recommender. Recommend approve/revise/reject with reasons. JSON only.',
      `Voice check: ${typeof stageA === 'string' ? stageA : JSON.stringify(stageA)}\nTone: ${typeof stageB === 'string' ? stageB : JSON.stringify(stageB)}\nReturn {"decision": "approve|revise|reject", "reasons": [string], "fixes": [string]}.`,
      { temperature: 0.2, max_tokens: 500 }
    ).catch(e => ({ error: e.message }));
    if (stageC && stageC.error) return res.status(502).json({ error: stageC.error, stage: 'approval' });

    return res.json({
      pipeline: 'linear:voice->tone->approval',
      stages: { voice_check: stageA, tone: stageB, approval: stageC },
      note: 'PRODUCT-DECISION: linear pipeline; multi-agent topology deferred.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 4. RAG BRAND DOCS (TOO-RISKY) ------------------------------------------
// In-memory pseudo-embeddings (hashed bag-of-words). Lets us ship the surface
// without pulling a real vector DB or embedding model. CREATE TABLE IF NOT
// EXISTS for the corpus; cosine sim on the JS side.
async function ensureRagTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rag_brand_docs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        title TEXT,
        body TEXT NOT NULL,
        meta JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_rag_user ON rag_brand_docs(user_id);
    `);
  } catch (_) {}
}
ensureRagTable();

function pseudoEmbed(text) {
  // 64-dim hashed bag-of-words. Crude but stable + dependency-free.
  const v = new Array(64).fill(0);
  const tokens = String(text || '').toLowerCase().match(/[a-z0-9']+/g) || [];
  for (const t of tokens) {
    let h = 0;
    for (let i = 0; i < t.length; i += 1) h = (h * 31 + t.charCodeAt(i)) | 0;
    v[Math.abs(h) % 64] += 1;
  }
  // L2 normalize
  let n = 0; for (const x of v) n += x * x; n = Math.sqrt(n) || 1;
  return v.map(x => x / n);
}
function cosine(a, b) {
  let s = 0; for (let i = 0; i < a.length; i += 1) s += a[i] * b[i]; return s;
}

router.post('/rag/ingest', auth, async (req, res) => {
  try {
    const { title, body, meta } = req.body || {};
    if (!body) return res.status(400).json({ error: 'body required' });
    const r = await pool.query(
      `INSERT INTO rag_brand_docs (user_id, title, body, meta)
       VALUES ($1, $2, $3, $4) RETURNING id, title, created_at`,
      [req.user?.id || null, title || null, body, JSON.stringify(meta || {})]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/rag/query', auth, async (req, res) => {
  try {
    const { query, k = 3 } = req.body || {};
    if (!query) return res.status(400).json({ error: 'query required' });
    const r = await pool.query(
      `SELECT id, title, body FROM rag_brand_docs WHERE user_id = $1 OR user_id IS NULL`,
      [req.user?.id || null]
    );
    const qv = pseudoEmbed(query);
    const scored = r.rows.map(row => ({
      id: row.id, title: row.title, body: row.body,
      score: cosine(qv, pseudoEmbed(`${row.title || ''} ${row.body}`)),
    })).sort((a, b) => b.score - a.score).slice(0, Math.max(1, Math.min(20, parseInt(k, 10) || 3)));
    res.json({ matches: scored, embedding_strategy: 'in-memory pseudo (hashed bag-of-words, 64d)' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 5. WHITELABEL CONFIG (NEEDS-PRODUCT-DECISION) --------------------------
// PRODUCT-DECISION: single-tenant config row (id=1). Multi-tenant requires a
// tenant model + auth scoping that this codebase doesn't currently expose.
async function ensureWhitelabelTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS whitelabel_config (
        id INT PRIMARY KEY,
        product_name TEXT,
        primary_color VARCHAR(20),
        logo_url TEXT,
        support_email TEXT,
        custom_domain TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } catch (_) {}
}
ensureWhitelabelTable();

router.get('/whitelabel', auth, async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM whitelabel_config WHERE id = 1`);
    res.json(r.rows[0] || { id: 1, product_name: 'AI Brand Voice Consistency Checker' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/whitelabel', auth, async (req, res) => {
  try {
    const { product_name, primary_color, logo_url, support_email, custom_domain } = req.body || {};
    await pool.query(
      `INSERT INTO whitelabel_config (id, product_name, primary_color, logo_url, support_email, custom_domain, updated_at)
       VALUES (1, $1, $2, $3, $4, $5, NOW())
       ON CONFLICT (id) DO UPDATE SET
         product_name = EXCLUDED.product_name,
         primary_color = EXCLUDED.primary_color,
         logo_url = EXCLUDED.logo_url,
         support_email = EXCLUDED.support_email,
         custom_domain = EXCLUDED.custom_domain,
         updated_at = NOW()`,
      [product_name || null, primary_color || null, logo_url || null, support_email || null, custom_domain || null]
    );
    const r = await pool.query(`SELECT * FROM whitelabel_config WHERE id = 1`);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
