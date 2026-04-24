const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../openrouter');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ai_suggestions ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ai_suggestions WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, original_content, suggestion_type, brand_profile_id } = req.body;

    const aiResponse = await callOpenRouter(
      `You are a brand voice improvement specialist. Provide detailed suggestions to improve the content for better brand voice consistency.

      Return suggestions in this format:
      IMPROVED_CONTENT: [rewritten content]
      CHANGES_MADE: [bullet points of changes]
      TONE_ADJUSTMENTS: [what was adjusted]
      VOCABULARY_CHANGES: [words replaced and why]
      STRUCTURE_IMPROVEMENTS: [structural changes]
      BRAND_ALIGNMENT_NOTES: [how changes improve brand alignment]
      ALTERNATIVE_VERSIONS: [2-3 alternative phrasings for key sections]
      CONFIDENCE_LEVEL: [how confident in improvements]`,
      `Improve this content for brand voice consistency:\n\nType: ${suggestion_type || 'general improvement'}\nOriginal Content: ${original_content}`
    );

    const result = await pool.query(
      `INSERT INTO ai_suggestions (title, original_content, suggestion_type, brand_profile_id, ai_suggestion, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, original_content, suggestion_type, brand_profile_id, aiResponse, 'completed']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, original_content, suggestion_type, status } = req.body;
    const result = await pool.query(
      `UPDATE ai_suggestions SET title=$1, original_content=$2, suggestion_type=$3, status=$4, updated_at=NOW() WHERE id=$5 RETURNING *`,
      [title, original_content, suggestion_type, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM ai_suggestions WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
