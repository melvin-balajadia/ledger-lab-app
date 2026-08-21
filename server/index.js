require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { requireAuth } = require('./middleware/requireAuth');
const { resolveProject, attachProjectId } = require('./middleware/resolveProject');

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

// Vercel defaults un-cache-controlled function responses to a public cache
// directive that stripped Set-Cookie in the old session-based auth. Not
// needed for correctness anymore (no cookies to strip), but no downside to
// keeping every API response explicitly non-cacheable.
if (process.env.VERCEL) {
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
}

app.use('/api/me', requireAuth, require('./routes/me'));
app.use('/api/projects', requireAuth, require('./routes/createProject'));

app.use('/api/projects', requireAuth, resolveProject, require('./routes/projects'));
app.use('/api/projects', requireAuth, resolveProject, require('./routes/planningLines'));
app.use('/api/projects', requireAuth, resolveProject, require('./routes/replenishments'));
app.use('/api/projects', requireAuth, resolveProject, require('./routes/purchaseOrders'));
app.use('/api/projects', requireAuth, resolveProject, require('./routes/cashAdvances'));
app.use('/api/projects', requireAuth, resolveProject, require('./routes/additionalPayments'));
app.use('/api/projects', requireAuth, resolveProject, require('./routes/budgetItems'));
app.use('/api/projects', requireAuth, resolveProject, require('./routes/wbs'));
app.use('/api/projects', requireAuth, resolveProject, require('./routes/payroll'));
app.use('/api/projects', requireAuth, resolveProject, require('./routes/workers'));
app.use('/api/projects', requireAuth, resolveProject, require('./routes/alerts'));
app.use('/api/suppliers', requireAuth, attachProjectId, require('./routes/suppliers'));
app.use('/api/meta', requireAuth, attachProjectId, require('./routes/meta'));

if (!process.env.VERCEL) {
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

if (require.main === module) {
  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log(`Server listening on port ${port}`));
}
module.exports = app;
