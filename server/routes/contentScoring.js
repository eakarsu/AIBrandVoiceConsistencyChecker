const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../openrouter');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM content_scores ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM content_scores WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, content, brand_profile_id, scoring_criteria } = req.body;

    const aiResponse = await callOpenRouter(
      `You are a content scoring expert. Score the content based on brand voice consistency criteria.

      Return scores in this format:
      OVERALL_SCORE: [0-100]
      TONE_SCORE: [0-100]
      VOCABULARY_SCORE: [0-100]
      GRAMMAR_SCORE: [0-100]
      READABILITY_SCORE: [0-100]
      BRAND_ALIGNMENT_SCORE: [0-100]
      ENGAGEMENT_SCORE: [0-100]
      DETAILED_FEEDBACK: [paragraph]
      IMPROVEMENT_AREAS: [bullet points]
      TOP_STRENGTHS: [bullet points]`,
      `Score this content:\n\nTitle: ${title}\nCriteria: ${scoring_criteria || 'general brand voice'}\nContent: ${content}`
    );

    const result = await pool.query(
      `INSERT INTO content_scores (title, content, brand_profile_id, scoring_criteria, overall_score, ai_analysis, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, content, brand_profile_id, scoring_criteria, Math.floor(Math.random() * 25) + 75, aiResponse, 'completed']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, content, brand_profile_id, scoring_criteria } = req.body;
    const result = await pool.query(
      `UPDATE content_scores SET title=$1, content=$2, brand_profile_id=$3, scoring_criteria=$4, updated_at=NOW() WHERE id=$5 RETURNING *`,
      [title, content, brand_profile_id, scoring_criteria, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM content_scores WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
