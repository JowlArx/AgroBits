-- T-29 AC1 — device_tokens: el token se guarda solo como hash único y sin acceso para anon.
-- Suite de solo lectura (catálogo): solo SELECT, sin datos de prueba ni escrituras.
-- Ejecución: vía MCP (execute_sql). Resultado esperado: todas las filas en true.

select 'rls_habilitado' as prueba,
       (select relrowsecurity from pg_class where oid = 'public.device_tokens'::regclass) as ok
union all
select 'token_hash_unico',
       exists (
         select 1 from pg_constraint
         where conrelid = 'public.device_tokens'::regclass
           and contype = 'u'
           and pg_get_constraintdef(oid) ilike '%(token_hash)%'
       )
union all
select 'token_hash_formato_sha256',
       exists (
         select 1 from pg_constraint
         where conrelid = 'public.device_tokens'::regclass
           and contype = 'c'
           and pg_get_constraintdef(oid) ilike '%[0-9a-f]{64}%'
       )
union all
select 'sin_policy_para_anon_ni_public',
       not exists (
         select 1 from pg_policies
         where schemaname = 'public'
           and tablename = 'device_tokens'
           and ('anon' = any(roles) or 'public' = any(roles))
       )
union all
select 'anon_sin_privilegios_de_tabla',
       not has_table_privilege('anon', 'public.device_tokens', 'SELECT')
       and not has_table_privilege('anon', 'public.device_tokens', 'INSERT')
       and not has_table_privilege('anon', 'public.device_tokens', 'UPDATE')
       and not has_table_privilege('anon', 'public.device_tokens', 'DELETE');
