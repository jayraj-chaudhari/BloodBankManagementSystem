WITH roles(r) AS (VALUES ('bb_admin'),('bb_officer'),('bb_lab_tech'),('bb_hospital'),('bb_donor'),('bb_auditor')),
tabs AS (SELECT c.oid, c.relname FROM pg_class c
          WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r','p') AND NOT c.relispartition),
checks(ok, label) AS (
          SELECT NOT EXISTS (SELECT 1 FROM roles, tabs WHERE has_table_privilege(r::name, tabs.oid, 'DELETE')
                              AND NOT (r = 'bb_admin' AND relname IN ('branch','hospital'))), 'DELETE only admin on branch/hospital'
UNION ALL SELECT NOT EXISTS (SELECT 1 FROM tabs WHERE has_any_column_privilege('bb_app', tabs.oid, 'SELECT')), 'bb_app has no table access'
UNION ALL SELECT NOT EXISTS (SELECT 1 FROM roles WHERE has_column_privilege(r::name, 'app_user', 'password_hash', 'SELECT')), 'nobody reads password_hash'
UNION ALL SELECT NOT EXISTS (SELECT 1 FROM tabs WHERE has_any_column_privilege('bb_auditor', tabs.oid, 'INSERT')
                              OR has_any_column_privilege('bb_auditor', tabs.oid, 'UPDATE')), 'auditor is read-only'
UNION ALL SELECT NOT has_any_column_privilege('bb_officer', 'screening_result', 'SELECT'), 'officer cannot read screening'
UNION ALL SELECT has_table_privilege('bb_lab_tech', 'screening_result', 'SELECT')
              AND has_any_column_privilege('bb_lab_tech', 'screening_result', 'INSERT'), 'lab reads and writes screening'
UNION ALL SELECT NOT has_any_column_privilege('bb_hospital', 'donor', 'SELECT'), 'hospital cannot read donor'
UNION ALL SELECT has_column_privilege('bb_hospital', 'hospital', 'phone', 'UPDATE')
              AND NOT has_column_privilege('bb_hospital', 'hospital', 'is_verified', 'UPDATE'), 'hospital edits phone, not is_verified'
UNION ALL SELECT has_column_privilege('bb_donor', 'donor', 'is_available', 'UPDATE')
              AND NOT has_column_privilege('bb_donor', 'donor', 'blood_group', 'UPDATE'), 'donor edits availability, not blood group'
UNION ALL SELECT NOT has_any_column_privilege('bb_donor', 'blood_unit', 'SELECT'), 'donor cannot read units'
UNION ALL SELECT NOT has_column_privilege('bb_lab_tech', 'blood_unit', 'status', 'UPDATE'), 'lab cannot change unit status'
UNION ALL SELECT has_table_privilege('bb_hospital', 'v_public_inventory', 'SELECT')
              AND NOT has_table_privilege('bb_hospital', 'v_inventory', 'SELECT'), 'hospital sees only public inventory'
UNION ALL SELECT has_function_privilege('bb_officer', 'fn_allocate_fefo'::regproc, 'EXECUTE')
              AND NOT has_function_privilege('bb_hospital', 'fn_allocate_fefo'::regproc, 'EXECUTE'), 'only officer allocates'
UNION ALL SELECT has_function_privilege('bb_app', 'fn_register_donor'::regproc, 'EXECUTE')
              AND has_function_privilege('bb_app', 'fn_auth_lookup'::regproc, 'EXECUTE')
              AND NOT has_function_privilege('bb_officer', 'fn_register_donor'::regproc, 'EXECUTE')
              AND NOT has_function_privilege('bb_officer', 'fn_auth_lookup'::regproc, 'EXECUTE'), 'auth functions only for bb_app'
UNION ALL SELECT has_function_privilege('bb_officer', 'fn_decrypt_text'::regproc, 'EXECUTE')
              AND has_function_privilege('bb_donor', 'fn_decrypt_text'::regproc, 'EXECUTE')
              AND NOT has_function_privilege('bb_admin', 'fn_decrypt_text'::regproc, 'EXECUTE'), 'decrypt: officer and donor only'
)
SELECT bool_and(ok) AS all_ok, string_agg(label, '; ') FILTER (WHERE NOT ok) AS failures FROM checks;