# Marketing Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public marketing landing page at `/` for logged-out visitors, replacing the current unconditional redirect to `/login`.

**Architecture:** One new standalone page component (`Home.tsx`, rendered outside the authenticated `Layout` shell, matching how `Login.tsx`/`Signup.tsx`/`Demo.tsx` already render) plus a small branch inside the existing route guard (`ProtectedRoute.tsx`) that shows it instead of redirecting, only for the exact path `/` and only when there's no session. No other route changes.

**Tech Stack:** React + TypeScript + React Router + Tailwind, matching the rest of `client/`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-22-marketing-homepage-design.md`

## Global Constraints

- No backend, database, or API changes of any kind.
- No new npm dependencies — reuse `Button` (`client/src/components/Button.tsx`), the icon set (`client/src/components/icons.tsx`), and existing Tailwind color tokens (`bg-canvas`, `text-ink`, `text-ink-muted`, `border-rule`, `bg-surface`, `text-accent`, `shadow-card`, `font-display`) exactly as used elsewhere in `client/src/pages/Login.tsx` and `client/src/pages/Signup.tsx`.
- Copy reads as a generic accounting/project-cost product pitch — no mention this is a portfolio or demo project, no tech-stack name-dropping, no company names (Plaridel, Villasis, Royale Cold Storage) anywhere.
- No separate `/about` or `/features` routes — everything lives on the single homepage as sections.
- No changes to `/login`, `/signup`, `/demo`, `/setup`, or any route nested under the authenticated `Layout` — a logged-in visitor's experience at `/` and everywhere else must be byte-for-byte unchanged.
- No test framework exists in this client (no test script in `client/package.json` or `server/package.json`) — verification is manual, in-browser, using the exact steps in Task 1 below.

---

### Task 1: Build and wire the marketing homepage

This is a single task: the new page has no meaningful behavior to verify until it's actually reachable, so building `Home.tsx` and wiring it into `ProtectedRoute.tsx` are one testable unit, not two.

**Files:**
- Create: `client/src/pages/Home.tsx`
- Modify: `client/src/components/ProtectedRoute.tsx` (full current contents shown below, under Step 2)

**Interfaces:**
- Consumes: `Button` from `../components/Button` (props: `{ variant?: 'outline' | 'primary' } & ButtonHTMLAttributes<HTMLButtonElement>`); `IconGrid`, `IconBox`, `IconReceipt`, `IconUsers` from `../components/icons` (props: `{ className?: string }`); `Link`, `useNavigate` from `react-router-dom`.
- Produces: `Home` — a named export, a React component taking no props, for `ProtectedRoute.tsx` to import and render directly (not through a `<Route>` — see Step 2).

- [ ] **Step 1: Create `client/src/pages/Home.tsx`**

```tsx
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { IconBox, IconGrid, IconReceipt, IconUsers } from "../components/icons";

// Same ledger-paper flourish as Login.tsx/Signup.tsx -- see the comment there.
const LEDGER_BACKGROUND = {
  backgroundImage:
    "repeating-linear-gradient(to bottom, transparent, transparent 31px, var(--color-rule) 31px, var(--color-rule) 32px)",
};

const HOW_IT_WORKS = [
  {
    title: "Budget vs. commitment vs. disbursement",
    body: "Approving a budget, awarding a contract, and paying cash are three different numbers. This tool keeps them separate instead of collapsing them into one misleading total.",
  },
  {
    title: "Messy real-world entry, handled",
    body: "A review queue holds anything that couldn't be confidently parsed or reconciled, so bad data gets fixed in place instead of silently dropped or blocking everything else.",
  },
  {
    title: "Split charges & retention, built in",
    body: "One invoice can span multiple budget lines, and holdback retention is tracked separately from money actually owed.",
  },
];

