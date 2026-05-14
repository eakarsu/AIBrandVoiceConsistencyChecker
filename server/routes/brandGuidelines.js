const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS brand_guidelines (
      id SERIAL PRIMARY KEY,
      brand_profile_id INTEGER,
      name VARCHAR(255) NOT NULL,
      tone TEXT,
      vocabulary JSONB DEFAULT '[]'::jsonb,
      forbidden_words JSONB DEFAULT '[]'::jsonb,
      style_rules JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// POST /api/brand-guidelines
router.post('/', auth, async (req, res) => {
  try {
    await ensureTable();
    const { brand_profile_id, name, tone, vocabulary, forbidden_words, style_rules } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const result = await pool.query(
      `INSERT INTO brand_guidelines (brand_profile_id, name, tone, vocabulary, forbidden_words, style_rules)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        brand_profile_id || null,
        name,
        tone || '',
        JSON.stringify(vocabulary || []),
        JSON.stringify(forbidden_words || []),
        JSON.stringify(style_rules || []),
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/brand-guidelines
router.get('/', auth, async (req, res) => {
  try {
    await ensureTable();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const countResult = await pool.query('SELECT COUNT(*) FROM brand_guidelines');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query('SELECT * FROM brand_guidelines ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/brand-guidelines/:id
router.get('/:id', auth, async (req, res) => {
  try {
    await ensureTable();
    const result = await pool.query('SELECT * FROM brand_guidelines WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/brand-guidelines/:id
router.put('/:id', auth, async (req, res) => {
  try {
    await ensureTable();
    const { brand_profile_id, name, tone, vocabulary, forbidden_words, style_rules } = req.body;
    const result = await pool.query(
      `UPDATE brand_guidelines
       SET brand_profile_id=$1, name=$2, tone=$3, vocabulary=$4, forbidden_words=$5, style_rules=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [
        brand_profile_id || null,
        name,
        tone || '',
        JSON.stringify(vocabulary || []),
        JSON.stringify(forbidden_words || []),
        JSON.stringify(style_rules || []),
        req.params.id,
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/brand-guidelines/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await ensureTable();
    const result = await pool.query('DELETE FROM brand_guidelines WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
