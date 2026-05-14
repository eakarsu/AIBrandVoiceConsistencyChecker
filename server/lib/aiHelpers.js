// Shared AI helpers for AIBrandVoiceConsistencyChecker.
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

async function callOpenRouter(systemPrompt, userPrompt, opts = {}) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
      'X-Title': 'AI Brand Voice Consistency Checker',
    },
    body: JSON.stringify({
      model: opts.model || DEFAULT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens || 2000,
    }),
  });
  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${txt.slice(0, 500)}`);
  }
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.choices[0].message.content;
}

function parseAIJson(text) {
  if (!text || typeof text !== 'string') return null;
  try { return JSON.parse(text); } catch (_) {}
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    try { return JSON.parse(fenced[1].trim()); } catch (_) {}
  }
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch (_) {}
  }
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]); } catch (_) {}
  }
  return null;
}

// Parse "KEY: value" blocks (CONSISTENCY_SCORE: 87) used by brand voice prompts
function parseLabeledFields(text, keys) {
  const out = {};
  if (!text) return out;
  for (const k of keys) {
    const re = new RegExp(`${k}\\s*:\\s*([^\\n]+)`, 'i');
    const m = text.match(re);
    if (m) out[k.toLowerCase()] = m[1].trim();
  }
  return out;
}

let aiResultsEnsured = false;
async function ensureAIResultsTable(pool) {
  if (aiResultsEnsured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_results (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      feature VARCHAR(100) NOT NULL,
      input JSONB,
      output JSONB,
      raw_text TEXT,
      model VARCHAR(200),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ai_results_feature ON ai_results(feature);
    CREATE INDEX IF NOT EXISTS idx_ai_results_user ON ai_results(user_id);
  `);
  aiResultsEnsured = true;
}

async function saveAIResult(pool, { user_id, feature, input, output, raw_text, model }) {
  try {
    await ensureAIResultsTable(pool);
    await pool.query(
      `INSERT INTO ai_results (user_id, feature, input, output, raw_text, model)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user_id || null, feature, JSON.stringify(input || {}), JSON.stringify(output || null), raw_text || null, model || DEFAULT_MODEL]
    );
  } catch (e) {
    console.warn('saveAIResult failed:', e.message);
  }
}

module.exports = { callOpenRouter, parseAIJson, parseLabeledFields, ensureAIResultsTable, saveAIResult, DEFAULT_MODEL };
