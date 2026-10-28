// =====================================================================
// Controle de acesso por tela (perfil + telas extras do usuário).
// Carregado logo depois do supabase-js em todas as telas.
// - Se o usuário não pode abrir esta tela: volta para a página inicial do perfil.
// - Esconde links para telas que ele não pode abrir.
// Regras definidas em "Perfis e acessos" (tabelas perfis / perfil_telas / usuario_telas_extra).
// =====================================================================
(function () {
  const PAGINA = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (PAGINA === 'login.html' || !window.supabase) return;
  // INATIVIDADE (regra de 26/10/2026): um relógio só para o sistema todo.
  // Qualquer uso em qualquer aba (mouse, teclado, rolagem, digitação, gravação/leitura no banco) conta como atividade.
  // As abas (iframes) só avisam que houve uso; quem decide sair é a janela principal, depois de 30 min sem uso, com aviso 2 min antes.
  (function () {
    const CHAVE = 'drogarema_atividade', LIMITE = 30 * 60e3, AVISO = 2 * 60e3;
    const ler = () => { try { return Number(localStorage.getItem(CHAVE)) || 0; } catch (e) { return 0; } };
    let gravado = 0, aviso = null;
    const marcar = (forcar) => {
      const t = Date.now();
      if (forcar !== true && t - gravado < 10000) return;
      gravado = t;
      try { localStorage.setItem(CHAVE, String(t)); } catch (e) { }
      if (aviso) { aviso.remove(); aviso = null; }
    };
    ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'input', 'scroll'].forEach(ev => window.addEventListener(ev, marcar, { passive: true, capture: true }));
    if (window.fetch && !window.fetch.__drogaremaUso) {   // ler ou gravar no banco também é uso (evita sair no meio de uma ação)
      const original = window.fetch;
      const comUso = function () { marcar(); return original.apply(this, arguments); };
      comUso.__drogaremaUso = true; window.fetch = comUso;
    }
    marcar(true);
    if (window.top !== window) return;
    const sair = async () => {
      try { localStorage.removeItem('usuario_drogarema'); } catch (e) { }
      try { await window.supabase.createClient('https://jmetpmdnaxwabeccimgg.supabase.co', 'sb_publishable_hAUmVXDFrzRg5R1xGx_CoQ_bgct2D6k').auth.signOut({ scope: 'local' }); } catch (e) { }
      location.replace('login.html');
    };
    setInterval(() => {
      const parado = Date.now() - Math.max(ler(), gravado);
      if (parado >= LIMITE) { sair(); return; }
      if (parado >= LIMITE - AVISO && !aviso && document.body) {
        aviso = document.createElement('div');
        aviso.setAttribute('role', 'alert');
        aviso.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;background:#1e293b;color:#fff;padding:12px 16px;border-radius:10px;font:600 13px system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3);display:flex;gap:12px;align-items:center';
        aviso.innerHTML = 'Sem uso há 28 minutos: o sistema sai em 2 minutos. Mexa o mouse ou clique em <button type="button" style="background:#d4a056;color:#1e293b;border:0;border-radius:6px;padding:6px 12px;font-weight:800;cursor:pointer">Continuar</button>';
        aviso.querySelector('button').onclick = () => marcar(true);
        document.body.appendChild(aviso);
      }
    }, 15000);
  })();

  const raiz = document.documentElement;
  raiz.style.visibility = 'hidden';
  const liberar = () => { raiz.style.visibility = ''; };
  const cli = window.supabase.createClient('https://jmetpmdnaxwabeccimgg.supabase.co', 'sb_publishable_hAUmVXDFrzRg5R1xGx_CoQ_bgct2D6k');
  (async () => {
    try {
      const { data: { user }, error: eu } = await cli.auth.getUser();
      if (!user) {
        // sem conexão com o Supabase: não derruba o login (senão vira laço); avisa e libera a tela
        if (eu && /fetch|network|timeout|Failed/i.test(eu.message || '')) { console.warn('Sem conexão com o banco:', eu.message); liberar(); return; }
        // sessão vencida: limpa a marca e a sessão guardada antes de voltar ao login (evita o laço login ↔ painel)
        try { localStorage.removeItem('usuario_drogarema'); await cli.auth.signOut({ scope: 'local' }); } catch (e) { }
        (window.top !== window ? window.top : window).location.replace('login.html'); return;
      }   // dentro de uma aba: volta o sistema inteiro para o login
      const { data, error } = await cli.rpc('fn_minhas_telas');
      if (error) { console.warn('Acesso por tela ainda não configurado:', error.message); liberar(); return; }
      if (!data || !data.perfil) { alert('Seu usuário não tem perfil ativo no sistema.'); location.replace('login.html'); return; }
      window.ACESSO = data; window.ACESSO.email = user.email; window.ACESSO_CLI = cli;
      // menu lateral único (as duas telas de importação ficam com o visual próprio)
      if (!['importar_alpha7.html', 'importar_consumo_farmacia.html'].includes(PAGINA)) {
        const sm = document.createElement('script'); sm.src = 'menu.js?v=31'; (document.head || document.documentElement).appendChild(sm);
      }
      const telas = new Set((data.telas || []).map(t => String(t).toLowerCase()));
      if (!telas.has(PAGINA)) {
        const inicio = data.pagina_inicial && telas.has(data.pagina_inicial) ? data.pagina_inicial : 'login.html';
        alert('Seu perfil não tem acesso a esta tela.');
        location.replace(inicio === PAGINA ? 'login.html' : inicio);
        return;
      }
      const esconderLinks = () => document.querySelectorAll('a[href]').forEach(a => {
        const alvo = String(a.getAttribute('href') || '').split(/[?#]/)[0].toLowerCase();
        if (alvo.endsWith('.html') && alvo !== 'login.html' && !telas.has(alvo)) a.style.display = 'none';
      });
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', esconderLinks); else esconderLinks();
      new MutationObserver(esconderLinks).observe(raiz, { childList: true, subtree: true });
    } catch (e) { console.error('acesso.js', e); }
    liberar();
  })();
})();

// Rolo do mouse em cima de um campo de valor: o navegador muda o número em vez de rolar a tela.
// Aqui o campo perde o foco antes, então o rolo só rola a página (vale para todas as telas).
document.addEventListener('wheel', function () {
  var el = document.activeElement;
  if (el && el.tagName === 'INPUT' && el.type === 'number') el.blur();
}, { passive: true, capture: true });
