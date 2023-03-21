export const DB_SQL = `SELECT 
    c.table_name || '(' ||
    json_agg(
        json_build_object(
            c.column_name, 
            json_build_object(
                'type', c.udt_name,
                'foreignKey', kcu.constraint_name
            )
        )
    ) || ')' AS table_schema
FROM 
    information_schema.columns c 
    LEFT JOIN information_schema.key_column_usage kcu 
        ON c.table_name = kcu.table_name 
        AND c.column_name = kcu.column_name 
    LEFT JOIN information_schema.table_constraints tc 
        ON kcu.constraint_name = tc.constraint_name 
WHERE 
    c.table_schema = 'public' 
GROUP BY 
    c.table_name;
`;
