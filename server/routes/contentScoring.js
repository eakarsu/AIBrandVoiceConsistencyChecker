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
    const countResult = await pool.query('SELECT COUNT(*) FROM content_scores');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query('SELECT * FROM content_scores ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
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
    const result = await pool.query('SELECT * FROM content_scores WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, aiRateLimiter, async (req, res) => {
  try {
    const { title, content, brand_profile_id, scoring_criteria } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'title and content required' });

    const aiResponse = await callOpenRouter(
      `You are a content scoring expert. Score the content based on brand voice consistency criteria.

      Return scores in this format:
      OVERALL_SCORE: [0-100 integer]
      TONE_SCORE: [0-100 integer]
      VOCABULARY_SCORE: [0-100 integer]
      GRAMMAR_SCORE: [0-100 integer]
      READABILITY_SCORE: [0-100 integer]
      BRAND_ALIGNMENT_SCORE: [0-100 integer]
      ENGAGEMENT_SCORE: [0-100 integer]
      DETAILED_FEEDBACK: [paragraph]
      IMPROVEMENT_AREAS: [bullet points]
      TOP_STRENGTHS: [bullet points]`,
      `Score this content:\n\nTitle: ${title}\nCriteria: ${scoring_criteria || 'general brand voice'}\nContent: ${content}`
    );

    const fields = parseLabeledFields(aiResponse, ['OVERALL_SCORE', 'TONE_SCORE', 'VOCABULARY_SCORE', 'GRAMMAR_SCORE', 'READABILITY_SCORE', 'BRAND_ALIGNMENT_SCORE', 'ENGAGEMENT_SCORE']);
    const overall_score = parseInt(String(fields.overall_score || '').match(/\d+/)?.[0] || '0', 10);

    const result = await pool.query(
      `INSERT INTO content_scores (title, content, brand_profile_id, scoring_criteria, overall_score, ai_analysis, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, content, brand_profile_id, scoring_criteria, overall_score || 0, aiResponse, 'completed']
    );

    await saveAIResult(pool, {
      user_id: req.user?.id,
      feature: 'content-scoring',
      input: { title, brand_profile_id, scoring_criteria },
      output: { ...fields, overall_score },
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
