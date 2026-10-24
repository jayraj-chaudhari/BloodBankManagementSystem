\set ON_ERROR_STOP on
\pset pager off
BEGIN;

-- run a count query as a DB role with an API-style context; -1 = permission denied / RLS violation
CREATE FUNCTION pg_temp.q(p_role text, p_sql text, p_user int DEFAULT NULL,
                          p_donor int DEFAULT NULL, p_hosp int DEFAULT NULL) RETURNS bigint
LANGUAGE plpgsql AS $$
DECLARE v bigint;
BEGIN
    PERFORM set_config('app.user_id',     coalesce(p_user::text,  ''), true),
            set_config('app.donor_id',    coalesce(p_donor::text, ''), true),
            set_config('app.hospital_id', coalesce(p_hosp::text,  ''), true);
    EXECUTE format('SET LOCAL ROLE %I', p_role);
    BEGIN
        EXECUTE p_sql INTO v;
    EXCEPTION WHEN insufficient_privilege THEN
        v := -1;
    END;
    RESET ROLE;
    RETURN v;
END $$;

CREATE FUNCTION pg_temp.chk(ok boolean, label text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    IF ok IS NOT TRUE THEN RAISE EXCEPTION 'TEST FAILED: %', label; END IF;
    RAISE NOTICE 'OK: %', label;
END $$;

DO $t$
DECLARE
    v_br int; v_h1 int; v_h2 int; v_off int; v_lab int; v_hu1 int; v_hu2 int; v_du1 int; v_du2 int;
    v_d1 int; v_d2 int; v_dn1 int; v_dn2 int; v_u1 int; v_r1 int; v_r2 int;
BEGIN
    -- fixtures (superuser bypasses RLS) ----------------------------------------
    INSERT INTO region VALUES ('SUR', 'Surat');
    INSERT INTO component_spec (component, shelf_life_days)
        VALUES ('WHOLE_BLOOD',35), ('RED_CELLS',42), ('PLASMA',365), ('PLATELETS',5);
    INSERT INTO role_def (role_name, db_role, clearance) VALUES
        ('admin','bb_admin',2), ('bb_officer','bb_officer',2), ('lab_tech','bb_lab_tech',3),
        ('hospital_user','bb_hospital',1), ('donor','bb_donor',1), ('auditor','bb_auditor',2);
    INSERT INTO branch (branch_name, region_code) VALUES ('B1', 'SUR') RETURNING branch_id INTO v_br;
    INSERT INTO hospital (hospital_name, region_code) VALUES ('H1', 'SUR') RETURNING hospital_id INTO v_h1;
    INSERT INTO hospital (hospital_name, region_code) VALUES ('H2', 'SUR') RETURNING hospital_id INTO v_h2;
    INSERT INTO app_user (email,password_hash,full_name,role_name,branch_id)
        VALUES ('o@x.test','x','Off','bb_officer',v_br) RETURNING user_id INTO v_off;
    INSERT INTO app_user (email,password_hash,full_name,role_name,branch_id)
        VALUES ('l@x.test','x','Lab','lab_tech',v_br) RETURNING user_id INTO v_lab;
    INSERT INTO app_user (email,password_hash,full_name,role_name,hospital_id)
        VALUES ('h1@x.test','x','Hosp1','hospital_user',v_h1) RETURNING user_id INTO v_hu1;
    INSERT INTO app_user (email,password_hash,full_name,role_name,hospital_id)
        VALUES ('h2@x.test','x','Hosp2','hospital_user',v_h2) RETURNING user_id INTO v_hu2;
    INSERT INTO app_user (email,password_hash,full_name,role_name)
        VALUES ('d1@x.test','x','Donor1','donor') RETURNING user_id INTO v_du1;
    INSERT INTO app_user (email,password_hash,full_name,role_name)
        VALUES ('d2@x.test','x','Donor2','donor') RETURNING user_id INTO v_du2;
    INSERT INTO donor (user_id,date_of_birth,gender,blood_group,weight_kg,region_code)
        VALUES (v_du1, (current_date - interval '30 years')::date, 'M', 'O+', 70, 'SUR') RETURNING donor_id INTO v_d1;
    INSERT INTO donor (user_id,date_of_birth,gender,blood_group,weight_kg,region_code)
        VALUES (v_du2, (current_date - interval '30 years')::date, 'F', 'A+', 60, 'SUR') RETURNING donor_id INTO v_d2;
    INSERT INTO donor_contact (donor_id, phone_enc) VALUES (v_d1, '\x00'), (v_d2, '\x00');
    INSERT INTO donation (donor_id,branch_id,donated_at,volume_ml,hemoglobin_gdl,collected_by)
        VALUES (v_d1, v_br, now() - interval '20 days', 350, 14.0, v_off) RETURNING donation_id INTO v_dn1;
    INSERT INTO donation (donor_id,branch_id,donated_at,volume_ml,hemoglobin_gdl,collected_by)
        VALUES (v_d2, v_br, now() - interval '20 days', 350, 14.0, v_off) RETURNING donation_id INTO v_dn2;
    INSERT INTO blood_unit (donation_id, component, volume_ml)
        VALUES (v_dn1, 'RED_CELLS', 300) RETURNING unit_id INTO v_u1;
    INSERT INTO screening_result (donation_id, test_type, result, tested_by)
        SELECT v_dn1, x.tt, 'NEGATIVE', v_lab FROM unnest(enum_range(NULL::test_type_t)) AS x(tt);
    INSERT INTO screening_result (donation_id, test_type, result, tested_by)
        VALUES (v_dn2, 'HIV', 'NEGATIVE', v_lab);
    INSERT INTO blood_request (hospital_id,requested_by,patient_ref,blood_group,component,units_needed)
        VALUES (v_h1, v_hu1, 'PT-1', 'B+', 'RED_CELLS', 1) RETURNING request_id INTO v_r1;
    INSERT INTO blood_request (hospital_id,requested_by,patient_ref,blood_group,component,units_needed)
        VALUES (v_h2, v_hu2, 'PT-2', 'A+', 'RED_CELLS', 1) RETURNING request_id INTO v_r2;
    INSERT INTO request_allocation (request_id, unit_id, allocated_by) VALUES (v_r1, v_u1, v_off);
    INSERT INTO donor_alert (request_id, donor_id) VALUES (v_r1, v_d1), (v_r1, v_d2);

    -- donor: own rows only ------------------------------------------------------
    PERFORM pg_temp.chk(pg_temp.q('bb_donor','SELECT count(*) FROM donor',v_du1,v_d1) = 1, 'donor: own donor row only');
    PERFORM pg_temp.chk(pg_temp.q('bb_donor','SELECT count(*) FROM donor_contact',v_du1,v_d1) = 1, 'donor: own contact row only');
    PERFORM pg_temp.chk(pg_temp.q('bb_donor','SELECT count(*) FROM screening_result',v_du1,v_d1) = 5, 'donor1: own 5 results');
    PERFORM pg_temp.chk(pg_temp.q('bb_donor','SELECT count(*) FROM screening_result',v_du2,v_d2) = 1, 'donor2: own 1 result');
    PERFORM pg_temp.chk(pg_temp.q('bb_donor','SELECT count(*) FROM donor_alert',v_du1,v_d1) = 1, 'donor: own alert only');
    PERFORM pg_temp.chk(pg_temp.q('bb_donor','SELECT count(*) FROM app_user',v_du1,v_d1) = 1, 'donor: own user row only');
    PERFORM pg_temp.chk(pg_temp.q('bb_donor','SELECT count(*) FROM donor') = 0, 'no context: zero rows');
    PERFORM pg_temp.chk(pg_temp.q('bb_donor','SELECT count(*) FROM blood_unit',v_du1,v_d1) = -1, 'donor: DAC denies units');

    -- hospital: own rows only -------------------------------------------------------
    PERFORM pg_temp.chk(pg_temp.q('bb_hospital','SELECT count(*) FROM blood_request',v_hu1,NULL,v_h1) = 1, 'hospital: own request only');
    PERFORM pg_temp.chk(pg_temp.q('bb_hospital','SELECT count(*) FROM v_request_summary',v_hu1,NULL,v_h1) = 1, 'hospital: request summary view is filtered');
    PERFORM pg_temp.chk(pg_temp.q('bb_hospital','SELECT count(*) FROM request_allocation',v_hu1,NULL,v_h1) = 1, 'hospital1: sees its allocation');
    PERFORM pg_temp.chk(pg_temp.q('bb_hospital','SELECT count(*) FROM request_allocation',v_hu2,NULL,v_h2) = 0, 'hospital2: sees none');
    PERFORM pg_temp.chk(pg_temp.q('bb_hospital','SELECT count(*) FROM hospital',v_hu1,NULL,v_h1) = 1, 'hospital: own hospital row only');
    PERFORM pg_temp.chk(pg_temp.q('bb_hospital','SELECT count(*) FROM donor',v_hu1,NULL,v_h1) = -1, 'hospital: DAC denies donors');
    PERFORM pg_temp.chk(pg_temp.q('bb_hospital','SELECT count(*) FROM v_public_inventory',v_hu1,NULL,v_h1) >= 0, 'hospital: reads public inventory');

    -- staff ---------------------------------------------------------------------------
    PERFORM pg_temp.chk(pg_temp.q('bb_officer','SELECT count(*) FROM donor') = 2, 'officer: all donors');
    PERFORM pg_temp.chk(pg_temp.q('bb_officer','SELECT count(*) FROM blood_request') = 2, 'officer: all requests');
    PERFORM pg_temp.chk(pg_temp.q('bb_officer','SELECT count(*) FROM donor_alert') = 2, 'officer: all alerts');
    PERFORM pg_temp.chk(pg_temp.q('bb_officer','SELECT count(*) FROM screening_result') = -1, 'officer: DAC denies screening');
    PERFORM pg_temp.chk(pg_temp.q('bb_lab_tech','SELECT count(*) FROM screening_result') = 6, 'lab: all screening rows (clearance 3)');
    PERFORM pg_temp.chk(pg_temp.q('bb_lab_tech', format($q$WITH u AS (UPDATE blood_unit SET status = 'DISCARDED' WHERE unit_id = %s RETURNING 1) SELECT count(*) FROM u$q$, v_u1)) = -1, 'lab: cannot change unit status');
    PERFORM pg_temp.chk(pg_temp.q('bb_auditor','SELECT count(*) FROM donation') = 2, 'auditor: reads donations');
    PERFORM pg_temp.chk(pg_temp.q('bb_auditor', $q$WITH i AS (INSERT INTO region VALUES ('XXX','x') RETURNING 1) SELECT count(*) FROM i$q$) = -1, 'auditor: read-only');
    PERFORM pg_temp.chk(pg_temp.q('bb_owner','SELECT count(*) FROM donor') = 2, 'owner policy: triggers can see everything');
    PERFORM pg_temp.chk(pg_temp.q('bb_app', $q$SELECT count(*) FROM fn_auth_lookup('o@x.test')$q$) = 1, 'bb_app: login lookup works');
    PERFORM pg_temp.chk(pg_temp.q('bb_app','SELECT count(*) FROM app_user') = -1, 'bb_app: no direct table access');

    -- MAC demo: DAC grant exists but clearance 2 < classification 3 ------------------------
    GRANT SELECT ON screening_result TO bb_officer;
    PERFORM pg_temp.chk(pg_temp.q('bb_officer','SELECT count(*) FROM screening_result') = 0, 'MAC: officer (2) sees 0 level-3 rows');

    -- hospital writes (last, because they change counts) -------------------------------------
    PERFORM pg_temp.chk(pg_temp.q('bb_hospital', format($q$WITH u AS (UPDATE blood_request SET status = 'CANCELLED' WHERE request_id = %s RETURNING 1) SELECT count(*) FROM u$q$, v_r1), v_hu1,NULL,v_h1) = 0, 'hospital: cannot cancel a fulfilled request');
    PERFORM pg_temp.chk(pg_temp.q('bb_hospital', format($q$WITH u AS (UPDATE blood_request SET status = 'CANCELLED' WHERE request_id = %s RETURNING 1) SELECT count(*) FROM u$q$, v_r2), v_hu1,NULL,v_h1) = 0, 'hospital: cannot touch another hospital''s request');
    PERFORM pg_temp.chk(pg_temp.q('bb_hospital', format($q$WITH u AS (UPDATE blood_request SET status = 'FULFILLED' WHERE request_id = %s RETURNING 1) SELECT count(*) FROM u$q$, v_r2), v_hu2,NULL,v_h2) = -1, 'hospital: cannot self-fulfil');
    PERFORM pg_temp.chk(pg_temp.q('bb_hospital', format($q$WITH u AS (UPDATE blood_request SET status = 'CANCELLED' WHERE request_id = %s RETURNING 1) SELECT count(*) FROM u$q$, v_r2), v_hu2,NULL,v_h2) = 1, 'hospital: cancels its own pending request');
    PERFORM pg_temp.chk(pg_temp.q('bb_hospital', format($q$WITH i AS (INSERT INTO blood_request (hospital_id,requested_by,patient_ref,blood_group,component,units_needed) VALUES (%s,%s,'P','B+','RED_CELLS',1) RETURNING 1) SELECT count(*) FROM i$q$, v_h2, v_hu1), v_hu1,NULL,v_h1) = -1, 'hospital: cannot create a request for another hospital');
    PERFORM pg_temp.chk(pg_temp.q('bb_hospital', format($q$WITH i AS (INSERT INTO blood_request (hospital_id,requested_by,patient_ref,blood_group,component,units_needed) VALUES (%s,%s,'P','B+','RED_CELLS',1) RETURNING 1) SELECT count(*) FROM i$q$, v_h1, v_hu1), v_hu1,NULL,v_h1) = 1, 'hospital: creates its own request');

    RAISE NOTICE 'ALL TESTS PASSED';
END
$t$;

ROLLBACK;
