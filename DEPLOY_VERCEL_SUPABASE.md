# Deploying the portfolio version — Vercel + Supabase

This is a **separate, sanitized deployment** for showing the app in a portfolio, not
the accountant's real instance. It uses Postgres (Supabase) instead of MySQL, contains
zero real business data, and has exactly one demo login. `DEPLOYMENT.md` (the
Windows/MySQL/real-data setup) is untouched and still describes the real deployment.

**Decision this doc assumes**, confirmed up front: migrate the schema and queries from
MySQL to Postgres so the stack is genuinely "Vercel + Supabase," rather than hosting
MySQL somewhere else. That's real migration work, not just an upload — this doc is
long because that work has several sharp edges.

## 0. What changes and why

| Piece | Local/real deployment | Portfolio deployment |
|---|---|---|
| Database | MySQL 8, `mysql2` | **Postgres, `pg`** (Supabase) |
| Data | Real figures (`db/rcsni_cost_clean_*.sql`) | **Fictional demo data only** — `db/schema.postgres.sql` |
| Auth | 1 real user, `express-session` + MemoryStore | **1 demo user**, session store backed by Postgres (serverless has no shared memory between invocations) |
| File uploads (PO attachments) | `multer` → local disk | **Disabled, or swapped to Supabase Storage** (serverless has no persistent disk) |
| "Backup now" button | `mysqldump.exe` on the local machine | **Removed** — not meaningful in this environment; Supabase backs up the DB itself |
| Process model | One Express process, `app.listen()` | **Serverless function** per request (Vercel) |

Everything in CLAUDE.md about the *money rules* (three ledgers never summed, DECIMAL
handling, VAT-inclusive amounts, retention, split charges) is unaffected — those are
application logic, not MySQL-specific. Only the plumbing underneath changes.

---

## 1. Sanitize the repo before it's public

- [x] **Done for you**: `db/schema.postgres.sql` — the full schema, structure only,
  converted to Postgres, ending in a small block of obviously-fictional demo data
  (`Sample Cold Storage Expansion`, `Sample Logistics Corp.`, round numbers). It does
  **not** touch `db/schema.sql` or `db/seed_master_data.sql` — those stay as-is for the
  real deployment.
- **Do not commit or deploy from**: `db/seed_master_data.sql` (324 real supplier
  names), any `db/rcsni_cost_clean_*.sql` dump, or anything under `backups/`. If this
  is a public GitHub repo backing the Vercel deploy, either keep those out of git
  entirely (they should already be gitignored per `DEPLOYMENT.md` step 7) or use a
  private repo.
- The `site.config.ts` per-deployment indirection has been removed entirely for this
  build — it existed so multiple real client instances (Plaridel, Villasis) could each
  set their own `PROJECT_ID`/branding from one shared codebase, which doesn't apply
  here: this is one general-purpose portfolio showcase, not a per-site deployment.
  `PROJECT_ID = 1` (the fictional `DEMO` project from `schema.postgres.sql`) is now a
  plain hardcoded constant in `client/src/hooks/useProjectData.ts`, and the branding
  string ("Sample Logistics Corp. — Cost & Payroll Monitor") is inlined directly in
  `Login.tsx`/`Layout.tsx`/`main.tsx`. `site.config.ts`, `site.config.example.ts`, and
  the corresponding `.gitignore` entry are gone.
- Skim `README.md` for anything naming the real company/location — genericize before
  making the repo public, if it isn't already.
- One cosmetic leftover in shared UI code: `client/src/components/AdditionalPaymentForm.tsx`
  has a form placeholder hint (`"e.g. RFPLAEX00101"`) referencing the real project code.
  Harmless either way, but swap it for something generic (e.g. `"e.g. RF00101"`) if you
  want zero real identifiers anywhere in the portfolio build.

---

## 2. Supabase — create the project and load the schema

1. Sign up / log in at supabase.com, **New Project**. Pick a region close to where
   Vercel will run your functions (matters for latency, not correctness).
2. Set a strong database password when prompted — save it, you'll need it for the
   connection string.
3. Once provisioned, go to **SQL Editor** → **New query**, paste the entire contents
   of `db/schema.postgres.sql`, and run it. This creates all 20 tables, the trigger
   function, all 11 views, and the small demo seed — nothing else.
