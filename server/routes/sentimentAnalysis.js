const {nativeInputGuard,freshRecordActor}=require('../lib/nativeRecordInput');
const inputFields=["title","content","brand_profile_id"];
const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { callOpenRouter, parseLabeledFields, saveAIResult, DEFAULT_MODEL, nativeNumberField } = require('../lib/aiHelpers');
const router = express.Router();

const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
  message: { error: 'Too many AI requests. Limit: 20 per hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const cnt = await pool.query('SELECT COUNT(*) FROM sentiment_analyses');
    const total = parseInt(cnt.rows[0].count);
    const result = await pool.query('SELECT * FROM sentiment_analyses ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sentiment_analyses WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/', auth, nativeInputGuard(inputFields), aiRateLimiter, async (req, res) => {
  try {
    const { title, content, brand_profile_id } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'title and content required' });

    const aiResponse = await callOpenRouter(
      `You are a sentiment analysis expert. Analyze the sentiment of the given content in the context of brand communication.

      Return analysis in this format:
      OVERALL_SENTIMENT: [positive/negative/neutral/mixed]
      SENTIMENT_SCORE: [-1.0 to 1.0 decimal]
      CONFIDENCE: [0-100 integer]
      EMOTION_BREAKDOWN: [joy, trust, surprise, sadness, anger, fear percentages]
      SUBJECTIVITY: [objective/subjective score]
      KEY_PHRASES: [phrases driving sentiment]
      AUDIENCE_IMPACT: [predicted audience reaction]
      BRAND_SENTIMENT_ALIGNMENT: [how well sentiment aligns with brand]
      RECOMMENDATIONS: [adjustments if needed]`,
      `Analyze the sentiment of this brand content:\n\nContent: ${content}`
    );

    const fields = parseLabeledFields(aiResponse, ['SENTIMENT_SCORE', 'OVERALL_SENTIMENT']);
    const sentiment_score = nativeNumberField(fields, 'sentiment_score', -1, 1);

    const result = await pool.query(
      `INSERT INTO sentiment_analyses (title, content, brand_profile_id, ai_analysis, sentiment_score, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, content, brand_profile_id, aiResponse, sentiment_score===null?null:sentiment_score.toFixed(2), 'completed']
    );

    await saveAIResult(pool, {
      user_id: req.user?.id,
      feature: 'sentiment-analysis',
      input: { title, brand_profile_id },
      output: { ...fields, sentiment_score },
      raw_text: aiResponse,
      model: DEFAULT_MODEL,
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.put('/:id', auth, nativeInputGuard(inputFields), async (req, res) => {
  try {
    const { title, content, brand_profile_id } = req.body;
    const result = await pool.query(
      `UPDATE sentiment_analyses SET title=$1, content=$2, brand_profile_id=$3, updated_at=NOW() WHERE id=$4 RETURNING *`,
      [title, content, brand_profile_id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.delete('/:id', auth, freshRecordActor, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM sentiment_analyses WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
