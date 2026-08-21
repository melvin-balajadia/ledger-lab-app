-- =====================================================================
-- Portfolio demo — Project Cost & Payroll Monitoring
-- PostgreSQL (Supabase) port, fictional data only
-- =====================================================================
-- Converted from db/schema.sql (MySQL 8.0). Structure only — no real
-- business data. See DEPLOY_VERCEL_SUPABASE.md for the full list of
-- conversion decisions; the short version:
--
--   * DECIMAL(x,y)      -- Postgres accepts DECIMAL as a synonym for
--                          NUMERIC, so amounts keep the exact same
--                          precision/scale and (via `pg`'s default type
--                          parser) still come back as JS strings, same
--                          as mysql2 with decimalNumbers unset. No app
--                          code change needed for CLAUDE.md rule 4.
--   * TINYINT(1)        -- kept as SMALLINT (0/1), NOT converted to
--                          BOOLEAN. ponytail: a real bool is more
--                          idiomatic Postgres, but every route/view
--                          already compares these with `= 0` / `= 1`;
--                          keeping the same 0/1 values means none of
--                          that SQL text has to change. Revisit if this
--                          app ever needs true/false semantics elsewhere.
--   * ENUM(...)         -- TEXT + CHECK constraint. Postgres enums are
--                          real types that need ALTER TYPE to extend —
--                          more ceremony than this app needs.
--   * AUTO_INCREMENT    -- SERIAL / BIGSERIAL.
--   * inline KEY (...)  -- pulled out into CREATE INDEX statements below
--                          each table (Postgres has no inline non-unique
--                          key syntax).
--   * ON UPDATE CURRENT_TIMESTAMP -- not a Postgres feature. Replaced
--                          with one trigger function (set_updated_at)
--                          attached to every table that had it.
--   * GENERATED ... AS (IF(...)) STORED -- IF() isn't a Postgres
--                          function; rewritten as CASE WHEN.
--
-- Run this against a fresh Supabase Postgres database (the `postgres`
-- database Supabase gives you already exists — there's no CREATE
-- DATABASE / USE step here, unlike the MySQL original).
-- =====================================================================

DROP TABLE IF EXISTS
  timekeeping_detail, payroll_entries, payroll_periods, workers,
  weekly_budget_additions, remaining_cost_lines, remaining_cost_estimates,
  purchase_order_attachments, po_payments, purchase_orders, replenishments, cash_advances,
  additional_payments, budget_revisions, audit_log, po_payment_terms,
  planning_lines, budget_items, suppliers, fx_rates, projects
  CASCADE;

-- One trigger function stands in for every MySQL "ON UPDATE CURRENT_TIMESTAMP"
-- column below. Attached per-table after each CREATE TABLE that needs it.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 1. Reference / master data
-- ---------------------------------------------------------------------

CREATE TABLE projects (
  id            SERIAL PRIMARY KEY,
  -- One project per Supabase Auth account (server/routes/createProject.js
  -- enforces this at insert time; the UNIQUE constraint backs it at the DB
  -- level too). No FK to auth.users -- that table lives in Supabase's own
  -- schema, not this one. The seed project below is the sole exception: it
  -- has no real owner and is served read-only to anonymous callers by
  -- requireAuth.js's PUBLIC_DEMO_PROJECT_ID carve-out, which never queries
  -- owner_id for that path -- so its value here is just a valid, unique
  -- placeholder, not a real account.
  owner_id      UUID         NOT NULL UNIQUE,
  code          VARCHAR(32)  NOT NULL UNIQUE,
  name          VARCHAR(160) NOT NULL,
  company       VARCHAR(160) NOT NULL,
  location      VARCHAR(255) NULL,
  tin           VARCHAR(32)  NULL,
  total_budget  DECIMAL(18,2) NOT NULL DEFAULT 0,
  vat_inclusive SMALLINT NOT NULL DEFAULT 1,
  vat_rate      DECIMAL(5,4) NOT NULL DEFAULT 0.1200,
  started_on    DATE NULL,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('planning','active','on_hold','closed')),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE fx_rates (
  id            SERIAL PRIMARY KEY,
  currency      CHAR(3)      NOT NULL,
  rate_to_php   DECIMAL(12,6) NOT NULL,
  effective_on  DATE         NOT NULL,
  note          VARCHAR(120) NULL,
  CONSTRAINT uk_fx UNIQUE (currency, effective_on)
);

