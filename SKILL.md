---
name: entrega
description: Monta o pacote de uma rodada do sistema Drogarema (zip das telas alteradas + SQL), confere o JavaScript, faz o commit só local e escreve as instruções para o Alexandre subir. Use ao final de cada rodada de mudanças.
disable-model-invocation: true
---

# /entrega — pacote da rodada

Argumento opcional: o nome da rodada (ex.: `DG`). Sem argumento, use a letra seguinte à última entrega (veja `git log` e a pasta de entregas no scratchpad).

1. **Arquivos mudados**: `git status --short` na raiz do repositório. Separe telas/JS (vão no zip) e SQL (vai à parte; SQL não fica no repositório).
2. **Conferir o JavaScript** de cada `.html`/`.js` mudado: extraia os `<script>` sem `src` e rode `node --check`. Erro = pare e corrija antes de seguir.
3. **Versões**: se mudou um script compartilhado (`fluxo_core.js`, `pendencias_core.js`, `menu.js`…), suba o `?v=` em todas as telas que o carregam (o `menu.js` tem a versão dentro de `acesso.js`) e inclua essas telas no zip.
4. **SQL da rodada** (se houver): cabeçalho com a rodada, a data e o que faz em linguagem simples; "Rodar inteiro no SQL Editor"; conferência `select` no fim. Revise com o subagente `revisor-sql-supabase` antes de entregar.
5. **Montar** `pacote_<RODADA>_github.zip` no scratchpad, em `entrega/`, só com os arquivos mudados (sem pastas).
6. **Commit só local** (`git add -A && git commit`). NUNCA push: o hook bloqueia e a regra do projeto proíbe sem o OK do Alexandre.
7. **Enviar** os arquivos com SendUserFile e escrever o resumo curto:
   - o que mudou, na linguagem do usuário (sem nomes de função);
   - ordem: rodar o SQL (se houver) → subir os N arquivos → esperar a publicação ficar verde em Actions → fechar e abrir de novo a aba da tela;
   - o que foi testado e o que não foi (ex.: "testado com dados simulados").
