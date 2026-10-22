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
  // tela aberta dentro de uma aba do sistema (regra de 16/10/2026): sem menu próprio; links abrem nova aba no topo
  const EM_ABA = (() => { try { return window.top !== window && !!window.top.__abasSistema; } catch (e) { return false; } })();
  const MARCA = 'Business';   // nome exibido no topo do menu (o logo entra aqui)
  const GRUPOS = [
    ['', [['index.html', 'Painel', '▦'], ['pendencias.html', 'Pendências', '◉'], ['avisos_lideres.html', 'Avisos para os líderes', '✉']]],
    ['Folha do mês', [['lancamentos.html', 'Lançamentos', '✎'], ['adiantamento.html', 'Adiantamento salarial', '◐'], ['vale_transporte.html', 'Vale transporte', '⇢'], ['planos.html', 'Planos', '✚'], ['conferencia_fechamento.html', 'Conferência do fechamento', '☑'], ['emprestimos.html', 'Empréstimos', '⇄'], ['abatimentos.html', 'Abatimentos', '−'],
      ['ferias.html', 'Férias', '☼'], ['decimo_terceiro.html', '13º salário', '★'], ['importar_alpha7.html', 'Importar Alpha7', '⇪'], ['importar_consumo_farmacia.html', 'Importar consumo farmácia', '⇪']]],
    ['Loja e jornada', [['freelance_solicitacao.html', 'Solicitações da loja', '✚'], ['supervisor_freelance.html', 'Aprovação do supervisor', '✓'], ['atestados_conferencia.html', 'Conferência de atestados', '✚'], ['supervisor_checklist.html', 'Check list do supervisor', '☑'], ['holerite_entrega.html', 'Entrega de holerites', '✉'], ['rh_aprovacao_freelance.html', 'Aprovação do RH', '✓'],
      ['escala.html', 'Escala', '▤'], ['banco_horas.html', 'Banco de horas', '◷'], ['cadastro_solicitacoes.html', 'Solicitações de cadastro', '☰'], ['organograma.html', 'Organograma', '⌂']]],
    ['Financeiro', [['financeiro.html', 'Pagamentos', '$'], ['fluxo_caixa.html', 'Fluxo de caixa', '≋'], ['fin_saldos.html', 'Saldos e aplicações', '▤'], ['conciliacao.html', 'Conciliação bancária', '⇄'], ['fin_importar.html', 'Importar Alpha7 · Financeiro', '⇪'], ['fin_base.html', 'Base do fluxo', '⚙']]],
    ['Relatórios', [['resumo_folha.html', 'Resumo da competência', '≡'], ['resumo_diretoria.html', 'Resumo da diretoria', '↗'], ['recibo_pagamento.html', 'Recibos', '▯'], ['relatorio_faltas.html', 'Relatório de faltas', '☷'], ['relatorio_quinto_dia.html', 'Pagamento do 5º dia útil', '$']]],
    ['Resultado das lojas', [['acompanhamento_loja.html', 'Acompanhamento', '◴'], ['resultado_loja.html', 'Resultado fechado', '◧'], ['fechamento_financeiro.html', 'Fechamento financeiro', '▣'], ['metas_console.html', 'Metas das lojas', '◎']]],
    ['Cadastros', [['funcionarios.html', 'Funcionários', '☺'], ['empresas.html', 'Empresas e contas', '▥'], ['lojas.html', 'Lojas e setores', '⌂'], ['eventos.html', 'Tipos de eventos', '❖'], ['rubricas.html', 'Rubricas Alpha7', '⇆']]],
    ['Segurança', [['auditoria.html', 'Auditoria', '⚲'], ['perfis.html', 'Perfis e acessos', '⚿']]]
  ];
  const telas = new Set((window.ACESSO.telas || []).map(t => String(t).toLowerCase()));
  const L = 232;
  // perfis que só usam o sistema em tela cheia no computador (para incluir outro perfil, acrescentar aqui)
  const TELA_CHEIA = [];   // DESLIGADA em 07/10. Para religar: ['LIDER', 'SUPERVISOR']
  const CELULAR = Math.min(screen.width, screen.height) < 700 || (window.matchMedia && matchMedia('(hover: none)').matches);

  const css = document.createElement('style');
  css.textContent = `
    html.menu-on body { padding-left: calc(${L}px + var(--corpo-pl, 0px)); background: #F4F5F7 !important; font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    html.em-aba body { background: #F4F5F7 !important; font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
    /* identificação do usuário no cabeçalho de cada tela: o menu já mostra */
    html.menu-on #lblUsuario, html.menu-on #lblPerfil, html.em-aba #lblUsuario, html.em-aba #lblPerfil { display: none !important; }
    html.menu-on .fixed.inset-x-0, html.menu-on .fixed.top-0.left-0.right-0 { left: ${L}px; }
    /* cabeçalho único das telas: título, subtítulo e uma linha divisória */
    html.menu-on .cab-sis { position: static !important; background: transparent !important; border: 0 !important; border-bottom: 1px solid #cbd5e1 !important; border-radius: 0 !important; box-shadow: none !important; -webkit-backdrop-filter: none !important; backdrop-filter: none !important; padding-top: 2px !important; padding-bottom: 14px !important; margin-top: 0 !important; margin-bottom: 18px !important; }
    html.menu-on .tit-sis { font-size: 21px !important; font-weight: 700 !important; letter-spacing: 0 !important; line-height: 1.25 !important; color: #0f172a !important; }
    #menuFecha { position: absolute; top: 16px; right: 8px; width: 26px; height: 26px; border: 0; border-radius: 6px; background: transparent; color: #8A93A1; font-size: 15px; cursor: pointer; }
    #menuFecha:hover { background: #1E242D; color: #fff; }
    @media (min-width: 901px) {
      html.menu-oculto #menuSistema { transform: translateX(-100%); }
      html.menu-oculto body { padding-left: calc(54px + var(--corpo-pl, 0px)); }
      html.menu-oculto .fixed.inset-x-0, html.menu-oculto .fixed.top-0.left-0.right-0 { left: 0; }
      html.menu-oculto #menuAbre { display: block; }
    }
    #menuSistema { position: fixed; top: 0; left: 0; bottom: 0; width: ${L}px; background: #12161C; z-index: 45; display: flex; flex-direction: column; font-family: inherit; border-right: 0; transition: transform .15s; }
    #menuSistema .marca { padding: 20px 18px 14px; position: relative; border-bottom: 1px solid #2E3642; }
    #menuSistema .marca b { display: block; font-size: 17px; font-weight: 800; color: #0f172a; letter-spacing: -.01em; }
    #menuSistema .marca span { font-size: 11px; color: #8A93A1; }
    #menuSistema nav { flex: 1; overflow-y: auto; padding: 8px 10px 12px; scrollbar-width: thin; scrollbar-color: #2E3642 transparent; }
    #menuSistema .marca img { height: 34px; display: block; margin-bottom: 6px; }
    #menuSistema .sec { border-top: 1px solid #2E3642; margin-top: 8px; padding-top: 6px; }
    #menuSistema .grupo { display: flex; align-items: center; width: 100%; background: none; border: 0; cursor: pointer; font-family: inherit; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #8A93A1; padding: 9px 10px; border-radius: 8px; text-align: left; }
    #menuSistema .grupo:hover { background: #1E242D; color: #fff; }
    #menuSistema .grupo::after { content: '▸'; margin-left: auto; font-size: 11px; color: #5B6472; transition: transform .12s; }
    #menuSistema .sec.aberto .grupo::after { transform: rotate(90deg); }
    #menuSistema .sec .itens { display: none; padding-bottom: 4px; }
    #menuSistema .sec.aberto .itens { display: block; }
    #menuSistema a.it { display: flex; align-items: center; gap: 9px; padding: 7px 10px; border-radius: 8px; font-size: 13px; color: #C9CED6; text-decoration: none; line-height: 1.2; white-space: nowrap; }
    #menuSistema a.it span:not(.bolha) { overflow: hidden; text-overflow: ellipsis; }
    #menuSistema a.it:hover { background: #1E242D; color: #fff; }
    #menuSistema a.it.on { background: #C69560; color: #12161C; font-weight: 600; }
    #menuSistema a.it.on i { opacity: .9; }
    #menuSistema a.it i { width: 16px; text-align: center; font-style: normal; opacity: .65; font-size: 12px; }
    #menuSistema a.it .bolha { margin-left: auto; background: #3A4250; color: #fff; font-size: 10.5px; font-weight: 700; border-radius: 999px; min-width: 18px; padding: 1px 6px; text-align: center; }
    #menuSistema a.it .bolha.aten { background: #B54708; }
    #menuSistema a.it .bolha.crit { background: #D92D20; animation: bolhaPisca 1.1s ease-in-out infinite; }
    @keyframes bolhaPisca { 0% { box-shadow: 0 0 0 0 rgba(217,45,32,.8); } 70% { box-shadow: 0 0 0 7px rgba(217,45,32,0); } 100% { box-shadow: 0 0 0 0 rgba(217,45,32,0); } }
    #menuSistema .grupo .bolhaG { margin-left: 8px; width: 8px; height: 8px; border-radius: 999px; background: #D92D20; animation: bolhaPisca 1.1s ease-in-out infinite; }
    #menuSistema .pe { padding: 12px 16px 14px; border-top: 1px solid #2E3642; font-size: 11px; color: #8A93A1; }
    #menuSistema .pe .quem { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #C9CED6; }
    #menuSistema .pe button { margin-top: 8px; width: 100%; padding: 7px; border-radius: 7px; background: #1E242D; color: #C9CED6; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid #2E3642; }
    #menuSistema .pe button:hover { background: #2E3642; color: #fff; }
    #menuAbre { display: none; position: fixed; top: 10px; left: 10px; z-index: 46; width: 36px; height: 36px; border-radius: 8px; background: #12161C; color: #fff; border: 0; font-size: 16px; cursor: pointer; }
    #menuTopo { display: none; position: fixed; top: 0; left: 0; right: 0; height: 52px; background: #fff; z-index: 44; box-shadow: 0 1px 0 #e2e8f0; align-items: center; justify-content: center; }
    #menuTopo img { height: 26px; }
    #telaCheiaAviso { position: fixed; inset: 0; z-index: 2147483000; background: #000; color: #e2e8f0; display: none; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 24px; font-family: ui-sans-serif, system-ui, "Segoe UI", Roboto, Arial, sans-serif; }
    #telaCheiaAviso img { height: 72px; margin-bottom: 18px; }
    #telaCheiaAviso b { font-size: 18px; color: #fff; }
    #telaCheiaAviso p { font-size: 13px; color: #94a3b8; margin: 8px 0 20px; max-width: 420px; line-height: 1.5; }
    #telaCheiaAviso button { background: #c69560; color: #111; border: 0; border-radius: 8px; padding: 11px 22px; font-size: 14px; font-weight: 700; cursor: pointer; }
    html.sem-tela-cheia body > *:not(#telaCheiaAviso) { visibility: hidden !important; }
    html.sem-tela-cheia #telaCheiaAviso { display: flex; }
    @media (max-width: 900px) {
      #menuTopo { display: flex; }
      #menuAbre { top: 8px; left: 8px; }
      html.menu-on table { font-size: 12px; }
      html.menu-on h1 { font-size: 17px !important; }
      html.menu-on .rolagem-cel { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      /* celular: menos margem, cabeçalho enxuto e botões de decisão grandes (telas de aprovação) */
      html.menu-on body { padding: 60px 10px 20px !important; }
      html.menu-on .sticky.top-0 { position: static !important; padding-top: 6px !important; padding-bottom: 8px !important; }
      html.menu-on #lblUsuario, html.menu-on #lblPerfil { display: none !important; }
      html.menu-on button[onclick^="abrirDecisao"], html.menu-on button[onclick^="abrirAprovacao"], html.menu-on button[onclick^="abrirRecusa"] { flex: 1 1 0; padding: 13px 8px !important; font-size: 13px !important; border-radius: 10px !important; }
      html.menu-on button[onclick^="abrirNoLugarSupervisor"], html.menu-on button[onclick^="estornar"] { flex: 1 1 100%; padding: 11px 8px !important; font-size: 12px !important; }
      html.menu-on input, html.menu-on select, html.menu-on textarea { font-size: 16px !important; }
      html.menu-on #fNome { min-width: 0; }
      html.menu-on body { padding-left: 0; padding-top: 52px; } html.menu-on .fixed.inset-x-0 { left: 0; }
      #menuSistema { transform: translateX(-100%); transition: transform .15s; box-shadow: 0 0 0 100vmax rgba(15,23,42,0); }
      html.menu-aberto #menuSistema { transform: none; box-shadow: 0 0 0 100vmax rgba(15,23,42,.35); }
      #menuAbre { display: block; }
    }
    @media print { #menuSistema, #menuAbre, #menuTopo, #telaCheiaAviso { display: none !important; } html.menu-on body { padding-left: 0 !important; padding-top: 0 !important; background: #fff !important; } html.menu-on .fixed.inset-x-0 { left: 0; } }
  `;
  (document.head || document.documentElement).appendChild(css);
  if (!document.querySelector('link[href*="family=Inter"]')) { const fl = document.createElement('link'); fl.rel = 'stylesheet'; fl.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'; (document.head || document.documentElement).appendChild(fl); }

  function montar() {
    if (document.getElementById('menuSistema')) return;
    const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    let guard = {}; try { guard = JSON.parse(localStorage.getItem('menu_grupos') || '{}') || {}; } catch (e) {}
    const corpo = GRUPOS.map(([g, itens]) => { const vis = itens.filter(i => telas.has(i[0])); if (!vis.length) return '';
      const its = vis.map(([arq, nome, ic]) => (arq === 'pendencias.html' && String(window.ACESSO.perfil || '').toUpperCase() === 'GESTOR' ? ['pendencias.html', 'Central de pendências', ic] : [arq, nome, ic])).map(([arq, nome, ic]) => `<a class="it ${arq === PAGINA ? 'on' : ''}" href="${arq}" data-menu="${arq}"><i>${ic}</i><span>${nome}</span></a>`).join('');
      if (!g) return its;
      const aberto = g in guard ? !!guard[g] : vis.some(i => i[0] === PAGINA);
      return `<div class="sec ${aberto ? 'aberto' : ''}" data-g="${g}"><button type="button" class="grupo">${g}</button><div class="itens">${its}</div></div>`; }).join('');
    try { document.documentElement.style.setProperty('--corpo-pl', (parseFloat(getComputedStyle(document.body).paddingLeft) || 0) + 'px'); } catch (e) {}
    try { if (localStorage.getItem('menu_oculto') === '1') document.documentElement.classList.add('menu-oculto'); } catch (e) {}
    const aside = document.createElement('aside'); aside.id = 'menuSistema';
    aside.innerHTML = `<div class="marca"><img src="logo_business.png" alt="${MARCA}"><span>Sistema de gestão</span><button type="button" id="menuFecha" title="Ocultar o menu" aria-label="Ocultar o menu">«</button></div><nav>${corpo}</nav>
      <div class="pe"><div class="quem" title="${esc(window.ACESSO.email || '')}">${esc(window.ACESSO.email || '')}</div><div>${esc(window.ACESSO.perfil || '')}</div><button type="button" id="menuSair">Sair</button></div>`;
    document.body.appendChild(aside);
    const abre = document.createElement('button'); abre.id = 'menuAbre'; abre.type = 'button'; abre.textContent = '☰'; abre.setAttribute('aria-label', 'Abrir o menu');
    const ocultar = v => { document.documentElement.classList.toggle('menu-oculto', v); try { localStorage.setItem('menu_oculto', v ? '1' : '0'); } catch (e) {} window.dispatchEvent(new Event('resize')); };
    abre.title = 'Mostrar o menu';
    abre.onclick = () => { if (window.innerWidth > 900) ocultar(false); else document.documentElement.classList.toggle('menu-aberto'); };
    aside.querySelector('#menuFecha').onclick = () => { if (window.innerWidth > 900) ocultar(true); else document.documentElement.classList.remove('menu-aberto'); };
    document.body.appendChild(abre);
    const topo = document.createElement('div'); topo.id = 'menuTopo'; topo.innerHTML = '<img src="logo_business.png" alt="Business">'; document.body.appendChild(topo);
    aside.addEventListener('click', e => { const gb = e.target.closest('button.grupo'); if (!gb) return;
      const sec = gb.parentElement; sec.classList.toggle('aberto'); guard[sec.dataset.g] = sec.classList.contains('aberto');
      try { localStorage.setItem('menu_grupos', JSON.stringify(guard)); } catch (e) {} });
    aside.addEventListener('click', e => { if (e.target.closest('a.it')) document.documentElement.classList.remove('menu-aberto'); });
    document.documentElement.classList.add('menu-on');
    document.getElementById('menuSair').onclick = async () => {
      try { if (window.ACESSO_CLI) await window.ACESSO_CLI.auth.signOut(); } catch (e) {}
      try { localStorage.removeItem('usuario_drogarema'); } catch (e) {}
      location.replace('login.html');
    };
    const ativo = aside.querySelector('a.it.on'); if (ativo && ativo.scrollIntoView) ativo.scrollIntoView({ block: 'nearest' });
  }

  // padrão único: mesmo cabeçalho e mesma largura útil em todas as telas
  function blocoTitulo() {
    const h1 = document.querySelector('h1'); let cab = null; if (!h1) return [null, null];
    let e = h1.parentElement; for (let k = 0; k < 4 && e && e !== document.body; k++, e = e.parentElement) { if ((e.textContent || '').length <= 700 && e.offsetHeight <= 220) cab = e; else break; }
    return [h1, cab];
  }
  function padronizar() {
    if (PAGINA === 'index.html') return;
    const [h1, cab] = blocoTitulo(); if (!h1) return;
    if (cab) cab.classList.add('cab-sis');
    if (!h1.classList.contains('tit-sis')) { h1.classList.add('tit-sis'); let primeiro = true;
      h1.childNodes.forEach(n => { if (n.nodeType !== 3) return; let t = n.nodeValue; if (!/[A-ZÀ-Ú]{3}/.test(t) || t !== t.toUpperCase()) { if (t.trim()) primeiro = false; return; }
        t = t.toLowerCase().replace(/(^|[\s(])(rh|he|vt|inss|fgts|irrf)(?=$|[\s).,])/g, (a, p, s) => p + s.toUpperCase());
        if (primeiro) { t = t.replace(/[a-zà-ú]/, c => c.toUpperCase()); primeiro = false; } n.nodeValue = t; }); }
    if (PAGINA === 'recibo_pagamento.html') return;
    document.querySelectorAll('[class*="max-w-"]').forEach(el => { if (el.dataset.larg || el.closest('#menuSistema, .fixed, [role="dialog"]')) return; el.dataset.larg = '1';
      const mw = parseFloat(getComputedStyle(el).maxWidth); if (mw >= 1000) { el.style.maxWidth = 'none'; el.style.marginLeft = '0'; el.style.marginRight = '0'; } });
  }

  // tira do cabeçalho da tela os atalhos que o menu já tem (e leva o aviso numérico para o menu)
  function limparCabecalho() {
    const aside = document.getElementById('menuSistema'); if (!aside && !EM_ABA) return;
    const noMenu = arq => telas.has(arq) && GRUPOS.some(([, its]) => its.some(i => i[0] === arq));
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
      if (!noMenu(alvo)) return;   // não está no menu: fica
      const item = aside ? aside.querySelector(`a.it[data-menu="${alvo}"]`) : null;
      if (!(cab && cab.contains(a))) return;                             // link no meio do conteúdo: fica
      a.dataset.menuVisto = '1';
      if (!item) { a.style.setProperty('display', 'none', 'important'); return; }   // dentro de uma aba: o menu fica na janela de cima
      const sincronizar = () => { if (item.querySelector('.bolha[data-pend]')) return; const n = [...a.querySelectorAll('span')].find(s => /^\d+$/.test(s.textContent.trim()) && !s.classList.contains('hidden') && s.style.display !== 'none');
        let b = item.querySelector('.bolha'); if (n) { if (!b) { b = document.createElement('span'); b.className = 'bolha'; item.appendChild(b); } b.textContent = n.textContent.trim(); } else if (b) b.remove(); };
      sincronizar(); new MutationObserver(sincronizar).observe(a, { childList: true, subtree: true, characterData: true, attributes: true });
      a.style.setProperty('display', 'none', 'important');
    });
  }

  // no celular: tabela larga rola de lado dentro do próprio quadro, sem estourar a tela
  function ajustarCelular() {
    if (window.innerWidth > 900) return;
    document.querySelectorAll('table').forEach(t => { const p = t.parentElement; if (!p || p === document.body || p.closest('#menuSistema')) return;
      if (!/(auto|scroll)/.test(getComputedStyle(p).overflowX)) p.classList.add('rolagem-cel'); });
  }

  // tela cheia (segurança de dados): fora dela o conteúdo some e fica o fundo preto.
  // Vale para a tela cheia do navegador (F11), que continua ao trocar de tela, e para o botão do aviso.
  function telaCheia() {
    if (CELULAR || !TELA_CHEIA.includes(String(window.ACESSO.perfil || '').toUpperCase())) return;
    const av = document.createElement('div'); av.id = 'telaCheiaAviso';
    av.innerHTML = '<img src="logo_business_icone.png" alt=""><b>Use o sistema em tela cheia</b><p>Aperte a tecla <b style="font-size:13px">F11</b> para continuar. Com o F11 a tela cheia continua ao trocar de tela; pelo botão abaixo ela vale só para a tela atual.</p><button type="button">Entrar em tela cheia</button>';
    document.body.appendChild(av);
    av.querySelector('button').onclick = () => { try { const p = document.documentElement.requestFullscreen(); if (p && p.catch) p.catch(() => {}); } catch (e) {} };
    const cheia = () => !!document.fullscreenElement || (window.outerHeight >= screen.height - 8 && window.outerWidth >= screen.width - 8) || (window.innerHeight >= screen.height * 0.98 && window.innerWidth >= screen.width * 0.98);
    const ver = () => document.documentElement.classList.toggle('sem-tela-cheia', !cheia());
    ver(); window.addEventListener('resize', ver); document.addEventListener('fullscreenchange', ver); setInterval(ver, 1500);
  }

  // avisos do Gestor para o líder: aparecem ao abrir o sistema até ele confirmar "Li e estou ciente" (regra de 15/10/2026)
  async function avisosLider() {
    if (String(window.ACESSO.perfil || '').toUpperCase() !== 'LIDER' || !window.ACESSO_CLI || document.getElementById('avisoLiderModal')) return;
    const cli = window.ACESSO_CLI, email = String(window.ACESSO.email || '').toLowerCase();
    try {
      const [ra, rl] = await Promise.all([cli.from('avisos_lideres').select('id, mensagem, criado_em, criado_por, loja_id').order('criado_em'), cli.from('avisos_leitura').select('aviso_id').eq('email', email)]);
      if (ra.error) return;
      const lidos = new Set((rl.data || []).map(x => x.aviso_id));
      const pend = (ra.data || []).filter(a => !lidos.has(a.id));
      if (!pend.length) return;
      const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      const m = document.createElement('div'); m.id = 'avisoLiderModal';
      m.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.6);display:flex;align-items:center;justify-content:center;padding:16px';
      let i = 0;
      const mostrar = () => {
        const a = pend[i];
        m.innerHTML = `<div style="background:#fff;border-radius:16px;max-width:560px;width:100%;padding:22px;box-shadow:0 20px 50px rgba(0,0,0,.3);font-family:inherit">
          <div style="font-size:12px;font-weight:700;color:#4f46e5;text-transform:uppercase;letter-spacing:.04em">📣 Aviso da gestão${pend.length > 1 ? ` · ${i + 1} de ${pend.length}` : ''}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px">${new Date(a.criado_em).toLocaleString('pt-BR')}</div>
          <div style="font-size:15px;color:#0f172a;margin:14px 0 18px;white-space:pre-wrap;line-height:1.5">${esc(a.mensagem)}</div>
          <button type="button" style="width:100%;background:#4f46e5;color:#fff;border:0;border-radius:10px;padding:12px;font-weight:700;font-size:13px;cursor:pointer">✓ Li e estou ciente</button></div>`;
        m.querySelector('button').onclick = async () => {
          const b = m.querySelector('button'); b.disabled = true; b.textContent = 'Registrando...';
          const { error } = await cli.rpc('fn_aviso_ciente', { p_id: a.id });
          if (error) { b.disabled = false; b.textContent = '✓ Li e estou ciente'; alert('Não foi possível registrar: ' + error.message); return; }
          i++; if (i < pend.length) mostrar(); else m.remove();
        };
      };
      mostrar(); document.body.appendChild(m);
    } catch (e) { console.warn('avisos', e); }
  }

  // adiantamento salarial aguardando o Gestor (regra de 15/10/2026): janela ao entrar (1x por sessão) + bolha vermelha no menu
  // aprovações do Gestor (adiantamento 15/10/2026, vale transporte 16/10/2026): janela ao entrar (1x por sessão) + bolha vermelha no menu
  const APROVACOES_GESTOR = [
    { rpc: 'fn_adiant_pendentes', tela: 'adiantamento.html', nome: 'Adiantamento salarial', mes: r => r.competencia },
    { rpc: 'fn_vt_pendentes', tela: 'vale_transporte.html', nome: 'Vale transporte', mes: r => r.mes },
    { rpc: 'fn_decimo_antecip_pendentes', tela: 'decimo_terceiro.html', nome: '13º antecipado (acima do saldo)', mes: r => r.mes },
    { rpc: 'fn_plano_pendentes', tela: 'planos.html', nome: 'Planos (odontológico, saúde, Mogi Care)', mes: r => r.mes },
    { rpc: 'fn_alteracao_pendentes', tela: 'conferencia_fechamento.html', nome: 'Alteração na própria ficha do RH', mes: r => r.mes }
  ];
  // holerites: dupla confirmação loja × RH (regra de 19/10/2026). Cada lado vê só o que falta confirmar DELE:
  // aviso fixo no canto da tela + bolha vermelha no menu, até confirmar.
  async function holeritePendente() {
    const pf = String(window.ACESSO.perfil || '').toUpperCase();
    if (!['LIDER', 'RH'].includes(pf) || !window.ACESSO_CLI || window.top !== window || document.getElementById('avisoHolerite')) return;
    try {
      const { data, error } = await window.ACESSO_CLI.rpc('fn_holerite_pendentes');
      if (error || !data || !data.length) return;
      const tot = data.reduce((t, r) => t + (r.qtd || 0), 0); if (!tot) return;
      const item = document.querySelector('#menuSistema a.it[data-menu="holerite_entrega.html"]');
      if (item && !item.querySelector('.bolha')) { const b = document.createElement('span'); b.className = 'bolha'; b.style.background = '#dc2626'; b.style.color = '#fff'; b.textContent = tot; item.appendChild(b);
        const sec = item.closest('.sec'); if (sec) sec.classList.add('aberto'); }
      if (PAGINA === 'holerite_entrega.html') return;
      const c = data[0].competencia;
      const a = document.createElement('a'); a.id = 'avisoHolerite'; a.href = `holerite_entrega.html?comp=${encodeURIComponent(c)}&pend=1`;
      a.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99990;background:#dc2626;color:#fff;border-radius:14px;padding:12px 16px;box-shadow:0 10px 30px rgba(0,0,0,.3);font-family:inherit;font-size:13px;text-decoration:none;max-width:340px;line-height:1.35';
      a.innerHTML = `<b style="display:block;font-size:14px">🧾 Holerites aguardando a SUA confirmação</b>${data.map(r => `${r.qtd} funcionário(s) · holerite ${r.competencia}`).join('<br>')}
        <span style="display:block;margin-top:6px;font-weight:800;text-decoration:underline">Confirmar entrega${pf === 'RH' ? ' (lado do RH)' : ' (lado da loja)'} →</span>`;
      document.body.appendChild(a);
    } catch (e) { console.warn('holerites', e); }
  }

  async function adiantamentoGestor() {
    if (String(window.ACESSO.perfil || '').toUpperCase() !== 'GESTOR' || !window.ACESSO_CLI) return;
    try {
      const pend = [];
      for (const ap of APROVACOES_GESTOR) {
        const { data, error } = await window.ACESSO_CLI.rpc(ap.rpc);
        const r = !error && data && data[0]; if (!r || !r.qtd) continue;
        pend.push({ ...ap, qtd: r.qtd, total: r.total, m: ap.mes(r) });
        const item = document.querySelector(`#menuSistema a.it[data-menu="${ap.tela}"]`);
        if (item && !item.querySelector('.bolha')) { const b = document.createElement('span'); b.className = 'bolha'; b.style.background = '#dc2626'; b.style.color = '#fff'; b.textContent = r.qtd; item.appendChild(b);
          const sec = item.closest('.sec'); if (sec) sec.classList.add('aberto'); }
      }
      const mostrar = pend.filter(p => p.tela !== PAGINA); if (!mostrar.length) return;
      let visto = ''; try { visto = sessionStorage.getItem('adiant_aviso_visto') || ''; } catch (e) {}
      const chave = mostrar.map(p => p.tela + p.qtd + '|' + p.total).join(';'); if (visto === chave) return;
      const brl = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const m = document.createElement('div'); m.id = 'adiantGestorModal';
      m.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(15,23,42,.65);display:flex;align-items:center;justify-content:center;padding:16px';
      m.innerHTML = `<div style="background:#fff;border-radius:16px;max-width:540px;width:100%;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.35);font-family:inherit">
        <div style="background:#dc2626;color:#fff;padding:16px 22px;font-weight:800;font-size:16px">⚠️ Pagamentos aguardando a sua aprovação</div>
        <div style="padding:18px 22px;font-size:14px;color:#0f172a;line-height:1.5">
          ${mostrar.map(p => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9"><div style="flex:1"><b>${p.nome}</b> · ${p.m}<br><span style="font-size:12px;color:#475569">${p.qtd} funcionário(s) com valor diferente do mês anterior · ${brl(p.total)}</span></div>
            <a href="${p.tela}?aba=aprovacao" class="irAprov" style="background:#dc2626;color:#fff;border-radius:8px;padding:8px 12px;font-weight:800;font-size:12px;text-decoration:none;white-space:nowrap">Aprovar →</a></div>`).join('')}
          <div style="margin-top:10px;color:#b91c1c;font-weight:700;font-size:13px">Enquanto não for aprovado, o Financeiro não recebe esses pagamentos.</div>
          <div style="margin-top:10px;font-size:12px;color:#475569;background:#f8fafc;border-radius:8px;padding:10px">Se fechar agora, o caminho é: <b>Painel → faixa vermelha no topo</b> ou <b>menu Folha do mês → a tela com a bolha vermelha → aba "Aprovação do Gestor"</b>.</div>
        </div>
        <div style="display:flex;padding:0 22px 20px"><button type="button" style="flex:1;background:#f1f5f9;color:#334155;border:0;border-radius:10px;padding:12px;font-weight:700;font-size:13px;cursor:pointer">Depois</button></div></div>`;
      const fechar = () => { try { sessionStorage.setItem('adiant_aviso_visto', chave); } catch (e) {} m.remove(); };
      m.querySelector('button').onclick = fechar;
      m.querySelectorAll('a.irAprov').forEach(a => a.addEventListener('click', () => setTimeout(fechar, 0)));
      document.body.appendChild(m);
    } catch (e) { console.warn('aprovações do Gestor', e); }
  }

  // pendências no menu (regra de 21/10/2026): bolha com o número em cada tela onde se resolve;
  // vermelha piscando = fora do prazo (fica até resolver), laranja = para resolver no prazo.
  // Para o Gestor é informativo: a "Central de pendências" pisca quando alguém da equipe está fora do prazo.
  function carregarScript(src) { return new Promise((ok, erro) => { const sc = document.createElement('script'); sc.src = src; sc.onload = ok; sc.onerror = erro; document.head.appendChild(sc); }); }
  async function pendenciasMenu() {
    const pf = String(window.ACESSO.perfil || '').toUpperCase();
    if (!['RH', 'SUPERVISOR', 'GESTOR'].includes(pf) || !window.ACESSO_CLI || !telas.has('pendencias.html')) return;
    try {
      if (!window.Pendencias) await carregarScript('pendencias_core.js?v=1');
      const r = await window.Pendencias.carregar(window.ACESSO_CLI, pf);
      const meus = r.itens.filter(i => i.com === pf && !i.semMenu && i.nivel !== 'info');
      const por = {};
      meus.forEach(i => { const t = por[i.tela] = por[i.tela] || { n: 0, crit: false }; t.n += i.contaMenu || 1; if (i.nivel === 'critico') t.crit = true; });
      const central = { n: meus.reduce((a, i) => a + (i.contaMenu || 1), 0), crit: meus.some(i => i.nivel === 'critico') };
      if (pf === 'GESTOR') { const eq = r.itens.filter(i => i.com !== 'GESTOR' && i.nivel === 'critico').length; central.n += eq; central.crit = central.crit || eq > 0; }
      por['pendencias.html'] = central;
      document.querySelectorAll('#menuSistema .bolha[data-pend]').forEach(b => b.remove());
      Object.entries(por).forEach(([tela, x]) => {
        if (!x.n) return;
        const item = document.querySelector(`#menuSistema a.it[data-menu="${tela}"]`); if (!item) return;
        item.querySelectorAll('.bolha').forEach(b => b.remove());
        const b = document.createElement('span'); b.className = 'bolha ' + (x.crit ? 'crit' : 'aten'); b.dataset.pend = '1'; b.textContent = x.n;
        b.title = x.crit ? 'Fora do prazo: resolver agora' : 'Para resolver'; item.appendChild(b);
        const sec = item.closest('.sec'); if (sec && x.crit) sec.classList.add('aberto');
      });
    } catch (e) { console.warn('pendências no menu', e); }
  }

  // ---------------------------------------------------------------- abas (várias telas abertas ao mesmo tempo)
  // Cada tela aberta pelo menu ou por um link vira uma aba no topo; trocar de aba não perde o que estava na tela.
  // Fecha no "x". A tela em que o sistema foi aberto é a primeira aba. Celular: navegação normal, sem abas.
  // sem limite de abas (pedido de 20/10/2026); a barra rola na horizontal quando não cabe
  const nomeTela = arq => { for (const [, itens] of GRUPOS) for (const [a, n] of itens) if (a === arq) return n; return null; };
  const chaveUrl = u => { try { const x = new URL(u, location.href); return (x.pathname.split('/').pop() || 'index.html').toLowerCase() + x.search; } catch (e) { return String(u); } };
  const linkInterno = a => {
    if (!a || a.target || a.hasAttribute('download')) return null;
    const h = a.getAttribute('href') || ''; if (!h || h.startsWith('#') || /^(javascript|mailto|tel):/i.test(h)) return null;
    let x; try { x = new URL(h, location.href); } catch (e) { return null; }
    if (x.origin !== location.origin) return null;
    const arq = (x.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (!arq.endsWith('.html') || arq === 'login.html') return null;
    return arq + x.search;
  };

  function abasNoFrame() {
    document.documentElement.classList.add('em-aba');
    document.addEventListener('click', e => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
      const a = e.target.closest && e.target.closest('a[href]'); const url = linkInterno(a); if (!url) return;
      e.preventDefault(); try { window.top.__abasSistema.abrir(url, (a.textContent || '').trim()); } catch (er) { location.href = url; }
    }, true);
    const avisar = () => { try { window.top.__abasSistema.titulo(window, document.title); } catch (e) {} };
    avisar(); setTimeout(avisar, 1500);
  }

  function abas() {
    const css2 = document.createElement('style');
    css2.textContent = `
      #abasBar { position: fixed; top: 0; left: ${L}px; right: 0; height: 34px; z-index: 44; background: #E7E9EE; display: flex; align-items: flex-end; gap: 2px; padding: 0 8px; overflow-x: auto; overflow-y: hidden; font-family: inherit; scrollbar-width: none; }
      #abasBar::-webkit-scrollbar { display: none; }
      #abasBar.rola { padding: 0 30px; }
      .abasSeta { position: fixed; top: 0; height: 34px; width: 26px; z-index: 45; border: 0; background: #cbd5e1; color: #334155; font-weight: 800; font-size: 13px; cursor: pointer; display: none; }
      .abasSeta:hover { background: #94a3b8; color: #fff; }
      #abasEsq { left: ${L}px; } #abasDir { right: 0; }
      html.menu-oculto #abasEsq { left: 54px; }
      html.menu-oculto #abasBar, html.menu-oculto #abasArea { left: 54px; }
      #abasBar .aba { display: flex; align-items: center; gap: 6px; max-width: 220px; height: 28px; padding: 0 6px 0 12px; border-radius: 8px 8px 0 0; background: #D5D9E0; color: #364152; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0; user-select: none; }
      #abasBar .aba span { overflow: hidden; text-overflow: ellipsis; }
      #abasBar .aba:hover { background: #DFE2E8; }
      #abasBar .aba.on { background: #fff; color: #0f172a; box-shadow: inset 0 2px 0 #c69560; }
      #abasBar .aba b { width: 18px; height: 18px; line-height: 18px; text-align: center; border-radius: 5px; color: #64748b; font-weight: 700; font-size: 13px; }
      #abasBar .aba b:hover { background: #fecaca; color: #b91c1c; }
      #abasArea { position: fixed; top: 34px; left: ${L}px; right: 0; bottom: 0; z-index: 43; background: #F4F5F7; display: none; }
      #abasArea iframe { width: 100%; height: 100%; border: 0; display: none; background: #F4F5F7; }
      html.com-abas body { margin-top: 34px !important; }
      @media print { #abasBar, #abasArea { display: none !important; } html.com-abas body { margin-top: 0 !important; } }`;
    document.head.appendChild(css2);
    const bar = document.createElement('div'); bar.id = 'abasBar';
    const area = document.createElement('div'); area.id = 'abasArea';
    document.body.appendChild(bar); document.body.appendChild(area);
    // muitas abas: sem barra de rolagem (cobria a tela); rola com as setas ou com a roda do mouse
    const setaE = document.createElement('button'); setaE.id = 'abasEsq'; setaE.className = 'abasSeta'; setaE.type = 'button'; setaE.textContent = '◀'; setaE.title = 'Abas à esquerda';
    const setaD = document.createElement('button'); setaD.id = 'abasDir'; setaD.className = 'abasSeta'; setaD.type = 'button'; setaD.textContent = '▶'; setaD.title = 'Abas à direita';
    document.body.appendChild(setaE); document.body.appendChild(setaD);
    const verSetas = () => { const rola = bar.scrollWidth > bar.clientWidth + 2; bar.classList.toggle('rola', rola); setaE.style.display = setaD.style.display = rola ? 'block' : 'none'; };
    setaE.onclick = () => bar.scrollBy({ left: -300, behavior: 'smooth' });
    setaD.onclick = () => bar.scrollBy({ left: 300, behavior: 'smooth' });
    bar.addEventListener('wheel', e => { if (bar.scrollWidth > bar.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { bar.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
    window.addEventListener('resize', verSetas);
    document.documentElement.classList.add('com-abas');

    const nativa = { chave: PAGINA + location.search, url: PAGINA + location.search, titulo: nomeTela(PAGINA) || document.title.replace(/\s*-\s*Business\s*$/, ''), nativa: true };
    let lista = [nativa], ativa = nativa;
    try { (JSON.parse(sessionStorage.getItem('abas_sistema') || '[]') || []).forEach(t => { if (t && t.url && chaveUrl(t.url) !== nativa.chave ) lista.push({ chave: chaveUrl(t.url), url: t.url, titulo: t.titulo }); }); } catch (e) {}
    const salvar = () => { try { sessionStorage.setItem('abas_sistema', JSON.stringify(lista.filter(t => !t.nativa).map(t => ({ url: t.url, titulo: t.titulo })))); } catch (e) {} };
    const esc2 = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    function desenhar() {
      bar.innerHTML = lista.map((t, k) => `<div class="aba ${t === ativa ? 'on' : ''}" data-k="${k}" title="${esc2(t.titulo)}"><span>${esc2(t.titulo)}</span>${lista.length > 1 ? `<b data-x="${k}" title="Fechar">×</b>` : ''}</div>`).join('');
      const arqAtivo = ativa.chave.split('?')[0];
      document.querySelectorAll('#menuSistema a.it').forEach(a => a.classList.toggle('on', a.dataset.menu === arqAtivo));
      area.style.display = ativa.nativa ? 'none' : 'block';
      lista.forEach(t => { if (t.frame) t.frame.style.display = t === ativa ? 'block' : 'none'; });
      document.title = ativa.titulo + ' - Business';
      verSetas();
      const on = bar.querySelector('.aba.on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    function ativar(t) {
      ativa = t;
      if (!t.nativa && !t.frame) { t.frame = document.createElement('iframe'); t.frame.src = t.url; t.frame.title = t.titulo; area.appendChild(t.frame); }
      desenhar();
    }
    function abrir(url, titulo) {
      const chave = chaveUrl(url), arq = chave.split('?')[0];
      let t = lista.find(x => x.chave === chave);
      if (!t) {
        t = { chave, url: chave, titulo: nomeTela(arq) || titulo || arq.replace('.html', '') };
        lista.push(t); salvar();
      }
      ativar(t);
    }
    function fechar(t) {
      if (t.nativa) {   // a primeira aba é a própria página: a próxima aba assume o lugar dela
        const prox = lista.find(x => !x.nativa); if (!prox) return;
        lista = lista.filter(x => x !== t && x !== prox); salvar(); location.href = prox.url; return;
      }
      const i = lista.indexOf(t); if (t.frame) t.frame.remove();
      lista = lista.filter(x => x !== t); salvar();
      if (ativa === t) ativar(lista[Math.max(0, i - 1)]); else desenhar();
    }
    bar.addEventListener('click', e => {
      const x = e.target.closest('b[data-x]'); if (x) { e.stopPropagation(); fechar(lista[+x.dataset.x]); return; }
      const a = e.target.closest('.aba'); if (a) ativar(lista[+a.dataset.k]);
    });
    bar.addEventListener('auxclick', e => { const a = e.target.closest('.aba'); if (a && e.button === 1) fechar(lista[+a.dataset.k]); });
    // menu e links da própria página abrem em aba
    document.addEventListener('click', e => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
      const a = e.target.closest && e.target.closest('a[href]'); if (!a || a.closest('#abasBar')) return;
      const url = linkInterno(a); if (!url) return;
      e.preventDefault(); abrir(url, (a.textContent || '').trim());
    }, true);
    window.__abasSistema = {
      abrir,
      titulo: (win, tit) => { const t = lista.find(x => x.frame && x.frame.contentWindow === win); if (t && !nomeTela(t.chave.split('?')[0]) && tit) { t.titulo = tit.replace(/\s*-\s*Business\s*$/, ''); salvar(); desenhar(); } }
    };
    desenhar();
  }

  const iniciar = () => {
    if (EM_ABA) { abasNoFrame(); padronizar(); setTimeout(padronizar, 700); limparCabecalho(); setTimeout(limparCabecalho, 600); setTimeout(limparCabecalho, 2500); return; }
    montar(); if (!CELULAR && window.innerWidth > 900) abas(); padronizar(); setTimeout(padronizar, 700); telaCheia(); avisosLider(); adiantamentoGestor(); holeritePendente(); pendenciasMenu(); setInterval(pendenciasMenu, 120000); ajustarCelular(); setTimeout(ajustarCelular, 800); setTimeout(ajustarCelular, 3000); limparCabecalho(); setTimeout(limparCabecalho, 600); setTimeout(limparCabecalho, 2500); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