CREATE TABLE suppliers (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name          VARCHAR(191) NOT NULL,
  normalized_name VARCHAR(191) NOT NULL,
  tin           VARCHAR(32)  NULL,
  category      VARCHAR(64)  NULL,
  is_active     SMALLINT   NOT NULL DEFAULT 1,
  created_by    VARCHAR(64)  NULL,
  updated_by    VARCHAR(64)  NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT uk_supplier_norm UNIQUE (normalized_name)
);
CREATE INDEX ix_supplier_name ON suppliers (name);
CREATE INDEX ix_supplier_project ON suppliers (project_id);
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE budget_items (
  id                SERIAL PRIMARY KEY,
  project_id        INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_no           VARCHAR(8)   NOT NULL,
  sort_order        SMALLINT     NOT NULL DEFAULT 0,
  description       VARCHAR(191) NOT NULL,
  original_budget   DECIMAL(18,2) NOT NULL DEFAULT 0,
  revised_budget    DECIMAL(18,2) NOT NULL DEFAULT 0,
  contract_amount   DECIMAL(18,2) NOT NULL DEFAULT 0,
  procurement_mode  TEXT NOT NULL DEFAULT 'other'
                    CHECK (procurement_mode IN
                      ('inhouse','po_awarded','for_bidding','bac_recommendation','third_party','other')),
  remarks           TEXT NULL,
  created_by        VARCHAR(64) NULL,
  updated_by        VARCHAR(64) NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_budget_item UNIQUE (project_id, item_no)
);
CREATE TRIGGER trg_budget_items_updated_at BEFORE UPDATE ON budget_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE planning_lines (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  budget_item_id INTEGER NULL REFERENCES budget_items(id) ON DELETE SET NULL,
  code          VARCHAR(32)  NOT NULL,
  parent_id     INTEGER NULL REFERENCES planning_lines(id) ON DELETE SET NULL,
  depth         SMALLINT NOT NULL DEFAULT 1,
  description   VARCHAR(191) NULL,
  budget_amount DECIMAL(18,2) NULL,
  is_active     SMALLINT   NOT NULL DEFAULT 1,
  created_by    VARCHAR(64) NULL,
  updated_by    VARCHAR(64) NULL,
  updated_at    TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT uk_pl_code UNIQUE (project_id, code)
);
CREATE INDEX ix_pl_parent ON planning_lines (parent_id);
CREATE INDEX ix_pl_item ON planning_lines (budget_item_id);
CREATE TRIGGER trg_planning_lines_updated_at BEFORE UPDATE ON planning_lines
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 2. Commitments — purchase orders
-- ---------------------------------------------------------------------

CREATE TABLE purchase_orders (
  id                SERIAL PRIMARY KEY,
  project_id        INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  por_no            VARCHAR(32)  NOT NULL,
  msr_no            VARCHAR(32)  NULL,
  po_date           DATE         NULL,
  supplier_id       INTEGER NOT NULL REFERENCES suppliers(id),
  budget_item_id    INTEGER NULL REFERENCES budget_items(id) ON DELETE SET NULL,
  planning_line_id  INTEGER NULL REFERENCES planning_lines(id) ON DELETE SET NULL,
  item_description  VARCHAR(255) NULL,
  ref_no            VARCHAR(120) NULL,
  currency          CHAR(3)      NOT NULL DEFAULT 'PHP',
  contract_amount   DECIMAL(18,4) NOT NULL DEFAULT 0,
  fx_rate           DECIMAL(12,6) NOT NULL DEFAULT 1,
  contract_amount_php DECIMAL(18,2)
      GENERATED ALWAYS AS (ROUND(contract_amount * fx_rate, 2)) STORED,
  payment_terms     VARCHAR(160) NULL,
  retention_pct     DECIMAL(6,4) NULL,
  status            TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','partially_paid','fully_paid','cancelled')),
  remarks           TEXT NULL,
  created_by        VARCHAR(64)  NULL,
  updated_by        VARCHAR(64)  NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  voided_at         TIMESTAMP    NULL,
  voided_by         VARCHAR(64)  NULL,
  void_reason       VARCHAR(255) NULL,
  active_guard      SMALLINT GENERATED ALWAYS AS (CASE WHEN voided_at IS NULL THEN 1 ELSE NULL END) STORED,
  CONSTRAINT uk_por UNIQUE (project_id, por_no, active_guard)
);
CREATE INDEX ix_po_supplier ON purchase_orders (supplier_id);
CREATE INDEX ix_po_item ON purchase_orders (budget_item_id);
CREATE INDEX ix_po_date ON purchase_orders (po_date);
CREATE INDEX ix_po_status ON purchase_orders (status);
CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE po_payments (
  id                SERIAL PRIMARY KEY,
  purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  paid_on           DATE         NULL,
  payment_type      TEXT NOT NULL DEFAULT 'other'
                    CHECK (payment_type IN
                      ('downpayment','progress','before_delivery','cod','completion','retention','other')),
  currency          CHAR(3)      NOT NULL DEFAULT 'PHP',
  amount            DECIMAL(18,4) NOT NULL,
  fx_rate           DECIMAL(12,6) NOT NULL DEFAULT 1,
  amount_php        DECIMAL(18,2) GENERATED ALWAYS AS (ROUND(amount * fx_rate, 2)) STORED,
  pct_of_contract   DECIMAL(9,6)  NULL,
  voucher_no        VARCHAR(64)   NULL,
  remarks           VARCHAR(255)  NULL,
  created_by        VARCHAR(64)   NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  voided_at         TIMESTAMP    NULL,
  voided_by         VARCHAR(64)  NULL,
  void_reason       VARCHAR(255) NULL
);
CREATE INDEX ix_pay_po ON po_payments (purchase_order_id);
CREATE INDEX ix_pay_date ON po_payments (paid_on);

