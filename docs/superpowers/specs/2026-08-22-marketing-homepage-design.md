# Marketing Homepage — Design Spec

Sub-project 2 of the accounts/multi-tenancy pivot (see
`docs/superpowers/specs/2026-08-21-accounts-multitenancy-design.md`, sub-project 1,
already built and deployed). This closes the gap it left: an unauthenticated visitor
hitting `/` is currently redirected straight to `/login`, which carries only one line
of pitch copy. This spec adds a real public landing page.

## Goal

A single homepage at `/` for logged-out visitors that explains what the tool does and
funnels them to sign up, sign in, or try the read-only public demo — without touching
any existing authenticated route.

## Audience & framing

Generic accounting/project-cost tracking product pitch. No mention that this is a
portfolio or demo project, no tech-stack name-dropping, no developer-facing framing
anywhere on the page. Copy should read like a real SaaS landing page for accountants
and project managers, consistent with the earlier de-branding work (no "Plaridel",
"Villasis", or "Royale Cold Storage" anywhere — see CLAUDE.md's "Do NOT build" section
and the existing sanitization already done for `DEPLOY_VERCEL_SUPABASE.md`).

## Routing

No new routes. `client/src/components/ProtectedRoute.tsx` currently redirects any
unauthenticated visitor to `/login`, unconditionally, for every path nested under it
(`/`, `/setup`, and everything under `Layout`). It gains exactly one branch:

- No session AND `location.pathname === '/'` → render `<Home />` in place (no redirect,
  no URL change).
- No session, any other path → unchanged: redirect to `/login`.
- Has session → unchanged in every respect, including at `/` (still renders the
  existing dashboard via `Layout` → `Overview`).

`Home` is a standalone full-page component (not wrapped in `Layout`, matching how
`Login.tsx` and `Demo.tsx` already render outside it — `Layout` carries the
authenticated nav/logout bar, which a logged-out visitor should never see).

## Page structure

One page, five sections top to bottom, all using the existing design system (Tailwind
utility classes against the existing color tokens — `bg-canvas`, `text-ink`,
`text-ink-muted`, `border-rule`, `bg-accent`, etc. — plus the existing `Panel` and
`Button` components and `icons.tsx` icon set). No new dependencies, no new CSS tokens.

1. **Nav bar** — "LedgerLab" wordmark left; "Sign in" (`Button variant="outline"` →
   `/login`) and "Get started" (`Button variant="primary"` → `/signup`) right. No
   mobile hamburger menu needed — two links fit at any width this app already
   supports.

2. **Hero** — headline, subhead, two CTAs (`Get started` → `/signup`, `View live demo`
   → `/demo`). Reuses the ledger-paper background treatment already defined inline in
   `Login.tsx` (`repeating-linear-gradient` against `--color-rule`) rather than
   redefining it — extract it to a small shared constant if convenient, but duplicating
   the one style object is also acceptable given it's two short usages.
   - Headline: "Project costs, purchase orders, and payroll — one ledger, not three
     spreadsheets."
   - Subhead: "Track budget against what's actually been committed and what's
     actually been paid, without losing the difference between the two."

3. **How it works** — three cards, no icons needed (text carries this section):
   - **Budget vs. commitment vs. disbursement** — "Approving a budget, awarding a
     contract, and paying cash are three different numbers. This tool keeps them
     separate instead of collapsing them into one misleading total."
   - **Messy real-world entry, handled** — "A review queue holds anything that
     couldn't be confidently parsed or reconciled, so bad data gets fixed in place
     instead of silently dropped or blocking everything else."
   - **Split charges & retention, built in** — "One invoice can span multiple budget
     lines, and holdback retention is tracked separately from money actually owed."

4. **Features** — four blocks, each a short heading + one sentence + an icon from the
   existing `icons.tsx` set (reuse whichever already-defined icons best match; add a
   new one only if nothing existing fits reasonably):
   - **Dashboard & KPIs** — budget vs. actual at a glance, project-wide.
   - **Purchase orders** — payment milestones and retention holdback tracked per PO.
   - **Replenishments & cash advances** — ledger entry with a built-in review queue
     for anything that needs a second look.
   - **Payroll** — read-only payroll ledger with a reconciliation panel.

5. **Closing CTA band** — repeat "Get started" and "View live demo"; a small footer
   line with a "Sign in" link for returning visitors.

## Files touched

- **Create**: `client/src/pages/Home.tsx` — the whole page, five sections as local
  sub-components within the file (content used exactly once; no shared-library split
  needed).
- **Modify**: `client/src/components/ProtectedRoute.tsx` — the one branch described
  above.

No backend changes, no new database schema, no new npm dependencies.

## Testing

No test framework exists in this client (confirmed: no test script in either
`server/package.json` or the client's `package.json`). Verification is manual,
in-browser:

- Logged out, visit `/` → see the new homepage, not a redirect to `/login`.
- Every CTA link (`Get started`, `View live demo`, `Sign in`, nav bar links, footer
  link) navigates to the correct existing route.
- Logged in, visit `/` → unchanged, still the existing dashboard.
- Every other existing route (`/login`, `/signup`, `/demo`, `/setup`, and everything
  under `Layout`) behaves exactly as it did before this change, for both logged-in and
  logged-out visitors.
- Resize to a narrow viewport and confirm the new page doesn't break (existing
  responsive utility classes should carry this without extra work, but verify).

## Explicitly out of scope

- Separate `/about` or `/features` routes — folded into the single homepage per
  discussion.
- Any mention of this being a portfolio/demo project, or of the underlying tech stack.
- A mobile nav menu / hamburger.
- Any change to `/login`, `/signup`, `/demo`, or any authenticated route or component.
- Any backend or database change.
