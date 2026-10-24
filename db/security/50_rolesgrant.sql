-- ============================================================
-- db/security/50_roles_grants.sql
-- Run as bb_owner AFTER 30_views.sql:
--   psql "postgresql://bb_owner:owner_pw@localhost:5432/bloodbank" -f db/security/50_roles_grants.sql
-- ============================================================
\set ON_ERROR_STOP on
\pset pager off

-- 0) Schema access ------------------------------------------------------
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public
    TO bb_admin, bb_officer, bb_lab_tech, bb_hospital, bb_donor, bb_auditor, bb_app;

-- 1) Login support for the API (bb_app gets NO table access) ----------------
CREATE FUNCTION fn_auth_lookup(p_email text)
RETURNS TABLE (user_id int, password_hash text, full_name text, role_name text,
               clearance smallint, branch_id int, hospital_id int, donor_id int,
               is_active boolean, failed_attempts smallint, locked_until timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT u.user_id, u.password_hash, u.full_name, u.role_name, r.clearance,
           u.branch_id, u.hospital_id, d.donor_id, u.is_active, u.failed_attempts, u.locked_until
      FROM app_user u
      JOIN role_def r   ON r.role_name = u.role_name
      LEFT JOIN donor d ON d.user_id   = u.user_id
     WHERE u.email = lower(btrim(p_email))
$$;

-- success resets the counter; the 5th consecutive failure locks the account for 15 minutes
CREATE FUNCTION fn_auth_record_attempt(p_user_id int, p_success boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF p_success THEN
        UPDATE app_user SET failed_attempts = 0, locked_until = NULL
         WHERE user_id = p_user_id;
    ELSE
        UPDATE app_user
           SET failed_attempts = LEAST(failed_attempts + 1, 1000),
               locked_until    = CASE WHEN failed_attempts + 1 >= 5
                                      THEN now() + interval '15 minutes'
                                      ELSE locked_until END
         WHERE user_id = p_user_id;
    END IF;
END
$$;

REVOKE ALL ON FUNCTION fn_auth_lookup(text)               FROM PUBLIC;
REVOKE ALL ON FUNCTION fn_auth_record_attempt(int, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_auth_lookup(text)               TO bb_app;
GRANT EXECUTE ON FUNCTION fn_auth_record_attempt(int, boolean) TO bb_app;

CREATE FUNCTION fn_auth_lookup_by_id(p_user_id int)
RETURNS TABLE (user_id int, email text, full_name text, role_name text,
               clearance smallint, branch_id int, hospital_id int, donor_id int,
               is_active boolean)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS 
    SELECT u.user_id, u.email, u.full_name, u.role_name, r.clearance,
           u.branch_id, u.hospital_id, d.donor_id, u.is_active
      FROM app_user u
      JOIN role_def r   ON r.role_name = u.role_name
      LEFT JOIN donor d ON d.user_id   = u.user_id
     WHERE u.user_id = p_user_id
;

REVOKE ALL ON FUNCTION fn_auth_lookup_by_id(int)               FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_auth_lookup_by_id(int)           TO bb_app;

GRANT EXECUTE ON FUNCTION fn_register_donor(text, text, text, date, char, blood_group_t,
                                            numeric, char, numeric, numeric, text, text) TO bb_app;

-- 2) Lookups and places ------------------------------------------------------------
GRANT SELECT ON region, role_def, component_spec, branch
    TO bb_admin, bb_officer, bb_lab_tech, bb_hospital, bb_donor, bb_auditor;
GRANT INSERT, UPDATE ON region, component_spec TO bb_admin;
GRANT INSERT, UPDATE, DELETE ON branch TO bb_admin;

GRANT SELECT ON hospital TO bb_admin, bb_officer, bb_hospital, bb_auditor;
GRANT INSERT, UPDATE, DELETE ON hospital TO bb_admin;
GRANT UPDATE (phone, address, latitude, longitude) ON hospital TO bb_hospital;  -- own row via RLS

-- 3) Users (column-level; password_hash is never readable) -----------------------------
GRANT SELECT (user_id, email, full_name, role_name, branch_id, hospital_id, is_active,
              failed_attempts, locked_until, created_at) ON app_user TO bb_admin;
GRANT INSERT (email, password_hash, full_name, role_name, branch_id, hospital_id, is_active)
    ON app_user TO bb_admin;
GRANT UPDATE (password_hash, full_name, role_name, branch_id, hospital_id, is_active,
              failed_attempts, locked_until) ON app_user TO bb_admin;
GRANT SELECT (user_id, full_name, role_name, branch_id, hospital_id, is_active)
    ON app_user TO bb_officer, bb_lab_tech, bb_auditor;
GRANT SELECT (user_id, email, full_name, role_name, is_active) ON app_user TO bb_donor;  -- own row

-- 4) Donors and contacts ------------------------------------------------------------------
GRANT SELECT ON donor TO bb_admin, bb_officer, bb_lab_tech, bb_donor;               -- donor: own row via RLS
GRANT UPDATE (date_of_birth, gender, blood_group, weight_kg, region_code,
              latitude, longitude, is_available) ON donor TO bb_officer;
