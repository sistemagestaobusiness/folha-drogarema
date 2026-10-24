-- =====================================================================
-- DE · Segurança do banco, rodada 1: quem pode executar as funções (24/10/2026)
-- Rodar inteiro no SQL Editor. Não altera dados (nenhum lançamento, cadastro ou valor muda).
--  1. Sem login (anon) ninguém executa mais nenhuma função do sistema. As telas só chamam funções depois do login.
--  2. Funções novas daqui para frente também nascem fechadas para quem não fez login.
--  3. Funções de uso interno (chamadas só por outras funções do banco, nunca pelas telas) deixam de poder ser
--     chamadas direto por usuário logado. O script pula sozinho qualquer uma que esteja numa regra de tabela,
--     numa view ou dentro de uma função comum — nesses casos ela precisa continuar liberada.
-- No fim mostra o que foi fechado e o que ficou liberado (e por quê).
-- Para desfazer: ver o bloco "DESFAZER" no final (comentado).
-- =====================================================================

-- 1. ninguém sem login executa funções do schema public
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;

-- 2. funções criadas daqui para frente: idem
alter default privileges in schema public revoke execute on functions from public, anon;
alter default privileges in schema public grant execute on functions to authenticated, service_role;

-- 3. funções internas (nenhuma tela chama): fecha também para usuário logado, se for seguro
drop table if exists _de_resultado;
create temp table _de_resultado (funcao text, situacao text, motivo text);
do $$
declare
  alvo text[] := array['fn_adiant_desfazer','fn_adiant_lancar','fn_adiant_valores','fn_decimo_itens','fn_decimo_posicao',
    'fn_decimo_saldo_antecipacao','fn_evento_pagamento_extra','fn_loja_funcionario','fn_pagext_sincronizar_data','fn_plano_lancar',
    'fn_plano_valores','fn_vt_desfazer','fn_vt_lancar','fn_vt_lancar_desconto','rls_auto_enable','fn_holerite_elegivel',
    'fn_competencia_do_fato','fn_pagext_decimo','fn_evento_pagamento_meio','fn_decimo_trava_pagamento','fn_item_pago'];
  f record; motivo text;
begin
  for f in select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) args, p.prorettype = 'trigger'::regtype eh_gatilho
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = any(alvo) loop
    motivo := null;
    if f.eh_gatilho then motivo := 'é gatilho (não dá para chamar pela API; fica como está)';
    elsif exists (select 1 from pg_policies pl where coalesce(pl.qual, '') ~ ('\m' || f.proname || '\M') or coalesce(pl.with_check, '') ~ ('\m' || f.proname || '\M'))
      then motivo := 'usada em regra de tabela (RLS)';
    elsif exists (select 1 from pg_views v where v.schemaname = 'public' and v.definition ~ ('\m' || f.proname || '\M'))
      then motivo := 'usada em view';
    elsif exists (select 1 from pg_proc q join pg_namespace m on m.oid = q.pronamespace
                   where m.nspname = 'public' and not q.prosecdef and q.oid <> f.oid and q.prokind = 'f'
                     and pg_get_functiondef(q.oid) ~ ('\m' || f.proname || '\M'))
      then motivo := 'chamada por função comum (roda com o usuário)';
    end if;
    if motivo is null then
      execute format('revoke execute on function public.%I(%s) from authenticated', f.proname, f.args);
      insert into _de_resultado values (f.proname || '(' || f.args || ')', 'FECHADA para usuário logado', 'só outras funções do banco chamam');
    else
      insert into _de_resultado values (f.proname || '(' || f.args || ')', 'continua liberada', motivo);
    end if;
  end loop;
end $$;

-- conferência
select * from _de_resultado
union all
select 'anon executa alguma função do public?', case when count(*) = 0 then 'NÃO ✓' else count(*)::text || ' ainda' end, ''
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.prokind = 'f' and has_function_privilege('anon', p.oid, 'execute')
order by 2, 1;

-- DESFAZER (se alguma tela der "permission denied for function ..."): rodar só a linha abaixo, trocando o nome
-- grant execute on function public.NOME_DA_FUNCAO to authenticated;
