-- ============================================================
-- db/functions/21_triggers.sql
-- Run as bb_owner AFTER 20_functions.sql:
--   psql "postgresql://bb_owner:owner_pw@localhost:5432/bloodbank" -f db/functions/21_triggers.sql
-- Error convention: RAISE EXCEPTION 'CODE: message'  (the API maps the CODE prefix)
-- ============================================================
\set ON_ERROR_STOP on
\pset pager off

-- Gap between donations in days (single place to change the rule)
CREATE OR REPLACE FUNCTION fn_donation_gap_days(p_gender character)
RETURNS int LANGUAGE sql IMMUTABLE
AS $$ SELECT CASE WHEN p_gender = 'F' THEN 120 ELSE 90 END $$;

CREATE SEQUENCE IF NOT EXISTS unit_code_seq;

-- 1) Donor age (18-65) ------------------------------------------------
CREATE OR REPLACE FUNCTION tf_donor_age_check() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_age int := date_part('year', age((now() AT TIME ZONE 'Asia/Kolkata'),
                                       NEW.date_of_birth::timestamp))::int;
BEGIN
    IF v_age NOT BETWEEN 18 AND 65 THEN
        RAISE EXCEPTION 'DONOR_NOT_ELIGIBLE: donor age must be between 18 and 65 (is %)', v_age;
    END IF;
    RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_donor_age_check ON donor;
CREATE TRIGGER trg_donor_age_check
    BEFORE INSERT OR UPDATE OF date_of_birth ON donor
    FOR EACH ROW EXECUTE FUNCTION tf_donor_age_check();

-- 2) Donation: age at donation + minimum gap (both directions) ----------
CREATE OR REPLACE FUNCTION tf_donation_checks() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE
    v_dob    date;
    v_gender char(1);
    v_gap    int;
    v_age    int;
    v_prev   timestamptz;
    v_next   timestamptz;
BEGIN
    SELECT date_of_birth, gender INTO v_dob, v_gender
      FROM donor WHERE donor_id = NEW.donor_id FOR UPDATE;      -- serialises per donor
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: donor % does not exist', NEW.donor_id;
    END IF;

    v_age := date_part('year', age((NEW.donated_at AT TIME ZONE 'Asia/Kolkata'),
                                   v_dob::timestamp))::int;
    IF v_age NOT BETWEEN 18 AND 65 THEN
        RAISE EXCEPTION 'DONOR_NOT_ELIGIBLE: donor age at donation must be 18-65 (was %)', v_age;
    END IF;

    v_gap := fn_donation_gap_days(v_gender);

    SELECT max(donated_at) INTO v_prev FROM donation
     WHERE donor_id = NEW.donor_id AND donated_at <= NEW.donated_at;
    IF v_prev IS NOT NULL AND NEW.donated_at < v_prev + make_interval(days => v_gap) THEN
        RAISE EXCEPTION 'DONATION_TOO_SOON: next eligible on %',
            ((v_prev + make_interval(days => v_gap)) AT TIME ZONE 'Asia/Kolkata')::date;
    END IF;

    SELECT min(donated_at) INTO v_next FROM donation
     WHERE donor_id = NEW.donor_id AND donated_at > NEW.donated_at;
    IF v_next IS NOT NULL AND v_next < NEW.donated_at + make_interval(days => v_gap) THEN
        RAISE EXCEPTION 'DONATION_TOO_SOON: a later donation on % is within % days',
            (v_next AT TIME ZONE 'Asia/Kolkata')::date, v_gap;
    END IF;
    RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_donation_gap_check ON donation;
CREATE TRIGGER trg_donation_gap_check
    BEFORE INSERT ON donation
    FOR EACH ROW EXECUTE FUNCTION tf_donation_checks();

-- 3) Unit: expiry date + bag code ------------------------------------
CREATE OR REPLACE FUNCTION tf_unit_set_expiry() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE
    v_donated timestamptz;
    v_region  char(3);
    v_days    int;
    v_day     date;
BEGIN
    SELECT d.donated_at, b.region_code INTO v_donated, v_region
      FROM donation d JOIN branch b ON b.branch_id = d.branch_id
     WHERE d.donation_id = NEW.donation_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: donation % does not exist', NEW.donation_id;
    END IF;

    SELECT shelf_life_days INTO v_days FROM component_spec WHERE component = NEW.component;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: no shelf life defined for component %', NEW.component;
    END IF;

    v_day := (v_donated AT TIME ZONE 'Asia/Kolkata')::date;
    NEW.expires_on := v_day + v_days;                       -- always computed, never trusted
    IF NEW.unit_code IS NULL THEN
        NEW.unit_code := v_region || '-' || to_char(v_day, 'YYYYMMDD') || '-'
                         || lpad(nextval('unit_code_seq')::text, 4, '0');
    END IF;
    RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_unit_set_expiry ON blood_unit;
