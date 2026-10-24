-- ============================================================
-- db/seed/60_lookups.sql
-- Run as bb_owner AFTER 51_rls.sql:
--   psql "postgresql://bb_owner:owner_pw@localhost:5432/bloodbank" -f db/seed/60_lookups.sql
-- ============================================================
\set ON_ERROR_STOP on
\pset pager off

INSERT INTO region (region_code, region_name) VALUES
    ('SUR', 'Surat'),
    ('AHM', 'Ahmedabad'),
    ('VAD', 'Vadodara'),
    ('RAJ', 'Rajkot')
ON CONFLICT DO NOTHING;

INSERT INTO role_def (role_name, db_role, clearance, description) VALUES
    ('admin',         'bb_admin',    2, 'System administrator: manages users, branches and hospitals'),
    ('bb_officer',    'bb_officer',  2, 'Blood bank officer: donations, inventory, requests, allocation'),
    ('lab_tech',      'bb_lab_tech', 3, 'Laboratory technician: enters restricted screening results'),
    ('hospital_user', 'bb_hospital', 1, 'Hospital staff: places and tracks blood requests'),
    ('donor',         'bb_donor',    1, 'Registered donor: own profile, donations and alerts'),
    ('auditor',       'bb_auditor',  2, 'Read-only auditor: stock, requests and audit trail')
ON CONFLICT DO NOTHING;

INSERT INTO component_spec (component, shelf_life_days, storage_note) VALUES
    ('WHOLE_BLOOD', 35,  'Refrigerated at 2-6 C'),
    ('RED_CELLS',   42,  'Refrigerated at 2-6 C'),
    ('PLASMA',      365, 'Frozen at -30 C or colder'),
    ('PLATELETS',   5,   'Room temperature 20-24 C with continuous agitation')
ON CONFLICT DO NOTHING;

-- Smoke tests: expect 4 | 6 | 4, then 0 missing DB roles ----------------------
SELECT (SELECT count(*) FROM region)         AS regions,
       (SELECT count(*) FROM role_def)       AS roles,
       (SELECT count(*) FROM component_spec) AS components;

SELECT count(*) AS role_defs_without_db_role
FROM role_def r
WHERE NOT EXISTS (SELECT 1 FROM pg_roles p WHERE p.rolname = r.db_role);