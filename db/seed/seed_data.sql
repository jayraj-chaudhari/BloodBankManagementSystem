-- ============================================================
-- db/seed/seed_data.sql
-- Run as bb_owner AFTER 60_lookups.sql:
--   psql "postgresql://bb_owner:owner_pw@localhost:5432/bloodbank" -f db/seed/seed_data.sql
-- ============================================================
\set ON_ERROR_STOP on
\pset pager off

-- Set encryption key for pgcrypto session
SELECT set_config('app.enc_key', 'default_32_character_encryption_secret_key!', false);

-- 1) Branches (Regional Hub + 4 Local Centres)
INSERT INTO branch (branch_name, region_code, parent_branch_id, address, latitude, longitude) VALUES
    ('Surat Central Hub',       'SUR', NULL, ROW('Ring Road', 'Surat', 'Gujarat', '395001')::address_t, 21.170240, 72.831061)
ON CONFLICT (branch_name) DO NOTHING;

INSERT INTO branch (branch_name, region_code, parent_branch_id, address, latitude, longitude) VALUES
    ('Ahmedabad Civil Branch',  'AHM', (SELECT branch_id FROM branch WHERE branch_name = 'Surat Central Hub'), ROW('Asarwa', 'Ahmedabad', 'Gujarat', '380016')::address_t, 23.022505, 72.571362),
    ('Vadodara City Centre',    'VAD', (SELECT branch_id FROM branch WHERE branch_name = 'Surat Central Hub'), ROW('Sayajigunj', 'Vadodara', 'Gujarat', '390005')::address_t, 22.307159, 73.181219),
    ('Rajkot Regional Branch',  'RAJ', (SELECT branch_id FROM branch WHERE branch_name = 'Surat Central Hub'), ROW('Kotecha Chowk', 'Rajkot', 'Gujarat', '360001')::address_t, 22.303894, 70.802160),
    ('Surat Adajan Centre',     'SUR', (SELECT branch_id FROM branch WHERE branch_name = 'Surat Central Hub'), ROW('Adajan Gam', 'Surat', 'Gujarat', '395009')::address_t, 21.195900, 72.793300)
ON CONFLICT (branch_name) DO NOTHING;

-- 2) Hospitals
INSERT INTO hospital (hospital_name, region_code, address, phone, latitude, longitude, is_verified) VALUES
    ('Surat New Civil Hospital',         'SUR', ROW('Majura Gate', 'Surat', 'Gujarat', '395001')::address_t, '9825000001', 21.1750, 72.8200, true),
    ('Kiran Multispeciality Hospital',   'SUR', ROW('Katargam', 'Surat', 'Gujarat', '395004')::address_t,    '9825000002', 21.2180, 72.8450, true),
    ('Ahmedabad Civil Hospital',         'AHM', ROW('Asarwa', 'Ahmedabad', 'Gujarat', '380016')::address_t,  '9825000003', 23.0530, 72.6020, true),
    ('Apollo Hospitals Ahmedabad',       'AHM', ROW('Bhat', 'Gandhinagar', 'Gujarat', '382428')::address_t,  '9825000004', 23.0970, 72.5930, true),
    ('SSG Hospital Vadodara',            'VAD', ROW('Jail Road', 'Vadodara', 'Gujarat', '390001')::address_t, '9825000005', 22.3030, 73.1900, true),
    ('Sterling Hospital Vadodara',       'VAD', ROW('Race Course', 'Vadodara', 'Gujarat', '390007')::address_t,'9825000006', 22.3160, 73.1490, true),
    ('PDU Government Hospital Rajkot',   'RAJ', ROW('Hospital Chowk', 'Rajkot', 'Gujarat', '360001')::address_t,'9825000007', 22.2980, 70.8010, true),
    ('Wockhardt Hospital Rajkot',        'RAJ', ROW('Kalawad Road', 'Rajkot', 'Gujarat', '360007')::address_t,'9825000008', 22.2880, 70.7810, true)
ON CONFLICT (hospital_name, region_code) DO NOTHING;