4. Create the one demo user (see §4.2 below for the converted script) — do this after
   the server code changes are in place, since the script needs a working Postgres
   connection.
5. Find the connection strings via the **Connect** button near the top of the
   dashboard (newer Supabase UIs moved it out of Project Settings). You need **two**
   of these:
   - **Transaction pooler** (port `6543`) — use this as `DATABASE_URL` for the
     deployed app. Serverless functions open a fresh connection per invocation; going
     straight to Postgres exhausts its connection limit almost immediately under any
     real traffic. The pooler (PgBouncer/Supavisor) exists exactly for this.
   - **Session pooler** (port `5432`, hostname like `aws-0-<region>.pooler.supabase.com`)
     — use this for one-off local scripts (like creating the demo user) run from your
     own machine. **Do not use the "Direct connection" string** (`db.<ref>.supabase.co`)
     for this — that hostname is IPv6-only, and most home/office networks can't resolve
     it, which fails with `Error: getaddrinfo ENOTFOUND db.<ref>.supabase.co`. The
     Session pooler behaves like a direct connection (no transaction-pooling quirks)
     but resolves over regular IPv4.

---

## 3. Server code — MySQL → Postgres

This is the real work. `mysql2` and `pg` are similar but not drop-in compatible.
Everything below is scoped to what this codebase actually does — checked against the
current routes, not generic advice.

### 3.1 Swap the driver (`server/db.js`)  ✅ done

```js
// server/db.js
const { Pool, types } = require('pg');

// pg returns DATE columns as JS Date objects by default. Force them back to
// the raw 'YYYY-MM-DD' string (oid 1082) -- matches the old mysql2
// `dateStrings: true` behavior, avoiding a day-shift when JSON.stringify
// converts a Date to UTC.
types.setTypeParser(1082, (val) => val);
// NUMERIC/DECIMAL (oid 1700) already comes back as a string by default in
// `pg` -- CLAUDE.md rule 4 is satisfied with zero extra config.

// mysql2 used `?` positional placeholders; pg uses `$1, $2, ...`. Rather than
// hand-renumber ~230 call sites across 17 route files -- several of which
// build WHERE/ORDER/LIMIT clauses dynamically, where per-callsite renumbering
// is genuinely error-prone -- translate `?` to `$N` once, here, for every
// query issued through this pool or a connection from it. Route code
// everywhere else keeps writing `?`, unchanged.
function toPgSql(text) {
  let n = 0;
  return text.replace(/\?/g, () => `$${++n}`);
}
function wrapQueryable(queryable) {
  const rawQuery = queryable.query.bind(queryable);
  queryable.query = (text, params, callback) => {
    if (typeof text === 'string' && params !== undefined) {
      return rawQuery(toPgSql(text), params, callback);
    }
    return rawQuery(text, params, callback);
  };
  return queryable;
}

const pool = wrapQueryable(
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Supabase requires TLS
    max: 10,
  })
);

// mysql2's manual-transaction API (`getConnection` then `beginTransaction`/
// `commit`/`rollback`) is a different shape than pg's (`connect` then plain
// `BEGIN`/`COMMIT`/`ROLLBACK` statements). Aliased here so every route's
// existing transaction code keeps working without changing per file.
const rawConnect = pool.connect.bind(pool);
pool.getConnection = async () => {
  const client = wrapQueryable(await rawConnect());
  client.beginTransaction = () => client.query('BEGIN');
  client.commit = () => client.query('COMMIT');
  client.rollback = () => client.query('ROLLBACK');
  return client;
};

module.exports = pool;
```

`DATABASE_URL` replaces `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` — one
env var, the pooler connection string from §2.5.

This shim decision matters for §3.2 below: because `?` placeholders and the
mysql2-shaped transaction API both keep working unchanged, the actual per-route
diff is much smaller than a literal `?`→`$N` migration would be.

### 3.2 Query-call-site changes — apply everywhere  ✅ done

~230 query call sites across 17 files used a handful of `mysql2`-specific patterns.
Thanks to the §3.1 shim, `?` placeholders and `getConnection`/`beginTransaction`/
`commit`/`rollback`/`release` did **not** need to change anywhere. What was left,
per file:

