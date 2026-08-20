const express = require('express');
const bcrypt = require('bcryptjs');
const cookieSignature = require('cookie-signature');
const pool = require('../db');

const router = express.Router();

router.post('/login', async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password are required' });

  try {
    const { rows } = await pool.query(
      'SELECT id, username, password_hash, full_name FROM users WHERE username = $1 AND is_active = 1',
      [username]
    );
    const user = rows[0];
    const ok = user && (await bcrypt.compare(password, user.password_hash));
    if (!ok) return res.status(401).json({ error: 'invalid username or password' });

    req.session.userId = user.id;
    req.session.username = user.username;
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    // express-session normally saves the session silently via a res.end hook --
    // a failed save (e.g. the Postgres session store rejecting the write) would
    // otherwise be invisible, still returning 200 with no cookie ever set. Save
    // explicitly so a real error surfaces instead of a silent, confusing login
    // that doesn't actually log anyone in.
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('session save failed:', saveErr);
        return next(saveErr);
      }
      // express-session normally sets Set-Cookie via a deferred on-headers
      // hook right as the response flushes. That hook does not fire under
      // Vercel's Node runtime here (confirmed: session/cookie data is all
      // correct, but no Set-Cookie ever reaches the response) -- set it
      // directly and synchronously instead, using the sessionID we already
      // have. The value must be signed exactly like express-session signs
      // it ("s:<id>.<hmac>") -- a raw/unsigned id is silently rejected as
      // untrusted on the next request, which looked like the login "worked"
      // but every following request came back logged-out.
      const signedSessionId = 's:' + cookieSignature.sign(req.sessionID, process.env.SESSION_SECRET);
      res.cookie(process.env.SESSION_COOKIE_NAME || 'connect.sid', signedSessionId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: Boolean(process.env.VERCEL),
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/',
      });
      res.json({ username: user.username, full_name: user.full_name });
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    // Must match the name index.js gives the session cookie, or logout leaves a
    // stale cookie in the browser (harmless -- destroy() already killed the
    // server-side session -- but it never gets cleaned up).
    res.clearCookie(process.env.SESSION_COOKIE_NAME || 'connect.sid');
    res.json({});
  });
});

router.get('/me', async (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'not authenticated' });
  try {
    const { rows } = await pool.query('SELECT username, full_name FROM users WHERE id = $1', [req.session.userId]);
    if (rows.length === 0) return res.status(401).json({ error: 'not authenticated' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
