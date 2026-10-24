-- ============================================================
-- db/distributed/fdw_demo.sql
-- Run as superuser AFTER the main setup (needs the bloodbank database):
--   psql -U postgres -f db/distributed/fdw_demo.sql
-- ============================================================
\set ON_ERROR_STOP on
\pset pager off

-- 1) Remote site: a separate database with its own data --------------------
DROP DATABASE IF EXISTS bloodbank_ahm WITH (FORCE);
CREATE DATABASE bloodbank_ahm;
\connect bloodbank_ahm

CREATE TABLE site_stock (
    branch_name     text NOT NULL,
    blood_group     text NOT NULL,
    component       text NOT NULL,
    units_available int  NOT NULL CHECK (units_available >= 0),
    nearest_expiry  date
);
INSERT INTO site_stock VALUES
    ('Ahmedabad Central', 'O-',  'RED_CELLS',  6, current_date + 12),
    ('Ahmedabad Central', 'O+',  'RED_CELLS', 14, current_date +  9),
    ('Ahmedabad Central', 'B+',  'RED_CELLS',  9, current_date + 20),
    ('Ahmedabad Central', 'A+',  'PLATELETS',  3, current_date +  2),
    ('Ahmedabad Central', 'AB-', 'PLASMA',     5, current_date + 200);
GRANT SELECT ON site_stock TO bb_owner;

-- 2) Main site: connect to the remote database through postgres_fdw ---------
\connect bloodbank

CREATE EXTENSION IF NOT EXISTS postgres_fdw;

CREATE SERVER ahm_site
    FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (host 'localhost', port '5432', dbname 'bloodbank_ahm');

CREATE USER MAPPING FOR PUBLIC SERVER ahm_site
    OPTIONS (user 'bb_owner', password 'owner_pw');

SET ROLE bb_owner;

CREATE FOREIGN TABLE ahm_site_stock (
    branch_name     text,
    blood_group     text,
    component       text,
    units_available int,
    nearest_expiry  date
) SERVER ahm_site OPTIONS (schema_name 'public', table_name 'site_stock');

GRANT SELECT ON ahm_site_stock TO bb_admin, bb_officer, bb_auditor;

-- a view that merges both sites (local stock + remote stock)
CREATE VIEW v_network_inventory AS
SELECT 'Surat (local)'::text AS site, branch_name, blood_group::text AS blood_group,
       component::text AS component, units_available, nearest_expiry
FROM v_inventory
UNION ALL
SELECT 'Ahmedabad (remote)', branch_name, blood_group, component,
       units_available, nearest_expiry
FROM ahm_site_stock;

GRANT SELECT ON v_network_inventory TO bb_admin, bb_officer, bb_auditor;

-- 3) Demonstration queries ----------------------------------------------------
-- a) data read from the other database
SELECT * FROM ahm_site_stock ORDER BY blood_group;

-- b) one query across both sites: network-wide stock per blood group
SELECT blood_group, sum(units_available) AS units_network,
       count(DISTINCT site) AS sites_reporting
FROM v_network_inventory
GROUP BY blood_group
ORDER BY units_network DESC;

-- c) proof that the remote part is a "Foreign Scan" (shown in the plan)
EXPLAIN (VERBOSE, COSTS OFF)
SELECT blood_group, sum(units_available) FROM ahm_site_stock GROUP BY blood_group;

RESET ROLE;