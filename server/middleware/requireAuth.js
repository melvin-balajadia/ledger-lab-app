const supabaseAdmin = require('../lib/supabaseAdmin');

// The one project anyone can view without signing in. This app only ever
// has one such project by design (the fictional seed data) -- hardcoded
// rather than configurable, since there is exactly one of these ever.
const PUBLIC_DEMO_PROJECT_ID = 1;

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    // Anonymous GETs to the public demo project's own routes are allowed,
    // read-only. Anything else (no token + not a GET, or not the demo
    // project) still requires real auth.
    //
    // req.params.id is NOT usable here: requireAuth is mounted with
    // app.use('/api/projects', requireAuth, ...) ahead of each route
    // router, and Express only populates named params once the router's
    // own '/:id/...' pattern matches -- which happens after this
    // middleware runs. Verified empirically: req.params is still {} at
    // this point. req.path, however, IS already mount-relative (e.g.
    // '/1/summary') by the time this middleware runs, so the id is read
    // from the URL directly instead.
    //
    // Decoded and matched exactly the way resolveProject.js does it, so the
    // two can never disagree about which project a URL names: strict
    // /^\d+$/ after decodeURIComponent, malformed encoding rejected outright.
    const rawSegment = req.path.split('/')[1] || '';
    let idSegment;
    try {
      idSegment = decodeURIComponent(rawSegment);
    } catch {
      return res.status(400).json({ error: 'invalid project id' });
    }
    if (req.method === 'GET' && /^\d+$/.test(idSegment) && Number(idSegment) === PUBLIC_DEMO_PROJECT_ID) {
      req.projectId = PUBLIC_DEMO_PROJECT_ID;
      req.isAnonymousDemo = true;
      return next();
    }
    return res.status(401).json({ error: 'not authenticated' });
  }

  // Supabase returns { error } for a genuinely invalid token -- that's a 401.
  // A thrown exception means Auth itself is unreachable, which is a 503, not
  // an unhandled rejection.
  let data;
  let error;
  try {
    ({ data, error } = await supabaseAdmin.auth.getUser(token));
  } catch {
    return res.status(503).json({ error: 'auth service unavailable' });
  }
  if (error || !data.user) return res.status(401).json({ error: 'not authenticated' });

  req.user = { id: data.user.id, email: data.user.email };
  next();
}

module.exports = { requireAuth };
