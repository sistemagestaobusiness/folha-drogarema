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
  // organização de 28/10/2026: no topo o que o RH resolve todo dia; depois, na ordem do mês (aprovar → lançar → jornada → fechar)
  const GRUPOS = [
    ['', [['index.html', 'Painel', '▦'], ['pendencias.html', 'Pendências', '◉'], ['aprovacoes_gestor.html', 'Aprovações do Gestor', '✅'], ['rh_aprovacao_freelance.html', 'Aprovação do RH', '✓'], ['conferencia_fechamento.html', 'Conferência do fechamento', '☑'], ['contabilidade.html', 'Envio à contabilidade', '⇪'], ['avisos_lideres.html', 'Avisos para os líderes', '✉']]],
    ['Aprovações', [['supervisor_freelance.html', 'Aprovação do supervisor', '✓'], ['cadastro_solicitacoes.html', 'Pedidos de cadastro', '☰'], ['atestados_conferencia.html', 'Conferência de atestados', '✚'], ['supervisor_checklist.html', 'Check list do supervisor', '☑']]],
    ['Lançar na folha', [['lancamentos.html', 'Lançamentos', '✎'], ['vale_transporte.html', 'Vale transporte', '⇢'], ['adiantamento.html', 'Adiantamento salarial', '◐'], ['planos.html', 'Planos', '✚'], ['emprestimos.html', 'Empréstimos', '⇄'], ['abatimentos.html', 'Abatimentos', '−'],
      ['importar_alpha7.html', 'Importar Alpha7', '⇪'], ['importar_consumo_farmacia.html', 'Consumo farmácia', '⇪']]],
    ['Jornada', [['escala.html', 'Escala', '▤'], ['banco_horas.html', 'Banco de horas', '◷'], ['ferias.html', 'Férias', '☼'], ['decimo_terceiro.html', '13º salário', '★'], ['freelance_solicitacao.html', 'Solicitações da loja', '✚']]],
    ['Fechar o mês', [['resumo_folha.html', 'Resumo da competência', '≡'], ['recibo_pagamento.html', 'Recibos', '▯'], ['holerite_entrega.html', 'Entrega de holerites', '✉']]],
    ['Financeiro', [['financeiro.html', 'Pagamentos', '$'], ['fluxo_caixa.html', 'Fluxo de caixa', '≋'], ['fin_saldos.html', 'Saldos e aplicações', '▤'], ['conciliacao.html', 'Conciliação bancária', '⇄'], ['fin_importar.html', 'Importar Alpha7 · Financeiro', '⇪'], ['fin_base.html', 'Base do fluxo', '⚙']]],
    ['Relatórios', [['relatorio_faltas.html', 'Relatório de faltas', '☷'], ['resumo_diretoria.html', 'Resumo da diretoria', '↗'], ['relatorio_quinto_dia.html', 'Pagamento do 5º dia útil', '$']]],
    ['Resultado das lojas', [['acompanhamento_loja.html', 'Acompanhamento', '◴'], ['resultado_loja.html', 'Resultado fechado', '◧'], ['fechamento_financeiro.html', 'Fechamento financeiro', '▣'], ['metas_console.html', 'Metas das lojas', '◎']]],
    ['Cadastros', [['funcionarios.html', 'Funcionários', '☺'], ['organograma.html', 'Organograma', '⌂'], ['empresas.html', 'Empresas e contas', '▥'], ['lojas.html', 'Lojas e setores', '⌂'], ['eventos.html', 'Tipos de eventos', '❖'], ['rubricas.html', 'Rubricas Alpha7', '⇆']]],
    ['Segurança', [['conduta_rh.html', 'Conduta do RH', '◉'], ['auditoria.html', 'Auditoria', '⚲'], ['perfis.html', 'Perfis e acessos', '⚿']]],
    ['Marketing', [['marketing_pedidos.html', 'Pedidos ao Marketing', '✎'], ['marketing_comunicados.html', 'Comunicados e enquetes', '✉']]],
    ['Entregas', [['motoboys.html', 'Motoboys', '➤']]]
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
    /* avisos dentro do menu (regra de 28/10/2026, DZ): uma linha só, para não cobrir os itens do menu em notebook.
       O detalhe completo aparece ao passar o mouse; o clique abre a tela. */
    #menuSistema > #avisoHolerite, #menuSistema > #avisoMkt, #menuSistema > #avisoCiencia, #menuSistema > #cobrancaNotif { margin: 0 10px 6px !important; padding: 6px 26px 6px 10px !important; border-radius: 8px !important; font-size: 0 !important; line-height: 1.3 !important; flex-shrink: 0; }
    #menuSistema > #avisoCiencia, #menuSistema > #cobrancaNotif { padding-right: 10px !important; }
    #menuSistema > #avisoHolerite b, #menuSistema > #avisoMkt b, #menuSistema > #avisoCiencia b, #menuSistema > #cobrancaNotif b { display: block; font-size: 11.5px !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #menuSistema > #avisoHolerite span, #menuSistema > #avisoMkt span { display: none !important; }
    #menuSistema > #avisoHolerite button, #menuSistema > #avisoMkt button { top: 4px !important; right: 7px !important; font-size: 14px !important; }
    @media print { #menuSistema, #menuAbre, #menuTopo, #telaCheiaAviso { display: none !important; } html.menu-on body { padding-left: 0 !important; padding-top: 0 !important; background: #fff !important; } html.menu-on .fixed.inset-x-0 { left: 0; } }
  `;
  (document.head || document.documentElement).appendChild(css);
  if (!document.querySelector('link[href*="family=Inter"]')) { const fl = document.createElement('link'); fl.rel = 'stylesheet'; fl.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'; (document.head || document.documentElement).appendChild(fl); }

  function montar() {
    if (document.getElementById('menuSistema')) return;
    const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    let guard = {}; try { guard = JSON.parse(localStorage.getItem('menu_grupos') || '{}') || {}; } catch (e) {}
    // líder (DZ, 28/10/2026): "Pedidos de cadastro" é um pedido que ele faz, não uma aprovação; fica em Cadastros, antes do Organograma
    const LIDER_MENU = String(window.ACESSO.perfil || '').toUpperCase() === 'LIDER';
    const grupos = !LIDER_MENU ? GRUPOS : GRUPOS.map(([g, itens]) => {
      const cad = GRUPOS[1][1].find(i => i[0] === 'cadastro_solicitacoes.html');
      if (g === 'Aprovações') return [g, itens.filter(i => i[0] !== 'cadastro_solicitacoes.html')];
      if (g === 'Cadastros') return [g, [cad, ...itens]];
      return [g, itens]; });
    const corpo = grupos.map(([g, itens]) => { const vis = itens.filter(i => telas.has(i[0])); if (!vis.length) return '';
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

  // avisos do Gestor: aparecem ao abrir o sistema até a pessoa confirmar "Li e estou ciente" (regra de 15/10/2026)
  // desde 29/10/2026: vão também para supervisor e RH (quando marcado) e repetem por N dias (uma ciência por dia)
  async function avisosLider() {
    if (!['LIDER', 'SUPERVISOR', 'RH'].includes(String(window.ACESSO.perfil || '').toUpperCase()) || !window.ACESSO_CLI || document.getElementById('avisoLiderModal')) return;
    const cli = window.ACESSO_CLI;
    try {
      const ra = await cli.rpc('fn_avisos_pendentes');
      if (ra.error) return;
      const pend = ra.data || [];
      if (!pend.length) return;
      const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      const m = document.createElement('div'); m.id = 'avisoLiderModal';
      m.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.6);display:flex;align-items:center;justify-content:center;padding:16px';
      let i = 0;
      const mostrar = () => {
        const a = pend[i];
        m.innerHTML = `<div style="background:#fff;border-radius:16px;max-width:560px;width:100%;padding:22px;box-shadow:0 20px 50px rgba(0,0,0,.3);font-family:inherit">
          <div style="font-size:12px;font-weight:700;color:#4f46e5;text-transform:uppercase;letter-spacing:.04em">📣 Aviso da gestão${pend.length > 1 ? ` · ${i + 1} de ${pend.length}` : ''}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px">${new Date(a.criado_em).toLocaleString('pt-BR')}${a.dias > 1 ? ` · aparece por ${a.dias} dias (hoje é o ${Math.min(a.dia_atual, a.dias)}º)` : ''}</div>
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
  // detalhe completo do aviso compacto do menu, ao passar o mouse
  const dicaAviso = el => { try { el.title = el.textContent.replace('✕', '').replace(/\s+/g, ' ').trim(); } catch (e) { } };
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
      // aviso que pode ser fechado (regra de 28/10/2026): some por 30 min e volta enquanto não confirmar; a pendência fica na Central de pendências
      const c = data[0].competencia, CHAVE = 'aviso_holerite_fechado_ate', PAUSA = 30 * 60e3;
      const fechadoAte = () => { try { return Number(localStorage.getItem(CHAVE)) || 0; } catch (e) { return 0; } };
      const a = document.createElement('div'); a.id = 'avisoHolerite';
      // dentro do menu lateral, acima do usuário: não cobre nada da tela (regra de 28/10/2026); sem menu, no canto de baixo à esquerda
      const noMenu = document.querySelector('#menuSistema .pe');
      a.style.cssText = noMenu ? 'position:relative;margin:0 10px 8px;background:#dc2626;color:#fff;border-radius:10px;padding:8px 26px 8px 10px;font-family:inherit;font-size:11.5px;line-height:1.35'
        : 'position:fixed;left:16px;bottom:16px;z-index:99990;background:#dc2626;color:#fff;border-radius:12px;padding:10px 34px 10px 14px;box-shadow:0 10px 30px rgba(0,0,0,.3);font-family:inherit;font-size:12.5px;max-width:280px;line-height:1.35';
      a.innerHTML = `<button type="button" title="Fechar por 30 minutos (a pendência continua na Central de pendências)" aria-label="Fechar" style="position:absolute;top:6px;right:8px;background:none;border:0;color:#fff;font-size:16px;font-weight:700;cursor:pointer;line-height:1">✕</button>
        <a href="holerite_entrega.html?comp=${encodeURIComponent(c)}&pend=1" style="color:#fff;text-decoration:none;display:block"><b style="display:block;font-size:12.5px">🧾 ${tot} holerite(s) para confirmar</b>${data.map(r => `${r.qtd} funcionário(s) · holerite ${r.competencia}`).join('<br>')}
        <span style="display:block;margin-top:5px;font-weight:800;text-decoration:underline">Confirmar entrega${pf === 'RH' ? ' (lado do RH)' : ' (lado da loja)'} →</span></a>`;
      a.querySelector('button').onclick = () => { try { localStorage.setItem(CHAVE, String(Date.now() + PAUSA)); } catch (e) { } a.style.display = 'none'; };
      const ver = () => { a.style.display = Date.now() < fechadoAte() ? 'none' : ''; };
      if (noMenu) noMenu.parentNode.insertBefore(a, noMenu); else document.body.appendChild(a);
      dicaAviso(a); ver(); setInterval(ver, 60000);
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
      let totAp = pend.reduce((t, p) => t + (p.qtd || 0), 0);
      // (30/10/2026) freelance criado pelo RH não passa mais pelo Gestor: volta ao RH depois do supervisor
      const itAp = document.querySelector('#menuSistema a.it[data-menu="aprovacoes_gestor.html"]');
      if (totAp && itAp && !itAp.querySelector('.bolha')) { const b = document.createElement('span'); b.className = 'bolha'; b.style.background = '#dc2626'; b.style.color = '#fff'; b.textContent = totAp; itAp.appendChild(b); }
      if (PAGINA === 'aprovacoes_gestor.html') return;
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
            <a href="${telas.has('aprovacoes_gestor.html') ? 'aprovacoes_gestor.html' : p.tela + '?aba=aprovacao'}" class="irAprov" style="background:#dc2626;color:#fff;border-radius:8px;padding:8px 12px;font-weight:800;font-size:12px;text-decoration:none;white-space:nowrap">Aprovar →</a></div>`).join('')}
          <div style="margin-top:10px;color:#b91c1c;font-weight:700;font-size:13px">Enquanto não for aprovado, o Financeiro não recebe esses pagamentos.</div>
          <div style="margin-top:10px;font-size:12px;color:#475569;background:#f8fafc;border-radius:8px;padding:10px">Se fechar agora, o caminho é: <b>menu → Aprovações do Gestor</b> (bolha vermelha) ou <b>Painel → faixa vermelha no topo</b>.</div>
        </div>
        <div style="display:flex;padding:0 22px 20px"><button type="button" style="flex:1;background:#f1f5f9;color:#334155;border:0;border-radius:10px;padding:12px;font-weight:700;font-size:13px;cursor:pointer">Depois</button></div></div>`;
      const fechar = () => { try { sessionStorage.setItem('adiant_aviso_visto', chave); } catch (e) {} m.remove(); };
      m.querySelector('button').onclick = fechar;
      m.querySelectorAll('a.irAprov').forEach(a => a.addEventListener('click', () => setTimeout(fechar, 0)));
      document.body.appendChild(m);
    } catch (e) { console.warn('aprovações do Gestor', e); }
  }

  // cobrança das aprovações do Gestor (regra de 28/10/2026): o RH não avisa o Gestor, então o Financeiro cobra.
  // Financeiro: notificação fixa no menu enquanto houver algo aguardando o Gestor (+ faixa no topo do Financeiro) e,
  // quando o pagamento é HOJE ou AMANHÃ, alerta piscando com som; ✕ ou "Já avisei" escondem por 5 min e ele volta enquanto o Gestor não decidir.
  // Gestor: o mesmo alerta com som para os pagamentos de hoje/amanhã, levando direto à tela "Aprovações do Gestor".
  let somCtx = null;
  function prepararSom() { try { if (!somCtx) somCtx = new (window.AudioContext || window.webkitAudioContext)(); if (somCtx.state === 'suspended') somCtx.resume(); } catch (e) { } }
  function tocarAlerta() {
    try { prepararSom(); if (!somCtx) return;
      [0, 0.28, 0.56].forEach(t => { const o = somCtx.createOscillator(), g = somCtx.createGain(); o.type = 'square'; o.frequency.value = t === 0.28 ? 660 : 880;
        g.gain.setValueAtTime(0.0001, somCtx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.18, somCtx.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, somCtx.currentTime + t + 0.22);
        o.connect(g); g.connect(somCtx.destination); o.start(somCtx.currentTime + t); o.stop(somCtx.currentTime + t + 0.24); });
    } catch (e) { }
  }
  async function cobrancaAprovacoes() {
    const pf = String(window.ACESSO.perfil || '').toUpperCase();
    if (!['FINANCEIRO', 'GESTOR'].includes(pf) || !window.ACESSO_CLI || window.top !== window) return;
    if (pf === 'GESTOR' && PAGINA === 'aprovacoes_gestor.html') return;
    ['click', 'keydown'].forEach(ev => document.addEventListener(ev, prepararSom, { once: true, capture: true }));
    const CHAVE = 'cobranca_gestor_pausa_ate', PAUSA = 5 * 60e3;
    const pausaAte = () => { try { return Number(localStorage.getItem(CHAVE)) || 0; } catch (e) { return 0; } };
    const pausar = () => { try { localStorage.setItem(CHAVE, String(Date.now() + PAUSA)); } catch (e) { } };
    const brl = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const dbr = d => d ? String(d).slice(0, 10).split('-').reverse().join('/') : '';
    const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const isoD = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!document.getElementById('cobrancaCss')) { const st = document.createElement('style'); st.id = 'cobrancaCss';
      st.textContent = '@keyframes cobrancaPisca{0%,100%{box-shadow:0 0 0 4px rgba(220,38,38,.95),0 20px 50px rgba(0,0,0,.35)}50%{box-shadow:0 0 0 12px rgba(220,38,38,.25),0 20px 50px rgba(0,0,0,.35)}}'
        + '@keyframes cobrancaTitulo{0%,100%{background:#dc2626}50%{background:#991b1b}}'
        + '#cobrancaAlerta button{font-family:inherit;cursor:pointer}';
      document.head.appendChild(st); }
    let ultimoSom = 0;
    async function ciclo() {
      let linhas = [];
      try { const { data, error } = await window.ACESSO_CLI.rpc('fn_aprovacoes_gestor_resumo'); if (error) return; linhas = data || []; } catch (e) { return; }
      const hoje = isoD(new Date()), am = new Date(); am.setDate(am.getDate() + 1); const amanha = isoD(am);
      const urg = linhas.filter(r => r.pagamento && r.vencimento && String(r.vencimento).slice(0, 10) <= amanha);
      const qtdTot = linhas.reduce((t, r) => t + (r.qtd || 0), 0);
      const quando = r => { const v = String(r.vencimento || '').slice(0, 10); return !v ? '' : v < hoje ? `ATRASADO (era ${dbr(v)})` : v === hoje ? `HOJE ${dbr(v)}` : v === amanha ? `AMANHÃ ${dbr(v)}` : dbr(v); };
      // 1. notificação fixa (Financeiro): no menu lateral, acima do usuário; some sozinha quando o Gestor decide
      if (pf === 'FINANCEIRO') {
        let n = document.getElementById('cobrancaNotif');
        if (!qtdTot) { if (n) n.remove(); }
        else {
          if (!n) { n = document.createElement('div'); n.id = 'cobrancaNotif';
            const pe = document.querySelector('#menuSistema .pe');
            n.style.cssText = pe ? 'margin:0 10px 8px;background:' + (urg.length ? '#dc2626' : '#B54708') + ';color:#fff;border-radius:10px;padding:8px 10px;font-size:11.5px;line-height:1.35;cursor:pointer'
              : 'position:fixed;left:16px;bottom:16px;z-index:99990;color:#fff;border-radius:12px;padding:10px 14px;font-size:12.5px;max-width:300px;line-height:1.35;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.3)';
            n.title = 'Clique para ver o alerta'; n.onclick = () => { try { localStorage.removeItem(CHAVE); } catch (e) { } mostrarAlerta(true); };
            if (pe) pe.parentNode.insertBefore(n, pe); else document.body.appendChild(n); }
          n.style.background = urg.length ? '#dc2626' : '#B54708';
          n.innerHTML = `<b style="display:block;font-size:12.5px">⏳ ${qtdTot} aguardando o Gestor${urg.length ? ' · URGENTE' : ''}</b>${linhas.map(r => `${esc(r.nome)}: ${r.qtd}${r.pagamento ? ' · ' + brl(r.total) : ''}${r.vencimento ? ' · ' + quando(r) : ''}`).join('<br>')}`;
          dicaAviso(n);
        }
        // faixa no topo da tela principal do Financeiro
        if (PAGINA === 'financeiro.html') {
          let f = document.getElementById('cobrancaFaixa');
          if (!linhas.some(r => r.pagamento)) { if (f) f.remove(); }
          else {
            if (!f) { f = document.createElement('div'); f.id = 'cobrancaFaixa'; document.body.insertBefore(f, document.body.firstChild); }
            const pg = linhas.filter(r => r.pagamento);
            f.style.cssText = 'position:sticky;top:0;z-index:50;display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:10px 18px;color:#fff;font-size:13.5px;background:' + (urg.length ? '#dc2626' : '#B54708');
            f.innerHTML = `<span style="font-size:18px">${urg.length ? '🔴' : '⏳'}</span><span style="flex:1;min-width:220px"><b>Pagamentos travados aguardando a aprovação do Gestor.</b> ${pg.map(r => `${esc(r.nome)}: ${r.qtd} · ${brl(r.total)} · pagar ${quando(r)}`).join(' &nbsp;|&nbsp; ')}<br><span style="font-size:12px;opacity:.9">Sem a aprovação eles não aparecem para pagar. Avise o Gestor (ligação ou WhatsApp).</span></span>
              <button type="button" style="background:#fff;color:#991b1b;border:0;border-radius:8px;padding:8px 12px;font-weight:800;font-size:12.5px;cursor:pointer;font-family:inherit">📋 Copiar mensagem para o Gestor</button>`;
            f.querySelector('button').onclick = () => copiarMensagem(pg);
          }
        }
      }
      // 2. alerta piscando com som (pagamento hoje/amanhã)
      urgentes = urg;
      if (!urg.length) { const a = document.getElementById('cobrancaAlerta'); if (a) a.remove(); return; }
      mostrarAlerta(false);
    }
    let urgentes = [];
    function mensagem(lista) {
      return 'Gestor, há pagamento(s) aguardando a sua aprovação no sistema (menu "Aprovações do Gestor"):\n'
        + lista.map(r => `• ${r.nome}: ${r.qtd} funcionário(s) · ${brl(r.total)}${r.vencimento ? ' · pagar em ' + dbr(r.vencimento) : ''}`).join('\n')
        + '\nSem a aprovação o Financeiro não consegue pagar.';
    }
    async function copiarMensagem(lista) {
      const txt = mensagem(lista);
      try { await navigator.clipboard.writeText(txt); alert('Mensagem copiada. Cole no WhatsApp do Gestor.'); }
      catch (e) { await (window.pedirTexto ? window.pedirTexto('Copie a mensagem abaixo (Ctrl+C) e mande para o Gestor:', txt) : Promise.resolve(prompt('Copie a mensagem:', txt))); }
    }
    function mostrarAlerta(forcar) {
      if (!urgentes.length) return;
      if (!forcar && Date.now() < pausaAte()) return;
      if (document.getElementById('adiantGestorModal')) return;   // a janela de entrada do Gestor já está aberta
      let a = document.getElementById('cobrancaAlerta');
      const novo = !a;
      if (!a) { a = document.createElement('div'); a.id = 'cobrancaAlerta'; document.body.appendChild(a); }
      a.style.cssText = 'position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:99997;width:min(560px,calc(100vw - 32px));background:#fff;border-radius:16px;overflow:hidden;animation:cobrancaPisca 1s ease-in-out infinite;font-family:Inter,ui-sans-serif,system-ui,Segoe UI,Arial,sans-serif';
      const gestor = pf === 'GESTOR';
      const tot = urgentes.reduce((t, r) => t + Number(r.total || 0), 0);
      const hoje = isoD(new Date());
      a.innerHTML = `<div style="animation:cobrancaTitulo 1s ease-in-out infinite;color:#fff;padding:14px 46px 14px 20px;font-weight:800;font-size:16px;position:relative">🔔 ${gestor ? 'Pagamentos aguardando a SUA aprovação' : 'O Gestor ainda não aprovou estes pagamentos'}
          <button type="button" data-a="x" title="Fechar por 5 minutos" aria-label="Fechar" style="position:absolute;top:10px;right:12px;background:rgba(255,255,255,.18);border:0;color:#fff;font-size:16px;font-weight:800;border-radius:8px;width:30px;height:30px">✕</button></div>
        <div style="padding:14px 20px;font-size:14px;color:#0f172a;line-height:1.5">
          ${urgentes.map(r => { const v = String(r.vencimento).slice(0, 10); const tag = v < hoje ? 'ATRASADO' : v === hoje ? 'HOJE' : 'AMANHÃ';
            return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #f1f5f9"><span style="background:${tag === 'AMANHÃ' ? '#ea580c' : '#dc2626'};color:#fff;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:800">${tag} ${dbr(v)}</span><span style="flex:1"><b>${esc(r.nome)}</b> · ${r.qtd} funcionário(s)</span><b>${brl(r.total)}</b></div>`; }).join('')}
          <div style="margin-top:10px;font-weight:700;color:#b91c1c">${gestor ? 'Enquanto o senhor não aprovar, o Financeiro não consegue pagar.' : 'Sem a aprovação do Gestor esses pagamentos não aparecem para pagar. Avise o Gestor agora (ligação ou WhatsApp).'}</div>
          <div style="margin-top:4px;font-size:12px;color:#475569">Total: ${brl(tot)} · ${gestor ? 'se fechar, o aviso volta em 5 minutos.' : 'se fechar, o aviso volta em 5 minutos enquanto o Gestor não decidir.'}</div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;padding:0 20px 18px">
          ${gestor ? `<a href="aprovacoes_gestor.html" data-a="ir" style="flex:1;text-align:center;background:#059669;color:#fff;border-radius:10px;padding:12px;font-weight:800;font-size:14px;text-decoration:none">✓ Abrir e aprovar agora →</a>`
                   : `<button type="button" data-a="copiar" style="flex:1;background:#12161C;color:#fff;border:0;border-radius:10px;padding:12px;font-weight:800;font-size:13px">📋 Copiar mensagem para o Gestor</button>
                      <button type="button" data-a="avisei" style="flex:1;background:#059669;color:#fff;border:0;border-radius:10px;padding:12px;font-weight:800;font-size:13px">✓ Já avisei o Gestor</button>`}
        </div>`;
      a.onclick = e => { const b = e.target.closest('[data-a]'); if (!b) return;
        if (b.dataset.a === 'copiar') { copiarMensagem(urgentes); return; }
        pausar(); a.remove(); };
      if (novo || Date.now() - ultimoSom > 30e3) { ultimoSom = Date.now(); tocarAlerta(); }
    }
    await ciclo();
    setInterval(ciclo, 60000);
  }

  // supervisor: decisões tomadas no lugar dele aguardando ciência com justificativa (regra de 28/10/2026)
  async function cienciaSupervisor() {
    if (String(window.ACESSO.perfil || '').toUpperCase() !== 'SUPERVISOR' || !window.ACESSO_CLI || window.top !== window) return;
    try {
      const { count, error } = await window.ACESSO_CLI.from('freelance_solicitacoes').select('id', { count: 'exact', head: true }).eq('supervisor_forcado', true).is('ciencia_supervisor_em', null);
      if (error || !count) return;
      const item = document.querySelector('#menuSistema a.it[data-menu="supervisor_freelance.html"]');
      if (item && !item.querySelector('.bolha')) { const b = document.createElement('span'); b.className = 'bolha'; b.style.background = '#dc2626'; b.style.color = '#fff'; b.textContent = count; item.appendChild(b);
        const sec = item.closest('.sec'); if (sec) sec.classList.add('aberto'); }
      if (document.getElementById('avisoCiencia')) return;
      const pe = document.querySelector('#menuSistema .pe');
      const a = document.createElement('a'); a.id = 'avisoCiencia'; a.href = 'supervisor_freelance.html';
      a.style.cssText = pe ? 'display:block;margin:0 10px 8px;background:#dc2626;color:#fff;border-radius:10px;padding:8px 10px;font-size:11.5px;line-height:1.35;text-decoration:none'
        : 'position:fixed;left:16px;bottom:16px;z-index:99990;display:block;background:#dc2626;color:#fff;border-radius:12px;padding:10px 14px;font-size:12.5px;max-width:280px;line-height:1.35;text-decoration:none;box-shadow:0 10px 30px rgba(0,0,0,.3)';
      a.innerHTML = `<b style="display:block;font-size:12.5px">🔔 ${count} decisão(ões) no seu lugar</b>Confira e dê ciência com a justificativa →`; dicaAviso(a);
      if (pe) pe.parentNode.insertBefore(a, pe); else document.body.appendChild(a);
    } catch (e) { console.warn('ciência do supervisor', e); }
  }

  // Marketing (regra de 28/10/2026): bolhas no menu e aviso fixo enquanto houver algo para abrir, dar ciência ou responder.
  // Líder: comunicados sem ciência, enquetes, respostas do Marketing. Marketing: pedidos sem resposta / vencendo / atrasados e mensagens novas.
  async function avisosMarketing() {
    const pf = String(window.ACESSO.perfil || '').toUpperCase();
    if (!['LIDER', 'MARKETING', 'SUPERVISOR', 'GESTOR'].includes(pf) || !window.ACESSO_CLI || window.top !== window || !telas.has('marketing_pedidos.html')) return;
    let r; try { const { data, error } = await window.ACESSO_CLI.rpc('fn_mkt_pendencias'); if (error) return; r = data || {}; } catch (e) { return; }
    const bolha = (tela, n, cor) => { const it = document.querySelector(`#menuSistema a.it[data-menu="${tela}"]`); if (!it) return; let b = it.querySelector('.bolha');
      if (!n) { if (b) b.remove(); return; } if (!b) { b = document.createElement('span'); b.className = 'bolha'; it.appendChild(b); } b.style.background = cor; b.style.color = '#fff'; b.textContent = n;
      const sec = it.closest('.sec'); if (sec) sec.classList.add('aberto'); };
    let linhas = [], urg = false, destino = 'marketing_pedidos.html';
    if (pf === 'LIDER') {
      const c = (r.comunicados_sem_ciencia || 0) + (r.enquetes_abertas || 0), p = (r.respostas_mkt || 0) + (r.pedidos_aguardando_loja || 0);
      bolha('marketing_comunicados.html', c, '#dc2626'); bolha('marketing_pedidos.html', p, '#dc2626');
      if (r.comunicados_sem_ciencia) linhas.push(`${r.comunicados_sem_ciencia} comunicado(s) do Marketing aguardando a sua ciência`);
      if (r.enquetes_abertas) linhas.push(`${r.enquetes_abertas} enquete(s) para responder`);
      if (r.respostas_mkt) linhas.push(`${r.respostas_mkt} resposta(s) nova(s) do Marketing nos seus pedidos`);
      if (r.pedidos_aguardando_loja) linhas.push(`${r.pedidos_aguardando_loja} pedido(s) esperando você (informação ou confirmar o recebimento)`);
      urg = c > 0; destino = c > 0 ? 'marketing_comunicados.html' : 'marketing_pedidos.html';
    } else {
      const ped = (r.pedidos_sem_resposta || 0) + (r.mensagens_novas || 0) + (pf === 'GESTOR' ? (r.patrocinios || 0) : 0);
      if (pf !== 'SUPERVISOR') bolha('marketing_pedidos.html', ped, r.pedidos_atrasados ? '#dc2626' : '#B54708');
      bolha('marketing_comunicados.html', (r.comunicados_novos || 0) + (r.lojas_sem_abrir || 0), '#B54708');
      if (pf === 'MARKETING') {
        if (r.pedidos_atrasados) linhas.push(`${r.pedidos_atrasados} pedido(s) com prazo VENCIDO`);
        if (r.pedidos_vencendo) linhas.push(`${r.pedidos_vencendo} pedido(s) vencendo hoje/amanhã`);
        if (r.pedidos_sem_resposta) linhas.push(`${r.pedidos_sem_resposta} pedido(s) das lojas sem resposta`);
        if (r.mensagens_novas) linhas.push(`${r.mensagens_novas} mensagem(ns) nova(s) das lojas`);
        if (r.patrocinios) linhas.push(`${r.patrocinios} patrocínio(s) para analisar`);
        if (r.lojas_sem_abrir) linhas.push(`${r.lojas_sem_abrir} envio(s) ainda não aberto(s) por loja há mais de 1 dia`);
        urg = !!(r.pedidos_atrasados || r.pedidos_vencendo);
      }
    }
    const CH = 'aviso_mkt_fechado_ate', fechadoAte = () => { try { return Number(localStorage.getItem(CH)) || 0; } catch (e) { return 0; } };
    let a = document.getElementById('avisoMkt');
    if (!linhas.length || PAGINA === destino) { if (a) a.remove(); return; }
    const pe = document.querySelector('#menuSistema .pe');
    if (!a) { a = document.createElement('div'); a.id = 'avisoMkt'; if (pe) pe.parentNode.insertBefore(a, pe); else document.body.appendChild(a); }
    a.style.cssText = (pe ? 'position:relative;margin:0 10px 8px;border-radius:10px;padding:8px 26px 8px 10px;font-size:11.5px;'
      : 'position:fixed;left:16px;bottom:16px;z-index:99990;border-radius:12px;padding:10px 34px 10px 14px;font-size:12.5px;max-width:300px;box-shadow:0 10px 30px rgba(0,0,0,.3);')
      + 'line-height:1.35;color:#fff;background:' + (urg ? '#dc2626' : '#a21caf') + (Date.now() < fechadoAte() ? ';display:none' : '');
    a.innerHTML = `<button type="button" title="Fechar por 30 minutos" aria-label="Fechar" style="position:absolute;top:5px;right:7px;background:none;border:0;color:#fff;font-size:15px;font-weight:700;cursor:pointer">✕</button>
      <a href="${destino}" style="color:#fff;text-decoration:none;display:block"><b style="display:block;font-size:12.5px">🎨 MKT: ${linhas.map(l => l.split(' ').slice(0, 2).join(' ')).join(' · ')}</b>${linhas.join('<br>')}<span style="display:block;margin-top:4px;font-weight:800;text-decoration:underline">Abrir →</span></a>`;
    dicaAviso(a);
    a.querySelector('button').onclick = () => { try { localStorage.setItem(CH, String(Date.now() + 30 * 60e3)); } catch (e) { } a.style.display = 'none'; };
  }

  // cronograma da folha (regra de 28/10/2026): aviso obrigatório com ciência para RH e Gestor (cronograma.js)
  async function cronogramaAvisos() {
    const pf = String(window.ACESSO.perfil || '').toUpperCase();
    if (!['RH', 'GESTOR'].includes(pf) || !window.ACESSO_CLI || window.top !== window) return;
    try { if (!window.Cronograma) await carregarScript('cronograma.js?v=1'); window.Cronograma.iniciarAvisos(window.ACESSO_CLI, pf, PAGINA); } catch (e) { console.warn('cronograma', e); }
  }

  // pendências no menu (regra de 21/10/2026): bolha com o número em cada tela onde se resolve;
  // vermelha piscando = fora do prazo (fica até resolver), laranja = para resolver no prazo.
  // Para o Gestor é informativo: a "Central de pendências" pisca quando alguém da equipe está fora do prazo.
  function carregarScript(src) { return new Promise((ok, erro) => { const sc = document.createElement('script'); sc.src = src; sc.onload = ok; sc.onerror = erro; document.head.appendChild(sc); }); }
  async function pendenciasMenu() {
    const pf = String(window.ACESSO.perfil || '').toUpperCase();
    if (!['RH', 'SUPERVISOR', 'GESTOR'].includes(pf) || !window.ACESSO_CLI || !telas.has('pendencias.html')) return;
    try {
      if (!window.Pendencias) await carregarScript('pendencias_core.js?v=6');
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
        lista = lista.filter(x => x !== t); salvar(); ativar(prox); return;   // sem recarregar: as outras abas continuam como estão (regra de 28/10/2026)
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
    montar(); if (!CELULAR && window.innerWidth > 900) abas(); padronizar(); setTimeout(padronizar, 700); telaCheia(); avisosLider(); adiantamentoGestor(); holeritePendente(); cobrancaAprovacoes(); cienciaSupervisor(); avisosMarketing(); setInterval(avisosMarketing, 120000); pendenciasMenu(); setInterval(pendenciasMenu, 120000); cronogramaAvisos(); ajustarCelular(); setTimeout(ajustarCelular, 800); setTimeout(ajustarCelular, 3000); limparCabecalho(); setTimeout(limparCabecalho, 600); setTimeout(limparCabecalho, 2500); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
