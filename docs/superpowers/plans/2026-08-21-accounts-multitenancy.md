# Accounts & Multi-Tenancy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single hardcoded demo login with real Supabase Auth (email/password +
Google), give every account its own private project, and retire the session-cookie system
entirely.

**Architecture:** Client authenticates directly against Supabase Auth and attaches the
resulting JWT as `Authorization: Bearer <token>` on every API call. The server verifies that
token per-request (no session store) and resolves the caller's own project via a new
`owner_id` column on `projects`. `suppliers` and `workers` — currently global tables with no
project scoping at all — gain a `project_id` column so accounts can't see each other's data.

**Tech Stack:** `@supabase/supabase-js` (both client and server), existing Express + `pg` +
React + React Query stack. No new test framework — see the note below.

**Spec:** `docs/superpowers/specs/2026-08-21-accounts-multitenancy-design.md`

**No automated tests exist anywhere in this repo** (confirmed: no Jest/Vitest/Mocha, no
`test` script in either `package.json`). Introducing one is out of scope for this plan. Every
task below verifies with the same manual method already used throughout this deployment:
`curl`/PowerShell `Invoke-RestMethod` against the running server, and/or a browser check. This
is a deliberate deviation from this skill's default TDD step shape, matching the codebase's
actual convention rather than a different one.

## Global Constraints

- One project per account. No project switcher, no multi-project UI (spec decision 2).
- Auth is Supabase Auth only — no new passwords stored in this app's own tables (spec decision 1).
- The existing demo account/project must keep working unchanged after every task (spec decision 4).
- All new user-facing copy is industry-neutral — no "Sample Logistics Corp.", no cold-storage/
  construction framing (spec decision 5).
- Every step that touches `server/db.js`'s pool must keep using its existing `?`→`$N` shim and
  `getConnection`/`beginTransaction`/`commit`/`rollback` aliases — do not bypass them.

---

## Task 0: External setup — Supabase Auth + Google OAuth (manual, no code)

This has to happen before any code in this plan will run. No files change in this task.

**Interfaces:**
- Produces: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — needed by
  Task 1 onward.

- [ ] **Step 1: Get the Supabase API keys**
  In the Supabase dashboard → **Project Settings → API**, copy:
  - **Project URL** (same for both client and server)
  - **`anon` `public` key** — safe to expose in the browser, goes in the client
  - **`service_role` key** — server-only, never exposed to the browser. Treat like a database
    password.

