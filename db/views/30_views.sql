-- ============================================================
-- db/views/30_views.sql
-- Run as bb_owner AFTER 22_procedures.sql:
--   psql "postgresql://bb_owner:owner_pw@localhost:5432/bloodbank" -f db/views/30_views.sql
-- ============================================================
\set ON_ERROR_STOP on

-- Pre-create gap days function in case views run before triggers
CREATE OR REPLACE FUNCTION fn_donation_gap_days(p_gender character)
RETURNS int LANGUAGE sql IMMUTABLE
AS $$ SELECT CASE WHEN p_gender = 'F' THEN 120 ELSE 90 END $$;

\pset pager off

-- 1) Hospital-safe stock counts (aggregates only; owner's rights on purpose)
CREATE OR REPLACE VIEW v_public_inventory AS
SELECT b.branch_id, b.branch_name, b.region_code,
       dn.blood_group, u.component,
       count(*)::int AS units_available
FROM blood_unit u
JOIN donation d ON d.donation_id = u.donation_id
JOIN donor dn   ON dn.donor_id   = d.donor_id
JOIN branch b   ON b.branch_id   = d.branch_id
WHERE u.status = 'AVAILABLE'
  AND u.expires_on >= (now() AT TIME ZONE 'Asia/Kolkata')::date
GROUP BY b.branch_id, b.branch_name, b.region_code, dn.blood_group, u.component;

-- 2) Full inventory for staff
CREATE OR REPLACE VIEW v_inventory AS
SELECT b.branch_id, b.branch_name, b.region_code,
       dn.blood_group, u.component,
       count(*) FILTER (WHERE u.status = 'AVAILABLE'
             AND u.expires_on >= (now() AT TIME ZONE 'Asia/Kolkata')::date)::int AS units_available,
       count(*) FILTER (WHERE u.status = 'QUARANTINE')::int                       AS units_quarantine,
       count(*) FILTER (WHERE u.status = 'RESERVED')::int                         AS units_reserved,
       min(u.expires_on) FILTER (WHERE u.status = 'AVAILABLE')                    AS nearest_expiry,
       count(*) FILTER (WHERE u.status = 'AVAILABLE'
             AND u.expires_on BETWEEN (now() AT TIME ZONE 'Asia/Kolkata')::date
                                  AND (now() AT TIME ZONE 'Asia/Kolkata')::date + 7)::int AS units_expiring_7d
FROM blood_unit u
JOIN donation d ON d.donation_id = u.donation_id
JOIN donor dn   ON dn.donor_id   = d.donor_id
JOIN branch b   ON b.branch_id   = d.branch_id
WHERE u.status IN ('QUARANTINE', 'AVAILABLE', 'RESERVED')
GROUP BY b.branch_id, b.branch_name, b.region_code, dn.blood_group, u.component;

-- 3) Donor eligibility (medical rules only; is_available = willing to be contacted)
CREATE OR REPLACE VIEW v_donor_eligibility AS
SELECT dn.donor_id, dn.blood_group, dn.region_code, dn.gender, dn.is_available,
       l.last_donated_at,
       CASE WHEN l.last_donated_at IS NULL THEN NULL
            ELSE (l.last_donated_at AT TIME ZONE 'Asia/Kolkata')::date
                 + fn_donation_gap_days(dn.gender) END AS next_eligible_on,
       (    date_part('year', age((now() AT TIME ZONE 'Asia/Kolkata')::date, dn.date_of_birth))
                 BETWEEN 18 AND 65
        AND (l.last_donated_at IS NULL
             OR (l.last_donated_at AT TIME ZONE 'Asia/Kolkata')::date
                + fn_donation_gap_days(dn.gender) <= (now() AT TIME ZONE 'Asia/Kolkata')::date)
       ) AS is_eligible
FROM donor dn
LEFT JOIN (SELECT donor_id, max(donated_at) AS last_donated_at
             FROM donation GROUP BY donor_id) l ON l.donor_id = dn.donor_id;

-- 4) Request summary (caller's own RLS applies: security_invoker)
CREATE OR REPLACE VIEW v_request_summary WITH (security_invoker = true) AS
SELECT r.request_id, r.hospital_id, h.hospital_name,
       r.blood_group, r.component, r.units_needed,
       (SELECT count(*)::int FROM request_allocation a
         WHERE a.request_id = r.request_id) AS units_allocated,
       r.urgency, r.status, r.needed_by, r.created_at, r.updated_at
FROM blood_request r
JOIN hospital h ON h.hospital_id = r.hospital_id;

COMMENT ON VIEW v_public_inventory IS 'Hospital-safe counts of unexpired AVAILABLE units per branch, group and component.';
COMMENT ON VIEW v_inventory        IS 'Full stock picture for staff: status counts, nearest expiry, units expiring within 7 days.';
COMMENT ON VIEW v_donor_eligibility IS 'Per-donor last donation, next eligible date and medical eligibility today.';
COMMENT ON VIEW v_request_summary  IS 'Blood requests with hospital name and allocated unit count (security_invoker).';

-- Smoke tests: expect 4 views, then 4 rows of "0 | ok" on an empty database
SELECT viewname FROM pg_views WHERE schemaname = 'public' ORDER BY 1;
SELECT 'public_inv' AS v, count(*) FROM v_public_inventory
UNION ALL SELECT 'inventory', count(*) FROM v_inventory
UNION ALL SELECT 'eligibility', count(*) FROM v_donor_eligibility
UNION ALL SELECT 'req_summary', count(*) FROM v_request_summary;