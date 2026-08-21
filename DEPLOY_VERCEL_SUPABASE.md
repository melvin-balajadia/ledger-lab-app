# Deploying the portfolio version — Vercel + Supabase

This is a **separate, sanitized deployment** for showing the app in a portfolio, not
the accountant's real instance. It uses Postgres (Supabase) instead of MySQL, contains
zero real business data, and is multi-tenant — anyone can sign up and gets their own
empty project, no shared login. `DEPLOYMENT.md` (the Windows/MySQL/real-data setup) is
untouched and still describes the real deployment.

**Decisions this doc assumes**, confirmed up front:
1. Migrate the schema and queries from MySQL to Postgres so the stack is genuinely
   "Vercel + Supabase," rather than hosting MySQL somewhere else.
2. Use **Supabase Auth** (email/password + Google OAuth) instead of the real
   deployment's single hardcoded local account, so the portfolio build works for
   anyone who visits it — each account gets exactly one project, created through a
   setup wizard, starting empty. There is also one public, read-only, credential-free
   `/demo` project for browsing without signing up at all.

That's real migration and redesign work, not just an upload — this doc is long
because both changes have several sharp edges.

## 0. What changes and why

| Piece | Local/real deployment | Portfolio deployment |
|---|---|---|
| Database | MySQL 8, `mysql2` | **Postgres, `pg`** (Supabase) |
| Data | Real figures (`db/rcsni_cost_clean_*.sql`) | **Fictional demo data only** — `db/schema.postgres.sql` |
| Auth | 1 real user, `express-session` + MemoryStore | **Supabase Auth** (email/password + Google), one project per account, JWT Bearer tokens — no server-side sessions at all |
| Multi-tenancy | One project, implicit | **Real multi-tenancy** — `projects.owner_id`, a setup wizard for new accounts, and a public read-only `/demo` project needing no login |
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
  `site.config.ts`, `site.config.example.ts`, and the corresponding `.gitignore` entry
  are gone. There is no longer a single hardcoded `PROJECT_ID` at all — each account's
  project id comes from `projects.owner_id` (`client/src/hooks/useProjectData.ts`'s
  `useCurrentProject()`), and the one id-1 exception (the seeded `DEMO` project) is
  reached only through the dedicated `/demo` route and its own `DemoProjectContext`,
  not a global default.
- Skim `README.md` for anything naming the real company/location — genericize before
  making the repo public, if it isn't already.
- One cosmetic leftover in shared UI code: `client/src/components/AdditionalPaymentForm.tsx`
  has a form placeholder hint (`"e.g. RFPLAEX00101"`) referencing the real project code.
  Harmless either way, but swap it for something generic (e.g. `"e.g. RF00101"`) if you
  want zero real identifiers anywhere in the portfolio build.

---

## 2. Supabase — create the project, load the schema, configure Auth

1. Sign up / log in at supabase.com, **New Project**. Pick a region close to where
   Vercel will run your functions (matters for latency, not correctness).
2. Set a strong database password when prompted — save it, you'll need it for the
   connection string.
3. Once provisioned, go to **SQL Editor** → **New query**, paste the entire contents
   of `db/schema.postgres.sql`, and run it. This creates all 20 tables (including the
   multi-tenancy columns — `projects.owner_id`, `suppliers.project_id`,
   `workers.project_id`), the trigger function, all 11 views, and the small public
   demo seed (project id 1) — nothing else.
4. **Authentication → Providers**: Email is on by default. To also enable **Google**:
   create an OAuth client in Google Cloud Console (APIs & Services → Credentials →
   Create Credentials → OAuth client ID, type "Web application"), add the callback
   URL Supabase shows on this page as an Authorized redirect URI in Google Cloud, then
   paste the resulting Client ID and Client Secret into Supabase's Google provider
   settings and enable it.
5. **Authentication → URL Configuration** — set both of these, not just one:
   - **Site URL**: your production URL (e.g. `https://your-app.vercel.app`). This is
     the fallback Supabase uses only when no `redirectTo` is passed to
     `signInWithOAuth`.
   - **Redirect URLs**: add every origin the app will actually run from —
     `http://localhost:5173` (or whatever port `npm run dev` uses) for local
     development, and your production URL again. `client/src/hooks/useAuth.ts`'s
     `signInWithGoogle()` passes `redirectTo: window.location.origin` explicitly so
     Google sign-in returns to wherever the flow started — but Supabase silently
     ignores a `redirectTo` that isn't in this allow-list and falls back to Site URL
     instead, which is a confusing failure mode (see §6).
   - Free-tier Supabase rate-limits its own outgoing confirmation emails. For local
     testing, confirm test accounts manually instead: **Authentication → Users** →
     select the user → confirm.