| mysql2 | pg | Why |
|---|---|---|
| `const [rows] = await pool.query(sql, params)` | `const { rows } = await pool.query(sql, params)` | pg resolves to one result object, not a `[rows, fields]` tuple |
| `const [[row]] = await pool.query(...)` | `const { rows } = await pool.query(...); const row = rows[0];` | same, for single-row/aggregate results |
| `const [result] = await conn.query(INSERT/UPDATE...)` | `const result = await conn.query(...)` | pg's result for a write is the object itself, not a 1-element array |
| `result.insertId` | Add `RETURNING id` to the `INSERT`, then `result.rows[0].id` | pg doesn't auto-report the new id |
| `result.affectedRows` | `result.rowCount` | Different property name |
| `err.errno === 1062` (dup key) | `err.code === '23505'` | Different error taxonomy |
| `err.errno === 1452` (FK violation) | `err.code === '23503'` | Different error taxonomy |
| `SUBSTRING_INDEX(code, '.', 1)` (`budgetItems.js`) | `split_part(code, '.', 1)` | MySQL-only function |
| `DATE_FORMAT(col, '%Y-%m')` (`projects.js`, ×6) | `TO_CHAR(col, 'YYYY-MM')` | MySQL-only function |
| `DATE_SUB(col, INTERVAL WEEKDAY(col) DAY)` (`projects.js` `/weekly-burn`, ×4) | `(col - (EXTRACT(ISODOW FROM col)::int - 1))` | No direct equivalent — MySQL's `WEEKDAY()` is 0=Mon..6=Sun, Postgres's `ISODOW` is 1=Mon..7=Sun, so the offset differs by one |
| `err.code === 'ER_DUP_ENTRY'` (`purchaseOrders.js`) | `err.code === '23505'` | Leftover MySQL string code doing the same duplicate-key check as the `errno` row above |

Example, from `server/routes/auth.js` (no `?`→`$N` change needed — the shim handles it):

```js
// before (mysql2)
const [rows] = await pool.query(
  'SELECT id, username, password_hash, full_name FROM users WHERE username = ? AND is_active = 1',
  [username]
);

// after (pg)
const { rows } = await pool.query(
  'SELECT id, username, password_hash, full_name FROM users WHERE username = ? AND is_active = 1',
  [username]
);
```

Example, from `server/routes/budgetItems.js` (insert + relies on `insertId`):

```js
// before
const [result] = await conn.query(
  `INSERT INTO budget_items (...) VALUES (?, ?, ...)`,
  [...]
);
const relinked = await relinkPlanningLines(conn, projectId, result.insertId, itemNo);

// after
const result = await conn.query(
  `INSERT INTO budget_items (...) VALUES (?, ?, ...) RETURNING id`,
  [...]
);
const relinked = await relinkPlanningLines(conn, projectId, result.rows[0].id, itemNo);
```

`SELECT ... FOR UPDATE` needs no change — identical syntax in Postgres.

This was done via parallel review of each route file — the two MySQL-only-function
gotchas (`DATE_SUB`/`WEEKDAY` and the stray `ER_DUP_ENTRY` string code) surfaced during
that pass precisely because each file got focused attention rather than a single blind
find-and-replace across all of them.

### 3.3 `server/scripts/create-user.js` — your one demo login  ✅ done

```js
// MySQL's ON DUPLICATE KEY UPDATE -> Postgres's ON CONFLICT ... DO UPDATE
await pool.query(
  `INSERT INTO users (username, password_hash, full_name)
   VALUES ($1, $2, $3)
   ON CONFLICT (username) DO UPDATE
     SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name`,
  [username, hash, fullName || null]
);
```

Run this once, from your own machine, against the **Session pooler** connection string
(§2.5) — set it as `DATABASE_URL` in `server/.env`, then
`node scripts/create-user.js demo <a-real-password>`.
This is the one user CLAUDE.md's design already calls for — don't add a signup flow or
a second user; the schema and `requireAuth` already assume exactly one active account
at a time.

### 3.4 Session store — serverless has no shared memory  ✅ done

`express-session`'s default `MemoryStore` (what's running today) keeps sessions in the
Node process's RAM. On Vercel, each request can hit a **different, short-lived**
function instance — a session set on one invocation isn't guaranteed to exist on the
next, so logins would randomly fail. Point the store at Postgres instead:

