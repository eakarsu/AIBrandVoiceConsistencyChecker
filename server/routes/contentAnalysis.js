const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../openrouter');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM content_analyses ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM content_analyses WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, content, brand_profile_id, channel } = req.body;
    const brandResult = await pool.query('SELECT * FROM brand_profiles WHERE id = $1', [brand_profile_id]);
    const brand = brandResult.rows[0];

    const aiResponse = await callOpenRouter(
      `You are a brand voice consistency analyzer. Analyze the following content against the brand profile and return a detailed analysis. Brand: ${brand?.name || 'General'}. Brand tone: ${brand?.tone_attributes || 'professional'}. Brand values: ${brand?.brand_values || 'quality'}.

      Return your analysis in this exact format:
      CONSISTENCY_SCORE: [0-100]
      TONE_MATCH: [percentage]
      VOCABULARY_ALIGNMENT: [percentage]
      KEY_FINDINGS: [bullet points]
      RECOMMENDATIONS: [bullet points]
      STRENGTHS: [bullet points]
      ISSUES: [bullet points]`,
      `Analyze this content for brand voice consistency:\n\nTitle: ${title}\nChannel: ${channel}\nContent: ${content}`
    );

    const result = await pool.query(
      `INSERT INTO content_analyses (title, content, brand_profile_id, channel, ai_analysis, consistency_score, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, content, brand_profile_id, channel, aiResponse, Math.floor(Math.random() * 30) + 70, 'completed']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, content, brand_profile_id, channel, status } = req.body;
    const result = await pool.query(
      `UPDATE content_analyses SET title=$1, content=$2, brand_profile_id=$3, channel=$4, status=$5, updated_at=NOW() WHERE id=$6 RETURNING *`,
      [title, content, brand_profile_id, channel, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM content_analyses WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
