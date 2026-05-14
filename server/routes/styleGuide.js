const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const cnt = await pool.query('SELECT COUNT(*) FROM style_guide_rules');
    const total = parseInt(cnt.rows[0].count);
    const result = await pool.query('SELECT * FROM style_guide_rules ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM style_guide_rules WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { rule_name, category, description, examples, severity, brand_profile_id } = req.body;
    if (!rule_name) return res.status(400).json({ error: 'rule_name is required' });
    const result = await pool.query(
      `INSERT INTO style_guide_rules (rule_name, category, description, examples, severity, brand_profile_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [rule_name, category, description, JSON.stringify(examples || []), severity, brand_profile_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { rule_name, category, description, examples, severity, brand_profile_id } = req.body;
    if (!rule_name) return res.status(400).json({ error: 'rule_name is required' });
    const result = await pool.query(
      `UPDATE style_guide_rules SET rule_name=$1, category=$2, description=$3, examples=$4, severity=$5, brand_profile_id=$6, updated_at=NOW() WHERE id=$7 RETURNING *`,
      [rule_name, category, description, JSON.stringify(examples || []), severity, brand_profile_id || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM style_guide_rules WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