CREATE TRIGGER trg_unit_set_expiry
    BEFORE INSERT ON blood_unit
    FOR EACH ROW EXECUTE FUNCTION tf_unit_set_expiry();

-- 4) Unit status: allowed transitions only -----------------------------
CREATE OR REPLACE FUNCTION tf_unit_status_guard() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT (
           (OLD.status = 'QUARANTINE' AND NEW.status IN ('AVAILABLE', 'DISCARDED', 'EXPIRED'))
        OR (OLD.status = 'AVAILABLE'  AND NEW.status IN ('RESERVED', 'DISCARDED', 'EXPIRED'))
        OR (OLD.status = 'RESERVED'   AND NEW.status IN ('ISSUED', 'AVAILABLE', 'DISCARDED', 'EXPIRED'))
    ) THEN
        RAISE EXCEPTION 'INVALID_STATUS_CHANGE: unit % cannot change from % to %',
            OLD.unit_id, OLD.status, NEW.status;
    END IF;
    RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_unit_status_guard ON blood_unit;
CREATE TRIGGER trg_unit_status_guard
    BEFORE UPDATE OF status ON blood_unit
    FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION tf_unit_status_guard();

-- 5) Unit status change -> stock ledger row ----------------------------
CREATE OR REPLACE FUNCTION tf_unit_status_movement() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE
    v_region char(3);
    v_uid    int := NULLIF(current_setting('app.user_id', true), '')::int;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.status = OLD.status THEN
        RETURN NULL;
    END IF;

    SELECT b.region_code INTO v_region
      FROM donation d JOIN branch b ON b.branch_id = d.branch_id
     WHERE d.donation_id = NEW.donation_id;

    INSERT INTO stock_movement (unit_id, region_code, movement_type, performed_by, note)
    VALUES (
        NEW.unit_id, v_region,
        (CASE NEW.status
             WHEN 'QUARANTINE' THEN 'COLLECTED'
             WHEN 'AVAILABLE'  THEN 'RELEASED'
             WHEN 'RESERVED'   THEN 'RESERVED'
             WHEN 'ISSUED'     THEN 'ISSUED'
             WHEN 'EXPIRED'    THEN 'EXPIRED'
             ELSE 'DISCARDED'
         END)::movement_type_t,
        v_uid,
        CASE WHEN TG_OP = 'INSERT' THEN 'unit created'
             ELSE format('status %s -> %s', OLD.status, NEW.status) END
    );
    RETURN NULL;
END
$$;

DROP TRIGGER IF EXISTS trg_unit_status_movement ON blood_unit;
CREATE TRIGGER trg_unit_status_movement
    AFTER INSERT OR UPDATE OF status ON blood_unit
    FOR EACH ROW EXECUTE FUNCTION tf_unit_status_movement();

-- 6) Screening result -> unit status -----------------------------------
CREATE OR REPLACE FUNCTION tf_screening_update_units() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE
    v_pos      int;
    v_neg      int;
    v_required int := array_length(enum_range(NULL::test_type_t), 1);
BEGIN
    SELECT count(*) FILTER (WHERE result = 'POSITIVE'),
           count(*) FILTER (WHERE result = 'NEGATIVE')
      INTO v_pos, v_neg
      FROM screening_result WHERE donation_id = NEW.donation_id;

    IF v_pos > 0 THEN
        UPDATE blood_unit SET status = 'DISCARDED'
         WHERE donation_id = NEW.donation_id
           AND status IN ('QUARANTINE', 'AVAILABLE', 'RESERVED');
    ELSIF v_neg = v_required THEN
        UPDATE blood_unit SET status = 'AVAILABLE'
         WHERE donation_id = NEW.donation_id AND status = 'QUARANTINE';
    END IF;
    RETURN NULL;
END
$$;

DROP TRIGGER IF EXISTS trg_screening_update_units ON screening_result;
CREATE TRIGGER trg_screening_update_units
    AFTER INSERT OR UPDATE OF result ON screening_result
    FOR EACH ROW EXECUTE FUNCTION tf_screening_update_units();

