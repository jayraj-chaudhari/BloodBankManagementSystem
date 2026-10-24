\set ON_ERROR_STOP on
\pset format csv
\o db/docs/data_dictionary.csv
SELECT c.relname AS table_name, a.attnum AS pos, a.attname AS column_name,
       format_type(a.atttypid, a.atttypmod) AS data_type,
       CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS nullable,
       coalesce(pg_get_expr(d.adbin, d.adrelid),
                CASE a.attidentity WHEN 'a' THEN 'identity' END) AS default_value,
       (SELECT string_agg(CASE k.contype WHEN 'p' THEN 'PK' WHEN 'u' THEN 'UNIQUE'
                                         WHEN 'f' THEN 'FK -> ' || k.confrelid::regclass END,
                          ', ' ORDER BY k.contype)
          FROM pg_constraint k
         WHERE k.conrelid = c.oid AND a.attnum = ANY (k.conkey)
           AND k.contype IN ('p', 'u', 'f')) AS keys,
       obj_description(c.oid, 'pg_class') AS table_description
FROM pg_class c
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
WHERE c.relnamespace = 'public'::regnamespace
  AND c.relkind IN ('r', 'p') AND NOT c.relispartition
ORDER BY c.relname, a.attnum;
\o
\pset format aligned
SELECT 'db/docs/data_dictionary.csv written' AS status;
