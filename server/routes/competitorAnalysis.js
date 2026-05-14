const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { callOpenRouter, parseAIJson, saveAIResult, DEFAULT_MODEL } = require('../lib/aiHelpers');
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
    const cnt = await pool.query('SELECT COUNT(*) FROM competitor_analyses');
    const total = parseInt(cnt.rows[0].count);
    const result = await pool.query('SELECT * FROM competitor_analyses ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
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

router.post('/', auth, aiRateLimiter, async (req, res) => {
  try {
    const { competitor_name, industry, sample_content, brand_profile_id } = req.body;
    if (!competitor_name || !sample_content) {
      return res.status(400).json({ error: 'competitor_name and sample_content are required' });
    }

    const aiResponse = await callOpenRouter(
      `You are a competitive brand voice analyst. Analyze the competitor's brand voice.
      Return ONLY valid JSON (no markdown fences):
      {
        "competitor_tone": "description",
        "voice_characteristics": ["point1", "point2"],
        "key_differentiators": ["diff1"],
        "strengths": ["s1"],
        "weaknesses": ["w1"],
        "opportunities": ["opp1"],
        "threat_level": "low|medium|high",
        "recommendations": ["rec1"]
      }`,
      `Analyze this competitor's brand voice:\n\nCompetitor: ${competitor_name}\nIndustry: ${industry || 'unknown'}\nSample Content: ${sample_content}`
    );

    const parsed = parseAIJson(aiResponse) || { raw: aiResponse };

    const result = await pool.query(
      `INSERT INTO competitor_analyses (competitor_name, industry, sample_content, brand_profile_id, ai_analysis, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [competitor_name, industry, sample_content, brand_profile_id || null, aiResponse, 'completed']
    );

    await saveAIResult(pool, {
      user_id: req.user?.id,
      feature: 'competitor-analysis',
      input: { competitor_name, industry, brand_profile_id },
      output: parsed,
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
    const { competitor_name, industry, sample_content, brand_profile_id } = req.body;
    const result = await pool.query(
      `UPDATE competitor_analyses SET competitor_name=$1, industry=$2, sample_content=$3, brand_profile_id=$4, updated_at=NOW() WHERE id=$5 RETURNING *`,
      [competitor_name, industry, sample_content, brand_profile_id || null, req.params.id]
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
