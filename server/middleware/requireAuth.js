const supabaseAdmin = require('../lib/supabaseAdmin');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'not authenticated' });

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'not authenticated' });

  req.user = { id: data.user.id, email: data.user.email };
  next();
}

module.exports = { requireAuth };
