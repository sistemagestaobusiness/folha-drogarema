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
  // perfis que só usam o sistema em tela cheia no computador (para incluir outro perfil, acrescentar aqui)
  const TELA_CHEIA = [];   // DESLIGADA em 07/10. Para religar: ['LIDER', 'SUPERVISOR']
  const CELULAR = Math.min(screen.width, screen.height) < 700 || (window.matchMedia && matchMedia('(hover: none)').matches);

  const css = document.createElement('style');
  css.textContent = `
    html.menu-on body { padding-left: ${L}px; background: #f1f5f9 !important; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    html.menu-on .fixed.inset-x-0 { left: ${L}px; }
    #menuSistema { position: fixed; top: 0; left: 0; bottom: 0; width: ${L}px; background: #fff; z-index: 45; display: flex; flex-direction: column; font-family: inherit; box-shadow: 1px 0 0 #e2e8f0; }
    #menuSistema .marca { padding: 18px 18px 10px; }
    #menuSistema .marca b { display: block; font-size: 17px; font-weight: 800; color: #0f172a; letter-spacing: -.01em; }
    #menuSistema .marca span { font-size: 11px; color: #94a3b8; }
    #menuSistema nav { flex: 1; overflow-y: auto; padding: 4px 10px 12px; }
    #menuSistema .marca img { height: 34px; display: block; margin-bottom: 6px; }
    #menuSistema .sec { border-top: 2px solid #e2e8f0; margin-top: 6px; padding-top: 4px; }
    #menuSistema .grupo { display: flex; align-items: center; width: 100%; background: none; border: 0; cursor: pointer; font-family: inherit; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #475569; padding: 9px 10px; border-radius: 8px; text-align: left; }
    #menuSistema .grupo:hover { background: #f8fafc; color: #0f172a; }
    #menuSistema .grupo::after { content: '▸'; margin-left: auto; font-size: 11px; color: #94a3b8; transition: transform .12s; }
    #menuSistema .sec.aberto .grupo::after { transform: rotate(90deg); }
    #menuSistema .sec .itens { display: none; padding-bottom: 4px; }
    #menuSistema .sec.aberto .itens { display: block; }
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

  function montar() {
    if (document.getElementById('menuSistema')) return;
    const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    let guard = {}; try { guard = JSON.parse(localStorage.getItem('menu_grupos') || '{}') || {}; } catch (e) {}
    const corpo = GRUPOS.map(([g, itens]) => { const vis = itens.filter(i => telas.has(i[0])); if (!vis.length) return '';
      const its = vis.map(([arq, nome, ic]) => `<a class="it ${arq === PAGINA ? 'on' : ''}" href="${arq}" data-menu="${arq}"><i>${ic}</i><span>${nome}</span></a>`).join('');
      if (!g) return its;
      const aberto = g in guard ? !!guard[g] : vis.some(i => i[0] === PAGINA);
      return `<div class="sec ${aberto ? 'aberto' : ''}" data-g="${g}"><button type="button" class="grupo">${g}</button><div class="itens">${its}</div></div>`; }).join('');
    const aside = document.createElement('aside'); aside.id = 'menuSistema';
    aside.innerHTML = `<div class="marca"><img src="logo_business.png" alt="${MARCA}"><span>Sistema de gestão</span></div><nav>${corpo}</nav>
      <div class="pe"><div class="quem" title="${esc(window.ACESSO.email || '')}">${esc(window.ACESSO.email || '')}</div><div>${esc(window.ACESSO.perfil || '')}</div><button type="button" id="menuSair">Sair</button></div>`;
    document.body.appendChild(aside);
    const abre = document.createElement('button'); abre.id = 'menuAbre'; abre.type = 'button'; abre.textContent = '☰'; abre.setAttribute('aria-label', 'Abrir o menu');
    abre.onclick = () => document.documentElement.classList.toggle('menu-aberto');
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

  const iniciar = () => { montar(); telaCheia(); ajustarCelular(); setTimeout(ajustarCelular, 800); setTimeout(ajustarCelular, 3000); limparCabecalho(); setTimeout(limparCabecalho, 600); setTimeout(limparCabecalho, 2500); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
