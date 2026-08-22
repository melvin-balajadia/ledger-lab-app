import { Link } from "react-router-dom";
import { IconCheck } from "../components/icons";

// The hero is a one-off device-mockup design lifted wholesale from a
// standalone mockup file, on its own font pairing (Poppins / JetBrains
// Mono) distinct from the rest of the site. A scoped stylesheet under
// the llh- prefix keeps it from colliding with Tailwind's own utility
// classes (.grid, in particular) or leaking into the rest of the page.
// Colors that have a real equivalent in index.css (the accent, the
// warn tone, the five categorical series) point at those tokens so the
// mockup numbers use the same palette as the real dashboard; purely
// decorative values (the background mesh, the phone-frame gradient)
// stay local since nothing else in the app needs them.
const HERO_STYLES = `
  .llh-hero {
    --llh-sans: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    --llh-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    --llh-ink: #0E1614;
    --llh-ink-70: #4A544F;
    --llh-ink-50: #7A837E;
    --llh-ink-30: #A9B1AC;
    --llh-green-mid: #2E9E6B;
    --llh-sh-sm: 0 1px 2px rgba(14,22,20,.04), 0 12px 28px -20px rgba(14,22,20,.22);
    --llh-sh-card: 0 18px 44px -26px rgba(14,60,44,.4), 0 2px 10px rgba(14,22,20,.05);
    --llh-sh-phone: 0 60px 110px -46px rgba(11,58,42,.55), 0 24px 50px -36px rgba(14,22,20,.3);
    position: relative;
    overflow: hidden;
    font-family: var(--llh-sans);
    color: var(--llh-ink);
    background:
      radial-gradient(38% 42% at 16% 34%, #CDEBD9 0%, rgba(205,235,217,0) 70%),
      radial-gradient(42% 44% at 55% 8%,  #DFF4E6 0%, rgba(223,244,230,0) 72%),
      radial-gradient(46% 52% at 86% 40%, #C6E9D5 0%, rgba(198,233,213,0) 70%),
      radial-gradient(40% 40% at 72% 66%, #DCF2E5 0%, rgba(220,242,229,0) 72%),
      linear-gradient(180deg,#F3FAF6 0%,#F7FBF8 40%,#F5F7F6 100%);
  }
  /* Text-decoration only -- an explicit color here would tie with
     .llh-btn-dark/.llh-btn-light on specificity (both are one class,
     but this compound selector's extra type selector edges it out),
     silently overriding the buttons' own white/ink text with whatever
     .llh-hero's ambient color is. */
  .llh-hero a { text-decoration: none; }
  .llh-hero :focus-visible { outline: 2px solid var(--color-accent-strong); outline-offset: 3px; border-radius: 8px; }

  .llh-siteheader { position: relative; z-index: 40; }
  /* Max-width/side-padding come from the same mx-auto max-w-295 px-4
     sm:px-6 classes every other section on this page uses (applied in
     JSX) -- kept out of this rule so the header's left/right edge
     always lines up with the body content below it, instead of a
     hero-only measure. Only the vertical rhythm stays here. */
  .llh-inner { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding-top: 26px; }
  .llh-brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 19.5px; letter-spacing: -.025em; }
  .llh-brand .llh-glyph { display: flex; align-items: flex-end; gap: 2.5px; height: 19px; }
  .llh-brand .llh-glyph i { display: block; width: 3.5px; border-radius: 1.5px; background: var(--color-accent); }
  .llh-brand .llh-glyph i:nth-child(1) { height: 11px; }
  .llh-brand .llh-glyph i:nth-child(2) { height: 19px; background: var(--llh-green-mid); }
  .llh-brand .llh-glyph i:nth-child(3) { height: 8px; }
  .llh-header-actions { display: flex; align-items: center; gap: 9px; }
  .llh-btn { font: 500 14.5px var(--llh-sans); padding: 11px 21px; border-radius: var(--radius-md); border: 1px solid transparent; cursor: pointer; display: inline-flex; align-items: center; gap: 9px; line-height: 1; transition: .18s; white-space: nowrap; }
  .llh-btn-light { background: rgba(255,255,255,.55); color: var(--llh-ink); border-color: rgba(255,255,255,.85); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
  .llh-btn-light:hover { background: rgba(255,255,255,.85); }
  .llh-btn-dark { background: var(--color-accent); color: #fff; box-shadow: 0 10px 24px -14px rgba(14,92,69,.9); }
  .llh-btn-dark:hover { background: var(--color-accent-strong); }
  .llh-btn:active { transform: translateY(1px); }

  .llh-grid { position: relative; z-index: 20; padding-top: 78px; display: grid; grid-template-columns: 1.06fr .94fr; gap: 20px; align-items: start; }
  .llh-hero h1 { font-size: clamp(32px,3.5vw,50px); line-height: 1.16; letter-spacing: -.025em; font-weight: 500; max-width: 12ch; margin: 0; }
  .llh-sub { margin-top: 24px; font-size: 15.5px; line-height: 1.72; color: var(--llh-ink-70); font-weight: 300; max-width: 42ch; }
  .llh-cta { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 36px; }
  .llh-cta .llh-btn { padding: 16px 26px; font-size: 14.5px; }
  .llh-arrow { width: 16px; height: 16px; stroke: var(--llh-ink); stroke-width: 1.6; fill: none; }
  .llh-fine { margin-top: 22px; font-size: 12.5px; color: var(--llh-ink-50); font-weight: 300; }
  .llh-fine b { font-weight: 500; color: var(--llh-ink-70); }

  .llh-stage { position: relative; justify-self: center; margin-top: 6px; }
  .llh-phone { position: relative; z-index: 10; width: 344px; height: 720px; border-radius: 54px; padding: 11px; background: linear-gradient(155deg,#2C3630,#0A100D 52%,#1A231E); box-shadow: var(--llh-sh-phone); animation: llh-rise .9s cubic-bezier(.2,.8,.25,1) both; }
  @keyframes llh-rise { from { opacity: 0; transform: translateY(26px); } }
  .llh-phone::after { content: ""; position: absolute; inset: 0; border-radius: 54px; pointer-events: none; background: linear-gradient(122deg,rgba(255,255,255,.3),rgba(255,255,255,0) 28%); }
  .llh-screen { position: relative; height: 100%; border-radius: 44px; overflow: hidden; background: #F7F8F7; }
  .llh-island { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); width: 104px; height: 29px; border-radius: 18px; background: #080D0B; z-index: 5; }
  .llh-statusbar { display: flex; justify-content: space-between; align-items: center; padding: 18px 26px 0; font: 600 12.5px var(--llh-sans); }
  .llh-bars { display: flex; gap: 3px; align-items: flex-end; }
  .llh-bars i { display: block; width: 3.2px; background: var(--llh-ink); border-radius: 1px; }
  .llh-bars i:nth-child(1) { height: 4.5px; } .llh-bars i:nth-child(2) { height: 7px; } .llh-bars i:nth-child(3) { height: 9.5px; } .llh-bars i:nth-child(4) { height: 12px; }
  .llh-batt { width: 24px; height: 11.5px; border: 1.4px solid var(--llh-ink); border-radius: 3.5px; position: relative; }
  .llh-batt::after { content: ""; position: absolute; inset: 1.7px; width: 72%; background: var(--color-accent); border-radius: 1.5px; }

  .llh-app { padding: 30px 20px 0; }
  .llh-eyebrow { font: 600 8.5px var(--llh-sans); letter-spacing: .14em; color: var(--color-accent); text-transform: uppercase; }
  .llh-app h2 { font-size: 17px; font-weight: 600; letter-spacing: -.035em; line-height: 1.22; margin-top: 7px; }
  .llh-acct { display: flex; align-items: center; gap: 8px; margin-top: 13px; }
  .llh-chip { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid var(--color-rule); border-radius: 10px; padding: 5px 11px 5px 5px; font-size: 9.5px; color: var(--llh-ink-70); font-weight: 300; }
  .llh-who { width: 21px; height: 21px; border-radius: 50%; background: var(--color-accent-soft); color: var(--color-accent); display: grid; place-items: center; font: 600 8.5px var(--llh-sans); }
  .llh-logout { border: 1px solid var(--color-rule); border-radius: 10px; padding: 6px 12px; background: #fff; font: 500 9.5px var(--llh-sans); }
  .llh-tabs { display: flex; gap: 17px; margin-top: 16px; border-bottom: 1px solid var(--color-rule); font: 500 10.5px var(--llh-sans); color: var(--llh-ink-30); }
  .llh-tabs span { padding-bottom: 9px; display: flex; align-items: center; gap: 5px; white-space: nowrap; }
  .llh-tabs .llh-on { color: var(--llh-ink); box-shadow: inset 0 -2px 0 var(--color-accent); }
  .llh-dotsq { width: 8px; height: 8px; border-radius: 2px; border: 1.4px solid currentColor; opacity: .7; }
  .llh-rowtop { display: flex; align-items: center; justify-content: space-between; margin: 16px 0 12px; }
  .llh-rowtop h3 { font-size: 16px; font-weight: 600; letter-spacing: -.03em; margin: 0; }
  .llh-pdf { display: flex; align-items: center; gap: 6px; background: #fff; border: 1px solid var(--color-rule); border-radius: 9px; padding: 6px 10px; font: 500 9px var(--llh-sans); }

  .llh-kpi { background: #fff; border: 1px solid var(--color-rule); border-top: 1.5px dashed #DDE4DF; border-radius: 12px; padding: 12px 13px; margin-bottom: 9px; box-shadow: var(--llh-sh-sm); }
  .llh-kpi .llh-k { font: 400 10px var(--llh-sans); color: var(--llh-ink-70); }
  .llh-kpi .llh-v { font: 600 17px var(--llh-mono); letter-spacing: -.045em; margin-top: 6px; }
  .llh-kpi .llh-v.llh-pos { color: var(--color-accent); }
  .llh-kpi .llh-m { font: 300 9px var(--llh-sans); color: var(--llh-ink-30); margin-top: 5px; }
  .llh-kpi .llh-bar { height: 4px; border-radius: 3px; background: #EDF2EF; margin-top: 9px; overflow: hidden; }
  .llh-kpi .llh-bar i { display: block; height: 100%; background: var(--color-accent); border-radius: 3px; }
  .llh-vat { background: #fff; border: 1px solid var(--color-rule); border-radius: 12px; padding: 11px 13px; display: flex; justify-content: space-between; gap: 10px; font: 300 9px var(--llh-sans); color: var(--llh-ink-50); box-shadow: var(--llh-sh-sm); }
  .llh-vat b { font: 500 9.5px var(--llh-mono); color: var(--llh-ink); display: block; margin-top: 4px; }

  .llh-float { position: absolute; z-index: 25; background: #fff; border-radius: 16px; box-shadow: var(--llh-sh-card); padding: 14px 16px; }
  .llh-float.llh-a { left: -128px; top: 300px; width: 228px; }
  .llh-float.llh-b { right: -118px; top: 150px; width: 226px; }
  .llh-f-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11px; color: var(--llh-ink); font-weight: 500; }
  .llh-f-head .llh-dots { color: var(--llh-ink-30); font-size: 13px; line-height: 1; }
  .llh-f-head .llh-info { width: 16px; height: 16px; border-radius: 5px; background: #F2F5F3; color: var(--llh-ink-30); display: grid; place-items: center; font-size: 9px; }
  .llh-f-sub { font: 300 9px var(--llh-sans); color: var(--llh-ink-30); margin-top: 2px; }
  .llh-donut-row { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
  .llh-donut { width: 74px; height: 74px; border-radius: 50%; flex: none; display: grid; place-items: center; position: relative;
    background: conic-gradient(var(--series-1) 0 38%, var(--series-2) 38% 55%, var(--series-3) 55% 86%, var(--series-4) 86% 95%, var(--series-5) 95% 100%); }
  .llh-donut::after { content: ""; position: absolute; width: 48px; height: 48px; border-radius: 50%; background: #fff; }
  .llh-donut b { position: relative; z-index: 1; font: 600 10px var(--llh-mono); letter-spacing: -.04em; }
  .llh-legend { display: grid; gap: 4px; font: 300 8.5px var(--llh-sans); color: var(--llh-ink-50); }
  .llh-legend div { display: flex; align-items: center; gap: 6px; }
  .llh-sq { width: 6px; height: 6px; border-radius: 2px; flex: none; }
  .llh-spark { display: flex; align-items: flex-end; gap: 4px; height: 52px; margin-top: 13px; }
  .llh-spark i { flex: 1; background: var(--color-accent-soft); border-radius: 3px 3px 0 0; }
  .llh-spark i.llh-hi { background: var(--color-accent); }
  .llh-spark i.llh-warn { background: var(--color-warn); }
  .llh-f-foot { display: flex; align-items: baseline; justify-content: space-between; margin-top: 11px; }
  .llh-f-foot .llh-v { font: 600 15px var(--llh-mono); letter-spacing: -.04em; }
  .llh-f-foot .llh-t { font: 300 9px var(--llh-sans); color: var(--llh-ink-30); }

  .llh-shelf { position: absolute; left: 0; right: 0; bottom: 0; height: 104px; z-index: 30; pointer-events: none; }
  .llh-shelf svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }

  @media (max-width: 1140px) {
    .llh-float.llh-a { left: -86px; }
    .llh-float.llh-b { right: -78px; }
  }
  @media (max-width: 1024px) {
    .llh-hero { padding-bottom: 56px; }
    .llh-inner { padding-top: 20px; }
    .llh-grid { grid-template-columns: 1fr; padding-top: 44px; gap: 0; }
    .llh-hero h1, .llh-sub { max-width: none; }
    .llh-stage { margin-top: 52px; height: 520px; overflow: hidden; }
    .llh-phone { margin: 0 auto; width: 322px; height: 680px; border-radius: 50px; }
    .llh-screen { border-radius: 40px; }
    .llh-float.llh-a { left: 0; top: 300px; width: 200px; }
    .llh-float.llh-b { right: 0; left: auto; top: 120px; width: 202px; }
    .llh-shelf { display: none; }
  }
  @media (max-width: 640px) {
    .llh-inner { padding-top: 16px; }
    .llh-brand { font-size: 17.5px; }
    .llh-btn { font-size: 13.5px; padding: 10px 16px; }
    .llh-grid { padding-top: 34px; }
    .llh-stage { margin-left: -18px; margin-right: -18px; height: 474px; }
    .llh-phone { width: 294px; height: 620px; border-radius: 46px; }
    .llh-screen { border-radius: 37px; }
    .llh-float.llh-a { left: 2px; top: 268px; width: 176px; padding: 12px 13px; }
    .llh-float.llh-b { right: 2px; top: 104px; width: 178px; padding: 12px 13px; }
  }
  @media (prefers-reduced-motion: reduce) { .llh-phone { animation: none; } }
`;

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
    before:
      "A row with an impossible date or a name typed two different ways got silently dropped, or left in unnoticed.",
    now: "Anything that can't be confidently matched lands in a review queue instead — visible and fixable, never dropped.",
  },
  {
    before:
      "One invoice split across several budget codes was guesswork, or got entered as a single lump sum.",
    now: "Split charges get their own row per code, validated to sum to the total.",
  },
  {
    before:
      'Retention holdback got folded into "outstanding balance," overstating what a supplier was actually owed.',
    now: "Held-back retention is tracked on its own line — never counted as money owed.",
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
// Same recipe as buttonVariants.primary (Button.tsx), but rounded-md
// instead of rounded-sm -- matches the hero's own buttons (which reuse
// the app's --radius-md token) so every CTA on this page shares one
// corner radius instead of two.
const CTA_BUTTON =
  "inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white shadow-card hover:bg-accent-strong";

function HeroSection() {
  return (
    <section className="llh-hero">
      <style>{HERO_STYLES}</style>

      <header className="llh-siteheader">
        <div className="llh-inner mx-auto max-w-295 px-4 sm:px-6">
          <div className="llh-brand">
            <span className="llh-glyph" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            LedgerLab
          </div>
          <div className="llh-header-actions">
            <Link className="llh-btn llh-btn-light" to="/login">
              Sign in
            </Link>
            <Link className="llh-btn llh-btn-dark" to="/signup">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <div className="llh-grid mx-auto max-w-295 px-4 sm:px-6">
        <div>
          <h1>Project costs, POs, and payroll—all in one ledger.</h1>
          <p className="llh-sub">
            Track budget against what's actually been committed and what's
            actually been paid, without losing the difference.
          </p>

          <div className="llh-cta">
            <Link className="llh-btn llh-btn-dark" to="/demo">
              See the live demo
            </Link>
            <Link className="llh-btn llh-btn-light" to="/signup">
              Create a free account
              <svg className="llh-arrow" viewBox="0 0 16 16">
                <path d="M3 8h9M8.5 4.5L12 8l-3.5 3.5" />
              </svg>
            </Link>
          </div>

          <p className="llh-fine">
            <b>No account needed for the demo.</b> Free to start · Runs in your
            browser
          </p>
        </div>

        {/* Device mockup: illustrative figures only, not a real project's numbers. */}
        <div
          className="llh-stage"
          role="img"
          aria-label="A phone showing the LedgerLab Overview dashboard, with floating cards previewing the cost-breakdown and weekly-burn-rate panels."
        >
          <div className="llh-float llh-b">
            <div className="llh-f-head">
              Weekly burn rate <span className="llh-info">i</span>
            </div>
            <div className="llh-f-sub">
              All disbursement sources · last 12 weeks
            </div>
            <div className="llh-spark">
              <i style={{ height: "32%" }} />
              <i style={{ height: "50%" }} />
              <i style={{ height: "40%" }} />
              <i style={{ height: "64%" }} />
              <i style={{ height: "47%" }} />
              <i style={{ height: "73%" }} />
              <i style={{ height: "56%" }} />
              <i className="llh-hi" style={{ height: "88%" }} />
              <i style={{ height: "61%" }} />
              <i style={{ height: "70%" }} />
              <i className="llh-warn" style={{ height: "45%" }} />
              <i className="llh-hi" style={{ height: "80%" }} />
            </div>
            <div className="llh-f-foot">
              <span className="llh-v">₱412,900</span>
              <span className="llh-t">week of Jul 21</span>
            </div>
          </div>

          <div className="llh-float llh-a">
            <div className="llh-f-head">
              Cost breakdown <span className="llh-dots">···</span>
            </div>
            <div className="llh-f-sub">All time, current totals</div>
            <div className="llh-donut-row">
              <div className="llh-donut">
                <b>₱6.80M</b>
              </div>
              <div className="llh-legend">
                <div>
                  <span
                    className="llh-sq"
                    style={{ background: "var(--series-1)" }}
                  />
                  Payroll · 38%
                </div>
                <div>
                  <span
                    className="llh-sq"
                    style={{ background: "var(--series-2)" }}
                  />
                  Replenishments · 17%
                </div>
                <div>
                  <span
                    className="llh-sq"
                    style={{ background: "var(--series-3)" }}
                  />
                  PO payments · 31%
                </div>
                <div>
                  <span
                    className="llh-sq"
                    style={{ background: "var(--series-4)" }}
                  />
                  Cash advances · 9%
                </div>
                <div>
                  <span
                    className="llh-sq"
                    style={{ background: "var(--series-5)" }}
                  />
                  Additional · 5%
                </div>
              </div>
            </div>
          </div>

          <div className="llh-phone">
            <div className="llh-island" />
            <div className="llh-screen">
              <div className="llh-statusbar">
                <span>9:41</span>
                <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span className="llh-bars">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="llh-batt" />
                </span>
              </div>

              <div className="llh-app">
                <div className="llh-eyebrow">
                  Project cost &amp; payroll tracker
                </div>
                <h2>
                  LedgerLab – Cost
                  <br />
                  Management System
                </h2>

                <div className="llh-acct">
                  <span className="llh-chip">
                    <span className="llh-who">MM</span>you@company.com
                  </span>
                  <span className="llh-logout">Log out</span>
                </div>

                <div className="llh-tabs">
                  <span className="llh-on">
                    <span className="llh-dotsq" />
                    Overview
                  </span>
                  <span>
                    <span className="llh-dotsq" />
                    Replenishments
                  </span>
                  <span>
                    <span className="llh-dotsq" />
                    Purchase Or…
                  </span>
                </div>

                <div className="llh-rowtop">
                  <h3>Overview</h3>
                  <span className="llh-pdf">Print / Save as PDF</span>
                </div>

                <div className="llh-kpi">
                  <div className="llh-k">Budget</div>
                  <div className="llh-v">₱12,480,000.00</div>
                  <div className="llh-m">Total approved</div>
                </div>
                <div className="llh-kpi">
                  <div className="llh-k">Committed</div>
                  <div className="llh-v">₱9,214,500.00</div>
                  <div className="llh-bar">
                    <i style={{ width: "74%" }} />
                  </div>
                  <div className="llh-m">74% of budget</div>
                </div>
                <div className="llh-kpi">
                  <div className="llh-k">Paid (check issued)</div>
                  <div className="llh-v">₱6,802,140.00</div>
                  <div className="llh-m">Cash actually paid out</div>
                </div>
                <div className="llh-kpi">
                  <div className="llh-k">Remaining vs. contract</div>
                  <div className="llh-v llh-pos">₱3,265,500.00</div>
                  <div className="llh-m">How much can still be awarded</div>
                </div>
                <div className="llh-kpi">
                  <div className="llh-k">Remaining vs. disbursed</div>
                  <div className="llh-v llh-pos">₱5,677,860.00</div>
                  <div className="llh-m">How much cash is left</div>
                </div>
                <div className="llh-vat">
                  <span>
                    VAT (12% of gross, amount × 12/112)
                    <b>Net of VAT ₱6,073,339.29</b>
                  </span>
                  <span style={{ textAlign: "right" }}>
                    Component
                    <b>₱728,800.71</b>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="llh-shelf">
        <svg
          viewBox="0 0 1440 104"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0 46 L560 46 C596 46 604 6 640 6 L1440 6 L1440 104 L0 104 Z"
            fill="#F5F7F6"
            stroke="#CFE4D7"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
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
          <Link to="/demo" className={`${CTA_BUTTON} mt-auto self-start`}>
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
          <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-[11px] text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-3.5 rounded-xs bg-rule" />
              Budget{" "}
              <b className="font-semibold text-ink">{PROGRESS_ROWS[0].pct}%</b>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-3.5 rounded-xs bg-accent-soft" />
              Committed{" "}
              <b className="font-semibold text-ink">{PROGRESS_ROWS[1].pct}%</b>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-3.5 rounded-full bg-accent" />
              Disbursed{" "}
              <b className="font-semibold text-ink">{PROGRESS_ROWS[2].pct}%</b>
            </span>
          </div>
          <svg
            viewBox="0 0 560 40"
            className="block w-full"
            role="img"
            aria-label={`Bullet chart: a Budget range of ${PROGRESS_ROWS[0].pct} percent contains a Committed range of ${PROGRESS_ROWS[1].pct} percent, which contains a thin Disbursed measure bar at ${PROGRESS_ROWS[2].pct} percent.`}
          >
            <rect
              x="0"
              y="6"
              width="560"
              height="22"
              rx="3"
              className="fill-rule"
            />
            <rect
              x="0"
              y="6"
              width={(PROGRESS_ROWS[1].pct / 100) * 560}
              height="22"
              rx="3"
              className="fill-accent-soft"
            />
            <rect
              x="0"
              y="13"
              width={(PROGRESS_ROWS[2].pct / 100) * 560}
              height="8"
              rx="4"
              className="fill-accent"
            />
          </svg>
          <p className="mt-4 border-t border-dashed border-rule-strong pt-3.5 text-sm text-ink-muted">
            Committed minus disbursed ={" "}
            <b className="font-mono font-semibold text-danger">31%</b> owed but
            not yet paid
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-px overflow-hidden rounded-lg border border-rule bg-rule">
        {HOW_PAIR.map((pair) => (
          <div key={pair.now} className="grid gap-px bg-rule sm:grid-cols-2">
            <div className="bg-surface p-5">
              <p className="mb-1.5 font-mono text-[10px] tracking-widest text-ink-faint uppercase">
                Before
              </p>
              <p className="text-sm text-ink-muted">{pair.before}</p>
            </div>
            <div className="bg-accent-soft p-5">
              <p className="mb-1.5 font-mono text-[10px] tracking-widest text-accent-strong uppercase">
                Now
              </p>
              <p className="text-sm text-ink">{pair.now}</p>
            </div>
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
      <div className="grid overflow-hidden rounded-lg border border-accent-soft shadow-card sm:grid-cols-2">
        <div className="border-b border-rule bg-surface p-6 sm:border-r sm:border-b-0 sm:p-8">
          <p className="mb-3 font-mono text-xs tracking-widest text-accent uppercase">
            Early access
          </p>
          <div className="mb-3 flex items-baseline gap-2">
            <span className="font-display text-4xl font-semibold tracking-tight text-ink">
              Free
            </span>
            <span className="text-sm text-ink-faint">no cost</span>
          </div>
          <p className="mb-5 max-w-xs text-sm text-ink-muted">
            Create an account, set a budget, and run a real project on it. Your
            data stays yours if you leave.
          </p>
          <Link to="/signup" className={CTA_BUTTON}>
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
            className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-accent shadow-card hover:bg-accent-soft"
          >
            Get started
          </Link>
          <Link
            to="/demo"
            className="inline-flex items-center gap-2 rounded-md border border-white/40 px-4 py-2 text-sm font-medium text-white hover:border-white hover:bg-white/10"
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
      <main>
        <HeroSection />
        <p className="mx-auto max-w-295 px-4 pt-3 text-right font-mono text-[11px] text-ink-faint sm:px-6">
          Illustrative figures in the mockup above — not a real project's
          numbers.
        </p>
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