CREATE TABLE purchase_order_attachments (
  id                SERIAL PRIMARY KEY,
  purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  file_name         VARCHAR(80)  NOT NULL,
  original_name     VARCHAR(255) NOT NULL,
  content_type      VARCHAR(100) NOT NULL,
  size_bytes        INTEGER NOT NULL,
  uploaded_by       VARCHAR(64)  NULL,
  uploaded_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_poa_po ON purchase_order_attachments (purchase_order_id);

-- ---------------------------------------------------------------------
-- 2b. PO payment terms — milestone breakdown
-- ---------------------------------------------------------------------

CREATE TABLE po_payment_terms (
  id                SERIAL PRIMARY KEY,
  purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  seq               SMALLINT NOT NULL,
  label             VARCHAR(80) NOT NULL,
  pct               DECIMAL(9,6) NOT NULL,
  kind              TEXT NOT NULL DEFAULT 'other'
                    CHECK (kind IN
                      ('downpayment','progress','before_delivery','upon_delivery',
                       'completion','retention','other')),
  is_holdback       SMALLINT NOT NULL DEFAULT 0,
  CONSTRAINT uk_term UNIQUE (purchase_order_id, seq)
);
CREATE INDEX ix_term_kind ON po_payment_terms (kind);

-- ---------------------------------------------------------------------
-- 3. Non-PO spend — replenishments (petty cash) and cash advances
-- ---------------------------------------------------------------------

CREATE TABLE replenishments (
  id                SERIAL PRIMARY KEY,
  project_id        INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  txn_date          DATE         NULL,
  supplier_id       INTEGER NULL REFERENCES suppliers(id) ON DELETE SET NULL,
  planning_line_id  INTEGER NULL REFERENCES planning_lines(id) ON DELETE SET NULL,
  budget_item_id    INTEGER NULL REFERENCES budget_items(id) ON DELETE SET NULL,
  item_description  VARCHAR(255) NULL,
  ref_no            VARCHAR(120) NULL,
  ref_type          TEXT NULL CHECK (ref_type IN ('SI','CI','CSI','OR','BS','MSR','other')),
  amount            DECIMAL(18,2) NOT NULL DEFAULT 0,
  batch_no          VARCHAR(64)  NULL,
  document_no       VARCHAR(64)  NULL,
  needs_review      SMALLINT   NOT NULL DEFAULT 0,
  created_by        VARCHAR(64)  NULL,
  updated_by        VARCHAR(64)  NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NULL DEFAULT NULL,
  voided_at         TIMESTAMP    NULL,
  voided_by         VARCHAR(64)  NULL,
  void_reason       VARCHAR(255) NULL
);
CREATE INDEX ix_rep_date ON replenishments (txn_date);
CREATE INDEX ix_rep_pl ON replenishments (planning_line_id);
CREATE INDEX ix_rep_supplier ON replenishments (supplier_id);
CREATE INDEX ix_rep_review ON replenishments (needs_review);
CREATE INDEX ix_rep_doc ON replenishments (document_no);
CREATE TRIGGER trg_replenishments_updated_at BEFORE UPDATE ON replenishments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE cash_advances (
  id                SERIAL PRIMARY KEY,
  project_id        INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  txn_date          DATE         NULL,
  budget_item_id    INTEGER NULL REFERENCES budget_items(id) ON DELETE SET NULL,
  planning_line_id  INTEGER NULL REFERENCES planning_lines(id) ON DELETE SET NULL,
  requested_by      VARCHAR(160) NULL,
  purpose           VARCHAR(255) NULL,
  amount            DECIMAL(18,2) NOT NULL DEFAULT 0,
  liquidated_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','partially_liquidated','liquidated')),
  document_no       VARCHAR(64) NULL,
  control_no        VARCHAR(64) NULL,
  liquidation_control_no VARCHAR(64) NULL,
  needs_review      SMALLINT NOT NULL DEFAULT 0,
  created_by        VARCHAR(64)  NULL,
  updated_by        VARCHAR(64)  NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NULL DEFAULT NULL,
  voided_at         TIMESTAMP    NULL,
  voided_by         VARCHAR(64)  NULL,
  void_reason       VARCHAR(255) NULL
);
CREATE INDEX ix_ca_date ON cash_advances (txn_date);
CREATE INDEX ix_ca_doc ON cash_advances (document_no);
CREATE INDEX ix_ca_control ON cash_advances (control_no);
CREATE TRIGGER trg_cash_advances_updated_at BEFORE UPDATE ON cash_advances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 3b. Additional payments
-- ---------------------------------------------------------------------

CREATE TABLE additional_payments (
  id                SERIAL PRIMARY KEY,
  project_id        INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  txn_date          DATE         NULL,
  payee             VARCHAR(191) NOT NULL,
  supplier_id       INTEGER NULL REFERENCES suppliers(id) ON DELETE SET NULL,
  budget_item_id    INTEGER NULL REFERENCES budget_items(id) ON DELETE SET NULL,
  planning_line_id  INTEGER NULL REFERENCES planning_lines(id) ON DELETE SET NULL,
  description       VARCHAR(255) NULL,
  voucher_no        VARCHAR(64)  NULL,
  expense_type      TEXT NOT NULL DEFAULT 'other'
                    CHECK (expense_type IN
                      ('customs_duty','freight','terminal_handling','insurance','brokerage','other')),
  currency          CHAR(3)      NOT NULL DEFAULT 'PHP',
  amount            DECIMAL(18,4) NOT NULL DEFAULT 0,
  fx_rate           DECIMAL(12,6) NOT NULL DEFAULT 1,
  amount_php        DECIMAL(18,2) GENERATED ALWAYS AS (ROUND(amount * fx_rate, 2)) STORED,
  document_no       VARCHAR(64)  NULL,
  needs_review      SMALLINT   NOT NULL DEFAULT 0,
  created_by        VARCHAR(64)  NULL,
  updated_by        VARCHAR(64)  NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NULL DEFAULT NULL,
  voided_at         TIMESTAMP    NULL,
  voided_by         VARCHAR(64)  NULL,
  void_reason       VARCHAR(255) NULL
);
CREATE INDEX ix_ap_date ON additional_payments (txn_date);
CREATE INDEX ix_ap_item ON additional_payments (budget_item_id);
CREATE INDEX ix_ap_voucher ON additional_payments (voucher_no);
CREATE INDEX ix_ap_doc ON additional_payments (document_no);
CREATE TRIGGER trg_additional_payments_updated_at BEFORE UPDATE ON additional_payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 3c. Budget revisions
-- ---------------------------------------------------------------------

CREATE TABLE budget_revisions (
  id              SERIAL PRIMARY KEY,
  project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  budget_item_id  INTEGER NOT NULL REFERENCES budget_items(id) ON DELETE CASCADE,
  revision_no     SMALLINT NOT NULL DEFAULT 1,
  effective_on    DATE NOT NULL,
  amount_before   DECIMAL(18,2) NOT NULL,
  amount_after    DECIMAL(18,2) NOT NULL,
  delta           DECIMAL(18,2) GENERATED ALWAYS AS (amount_after - amount_before) STORED,
  reason          VARCHAR(255) NULL,
  approved_by     VARCHAR(160) NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_rev UNIQUE (budget_item_id, revision_no)
);
CREATE INDEX ix_rev_date ON budget_revisions (effective_on);

-- ---------------------------------------------------------------------
-- 3d. Audit log
-- ---------------------------------------------------------------------

CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  table_name  VARCHAR(64) NOT NULL,
  row_id      INTEGER NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('insert','update')),
  changed_by  VARCHAR(64) NOT NULL,
  changed_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  before_json JSONB NULL,
  after_json  JSONB NULL
);
CREATE INDEX ix_audit_table_row ON audit_log (table_name, row_id);

