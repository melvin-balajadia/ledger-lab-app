const pool = require('../db');

async function resolveProject(req, res, next) {
  if (req.isAnonymousDemo) return next(); // requireAuth already set req.projectId

  try {
    const { rows } = await pool.query('SELECT id FROM projects WHERE owner_id = $1', [req.user.id]);
    const project = rows[0];

    if (!project) {
      return res.status(404).json({ needsSetup: true });
    }

    if (req.params.id !== undefined && Number(req.params.id) !== project.id) {
      return res.status(403).json({ error: 'forbidden' });
    }

    req.projectId = project.id;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { resolveProject };