```bash
cd server && npm install connect-pg-simple
```

```js
// server/index.js
const pgSession = require('connect-pg-simple')(session);
const pool = require('./db');

app.use(
  session({
    store: new pgSession({ pool, createTableIfMissing: true }),
    name: process.env.SESSION_COOKIE_NAME || 'connect.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      // NOT `NODE_ENV === 'production'` -- the real Windows deployment sets
      // NODE_ENV=production too (DEPLOYMENT.md step 7) while still serving
      // plain HTTP, and a `secure` cookie is silently dropped over HTTP,
      // which would break login there. `VERCEL` is set automatically by
      // that platform only, so this can't affect the real deployment.
      secure: Boolean(process.env.VERCEL),
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  })
);
```

`createTableIfMissing: true` creates its own `session` table on first run — no manual
migration needed. This is the smallest change that keeps `requireAuth.js` and every
route's `req.session.userId` / `req.session.username` working exactly as-is.

Because `secure` only turns on under Vercel, testing this locally against Supabase still
works over plain `http://localhost` — the cookie just won't be marked secure until it's
actually deployed.

### 3.5 File uploads (PO attachments) — disabled on Vercel  ✅ done

`server/lib/poAttachmentStorage.js` writes to `server/uploads/...` via `multer.diskStorage`.
Vercel's filesystem is read-only except `/tmp`, and `/tmp` doesn't persist between
invocations or get shared across instances — an upload there wouldn't silently fail,
it would throw a filesystem error partway through the request.

Decided: disable it for this deployment rather than build Supabase Storage support.
The upload route now refuses cleanly instead of erroring:

```js
// server/routes/purchaseOrders.js, top of the upload handler
if (process.env.VERCEL) {
  return res.status(501).json({ error: 'File attachments are not available in this deployment.' });
}
```

The client's "+ Add file" button already surfaces `upload.error.message` on failure
(`PurchaseOrderAttachments.tsx`), so this reads as a clean, worded message rather than a
crash — no client-side change needed. If you want attachments working later: swap
`multer.diskStorage` for `multer.memoryStorage()` and upload the buffer to a Supabase
Storage bucket instead, storing the returned path in `purchase_order_attachments.file_name`.
That's a real feature addition, not a config change — budget it as its own task.

### 3.6 Drop the "Backup now" feature on Vercel  ✅ done

`server/lib/backup.js` shells out to a hardcoded local path to `mysqldump.exe` and
writes to a local `backups/` folder — neither exists in a serverless environment, and
it's MySQL-specific anyway. Rather than remove the route outright (which would also
remove it from the real Windows deployment, where it's the actual safety net), it's
mounted conditionally in `server/index.js`: `if (!process.env.VERCEL) { app.use('/api/backup', ...) }`.
On Vercel the route simply doesn't exist; the client's "Backup now" button (in
`Layout.tsx`, via `BackupButton.tsx`) will 404 if clicked there — remove that button
from `Layout.tsx` if you want it gone from the UI too, it's not wired to any config
flag. Supabase takes its own automatic backups (**Database → Backups** in the
dashboard) either way.

### 3.7 Serverless entrypoint  ✅ done

`server/index.js` used to end with an unconditional `app.listen(port, ...)`, which is
correct for the local double-click deployment but wrong for a serverless function —
Vercel invokes the exported handler per-request, it doesn't run a long-lived listener.
It's now dual-mode: `if (require.main === module) { app.listen(...) }` else
`module.exports = app`. The same `!process.env.VERCEL` guard from §3.6 also wraps the
static-client-serving block (`express.static(clientDist)` + the SPA fallback), since on
Vercel the client is served by Vercel itself, not Express. `process.env.VERCEL` is set
automatically by the platform — nothing to configure.

---

## 4. Vercel — project setup

### 4.1 Repo layout Vercel needs  ✅ done

Add one new file at the **repo root**, `api/index.js`:

```js
module.exports = require('../server/index.js');
```

And a `vercel.json` at the repo root:

```json
{
  "buildCommand": "cd client && npm install && npm run build",
  "outputDirectory": "client/dist",
  "installCommand": "cd server && npm install && cd ../client && npm install",
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api" }
  ]
}
```

