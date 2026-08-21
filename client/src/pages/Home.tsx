import { Link } from "react-router-dom";
import { buttonVariants } from "../components/Button";
import { IconBox, IconGrid, IconReceipt, IconUsers } from "../components/icons";

// Same ledger-paper flourish as Login.tsx/Signup.tsx -- see the comment there.
const LEDGER_BACKGROUND = {
  backgroundImage:
    "repeating-linear-gradient(to bottom, transparent, transparent 31px, var(--color-rule) 31px, var(--color-rule) 32px)",
};

const STATS = [
  { value: "3", label: "ledgers, tracked separately" },
  { value: "1", label: "dashboard for every number" },
  { value: "Free", label: "to start, no credit card" },
  { value: "Private", label: "data, isolated per account" },
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

const HOW_IT_WORKS = [
  {
    title: "Budget vs. commitment vs. disbursement",
    body: "Approving a budget, awarding a contract, and paying cash are three different numbers. This tool keeps them separate instead of collapsing them into one misleading total.",
  },
  {
    title: "Messy real-world entry, handled",
    body: "A review queue holds anything that couldn't be matched or reconciled, so bad data gets fixed in place instead of silently dropped or blocking everything else.",
  },
  {
    title: "Split charges & retention, built in",
    body: "One invoice can span multiple budget lines, and holdback retention is tracked separately from money actually owed.",
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
    body: "Payroll ledger with a weekly reconciliation panel.",
  },
];

const FAQS = [
  {
    q: "Is my data private?",
    a: "Yes. Every account gets its own isolated project — nobody else can see your numbers.",
  },
  {
    q: "Is it free?",
    a: "Yes, creating an account and tracking your own project is free.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. It runs entirely in your browser.",
  },
  {
    q: "Can I try it before signing up?",
    a: "Yes — the live demo uses sample data and needs no account.",
  },
  {
    q: "What if my data entry is messy?",
    a: "A review queue holds anything that couldn't be matched or reconciled, so nothing blocks you or gets silently dropped.",
  },
];

export function Home() {
  return (
    <div className="min-h-screen bg-canvas" style={LEDGER_BACKGROUND}>
      <header className="mx-auto flex max-w-295 items-center justify-between px-4 py-6 sm:px-6">
        <span className="font-display text-xl font-semibold tracking-tight text-ink">
          LedgerLab
        </span>
        <div className="flex items-center gap-3">
          <Link to="/login" className={buttonVariants.outline}>
            Sign in
          </Link>
          <Link to="/signup" className={buttonVariants.primary}>
            Get started
          </Link>
        </div>
      </header>

      <main>
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
            <Link to="/signup" className={buttonVariants.primary}>
              Get started
            </Link>
            <Link to="/demo" className={buttonVariants.outline}>
              View live demo
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-295 px-4 pb-12 sm:px-6">
          <div className="grid gap-4 rounded-md border border-rule bg-surface p-6 shadow-card sm:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center sm:text-left">
                <p className="font-display text-2xl font-semibold text-ink">
                  {stat.value}
                </p>
                <p className="text-sm text-ink-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-295 px-4 py-12 sm:px-6">
          <h2 className="mb-6 font-display text-2xl font-semibold tracking-tight text-ink">
            From entry to dashboard
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
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
            Who it's for
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {AUDIENCES.map((item) => (
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

        <section className="mx-auto max-w-295 px-4 py-12 sm:px-6">
          <h2 className="mb-6 font-display text-2xl font-semibold tracking-tight text-ink">
            Frequently asked questions
          </h2>
          <dl className="mx-auto flex max-w-2xl flex-col gap-4">
            {FAQS.map((item, i) => (
              <div
                key={item.q}
                className="flex gap-4 rounded-md border border-rule bg-surface p-5 shadow-card"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 font-display text-xs font-semibold text-ink-muted">
                  {i + 1}
                </span>
                <div>
                  <dt className="mb-1.5 text-sm font-semibold text-ink">{item.q}</dt>
                  <dd className="text-sm text-ink-muted">{item.a}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>

        <section className="mx-auto flex max-w-295 flex-col items-center gap-4 px-4 py-16 text-center sm:px-6">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Ready to see it on your own numbers?
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/signup" className={buttonVariants.primary}>
              Get started
            </Link>
            <Link to="/demo" className={buttonVariants.outline}>
              View live demo
            </Link>
          </div>
          <p className="text-sm text-ink-muted">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