const FEATURES = [
  {
    Icon: IconGrid,
    title: "Dashboard & KPIs",
    body: "Budget vs. actual at a glance, project-wide.",
  },
  {
    Icon: IconBox,
    title: "Purchase orders",
    body: "Payment milestones and retention holdback tracked per PO.",
  },
  {
    Icon: IconReceipt,
    title: "Replenishments & cash advances",
    body: "Ledger entry with a built-in review queue for anything that needs a second look.",
  },
  {
    Icon: IconUsers,
    title: "Payroll",
    body: "Read-only payroll ledger with a reconciliation panel.",
  },
];

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas" style={LEDGER_BACKGROUND}>
      <header className="mx-auto flex max-w-295 items-center justify-between px-4 py-6 sm:px-6">
        <span className="font-display text-xl font-semibold tracking-tight text-ink">
          LedgerLab
        </span>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate("/login")}>
            Sign in
          </Button>
          <Button variant="primary" onClick={() => navigate("/signup")}>
            Get started
          </Button>
        </div>
      </header>

      <section className="mx-auto flex max-w-295 flex-col items-start gap-6 px-4 py-16 sm:px-6 sm:py-24">
        <h1 className="max-w-2xl font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Project costs, purchase orders, and payroll — one ledger, not three
          spreadsheets.
        </h1>
        <p className="max-w-xl text-lg text-ink-muted">
          Track budget against what's actually been committed and what's actually
          been paid, without losing the difference between the two.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={() => navigate("/signup")}>
            Get started
          </Button>
          <Button variant="outline" onClick={() => navigate("/demo")}>
            View live demo
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-295 px-4 py-12 sm:px-6">
        <h2 className="mb-6 font-display text-2xl font-semibold tracking-tight text-ink">
          How it works
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <div
              key={item.title}
              className="rounded-md border border-rule bg-surface p-5 shadow-card"
            >
              <p className="mb-2 text-sm font-semibold text-ink">{item.title}</p>
              <p className="text-sm text-ink-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-295 px-4 py-12 sm:px-6">
        <h2 className="mb-6 font-display text-2xl font-semibold tracking-tight text-ink">
          Everything the spreadsheet couldn't keep up with
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ Icon, title, body }) => (
            <div
              key={title}
              className="rounded-md border border-rule bg-surface p-5 shadow-card"
            >
              <Icon className="mb-3 h-6 w-6 text-accent" />
              <p className="mb-1 text-sm font-semibold text-ink">{title}</p>
              <p className="text-sm text-ink-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto flex max-w-295 flex-col items-center gap-4 px-4 py-16 text-center sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Ready to see it on your own numbers?
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" onClick={() => navigate("/signup")}>
            Get started
          </Button>
          <Button variant="outline" onClick={() => navigate("/demo")}>
            View live demo
          </Button>
        </div>
        <p className="text-sm text-ink-muted">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Modify `client/src/components/ProtectedRoute.tsx`**

Current contents:

```tsx
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

Replace the `if (!session) return <Navigate to="/login" replace />;` line, and add the import, so the full file reads:

```tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../hooks/useAuth';
import { useCurrentProject } from '../hooks/useProjectData';
import { Home } from '../pages/Home';

export function ProtectedRoute() {
  const { session, isLoading: sessionLoading } = useSession();
  const { needsSetup, isLoading: projectLoading } = useCurrentProject();
  const location = useLocation();

  if (sessionLoading || (session && projectLoading)) return null;
  if (!session) {
    // The public marketing homepage lives at "/" for logged-out visitors --
    // every other path still redirects to /login exactly as before.
    if (location.pathname === '/') return <Home />;
    return <Navigate to="/login" replace />;
  }
  if (needsSetup && location.pathname !== '/setup') return <Navigate to="/setup" replace />;
  if (!needsSetup && location.pathname === '/setup') return <Navigate to="/" replace />;
  return <Outlet />;
}
```

Nothing else in the file changes. `App.tsx` needs no changes at all — the index route inside `ProtectedRoute` still maps `/` to `Overview` for authenticated visitors; this only changes what `ProtectedRoute` itself renders before ever reaching that nested route when there's no session.

- [ ] **Step 3: Start both dev servers**

Run in two terminals from the repo root:

```bash
cd server && npm start
```

```bash
cd client && npm run dev
```

Note the port Vite prints (e.g. `http://localhost:5173`).

- [ ] **Step 4: Verify the logged-out homepage**

In a browser where you are NOT signed in (use an incognito/private window if you have an active session), visit the client's root URL (e.g. `http://localhost:5173/`).

Expected: the new homepage renders — nav bar with "LedgerLab", "Sign in", "Get started"; hero headline "Project costs, purchase orders, and payroll — one ledger, not three spreadsheets."; three "How it works" cards; four feature cards; closing CTA band. You are NOT redirected to `/login`.

- [ ] **Step 5: Verify every link on the homepage**

Click, in order, and confirm each lands on the right existing page (then navigate back to `/` for the next check):
- Nav bar "Sign in" → `/login`
- Nav bar "Get started" → `/signup`
- Hero "Get started" → `/signup`
- Hero "View live demo" → `/demo`
- Closing band "Get started" → `/signup`
- Closing band "View live demo" → `/demo`
- Closing band "Sign in" link → `/login`

- [ ] **Step 6: Verify logged-in behavior is unchanged**

Sign in (with an existing test account, or via `/signup` if you don't have one). Visit `/` again.

Expected: the existing dashboard (`Overview`, inside the authenticated `Layout` with its nav bar) renders exactly as it did before this change — NOT the new homepage.

- [ ] **Step 7: Verify unrelated routes are unaffected**

While still logged in, click through the existing nav (Replenishments, Purchase Orders, Payroll, Suppliers, etc.) and confirm each still works. Then sign out and confirm visiting any of those same paths directly (e.g. `/replenishments`) still redirects to `/login` as before (only `/` got the new behavior).

- [ ] **Step 8: Verify responsive layout**

With the browser window narrowed to a phone-sized width (or using devtools' device toolbar), reload `/` while logged out. Confirm the nav bar, hero, and card grids reflow to a single column without any horizontal scrollbar or overlapping text.

- [ ] **Step 9: Commit**

```bash
git add client/src/pages/Home.tsx client/src/components/ProtectedRoute.tsx
git commit -m "Add public marketing homepage for logged-out visitors"
```

---

## Post-plan cleanup

Once this task is reviewed and complete, this plan's `.superpowers/sdd/` workspace (if one was created) should be deleted per the subagent-driven-development skill's final steps, and `superpowers:finishing-a-development-branch` run to decide how this work gets merged/pushed.
