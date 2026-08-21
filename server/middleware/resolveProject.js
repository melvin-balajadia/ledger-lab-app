const pool = require('../db');

async function lookupOwnProject(req) {
  const { rows } = await pool.query('SELECT id FROM projects WHERE owner_id = $1', [req.user.id]);
  return rows[0];
}

// For routes shaped /api/projects/:id/... -- also verifies the URL's project
// id belongs to the caller. Decodes the id segment exactly the way Express
// decodes req.params.id (decodeURIComponent), so the two can never disagree,
// and fails CLOSED (403) on anything that isn't a clean positive integer.
async function resolveProject(req, res, next) {
  if (req.isAnonymousDemo) return next();
  try {
    const project = await lookupOwnProject(req);
    if (!project) return res.status(404).json({ needsSetup: true });

    const rawSegment = req.path.split('/')[1] || '';
    let decodedSegment;
    try {
      decodedSegment = decodeURIComponent(rawSegment);
    } catch {
      return res.status(400).json({ error: 'invalid project id' });
    }
    if (!/^\d+$/.test(decodedSegment) || Number(decodedSegment) !== project.id) {
      return res.status(403).json({ error: 'forbidden' });
    }

    req.projectId = project.id;
    next();
  } catch (err) {
    next(err);
  }
}

// For routes with no project id in their own URL (/api/suppliers, /api/meta)
// -- just attaches the caller's own project id. No id-in-URL to check, so no
// gate here at all -- which mounts get which behavior is decided below in
// server/index.js, not inferred from the request.
async function attachProjectId(req, res, next) {
  if (req.isAnonymousDemo) return next();
  try {
    const project = await lookupOwnProject(req);
    if (!project) return res.status(404).json({ needsSetup: true });
    req.projectId = project.id;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { resolveProject, attachProjectId };