-- ---------------------------------------------------------------------
-- 4. Payroll (labor cost)
-- ---------------------------------------------------------------------

CREATE TABLE payroll_periods (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label         VARCHAR(64) NOT NULL,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','paid')),
  total_amount  DECIMAL(18,2) NOT NULL DEFAULT 0,
  created_by    VARCHAR(64) NULL,
  updated_by    VARCHAR(64) NULL,
  updated_at    TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT uk_period UNIQUE (project_id, period_start, period_end)
);
CREATE INDEX ix_period_start ON payroll_periods (period_start);
CREATE TRIGGER trg_payroll_periods_updated_at BEFORE UPDATE ON payroll_periods
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE workers (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  employee_no   VARCHAR(32)  NULL,
  last_name     VARCHAR(80)  NOT NULL,
  first_name    VARCHAR(80)  NOT NULL,
  middle_name   VARCHAR(80)  NULL,
  full_name     VARCHAR(191) NOT NULL,
  position      VARCHAR(80)  NULL,
  daily_rate    DECIMAL(10,2) NULL,
  hourly_rate   DECIMAL(10,4) NULL,
  date_hired    DATE NULL,
  date_separated DATE NULL,
  is_active     SMALLINT NOT NULL DEFAULT 1,
  created_by    VARCHAR(64)  NULL,
  updated_by    VARCHAR(64)  NULL,
  updated_at    TIMESTAMP NULL DEFAULT NULL
);
CREATE INDEX ix_worker_name ON workers (full_name);
CREATE INDEX ix_worker_position ON workers (position);
CREATE INDEX ix_worker_project ON workers (project_id);
CREATE TRIGGER trg_workers_updated_at BEFORE UPDATE ON workers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE payroll_entries (
  id                SERIAL PRIMARY KEY,
  project_id        INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  payroll_period_id INTEGER NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  worker_id         INTEGER NOT NULL REFERENCES workers(id),
  planning_line_id  INTEGER NULL REFERENCES planning_lines(id) ON DELETE SET NULL,
  budget_item_id    INTEGER NULL REFERENCES budget_items(id) ON DELETE SET NULL,
  amount            DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_by        VARCHAR(64) NULL,
  updated_by        VARCHAR(64) NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NULL DEFAULT NULL,
  voided_at         TIMESTAMP    NULL,
  voided_by         VARCHAR(64)  NULL,
  void_reason       VARCHAR(255) NULL,
  active_guard      SMALLINT GENERATED ALWAYS AS (CASE WHEN voided_at IS NULL THEN 1 ELSE NULL END) STORED,
  CONSTRAINT uk_entry UNIQUE (payroll_period_id, worker_id, planning_line_id, active_guard)
);
CREATE INDEX ix_pe_worker ON payroll_entries (worker_id);
CREATE INDEX ix_pe_pl ON payroll_entries (planning_line_id);
CREATE INDEX ix_pe_item ON payroll_entries (budget_item_id);
CREATE TRIGGER trg_payroll_entries_updated_at BEFORE UPDATE ON payroll_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE timekeeping_detail (
  id                SERIAL PRIMARY KEY,
  payroll_entry_id  INTEGER NOT NULL REFERENCES payroll_entries(id) ON DELETE CASCADE,
  work_date         DATE NULL,
  day_of_week       TEXT NULL CHECK (day_of_week IN ('Mon','Tue','Wed','Thu','Fri','Sat','Sun')),
  regular_hours     DECIMAL(6,2) NOT NULL DEFAULT 0,
  ot_hours          DECIMAL(6,2) NOT NULL DEFAULT 0,
  night_diff_hours  DECIMAL(6,2) NOT NULL DEFAULT 0,
  late_undertime_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
  is_rest_day       SMALLINT NOT NULL DEFAULT 0,
  is_holiday        SMALLINT NOT NULL DEFAULT 0
);
CREATE INDEX ix_tk_entry ON timekeeping_detail (payroll_entry_id);

