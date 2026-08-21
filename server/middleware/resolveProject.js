const pool = require('../db');

async function resolveProject(req, res, next) {
  if (req.isAnonymousDemo) return next(); // requireAuth already set req.projectId

  try {
    const { rows } = await pool.query('SELECT id FROM projects WHERE owner_id = $1', [req.user.id]);
    const project = rows[0];

    if (!project) {
      return res.status(404).json({ needsSetup: true });
    }

    // req.params.id isn't populated yet at this point in the middleware chain --
    // Express only extracts route params once the request reaches the sub-router
    // that actually declares `:id` (e.g. router.get('/:id/summary', ...)), which
    // happens AFTER this middleware runs. Extract it from the URL path directly
    // (same technique as requireAuth's anonymous-demo carve-out, verified there).
    const match = req.path.match(/^\/(\d+)(\/|$)/);
    const urlProjectId = match ? match[1] : undefined;

    if (urlProjectId !== undefined && Number(urlProjectId) !== project.id) {
      return res.status(403).json({ error: 'forbidden' });
    }

    req.projectId = project.id;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { resolveProject };