6. Find the connection strings via the **Connect** button near the top of the
   dashboard (newer Supabase UIs moved it out of Project Settings). You need **two**
   of these:
   - **Transaction pooler** (port `6543`) — use this as `DATABASE_URL` for the
     deployed app. Serverless functions open a fresh connection per invocation; going
     straight to Postgres exhausts its connection limit almost immediately under any
     real traffic. The pooler (PgBouncer/Supavisor) exists exactly for this.
   - **Session pooler** (port `5432`, hostname like `aws-0-<region>.pooler.supabase.com`)
     — use this for one-off local scripts run from your own machine. **Do not use the
     "Direct connection" string** (`db.<ref>.supabase.co`) for this — that hostname is
     IPv6-only, and most home/office networks can't resolve it, which fails with
     `Error: getaddrinfo ENOTFOUND db.<ref>.supabase.co`. The Session pooler behaves
     like a direct connection (no transaction-pooling quirks) but resolves over
     regular IPv4.
7. **Project Settings → API** — copy the **Project URL**, the **anon/public key**, and
   the **service_role key**. You'll need all three in §4.3. The service_role key
   bypasses every access control and must never reach the client bundle or a public
   repo — it's server-only (`SUPABASE_SERVICE_ROLE_KEY`).

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

### 3.3 Auth — Supabase Auth replaces sessions entirely  ✅ done

The real deployment's single hardcoded account, `express-session`, and
`connect-pg-simple` are gone from this build — not adapted, removed. There is no
`users` table and no server-side session state of any kind.

- **Server side** (`server/middleware/requireAuth.js`): every `/api/*` request (other
  than anonymous GETs to the public demo project, see below) must carry
  `Authorization: Bearer <access_token>`. The middleware verifies it via
  `supabaseAdmin.auth.getUser(token)` — a live call to Supabase, not local JWT
  verification — and attaches `req.user = { id, email }`. `supabaseAdmin` is a
  Supabase client constructed with the **service_role key**, never the anon key.
- **Client side** (`client/src/hooks/useAuth.ts`, `client/src/lib/supabaseClient.ts`):
  a Supabase client constructed with the **anon key** handles sign-up, sign-in, and
  Google OAuth directly against Supabase — the Express server is never in this loop.
  `client/src/lib/api.ts`'s `authHeaders()` attaches the current session's access
  token to every API call.
- **Multi-tenancy** (`server/middleware/resolveProject.js`): each account owns exactly
  one project (`projects.owner_id`, enforced both by a UNIQUE constraint and by
  `server/routes/createProject.js` rejecting a second project for the same account).
  A brand-new account has no project yet — the API returns `404 { needsSetup: true }`,
  which the client (`client/src/pages/Setup.tsx`) turns into the setup wizard.
- **Public demo** (`requireAuth.js`'s `PUBLIC_DEMO_PROJECT_ID = 1`): an unauthenticated
  `GET` to that one project's routes is allowed and read-only; anything else (no
  token and not a GET, or not project 1) is `401`. This is the `DEMO` project seeded
  by `db/schema.postgres.sql` — don't repoint this constant at a different id without
  also moving the seed data, since they're assumed to be the same project.

