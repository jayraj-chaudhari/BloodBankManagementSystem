-- ============================================================
-- db/schema/03_indexes.sql
-- Run as bb_owner AFTER 02b_tables_clinical.sql:
--   psql "postgresql://bb_owner:owner_pw@localhost:5432/bloodbank" -f db/schema/03_indexes.sql
-- ============================================================
\set ON_ERROR_STOP on
\pset pager off

-- Places and people ------------------------------------------------
CREATE INDEX idx_branch_region          ON branch (region_code);
CREATE INDEX idx_branch_parent          ON branch (parent_branch_id);
CREATE INDEX idx_hospital_region        ON hospital (region_code);
CREATE INDEX idx_app_user_role          ON app_user (role_name);
CREATE INDEX idx_app_user_branch        ON app_user (branch_id);
CREATE INDEX idx_app_user_hospital      ON app_user (hospital_id);
CREATE INDEX idx_donor_region           ON donor (region_code);

-- Donor search for emergencies: only donors willing to be contacted
CREATE INDEX idx_donor_group_region     ON donor (blood_group, region_code)
    WHERE is_available;

-- Donations: history per donor (LAG gap queries, eligibility) and per branch
CREATE INDEX idx_donation_donor_date    ON donation (donor_id, donated_at DESC);
CREATE INDEX idx_donation_branch_date   ON donation (branch_id, donated_at);

-- Units: FEFO (earliest expiry first) over AVAILABLE units, and expiry sweeps
CREATE INDEX idx_unit_fefo              ON blood_unit (component, expires_on)
    WHERE status = 'AVAILABLE';
CREATE INDEX idx_unit_expiry            ON blood_unit (expires_on)
    WHERE status IN ('QUARANTINE', 'AVAILABLE', 'RESERVED');

-- Semi-structured lab reports (JSONB containment and path queries)
CREATE INDEX idx_screening_report_gin   ON screening_result USING GIN (report jsonb_path_ops);

-- Requests and allocation ------------------------------------------
CREATE INDEX idx_request_hospital_date  ON blood_request (hospital_id, created_at DESC);
CREATE INDEX idx_request_open           ON blood_request (urgency, created_at)
    WHERE status IN ('PENDING', 'APPROVED', 'PARTIAL');
CREATE INDEX idx_request_group_component ON blood_request (blood_group, component);
CREATE INDEX idx_allocation_request     ON request_allocation (request_id);

-- Emergency alerts: a donor's pending alerts
CREATE INDEX idx_alert_donor_response   ON donor_alert (donor_id, response);

-- Ledger (partitioned: creates a matching index on every partition)
CREATE INDEX idx_stock_movement_unit    ON stock_movement (unit_id, moved_at);
CREATE INDEX idx_stock_movement_type    ON stock_movement (movement_type, moved_at);

-- Refresh planner statistics
ANALYZE;

-- Smoke test: expect 20 rows -----------------------------------------
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx\_%'
ORDER BY tablename, indexname;

-- ------------------------------------------------------------
-- REPORT DEMO (run AFTER the seed data exists, not now):
--   EXPLAIN (ANALYZE, BUFFERS)
--   SELECT unit_id, expires_on FROM blood_unit
--   WHERE status = 'AVAILABLE' AND component = 'RED_CELLS'
--   ORDER BY expires_on LIMIT 5;
-- Screenshot it, then DROP INDEX idx_unit_fefo; run it again, screenshot,
-- and recreate the index. That is your before/after evidence.
-- ------------------------------------------------------------