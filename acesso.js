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
  const raiz = document.documentElement;
  raiz.style.visibility = 'hidden';
  const liberar = () => { raiz.style.visibility = ''; };
  const cli = window.supabase.createClient('https://jmetpmdnaxwabeccimgg.supabase.co', 'sb_publishable_hAUmVXDFrzRg5R1xGx_CoQ_bgct2D6k');
  (async () => {
    try {
      const { data: { user } } = await cli.auth.getUser();
      if (!user) { location.replace('login.html'); return; }
      const { data, error } = await cli.rpc('fn_minhas_telas');
      if (error) { console.warn('Acesso por tela ainda não configurado:', error.message); liberar(); return; }
      if (!data || !data.perfil) { alert('Seu usuário não tem perfil ativo no sistema.'); location.replace('login.html'); return; }
      window.ACESSO = data; window.ACESSO.email = user.email; window.ACESSO_CLI = cli;
      // menu lateral único (as duas telas de importação ficam com o visual próprio)
      if (!['importar_alpha7.html', 'importar_consumo_farmacia.html'].includes(PAGINA)) {
        const sm = document.createElement('script'); sm.src = 'menu.js?v=7'; (document.head || document.documentElement).appendChild(sm);
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
