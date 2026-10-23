-- ============================================================
-- db/schema/01_types.sql
-- Run AFTER 00_init as bb_owner:
--   psql "postgresql://bb_owner:owner_pw@localhost:5432/bloodbank" -f db/schema/01_types.sql
-- ============================================================
\set ON_ERROR_STOP on

-- Enumerated types (fixed lists of allowed values) ---------------
CREATE TYPE blood_group_t    AS ENUM ('A+','A-','B+','B-','AB+','AB-','O+','O-');
CREATE TYPE component_t      AS ENUM ('WHOLE_BLOOD','RED_CELLS','PLASMA','PLATELETS');
CREATE TYPE unit_status_t    AS ENUM ('QUARANTINE','AVAILABLE','RESERVED','ISSUED','EXPIRED','DISCARDED');
CREATE TYPE request_status_t AS ENUM ('PENDING','APPROVED','PARTIAL','FULFILLED','REJECTED','CANCELLED');
CREATE TYPE urgency_t        AS ENUM ('ROUTINE','URGENT','EMERGENCY');
CREATE TYPE test_type_t      AS ENUM ('HIV','HBV','HCV','SYPHILIS','MALARIA');
CREATE TYPE test_result_t    AS ENUM ('NEGATIVE','POSITIVE','INCONCLUSIVE');
CREATE TYPE alert_response_t AS ENUM ('PENDING','ACCEPTED','DECLINED');
CREATE TYPE movement_type_t  AS ENUM ('COLLECTED','RELEASED','RESERVED','ISSUED',
                                      'EXPIRED','DISCARDED','TRANSFERRED');

-- Domain: TEXT with a built-in rule (Indian 10-digit mobile starting with 6-9)
CREATE DOMAIN phone_t AS TEXT
    CHECK (VALUE ~ '^[6-9][0-9]{9}$');

-- Composite type: one column holding a structured address
CREATE TYPE address_t AS (
    line1   TEXT,
    city    TEXT,
    state   TEXT,
    pincode TEXT
);

-- Smoke tests ----------------------------------------------------
SELECT count(*) AS enum_types                      -- expect 9
FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE t.typtype = 'e' AND n.nspname = 'public';

SELECT 'O-'::blood_group_t                          AS blood_group,
       '9876543210'::phone_t                        AS phone,
       ROW('12 MG Road','Surat','Gujarat','395007')::address_t AS address;