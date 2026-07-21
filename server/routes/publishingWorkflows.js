'use strict';
const crypto = require('crypto');
const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { PublishingError, reviewDraft, approveForPublishing } = require('../domain/publishingWorkflow');
const router = express.Router();
const tenantFor = (user) => String(user.tenantId || `user:${user.id}`);

router.post('/', auth, async (req, res, next) => {
  const key = req.get('Idempotency-Key');
  if (!key || key.length > 200) return res.status(400).json({ error: 'A valid Idempotency-Key header is required' });
  let review; try { review = reviewDraft(req.body); } catch (error) { return res.status(422).json({ error: error.message, code: error.code }); }
  const hash = crypto.createHash('sha256').update(JSON.stringify(req.body)).digest('hex');
  const client = await pool.connect().catch(() => null); if (!client) return res.status(503).json({ error: 'Workflow store unavailable' });
  try {
    await client.query('BEGIN'); const id = crypto.randomUUID();
    const inserted = await client.query(`INSERT INTO publishing_workflows
      (id,tenant_id,idempotency_key,request_hash,draft_id,channel,status,review,created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (tenant_id,idempotency_key) DO NOTHING RETURNING *`,
      [id, tenantFor(req.user), key, hash, review.draftId, review.channel, review.status, review, req.user.id]);
    let workflow = inserted.rows[0];
    if (!workflow) {
      workflow = (await client.query('SELECT * FROM publishing_workflows WHERE tenant_id=$1 AND idempotency_key=$2', [tenantFor(req.user), key])).rows[0];
      if (workflow.request_hash !== hash) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Idempotency-Key was reused with different input' }); }
      await client.query('COMMIT'); return res.json({ workflow, replayed: true });
    }
    await client.query(`INSERT INTO publishing_events (id,workflow_id,tenant_id,actor_id,event_type,to_status,evidence_hash)
      VALUES ($1,$2,$3,$4,'draft.reviewed',$5,$6)`, [crypto.randomUUID(), id, tenantFor(req.user), req.user.id, review.status, review.contentHash]);
    await client.query('COMMIT'); res.status(201).json({ workflow });
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); if (error.code === '42P01') return res.status(503).json({ error: 'Database migration is required', code: 'MIGRATION_REQUIRED' }); next(error); }
  finally { client.release(); }
});

router.get('/:id', auth, async (req, res, next) => {
  try { const result = await pool.query(`SELECT w.*,COALESCE(json_agg(e ORDER BY e.created_at) FILTER (WHERE e.id IS NOT NULL),'[]') events FROM publishing_workflows w LEFT JOIN publishing_events e ON e.workflow_id=w.id WHERE w.id=$1 AND w.tenant_id=$2 GROUP BY w.id`, [req.params.id, tenantFor(req.user)]); if (!result.rows[0]) return res.status(404).json({ error: 'Workflow not found' }); res.json({ workflow: result.rows[0] }); } catch (error) { next(error); }
});

router.post('/:id/approve', auth, async (req, res, next) => {
  const client = await pool.connect().catch(() => null); if (!client) return res.status(503).json({ error: 'Workflow store unavailable' });
  try {
    await client.query('BEGIN'); const row = (await client.query('SELECT * FROM publishing_workflows WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [req.params.id, tenantFor(req.user)])).rows[0];
    if (!row) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Workflow not found' }); }
    let approved; try { approved = approveForPublishing(row.review, req.user); } catch (error) { await client.query('ROLLBACK'); return res.status(error.code === 'FORBIDDEN' ? 403 : 409).json({ error: error.message, code: error.code }); }
    const updated = (await client.query(`UPDATE publishing_workflows SET status=$1,review=$2,approved_by=$3,version=version+1,updated_at=NOW() WHERE id=$4 AND version=$5 RETURNING *`, [approved.status, approved, req.user.id, row.id, row.version])).rows[0];
    if (!updated) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Workflow was concurrently modified' }); }
    await client.query(`INSERT INTO publishing_events (id,workflow_id,tenant_id,actor_id,event_type,from_status,to_status,evidence_hash) VALUES ($1,$2,$3,$4,'draft.approved',$5,$6,$7)`, [crypto.randomUUID(), row.id, row.tenant_id, req.user.id, row.status, approved.status, approved.contentHash]);
    await client.query('COMMIT'); res.json({ workflow: updated, publish: { status: 'approval_recorded', note: 'No CMS delivery occurs until a separately configured provider adapter succeeds.' } });
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); next(error); } finally { client.release(); }
});
module.exports = router;
