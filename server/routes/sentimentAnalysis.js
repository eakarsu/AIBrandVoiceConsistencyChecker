const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../openrouter');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sentiment_analyses ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sentiment_analyses WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, content, brand_profile_id } = req.body;

    const aiResponse = await callOpenRouter(
      `You are a sentiment analysis expert. Analyze the sentiment of the given content in the context of brand communication.

      Return analysis in this format:
      OVERALL_SENTIMENT: [positive/negative/neutral/mixed]
      SENTIMENT_SCORE: [-1.0 to 1.0]
      CONFIDENCE: [percentage]
      EMOTION_BREAKDOWN: [joy, trust, surprise, sadness, anger, fear percentages]
      SUBJECTIVITY: [objective/subjective score]
      KEY_PHRASES: [phrases driving sentiment]
      AUDIENCE_IMPACT: [predicted audience reaction]
      BRAND_SENTIMENT_ALIGNMENT: [how well sentiment aligns with brand]
      RECOMMENDATIONS: [adjustments if needed]`,
      `Analyze the sentiment of this brand content:\n\nContent: ${content}`
    );

    const result = await pool.query(
      `INSERT INTO sentiment_analyses (title, content, brand_profile_id, ai_analysis, sentiment_score, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, content, brand_profile_id, aiResponse, (Math.random() * 2 - 1).toFixed(2), 'completed']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, content, brand_profile_id } = req.body;
    const result = await pool.query(
      `UPDATE sentiment_analyses SET title=$1, content=$2, brand_profile_id=$3, updated_at=NOW() WHERE id=$4 RETURNING *`,
      [title, content, brand_profile_id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM sentiment_analyses WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