- [ ] **Step 2: Enable Google as an Auth provider**
  In the Supabase dashboard → **Authentication → Providers → Google**, toggle it on. This
  requires a Google Cloud OAuth Client ID/Secret:
  1. In [Google Cloud Console](https://console.cloud.google.com/), create (or reuse) a project.
  2. **APIs & Services → OAuth consent screen** — set up a basic consent screen (External user
     type is fine for this).
  3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → Application
     type: **Web application**.
  4. Under **Authorized redirect URIs**, add the callback URL Supabase's Google provider page
     shows you (looks like `https://<project-ref>.supabase.co/auth/v1/callback`).
  5. Copy the generated **Client ID** and **Client Secret** into Supabase's Google provider
     settings, save.

- [ ] **Step 3: Create the fixed demo account**
  In the Supabase dashboard → **Authentication → Users → Add user**, create one user (e.g.
  `demo@ledgerlab.app`) with a password you choose. Copy its **User UID** (a UUID) — Task 2
  needs it to link the existing demo project to this account.

- [ ] **Step 4: Record the values**
  Save all of these somewhere private (not committed to git): Project URL, anon key, service
  role key, the demo user's password, and the demo user's UUID from Step 3.

---

## Task 1: Server — Supabase admin client

**Files:**
- Create: `server/lib/supabaseAdmin.js`
- Modify: `server/.env.example` (document the two new required vars)

**Interfaces:**
- Produces: `supabaseAdmin` (default export) — a configured `@supabase/supabase-js` client
  used by Task 3's `requireAuth` to verify tokens.

- [ ] **Step 1: Install the dependency**

```bash
cd server && npm install @supabase/supabase-js
```

- [ ] **Step 2: Create the admin client**

```js
// server/lib/supabaseAdmin.js
const { createClient } = require('@supabase/supabase-js');

// Service-role key -- server-only, never sent to the browser. Used to verify
// tokens the client got from its own (anon-key) Supabase Auth session.
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

module.exports = supabaseAdmin;
```

- [ ] **Step 3: Document the env vars**

Add to `server/.env.example`:

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=change-me
```

Add the real values (from Task 0) to your actual local `server/.env`.

- [ ] **Step 4: Verify it loads without throwing**

```bash
cd server && node -e "require('dotenv').config(); require('./lib/supabaseAdmin'); console.log('loaded OK')"
```
Expected: prints `loaded OK` with no error.

- [ ] **Step 5: Commit**

```bash
git add server/lib/supabaseAdmin.js server/.env.example server/package.json server/package-lock.json
git commit -m "Add Supabase admin client for server-side token verification"
```

---

## Task 2: Database migration — ownership, project scoping, drop `users`

**Files:**
- Create: `db/migrations/001_accounts_multitenancy.sql`

**Interfaces:**
- Consumes: the demo user's UUID from Task 0, Step 3.
- Produces: `projects.owner_id`, `suppliers.project_id`, `workers.project_id` — every task
  from Task 3 onward assumes these columns exist.

- [ ] **Step 1: Write the migration**

Replace `<DEMO_USER_UUID>` with the actual UUID from Task 0 before running this.

```sql
-- db/migrations/001_accounts_multitenancy.sql
-- Run this against the same Supabase Postgres project that already holds
-- the demo data (loaded from db/schema.postgres.sql). Not a fresh-DB script.

ALTER TABLE projects ADD COLUMN owner_id UUID;
UPDATE projects SET owner_id = '<DEMO_USER_UUID>' WHERE id = 1;
ALTER TABLE projects ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE projects ADD CONSTRAINT uk_projects_owner UNIQUE (owner_id);

ALTER TABLE suppliers ADD COLUMN project_id INTEGER;
UPDATE suppliers SET project_id = 1;
ALTER TABLE suppliers ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE suppliers ADD CONSTRAINT fk_supplier_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
CREATE INDEX ix_supplier_project ON suppliers (project_id);

ALTER TABLE workers ADD COLUMN project_id INTEGER;
UPDATE workers SET project_id = 1;
ALTER TABLE workers ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE workers ADD CONSTRAINT fk_worker_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
CREATE INDEX ix_worker_project ON workers (project_id);

DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS session; -- connect-pg-simple's auto-created table, orphaned once
                               -- Task 6 removes that dependency entirely.
```

The `uk_projects_owner` unique constraint enforces "one project per account" (spec decision 2)
at the database level, not just in application code.

- [ ] **Step 2: Run it**

Paste the file's contents (with the real UUID substituted) into Supabase's **SQL Editor** and
run it.

- [ ] **Step 3: Verify**

In the same SQL Editor:

```sql
SELECT id, owner_id FROM projects;
SELECT COUNT(*) FROM suppliers WHERE project_id IS NULL;
SELECT COUNT(*) FROM workers WHERE project_id IS NULL;
```
Expected: the demo project shows the UUID from Task 0; both `COUNT(*)` queries return `0`.

- [ ] **Step 4: Commit**

```bash
git add db/migrations/001_accounts_multitenancy.sql
git commit -m "Add migration for account ownership and supplier/worker project scoping"
```
(Commit the file with the real UUID redacted back to `<DEMO_USER_UUID>` first if this repo is
ever made public — see `DEPLOY_VERCEL_SUPABASE.md` §1 on what not to commit.)

---

## Task 3: Server — `requireAuth` rewrite + `resolveProject` middleware

**Files:**
- Modify: `server/middleware/requireAuth.js`
- Create: `server/middleware/resolveProject.js`

**Interfaces:**
- Consumes: `supabaseAdmin` from Task 1.
- Produces: `req.user = { id, email }` (set by `requireAuth`), `req.projectId` (set by
  `resolveProject`) — every route handler from Task 5 onward reads these instead of a session.

- [ ] **Step 1: Rewrite `requireAuth`**

```js
// server/middleware/requireAuth.js
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
```

- [ ] **Step 2: Write `resolveProject`**

```js
// server/middleware/resolveProject.js
const pool = require('../db');

async function resolveProject(req, res, next) {
  try {
    const { rows } = await pool.query('SELECT id FROM projects WHERE owner_id = $1', [req.user.id]);
    const project = rows[0];

    if (!project) {
      return res.status(404).json({ needsSetup: true });
    }

    if (req.params.id !== undefined && Number(req.params.id) !== project.id) {
      return res.status(403).json({ error: 'forbidden' });
    }

    req.projectId = project.id;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { resolveProject };
```

- [ ] **Step 3: Verify with a real token**

Get a token by signing in as the demo account from a browser console on any page (after Task 7
sets up the client Supabase SDK you can just call `supabase.auth.signInWithPassword(...)`), or
temporarily via `curl` against Supabase's own REST auth endpoint:

```bash
curl -s -X POST "https://<project-ref>.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: <anon-key>" -H "Content-Type: application/json" \
  -d '{"email":"demo@ledgerlab.app","password":"<demo-password>"}'
```
Copy the `access_token` from the response, then:

```bash
curl -s http://localhost:4000/api/projects/1/summary -H "Authorization: Bearer <access_token>"
```
Expected: the same JSON summary data seen earlier in this deployment (not a 401).

```bash
curl -s http://localhost:4000/api/projects/1/summary
```
Expected: `{"error":"not authenticated"}` with status 401 (no token at all).

- [ ] **Step 4: Commit**

```bash
git add server/middleware/requireAuth.js server/middleware/resolveProject.js
git commit -m "Verify Supabase JWTs and resolve the caller's own project per-request"
```

---

## Task 4: Server — `GET /api/me` and `POST /api/projects` (setup)

**Files:**
- Create: `server/routes/me.js`
- Create: `server/routes/createProject.js`

**Interfaces:**
- Consumes: `req.user` from Task 3's `requireAuth` (neither route uses `resolveProject` — see
  Task 6 for why).
- Produces: the exact response shapes Task 9's client hook depends on:
  `{ userId, email, projectId }` or `{ userId, email, needsSetup: true }`.

- [ ] **Step 1: Write `GET /api/me`**

```js
// server/routes/me.js
const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id FROM projects WHERE owner_id = $1', [req.user.id]);
    const project = rows[0];
    if (!project) {
      return res.json({ userId: req.user.id, email: req.user.email, needsSetup: true });
    }
    res.json({ userId: req.user.id, email: req.user.email, projectId: project.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

- [ ] **Step 2: Write `POST /api/projects` (create)**

```js
// server/routes/createProject.js
const express = require('express');
const pool = require('../db');

const router = express.Router();

router.post('/', async (req, res, next) => {
  const { name, company, location } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

  try {
    const { rows: existing } = await pool.query('SELECT id FROM projects WHERE owner_id = $1', [req.user.id]);
    if (existing.length > 0) return res.status(400).json({ error: 'you already have a project' });

    const { rows } = await pool.query(
      `INSERT INTO projects (owner_id, code, name, company, location, vat_inclusive, status)
       VALUES ($1, $2, $3, $4, $5, 1, 'active') RETURNING id`,
      [req.user.id, `P${Date.now()}`, name.trim(), company ? company.trim() : null, location || null]
    );
    res.status(201).json({ projectId: rows[0].id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

- [ ] **Step 3: Wire both into `server/index.js`**

See Task 6 for the full `index.js` rewrite — both routes are mounted there together with
everything else, since mounting order matters (this task's routes must NOT go through
`resolveProject`).

- [ ] **Step 4: Verify (after Task 6 wires the mounts)**

```bash
curl -s http://localhost:4000/api/me -H "Authorization: Bearer <access_token>"
```
Expected (demo account, which already has a project): `{"userId":"...","email":"demo@ledgerlab.app","projectId":1}`.

- [ ] **Step 5: Commit**

```bash
git add server/routes/me.js server/routes/createProject.js
git commit -m "Add /api/me and project-creation endpoints for the setup flow"
```

---

## Task 5: Server — scope `suppliers` and `workers` by project

**Files:**
- Modify: `server/routes/suppliers.js`
- Modify: `server/routes/workers.js`

**Interfaces:**
- Consumes: `req.projectId` from Task 3's `resolveProject`.

- [ ] **Step 1: Read both files fully first**

These files predate project-scoping entirely (their tables had no `project_id` column until
Task 2's migration). Read each file top to bottom before editing — there is no existing
`project_id`/`req.projectId` reference in either one to pattern-match against.

- [ ] **Step 2: Apply this transformation to every query in both files**

For every `SELECT`/`UPDATE`/`DELETE` that reads or touches a row: add `AND project_id = ?` to
the `WHERE` clause (using the next available `?` placeholder position — remember `server/db.js`
auto-translates `?` to `$N`, so just append it positionally, no renumbering needed).

For every `INSERT`: add `project_id` to the column list and `req.projectId` to the params
array, in the same position.

Example (`suppliers.js`'s autocomplete lookup):

```js
// before
const { rows } = await pool.query(
  'SELECT id, name FROM suppliers WHERE is_active = 1 AND name ILIKE ? LIMIT 10',
  [`%${q}%`]
);

// after
const { rows } = await pool.query(
  'SELECT id, name FROM suppliers WHERE is_active = 1 AND name ILIKE ? AND project_id = ? LIMIT 10',
  [`%${q}%`, req.projectId]
);
```

Example (an insert):

```js
// before
const result = await conn.query(
  `INSERT INTO suppliers (name, normalized_name, tin, is_active, created_by)
   VALUES (?, ?, ?, 1, ?) RETURNING id`,
  [name, normalizedName, tin, appUser]
);

// after
const result = await conn.query(
  `INSERT INTO suppliers (name, normalized_name, tin, is_active, created_by, project_id)
   VALUES (?, ?, ?, 1, ?, ?) RETURNING id`,
  [name, normalizedName, tin, appUser, req.projectId]
);
```

Apply the same pattern to every query in `workers.js`.

- [ ] **Step 3: Verify**

```bash
curl -s http://localhost:4000/api/suppliers -H "Authorization: Bearer <access_token>"
```
Expected: the same two demo suppliers as before (`Sample Hardware Supply Co.`, `Sample Steel &
Concrete Inc.`) — scoping to project 1 shouldn't change the result for the only account that
exists yet, it just makes the query correct going forward.

- [ ] **Step 4: Commit**

```bash
git add server/routes/suppliers.js server/routes/workers.js
git commit -m "Scope suppliers and workers by project instead of leaving them global"
```

---

## Task 6: Server — rewire `index.js`, delete the old auth system

**Files:**
- Modify: `server/index.js`
- Delete: `server/routes/auth.js`
- Delete: `server/scripts/create-user.js`
- Modify: `server/package.json` (remove `express-session`, `connect-pg-simple`,
  `cookie-signature`, `bcryptjs`)

**Interfaces:**
- Consumes: `requireAuth`/`resolveProject` from Task 3, `me`/`createProject` routes from Task 4.

- [ ] **Step 1: Remove the unused dependencies**

```bash
cd server && npm uninstall express-session connect-pg-simple cookie-signature bcryptjs
```

- [ ] **Step 2: Delete the old auth files**

```bash
rm server/routes/auth.js server/scripts/create-user.js
```

- [ ] **Step 3: Rewrite `server/index.js`**

```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { requireAuth } = require('./middleware/requireAuth');
const { resolveProject } = require('./middleware/resolveProject');

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
app.use('/api/suppliers', requireAuth, resolveProject, require('./routes/suppliers'));
app.use('/api/meta', requireAuth, resolveProject, require('./routes/meta'));

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
```

Note what's gone versus the previous version: `express-session`, `connect-pg-simple`, the
whole `session({...})` config block, and the `/api/backup` mount (removed here per the request
to drop "Backup now" entirely — Task 13 removes the client-side button and the now-orphaned
`server/routes/backup.js`/`server/lib/backup.js` files).

- [ ] **Step 4: Verify the server still starts**

```bash
cd server && npm start
```
Expected: `Server listening on port 4000`, no errors about missing modules.

- [ ] **Step 5: Verify the old login route is gone**

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:4000/api/auth/login
```
Expected: `404` (no route mounted there anymore).

- [ ] **Step 6: Commit**

```bash
git add -A server
git commit -m "Remove session-cookie auth system; wire up Supabase-based auth and routing"
```

---

## Task 7: Client — Supabase SDK and auth hooks

**Files:**
- Create: `client/src/lib/supabaseClient.ts`
- Modify: `client/src/hooks/useAuth.ts`
- Modify: `client/.env.example`

**Interfaces:**
- Produces: `supabase` (the client SDK instance), `useSession()`, `useSignUp()`,
  `useSignInWithPassword()`, `useSignInWithGoogle()`, `useSignOut()` — Task 8, 10, and 11 all
  depend on these exact names.

- [ ] **Step 1: Install the dependency**

```bash
cd client && npm install @supabase/supabase-js
```

- [ ] **Step 2: Create the client SDK instance**

```ts
// client/src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

- [ ] **Step 3: Document the new env vars**

Add to `client/.env.example` (and your real `client/.env`):

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=change-me
```

- [ ] **Step 4: Rewrite `useAuth.ts`**

```ts
// client/src/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return { session, isLoading };
}

export async function signUpWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
}

export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  await supabase.auth.signOut();
}
```

This replaces the entire previous file (cookie-based `useAuthMe`/`useLogin`/`useLogout`) —
delete the old contents rather than merging.

- [ ] **Step 5: Verify in the browser console**

With the dev server running (`npm run dev` in `client/`), open the browser console on any page
and run:

```js
const { supabase } = await import('/src/lib/supabaseClient.ts')
await supabase.auth.signInWithPassword({ email: 'demo@ledgerlab.app', password: '<demo-password>' })
```
Expected: resolves with `{ data: { session: {...}, user: {...} }, error: null }`.

- [ ] **Step 6: Commit**

```bash
git add client/src/lib/supabaseClient.ts client/src/hooks/useAuth.ts client/.env.example client/package.json client/package-lock.json
git commit -m "Replace cookie-based auth hooks with Supabase Auth"
```

---

## Task 8: Client — attach the Supabase token to every API request

**Files:**
- Modify: `client/src/lib/api.ts`

**Interfaces:**
- Consumes: `supabase` from Task 7.

- [ ] **Step 1: Add a helper that reads the current access token**

```ts
// client/src/lib/api.ts — add near the top, after the API_BASE constant
import { supabase } from './supabaseClient';

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
```

- [ ] **Step 2: Use it in every request function, replacing `credentials: 'include'`**

Apply this to `fetchJson`, `sendJson`, `deleteRequest`, and `postFormData` — all four currently
pass `credentials: 'include'`, which is no longer needed (no cookies involved) and should be
removed. Example for `fetchJson`:

```ts
// before
export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include', ...init });
  ...
}

// after
export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers: { ...headers, ...init?.headers } });
  ...
}
```

Apply the equivalent change to `sendJson` (merge `authHeaders()` into its existing
`Content-Type` header), `deleteRequest`, and `postFormData` (merge into the request's headers
without overriding `FormData`'s own auto-set `Content-Type`).

- [ ] **Step 3: Verify**

With the app running and signed in (via Task 7's browser-console sign-in), open the Network
tab and trigger any data fetch (reload the Overview page). Confirm the request's headers show
`Authorization: Bearer ...` and no `Cookie` header is being relied upon.

- [ ] **Step 4: Commit**

```bash
git add client/src/lib/api.ts
git commit -m "Attach Supabase access token to API requests instead of session cookies"
```

---

## Task 9: Client — dynamic project id, replacing the hardcoded constant

**Files:**
- Modify: `client/src/hooks/useProjectData.ts`
- Modify (same pattern, 16 files): `useBudgetItemDetail.ts`, `useCashAdvances.ts`,
  `usePurchaseOrders.ts`, `useDashboardAnalytics.ts`, `useAdditionalPayments.ts`,
  `usePayroll.ts`, `useReplenishments.ts`, `usePlanningLines.ts`, `useWorkers.ts`, `useWbs.ts`,
  `components/PurchaseOrderAttachments.tsx`, `pages/PurchaseOrders.tsx`, `pages/Payroll.tsx`,
  `pages/Replenishments.tsx`, `pages/CashAdvances.tsx`, `pages/AdditionalPayments.tsx`

**Interfaces:**
- Consumes: `GET /api/me` from Task 4.
- Produces: `useCurrentProject()` returning `{ projectId, needsSetup, isLoading }` — Task 10's
  setup redirect and Task 11's `ProtectedRoute` both depend on this exact shape.

- [ ] **Step 1: Replace the hardcoded constant in `useProjectData.ts`**

```ts
// client/src/hooks/useProjectData.ts
import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '../lib/api';
import type { BudgetSummaryRow, ProjectKpis } from '../types';

interface MeResponse {
  userId: string;
  email: string;
  projectId?: number;
  needsSetup?: boolean;
}

export function useCurrentProject() {
  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => fetchJson<MeResponse>('/api/me'),
  });
  return {
    projectId: data?.projectId,
    needsSetup: data?.needsSetup ?? false,
    isLoading,
  };
}

export function useProjectSummary() {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['project-summary', projectId],
    queryFn: () => fetchJson<BudgetSummaryRow[]>(`/api/projects/${projectId}/summary`),
    enabled: projectId !== undefined,
  });
}

export function useProjectKpis() {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['project-kpis', projectId],
    queryFn: () => fetchJson<ProjectKpis>(`/api/projects/${projectId}/kpis`),
    enabled: projectId !== undefined,
  });
}
```

The `enabled: projectId !== undefined` guard matters — without it, React Query would fire a
request to `/api/projects/undefined/summary` before `/api/me` resolves.

- [ ] **Step 2: Apply the same pattern to the other 16 files**

Each of these files currently has `import { PROJECT_ID } from '../hooks/useProjectData'` (or a
relative path variant) and uses `PROJECT_ID` directly inside a `queryKey` and/or a template
literal URL like `` `/api/projects/${PROJECT_ID}/...` ``. For each file:

1. Change the import to `import { useCurrentProject } from '../hooks/useProjectData'` (adjust
   relative path per file's location).
2. Inside each hook/component function, add `const { projectId } = useCurrentProject();` near
   the top.
3. Replace every `PROJECT_ID` reference with `projectId`.
4. Add `enabled: projectId !== undefined` (or equivalent, e.g. `!!projectId`) to every
   `useQuery`/`useMutation` in that file that wasn't already gated — a mutation's `mutationFn`
   should also guard at its top with `if (!projectId) throw new Error('no project')`, since
   mutations don't have an `enabled` option.

This is mechanical and identical across all 16 files — read each one, find every `PROJECT_ID`
occurrence, apply the four steps above.

- [ ] **Step 3: Verify the build**

```bash
cd client && npm run build
```
Expected: no TypeScript errors, no remaining references to a `PROJECT_ID` export (it no longer
exists — every consumer must have switched to `useCurrentProject()`).

```bash
grep -rn "PROJECT_ID" client/src
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add client/src
git commit -m "Replace hardcoded PROJECT_ID with per-account project resolved from /api/me"
```

---

## Task 10: Client — setup wizard

**Files:**
- Create: `client/src/pages/Setup.tsx`
- Modify: `client/src/App.tsx` (add the route)
- Modify: `client/src/components/ProtectedRoute.tsx`

**Interfaces:**
- Consumes: `useCurrentProject()` from Task 9, `fetchJson`/`postJson` from `lib/api.ts`.

- [ ] **Step 1: Write the setup form**

```tsx
// client/src/pages/Setup.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { postJson } from '../lib/api';
import { Button } from '../components/Button';

export function Setup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await postJson('/api/projects', { name, company });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-5 rounded-lg border border-rule bg-surface p-7">
        <h1 className="font-display text-2xl font-semibold text-ink">Set up your project</h1>
        <p className="text-sm text-ink-muted">One project per account — you can rename this later.</p>

        {error && <p className="rounded-sm border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Project name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-sm border border-rule-strong bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Company (optional)</span>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full rounded-sm border border-rule-strong bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
          />
        </label>

        <Button type="submit" variant="primary" disabled={isSubmitting} className="mt-1 justify-center">
          {isSubmitting ? 'Creating…' : 'Create project'}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Add the route in `App.tsx`**

Add `<Route path="setup" element={<Setup />} />` as a sibling of the `login` route (outside
`ProtectedRoute`'s `Outlet` wrapper, but still requires a signed-in session — Step 3 handles
that distinction).

- [ ] **Step 3: Update `ProtectedRoute` to redirect into setup**

```tsx
// client/src/components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../hooks/useAuth';
import { useCurrentProject } from '../hooks/useProjectData';

export function ProtectedRoute() {
  const { session, isLoading: sessionLoading } = useSession();
  const { needsSetup, isLoading: projectLoading } = useCurrentProject();
  const location = useLocation();

  if (sessionLoading || (session && projectLoading)) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (needsSetup && location.pathname !== '/setup') return <Navigate to="/setup" replace />;
  if (!needsSetup && location.pathname === '/setup') return <Navigate to="/" replace />;
  return <Outlet />;
}
```

- [ ] **Step 4: Verify**

Sign up a brand-new test account (via Task 11's signup form, or directly via
`supabase.auth.signUp` in the browser console). Confirm: landing on any protected route
redirects to `/setup`; submitting the form creates a project and lands on Overview; Overview
shows an empty state (no budget items) rather than an error.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Setup.tsx client/src/App.tsx client/src/components/ProtectedRoute.tsx
git commit -m "Add setup wizard for accounts without a project yet"
```

---

## Task 11: Client — Login/Signup pages and demo access

**Files:**
- Modify: `client/src/pages/Login.tsx`
- Create: `client/src/pages/Signup.tsx`
- Modify: `client/src/App.tsx` (add the signup route)

**Interfaces:**
- Consumes: `signInWithPassword`, `signInWithGoogle`, `signUpWithPassword` from Task 7.

- [ ] **Step 1: Rewrite `Login.tsx`**

Replace the existing form's submit handler and add a Google button and demo-login button.
Keep the existing ledger-paper background/layout; only the auth logic and copy change:

```tsx
// client/src/pages/Login.tsx — key changes only, keep existing JSX structure/styling
import { signInWithGoogle, signInWithPassword } from '../hooks/useAuth';

// inside the component, replace the old useLogin()-based handleSubmit with:
async function handleSubmit(event: React.FormEvent) {
  event.preventDefault();
  setError(null);
  try {
    await signInWithPassword(username, password); // username field now holds an email
    navigate('/', { replace: true });
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Sign in failed');
  }
}

async function handleGoogleSignIn() {
  await signInWithGoogle(); // redirects away; no navigate() call needed here
}

async function handleDemoSignIn() {
  setError(null);
  try {
    await signInWithPassword('demo@ledgerlab.app', '<demo-password>');
    navigate('/', { replace: true });
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Demo sign-in failed');
  }
}
```

Add a "Continue with Google" button calling `handleGoogleSignIn`, a "View demo" button calling
`handleDemoSignIn`, and a link to `/signup` for new accounts. Change the header text from
"SAMPLE LOGISTICS CORP. — COST & PAYROLL MONITOR" to something generic, e.g. "Track project
costs, purchase orders, and payroll in one place." (spec decision 5 — no company/industry
framing).

- [ ] **Step 2: Write `Signup.tsx`**

Same structure as the rewritten `Login.tsx`, but calling `signUpWithPassword(email, password)`
and, on success, showing "Check your email to confirm your account" (Supabase's default flow
requires email confirmation before first sign-in) rather than navigating immediately.

- [ ] **Step 3: Add the route**

Add `<Route path="signup" element={<Signup />} />` in `App.tsx`, alongside `login`.

- [ ] **Step 4: Verify**

Manually test all three entry paths: email/password sign-up (check for the confirmation
message), Google sign-in (completes the OAuth redirect and lands signed in), and "View demo"
(signs in as the fixed demo account immediately).

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Login.tsx client/src/pages/Signup.tsx client/src/App.tsx
git commit -m "Add sign-up flow, Google sign-in, and demo access to the login page"
```

---

## Task 12: De-branding

**Files:**
- Modify: `client/src/main.tsx`
- Modify: `client/src/components/Layout.tsx`
- SQL update via Supabase SQL Editor (no file — direct data change)

**Interfaces:**
- None (copy-only changes).

- [ ] **Step 1: Update the demo project's name/company**

In Supabase's SQL Editor:

```sql
UPDATE projects SET name = 'Demo Project', company = 'Demo Company' WHERE id = 1;
```

- [ ] **Step 2: Update hardcoded header copy**

In `client/src/main.tsx`, change:
```ts
document.title = 'LedgerLab — Sample Cold Storage Expansion'
```
to:
```ts
document.title = 'LedgerLab — Project Cost & Payroll Tracker'
```

In `client/src/components/Layout.tsx`, change the "Sample Logistics Corp. — Cost & Payroll
Monitor" span to "Project Cost & Payroll Tracker" (or similar generic phrasing — no company
name).

- [ ] **Step 3: Verify**

```bash
grep -rn "Sample Logistics\|Sample Cold Storage\|Sample Company" client/src
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add client/src/main.tsx client/src/components/Layout.tsx
git commit -m "Remove remaining industry-specific branding from demo project and UI copy"
```

---

## Task 13: Remove "Backup now" entirely

**Files:**
- Delete: `server/routes/backup.js`
- Delete: `server/lib/backup.js`
- Modify: `client/src/components/Layout.tsx` (remove the button)
- Delete: `client/src/components/BackupButton.tsx`
- Delete: `client/src/hooks/useBackup.ts`

**Interfaces:**
- None.

- [ ] **Step 1: Remove the server files**

```bash
rm server/routes/backup.js server/lib/backup.js
```
(Task 6 already removed the `/api/backup` mount from `index.js` — nothing else references
these files.)

- [ ] **Step 2: Remove the client files and their usage**

```bash
rm client/src/components/BackupButton.tsx client/src/hooks/useBackup.ts
```
In `client/src/components/Layout.tsx`, remove the `import { BackupButton } from
"./BackupButton";` line and the `<BackupButton />` usage.

- [ ] **Step 3: Verify the build**

```bash
cd client && npm run build
```
Expected: no errors about a missing `BackupButton` import.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Remove Backup now feature entirely — not applicable to a multi-tenant deployment"
```

---

## Final verification (after all 13 tasks)

- [ ] Sign up a brand-new account, confirm the full flow: signup → email confirmation message
  → sign in → setup wizard → empty Overview → create one budget item → it persists on refresh.
- [ ] Sign in as the demo account, confirm all existing seed data still renders exactly as
  before this plan started.
- [ ] Confirm a second brand-new test account cannot see the first test account's or the demo
  account's budget items, suppliers, or workers.
- [ ] Confirm `/api/auth/login` (the old route) 404s and no code anywhere still imports
  `express-session`, `connect-pg-simple`, `cookie-signature`, or `bcryptjs`
  (`grep -rn "express-session\|connect-pg-simple\|cookie-signature\|bcryptjs" server` should
  only match `package-lock.json`, if that).
- [ ] Deploy to Vercel (adding `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` as new env vars alongside the existing ones)
  and repeat the two checks above against the live URL.
