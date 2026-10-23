-- ============================================================
-- db/schema/02a_tables_core.sql
-- Run as bb_owner AFTER 01_types.sql:
--   psql "postgresql://bb_owner:owner_pw@localhost:5432/bloodbank" -f db/schema/02a_tables_core.sql
-- ============================================================
\set ON_ERROR_STOP on

-- 1) Lookup tables -----------------------------------------------
CREATE TABLE region (
    region_code CHAR(3) PRIMARY KEY CHECK (region_code = upper(region_code)),
    region_name TEXT NOT NULL UNIQUE
);

CREATE TABLE role_def (
    role_name   TEXT PRIMARY KEY,
    db_role     NAME NOT NULL UNIQUE,
    clearance   SMALLINT NOT NULL CHECK (clearance BETWEEN 1 AND 3),
    description TEXT
);

CREATE TABLE component_spec (
    component       component_t PRIMARY KEY,
    shelf_life_days INT NOT NULL CHECK (shelf_life_days > 0),
    storage_note    TEXT
);

-- 2) Places ------------------------------------------------------
CREATE TABLE branch (
    branch_id        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    branch_name      TEXT NOT NULL UNIQUE,
    region_code      CHAR(3) NOT NULL REFERENCES region (region_code),
    parent_branch_id INT REFERENCES branch (branch_id),
    address          address_t,
    latitude         NUMERIC(9,6) CHECK (latitude  BETWEEN -90  AND 90),
    longitude        NUMERIC(9,6) CHECK (longitude BETWEEN -180 AND 180),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (parent_branch_id IS NULL OR parent_branch_id <> branch_id),
    CHECK ((latitude IS NULL) = (longitude IS NULL))
);

CREATE TABLE hospital (
    hospital_id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hospital_name TEXT NOT NULL,
    region_code   CHAR(3) NOT NULL REFERENCES region (region_code),
    address       address_t,
    phone         phone_t,
    latitude      NUMERIC(9,6) CHECK (latitude  BETWEEN -90  AND 90),
    longitude     NUMERIC(9,6) CHECK (longitude BETWEEN -180 AND 180),
    is_verified   BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (hospital_name, region_code),
    CHECK ((latitude IS NULL) = (longitude IS NULL))
);

-- 3) People ------------------------------------------------------
CREATE TABLE app_user (
    user_id         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE
                    CHECK (email = lower(email) AND position('@' IN email) > 1),
    password_hash   TEXT NOT NULL,
    full_name       TEXT NOT NULL,
    role_name       TEXT NOT NULL REFERENCES role_def (role_name),
    branch_id       INT REFERENCES branch (branch_id),
    hospital_id     INT REFERENCES hospital (hospital_id),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    failed_attempts SMALLINT NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
    locked_until    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- role must match its affiliation
    CHECK (
        (role_name = 'hospital_user'            AND hospital_id IS NOT NULL AND branch_id IS NULL)
     OR (role_name IN ('bb_officer', 'lab_tech') AND branch_id   IS NOT NULL AND hospital_id IS NULL)
     OR (role_name IN ('admin', 'auditor')       AND hospital_id IS NULL)
     OR (role_name = 'donor'                     AND branch_id IS NULL AND hospital_id IS NULL)
    )
);

CREATE TABLE donor (
    donor_id       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        INT NOT NULL UNIQUE REFERENCES app_user (user_id),
    date_of_birth  DATE NOT NULL,
    gender         CHAR(1) NOT NULL CHECK (gender IN ('M', 'F', 'O')),
    blood_group    blood_group_t NOT NULL,
    weight_kg      NUMERIC(5,1) NOT NULL CHECK (weight_kg >= 45),
    region_code    CHAR(3) NOT NULL REFERENCES region (region_code),
    latitude       NUMERIC(9,6) CHECK (latitude  BETWEEN -90  AND 90),
    longitude      NUMERIC(9,6) CHECK (longitude BETWEEN -180 AND 180),
    is_available   BOOLEAN NOT NULL DEFAULT true,
    classification SMALLINT NOT NULL DEFAULT 2 CHECK (classification BETWEEN 1 AND 3),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK ((latitude IS NULL) = (longitude IS NULL))
);

CREATE TABLE donor_contact (
    donor_id       INT PRIMARY KEY REFERENCES donor (donor_id),
    phone_enc      BYTEA NOT NULL,
    email_enc      BYTEA,
    address_enc    BYTEA,
    key_version    SMALLINT NOT NULL DEFAULT 1,
    classification SMALLINT NOT NULL DEFAULT 2 CHECK (classification BETWEEN 1 AND 3),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Data dictionary comments -------------------------------------
COMMENT ON TABLE region         IS 'Geographic regions; also the partition key for stock_movement.';
COMMENT ON TABLE role_def       IS 'Application roles with their DB role and MAC clearance (single source of truth).';
COMMENT ON TABLE component_spec IS 'Shelf life per blood component, used to compute unit expiry.';
COMMENT ON TABLE branch         IS 'Blood bank branches; parent_branch_id models hub and local-centre hierarchy.';
COMMENT ON TABLE hospital       IS 'Hospitals that place blood requests.';
COMMENT ON TABLE app_user       IS 'Login accounts for all roles; password stored only as a bcrypt hash.';
COMMENT ON TABLE donor          IS 'Donor medical and location profile (confidential, classification 2).';
COMMENT ON TABLE donor_contact  IS 'Donor phone, email and address, encrypted with pgcrypto (classification 2).';

-- 5) Smoke tests -------------------------------------------------
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;                                  -- expect 8 rows

SELECT conrelid::regclass AS table_name, count(*) AS constraints
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
GROUP BY conrelid
ORDER BY 1;