GRANT UPDATE (weight_kg, region_code, latitude, longitude, is_available) ON donor TO bb_donor;

GRANT SELECT ON donor_contact TO bb_officer, bb_donor;                              -- ciphertext only
GRANT INSERT (donor_id, phone_enc, email_enc, address_enc, key_version) ON donor_contact TO bb_officer;
GRANT UPDATE (phone_enc, email_enc, address_enc, key_version) ON donor_contact TO bb_officer, bb_donor;
GRANT EXECUTE ON FUNCTION fn_encrypt_text(text), fn_decrypt_text(bytea) TO bb_officer, bb_donor;

-- 5) Donations, units, screening ---------------------------------------------------------------
GRANT SELECT ON donation TO bb_admin, bb_officer, bb_lab_tech, bb_donor, bb_auditor;
GRANT INSERT (donor_id, branch_id, donated_at, volume_ml, hemoglobin_gdl, collected_by)
    ON donation TO bb_officer;
GRANT UPDATE (volume_ml, hemoglobin_gdl) ON donation TO bb_officer;

GRANT SELECT ON blood_unit TO bb_admin, bb_officer, bb_lab_tech, bb_auditor;
GRANT INSERT (donation_id, component, volume_ml, storage_location) ON blood_unit TO bb_officer;
GRANT UPDATE (status, storage_location) ON blood_unit TO bb_officer;

GRANT SELECT ON screening_result TO bb_lab_tech, bb_donor;                          -- donor: own rows via RLS
GRANT INSERT (donation_id, test_type, result, report, tested_by) ON screening_result TO bb_lab_tech;
GRANT UPDATE (result, report) ON screening_result TO bb_lab_tech;

-- 6) Requests, allocation, alerts, ledger -----------------------------------------------------------
GRANT SELECT ON blood_request TO bb_admin, bb_officer, bb_hospital, bb_auditor;
GRANT INSERT (hospital_id, requested_by, patient_ref, blood_group, component,
              units_needed, urgency, needed_by) ON blood_request TO bb_officer, bb_hospital;
GRANT UPDATE (status, urgency, needed_by) ON blood_request TO bb_officer;
GRANT UPDATE (status) ON blood_request TO bb_hospital;                              -- cancel own (RLS enforces)

GRANT SELECT ON request_allocation TO bb_admin, bb_officer, bb_hospital, bb_auditor;
GRANT INSERT (request_id, unit_id, allocated_by) ON request_allocation TO bb_officer;

GRANT SELECT ON donor_alert TO bb_admin, bb_officer, bb_donor, bb_auditor;
GRANT INSERT (request_id, donor_id, distance_km) ON donor_alert TO bb_officer;
GRANT UPDATE (response, responded_at) ON donor_alert TO bb_officer, bb_donor;

GRANT SELECT ON stock_movement TO bb_admin, bb_officer, bb_lab_tech, bb_auditor;    -- rows written by triggers

-- 7) Views and actions ----------------------------------------------------------------------------------
GRANT SELECT ON v_public_inventory TO bb_admin, bb_officer, bb_lab_tech, bb_hospital, bb_donor, bb_auditor;
GRANT SELECT ON v_inventory        TO bb_admin, bb_officer, bb_lab_tech, bb_auditor;
GRANT SELECT ON v_donor_eligibility TO bb_admin, bb_officer, bb_lab_tech, bb_donor, bb_auditor;
GRANT SELECT ON v_request_summary  TO bb_admin, bb_officer, bb_hospital, bb_auditor;

GRANT EXECUTE ON FUNCTION fn_allocate_fefo(int, int) TO bb_officer;
GRANT EXECUTE ON FUNCTION fn_expire_units()          TO bb_admin, bb_officer;

-- Smoke test: expect 12 rows (6 group roles + bb_app + bb_owner... see tests file for the real check)
SELECT count(*) AS granted_tables
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee LIKE 'bb\_%' AND grantee <> 'bb_owner';