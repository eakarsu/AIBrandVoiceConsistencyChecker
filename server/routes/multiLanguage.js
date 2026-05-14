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
    const cnt = await pool.query('SELECT COUNT(*) FROM multi_language_voices');
    const total = parseInt(cnt.rows[0].count);
    const result = await pool.query('SELECT * FROM multi_language_voices ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM multi_language_voices WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, aiRateLimiter, async (req, res) => {
  try {
    const { title, source_content, source_language, target_language, brand_profile_id } = req.body;
    if (!title || !source_content || !source_language || !target_language) {
      return res.status(400).json({ error: 'title, source_content, source_language, target_language required' });
    }

    const aiResponse = await callOpenRouter(
      `You are a multilingual brand voice specialist. Adapt the content to the target language while maintaining brand voice consistency.

      Return analysis in this format:
      TRANSLATED_CONTENT: [adapted content in target language]
      CULTURAL_ADAPTATIONS: [changes made for cultural relevance]
      TONE_PRESERVATION: [how tone was maintained]
      BRAND_VOICE_CONSISTENCY: [score 0-100 integer]
      LOCALIZATION_NOTES: [important cultural considerations]
      ALTERNATIVE_PHRASINGS: [alternative translations for key phrases]
      QUALITY_SCORE: [0-100 integer]
      WARNINGS: [potential cultural sensitivity issues]`,
      `Adapt this content while maintaining brand voice:\n\nSource (${source_language}): ${source_content}\nTarget Language: ${target_language}`
    );

    const fields = parseLabeledFields(aiResponse, ['QUALITY_SCORE', 'BRAND_VOICE_CONSISTENCY']);
    const quality_score = parseInt(String(fields.quality_score || '').match(/\d+/)?.[0] || '0', 10);

    const result = await pool.query(
      `INSERT INTO multi_language_voices (title, source_content, source_language, target_language, brand_profile_id, ai_analysis, quality_score, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, source_content, source_language, target_language, brand_profile_id, aiResponse, quality_score || 0, 'completed']
    );

    await saveAIResult(pool, {
      user_id: req.user?.id,
      feature: 'multi-language',
      input: { title, source_language, target_language, brand_profile_id },
      output: { ...fields, quality_score },
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
    const { title, source_content, source_language, target_language, brand_profile_id } = req.body;
    const result = await pool.query(
      `UPDATE multi_language_voices SET title=$1, source_content=$2, source_language=$3, target_language=$4, brand_profile_id=$5, updated_at=NOW() WHERE id=$6 RETURNING *`,
      [title, source_content, source_language, target_language, brand_profile_id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM multi_language_voices WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
