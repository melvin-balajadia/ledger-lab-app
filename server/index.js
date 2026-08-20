require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./db');
const { requireAuth } = require('./middleware/requireAuth');

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(
  session({
    // Serverless functions have no shared memory between invocations, so the
    // default MemoryStore would randomly log people out -- sessions live in
    // Postgres instead. createTableIfMissing creates its own `session` table
    // on first run, no manual migration needed.
    store: new pgSession({ pool, createTableIfMissing: true }),
    name: process.env.SESSION_COOKIE_NAME || 'connect.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      // Keyed off `VERCEL` (set automatically by that platform), not
      // NODE_ENV -- the real Windows deployment sets NODE_ENV=production
      // too (see DEPLOYMENT.md step 7) while still serving plain HTTP, and
      // a `secure` cookie is silently dropped over HTTP, which would break
      // login there. VERCEL is never set outside Vercel's own platform.
      secure: Boolean(process.env.VERCEL),
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use('/api/auth', require('./routes/auth'));

app.use('/api/projects', requireAuth, require('./routes/projects'));
app.use('/api/projects', requireAuth, require('./routes/planningLines'));
app.use('/api/projects', requireAuth, require('./routes/replenishments'));
app.use('/api/projects', requireAuth, require('./routes/purchaseOrders'));
app.use('/api/projects', requireAuth, require('./routes/cashAdvances'));
app.use('/api/projects', requireAuth, require('./routes/additionalPayments'));
app.use('/api/projects', requireAuth, require('./routes/budgetItems'));
app.use('/api/projects', requireAuth, require('./routes/wbs'));
app.use('/api/projects', requireAuth, require('./routes/payroll'));
app.use('/api/projects', requireAuth, require('./routes/workers'));
app.use('/api/projects', requireAuth, require('./routes/alerts'));
app.use('/api/suppliers', requireAuth, require('./routes/suppliers'));
app.use('/api/meta', requireAuth, require('./routes/meta'));
// "Backup now" shells out to a local mysqldump.exe path and writes to a local
// backups/ folder -- neither exists on Vercel, and it's MySQL-specific besides.
// Supabase takes its own automatic backups there instead. Only mount it when
// not running on Vercel, so the real (Windows/MySQL) deployment keeps it.
if (!process.env.VERCEL) {
  app.use('/api/backup', requireAuth, require('./routes/backup'));

  // Production (real deployment): Express serves the built client (client/dist)
  // as a single process. On Vercel the client is served by Vercel itself, so
  // this whole block is skipped there. Must come after every /api mount above,
  // or the SPA fallback swallows API requests.
  const path = require('path');
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Vercel imports this file and calls the exported app per-request -- it must
// not also call app.listen() itself. The real (Windows/MySQL) deployment runs
// this file directly with `node index.js`, where require.main === module.
if (require.main === module) {
  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log(`Server listening on port ${port}`));
}
module.exports = app;
