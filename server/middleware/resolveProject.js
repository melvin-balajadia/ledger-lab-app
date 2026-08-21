const pool = require('../db');

async function resolveProject(req, res, next) {
  if (req.isAnonymousDemo) return next(); // requireAuth already set req.projectId

  try {
    const { rows } = await pool.query('SELECT id FROM projects WHERE owner_id = $1', [req.user.id]);
    const project = rows[0];

    if (!project) {
      return res.status(404).json({ needsSetup: true });
    }

    // Only the /api/projects mounts use their first path segment as a
    // project id -- /api/suppliers and /api/meta reuse this same
    // middleware, but their first segment means something else (a
    // supplier id, or nothing). Scope the check to where "first segment
    // is a project id" is actually true.
    if (req.baseUrl === '/api/projects') {
      // req.path is NOT percent-decoded, but Express DOES decode
      // req.params.id before handlers see it -- comparing the raw,
      // still-encoded segment against a numeric project id let an
      // encoded id (e.g. "%32" for "2") slip past this check while
      // still resolving to a different real project downstream once
      // Express decoded it for the handler. Decode first, using the
      // exact same decodeURIComponent Express itself uses, and fail
      // CLOSED (403) on anything that isn't cleanly a plain integer --
      // never let an unparseable segment skip the check.
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
    }

    req.projectId = project.id;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { resolveProject };
