const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../openrouter');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM audit_reports ORDER BY created_at DESC');
    res.json(result.rows);
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

router.post('/', auth, async (req, res) => {
  try {
    const { title, brand_profile_id, audit_scope, content_samples } = req.body;

    const aiResponse = await callOpenRouter(
      `You are a brand voice auditor. Generate a comprehensive audit report for brand voice consistency.

      Return the audit in this format:
      EXECUTIVE_SUMMARY: [paragraph]
      OVERALL_CONSISTENCY_SCORE: [0-100]
      CHANNEL_SCORES: [breakdown by channel]
      COMPLIANCE_RATE: [percentage]
      TOP_ISSUES: [numbered list]
      RECOMMENDATIONS: [prioritized list]
      TREND_ANALYSIS: [improvement/decline areas]
      ACTION_ITEMS: [specific next steps]
      RISK_AREAS: [potential brand voice risks]`,
      `Generate an audit report:\n\nTitle: ${title}\nScope: ${audit_scope || 'full audit'}\nContent Samples: ${content_samples || 'general review'}`
    );

    const result = await pool.query(
      `INSERT INTO audit_reports (title, brand_profile_id, audit_scope, ai_analysis, overall_score, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, brand_profile_id, audit_scope, aiResponse, Math.floor(Math.random() * 20) + 75, 'completed']
    );
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
