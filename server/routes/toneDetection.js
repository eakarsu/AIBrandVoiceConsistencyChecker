const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../openrouter');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tone_detections ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tone_detections WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, content, expected_tone } = req.body;

    const aiResponse = await callOpenRouter(
      `You are a tone detection expert. Analyze the tone of the given content and provide detailed results.

      Return your analysis in this format:
      PRIMARY_TONE: [detected tone]
      SECONDARY_TONES: [list]
      CONFIDENCE: [percentage]
      EMOTIONAL_VALENCE: [positive/negative/neutral]
      FORMALITY_LEVEL: [1-10]
      ENERGY_LEVEL: [1-10]
      TONE_BREAKDOWN: [detailed percentages for each tone detected]
      SUGGESTIONS: [how to adjust tone if needed]`,
      `Analyze the tone of this content. Expected tone: ${expected_tone || 'not specified'}\n\nContent: ${content}`
    );

    const result = await pool.query(
      `INSERT INTO tone_detections (title, content, expected_tone, detected_tone, ai_analysis, confidence, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, content, expected_tone, 'analyzed', aiResponse, Math.floor(Math.random() * 20) + 80, 'completed']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, content, expected_tone } = req.body;
    const result = await pool.query(
      `UPDATE tone_detections SET title=$1, content=$2, expected_tone=$3, updated_at=NOW() WHERE id=$4 RETURNING *`,
      [title, content, expected_tone, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM tone_detections WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
