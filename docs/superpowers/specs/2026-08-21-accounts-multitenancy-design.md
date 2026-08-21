# Accounts & Multi-Tenancy Foundation — Design Spec

**Status:** Approved for planning
**Scope:** Sub-project 1 of 3 (see "Related work" at the end). This spec covers auth + data
ownership only — the marketing site and onboarding polish are separate specs that depend on
this one.

## Context

The portfolio deployment (`DEPLOY_VERCEL_SUPABASE.md`) currently has exactly one hardcoded
demo login (`demo`/bcrypt password, `express-session` + a Postgres-backed session store) and
exactly one project (`PROJECT_ID = 1`, hardcoded client-side). The goal now is to let anyone
sign up, get their own private project, and use the tool with their own data — while keeping
the existing demo login as a no-signup-required preview.

This is a genuine pivot away from CLAUDE.md's original design ("one user, no multi-tenancy,
Villasis runs as its own separate deployment"), which was correct for the real internal tool
but doesn't apply to this public portfolio build. `db/schema.sql` (MySQL, the real deployment)
and CLAUDE.md are unaffected by anything in this spec — only the Postgres/portfolio path
changes.

## Decisions already made (see chat log for the reasoning)

1. **Auth provider: Supabase Auth**, not a custom Express auth system. Supabase already hosts
   the database and has a full Auth product (email/password, Google OAuth, verification,
   password reset) — building that by hand in Express would be strictly worse: more code, more
   security surface, and duplicates something already running.
2. **Ownership model: one project per account.** No project switcher, no multi-project UI. An
   account's project is looked up by `owner_id`, not chosen from a list.
3. **Onboarding: setup wizard.** First login with no project yet redirects to a short form
   (project name, company name, start date) before anything else is usable.
4. **Demo access stays**, as one real, fixed Supabase Auth account whose project holds the
   existing fictional seed data. "View demo" signs in as that account programmatically — it is
   not a separate no-auth code path.
5. **De-branding**: the demo project's name/company and the app's own header/login copy drop
   all industry-specific framing ("Sample Logistics Corp.", cold storage, construction). The
   product is positioned generically: project cost, purchase order, and payroll tracking for
   any accountant/business, not a specific industry.

## What gets deleted

Retiring the whole session-cookie system is a direct consequence of switching to Supabase
Auth, not extra scope:

- `express-session`, `connect-pg-simple`, `cookie-signature` — server dependencies.
- `server/routes/auth.js`'s login/logout/me handlers — replaced by Supabase Auth calls made
  directly from the client.
- `users` table and `server/scripts/create-user.js` — Supabase's own `auth.users` replaces
  this entirely. (No app table should duplicate what Supabase Auth already stores.)
- The `session` table connect-pg-simple auto-created.
- `client/src/hooks/useAuth.ts`'s current cookie-based implementation.

