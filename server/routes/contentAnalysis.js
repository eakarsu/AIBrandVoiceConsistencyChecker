const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { callOpenRouter, parseLabeledFields, parseAIJson, saveAIResult, DEFAULT_MODEL } = require('../lib/aiHelpers');
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
    const countResult = await pool.query('SELECT COUNT(*) FROM content_analyses');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query('SELECT * FROM content_analyses ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
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

router.post('/', auth, aiRateLimiter, async (req, res) => {
  try {
    const { title, content, brand_profile_id, channel } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' });
    }

    let brand = null;
    if (brand_profile_id) {
      const brandResult = await pool.query('SELECT * FROM brand_profiles WHERE id = $1', [brand_profile_id]);
      brand = brandResult.rows[0] || null;
    }

    const aiResponse = await callOpenRouter(
      `You are a brand voice consistency analyzer. Analyze the following content against the brand profile and return a detailed analysis. Brand: ${brand?.name || 'General'}. Brand tone: ${brand?.tone_attributes || 'professional'}. Brand values: ${brand?.brand_values || 'quality'}.

      Return your analysis in this exact format:
      CONSISTENCY_SCORE: [0-100 integer]
      TONE_MATCH: [0-100 integer]
      VOCABULARY_ALIGNMENT: [0-100 integer]
      KEY_FINDINGS: [bullet points]
      RECOMMENDATIONS: [bullet points]
      STRENGTHS: [bullet points]
      ISSUES: [bullet points]`,
      `Analyze this content for brand voice consistency:\n\nTitle: ${title}\nChannel: ${channel}\nContent: ${content}`
    );

    // Real parsing — no more Math.random
    const fields = parseLabeledFields(aiResponse, ['CONSISTENCY_SCORE', 'TONE_MATCH', 'VOCABULARY_ALIGNMENT']);
    const consistency_score = parseInt(String(fields.consistency_score || '').match(/\d+/)?.[0] || '0', 10);

    const result = await pool.query(
      `INSERT INTO content_analyses (title, content, brand_profile_id, channel, ai_analysis, consistency_score, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, content, brand_profile_id, channel, aiResponse, consistency_score || 0, 'completed']
    );

    await saveAIResult(pool, {
      user_id: req.user?.id,
      feature: 'content-analysis',
      input: { title, channel, brand_profile_id },
      output: { ...fields, consistency_score },
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