-- 3) Demo Staff Accounts (Password for all: Test@1234 -> $2a$10$HTZ2nTOWcPwKUSfPAqUMB.EamOtziiyQrhxFOJs7/l36wQXj27NA.)
INSERT INTO app_user (email, password_hash, full_name, role_name, branch_id, hospital_id, is_active) VALUES
    ('admin@bb.test',    '$2a$10$HTZ2nTOWcPwKUSfPAqUMB.EamOtziiyQrhxFOJs7/l36wQXj27NA.', 'Asha Patel', 'admin', NULL, NULL, true),
    ('officer@bb.test',  '$2a$10$HTZ2nTOWcPwKUSfPAqUMB.EamOtziiyQrhxFOJs7/l36wQXj27NA.', 'Raman Joshi', 'bb_officer', (SELECT branch_id FROM branch WHERE branch_name = 'Surat Central Hub'), NULL, true),
    ('lab@bb.test',      '$2a$10$HTZ2nTOWcPwKUSfPAqUMB.EamOtziiyQrhxFOJs7/l36wQXj27NA.', 'Dr. Suresh Mehta', 'lab_tech', (SELECT branch_id FROM branch WHERE branch_name = 'Surat Central Hub'), NULL, true),
    ('hospital@bb.test', '$2a$10$HTZ2nTOWcPwKUSfPAqUMB.EamOtziiyQrhxFOJs7/l36wQXj27NA.', 'Surat Civil Desk', 'hospital_user', NULL, (SELECT hospital_id FROM hospital WHERE hospital_name = 'Surat New Civil Hospital'), true),
    ('auditor@bb.test',  '$2a$10$HTZ2nTOWcPwKUSfPAqUMB.EamOtziiyQrhxFOJs7/l36wQXj27NA.', 'Priya Desai', 'auditor', NULL, NULL, true)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- 4) Primary Demo Donor (donor1@bb.test)
INSERT INTO app_user (email, password_hash, full_name, role_name) VALUES
    ('donor1@bb.test', '$2a$10$HTZ2nTOWcPwKUSfPAqUMB.EamOtziiyQrhxFOJs7/l36wQXj27NA.', 'Rajesh Kumar', 'donor')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

INSERT INTO donor (user_id, date_of_birth, gender, blood_group, weight_kg, region_code, latitude, longitude, is_available) VALUES
    ((SELECT user_id FROM app_user WHERE email = 'donor1@bb.test'), '1995-04-12', 'M', 'O+', 68.5, 'SUR', 21.1702, 72.8310, true)
ON CONFLICT (user_id) DO UPDATE SET blood_group = EXCLUDED.blood_group;

INSERT INTO donor_contact (donor_id, phone_enc, email_enc, address_enc) VALUES
    ((SELECT donor_id FROM donor WHERE user_id = (SELECT user_id FROM app_user WHERE email = 'donor1@bb.test')),
     fn_encrypt_text('9876543210'),
     fn_encrypt_text('donor1@bb.test'),
     fn_encrypt_text('12 Ring Road, Surat'))
ON CONFLICT (donor_id) DO NOTHING;

-- 5) Secondary Donors
DO $$
DECLARE
    v_uid int;
    v_did int;
BEGIN
    -- Donor 2: B+ Female
    INSERT INTO app_user (email, password_hash, full_name, role_name)
    VALUES ('donor2@bb.test', '$2a$10$HTZ2nTOWcPwKUSfPAqUMB.EamOtziiyQrhxFOJs7/l36wQXj27NA.', 'Ananya Sharma', 'donor')
    ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name RETURNING user_id INTO v_uid;

    INSERT INTO donor (user_id, date_of_birth, gender, blood_group, weight_kg, region_code, latitude, longitude, is_available)
    VALUES (v_uid, '1998-09-22', 'F', 'B+', 56.0, 'AHM', 23.0225, 72.5714, true)
    ON CONFLICT (user_id) DO NOTHING RETURNING donor_id INTO v_did;

    IF v_did IS NOT NULL THEN
        INSERT INTO donor_contact (donor_id, phone_enc, email_enc, address_enc)
        VALUES (v_did, fn_encrypt_text('9825012345'), fn_encrypt_text('donor2@bb.test'), fn_encrypt_text('Satellite, Ahmedabad'))
        ON CONFLICT DO NOTHING;
    END IF;

    -- Donor 3: A- Male (Universal Platelet/Plasma source)
    INSERT INTO app_user (email, password_hash, full_name, role_name)
    VALUES ('donor3@bb.test', '$2a$10$HTZ2nTOWcPwKUSfPAqUMB.EamOtziiyQrhxFOJs7/l36wQXj27NA.', 'Vikram Solanki', 'donor')
    ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name RETURNING user_id INTO v_uid;

    INSERT INTO donor (user_id, date_of_birth, gender, blood_group, weight_kg, region_code, latitude, longitude, is_available)
    VALUES (v_uid, '1992-11-15', 'M', 'A-', 72.0, 'VAD', 22.3072, 73.1812, true)
    ON CONFLICT (user_id) DO NOTHING RETURNING donor_id INTO v_did;

    IF v_did IS NOT NULL THEN
        INSERT INTO donor_contact (donor_id, phone_enc, email_enc, address_enc)
        VALUES (v_did, fn_encrypt_text('9879054321'), fn_encrypt_text('donor3@bb.test'), fn_encrypt_text('Alkapuri, Vadodara'))
        ON CONFLICT DO NOTHING;
    END IF;

    -- Donor 4: AB+ Male (Universal Plasma Donor)
    INSERT INTO app_user (email, password_hash, full_name, role_name)
    VALUES ('donor4@bb.test', '$2a$10$HTZ2nTOWcPwKUSfPAqUMB.EamOtziiyQrhxFOJs7/l36wQXj27NA.', 'Pooja Trivedi', 'donor')
    ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name RETURNING user_id INTO v_uid;

    INSERT INTO donor (user_id, date_of_birth, gender, blood_group, weight_kg, region_code, latitude, longitude, is_available)
    VALUES (v_uid, '2001-01-30', 'F', 'AB+', 52.5, 'RAJ', 22.3039, 70.8022, true)
    ON CONFLICT (user_id) DO NOTHING RETURNING donor_id INTO v_did;

    IF v_did IS NOT NULL THEN
        INSERT INTO donor_contact (donor_id, phone_enc, email_enc, address_enc)
        VALUES (v_did, fn_encrypt_text('9898011223'), fn_encrypt_text('donor4@bb.test'), fn_encrypt_text('Kalawad Road, Rajkot'))
        ON CONFLICT DO NOTHING;
    END IF;
