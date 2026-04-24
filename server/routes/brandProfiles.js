const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM brand_profiles ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM brand_profiles WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, description, industry, tone_attributes, personality_traits, target_audience, brand_values } = req.body;
    const result = await pool.query(
      `INSERT INTO brand_profiles (name, description, industry, tone_attributes, personality_traits, target_audience, brand_values)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, description, industry, JSON.stringify(tone_attributes), JSON.stringify(personality_traits), target_audience, JSON.stringify(brand_values)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, industry, tone_attributes, personality_traits, target_audience, brand_values } = req.body;
    const result = await pool.query(
      `UPDATE brand_profiles SET name=$1, description=$2, industry=$3, tone_attributes=$4, personality_traits=$5, target_audience=$6, brand_values=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [name, description, industry, JSON.stringify(tone_attributes), JSON.stringify(personality_traits), target_audience, JSON.stringify(brand_values), req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM brand_profiles WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
