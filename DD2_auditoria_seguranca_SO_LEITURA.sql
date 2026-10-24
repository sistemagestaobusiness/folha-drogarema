-- =====================================================================
-- DD2 · Auditoria de segurança do banco · SÓ LEITURA (24/10/2026) · versão com nomes das colunas
-- Não altera nada. Rodar inteiro no SQL Editor e copiar o resultado (todas as linhas) para o Claude.
-- Cada linha é um ponto a conferir: risco ALTO / MEDIO / INFO.
-- =====================================================================
with
-- 1. tabelas do schema public sem RLS (qualquer usuário logado lê e grava tudo)
sem_rls as (
  select 'ALTO' risco, 'tabela sem RLS' item, c.relname objeto, '' detalhe
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
-- 2. tabelas que o anônimo (sem login) pode acessar
anon_tab as (
  select 'ALTO', 'anon tem acesso à tabela', table_name, string_agg(privilege_type, ', ' order by privilege_type)
  from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public' group by table_name),
-- 3. políticas abertas: using/with check = true (vale para qualquer usuário logado, inclusive cadastro novo)
pol_abertas as (
  select case when p.cmd in ('INSERT','UPDATE','DELETE','ALL') then 'ALTO' else 'MEDIO' end,
         'política aberta (true)', p.tablename, p.policyname || ' · ' || p.cmd || ' · para ' || array_to_string(p.roles, ',')
  from pg_policies p where p.schemaname = 'public'
    and (coalesce(trim(p.qual), '') in ('true', '(true)') or coalesce(trim(p.with_check), '') in ('true', '(true)'))),
-- 4. políticas que valem para anon/public
pol_anon as (
  select case when coalesce(p.qual, p.with_check, '') ~* '(perfil_usuario|fn_acessa_tela|auth\.uid|auth\.jwt|fn_minha_ficha)' then 'MEDIO' else 'ALTO' end,
         'política vale sem login (to public)', p.tablename, p.policyname || ' · ' || p.cmd || ' · ' || left(coalesce(p.qual, p.with_check, ''), 160)
  from pg_policies p where p.schemaname = 'public' and (p.roles && array['anon','public']::name[])),
-- 5. funções SECURITY DEFINER (rodam com poder de dono) sem checagem de perfil/tela/usuário no corpo
fn_definer as (
  select case when has_function_privilege('anon', p.oid, 'execute') then 'ALTO' else 'MEDIO' end,
         'função security definer sem checagem de acesso', p.proname,
         'anon executa: ' || case when has_function_privilege('anon', p.oid, 'execute') then 'SIM' else 'não' end
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef and p.prokind = 'f'
    and pg_get_functiondef(p.oid) !~* '(perfil_usuario|fn_acessa_tela|auth\.uid|auth\.jwt|fn_meu_usuario|fn_minha_ficha)'
    and p.proname !~ '^(perfil_usuario|fn_acessa_tela|fn_meu_usuario|fn_minha_ficha|fn_minhas_telas)$'),
-- 6. funções que o anônimo pode executar (todas, para conferir)
fn_anon as (
  select 'MEDIO', 'anon pode executar a função', p.proname, case when p.prosecdef then 'security definer' else 'invoker' end
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f' and has_function_privilege('anon', p.oid, 'execute')
    and p.proname !~ '^(perfil_usuario|fn_acessa_tela)$'),
-- 7. buckets de arquivos públicos (link aberto sem login)
bk as (
  select case when b.public then 'ALTO' else 'INFO' end, 'bucket de arquivos', b.id,
         case when b.public then 'PÚBLICO: qualquer um com o link baixa' else 'privado' end
  from storage.buckets b),
-- 8. políticas do storage
pol_storage as (
  select case when coalesce(trim(p.qual), '') in ('true','(true)') or coalesce(trim(p.with_check), '') in ('true','(true)') then 'ALTO' else 'INFO' end,
         'política do storage', p.policyname, p.cmd || ' · ' || coalesce(left(p.qual, 120), left(p.with_check, 120), '')
  from pg_policies p where p.schemaname = 'storage'),
-- 9. usuários do Auth sem perfil ativo no sistema (cadastro aberto deixaria entrar qualquer e-mail)
sem_perfil as (
  select 'MEDIO', 'login sem perfil no sistema', u.email, 'criado em ' || to_char(u.created_at, 'DD/MM/YYYY') || ' · último acesso ' || coalesce(to_char(u.last_sign_in_at, 'DD/MM/YYYY'), 'nunca')
  from auth.users u
  where not exists (select 1 from public.usuarios_sistema s where lower(s.email) = lower(u.email) and coalesce(s.ativo, true))),
-- 10. resumo
resumo as (
  select 'INFO'::text as risco, 'resumo'::text as item, 'tabelas public'::text as objeto, count(*)::text || ' tabelas · ' || count(*) filter (where c.relrowsecurity)::text || ' com RLS' as detalhe
  from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r')
select * from resumo
union all select * from sem_rls
union all select * from anon_tab
union all select * from pol_anon
union all select * from pol_abertas
union all select * from fn_definer
union all select * from fn_anon
union all select * from bk
union all select * from pol_storage
union all select * from sem_perfil
order by 1, 2, 3;