Nothing here needs a one-off script run from your machine — every account,
including the very first one, is created by visiting the deployed site and signing
up or signing in with Google. The only manual Supabase-side step is the Auth
configuration in §2.4–2.5 (providers, Site URL, Redirect URLs).

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
    { "source": "/api/:path*", "destination": "/api" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

This tells Vercel three things: build the Vite client as the static site, route every
`/api/*` request to the `api/index.js` function (which is just the existing Express
app), and fall back to `index.html` for everything else so a hard refresh on a client
route like `/replenishments` doesn't 404 (a plain static host has no knowledge of
React Router's client-side routes). Vercel forwards the *original* request path to the
function, so Express's own `app.use('/api/projects', ...)`-style route mounts still
match correctly — nothing in the route definitions themselves needs to change for this.

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

| Variable | Where used | Value |
|---|---|---|
| `DATABASE_URL` | server | Supabase **pooler** connection string (§2.6) |
| `SUPABASE_URL` | server | Project URL from §2.7 |
| `SUPABASE_SERVICE_ROLE_KEY` | server | service_role key from §2.7 — **never** prefix this one with `VITE_`, that would ship it to the browser |
| `CLIENT_ORIGIN` | server | Your Vercel deployment URL, e.g. `https://your-app.vercel.app` — since client and API share the same origin under this `vercel.json` setup, CORS barely matters, but `cors()` in `index.js` still reads this var |
| `VITE_SUPABASE_URL` | client (build-time) | Same Project URL as `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | client (build-time) | anon/public key from §2.7 — safe to expose, it's designed to be public and is constrained by Supabase's own row-level policies and this app's own `requireAuth`/`resolveProject` checks |
| `VITE_API_URL` | client (build-time) | Leave unset/empty — the client's `API_BASE` (`client/src/lib/api.ts`) defaults to `''` (same-origin), which is correct under this single-domain `vercel.json` setup. Only set it if the API is genuinely hosted on a different origin. |

Any `VITE_*` variable is baked into the static bundle at build time, not read at
request time — changing one requires a redeploy, not just a restart.

Do **not** set `PORT` — Vercel manages that for serverless functions. Do **not** set
`SESSION_SECRET` / `SESSION_COOKIE_NAME` — there is no session store in this build.

### 4.4 Deploy

Click **Deploy**. Once it finishes:

1. Visit the deployment URL. Sign up with email/password (confirm via the email link,
   subject to Supabase's free-tier rate limit — see §2.5) or sign in with Google.
2. Confirm the setup wizard appears for the brand-new account, create a project
   through it, and confirm the dashboard (`v_budget_vs_actual` data) renders — empty,
   since a new account starts with no data.
3. Visit `/demo` in an incognito window (no login) and confirm the fictional seed data
   renders read-only.
4. Check the browser's Network tab for `/api/...` calls succeeding (not 404/500) and
   carrying an `Authorization: Bearer ...` header once signed in.

---

## 5. Order of operations, start to finish

1. `db/schema.postgres.sql` already exists — load it into Supabase (§2.3), then
   configure Auth providers and URL Configuration (§2.4–2.5).
2. Convert `server/db.js`, then one route file at a time (§3.1–3.2), running each
   against Supabase locally (point your local `.env`'s `DATABASE_URL` at the Supabase
   **Session pooler** connection string for this) before moving to the next file.
   This is the long part — 17 files, but mechanical once the pattern clicks.
3. Wire up Supabase Auth end to end (§3.3): server-side token verification, the
   client's sign-up/sign-in/Google flows, and the multi-tenancy middleware.
4. Disable backup + decide on attachments (§3.5–3.6).
5. Add the dual local/serverless entrypoint (§3.7).
6. Add `api/index.js` + `vercel.json` (§4.1), push to GitHub, import into Vercel,
   set env vars, deploy (§4.2–4.4).
7. Smoke-test the live URL end to end: sign-up, setup wizard, `/demo`, one write action
   (e.g. add a budget revision) to confirm the Postgres write path and the audit log
   both work, and — with two separate test accounts — that neither can see the other's
   data.

## 6. Things that will bite you if skipped

- **Google sign-in redirects to `localhost:3000` (or Supabase's default placeholder)
  in production, sometimes with a token visibly sitting in the URL fragment.** This
  happens when the target origin isn't in **Redirect URLs** (§2.5) — Supabase silently
  falls back to **Site URL** instead of erroring, so the failure looks like a code bug
  rather than a config gap. Fix: add the exact origin (including the deployed domain,
  not just localhost) to Redirect URLs, and confirm Site URL itself isn't still the
  Supabase-generated placeholder.
- Using the **Direct connection** string (`db.<ref>.supabase.co`) for anything run from
  your own machine — it's IPv6-only and fails with `Error: getaddrinfo ENOTFOUND
  db.<ref>.supabase.co` on most home/office networks. Use the **Session pooler** string
  instead for local scripts and local dev (§2.6).
- Forgetting `ssl: { rejectUnauthorized: false }` in `server/db.js` — Supabase refuses
  plain connections.
- Using the **direct** (5432) connection string in `DATABASE_URL` on Vercel instead of
  the **pooler** (6543) one — works fine in testing, then intermittently fails under
  any concurrent traffic once connections pile up.
- A stale `CLIENT_ORIGIN` (e.g. left pointing at production while testing locally, or
  vice versa) causes CORS to silently reject every request from the actual client
  origin — this tends to show up as a runaway retry loop on `/api/me` and a blank
  white screen, not an obvious CORS error in the console.
- Missing `RETURNING id` on any `INSERT` whose result feeds a later query (audit log,
  child-row creation, the `res.status(201).json(...)` response) — `result.rows[0]` is
  `undefined` instead of throwing, so this fails silently as a `NULL` reference deeper
  in the code rather than at the insert itself.
- Never echo `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, or a live Supabase access/
  refresh token anywhere they might be logged, pasted, or committed — all three grant
  broad access and none of them are meant to be user-facing.
