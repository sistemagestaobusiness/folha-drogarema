---
name: auditoria-banco
description: Conferência de segurança do banco Supabase do sistema Drogarema por SQL só de leitura (RLS, acesso sem login, funções security definer, storage, logins sem perfil). Use depois de rodadas grandes de SQL ou quando o Alexandre pedir revisão de segurança.
disable-model-invocation: true
---

# /auditoria-banco

1. Entregue `sql/DD2_auditoria_seguranca_SO_LEITURA.sql` (não altera nada) para o Alexandre rodar no SQL Editor e pedir o CSV.
2. Leia o CSV (colunas risco, item, objeto, detalhe) e classifique:
   - **ALTO**: tabela sem RLS, anon com acesso a tabela, regra aberta (`true`) de gravação, função `security definer` sem checagem que o anon executa, bucket público.
   - **MÉDIO**: `security definer` sem checagem executável por usuário logado, regra `to public`, login sem perfil.
   - Esperado e sem risco: `unaccent*` (dono supabase_admin) ainda executável por anon.
3. Para funções que as telas chamam, peça o texto com uma consulta `pg_get_functiondef` (modelo no DD3 do histórico) antes de concluir: muitas checam o perfil por funções auxiliares (`fn_cad_eu`, `usuario_autorizado`).
4. Correções: um SQL por rodada, sem alterar dados, com conferência no fim. Modelos em `sql/DE_seguranca_funcoes.sql` (fechar funções para anon e as internas para logado, pulando as usadas em RLS, views e funções comuns) e `sql/DF_seguranca_rodada2.sql` (padrão de coluna/validação, regras `to authenticated`).
5. Registrar o resultado no projeto, em `claude/mapa_seguranca_v1.md` (nova seção com a data).
6. Lembrar os itens que o SQL não alcança: cadastro de novos usuários desligado em Authentication, senha mínima, URLs de redirecionamento, Security Advisor.