-- ---------------------------------------------------------------------
-- 5. Weekly budget-addition log + remaining-cost estimates
-- ---------------------------------------------------------------------

CREATE TABLE weekly_budget_additions (
  id              SERIAL PRIMARY KEY,
  project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  week_label      VARCHAR(48) NOT NULL,
  week_start      DATE NOT NULL,
  week_end        DATE NOT NULL,
  budget_item_id  INTEGER NULL REFERENCES budget_items(id) ON DELETE SET NULL,
  seq             SMALLINT NOT NULL DEFAULT 1,
  needs_review    SMALLINT NOT NULL DEFAULT 0,
  additional_po   DECIMAL(18,2) NOT NULL DEFAULT 0,
  replen          DECIMAL(18,2) NOT NULL DEFAULT 0,
  labor           DECIMAL(18,2) NOT NULL DEFAULT 0,
  total_amount    DECIMAL(18,2) GENERATED ALWAYS AS (additional_po + replen + labor) STORED,
  CONSTRAINT uk_wba UNIQUE (project_id, week_start, budget_item_id, seq)
);
CREATE INDEX ix_wba_week ON weekly_budget_additions (week_start);

CREATE TABLE remaining_cost_estimates (
  id              SERIAL PRIMARY KEY,
  project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  budget_item_id  INTEGER NULL REFERENCES budget_items(id) ON DELETE SET NULL,
  title           VARCHAR(160) NOT NULL,
  as_of_date      DATE NULL,
  total_amount    DECIMAL(18,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE remaining_cost_lines (
  id              SERIAL PRIMARY KEY,
  estimate_id     INTEGER NOT NULL REFERENCES remaining_cost_estimates(id) ON DELETE CASCADE,
  item_no         VARCHAR(16) NULL,
  particulars     VARCHAR(255) NOT NULL,
  qty             DECIMAL(14,4) NOT NULL DEFAULT 0,
  uom             VARCHAR(24) NULL,
  unit_price      DECIMAL(14,4) NOT NULL DEFAULT 0,
  amount          DECIMAL(18,2) NOT NULL DEFAULT 0,
  actual_amount   DECIMAL(18,2) NULL,
  remarks         VARCHAR(255) NULL
);
CREATE INDEX ix_rcl_est ON remaining_cost_lines (estimate_id);

-- ---------------------------------------------------------------------
-- 6. Views — these ARE your dashboard endpoints
-- ---------------------------------------------------------------------
-- Unchanged from schema.sql except needs_review/voided_at comparisons,
-- which still work as-is since those columns kept their 0/1 SMALLINT
-- representation instead of becoming BOOLEAN.

CREATE OR REPLACE VIEW v_po_paid_by_item AS
SELECT po.project_id, po.budget_item_id,
       SUM(pp.amount_php) AS paid_po_amount
FROM purchase_orders po
JOIN po_payments pp ON pp.purchase_order_id = po.id
WHERE po.voided_at IS NULL AND pp.voided_at IS NULL
GROUP BY po.project_id, po.budget_item_id;

CREATE OR REPLACE VIEW v_replen_by_item AS
SELECT project_id, budget_item_id, SUM(amount) AS replen_amount
FROM replenishments WHERE needs_review = 0 AND voided_at IS NULL
GROUP BY project_id, budget_item_id;

CREATE OR REPLACE VIEW v_labor_by_item AS
SELECT project_id, budget_item_id, SUM(amount) AS labor_cost
FROM payroll_entries WHERE voided_at IS NULL
GROUP BY project_id, budget_item_id;

CREATE OR REPLACE VIEW v_addl_by_item AS
SELECT project_id, budget_item_id, SUM(amount_php) AS additional_payment
FROM additional_payments WHERE needs_review = 0 AND voided_at IS NULL
GROUP BY project_id, budget_item_id;

CREATE OR REPLACE VIEW v_ca_by_item AS
SELECT project_id, budget_item_id, SUM(amount) AS cash_advanced
FROM cash_advances WHERE voided_at IS NULL
GROUP BY project_id, budget_item_id;

CREATE OR REPLACE VIEW v_budget_vs_actual AS
SELECT
  bi.id                                AS budget_item_id,
  bi.project_id,
  bi.item_no,
  bi.description,
  bi.procurement_mode,
  bi.remarks,
  bi.revised_budget                    AS budget,
  bi.contract_amount                   AS contract_amount,
  COALESCE(l.labor_cost, 0)            AS labor_cost,
  COALESCE(c.cash_advanced, 0)         AS cash_advanced,
  COALESCE(p.paid_po_amount, 0)        AS paid_po_amount,
  COALESCE(r.replen_amount, 0)         AS replen_amount,
  COALESCE(a.additional_payment, 0)    AS additional_payment,
  COALESCE(p.paid_po_amount,0) + COALESCE(r.replen_amount,0)
    + COALESCE(c.cash_advanced,0) + COALESCE(l.labor_cost,0)
    + COALESCE(a.additional_payment,0)                        AS total_disbursed,
  bi.revised_budget - bi.contract_amount                      AS remaining_vs_contract,
  bi.revised_budget - (COALESCE(p.paid_po_amount,0) + COALESCE(r.replen_amount,0)
    + COALESCE(c.cash_advanced,0) + COALESCE(l.labor_cost,0)
    + COALESCE(a.additional_payment,0))                       AS remaining_vs_disbursed,
  CASE WHEN bi.revised_budget > 0
       THEN ROUND(bi.contract_amount / bi.revised_budget, 4) END AS commitment_ratio,
  CASE WHEN bi.contract_amount > bi.revised_budget THEN 1 ELSE 0 END AS is_over_budget,
  (SELECT COUNT(*) FROM budget_revisions br WHERE br.budget_item_id = bi.id) AS revision_count
FROM budget_items bi
LEFT JOIN v_po_paid_by_item p ON p.budget_item_id = bi.id
LEFT JOIN v_replen_by_item  r ON r.budget_item_id = bi.id
LEFT JOIN v_ca_by_item      c ON c.budget_item_id = bi.id
LEFT JOIN v_labor_by_item   l ON l.budget_item_id = bi.id
LEFT JOIN v_addl_by_item    a ON a.budget_item_id = bi.id;

CREATE OR REPLACE VIEW v_vat_component AS
SELECT bi.project_id, bi.item_no, bi.description,
       v.total_disbursed                                   AS gross_amount,
       ROUND(v.total_disbursed * 12 / 112, 2)              AS vat_component,
       ROUND(v.total_disbursed * 100 / 112, 2)             AS net_of_vat
FROM v_budget_vs_actual v JOIN budget_items bi ON bi.id = v.budget_item_id;

CREATE OR REPLACE VIEW v_po_balance AS
SELECT po.id, po.project_id, po.por_no, po.po_date, s.name AS supplier,
       bi.item_no, bi.description AS budget_item,
       po.currency, po.contract_amount, po.fx_rate, po.contract_amount_php,
       COALESCE(SUM(pp.amount_php), 0) AS paid_php,
       CASE WHEN po.status = 'cancelled' THEN 0
            ELSE po.contract_amount_php - COALESCE(SUM(pp.amount_php), 0) END AS balance_php,
       CASE WHEN po.contract_amount_php > 0
            THEN ROUND(COALESCE(SUM(pp.amount_php),0) / po.contract_amount_php, 4)
       END AS pct_paid,
       po.payment_terms, po.status
FROM purchase_orders po
JOIN suppliers s ON s.id = po.supplier_id
LEFT JOIN budget_items bi ON bi.id = po.budget_item_id
LEFT JOIN po_payments pp ON pp.purchase_order_id = po.id AND pp.voided_at IS NULL
WHERE po.voided_at IS NULL
GROUP BY po.id, po.project_id, po.por_no, po.po_date, s.name, bi.item_no,
         bi.description, po.currency, po.contract_amount, po.fx_rate,
         po.contract_amount_php, po.payment_terms, po.status;

CREATE OR REPLACE VIEW v_po_retention AS
SELECT po.id, po.project_id, po.por_no, s.name AS supplier,
       bi.item_no, po.contract_amount_php,
       po.retention_pct,
       ROUND(po.contract_amount_php * COALESCE(po.retention_pct,0), 2) AS retention_amount,
       COALESCE(rel.released, 0)                                        AS retention_released,
       ROUND(po.contract_amount_php * COALESCE(po.retention_pct,0), 2)
         - COALESCE(rel.released, 0)                                    AS retention_outstanding
FROM purchase_orders po
JOIN suppliers s ON s.id = po.supplier_id
LEFT JOIN budget_items bi ON bi.id = po.budget_item_id
LEFT JOIN (SELECT purchase_order_id, SUM(amount_php) released
             FROM po_payments WHERE payment_type = 'retention' AND voided_at IS NULL
            GROUP BY purchase_order_id) rel
       ON rel.purchase_order_id = po.id
WHERE COALESCE(po.retention_pct, 0) > 0 AND po.voided_at IS NULL;

CREATE OR REPLACE VIEW v_weekly_burn AS
SELECT project_id, week_start, 'labor' AS bucket, SUM(labor) AS amount
  FROM weekly_budget_additions GROUP BY project_id, week_start
UNION ALL
SELECT project_id, week_start, 'replen', SUM(replen)
  FROM weekly_budget_additions GROUP BY project_id, week_start
UNION ALL
SELECT project_id, week_start, 'po', SUM(additional_po)
  FROM weekly_budget_additions GROUP BY project_id, week_start;

CREATE OR REPLACE VIEW v_planning_line_spend AS
SELECT pl.id AS planning_line_id, pl.project_id, pl.budget_item_id, pl.code, pl.description, pl.parent_id, pl.depth,
       pl.budget_amount, pl.is_active,
       COALESCE(rp.amt, 0) AS replen_amount,
       COALESCE(pa.amt, 0) AS po_paid_amount,
       COALESCE(ca.amt, 0) AS cash_advance_amount,
       COALESCE(ap.amt, 0) AS additional_payment_amount,
       COALESCE(pe.amt, 0) AS labor_amount,
       COALESCE(rp.amt,0) + COALESCE(pa.amt,0) + COALESCE(ca.amt,0)
         + COALESCE(ap.amt,0) + COALESCE(pe.amt,0)              AS total_spend
FROM planning_lines pl
LEFT JOIN (SELECT planning_line_id, SUM(amount) amt FROM replenishments
            WHERE needs_review = 0 AND voided_at IS NULL GROUP BY planning_line_id) rp ON rp.planning_line_id = pl.id
LEFT JOIN (SELECT po.planning_line_id, SUM(pp.amount_php) amt
             FROM purchase_orders po JOIN po_payments pp ON pp.purchase_order_id = po.id
            WHERE po.voided_at IS NULL AND pp.voided_at IS NULL
            GROUP BY po.planning_line_id) pa ON pa.planning_line_id = pl.id
LEFT JOIN (SELECT planning_line_id, SUM(amount) amt FROM cash_advances
            WHERE voided_at IS NULL GROUP BY planning_line_id) ca ON ca.planning_line_id = pl.id
LEFT JOIN (SELECT planning_line_id, SUM(amount_php) amt FROM additional_payments
            WHERE needs_review = 0 AND voided_at IS NULL GROUP BY planning_line_id) ap ON ap.planning_line_id = pl.id
LEFT JOIN (SELECT planning_line_id, SUM(amount) amt FROM payroll_entries
            WHERE voided_at IS NULL GROUP BY planning_line_id) pe ON pe.planning_line_id = pl.id;

-- ---------------------------------------------------------------------
-- 7. Demo seed — fictional data only
-- ---------------------------------------------------------------------
-- Deliberately NOT db/seed_master_data.sql (324 real supplier names) or
-- any dump of db/rcsni_cost_clean_*.sql (real, sensitive project figures).
-- This is enough for the portfolio deploy to have something to click
-- through: one project, a handful of budget items with round made-up
-- numbers, a couple of demo suppliers/planning lines. Create the one
-- demo login separately with server/scripts/create-user.js (see
-- DEPLOY_VERCEL_SUPABASE.md) — password hashes don't belong in a SQL
-- file that might get committed.

-- The nil UUID marks "no real owner" for the one public demo project --
-- see the comment on projects.owner_id above. It's never looked up for
-- the anonymous read-only path, only present to satisfy NOT NULL UNIQUE.
INSERT INTO projects (owner_id, code, name, company, location, tin, total_budget, vat_inclusive, status)
VALUES
 ('00000000-0000-0000-0000-000000000000', 'DEMO', 'Demo Project', 'Demo Company',
  'Sample City, Philippines', NULL, 150000000.00, 1, 'active');

INSERT INTO budget_items
  (project_id, item_no, sort_order, description, original_budget, revised_budget, contract_amount, procurement_mode, remarks)
VALUES
 (1,'1.0', 10,'Site Preparation',           5000000,  5000000,  3200000.00,'inhouse',NULL),
 (1,'2.0', 20,'Civil Works',                45000000, 45000000, 38500000.00,'inhouse',NULL),
 (1,'3.0', 30,'Refrigeration Equipment',    55000000, 55000000, 51200000.00,'po_awarded','PO Awarded'),
 (1,'4.0', 40,'Electrical & Communications',20000000, 20000000, 17800000.00,'inhouse',NULL),
 (1,'5.0', 50,'Office Equipment & Fixtures', 6000000,  6000000,  5100000.00,'for_bidding',NULL),
 (1,'6.0', 60,'Contingency / Other Expenses',19000000, 19000000,         0.00,'other',NULL);

INSERT INTO suppliers (project_id, name, normalized_name, category, is_active) VALUES
 (1, 'Sample Hardware Supply Co.', 'SAMPLE HARDWARE SUPPLY CO.', 'hardware', 1),
 (1, 'Sample Steel & Concrete Inc.', 'SAMPLE STEEL & CONCRETE INC.', 'concrete', 1);

INSERT INTO planning_lines (project_id, budget_item_id, code, depth, description, is_active) VALUES
 (1, 2, '2.1', 2, NULL, 1),
 (1, 2, '2.2', 2, NULL, 1),
 (1, 3, '3.1', 2, NULL, 1);