-- 7) Allocation: validate, then apply ------------------------------------
CREATE OR REPLACE FUNCTION tf_allocation_validate() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE
    v_status  unit_status_t;
    v_exp     date;
    v_ucomp   component_t;
    v_group   blood_group_t;
    v_rgroup  blood_group_t;
    v_rcomp   component_t;
    v_rstatus request_status_t;
    v_needed  int;
    v_have    int;
    v_today   date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
    SELECT u.status, u.expires_on, u.component, dn.blood_group
      INTO v_status, v_exp, v_ucomp, v_group
      FROM blood_unit u
      JOIN donation d  ON d.donation_id = u.donation_id
      JOIN donor dn    ON dn.donor_id   = d.donor_id
     WHERE u.unit_id = NEW.unit_id
       FOR UPDATE OF u;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: unit % does not exist', NEW.unit_id;
    END IF;
    IF v_status <> 'AVAILABLE' THEN
        RAISE EXCEPTION 'UNIT_NOT_AVAILABLE: unit % is %', NEW.unit_id, v_status;
    END IF;
    IF v_exp < v_today THEN
        RAISE EXCEPTION 'UNIT_NOT_AVAILABLE: unit % expired on %', NEW.unit_id, v_exp;
    END IF;

    SELECT blood_group, component, status, units_needed
      INTO v_rgroup, v_rcomp, v_rstatus, v_needed
      FROM blood_request WHERE request_id = NEW.request_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: request % does not exist', NEW.request_id;
    END IF;
    IF v_rstatus NOT IN ('PENDING', 'APPROVED', 'PARTIAL') THEN
        RAISE EXCEPTION 'REQUEST_CLOSED: request % is %', NEW.request_id, v_rstatus;
    END IF;

    SELECT count(*) INTO v_have FROM request_allocation WHERE request_id = NEW.request_id;
    IF v_have >= v_needed THEN
        RAISE EXCEPTION 'REQUEST_CLOSED: request % already has all % units', NEW.request_id, v_needed;
    END IF;
    IF v_ucomp <> v_rcomp THEN
        RAISE EXCEPTION 'COMPONENT_MISMATCH: unit is %, request needs %', v_ucomp, v_rcomp;
    END IF;
    IF NOT (v_group = ANY (fn_compatible_donor_groups(v_rgroup, v_rcomp))) THEN
        RAISE EXCEPTION 'INCOMPATIBLE_GROUP: a % unit cannot be given to a % recipient', v_group, v_rgroup;
    END IF;
    RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_allocation_validate ON request_allocation;
CREATE TRIGGER trg_allocation_validate
    BEFORE INSERT ON request_allocation
    FOR EACH ROW EXECUTE FUNCTION tf_allocation_validate();

CREATE OR REPLACE FUNCTION tf_allocation_apply() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE
    v_needed int;
    v_have   int;
BEGIN
    UPDATE blood_unit SET status = 'RESERVED' WHERE unit_id = NEW.unit_id;

    SELECT units_needed INTO v_needed FROM blood_request WHERE request_id = NEW.request_id;
    SELECT count(*) INTO v_have FROM request_allocation WHERE request_id = NEW.request_id;

    UPDATE blood_request
       SET status = (CASE WHEN v_have >= v_needed THEN 'FULFILLED' ELSE 'PARTIAL' END)::request_status_t
     WHERE request_id = NEW.request_id;
    RETURN NULL;
END
$$;

DROP TRIGGER IF EXISTS trg_allocation_apply ON request_allocation;
CREATE TRIGGER trg_allocation_apply
    AFTER INSERT ON request_allocation
    FOR EACH ROW EXECUTE FUNCTION tf_allocation_apply();

-- 8) updated_at maintenance ----------------------------------------------
CREATE OR REPLACE FUNCTION tf_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_request_updated_at ON blood_request;
CREATE TRIGGER trg_request_updated_at
    BEFORE UPDATE ON blood_request
    FOR EACH ROW EXECUTE FUNCTION tf_touch_updated_at();

DROP TRIGGER IF EXISTS trg_donor_contact_updated_at ON donor_contact;
CREATE TRIGGER trg_donor_contact_updated_at
    BEFORE UPDATE ON donor_contact
    FOR EACH ROW EXECUTE FUNCTION tf_touch_updated_at();

-- Smoke test: expect 10 rows ---------------------------------------------
SELECT tgrelid::regclass AS "table", tgname AS "trigger"
FROM pg_trigger
WHERE NOT tgisinternal
ORDER BY 1, 2;
