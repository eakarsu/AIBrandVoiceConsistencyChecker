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
    const cnt = await pool.query('SELECT COUNT(*) FROM tone_detections');
    const total = parseInt(cnt.rows[0].count);
    const result = await pool.query('SELECT * FROM tone_detections ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
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

router.post('/', auth, aiRateLimiter, async (req, res) => {
  try {
    const { title, content, expected_tone } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'title and content required' });

    const aiResponse = await callOpenRouter(
      `You are a tone detection expert. Analyze the tone of the given content and provide detailed results.

      Return your analysis in this format:
      PRIMARY_TONE: [single word: detected tone]
      SECONDARY_TONES: [comma-separated list]
      CONFIDENCE: [0-100 integer]
      EMOTIONAL_VALENCE: [positive/negative/neutral]
      FORMALITY_LEVEL: [1-10]
      ENERGY_LEVEL: [1-10]
      TONE_BREAKDOWN: [detailed percentages for each tone detected]
      SUGGESTIONS: [how to adjust tone if needed]`,
      `Analyze the tone of this content. Expected tone: ${expected_tone || 'not specified'}\n\nContent: ${content}`
    );

    const fields = parseLabeledFields(aiResponse, ['PRIMARY_TONE', 'CONFIDENCE']);
    const detected_tone = fields.primary_tone || 'analyzed';
    const confidence = parseInt(String(fields.confidence || '').match(/\d+/)?.[0] || '0', 10);

    const result = await pool.query(
      `INSERT INTO tone_detections (title, content, expected_tone, detected_tone, ai_analysis, confidence, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, content, expected_tone, detected_tone, aiResponse, confidence || 0, 'completed']
    );

    await saveAIResult(pool, {
      user_id: req.user?.id,
      feature: 'tone-detection',
      input: { title, expected_tone },
      output: { ...fields, confidence, detected_tone },
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
