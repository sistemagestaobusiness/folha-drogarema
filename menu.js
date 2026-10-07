// =====================================================================
// MENU LATERAL ÚNICO DO SISTEMA (carregado pelo acesso.js em todas as telas,
// menos login e as duas telas de importação, que ficam como estão).
// - Monta o menu à esquerda só com as telas que o usuário pode abrir.
// - Tira do cabeçalho de cada tela os atalhos repetidos (Painel, Sair e botões
//   para telas que já estão no menu); o aviso numérico do botão vai para o menu.
// - Uniformiza fundo e fonte.
// Para incluir uma tela nova no menu: acrescentar em GRUPOS.
// =====================================================================
(function () {
  if (window.__menuSistema || !window.ACESSO) return; window.__menuSistema = true;
  const PAGINA = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const MARCA = 'Business';   // nome exibido no topo do menu (o logo entra aqui)
  const GRUPOS = [
    ['', [['index.html', 'Painel', '▦']]],
    ['Folha do mês', [['lancamentos.html', 'Lançamentos', '✎'], ['emprestimos.html', 'Empréstimos', '⇄'], ['abatimentos.html', 'Abatimentos', '−'],
      ['ferias.html', 'Férias', '☼'], ['decimo_terceiro.html', '13º salário', '★'], ['importar_alpha7.html', 'Importar Alpha7', '⇪'], ['importar_consumo_farmacia.html', 'Importar consumo farmácia', '⇪']]],
    ['Loja e jornada', [['freelance_solicitacao.html', 'Solicitações da loja', '✚'], ['supervisor_freelance.html', 'Aprovação do supervisor', '✓'], ['rh_aprovacao_freelance.html', 'Aprovação do RH', '✓'],
      ['escala.html', 'Escala', '▤'], ['banco_horas.html', 'Banco de horas', '◷'], ['cadastro_solicitacoes.html', 'Solicitações de cadastro', '☰'], ['organograma.html', 'Organograma', '⌂']]],
    ['Financeiro', [['financeiro.html', 'Pagamentos', '$']]],
    ['Relatórios', [['resumo_folha.html', 'Resumo da competência', '≡'], ['resumo_diretoria.html', 'Resumo da diretoria', '↗'], ['recibo_pagamento.html', 'Recibos', '▯']]],
    ['Resultado das lojas', [['resultado_loja.html', 'Resultado da loja', '◧'], ['fechamento_financeiro.html', 'Fechamento financeiro', '▣'], ['metas_console.html', 'Metas das lojas', '◎']]],
    ['Cadastros', [['funcionarios.html', 'Funcionários', '☺'], ['empresas.html', 'Empresas e contas', '▥'], ['lojas.html', 'Lojas e setores', '⌂'], ['eventos.html', 'Tipos de eventos', '❖'], ['rubricas.html', 'Rubricas Alpha7', '⇆']]],
    ['Segurança', [['auditoria.html', 'Auditoria', '⚲'], ['perfis.html', 'Perfis e acessos', '⚿']]]
  ];
  const telas = new Set((window.ACESSO.telas || []).map(t => String(t).toLowerCase()));
  const L = 232;

  const css = document.createElement('style');
  css.textContent = `
    html.menu-on body { padding-left: ${L}px; background: #f1f5f9 !important; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    html.menu-on .fixed.inset-x-0 { left: ${L}px; }
    #menuSistema { position: fixed; top: 0; left: 0; bottom: 0; width: ${L}px; background: #fff; z-index: 45; display: flex; flex-direction: column; font-family: inherit; box-shadow: 1px 0 0 #e2e8f0; }
    #menuSistema .marca { padding: 18px 18px 10px; }
    #menuSistema .marca b { display: block; font-size: 17px; font-weight: 800; color: #0f172a; letter-spacing: -.01em; }
    #menuSistema .marca span { font-size: 11px; color: #94a3b8; }
    #menuSistema nav { flex: 1; overflow-y: auto; padding: 4px 10px 12px; }
    #menuSistema .grupo { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #94a3b8; padding: 14px 10px 4px; }
    #menuSistema a.it { display: flex; align-items: center; gap: 9px; padding: 7px 10px; border-radius: 8px; font-size: 13px; color: #475569; text-decoration: none; line-height: 1.2; }
    #menuSistema a.it:hover { background: #f1f5f9; color: #0f172a; }
    #menuSistema a.it.on { background: #0f172a; color: #fff; font-weight: 600; }
    #menuSistema a.it i { width: 16px; text-align: center; font-style: normal; opacity: .65; font-size: 12px; }
    #menuSistema a.it .bolha { margin-left: auto; background: #e11d48; color: #fff; font-size: 10px; font-weight: 700; border-radius: 999px; min-width: 18px; padding: 1px 5px; text-align: center; }
    #menuSistema .pe { padding: 10px 14px 14px; box-shadow: 0 -1px 0 #f1f5f9; font-size: 11px; color: #64748b; }
    #menuSistema .pe .quem { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #334155; }
    #menuSistema .pe button { margin-top: 8px; width: 100%; padding: 7px; border-radius: 8px; background: #f1f5f9; color: #334155; font-size: 12px; font-weight: 600; cursor: pointer; border: 0; }
    #menuSistema .pe button:hover { background: #e2e8f0; }
    #menuAbre { display: none; position: fixed; top: 10px; left: 10px; z-index: 46; width: 36px; height: 36px; border-radius: 8px; background: #0f172a; color: #fff; border: 0; font-size: 16px; cursor: pointer; }
    @media (max-width: 900px) {
      html.menu-on body { padding-left: 0; padding-top: 52px; } html.menu-on .fixed.inset-x-0 { left: 0; }
      #menuSistema { transform: translateX(-100%); transition: transform .15s; box-shadow: 0 0 0 100vmax rgba(15,23,42,0); }
      html.menu-aberto #menuSistema { transform: none; box-shadow: 0 0 0 100vmax rgba(15,23,42,.35); }
      #menuAbre { display: block; }
    }
    @media print { #menuSistema, #menuAbre { display: none !important; } html.menu-on body { padding-left: 0 !important; padding-top: 0 !important; background: #fff !important; } html.menu-on .fixed.inset-x-0 { left: 0; } }
  `;
  (document.head || document.documentElement).appendChild(css);

  function montar() {
    if (document.getElementById('menuSistema')) return;
    const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const corpo = GRUPOS.map(([g, itens]) => { const vis = itens.filter(i => telas.has(i[0])); if (!vis.length) return '';
      return (g ? `<div class="grupo">${g}</div>` : '') + vis.map(([arq, nome, ic]) => `<a class="it ${arq === PAGINA ? 'on' : ''}" href="${arq}" data-menu="${arq}"><i>${ic}</i><span>${nome}</span></a>`).join(''); }).join('');
    const aside = document.createElement('aside'); aside.id = 'menuSistema';
    aside.innerHTML = `<div class="marca"><b>${MARCA}</b><span>Sistema de gestão</span></div><nav>${corpo}</nav>
      <div class="pe"><div class="quem" title="${esc(window.ACESSO.email || '')}">${esc(window.ACESSO.email || '')}</div><div>${esc(window.ACESSO.perfil || '')}</div><button type="button" id="menuSair">Sair</button></div>`;
    document.body.appendChild(aside);
    const abre = document.createElement('button'); abre.id = 'menuAbre'; abre.type = 'button'; abre.textContent = '☰'; abre.setAttribute('aria-label', 'Abrir o menu');
    abre.onclick = () => document.documentElement.classList.toggle('menu-aberto');
    document.body.appendChild(abre);
    aside.addEventListener('click', e => { if (e.target.closest('a.it')) document.documentElement.classList.remove('menu-aberto'); });
    document.documentElement.classList.add('menu-on');
    document.getElementById('menuSair').onclick = async () => {
      try { if (window.ACESSO_CLI) await window.ACESSO_CLI.auth.signOut(); } catch (e) {}
      try { localStorage.removeItem('usuario_drogarema'); } catch (e) {}
      location.replace('login.html');
    };
    const ativo = aside.querySelector('a.it.on'); if (ativo && ativo.scrollIntoView) ativo.scrollIntoView({ block: 'nearest' });
  }

  // tira do cabeçalho da tela os atalhos que o menu já tem (e leva o aviso numérico para o menu)
  function limparCabecalho() {
    const aside = document.getElementById('menuSistema'); if (!aside) return;
    // botão de sair de cada tela: o menu já tem
    document.querySelectorAll('button[onclick^="sair"], button[onclick*="sairSistema"]').forEach(b => { if (!b.closest('#menuSistema')) b.style.setProperty('display', 'none', 'important'); });
    if (PAGINA === 'index.html') return;   // o painel é feito de atalhos: fica como está
    // cabeçalho da tela = o bloco compacto em volta do título (h1); independe do tamanho da janela
    const h1 = document.querySelector('h1'); let cab = null;
    if (h1) { let e = h1.parentElement; for (let k = 0; k < 4 && e && e !== document.body; k++, e = e.parentElement) { if ((e.textContent || '').length <= 700) cab = e; else break; } }
    document.querySelectorAll('a[href]').forEach(a => {
      if (a.closest('#menuSistema') || a.dataset.menuVisto) return;
      const alvo = String(a.getAttribute('href') || '').toLowerCase();
      if (!/^[a-z0-9_]+\.html$/.test(alvo)) return;                    // com ?parâmetros ou externo: é atalho de contexto, fica
      const item = aside.querySelector(`a.it[data-menu="${alvo}"]`); if (!item) return;   // não está no menu: fica
      if (!(cab && cab.contains(a))) return;                             // link no meio do conteúdo: fica
      a.dataset.menuVisto = '1';
      const sincronizar = () => { const n = [...a.querySelectorAll('span')].find(s => /^\d+$/.test(s.textContent.trim()) && !s.classList.contains('hidden') && s.style.display !== 'none');
        let b = item.querySelector('.bolha'); if (n) { if (!b) { b = document.createElement('span'); b.className = 'bolha'; item.appendChild(b); } b.textContent = n.textContent.trim(); } else if (b) b.remove(); };
      sincronizar(); new MutationObserver(sincronizar).observe(a, { childList: true, subtree: true, characterData: true, attributes: true });
      a.style.setProperty('display', 'none', 'important');
    });
  }

  const iniciar = () => { montar(); limparCabecalho(); setTimeout(limparCabecalho, 600); setTimeout(limparCabecalho, 2500); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
