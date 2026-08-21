import { Link } from "react-router-dom";
import { buttonVariants } from "../components/Button";
import { IconCheck } from "../components/icons";

// A handful of custom animations no Tailwind utility expresses cleanly.
// Kept local to this page rather than added to index.css -- nothing else
// in the app uses them, and they're presentational flourishes, not part
// of the design system every page draws from.
const HOME_KEYFRAMES = `
  @keyframes home-drift-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
  @keyframes home-settle { from { opacity: 0; transform: translateY(8px) scale(.985); } to { opacity: 1; transform: none; } }
  @keyframes home-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
  @keyframes home-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @media (prefers-reduced-motion: reduce) {
    .home-anim { animation: none !important; }
  }
`;

const STALE_FILES = [
  { name: "project_costs_FINAL_v4.xlsx", flag: "Stale" },
  { name: "PO_tracker_revised.xlsx", flag: "Conflict" },
  { name: "payroll_JUL_rev2.xlsx", flag: "Offline" },
];

const DEMO_HIGHLIGHTS = [
  {
    title: "Compare budget, committed, and disbursed",
    body: "Drill into any budget line and see the three numbers broken out, instead of collapsed into one total.",
  },
  {
    title: "Check the retention panel",
    body: "See how holdback retention is tracked apart from money actually owed.",
  },
  {
    title: "Browse purchase orders",
    body: "See payment milestones and status for every PO on the project.",
  },
  {
    title: "Save the Overview as a PDF",
    body: "Print or save the dashboard as a PDF — the report you'd bring to a meeting.",
  },
];

const TERMS = [
  {
    label: "Budget",
    question: "“Can we afford it?”",
    body: "What finance signed off on. Every revision is versioned, so you can still see what the figure used to be and when it changed.",
  },
  {
    label: "Committed",
    question: "“What are we locked into?”",
    body: "What you're contractually on the hook for the moment a PO is issued — before a single invoice arrives.",
  },
  {
    label: "Disbursed",
    question: "“What's left in the bank?”",
    body: "Cash that has actually left the account. Retention holdback is tracked apart, so it never inflates this line.",
  },
];

const STEPS = [
  {
    title: "Enter a transaction",
    body: "Log a replenishment, PO payment, cash advance, or payroll entry against a budget line.",
  },
  {
    title: "It's categorized automatically",
    body: "Tagged to its budget item and JPL/WBS planning line. Anything unclear goes to a review queue instead of blocking you.",
  },
  {
    title: "Your dashboard updates instantly",
    body: "Budget vs. commitment vs. disbursement recalculates project-wide — no manual reconciliation.",
  },
];

const PROGRESS_ROWS = [
  { label: "Budget", pct: 100 },
  { label: "Committed", pct: 96 },
  { label: "Disbursed", pct: 65 },
];

const HOW_PAIR = [
  {
    title: "Messy real-world entry, handled",
    body: "A review queue holds anything that couldn't be matched or reconciled, so bad data gets fixed in place instead of silently dropped or blocking everything else.",
  },
  {
    title: "Split charges & retention, built in",
    body: "One invoice can span multiple budget lines, and holdback retention is tracked separately from money actually owed.",
  },
];

const MODULE_CHIPS = [
  "Overview",
  "Replenishments",
  "Purchase Orders",
  "Cash Advances",
  "Additional Payments",
  "Payroll",
  "Suppliers",
];

const MODULE_DETAILS = [
  {
    kicker: "OVERVIEW",
    title: "Dashboard & KPIs",
    body: "Budget, committed, and paid side by side, plus both remainders and a cost trend by category over time.",
  },
  {
    kicker: "PURCHASE ORDERS",
    title: "Milestones & retention",
    body: "Payment milestones and retention holdback tracked per PO, so what's owed never gets confused with what's held back.",
  },
  {
    kicker: "PAYROLL",
    title: "Weekly reconciliation",
    body: "A payroll ledger with its own reconciliation panel, feeding the same project totals as every other module.",
  },
];

const AUDIENCES = [
  {
    title: "Project accountants",
    body: "Reconcile what's been budgeted, committed, and actually paid without three spreadsheets fighting each other.",
  },
  {
    title: "Project managers",
    body: "See what's actually been committed and spent without waiting on a monthly report.",
  },
  {
    title: "Finance leads",
    body: "An auditable history of every entry and every budget revision, instead of a file with someone's initials in the name.",
  },
];

