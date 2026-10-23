\set ON_ERROR_STOP on
\pset pager off
BEGIN;

CREATE TEMP TABLE t_fx (branch_id int, off_id int, lab_id int);
CREATE TEMP SEQUENCE t_seq;

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

-- creates donor + donation + RED_CELLS unit + 5 negative tests => AVAILABLE unit
CREATE FUNCTION pg_temp.mk_unit(p_group blood_group_t, p_days_ago int) RETURNS int
LANGUAGE plpgsql AS $$
DECLARE
    n bigint := nextval('t_seq');
    fx record; v_u int; v_d int; v_don int; v_unit int;
BEGIN
    SELECT * INTO fx FROM t_fx;
    INSERT INTO app_user (email, password_hash, full_name, role_name)
        VALUES ('t' || n || '@x.test', 'x', 'T Donor ' || n, 'donor') RETURNING user_id INTO v_u;
    INSERT INTO donor (user_id, date_of_birth, gender, blood_group, weight_kg, region_code)
        VALUES (v_u, (current_date - interval '30 years')::date, 'M', p_group, 70, 'SUR')
        RETURNING donor_id INTO v_d;
    INSERT INTO donation (donor_id, branch_id, donated_at, volume_ml, hemoglobin_gdl, collected_by)
        VALUES (v_d, fx.branch_id, now() - make_interval(days => p_days_ago), 350, 14.0, fx.off_id)
        RETURNING donation_id INTO v_don;
    INSERT INTO blood_unit (donation_id, component, volume_ml)
        VALUES (v_don, 'RED_CELLS', 300) RETURNING unit_id INTO v_unit;
    INSERT INTO screening_result (donation_id, test_type, result, tested_by)
        SELECT v_don, x.tt, 'NEGATIVE', fx.lab_id FROM unnest(enum_range(NULL::test_type_t)) AS x(tt);
    RETURN v_unit;
END $$;

DO $test$
DECLARE
    v_branch int; v_off int; v_lab int; v_hospital int; v_hosp int;
    v_res  jsonb;
    v_hash text := '$2a$10$' || repeat('a', 53);
    v_reg  text := 'SELECT fn_register_donor(%L, %L, ''Dup'', %L::date, ''M'', ''O+'', 60, ''SUR'', NULL, NULL, %L)';
    v_dob  text := (current_date - interval '25 years')::date::text;
    u1 int; u2 int; u3 int; u4 int; u5 int; u6 int;
    r1 int; r2 int; r3 int; r4 int;
    v_n int;
