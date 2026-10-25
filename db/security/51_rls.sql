-- ============================================================
-- db/security/51_rls.sql
-- Run as bb_owner AFTER 50_roles_grants.sql:
--   psql "postgresql://bb_owner:owner_pw@localhost:5432/bloodbank" -f db/security/51_rls.sql
-- ============================================================
\set ON_ERROR_STOP on
\pset pager off

-- Context helpers ---------------------------------------------------------
-- identity values set by the API per transaction (empty string = not set)
CREATE OR REPLACE FUNCTION fn_ctx_int(p_name text) RETURNS int
LANGUAGE sql STABLE
SET search_path = pg_catalog, public
AS $$ SELECT NULLIF(current_setting('app.' || p_name, true), '')::int $$;

-- clearance comes from the DB role (role_def), never from client-supplied data
CREATE OR REPLACE FUNCTION fn_ctx_clearance() RETURNS int
LANGUAGE sql STABLE
SET search_path = pg_catalog, public
AS $$ SELECT clearance::int FROM role_def WHERE db_role = current_user $$;

-- Enable + force RLS, and give the owner an explicit bypass policy ---------------
DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['donor', 'donor_contact', 'donation', 'blood_unit',
                             'screening_result', 'blood_request', 'request_allocation',
                             'donor_alert', 'hospital', 'app_user']
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS owner_all ON %I', t);
        EXECUTE format('CREATE POLICY owner_all ON %I TO bb_owner USING (true) WITH CHECK (true)', t);
    END LOOP;
END
$$;

-- donor (class 2) -----------------------------------------------------------------
DROP POLICY IF EXISTS staff_mac ON donor;
CREATE POLICY staff_mac ON donor TO bb_admin, bb_officer, bb_lab_tech
    USING      (classification <= (SELECT fn_ctx_clearance()))
    WITH CHECK (classification <= (SELECT fn_ctx_clearance()));
DROP POLICY IF EXISTS own_row ON donor;
CREATE POLICY own_row ON donor TO bb_donor
    USING      (donor_id = (SELECT fn_ctx_int('donor_id')))
    WITH CHECK (donor_id = (SELECT fn_ctx_int('donor_id')));

-- donor_contact (class 2) ---------------------------------------------------------------
DROP POLICY IF EXISTS staff_mac ON donor_contact;
CREATE POLICY staff_mac ON donor_contact TO bb_officer, bb_admin
    USING      (classification <= (SELECT fn_ctx_clearance()))
    WITH CHECK (classification <= (SELECT fn_ctx_clearance()));
DROP POLICY IF EXISTS own_row ON donor_contact;
CREATE POLICY own_row ON donor_contact TO bb_donor
    USING      (donor_id = (SELECT fn_ctx_int('donor_id')))
    WITH CHECK (donor_id = (SELECT fn_ctx_int('donor_id')));

-- donation (class 2) ----------------------------------------------------------------------
DROP POLICY IF EXISTS staff_mac ON donation;
CREATE POLICY staff_mac ON donation TO bb_admin, bb_officer, bb_lab_tech, bb_auditor
    USING      (classification <= (SELECT fn_ctx_clearance()))
    WITH CHECK (classification <= (SELECT fn_ctx_clearance()));
DROP POLICY IF EXISTS own_row ON donation;
CREATE POLICY own_row ON donation TO bb_donor
    USING      (donor_id = (SELECT fn_ctx_int('donor_id')))
    WITH CHECK (donor_id = (SELECT fn_ctx_int('donor_id')));

-- blood_unit (class 1) ---------------------------------------------------------------------
DROP POLICY IF EXISTS staff_mac ON blood_unit;
CREATE POLICY staff_mac ON blood_unit TO bb_admin, bb_officer, bb_lab_tech, bb_auditor
    USING      (classification <= (SELECT fn_ctx_clearance()))
    WITH CHECK (classification <= (SELECT fn_ctx_clearance()));

-- screening_result (class 3: RESTRICTED) -------------------------------------------------------
DROP POLICY IF EXISTS lab_mac ON screening_result;
CREATE POLICY lab_mac ON screening_result TO bb_lab_tech
    USING      (classification <= (SELECT fn_ctx_clearance()))
    WITH CHECK (classification <= (SELECT fn_ctx_clearance()));
DROP POLICY IF EXISTS own_rows ON screening_result;
CREATE POLICY own_rows ON screening_result FOR SELECT TO bb_donor
    USING (EXISTS (SELECT 1 FROM donation d
                    WHERE d.donation_id = screening_result.donation_id
                      AND d.donor_id = (SELECT fn_ctx_int('donor_id'))));

-- blood_request (class 1) -------------------------------------------------------------------------
DROP POLICY IF EXISTS staff_mac ON blood_request;
CREATE POLICY staff_mac ON blood_request TO bb_admin, bb_officer, bb_auditor
    USING      (classification <= (SELECT fn_ctx_clearance()))
    WITH CHECK (classification <= (SELECT fn_ctx_clearance()));
