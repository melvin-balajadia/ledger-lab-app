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
