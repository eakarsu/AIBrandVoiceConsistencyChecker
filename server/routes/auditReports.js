const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { callOpenRouter, parseLabeledFields, saveAIResult, DEFAULT_MODEL } = require('../lib/aiHelpers');
const router = express.Router();

const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'Too many AI requests. Limit: 20 per hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const countResult = await pool.query('SELECT COUNT(*) FROM audit_reports');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query('SELECT * FROM audit_reports ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM audit_reports WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, aiRateLimiter, async (req, res) => {
  try {
    const { title, brand_profile_id, audit_scope, content_samples } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });

    const aiResponse = await callOpenRouter(
      `You are a brand voice auditor. Generate a comprehensive audit report for brand voice consistency.

      Return the audit in this format:
      EXECUTIVE_SUMMARY: [paragraph]
      OVERALL_CONSISTENCY_SCORE: [0-100 integer]
      CHANNEL_SCORES: [breakdown by channel]
      COMPLIANCE_RATE: [0-100 integer]
      TOP_ISSUES: [numbered list]
      RECOMMENDATIONS: [prioritized list]
      TREND_ANALYSIS: [improvement/decline areas]
      ACTION_ITEMS: [specific next steps]
      RISK_AREAS: [potential brand voice risks]`,
      `Generate an audit report:\n\nTitle: ${title}\nScope: ${audit_scope || 'full audit'}\nContent Samples: ${content_samples || 'general review'}`
    );

    const fields = parseLabeledFields(aiResponse, ['OVERALL_CONSISTENCY_SCORE', 'COMPLIANCE_RATE']);
    const overall_score = parseInt(String(fields.overall_consistency_score || '').match(/\d+/)?.[0] || '0', 10);

    const result = await pool.query(
      `INSERT INTO audit_reports (title, brand_profile_id, audit_scope, ai_analysis, overall_score, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, brand_profile_id, audit_scope, aiResponse, overall_score || 0, 'completed']
    );

    await saveAIResult(pool, {
      user_id: req.user?.id,
      feature: 'audit-report',
      input: { title, brand_profile_id, audit_scope },
      output: { ...fields, overall_score },
      raw_text: aiResponse,
      model: DEFAULT_MODEL,
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, audit_scope, brand_profile_id } = req.body;
    const result = await pool.query(
      `UPDATE audit_reports SET title=$1, audit_scope=$2, brand_profile_id=$3, updated_at=NOW() WHERE id=$4 RETURNING *`,
      [title, audit_scope, brand_profile_id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM audit_reports WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