const PRICING_FEATURES = [
  "All seven modules, nothing gated",
  "Unlimited transactions and budget lines",
  "12% VAT computed on every entry",
  "Print or save any view as PDF",
  "Your project isolated from every other account",
];

const FAQS = [
  {
    q: "Where is my data stored, and who can see it?",
    a: "Your project lives in a hosted database, isolated per account — no other account can read your rows. Access is tied to your login, so nothing is exposed by sharing a link.",
  },
  {
    q: "Can I get my data back out?",
    a: "Yes. Any view can be printed or saved as a PDF from the dashboard for reports and meetings. You are never locked in — leaving does not mean losing the record.",
  },
  {
    q: "Is my data backed up?",
    a: "Entries are written to the database as you make them, not held in browser storage, so closing the tab or switching devices does not lose work.",
  },
  {
    q: "Can my team use it with me?",
    a: "Not yet — each account currently supports one project, used by one person.",
  },
  {
    q: "Does it handle VAT?",
    a: "Yes. The VAT component is computed from the gross amount at 12% (amount × 12/112) and shown alongside the net figure, so you are not recomputing it entry by entry.",
  },
  {
    q: "What if my data entry is messy?",
    a: "A review queue holds anything that couldn't be matched or reconciled, so nothing blocks you or gets silently dropped. You clear the queue once you have the missing detail.",
  },
  {
    q: "Can I try it before signing up?",
    a: "Yes — the live demo uses sample data and needs no account. Nothing you do there touches a real project.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. It runs entirely in your browser, on desktop or phone.",
  },
];

const H2 =
  "mb-6 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl";
