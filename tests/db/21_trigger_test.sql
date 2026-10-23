\set ON_ERROR_STOP on
\pset pager off
BEGIN;

CREATE FUNCTION pg_temp.expect_error(p_sql text, p_prefix text, p_label text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    BEGIN
        EXECUTE p_sql;
        RAISE EXCEPTION 'TEST FAILED: % (no error raised)', p_label;
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM NOT LIKE p_prefix || '%' THEN RAISE; END IF;
        RAISE NOTICE 'OK: % -> %', p_label, SQLERRM;
    END;
END $$;

CREATE FUNCTION pg_temp.assert(p_ok boolean, p_label text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    IF p_ok IS NOT TRUE THEN RAISE EXCEPTION 'TEST FAILED: %', p_label; END IF;
    RAISE NOTICE 'OK: %', p_label;
END $$;

DO $$
DECLARE
    v_branch int; v_hospital int;
    v_off int; v_lab int; v_hosp int; v_usr_m int; v_usr_f int; v_usr_y int;
    v_dm int; v_df int;
    dn_m1 int; dn_m2 int; dn_m3 int; dn_f1 int; dn_f2 int; dn_f3 int;
    un_m1 int; un_m2 int; un_m3 int; un_f3 int;
    v_r1 int; v_r2 int; v_r3 int; v_r4 int;
    v_donated timestamptz;
    v_don text := 'INSERT INTO donation (donor_id,branch_id,donated_at,volume_ml,hemoglobin_gdl,collected_by) VALUES (%s,%s, now() - interval ''%s days'',350,14.0,%s)';
    v_alloc text := 'INSERT INTO request_allocation (request_id, unit_id, allocated_by) VALUES (%s,%s,%s)';
BEGIN
    -- fixtures ---------------------------------------------------------
    INSERT INTO region VALUES ('SUR', 'Surat');
    INSERT INTO component_spec (component, shelf_life_days)
        VALUES ('WHOLE_BLOOD',35), ('RED_CELLS',42), ('PLASMA',365), ('PLATELETS',5);
    INSERT INTO role_def (role_name, db_role, clearance)
        VALUES ('bb_officer','bb_officer',2), ('lab_tech','bb_lab_tech',3),
               ('donor','bb_donor',1), ('hospital_user','bb_hospital',1);
    INSERT INTO branch (branch_name, region_code) VALUES ('T Branch','SUR') RETURNING branch_id INTO v_branch;
    INSERT INTO hospital (hospital_name, region_code) VALUES ('T Hospital','SUR') RETURNING hospital_id INTO v_hospital;
    INSERT INTO app_user (email,password_hash,full_name,role_name,branch_id)
        VALUES ('t.off@x.test','x','T Officer','bb_officer',v_branch) RETURNING user_id INTO v_off;
    INSERT INTO app_user (email,password_hash,full_name,role_name,branch_id)
        VALUES ('t.lab@x.test','x','T Lab','lab_tech',v_branch) RETURNING user_id INTO v_lab;
    INSERT INTO app_user (email,password_hash,full_name,role_name,hospital_id)
        VALUES ('t.hosp@x.test','x','T Hosp','hospital_user',v_hospital) RETURNING user_id INTO v_hosp;
    INSERT INTO app_user (email,password_hash,full_name,role_name)
        VALUES ('t.m@x.test','x','T Male','donor') RETURNING user_id INTO v_usr_m;
    INSERT INTO app_user (email,password_hash,full_name,role_name)
        VALUES ('t.f@x.test','x','T Female','donor') RETURNING user_id INTO v_usr_f;
    INSERT INTO app_user (email,password_hash,full_name,role_name)
        VALUES ('t.y@x.test','x','T Young','donor') RETURNING user_id INTO v_usr_y;

    INSERT INTO donor (user_id,date_of_birth,gender,blood_group,weight_kg,region_code)
        VALUES (v_usr_m, (current_date - interval '30 years')::date, 'M', 'O+', 70, 'SUR') RETURNING donor_id INTO v_dm;
    INSERT INTO donor (user_id,date_of_birth,gender,blood_group,weight_kg,region_code)
        VALUES (v_usr_f, (current_date - interval '28 years')::date, 'F', 'AB+', 55, 'SUR') RETURNING donor_id INTO v_df;

    -- 1) age ---------------------------------------------------------------
    PERFORM pg_temp.expect_error(format(
        'INSERT INTO donor (user_id,date_of_birth,gender,blood_group,weight_kg,region_code) VALUES (%s, ''%s'', ''M'',''O+'',60,''SUR'')',
        v_usr_y, (current_date - interval '10 years')::date),
        'DONOR_NOT_ELIGIBLE', 'under-age donor rejected');

    -- 2) donation gap rules ----------------------------------------------------
    INSERT INTO donation (donor_id,branch_id,donated_at,volume_ml,hemoglobin_gdl,collected_by)
        VALUES (v_dm, v_branch, now() - interval '200 days', 350, 14.0, v_off) RETURNING donation_id INTO dn_m1;
    PERFORM pg_temp.expect_error(format(v_don, v_dm, v_branch, 150, v_off),
        'DONATION_TOO_SOON', 'male: 50 days after previous donation rejected');
    PERFORM pg_temp.expect_error(format(v_don, v_dm, v_branch, 250, v_off),
        'DONATION_TOO_SOON', 'male: 50 days BEFORE an existing donation rejected');
    INSERT INTO donation (donor_id,branch_id,donated_at,volume_ml,hemoglobin_gdl,collected_by)
        VALUES (v_dm, v_branch, now() - interval '100 days', 350, 14.0, v_off) RETURNING donation_id INTO dn_m2;
    INSERT INTO donation (donor_id,branch_id,donated_at,volume_ml,hemoglobin_gdl,collected_by)
        VALUES (v_dm, v_branch, now() - interval '5 days', 350, 14.0, v_off) RETURNING donation_id INTO dn_m3;

    INSERT INTO donation (donor_id,branch_id,donated_at,volume_ml,hemoglobin_gdl,collected_by)
        VALUES (v_df, v_branch, now() - interval '420 days', 350, 14.0, v_off) RETURNING donation_id INTO dn_f1;
    PERFORM pg_temp.expect_error(format(v_don, v_df, v_branch, 330, v_off),
        'DONATION_TOO_SOON', 'female: 90-day gap rejected (needs 120)');
    INSERT INTO donation (donor_id,branch_id,donated_at,volume_ml,hemoglobin_gdl,collected_by)
        VALUES (v_df, v_branch, now() - interval '250 days', 350, 14.0, v_off) RETURNING donation_id INTO dn_f2;
    INSERT INTO donation (donor_id,branch_id,donated_at,volume_ml,hemoglobin_gdl,collected_by)
        VALUES (v_df, v_branch, now() - interval '10 days', 350, 14.0, v_off) RETURNING donation_id INTO dn_f3;

    -- 3) units: expiry, code, status, ledger ---------------------------------------
    INSERT INTO blood_unit (donation_id, component, volume_ml) VALUES (dn_m1,'RED_CELLS',300) RETURNING unit_id INTO un_m1;
    INSERT INTO blood_unit (donation_id, component, volume_ml) VALUES (dn_m2,'RED_CELLS',300) RETURNING unit_id INTO un_m2;
    INSERT INTO blood_unit (donation_id, component, volume_ml) VALUES (dn_m3,'RED_CELLS',300) RETURNING unit_id INTO un_m3;
    INSERT INTO blood_unit (donation_id, component, volume_ml) VALUES (dn_f3,'RED_CELLS',300) RETURNING unit_id INTO un_f3;

    SELECT donated_at INTO v_donated FROM donation WHERE donation_id = dn_m1;
    PERFORM pg_temp.assert((SELECT expires_on FROM blood_unit WHERE unit_id = un_m1)
        = (v_donated AT TIME ZONE 'Asia/Kolkata')::date + 42, 'RED_CELLS expiry = donation date + 42 days');
    PERFORM pg_temp.assert((SELECT unit_code FROM blood_unit WHERE unit_id = un_m1) ~ '^SUR-[0-9]{8}-[0-9]{4,}$',
        'unit_code generated');
    PERFORM pg_temp.assert((SELECT status FROM blood_unit WHERE unit_id = un_m1) = 'QUARANTINE',
        'new unit starts in QUARANTINE');
    PERFORM pg_temp.assert((SELECT count(*) FROM stock_movement WHERE unit_id = un_m1 AND movement_type = 'COLLECTED') = 1,
        'COLLECTED movement logged');

    -- 4) screening -------------------------------------------------------------------
    INSERT INTO screening_result (donation_id, test_type, result, tested_by)
        SELECT dn_m1, x.tt, 'NEGATIVE', v_lab FROM unnest(enum_range(NULL::test_type_t)) AS x(tt)
         WHERE x.tt <> 'MALARIA';
    PERFORM pg_temp.assert((SELECT status FROM blood_unit WHERE unit_id = un_m1) = 'QUARANTINE',
        '4 of 5 negative tests: unit still QUARANTINE');
    INSERT INTO screening_result (donation_id, test_type, result, tested_by)
        VALUES (dn_m1, 'MALARIA', 'NEGATIVE', v_lab);
    PERFORM pg_temp.assert((SELECT status FROM blood_unit WHERE unit_id = un_m1) = 'AVAILABLE',
        'all 5 negative: unit AVAILABLE');
    PERFORM pg_temp.assert((SELECT count(*) FROM stock_movement WHERE unit_id = un_m1) = 2,
        'ledger now has COLLECTED + RELEASED');

    INSERT INTO screening_result (donation_id, test_type, result, tested_by)
        VALUES (dn_m2, 'HIV', 'POSITIVE', v_lab);
    PERFORM pg_temp.assert((SELECT status FROM blood_unit WHERE unit_id = un_m2) = 'DISCARDED',
        'positive HIV: unit DISCARDED');
    PERFORM pg_temp.expect_error(format('UPDATE blood_unit SET status = ''AVAILABLE'' WHERE unit_id = %s', un_m2),
        'INVALID_STATUS_CHANGE', 'DISCARDED unit cannot be revived');

    INSERT INTO screening_result (donation_id, test_type, result, tested_by)
        SELECT dn_m3, x.tt, 'NEGATIVE', v_lab FROM unnest(enum_range(NULL::test_type_t)) AS x(tt);
    INSERT INTO screening_result (donation_id, test_type, result, tested_by)
        SELECT dn_f3, x.tt, 'NEGATIVE', v_lab FROM unnest(enum_range(NULL::test_type_t)) AS x(tt);

    -- 5) allocation ------------------------------------------------------------------------
    INSERT INTO blood_request (hospital_id, requested_by, patient_ref, blood_group, component, units_needed)
        VALUES (v_hospital, v_hosp, 'PT-1', 'B+',  'RED_CELLS', 1) RETURNING request_id INTO v_r1;
    INSERT INTO blood_request (hospital_id, requested_by, patient_ref, blood_group, component, units_needed)
        VALUES (v_hospital, v_hosp, 'PT-2', 'A-',  'RED_CELLS', 1) RETURNING request_id INTO v_r2;
    INSERT INTO blood_request (hospital_id, requested_by, patient_ref, blood_group, component, units_needed)
        VALUES (v_hospital, v_hosp, 'PT-3', 'AB+', 'PLATELETS', 1) RETURNING request_id INTO v_r3;
    INSERT INTO blood_request (hospital_id, requested_by, patient_ref, blood_group, component, units_needed)
        VALUES (v_hospital, v_hosp, 'PT-4', 'AB+', 'RED_CELLS', 2) RETURNING request_id INTO v_r4;

    PERFORM pg_temp.expect_error(format(v_alloc, v_r1, un_m1, v_off),
        'UNIT_NOT_AVAILABLE', 'expired AVAILABLE unit refused');

    INSERT INTO request_allocation (request_id, unit_id, allocated_by) VALUES (v_r1, un_m3, v_off);
    PERFORM pg_temp.assert((SELECT status FROM blood_unit WHERE unit_id = un_m3) = 'RESERVED',
        'allocated unit becomes RESERVED');
    PERFORM pg_temp.assert((SELECT status FROM blood_request WHERE request_id = v_r1) = 'FULFILLED',
        'request with all units allocated is FULFILLED');
    PERFORM pg_temp.assert((SELECT count(*) FROM stock_movement_sur WHERE unit_id = un_m3) = 3,
        'ledger rows for the unit landed in the SUR partition (COLLECTED, RELEASED, RESERVED)');

    PERFORM pg_temp.expect_error(format(v_alloc, v_r1, un_m3, v_off),
        'UNIT_NOT_AVAILABLE', 'same unit cannot be allocated twice');
    PERFORM pg_temp.expect_error(format(v_alloc, v_r1, un_f3, v_off),
        'REQUEST_CLOSED', 'fulfilled request accepts no more units');
    PERFORM pg_temp.expect_error(format(v_alloc, v_r2, un_f3, v_off),
        'INCOMPATIBLE_GROUP', 'AB+ red cells refused for an A- recipient');
    PERFORM pg_temp.expect_error(format(v_alloc, v_r3, un_f3, v_off),
        'COMPONENT_MISMATCH', 'red cells refused for a platelet request');

    INSERT INTO request_allocation (request_id, unit_id, allocated_by) VALUES (v_r4, un_f3, v_off);
    PERFORM pg_temp.assert((SELECT status FROM blood_request WHERE request_id = v_r4) = 'PARTIAL',
        '1 of 2 units allocated: request is PARTIAL');

    RAISE NOTICE 'ALL TESTS PASSED';
END
$$;

ROLLBACK;