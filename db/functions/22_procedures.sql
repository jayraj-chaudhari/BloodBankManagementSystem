-- ============================================================
-- db/functions/22_procedures.sql
-- Run as bb_owner AFTER 21_triggers.sql:
--   psql "postgresql://bb_owner:owner_pw@localhost:5432/bloodbank" -f db/functions/22_procedures.sql
-- ============================================================
\set ON_ERROR_STOP on
\pset pager off

-- 1) FEFO allocation (runs with the CALLER's privileges, so DAC and RLS apply) ----
CREATE OR REPLACE FUNCTION fn_allocate_fefo(p_request_id int, p_user_id int)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_req       blood_request%ROWTYPE;
    v_ctx_user  text := NULLIF(current_setting('app.user_id', true), '');
    v_today     date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
    v_remaining int;
    v_count     int  := 0;
    v_have      int;
    r           record;
BEGIN
    IF v_ctx_user IS NOT NULL AND v_ctx_user::int <> p_user_id THEN
        RAISE EXCEPTION 'FORBIDDEN: user_id does not match the logged-in user';
    END IF;

    SELECT * INTO v_req FROM blood_request WHERE request_id = p_request_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: request % does not exist', p_request_id;
    END IF;
    IF v_req.status NOT IN ('PENDING', 'APPROVED', 'PARTIAL') THEN
        RAISE EXCEPTION 'REQUEST_CLOSED: request % is %', p_request_id, v_req.status;
    END IF;

    v_remaining := v_req.units_needed
                   - (SELECT count(*) FROM request_allocation WHERE request_id = p_request_id);
    IF v_remaining <= 0 THEN
        RAISE EXCEPTION 'REQUEST_CLOSED: request % already has all % units', p_request_id, v_req.units_needed;
    END IF;

    -- exact blood group first (saves universal donors), then earliest expiry (FEFO)
    FOR r IN
        SELECT u.unit_id
          FROM blood_unit u
          JOIN donation d ON d.donation_id = u.donation_id
          JOIN donor dn   ON dn.donor_id   = d.donor_id
         WHERE u.status = 'AVAILABLE'
           AND u.component = v_req.component
           AND u.expires_on >= v_today
           AND dn.blood_group = ANY (fn_compatible_donor_groups(v_req.blood_group, v_req.component))
         ORDER BY (dn.blood_group <> v_req.blood_group), u.expires_on, u.unit_id
         LIMIT v_remaining
           FOR UPDATE OF u SKIP LOCKED
    LOOP
        INSERT INTO request_allocation (request_id, unit_id, allocated_by)
        VALUES (p_request_id, r.unit_id, p_user_id);
        UPDATE blood_unit SET status = 'RESERVED' WHERE unit_id = r.unit_id;
        v_count := v_count + 1;
    END LOOP;

    IF v_count = 0 THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK: no compatible available units for request %', p_request_id;
    END IF;
    SELECT count(*) INTO v_have FROM request_allocation WHERE request_id = p_request_id;
    UPDATE blood_request
       SET status = (CASE WHEN v_have >= v_req.units_needed THEN 'FULFILLED' ELSE 'PARTIAL' END)::request_status_t
     WHERE request_id = p_request_id;

    RETURN v_count;
END
$$;

-- 2) Expiry sweep ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_expire_units()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_n int;
BEGIN
    UPDATE blood_unit
       SET status = 'EXPIRED'
     WHERE expires_on < (now() AT TIME ZONE 'Asia/Kolkata')::date
       AND status IN ('QUARANTINE', 'AVAILABLE', 'RESERVED');
    GET DIAGNOSTICS v_n = ROW_COUNT;
    RETURN v_n;
END
$$;

