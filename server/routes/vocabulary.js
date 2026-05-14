const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// Note: this route uses 'vocabulary' table for vocab-compliance AI tool
// but the CRUD table is vocabulary_terms
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const cnt = await pool.query('SELECT COUNT(*) FROM vocabulary_terms');
    const total = parseInt(cnt.rows[0].count);
    const result = await pool.query('SELECT * FROM vocabulary_terms ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vocabulary_terms WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { term, category, status, definition, usage_example, brand_profile_id } = req.body;
    if (!term) return res.status(400).json({ error: 'term is required' });
    const result = await pool.query(
      `INSERT INTO vocabulary_terms (term, category, status, definition, usage_example, brand_profile_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [term, category, status || 'approved', definition, usage_example, brand_profile_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { term, category, status, definition, usage_example, brand_profile_id } = req.body;
    if (!term) return res.status(400).json({ error: 'term is required' });
    const result = await pool.query(
      `UPDATE vocabulary_terms SET term=$1, category=$2, status=$3, definition=$4, usage_example=$5, brand_profile_id=$6, updated_at=NOW() WHERE id=$7 RETURNING *`,
      [term, category, status, definition, usage_example, brand_profile_id || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM vocabulary_terms WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
