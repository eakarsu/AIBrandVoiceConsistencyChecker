const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const cnt = await pool.query('SELECT COUNT(*) FROM content_templates');
    const total = parseInt(cnt.rows[0].count);
    const result = await pool.query('SELECT * FROM content_templates ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM content_templates WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, category, channel, template_content, variables, brand_profile_id } = req.body;
    if (!name || !template_content) return res.status(400).json({ error: 'name and template_content are required' });
    const result = await pool.query(
      `INSERT INTO content_templates (name, category, channel, template_content, variables, brand_profile_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, category, channel, template_content, JSON.stringify(variables || []), brand_profile_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, category, channel, template_content, variables, brand_profile_id } = req.body;
    if (!name || !template_content) return res.status(400).json({ error: 'name and template_content are required' });
    const result = await pool.query(
      `UPDATE content_templates SET name=$1, category=$2, channel=$3, template_content=$4, variables=$5, brand_profile_id=$6, updated_at=NOW() WHERE id=$7 RETURNING *`,
      [name, category, channel, template_content, JSON.stringify(variables || []), brand_profile_id || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM content_templates WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
