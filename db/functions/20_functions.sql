-- ============================================================
-- db/functions/20_functions.sql   (helper functions)
-- Run as bb_owner AFTER 03_indexes.sql:
--   psql "postgresql://bb_owner:owner_pw@localhost:5432/bloodbank" -f db/functions/20_functions.sql
-- ============================================================
\set ON_ERROR_STOP on
\pset pager off

-- 1) Distance between two points in km (Haversine; pure SQL, no extensions)
CREATE FUNCTION fn_distance_km(lat1 double precision, lon1 double precision,
                               lat2 double precision, lon2 double precision)
RETURNS numeric
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
AS $$
    SELECT round((2 * 6371.0 * asin(sqrt(least(1.0,
               power(sin(radians(lat2 - lat1) / 2), 2) +
               cos(radians(lat1)) * cos(radians(lat2)) *
               power(sin(radians(lon2 - lon1) / 2), 2)
           ))))::numeric, 2)
$$;

-- 2) Which donor groups can supply this recipient, for this component?
CREATE FUNCTION fn_compatible_donor_groups(recipient blood_group_t, comp component_t)
RETURNS blood_group_t[]
LANGUAGE plpgsql STABLE STRICT
AS $$
DECLARE
    r_abo    text    := substring(recipient::text FROM '^(AB|A|B|O)');
    r_pos    boolean := right(recipient::text, 1) = '+';
    v_result blood_group_t[];
BEGIN
    SELECT array_agg(d.g ORDER BY d.g)
      INTO v_result
      FROM (SELECT u.g,
                   substring(u.g::text FROM '^(AB|A|B|O)') AS abo,
                   right(u.g::text, 1) = '+'               AS pos
              FROM unnest(enum_range(NULL::blood_group_t)) AS u(g)) d
     WHERE CASE comp
             WHEN 'PLASMA' THEN              -- reverse ABO logic, Rh ignored
                 CASE r_abo
                     WHEN 'O' THEN true
                     WHEN 'A' THEN d.abo IN ('A', 'AB')
                     WHEN 'B' THEN d.abo IN ('B', 'AB')
                     ELSE d.abo = 'AB'
                 END
             WHEN 'PLATELETS' THEN           -- simplified: same ABO; Rh-negative recipient gets Rh-negative
                 d.abo = r_abo AND (r_pos OR NOT d.pos)
             ELSE                            -- RED_CELLS and WHOLE_BLOOD
                 (CASE r_abo
                      WHEN 'AB' THEN true
                      WHEN 'A'  THEN d.abo IN ('A', 'O')
                      WHEN 'B'  THEN d.abo IN ('B', 'O')
                      ELSE d.abo = 'O'
                  END)
                 AND (r_pos OR NOT d.pos)
           END;
    RETURN v_result;
END
$$;

-- 3) Field-level encryption. The key comes from the session setting app.enc_key
CREATE FUNCTION fn_encrypt_text(p_plain text)
RETURNS bytea
LANGUAGE plpgsql STRICT
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_key text := current_setting('app.enc_key', true);
BEGIN
    IF v_key IS NULL OR length(v_key) < 16 THEN
        RAISE EXCEPTION 'ENCRYPTION_KEY_MISSING: app.enc_key must be set (min 16 chars) for this transaction';
    END IF;
    RETURN pgp_sym_encrypt(p_plain, v_key, 'cipher-algo=aes256');
END
$$;

CREATE FUNCTION fn_decrypt_text(p_cipher bytea)
RETURNS text
LANGUAGE plpgsql STRICT
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_key text := current_setting('app.enc_key', true);
BEGIN
    IF v_key IS NULL OR length(v_key) < 16 THEN
        RAISE EXCEPTION 'ENCRYPTION_KEY_MISSING: app.enc_key must be set (min 16 chars) for this transaction';
    END IF;
    RETURN pgp_sym_decrypt(p_cipher, v_key);
END
$$;

-- Lock encrypt/decrypt: no role may use them until the DAC file grants it (50_roles_grants.sql)
REVOKE ALL ON FUNCTION fn_encrypt_text(text)  FROM PUBLIC;
REVOKE ALL ON FUNCTION fn_decrypt_text(bytea) FROM PUBLIC;

COMMENT ON FUNCTION fn_distance_km(double precision, double precision, double precision, double precision)
    IS 'Haversine great-circle distance in km between two latitude/longitude points.';
COMMENT ON FUNCTION fn_compatible_donor_groups(blood_group_t, component_t)
    IS 'Donor blood groups compatible with a recipient group for a given component.';
COMMENT ON FUNCTION fn_encrypt_text(text)
    IS 'AES-256 (pgcrypto) encryption; key read from session setting app.enc_key, never stored in the DB.';
COMMENT ON FUNCTION fn_decrypt_text(bytea)
    IS 'Decrypts values produced by fn_encrypt_text using app.enc_key.';

-- ============================================================
-- Smoke tests
-- ============================================================

-- 1) Distance: expect about 207.7, 0.00, true
SELECT fn_distance_km(21.17, 72.83, 23.02, 72.57) AS surat_to_ahmedabad_km,
       fn_distance_km(21.17, 72.83, 21.17, 72.83) AS same_point_km,
       fn_distance_km(NULL, 72.83, 23.02, 72.57) IS NULL AS null_in_null_out;

-- 2) Compatibility
SELECT r AS recipient, c AS component, fn_compatible_donor_groups(r, c) AS donor_groups
FROM (VALUES ('B+'::blood_group_t, 'RED_CELLS'::component_t),
             ('AB+', 'RED_CELLS'),
             ('O-',  'RED_CELLS'),
             ('AB-', 'RED_CELLS'),
             ('A-',  'PLASMA'),
             ('A-',  'PLATELETS')) AS t(r, c);

-- 3) Encryption must refuse to run without a key
DO $$
BEGIN
    PERFORM fn_encrypt_text('x');
    RAISE EXCEPTION 'TEST FAILED: expected a missing-key error';
EXCEPTION WHEN others THEN
    IF SQLERRM LIKE 'ENCRYPTION_KEY_MISSING%' THEN
        RAISE NOTICE 'OK: missing key rejected';
    ELSE
        RAISE;
    END IF;
END
$$;

-- 4) Round trip with a key (session-level only for this test)
SELECT set_config('app.enc_key', 'test_key_1234567890', false);

SELECT fn_decrypt_text(fn_encrypt_text('9876543210'))        AS decrypted,
       fn_encrypt_text('abc') <> fn_encrypt_text('abc')      AS ciphertext_is_randomized;

RESET app.enc_key;

-- 5) Inventory: expect 4 rows
SELECT proname, pg_get_function_identity_arguments(oid) AS args
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace AND proname LIKE 'fn\_%'
ORDER BY proname;

-- Pre-create gap days function in case views run before triggers
CREATE OR REPLACE FUNCTION fn_donation_gap_days(p_gender character)
RETURNS int LANGUAGE sql IMMUTABLE
AS $$ SELECT CASE WHEN p_gender = 'F' THEN 120 ELSE 90 END $$;
