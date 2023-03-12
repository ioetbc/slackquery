export const DBSchemaSQL = `SELECT table_name || '(' || string_agg(column_name || ': ' || data_type, ', ') || ')'
FROM information_schema.columns
WHERE table_catalog = 'postgres' AND table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;`;
