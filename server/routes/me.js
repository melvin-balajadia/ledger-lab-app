const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id FROM projects WHERE owner_id = $1', [req.user.id]);
    const project = rows[0];
    if (!project) {
      return res.json({ userId: req.user.id, email: req.user.email, needsSetup: true });
    }
    res.json({ userId: req.user.id, email: req.user.email, projectId: project.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