DROP POLICY IF EXISTS hosp_select ON blood_request;
CREATE POLICY hosp_select ON blood_request FOR SELECT TO bb_hospital
    USING (hospital_id = (SELECT fn_ctx_int('hospital_id')));
DROP POLICY IF EXISTS hosp_insert ON blood_request;
CREATE POLICY hosp_insert ON blood_request FOR INSERT TO bb_hospital
    WITH CHECK (hospital_id  = (SELECT fn_ctx_int('hospital_id'))
            AND requested_by = (SELECT fn_ctx_int('user_id'))
            AND status = 'PENDING'
            AND classification <= (SELECT fn_ctx_clearance()));
DROP POLICY IF EXISTS hosp_update ON blood_request;
CREATE POLICY hosp_update ON blood_request FOR UPDATE TO bb_hospital      -- cancel own open requests only
    USING      (hospital_id = (SELECT fn_ctx_int('hospital_id')) AND status IN ('PENDING', 'APPROVED'))
    WITH CHECK (hospital_id = (SELECT fn_ctx_int('hospital_id')) AND status = 'CANCELLED');

-- request_allocation (class 1) -------------------------------------------------------------------------
DROP POLICY IF EXISTS staff_mac ON request_allocation;
CREATE POLICY staff_mac ON request_allocation TO bb_admin, bb_officer, bb_auditor
    USING      (classification <= (SELECT fn_ctx_clearance()))
    WITH CHECK (classification <= (SELECT fn_ctx_clearance()));
DROP POLICY IF EXISTS hosp_select ON request_allocation;
CREATE POLICY hosp_select ON request_allocation FOR SELECT TO bb_hospital
    USING (EXISTS (SELECT 1 FROM blood_request r
                    WHERE r.request_id = request_allocation.request_id
                      AND r.hospital_id = (SELECT fn_ctx_int('hospital_id'))));

-- donor_alert (class 2) --------------------------------------------------------------------------------------
DROP POLICY IF EXISTS staff_mac ON donor_alert;
CREATE POLICY staff_mac ON donor_alert TO bb_admin, bb_officer, bb_auditor
    USING      (classification <= (SELECT fn_ctx_clearance()))
    WITH CHECK (classification <= (SELECT fn_ctx_clearance()));
DROP POLICY IF EXISTS own_row ON donor_alert;
CREATE POLICY own_row ON donor_alert TO bb_donor
    USING      (donor_id = (SELECT fn_ctx_int('donor_id')))
    WITH CHECK (donor_id = (SELECT fn_ctx_int('donor_id')));

-- hospital -----------------------------------------------------------------------------------------------------
DROP POLICY IF EXISTS staff_all ON hospital;
CREATE POLICY staff_all ON hospital TO bb_admin, bb_officer, bb_auditor
    USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS own_select ON hospital;
CREATE POLICY own_select ON hospital FOR SELECT TO bb_hospital
    USING (hospital_id = (SELECT fn_ctx_int('hospital_id')));
DROP POLICY IF EXISTS own_update ON hospital;
CREATE POLICY own_update ON hospital FOR UPDATE TO bb_hospital
    USING      (hospital_id = (SELECT fn_ctx_int('hospital_id')))
    WITH CHECK (hospital_id = (SELECT fn_ctx_int('hospital_id')));

-- app_user -------------------------------------------------------------------------------------------------------------
DROP POLICY IF EXISTS staff_all ON app_user;
CREATE POLICY staff_all ON app_user TO bb_admin, bb_officer, bb_lab_tech, bb_auditor
    USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS donor_own ON app_user;
CREATE POLICY donor_own ON app_user FOR SELECT TO bb_donor
    USING (user_id = (SELECT fn_ctx_int('user_id')));

-- Smoke tests: 10 tables with t | t, then 32 policies ----------------------------------------------------------------------
SELECT relname, relrowsecurity AS rls, relforcerowsecurity AS forced
FROM pg_class
WHERE relnamespace = 'public'::regnamespace AND relrowsecurity
ORDER BY relname;

SELECT count(*) AS policies FROM pg_policies WHERE schemaname = 'public';

-- ----------------------------------------------------------------------------------------------------------------------
-- MAC DEMO for the viva (run as postgres on seeded data, then revert):
--   GRANT SELECT ON screening_result TO bb_officer;       -- DAC now allows it
--   BEGIN; SET LOCAL ROLE bb_officer; SELECT count(*) FROM screening_result;  -- 0 rows: MAC (2 < 3)
--   ROLLBACK;  REVOKE SELECT ON screening_result FROM bb_officer;
-- ----------------------------------------------------------------------------------------------------------------------