BEGIN
    -- fixtures -----------------------------------------------------------------
    INSERT INTO region VALUES ('SUR', 'Surat');
    INSERT INTO component_spec (component, shelf_life_days)
        VALUES ('WHOLE_BLOOD',35), ('RED_CELLS',42), ('PLASMA',365), ('PLATELETS',5);
    INSERT INTO role_def (role_name, db_role, clearance)
        VALUES ('bb_officer','bb_officer',2), ('lab_tech','bb_lab_tech',3),
               ('donor','bb_donor',1), ('hospital_user','bb_hospital',1);
    INSERT INTO branch (branch_name, region_code) VALUES ('T Branch', 'SUR') RETURNING branch_id INTO v_branch;
    INSERT INTO hospital (hospital_name, region_code) VALUES ('T Hospital', 'SUR') RETURNING hospital_id INTO v_hospital;
    INSERT INTO app_user (email, password_hash, full_name, role_name, branch_id)
        VALUES ('t.off@x.test', 'x', 'T Officer', 'bb_officer', v_branch) RETURNING user_id INTO v_off;
    INSERT INTO app_user (email, password_hash, full_name, role_name, branch_id)
        VALUES ('t.lab@x.test', 'x', 'T Lab', 'lab_tech', v_branch) RETURNING user_id INTO v_lab;
    INSERT INTO app_user (email, password_hash, full_name, role_name, hospital_id)
        VALUES ('t.hosp@x.test', 'x', 'T Hosp', 'hospital_user', v_hospital) RETURNING user_id INTO v_hosp;
    INSERT INTO t_fx VALUES (v_branch, v_off, v_lab);

    -- fn_register_donor ---------------------------------------------------------
    PERFORM set_config('app.enc_key', 'test_key_1234567890', true);
    v_res := fn_register_donor('New.Donor@X.test', v_hash, 'New Donor', v_dob::date, 'F', 'A+',
                               58.5, 'SUR', 21.17, 72.83, '9876543210', '12 MG Road');
    PERFORM pg_temp.assert((SELECT email FROM app_user WHERE user_id = (v_res->>'user_id')::int)
                           = 'new.donor@x.test', 'registration: email normalised to lowercase');
    PERFORM pg_temp.assert((SELECT role_name FROM app_user WHERE user_id = (v_res->>'user_id')::int)
                           = 'donor', 'registration: role is donor');
    PERFORM pg_temp.assert(fn_decrypt_text((SELECT phone_enc FROM donor_contact
                           WHERE donor_id = (v_res->>'donor_id')::int)) = '9876543210',
                           'registration: phone stored encrypted and decrypts correctly');
    PERFORM pg_temp.assert((SELECT phone_enc FROM donor_contact WHERE donor_id = (v_res->>'donor_id')::int)
                           <> '9876543210'::bytea, 'registration: ciphertext differs from plaintext');

    PERFORM pg_temp.expect_error(format(v_reg, 'NEW.DONOR@x.test', v_hash, v_dob, '9876543211'),
        'EMAIL_TAKEN', 'duplicate email rejected (case-insensitive)');
    PERFORM pg_temp.expect_error(format(v_reg, 'a1@x.test', v_hash, v_dob, '12345'),
        'VALIDATION_ERROR', 'bad phone rejected');
    PERFORM pg_temp.expect_error(format(v_reg, 'a2@x.test', 'password123', v_dob, '9876543212'),
        'VALIDATION_ERROR', 'plaintext password rejected (must be a bcrypt hash)');
    PERFORM pg_temp.expect_error(format(v_reg, 'a3@x.test', v_hash,
        (current_date - interval '10 years')::date::text, '9876543213'),
        'DONOR_NOT_ELIGIBLE', 'under-age registration rejected');
    PERFORM set_config('app.enc_key', '', true);
    PERFORM pg_temp.expect_error(format(v_reg, 'a4@x.test', v_hash, v_dob, '9876543214'),
        'ENCRYPTION_KEY_MISSING', 'registration refused without an encryption key');

    -- fn_allocate_fefo ----------------------------------------------------------
    u1 := pg_temp.mk_unit('O-', 20);
    u2 := pg_temp.mk_unit('B+', 10);
    u3 := pg_temp.mk_unit('B+', 30);   -- earliest expiry among B+
    u4 := pg_temp.mk_unit('A+', 35);   -- incompatible with a B+ recipient
    u5 := pg_temp.mk_unit('O+', 25);   -- expires before u1
    u6 := pg_temp.mk_unit('O-', 60);   -- already expired (42-day shelf life)

    INSERT INTO blood_request (hospital_id, requested_by, patient_ref, blood_group, component, units_needed)
        VALUES (v_hospital, v_hosp, 'PT-1', 'B+', 'RED_CELLS', 2) RETURNING request_id INTO r1;
    INSERT INTO blood_request (hospital_id, requested_by, patient_ref, blood_group, component, units_needed)
        VALUES (v_hospital, v_hosp, 'PT-2', 'B+', 'RED_CELLS', 1) RETURNING request_id INTO r2;
    INSERT INTO blood_request (hospital_id, requested_by, patient_ref, blood_group, component, units_needed)
        VALUES (v_hospital, v_hosp, 'PT-3', 'B+', 'RED_CELLS', 2) RETURNING request_id INTO r3;
    INSERT INTO blood_request (hospital_id, requested_by, patient_ref, blood_group, component, units_needed)
        VALUES (v_hospital, v_hosp, 'PT-4', 'B+', 'RED_CELLS', 1) RETURNING request_id INTO r4;

    v_n := fn_allocate_fefo(r1, v_off);
    PERFORM pg_temp.assert(v_n = 2, 'R1: two units allocated');
    PERFORM pg_temp.assert((SELECT array_agg(unit_id ORDER BY unit_id) FROM request_allocation
                            WHERE request_id = r1) = ARRAY[u2, u3], 'R1: exact-group B+ units chosen first');
    PERFORM pg_temp.assert((SELECT status FROM blood_request WHERE request_id = r1) = 'FULFILLED',
                           'R1: request FULFILLED');

    v_n := fn_allocate_fefo(r2, v_off);
    PERFORM pg_temp.assert(v_n = 1 AND (SELECT unit_id FROM request_allocation WHERE request_id = r2) = u5,
        'R2: earliest expiry (O+) beats later one (O-); the expired unit is skipped');

    v_n := fn_allocate_fefo(r3, v_off);
    PERFORM pg_temp.assert(v_n = 1 AND (SELECT unit_id FROM request_allocation WHERE request_id = r3) = u1,
        'R3: only one compatible unit left, so a partial allocation is returned');
    PERFORM pg_temp.assert((SELECT status FROM blood_request WHERE request_id = r3) = 'PARTIAL',
                           'R3: request is PARTIAL');

    PERFORM pg_temp.expect_error(format('SELECT fn_allocate_fefo(%s, %s)', r4, v_off),
        'INSUFFICIENT_STOCK', 'no compatible stock left');
    PERFORM pg_temp.expect_error(format('SELECT fn_allocate_fefo(%s, %s)', r1, v_off),
        'REQUEST_CLOSED', 'fulfilled request refused');
    PERFORM pg_temp.expect_error(format('SELECT fn_allocate_fefo(999999, %s)', v_off),
        'NOT_FOUND', 'unknown request refused');
    PERFORM pg_temp.assert((SELECT status FROM blood_unit WHERE unit_id = u4) = 'AVAILABLE',
                           'incompatible A+ unit left untouched');

    PERFORM set_config('app.user_id', '999999', true);
    PERFORM pg_temp.expect_error(format('SELECT fn_allocate_fefo(%s, %s)', r4, v_off),
        'FORBIDDEN', 'user_id that differs from the logged-in user refused');
    PERFORM set_config('app.user_id', '', true);

    -- fn_expire_units -----------------------------------------------------------
    v_n := fn_expire_units();
    PERFORM pg_temp.assert(v_n >= 1, 'expiry sweep changed at least one unit');
    PERFORM pg_temp.assert((SELECT status FROM blood_unit WHERE unit_id = u6) = 'EXPIRED',
                           'expired unit is now EXPIRED');
    PERFORM pg_temp.assert((SELECT count(*) FROM stock_movement
                            WHERE unit_id = u6 AND movement_type = 'EXPIRED') = 1,
                           'EXPIRED movement written to the ledger');
    PERFORM pg_temp.assert((SELECT status FROM blood_unit WHERE unit_id = u5) = 'RESERVED',
                           'unexpired reserved unit untouched');
    PERFORM pg_temp.assert(fn_expire_units() = 0, 'second sweep finds nothing');

    RAISE NOTICE 'ALL TESTS PASSED';
END
$test$;

ROLLBACK;