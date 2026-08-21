const express = require('express');
const pool = require('../db');

const router = express.Router();

router.post('/', async (req, res, next) => {
  const { name, company, location } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

  try {
    const { rows: existing } = await pool.query('SELECT id FROM projects WHERE owner_id = $1', [req.user.id]);
    if (existing.length > 0) return res.status(400).json({ error: 'you already have a project' });

    const { rows } = await pool.query(
      `INSERT INTO projects (owner_id, code, name, company, location, vat_inclusive, status)
       VALUES ($1, $2, $3, $4, $5, 1, 'active') RETURNING id`,
      [req.user.id, `P${Date.now()}`, name.trim(), company ? company.trim() : null, location || null]
    );
    res.status(201).json({ projectId: rows[0].id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