END
$$;

-- 6) Sample Donations & Component Blood Units
DO $$
DECLARE
    v_don1 int;
    v_don2 int;
    v_officer int := (SELECT user_id FROM app_user WHERE email = 'officer@bb.test');
    v_donor1 int := (SELECT donor_id FROM donor WHERE user_id = (SELECT user_id FROM app_user WHERE email = 'donor1@bb.test'));
    v_donor2 int := (SELECT donor_id FROM donor WHERE user_id = (SELECT user_id FROM app_user WHERE email = 'donor2@bb.test'));
BEGIN
    -- Donation 1 (Past 20 days ago)
    INSERT INTO donation (donor_id, branch_id, donated_at, volume_ml, hemoglobin_gdl, collected_by)
    VALUES (v_donor1, 1, now() - interval '20 days', 450, 14.5, v_officer)
    RETURNING donation_id INTO v_don1;

    INSERT INTO blood_unit (donation_id, component, volume_ml, status, storage_location, expires_on, unit_code) VALUES
        (v_don1, 'RED_CELLS',  225, 'AVAILABLE', 'RACK-A1', (now() + interval '22 days')::date, 'SUR-20261001-0001'),
        (v_don1, 'PLASMA',     225, 'AVAILABLE', 'FREEZER-1', (now() + interval '345 days')::date, 'SUR-20261001-0002');

    -- Screening results for Donation 1 (All Negative -> Safe)
    INSERT INTO screening_result (donation_id, test_type, result, report, tested_by) VALUES
        (v_don1, 'HIV',      'NEGATIVE', '{"assay": "ELISA"}'::jsonb, v_officer),
        (v_don1, 'HBV',      'NEGATIVE', '{"assay": "ELISA"}'::jsonb, v_officer),
        (v_don1, 'HCV',      'NEGATIVE', '{"assay": "ELISA"}'::jsonb, v_officer),
        (v_don1, 'SYPHILIS', 'NEGATIVE', '{"assay": "VDRL"}'::jsonb,  v_officer),
        (v_don1, 'MALARIA',  'NEGATIVE', '{"assay": "Microscopy"}'::jsonb, v_officer);

    -- Donation 2 (Past 3 days ago - in QUARANTINE)
    INSERT INTO donation (donor_id, branch_id, donated_at, volume_ml, hemoglobin_gdl, collected_by)
    VALUES (v_donor2, 2, now() - interval '3 days', 350, 13.2, v_officer)
    RETURNING donation_id INTO v_don2;

    INSERT INTO blood_unit (donation_id, component, volume_ml, status, storage_location, expires_on, unit_code) VALUES
        (v_don2, 'RED_CELLS', 175, 'QUARANTINE', 'INTAKE-BAY', (now() + interval '39 days')::date, 'AHM-20261021-0001'),
        (v_don2, 'PLASMA',    175, 'QUARANTINE', 'INTAKE-BAY', (now() + interval '362 days')::date, 'AHM-20261021-0002');
END
$$;

-- 7) Sample Hospital Blood Requisitions
INSERT INTO blood_request (hospital_id, requested_by, patient_ref, blood_group, component, units_needed, urgency, status, needed_by) VALUES
    (1, (SELECT user_id FROM app_user WHERE email = 'hospital@bb.test'), 'PT-48213', 'O+', 'RED_CELLS', 2, 'URGENT', 'PENDING', now() + interval '1 day'),
    (2, (SELECT user_id FROM app_user WHERE email = 'hospital@bb.test'), 'PT-99312', 'B+', 'PLASMA', 1, 'ROUTINE', 'PENDING', now() + interval '3 days'),
    (3, (SELECT user_id FROM app_user WHERE email = 'hospital@bb.test'), 'PT-11029', 'A-', 'RED_CELLS', 1, 'EMERGENCY', 'PENDING', now() + interval '4 hours')
ON CONFLICT DO NOTHING;

SELECT 'Seed data successfully loaded!' AS status;