const EYEBROW =
  "mb-5 flex items-center gap-3 font-mono text-[11px] font-medium tracking-widest text-ink-faint uppercase after:h-px after:flex-1 after:bg-rule after:content-['']";

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex max-w-295 items-center justify-between px-4 py-4 sm:px-6">
        <span className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight text-ink">
          <span className="flex h-4 items-end gap-0.5" aria-hidden="true">
            <span className="h-4 w-0.75 rounded-[1px] bg-accent" />
            <span className="h-2.5 w-0.75 rounded-[1px] bg-accent-strong" />
            <span className="h-1.5 w-0.75 rounded-[1px] bg-ink-faint" />
          </span>
          LedgerLab
        </span>
        <div className="flex items-center gap-3">
          {/* Two nav buttons plus the wordmark are tight below 640px; "Sign in"
              stays reachable via the footer/close-CTA links, so it's the one
              to drop here. A wrapper (not the Link's own class string) toggles
              visibility, since Button's variant string already carries an
              unconditional `inline-flex` that a same-string `hidden` would
              race against at the same specificity. */}
          <span className="hidden sm:inline-block">
            <Link to="/login" className={buttonVariants.outline}>
              Sign in
            </Link>
          </span>
          <Link to="/signup" className={buttonVariants.primary}>
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-295 px-4 py-16 sm:px-6 sm:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h1 className="mb-4 max-w-xl font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Project costs, purchase orders, and payroll —{" "}
            <span className="text-accent">one ledger</span>, not three
            spreadsheets.
          </h1>
          <p className="mb-6 max-w-lg text-lg text-ink-muted">
            Track budget against what's actually been committed and what's
            actually been paid, without losing the difference between the two.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/demo" className={buttonVariants.primary}>
              See the live demo
            </Link>
            <Link to="/signup" className={buttonVariants.outline}>
              Create a free account
            </Link>
          </div>
          <p className="mt-4 font-mono text-xs text-ink-faint">
            No account needed for the demo · Free to start · Runs in your
            browser
          </p>
        </div>

        <div
          role="img"
          aria-label="Three separate spreadsheet files that disagree with each other, replaced by one LedgerLab project ledger tracking budget, committed, and paid together."
        >
          <div className="grid gap-2">
            {STALE_FILES.map((file, i) => (
              <div
                key={file.name}
                // The staggered stacked-pile look only has room to breathe at
                // sm+; on a narrow phone it would just eat into the space the
                // truncated file name needs, so it's flush there instead.
                className={`home-anim flex items-center gap-3 rounded-md border border-rule bg-surface px-4 py-3 shadow-card ${
                  i === 1 ? "sm:ml-4" : i === 2 ? "sm:ml-8" : ""
                } ${i === 0 ? "sm:mr-6" : ""}`}
                style={{
                  animation: "home-drift-in .5s cubic-bezier(.22,.7,.3,1) both",
                  animationDelay: `${i * 90}ms`,
                }}
              >
                <span
                  className="relative h-4.75 w-3.75 shrink-0 rounded-xs border border-rule-strong bg-surface before:absolute before:inset-x-0.75 before:top-1 before:h-px before:bg-rule-strong before:shadow-[0_4px_0_var(--color-rule-strong),0_8px_0_var(--color-rule-strong)]"
                  aria-hidden="true"
                />
                <span className="truncate font-mono text-xs text-ink-muted">
                  {file.name}
                </span>
                <span className="ml-auto shrink-0 rounded-full bg-danger-soft px-2 py-0.5 font-mono text-[10px] tracking-wide text-danger uppercase">
                  {file.flag}
                </span>
              </div>
            ))}
          </div>

          <p className="my-4 flex items-center gap-2.5 font-mono text-[11px] tracking-widest text-ink-faint uppercase">
            <span className="text-danger">&#8800;</span> Three files, three
            answers
          </p>

          <div
            className="home-anim overflow-hidden rounded-lg border border-accent bg-surface shadow-card"
            style={{
              animation: "home-settle .55s cubic-bezier(.22,.7,.3,1) .3s both",
            }}
          >
            <div className="flex items-center gap-2.5 bg-accent px-4 py-3 text-white">
              <span className="flex h-3.5 items-end gap-0.5" aria-hidden="true">
                <span className="h-3.5 w-[2.5px] rounded-[1px] bg-white" />
                <span className="h-2 w-[2.5px] rounded-[1px] bg-white/70" />
                <span className="h-1 w-[2.5px] rounded-[1px] bg-white/50" />
              </span>
              <span className="text-sm font-semibold">One project ledger</span>
              <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-white/80 uppercase">
                <span
                  className="home-anim h-1.5 w-1.5 rounded-full bg-white"
                  style={{ animation: "home-pulse 2.2s ease-in-out infinite" }}
                />
                Live
              </span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-rule">
              <div className="p-3 sm:p-4">
                <p className="mb-1.5 font-mono text-[10px] tracking-widest text-ink-faint uppercase">
                  Budget
                </p>
                <p className="text-sm font-semibold text-ink">Approved</p>
              </div>
              <div className="p-3 sm:p-4">
                <p className="mb-1.5 font-mono text-[10px] tracking-widest text-ink-faint uppercase">
                  Committed
                </p>
                <p className="text-sm font-semibold text-ink">Awarded</p>
              </div>
              <div className="p-3 sm:p-4">
                <p className="mb-1.5 font-mono text-[10px] tracking-widest text-ink-faint uppercase">
                  Disbursed
                </p>
                <p className="text-sm font-semibold text-ink">Paid out</p>
              </div>
            </div>
            <div className="border-t border-rule bg-accent-soft px-4 py-2.5 text-sm text-ink-muted">
              Every entry moves all three at once —{" "}
              <b className="text-accent font-semibold">
                no reconciliation step
              </b>
              .
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DemoInvitation() {
  return (
    <section className="mx-auto max-w-295 px-4 py-12 sm:px-6">
      <p className={EYEBROW}>See it working</p>
      <h2 className={H2}>The demo is already loaded with a project.</h2>
      <p className="mb-6 max-w-xl text-ink-muted">
        No account, no setup, nothing to undo. A few things worth exploring:
      </p>
      <div className="grid overflow-hidden rounded-lg border border-rule shadow-card lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="flex flex-col gap-4 border-b border-rule bg-surface p-6 lg:border-r lg:border-b-0">
          <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
            Open a real project, not a tour.
          </h3>
          <p className="text-sm text-ink-muted">
            The sample project has budget lines, suppliers, and planning codes
            already entered, so the numbers are real the moment you look.
          </p>
          <Link
            to="/demo"
            className={`${buttonVariants.primary} mt-auto self-start`}
          >
            Open the live demo
          </Link>
          <p className="font-mono text-[11px] text-ink-faint">
            Nothing you do there touches a real project
          </p>
        </div>
        <div className="flex flex-col bg-surface-2">
          {DEMO_HIGHLIGHTS.map((item) => (
            <div
              key={item.title}
              className="border-b border-rule px-6 py-4 last:border-b-0"
            >
              <p className="mb-1 text-sm font-semibold text-ink">
                {item.title}
              </p>
              <p className="text-sm text-ink-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ThreeTerms() {
  return (
    <section className="mx-auto max-w-295 px-4 py-12 sm:px-6">
      <div className="border-t border-ink pt-3.5">
        <p className="mb-2 font-mono text-[11px] tracking-widest text-ink-faint uppercase">
          One line item, three different answers to "where are we?"
        </p>
        <div className="grid gap-6 sm:grid-cols-3">
          {TERMS.map((term) => (
            <div key={term.label} className="pt-4">
              <p className="mb-3 font-mono text-[10.5px] tracking-widest text-ink-faint uppercase">
                {term.label} answers
              </p>
              <p className="mb-2.5 font-display text-xl font-semibold tracking-tight text-accent">
                {term.question}
              </p>
              <p className="text-sm text-ink-muted">{term.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stepper() {
  return (
    <section className="mx-auto max-w-295 px-4 py-12 sm:px-6">
      <p className={EYEBROW}>From entry to dashboard</p>
      <h2 className={H2}>Three keystrokes, not three reconciliations.</h2>
      <p className="mb-8 max-w-xl text-ink-muted">
        Every entry lands on a budget line, gets classified, and moves the
        project totals the same second.
      </p>
      <div className="grid gap-8 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <div key={step.title} className="flex flex-col gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent font-display text-sm font-semibold text-white">
              {i + 1}
            </span>
            <p className="text-sm font-semibold text-ink">{step.title}</p>
            <p className="text-sm text-ink-muted">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="mx-auto max-w-295 px-4 py-12 sm:px-6">
      <p className={EYEBROW}>How it works</p>
      <h2 className={H2}>
        The difference between the three numbers is the whole job.
      </h2>

      <div className="mt-8 grid gap-8 rounded-lg border border-rule bg-surface p-6 shadow-card sm:p-8 lg:grid-cols-2 lg:items-center">
        <div>
          <h3 className="mb-3 font-display text-xl font-semibold tracking-tight text-ink">
            Budget vs. commitment vs. disbursement
          </h3>
          <p className="text-sm text-ink-muted">
            Approving a budget, awarding a contract, and paying cash are three
            different numbers. This tool keeps them separate instead of
            collapsing them into one misleading total — so a line that's nearly
            fully committed but only two-thirds paid never reads as headroom you
            don't have.
          </p>
          <p className="mt-4 border-t border-dashed border-rule-strong pt-3.5 text-sm text-ink-muted">
            Your dashboard carries both remainders:{" "}
            <b className="font-mono font-semibold text-danger">
              remaining vs. contract
            </b>{" "}
            (how much can still be awarded) and{" "}
            <b className="font-mono font-semibold text-danger">
              remaining vs. disbursed
            </b>{" "}
            (how much cash is left).
          </p>
        </div>
        <div aria-hidden="true">
          {PROGRESS_ROWS.map((row) => (
            <div key={row.label} className="mb-4 last:mb-0">
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="font-mono text-[10.5px] tracking-widest text-ink-muted uppercase">
                  {row.label}
                </span>
                <span className="font-mono text-sm font-semibold text-ink">
                  {row.pct}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-sm bg-rule">
                <span
                  className="home-anim block h-full origin-left rounded-sm bg-accent"
                  style={{
                    width: `${row.pct}%`,
                    animation: "home-grow .7s cubic-bezier(.22,.7,.3,1) both",
                  }}
                />
              </div>
            </div>
          ))}
          <p className="mt-4 border-t border-dashed border-rule-strong pt-3.5 text-sm text-ink-muted">
            Committed minus disbursed ={" "}
            <b className="font-mono font-semibold text-danger">31%</b> owed but
            not yet paid
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 border-t border-rule pt-6 sm:grid-cols-2">
        {HOW_PAIR.map((item) => (
          <div key={item.title}>
            <p className="mb-2 text-sm font-semibold text-ink">{item.title}</p>
            <p className="text-sm text-ink-muted">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Modules() {
  return (
    <section className="mx-auto max-w-295 px-4 py-12 sm:px-6">
      <p className={EYEBROW}>What's inside</p>
      <h2 className={H2}>Everything the spreadsheet couldn't keep up with.</h2>
      <p className="mb-6 max-w-xl text-ink-muted">
        Seven linked ledgers, one set of totals. Switch tabs, not files.
      </p>
      <div className="mb-8 flex flex-wrap gap-2">
        {MODULE_CHIPS.map((chip) => (
          <span
            key={chip}
            className="inline-flex items-center gap-2 rounded-full border border-rule bg-surface px-3.5 py-1.5 text-sm font-medium text-ink"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            {chip}
          </span>
        ))}
      </div>
      <div className="grid gap-6 border-t border-ink pt-6 sm:grid-cols-3">
        {MODULE_DETAILS.map((mod) => (
          <div key={mod.title}>
            <p className="mb-2 font-mono text-xs tracking-widest text-accent uppercase">
              {mod.kicker}
            </p>
            <p className="mb-1.5 text-sm font-semibold text-ink">{mod.title}</p>
            <p className="text-sm text-ink-muted">{mod.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhoItsFor() {
  return (
    <section className="mx-auto max-w-295 px-4 py-12 sm:px-6">
      <p className={EYEBROW}>Who it's for</p>
      <h2 className={H2}>Built for the people who get asked "where are we?"</h2>
      <div className="grid gap-6 sm:grid-cols-3">
        {AUDIENCES.map((item) => (
          <div key={item.title} className="border-t-2 border-accent pt-4">
            <p className="mb-2 text-sm font-semibold text-accent">
              {item.title}
            </p>
            <p className="text-sm text-ink-muted">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section className="mx-auto max-w-295 px-4 py-12 sm:px-6">
      <p className={EYEBROW}>Pricing</p>
      <h2 className={H2}>Free while LedgerLab is in early access.</h2>
      <p className="mb-6 max-w-xl text-ink-muted">
        No trial clock, no card, no feature held back. If paid plans arrive
        later, existing accounts get notice well before anything changes.
      </p>
      <div className="grid overflow-hidden rounded-lg border border-accent shadow-card sm:grid-cols-2">
        <div className="border-b border-rule bg-surface p-6 sm:border-r sm:border-b-0 sm:p-8">
          <p className="mb-3 font-mono text-xs tracking-widest text-accent uppercase">
            Early access
          </p>
          <div className="mb-3 flex items-baseline gap-2">
            <span className="font-display text-4xl font-semibold tracking-tight text-ink">
              &#8369;0
            </span>
            <span className="text-sm text-ink-faint">per month</span>
          </div>
          <p className="mb-5 max-w-xs text-sm text-ink-muted">
            Create an account, set a budget, and run a real project on it. Your
            data stays yours if you leave.
          </p>
          <Link to="/signup" className={buttonVariants.primary}>
            Create a free account
          </Link>
        </div>
        <div className="flex flex-col justify-center gap-3 bg-surface-2 p-6 sm:p-8">
          {PRICING_FEATURES.map((feature) => (
            <div
              key={feature}
              className="flex items-start gap-2.5 text-sm text-ink-muted"
            >
              <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              {feature}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section className="mx-auto max-w-295 px-4 py-12 sm:px-6">
      <p className={EYEBROW}>Frequently asked questions</p>
      <h2 className={H2}>Before you sign up.</h2>
      <div className="mt-6 flex flex-col divide-y divide-rule border-t border-rule">
        {FAQS.map((item) => (
          <details key={item.q} className="group py-1">
            <summary className="flex cursor-pointer list-none items-center gap-4 py-3.5 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
              {item.q}
              <span className="ml-auto shrink-0 font-mono text-ink-faint transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="max-w-3xl pb-4 text-sm text-ink-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function CloseCta() {
  return (
    <section className="bg-accent px-4 py-16 text-center sm:px-6 sm:py-20">
      <div className="mx-auto flex max-w-295 flex-col items-center gap-4">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Ready to see it on your own numbers?
        </h2>
        <p className="max-w-md text-white/80">
          Set a budget, enter one transaction, and watch all three ledgers move.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 rounded-sm bg-white px-4 py-2 text-sm font-medium text-accent shadow-card hover:bg-accent-soft"
          >
            Get started
          </Link>
          <Link
            to="/demo"
            className="inline-flex items-center gap-2 rounded-sm border border-white/40 px-4 py-2 text-sm font-medium text-white hover:border-white hover:bg-white/10"
          >
            View live demo
          </Link>
        </div>
        <p className="text-sm text-white/70">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-white underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-rule px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-295 font-mono text-xs text-ink-faint">
        LedgerLab &copy; 2026
      </div>
    </footer>
  );
}

export function Home() {
  return (
    <div className="min-h-screen bg-canvas">
      <style>{HOME_KEYFRAMES}</style>
      <Nav />
      <main>
        <Hero />
        <DemoInvitation />
        <ThreeTerms />
        <Stepper />
        <HowItWorks />
        <Modules />
        <WhoItsFor />
        <Pricing />
        <Faq />
      </main>
      <CloseCta />
      <Footer />
    </div>
  );
}