This also makes the manual cookie-signing fix from the last debugging session moot — it's
being deleted, not carried forward. That debugging effort wasn't wasted: it's what proved the
session-cookie approach works at all on this Vercel runtime, which is useful to know, but
Supabase Auth sidesteps the whole class of problem (JWTs in an `Authorization` header, no
cookie transport at all, so nothing for Vercel's response-handling quirks to interfere with).

## Data model changes

```sql
-- projects: link each project to the account that owns it
ALTER TABLE projects ADD COLUMN owner_id UUID NOT NULL REFERENCES auth.users(id);

-- suppliers and workers are currently GLOBAL (no project_id at all) -- a real gap
-- once more than one project/account exists, every account would see every other
-- account's supplier list and worker roster.
ALTER TABLE suppliers ADD COLUMN project_id INTEGER NOT NULL REFERENCES projects(id);
ALTER TABLE workers   ADD COLUMN project_id INTEGER NOT NULL REFERENCES projects(id);
-- existing demo rows backfill to the demo project's id before the NOT NULL applies.

DROP TABLE users; -- and anything that only existed to support it (none currently do --
                   -- created_by/updated_by columns elsewhere are free-text VARCHAR, not
                   -- foreign keys to users.id, so dropping this table is isolated).
```

`fx_rates` stays global — it's explicitly dormant (CLAUDE.md: "no PO is currently recorded in
a foreign currency... do not build FX features unless asked") and out of scope here.

## Request authorization flow

1. Client authenticates against Supabase directly (`supabase.auth.signInWithPassword`,
   `signInWithOAuth({provider: 'google'})`, or `signUp`). Supabase returns a session containing
   a JWT access token.
2. Every API call attaches `Authorization: Bearer <access_token>` (replacing today's
   `credentials: 'include'` cookie transport).
3. Server-side, a new `requireAuth` verifies the token via Supabase's server SDK
   (`supabase.auth.getUser(token)`), attaching `req.user = { id, email }` on success or
   returning 401.
4. A new `GET /api/me` endpoint is the canonical way the client discovers its project:
   returns `{ userId, email, projectId }` if a project exists, or `{ userId, email,
   needsSetup: true }` if not. The client calls this once per session (on app load) rather
   than inferring project state from some other route's error response.
5. A new `resolveProject` middleware runs after `requireAuth` on every other route:
   - Looks up `SELECT id FROM projects WHERE owner_id = $1` for `req.user.id`.
   - If none exists yet: every route except project-creation returns 404 with a
     `{ needsSetup: true }` body the client uses to redirect to `/setup`.
   - If found: for routes shaped `/api/projects/:id/...`, 403s if `:id` doesn't match the
     looked-up project id. For routes with no `:id` in the URL (`/api/suppliers`,
     `/api/meta`), attaches `req.projectId` for the route to use directly instead of a
     hardcoded constant.

This closes cross-account access at the app layer without needing every route rewritten —
it's one middleware change plus removing the now-redundant `requireAuth` cookie check.
Row-Level Security policies mirroring the same `owner_id`/`project_id` scoping are added as
defense-in-depth (Supabase's own recommended practice for multi-tenant apps), but the
middleware is the layer everything actually depends on day to day.

## Client changes

- `PROJECT_ID` stops being a hardcoded module constant (`useProjectData.ts`). It becomes a
  value resolved once per session from a new `/api/me` endpoint (`{ userId, projectId,
  needsSetup }`) and made available via a small context/hook (`useCurrentProject()`), since
  ~22 files currently import the constant directly and need to switch to reading it dynamically.
- `lib/api.ts`'s request helpers attach the Supabase session's access token instead of
  `credentials: 'include'`.
- New `/setup` route + form (project name, company name, start date) → `POST /api/projects` →
  redirect into the app.
- New `/login` and `/signup` pages/flows using `@supabase/supabase-js`'s client methods
  directly (email/password fields + a "Continue with Google" button). A "View demo" link/button
  signs in as the fixed demo account without showing a form.
- Login/header copy de-branded per the decisions above.

## Error handling

- Expired/invalid Supabase token → 401, client redirects to `/login` (mirrors today's
  `ProtectedRoute` behavior, just keyed off token validity instead of session cookie).
- No project yet (`needsSetup: true`) → client redirects to `/setup` instead of rendering the
  dashboard shell.
- Attempting to access a project id that isn't the caller's own → 403, not 404 (don't leak
  whether the id exists).

## Testing

- One Postgres migration script for the schema changes above, run against the existing
  Supabase project (same one already holding the demo data) — not a fresh database.
  Existing demo `suppliers`/`workers` rows get backfilled with the demo project's id as part
  of the same migration, before the `NOT NULL` constraint is added.
- Manual smoke test matching the pattern already used earlier in this deployment: sign up a
  brand-new account, confirm it lands in `/setup`, complete setup, confirm an empty Overview
  renders, create one budget item, confirm it persists and is invisible to a second test
  account.
- Confirm the existing demo account still logs in and shows the existing seed data unchanged.

## Out of scope for this spec (separate specs)

- The public marketing site (landing/about/how-it-works/features/FAQ) — sub-project 2.
- Broader onboarding polish beyond the one setup-wizard form — sub-project 3.
- Removing the "Backup now" feature — small, independent, not blocked by anything here; can be
  done any time.
