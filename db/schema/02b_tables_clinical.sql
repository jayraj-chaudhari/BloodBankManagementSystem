-- ============================================================
-- db/schema/02b_tables_clinical.sql
-- Run as bb_owner AFTER 02a_tables_core.sql:
--   psql "postgresql://bb_owner:owner_pw@localhost:5432/bloodbank" -f db/schema/02b_tables_clinical.sql
-- ============================================================
\set ON_ERROR_STOP on

-- 1) Donations and units -----------------------------------------
CREATE TABLE donation (
    donation_id    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    donor_id       INT NOT NULL REFERENCES donor (donor_id),
    branch_id      INT NOT NULL REFERENCES branch (branch_id),
    donated_at     TIMESTAMPTZ NOT NULL,
    volume_ml      INT NOT NULL CHECK (volume_ml BETWEEN 200 AND 500),
    hemoglobin_gdl NUMERIC(4,1) NOT NULL CHECK (hemoglobin_gdl >= 12.5),
    collected_by   INT NOT NULL REFERENCES app_user (user_id),
    classification SMALLINT NOT NULL DEFAULT 2 CHECK (classification BETWEEN 1 AND 3),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE blood_unit (
    unit_id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unit_code        TEXT NOT NULL UNIQUE,
    donation_id      INT NOT NULL REFERENCES donation (donation_id),
    component        component_t NOT NULL REFERENCES component_spec (component),
    volume_ml        INT NOT NULL CHECK (volume_ml > 0),
    status           unit_status_t NOT NULL DEFAULT 'QUARANTINE',
    storage_location TEXT,
    expires_on       DATE NOT NULL,              -- filled by trigger trg_unit_set_expiry
    classification   SMALLINT NOT NULL DEFAULT 1 CHECK (classification BETWEEN 1 AND 3),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (donation_id, component)
);

-- 2) Laboratory screening (RESTRICTED, level 3) --------------------
CREATE TABLE screening_result (
    screening_id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    donation_id    INT NOT NULL REFERENCES donation (donation_id),
    test_type      test_type_t NOT NULL,
    result         test_result_t NOT NULL,
    report         JSONB NOT NULL DEFAULT '{}'::jsonb
                   CHECK (jsonb_typeof(report) = 'object'),
    tested_by      INT NOT NULL REFERENCES app_user (user_id),
    tested_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    classification SMALLINT NOT NULL DEFAULT 3 CHECK (classification = 3),
    UNIQUE (donation_id, test_type)
);

-- 3) Requests and allocation --------------------------------------
CREATE TABLE blood_request (
    request_id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hospital_id    INT NOT NULL REFERENCES hospital (hospital_id),
    requested_by   INT NOT NULL REFERENCES app_user (user_id),
    patient_ref    TEXT NOT NULL CHECK (length(btrim(patient_ref)) > 0),
    blood_group    blood_group_t NOT NULL,
    component      component_t NOT NULL REFERENCES component_spec (component),
    units_needed   SMALLINT NOT NULL CHECK (units_needed BETWEEN 1 AND 20),
    urgency        urgency_t NOT NULL DEFAULT 'ROUTINE',
    status         request_status_t NOT NULL DEFAULT 'PENDING',
    needed_by      TIMESTAMPTZ,
    classification SMALLINT NOT NULL DEFAULT 1 CHECK (classification BETWEEN 1 AND 3),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE request_allocation (
    allocation_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id     INT NOT NULL REFERENCES blood_request (request_id),
    unit_id        INT NOT NULL UNIQUE REFERENCES blood_unit (unit_id),  -- one unit, one request
    allocated_by   INT NOT NULL REFERENCES app_user (user_id),
    allocated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    classification SMALLINT NOT NULL DEFAULT 1 CHECK (classification BETWEEN 1 AND 3)
);

-- 4) Emergency donor coordination ---------------------------------
CREATE TABLE donor_alert (
    alert_id       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id     INT NOT NULL REFERENCES blood_request (request_id),
    donor_id       INT NOT NULL REFERENCES donor (donor_id),
    distance_km    NUMERIC(6,2) CHECK (distance_km >= 0),
    sent_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    response       alert_response_t NOT NULL DEFAULT 'PENDING',
    responded_at   TIMESTAMPTZ,
    classification SMALLINT NOT NULL DEFAULT 2 CHECK (classification BETWEEN 1 AND 3),
    UNIQUE (request_id, donor_id),
    CHECK ((response = 'PENDING') = (responded_at IS NULL))
);

-- 5) Stock movement ledger, partitioned by region ------------------
-- (distributed DBMS: horizontal fragmentation; PK must include the partition key)
CREATE SEQUENCE stock_movement_seq AS BIGINT;

CREATE TABLE stock_movement (
    movement_id   BIGINT NOT NULL DEFAULT nextval('stock_movement_seq'),
    unit_id       INT NOT NULL REFERENCES blood_unit (unit_id),
    region_code   CHAR(3) NOT NULL REFERENCES region (region_code),
    movement_type movement_type_t NOT NULL,
    performed_by  INT REFERENCES app_user (user_id),
    moved_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    note          TEXT,
    PRIMARY KEY (movement_id, region_code)
) PARTITION BY LIST (region_code);

ALTER SEQUENCE stock_movement_seq OWNED BY stock_movement.movement_id;

CREATE TABLE stock_movement_sur   PARTITION OF stock_movement FOR VALUES IN ('SUR');
CREATE TABLE stock_movement_ahm   PARTITION OF stock_movement FOR VALUES IN ('AHM');
CREATE TABLE stock_movement_vad   PARTITION OF stock_movement FOR VALUES IN ('VAD');
CREATE TABLE stock_movement_raj   PARTITION OF stock_movement FOR VALUES IN ('RAJ');
CREATE TABLE stock_movement_other PARTITION OF stock_movement DEFAULT;

-- 6) Data dictionary comments -------------------------------------
COMMENT ON TABLE donation           IS 'One blood donation event: donor, branch, volume and haemoglobin (classification 2).';
COMMENT ON TABLE blood_unit         IS 'A storable bag of one component from a donation; carries status and expiry.';
COMMENT ON TABLE screening_result   IS 'Infectious-disease test results per donation; RESTRICTED (classification 3).';
COMMENT ON TABLE blood_request      IS 'Hospital request for blood; patient identified by a pseudonymous patient_ref only.';
COMMENT ON TABLE request_allocation IS 'Links a request to the unit issued for it; unit_id is UNIQUE so a unit cannot be double-allocated.';
COMMENT ON TABLE donor_alert        IS 'Emergency alert sent to a nearby compatible donor and the donor''s response.';
COMMENT ON TABLE stock_movement     IS 'Append-only ledger of unit status changes, list-partitioned by region_code.';

-- 7) Smoke tests -------------------------------------------------
SELECT count(*) AS main_tables                         -- expect 15
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relispartition;

SELECT inhrelid::regclass AS partition                 -- expect 5 rows
FROM pg_inherits
WHERE inhparent = 'stock_movement'::regclass
ORDER BY 1;