-- db/00_init_as_superuser.sql
-- Run ONCE as the Postgres superuser, using psql:
--     psql -U postgres -f db/00_init_as_superuser.sql
-- WARNING: drops and recreates the "bloodbank" database (local dev only).
\set ON_ERROR_STOP on

-- 1) Start clean --------------------------------------------------
DROP DATABASE IF EXISTS bloodbank WITH (FORCE);

-- 2) Roles --------------------------------------------------------
-- Roles are cluster-wide (they survive DROP DATABASE), so create only if missing.
DO $$
DECLARE
    r text;
BEGIN
    -- Group roles: hold privileges only; nobody can log in as these.
    FOREACH r IN ARRAY ARRAY['bb_admin', 'bb_officer', 'bb_lab_tech',
                             'bb_hospital', 'bb_donor', 'bb_auditor']
    LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
            EXECUTE format(
                'CREATE ROLE %I NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS', r);
        END IF;
    END LOOP;

    -- Owner of all tables; runs the setup scripts; never used by the API.
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bb_owner') THEN
        CREATE ROLE bb_owner LOGIN
            NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
    END IF;

    -- Login used by the Node API. NOINHERIT = no powers until SET ROLE is used.
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bb_app') THEN
        CREATE ROLE bb_app LOGIN NOINHERIT
            NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
    END IF;
END
$$;

-- Dev-only passwords (must match .env.example). Set on every run to stay in sync.
ALTER ROLE bb_owner PASSWORD 'owner_pw';
ALTER ROLE bb_app   PASSWORD 'app_pw';

-- bb_app may switch into each group role (SET ROLE), but does not inherit them.
GRANT bb_admin, bb_officer, bb_lab_tech, bb_hospital, bb_donor, bb_auditor
    TO bb_app;

-- 3) Database -----------------------------------------------------
CREATE DATABASE bloodbank OWNER bb_owner;

-- By default any role may connect to a new database; close that door.
REVOKE ALL ON DATABASE bloodbank FROM PUBLIC;
GRANT CONNECT ON DATABASE bloodbank TO bb_app;   -- bb_owner already has access as owner

-- 4) Extensions (installed per database, so connect first) --------
\connect bloodbank

CREATE EXTENSION IF NOT EXISTS pgcrypto;        -- encryption / hashing functions
CREATE EXTENSION IF NOT EXISTS cube;            -- required by earthdistance
CREATE EXTENSION IF NOT EXISTS earthdistance;   -- distance between lat/long points

-- 5) Smoke tests (read the output!) --------------------------------
SELECT rolname, rolcanlogin, rolinherit, rolsuper, rolbypassrls
FROM pg_roles
WHERE rolname LIKE 'bb\_%'
ORDER BY rolname;

SELECT extname, extversion FROM pg_extension ORDER BY extname;

SELECT pgp_sym_decrypt(pgp_sym_encrypt('hello', 'secret'), 'secret') AS encrypt_roundtrip;

SELECT round((earth_distance(ll_to_earth(21.17, 72.83),
                             ll_to_earth(23.02, 72.57)) / 1000)::numeric, 1)
       AS surat_to_ahmedabad_km;