-- =====================================================================
-- DF · Segurança do banco, rodada 2 (24/10/2026)
-- Rodar inteiro no SQL Editor. Não altera dados.
--  1. Confere se alguma função fechada na rodada 1 é usada em valor padrão de coluna ou em regra de validação
--     da tabela (aí ela precisa continuar liberada para o usuário logado) e libera de volta só essas.
--  2. Regras de tabela que valiam para "public" passam a valer só para usuário logado (a regra em si não muda).
--  3. fn_funcionarios_aplicar_rescisoes passa a exigir usuário com perfil ativo no sistema.
--  4. Mostra quais funções o anônimo ainda executa (e quem é o dono) para a próxima conferência.
-- =====================================================================

-- 1. segurança da rodada 1: valor padrão de coluna / check / índice que usa função fechada
drop table if exists _df_resultado;
create temp table _df_resultado (item text, objeto text, situacao text);
do $$
declare f record; usado text;
begin
  for f in select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) args
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.prokind = 'f' and not has_function_privilege('authenticated', p.oid, 'execute') loop
    usado := null;
    select string_agg(distinct x, ', ') into usado from (
      select 'padrão da coluna ' || c.relname || '.' || a.attname x
        from pg_attrdef d join pg_class c on c.oid = d.adrelid join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
       where pg_get_expr(d.adbin, d.adrelid) ~ ('\m' || f.proname || '\M')
      union all
      select 'validação ' || c.relname || '.' || k.conname
        from pg_constraint k join pg_class c on c.oid = k.conrelid
       where k.contype = 'c' and pg_get_constraintdef(k.oid) ~ ('\m' || f.proname || '\M')
      union all
      select 'índice ' || i.indexname from pg_indexes i where i.schemaname = 'public' and i.indexdef ~ ('\m' || f.proname || '\M')) z;
    if usado is not null then
      execute format('grant execute on function public.%I(%s) to authenticated', f.proname, f.args);
      insert into _df_resultado values ('liberada de novo (usada pela tabela)', f.proname || '(' || f.args || ')', usado);
    else
      insert into _df_resultado values ('continua fechada para usuário logado', f.proname || '(' || f.args || ')', 'ok');
    end if;
  end loop;
end $$;

-- 2. regras "to public" → "to authenticated" (mesma condição)
do $$
declare p record;
begin
  for p in select schemaname, tablename, policyname from pg_policies
            where schemaname = 'public' and roles && array['public', 'anon']::name[] loop
    execute format('alter policy %I on %I.%I to authenticated', p.policyname, p.schemaname, p.tablename);
    insert into _df_resultado values ('regra passa a valer só com login', p.tablename || ' · ' || p.policyname, 'ok');
  end loop;
end $$;

-- 3. rescisões: exige perfil ativo (antes qualquer login podia disparar)
create or replace function public.fn_funcionarios_aplicar_rescisoes() returns integer
language plpgsql security definer set search_path = public as $function$
declare n integer;
begin
  if not public.usuario_autorizado() then raise exception 'Sem acesso.'; end if;
  update public.funcionarios set status = 'INATIVO'
   where data_rescisao is not null and data_rescisao <= current_date and upper(coalesce(status,'')) <> 'INATIVO';
  get diagnostics n = row_count;
  return n;
end $function$;
revoke execute on function public.fn_funcionarios_aplicar_rescisoes() from public, anon;
grant execute on function public.fn_funcionarios_aplicar_rescisoes() to authenticated;

-- 4. o que o anônimo ainda executa
insert into _df_resultado
select 'anon ainda executa', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', 'dono: ' || pg_get_userbyid(p.proowner)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.prokind = 'f' and has_function_privilege('anon', p.oid, 'execute');

select * from _df_resultado order by 1, 2;
