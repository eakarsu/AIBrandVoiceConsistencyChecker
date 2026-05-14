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
    const cnt = await pool.query('SELECT COUNT(*) FROM ai_suggestions');
    const total = parseInt(cnt.rows[0].count);
    const result = await pool.query('SELECT * FROM ai_suggestions ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
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

router.post('/', auth, aiRateLimiter, async (req, res) => {
  try {
    const { title, original_content, suggestion_type, brand_profile_id } = req.body;
    if (!title || !original_content) {
      return res.status(400).json({ error: 'title and original_content are required' });
    }

    const aiResponse = await callOpenRouter(
      `You are a brand voice improvement specialist. Improve the content for brand voice consistency.
      Return ONLY valid JSON (no markdown fences):
      {
        "improved_content": "rewritten content",
        "changes_made": ["change1", "change2"],
        "tone_adjustments": "description of tone changes",
        "vocabulary_changes": ["replaced X with Y because..."],
        "structure_improvements": ["structural change1"],
        "brand_alignment_notes": "how changes improve brand alignment",
        "alternative_versions": ["version1", "version2"],
        "confidence_level": "high|medium|low"
      }`,
      `Improve this content for brand voice consistency:\n\nType: ${suggestion_type || 'general improvement'}\nOriginal Content: ${original_content}`
    );

    const parsed = parseAIJson(aiResponse) || { raw: aiResponse };

    const result = await pool.query(
      `INSERT INTO ai_suggestions (title, original_content, suggestion_type, brand_profile_id, ai_suggestion, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, original_content, suggestion_type, brand_profile_id || null, aiResponse, 'completed']
    );

    await saveAIResult(pool, {
      user_id: req.user?.id,
      feature: 'ai-suggestions',
      input: { title, suggestion_type, brand_profile_id },
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
