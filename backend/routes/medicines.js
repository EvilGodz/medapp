const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/medicines
// List medicines where userId IS NULL or equals provided userId
router.get('/', async (req, res) => {
  const { userId } = req.query;
  try {
    let result;
    if (userId) {
      result = await pool.query(
        'SELECT id, medicine_name, section_3_1_dosage FROM medicines WHERE userId IS NULL OR userId = $1 ORDER BY medicine_name LIMIT 100',
        [userId]
      );
    } else {
      result = await pool.query(
        'SELECT id, medicine_name, section_3_1_dosage FROM medicines WHERE userId IS NULL ORDER BY medicine_name LIMIT 100'
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error listing medicines:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/medicines/search?name=...
router.get('/search', async (req, res) => {
  const { name, userId } = req.query;
  if (!name) return res.json([]);
  try {
    let result;
    if (userId) {
      result = await pool.query(
        'SELECT id, medicine_name, section_3_1_dosage FROM medicines WHERE medicine_name ILIKE $1 AND (userId IS NULL OR userId = $2) LIMIT 10',
        [`%${name}%`, userId]
      );
    } else {
      result = await pool.query(
        'SELECT id, medicine_name, section_3_1_dosage FROM medicines WHERE medicine_name ILIKE $1 LIMIT 10',
        [`%${name}%`]
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error searching medicines:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router; 