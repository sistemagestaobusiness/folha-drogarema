# Sistema Drogarema (Business) · instruções para o Claude

Sistema de RH, folha e financeiro da Drogarema. Telas HTML com JavaScript puro (sem build, sem testes automáticos), banco no Supabase, publicação pelo GitHub Pages (`sistemagestaobusiness/folha-drogarema`). Dono: Alexandre (perfil GESTOR).

## Regras que não se quebram
- **Nunca** enviar nada ao GitHub (push, merge, branch, exclusão) sem o OK explícito do Alexandre para aquela entrega. O hook `.claude/hooks/bloquear_push.py` barra o push.
- **Nunca** alterar banco ou dados (SQL, lançamentos) sem autorização formal para aquela ação. Consulta só de leitura pode.
- Commit só local, para a cópia bater com o que foi entregue.

## Como uma entrega funciona (desde 21/10/2026, conectores do GitHub e do Supabase desligados)
1. O Claude altera as telas aqui e testa (abaixo).
2. Monta `pacote_<RODADA>_github.zip` só com os arquivos mudados e, se houver banco, um `<RODADA>_<assunto>.sql`. Rodadas em ordem: CS, CT, CU… DA, DB… (use `/entrega`).
3. O Alexandre roda o SQL no SQL Editor e sobe os arquivos no GitHub.
4. Lembrar: a publicação do GitHub Pages leva de 1 a 15 min (aba Actions, ✓ verde) e a aba da tela no sistema guarda a versão antiga, então é preciso fechar e abrir de novo pelo menu.
5. Dados do banco: o Claude escreve a consulta, o Alexandre cola o resultado (CSV).

## Banco (Supabase)
- O SQL Editor roda o script inteiro como uma coisa só: qualquer erro desfaz tudo. Conferência no fim do script com `select`.
- No SQL Editor não há usuário logado: funções que checam perfil (`fn_acessa_tela`, `perfil_usuario`) dão "Sem acesso" lá.
- `DELETE` precisa de `WHERE` (safeupdate): `delete from t where id is not null`.
- PL/pgSQL: qualificar colunas (`c.plano`) e não usar alias igual ao nome de variável.
- Função nova: `security definer` só com checagem de perfil por dentro + `set search_path = public`; `revoke execute ... from public, anon; grant ... to authenticated`. Desde 24/10/2026 nenhuma função do sistema executa sem login (ver `claude/mapa_seguranca_v1.md` no projeto).
- Regra de tabela nova: `to authenticated`, nunca `using (true)`. Tabelas fin_* usam `fn_acessa_tela('<tela>.html')`.
- Telas e perfis: tabelas `telas` e `perfil_telas`; tela nova precisa de insert nas duas.
- Leitura com mais de 1.000 linhas: paginar com `.range()` (helpers `tudoTabela` / `rpcTudo`).
- `statement_timeout` do papel authenticated = 120 s.

## Telas
- Todas carregam `acesso.js` (controle por perfil e menu), menos `login.html`. O que a tela bloqueia é conforto; a proteção real é o banco.
- Script compartilhado vai com versão no nome (`fluxo_core.js?v=6`, `menu.js?v=26` dentro de `acesso.js`): subir a versão ao alterar.
- Lançamentos usa sempre o período ABERTO (tabela `competencias`), não o mês do Painel.
- Telas antigas sem uso: `folha.html`, `pagamentos_extras.html`, `financeiro_freelance.html`.
- Textos em português, datas dd/mm/aaaa, valores 1.234,56.

## Testar antes de entregar
- `node --check` no script de cada tela alterada (o hook `checar_js.py` faz isso ao editar).
- Para ver a tela: Playwright com o Chromium do ambiente e um Supabase simulado (substituir o `<script>` do supabase-js por um mock com `from().select()...range()` e `rpc()`), com `page.clock.setFixedTime` para a data.

## Documentação no projeto do claude.ai (Drogarema)
`claude/backlog_pendencias.md` (o que falta), `claude/mapa_seguranca_v1.md` (mapa e segurança), históricos de entregas.