-- 3) Public donor registration -------------------------------------------------------
-- The caller must set app.enc_key in the same transaction (set_config(..., true)).
CREATE OR REPLACE FUNCTION fn_register_donor(
    p_email         text,
    p_password_hash text,
    p_full_name     text,
    p_date_of_birth date,
    p_gender        char,
    p_blood_group   blood_group_t,
    p_weight_kg     numeric,
    p_region_code   char,
    p_latitude      numeric,
    p_longitude     numeric,
    p_phone         text,
    p_address       text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
    v_email    text := lower(btrim(p_email));
    v_user_id  int;
    v_donor_id int;
BEGIN
    IF v_email IS NULL OR v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: invalid email';
    END IF;
    IF p_password_hash IS NULL OR p_password_hash !~ '^\$2[aby]\$[0-9]{2}\$.{53}$' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: password must be supplied as a bcrypt hash';
    END IF;
    IF p_full_name IS NULL OR btrim(p_full_name) = '' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: full_name is required';
    END IF;
    IF p_phone IS NULL OR p_phone !~ '^[6-9][0-9]{9}$' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: phone must be a 10-digit Indian mobile number';
    END IF;
    IF (p_latitude IS NULL) <> (p_longitude IS NULL) THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: latitude and longitude must be given together';
    END IF;
    IF p_weight_kg IS NULL OR p_weight_kg < 45 THEN
        RAISE EXCEPTION 'DONOR_NOT_ELIGIBLE: weight must be at least 45 kg';
    END IF;

    BEGIN
        INSERT INTO app_user (email, password_hash, full_name, role_name)
        VALUES (v_email, p_password_hash, btrim(p_full_name), 'donor')
        RETURNING user_id INTO v_user_id;
    EXCEPTION WHEN unique_violation THEN
        RAISE EXCEPTION 'EMAIL_TAKEN: an account with this email already exists';
    END;

    INSERT INTO donor (user_id, date_of_birth, gender, blood_group, weight_kg,
                       region_code, latitude, longitude)
    VALUES (v_user_id, p_date_of_birth, p_gender, p_blood_group, p_weight_kg,
            p_region_code, p_latitude, p_longitude)
    RETURNING donor_id INTO v_donor_id;

    INSERT INTO donor_contact (donor_id, phone_enc, email_enc, address_enc)
    VALUES (v_donor_id, fn_encrypt_text(p_phone), fn_encrypt_text(v_email), fn_encrypt_text(p_address));

    RETURN jsonb_build_object('user_id', v_user_id, 'donor_id', v_donor_id);
END
$fn$;

-- Nobody may execute these until the DAC file grants it
REVOKE ALL ON FUNCTION fn_allocate_fefo(int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION fn_expire_units() FROM PUBLIC;
REVOKE ALL ON FUNCTION fn_register_donor(text, text, text, date, char, blood_group_t,
                                         numeric, char, numeric, numeric, text, text) FROM PUBLIC;

COMMENT ON FUNCTION fn_allocate_fefo(int, int)
    IS 'Allocates compatible AVAILABLE units to a request: exact group first, then earliest expiry; row-locked with SKIP LOCKED.';
COMMENT ON FUNCTION fn_expire_units()
    IS 'Marks all past-expiry units EXPIRED and returns how many were changed.';
COMMENT ON FUNCTION fn_register_donor(text, text, text, date, char, blood_group_t, numeric, char, numeric, numeric, text, text)
    IS 'Public donor sign-up: creates user, donor and encrypted contact atomically; returns {user_id, donor_id}.';

-- Smoke test: expect 3 rows ------------------------------------------------------------
SELECT proname, prosecdef AS security_definer
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('fn_allocate_fefo', 'fn_expire_units', 'fn_register_donor')
ORDER BY proname;
-- 4) Emergency donor search within radius (Haversine, pure SQL)
CREATE OR REPLACE FUNCTION fn_find_donors_for_request(p_request_id int, p_radius_km numeric DEFAULT 50.0)
RETURNS TABLE (donor_id int, blood_group blood_group_t, distance_km numeric, is_available boolean, next_eligible_on date)
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_req  blood_request%ROWTYPE;
    v_hosp hospital%ROWTYPE;
BEGIN
    SELECT * INTO v_req FROM blood_request WHERE request_id = p_request_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: request % does not exist', p_request_id;
    END IF;

    SELECT * INTO v_hosp FROM hospital WHERE hospital_id = v_req.hospital_id;
    IF v_hosp.latitude IS NULL OR v_hosp.longitude IS NULL THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: hospital has no geographic coordinates';
    END IF;

    RETURN QUERY
    SELECT dn.donor_id,
           dn.blood_group,
           fn_distance_km(v_hosp.latitude::float8, v_hosp.longitude::float8, dn.latitude::float8, dn.longitude::float8) AS distance_km,
           e.is_available,
           e.next_eligible_on
      FROM donor dn
      JOIN v_donor_eligibility e ON e.donor_id = dn.donor_id
     WHERE dn.latitude IS NOT NULL AND dn.longitude IS NOT NULL
       AND e.is_eligible = true
       AND e.is_available = true
       AND dn.blood_group = ANY (fn_compatible_donor_groups(v_req.blood_group, v_req.component))
       AND fn_distance_km(v_hosp.latitude::float8, v_hosp.longitude::float8, dn.latitude::float8, dn.longitude::float8) <= p_radius_km
     ORDER BY distance_km ASC;
END;
$$;

COMMENT ON FUNCTION fn_find_donors_for_request(int, numeric) IS 'Find eligible and available donors for an emergency blood request within a given radius (km), nearest first.';
