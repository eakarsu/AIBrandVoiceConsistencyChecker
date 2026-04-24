const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../openrouter');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM competitor_analyses ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM competitor_analyses WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { competitor_name, industry, sample_content, brand_profile_id } = req.body;

    const aiResponse = await callOpenRouter(
      `You are a competitive brand voice analyst. Analyze the competitor's brand voice and compare it to differentiate.

      Return analysis in this format:
      COMPETITOR_TONE: [description]
      VOICE_CHARACTERISTICS: [bullet points]
      KEY_DIFFERENTIATORS: [bullet points]
      STRENGTHS: [bullet points]
      WEAKNESSES: [bullet points]
      OPPORTUNITIES: [how to differentiate]
      THREAT_LEVEL: [low/medium/high]
      RECOMMENDATIONS: [actionable steps]`,
      `Analyze this competitor's brand voice:\n\nCompetitor: ${competitor_name}\nIndustry: ${industry}\nSample Content: ${sample_content}`
    );

    const result = await pool.query(
      `INSERT INTO competitor_analyses (competitor_name, industry, sample_content, brand_profile_id, ai_analysis, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [competitor_name, industry, sample_content, brand_profile_id, aiResponse, 'completed']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { competitor_name, industry, sample_content, brand_profile_id } = req.body;
    const result = await pool.query(
      `UPDATE competitor_analyses SET competitor_name=$1, industry=$2, sample_content=$3, brand_profile_id=$4, updated_at=NOW() WHERE id=$5 RETURNING *`,
      [competitor_name, industry, sample_content, brand_profile_id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM competitor_analyses WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