This tells Vercel: build the Vite client as the static site, and route every
`/api/*` request to the `api/index.js` function (which is just the existing Express
app). Vercel forwards the *original* request path to the function, so Express's own
`app.use('/api/auth', ...)`-style route mounts still match correctly — nothing in the
route definitions themselves needs to change for this.

### 4.2 Import the project

1. Push this repo to GitHub (a **private** repo is the safer default given item §1 —
   make it public only once you've re-checked nothing sensitive is in git history;
   `git log --all --oneline -- db/rcsni_cost_clean_2026-08-06.sql` and similar is worth
   running if this repo ever held real data).
2. In Vercel: **Add New → Project**, import the GitHub repo.
3. Framework preset: **Other** (Vercel won't auto-detect this custom split layout;
   the `vercel.json` above handles it).
4. Leave the root directory as the repo root — don't point it at `client/`, since the
   `api/` function and `vercel.json` need to be visible at the top level.

### 4.3 Environment variables

Set these in **Project Settings → Environment Variables** (Production, and Preview if
you want PR previews to work too):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase **pooler** connection string (§2.5) |
| `SESSION_SECRET` | A long random string — generate one, don't reuse the local `.env` value |
| `SESSION_COOKIE_NAME` | e.g. `portfolio-demo.sid` |
| `CLIENT_ORIGIN` | Your Vercel deployment URL, e.g. `https://your-app.vercel.app` — since client and API share the same origin under this `vercel.json` setup, CORS barely matters, but `cors()` in `index.js` still reads this var |

Do **not** set `PORT` — Vercel manages that for serverless functions.

### 4.4 Deploy

Click **Deploy**. Once it finishes:

1. Run the demo-user script from your machine against the Supabase **direct**
   connection string (§3.3) if you haven't already.
2. Visit the deployment URL, log in with the demo credentials, confirm the dashboard
   (`v_budget_vs_actual` data) renders using the fictional seed numbers.
3. Check the browser's Network tab for `/api/...` calls succeeding (not 404/500) and
   the session cookie actually being set (Application tab → Cookies).

---

## 5. Order of operations, start to finish

1. `db/schema.postgres.sql` already exists — load it into Supabase (§2).
2. Convert `server/db.js`, then one route file at a time (§3.1–3.2), running each
   against Supabase locally (point your local `.env`'s `DATABASE_URL` at the Supabase
   **direct** connection string for this) before moving to the next file. This is the
   long part — 17 files, but mechanical once the pattern clicks.
3. Swap the session store (§3.4), disable backup + decide on attachments (§3.5–3.6).
4. Add the dual local/serverless entrypoint (§3.7).
5. Create the demo user (§3.3).
6. Add `api/index.js` + `vercel.json` (§4.1), push to GitHub, import into Vercel,
   set env vars, deploy (§4.2–4.4).
7. Smoke-test the live URL end to end: login, dashboard, one write action (e.g. add a
   budget revision) to confirm the Postgres write path and the audit log both work.

## 6. Things that will bite you if skipped

- Using the **Direct connection** string (`db.<ref>.supabase.co`) for anything run from
  your own machine — it's IPv6-only and fails with `Error: getaddrinfo ENOTFOUND
  db.<ref>.supabase.co` on most home/office networks. Use the **Session pooler** string
  instead for local scripts (§2.5) — hit this while testing `create-user.js`.
- Forgetting `ssl: { rejectUnauthorized: false }` in `server/db.js` — Supabase refuses
  plain connections.
- Using the **direct** (5432) connection string in `DATABASE_URL` on Vercel instead of
  the **pooler** (6543) one — works fine in testing, then intermittently fails under
  any concurrent traffic once connections pile up.
- Keying the session cookie's `secure` flag off `NODE_ENV` instead of `VERCEL` — the
  real Windows deployment also sets `NODE_ENV=production` (per `DEPLOYMENT.md`) while
  serving plain HTTP, so an `NODE_ENV`-keyed `secure` flag would silently break login
  there. `server/index.js` keys it off `process.env.VERCEL` specifically to avoid this.
- Missing `RETURNING id` on any `INSERT` whose result feeds a later query (audit log,
  child-row creation, the `res.status(201).json(...)` response) — `result.rows[0]` is
  `undefined` instead of throwing, so this fails silently as a `NULL` reference deeper
  in the code rather than at the insert itself.
