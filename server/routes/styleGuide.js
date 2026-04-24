const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM style_guide_rules ORDER BY created_at DESC');
    res.json(result.rows);
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
    const result = await pool.query(
      `INSERT INTO style_guide_rules (rule_name, category, description, examples, severity, brand_profile_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [rule_name, category, description, JSON.stringify(examples), severity, brand_profile_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { rule_name, category, description, examples, severity, brand_profile_id } = req.body;
    const result = await pool.query(
      `UPDATE style_guide_rules SET rule_name=$1, category=$2, description=$3, examples=$4, severity=$5, brand_profile_id=$6, updated_at=NOW() WHERE id=$7 RETURNING *`,
      [rule_name, category, description, JSON.stringify(examples), severity, brand_profile_id, req.params.id]
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
