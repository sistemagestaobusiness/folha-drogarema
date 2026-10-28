// =====================================================================
// Controle de acesso por tela (perfil + telas extras do usuário).
// Carregado logo depois do supabase-js em todas as telas.
// - Se o usuário não pode abrir esta tela: volta para a página inicial do perfil.
// - Esconde links para telas que ele não pode abrir.
// Regras definidas em "Perfis e acessos" (tabelas perfis / perfil_telas / usuario_telas_extra).
// =====================================================================
// ---------------------------------------------------------------------
// UTILIDADES COMUNS (regra de 28/10/2026)
// - rpcRetentar: tenta de novo quando a falha é de conexão (rede lenta não vira "sem acesso")
// - traduzirErro: mensagens do banco em inglês viram português simples em todo alert() do sistema
// ---------------------------------------------------------------------
window.rpcRetentar = window.rpcRetentar || async function (cli, nome, args) {
  let r;
  for (let i = 0; i < 3; i++) {
    try { r = await cli.rpc(nome, args); } catch (e) { r = { data: null, error: { message: String(e && e.message || e) } }; }
    if (!r.error || !/fetch|network|timeout|Failed|503|502|504/i.test(r.error.message || '')) return r;
    await new Promise(ok => setTimeout(ok, 700 * (i + 1)));
  }
  return r;
};
window.traduzirErro = window.traduzirErro || function (texto) {
  let t = String(texto ?? '');
  const R = [
    [/JWT expired|invalid JWT|Auth session missing|refresh_token_not_found|Invalid Refresh Token[^\n]*/gi, 'sua sessão expirou: saia e entre de novo no sistema'],
    [/TypeError: Failed to fetch|Failed to fetch|NetworkError[^\n]*|Load failed|fetch failed/gi, 'sem conexão com o servidor: confira a internet e tente de novo'],
    [/new row violates row-level security policy[^\n]*|permission denied for [^\n]*|violates row-level security[^\n]*/gi, 'sem permissão para esta ação (avise o Gestor)'],
    [/duplicate key value violates unique constraint[^\n]*/gi, 'este registro já existe'],
    [/(update or delete on table|insert or update on table)[^\n]*violates foreign key constraint[^\n]*/gi, 'o registro está ligado a outro cadastro e não pode ser alterado ou excluído'],
    [/null value in column "?([a-z_]+)"?[^\n]*violates not-null constraint[^\n]*/gi, 'falta preencher um campo obrigatório ($1)'],
    [/new row for relation[^\n]*violates check constraint[^\n]*|violates check constraint[^\n]*/gi, 'valor não permitido para este campo'],
    [/invalid input syntax for type (numeric|integer|bigint|date|uuid|timestamp[^:]*)[^\n]*/gi, 'valor digitado em formato inválido'],
    [/canceling statement due to statement timeout/gi, 'a operação demorou demais: tente de novo em instantes'],
    [/Could not find the function[^\n]*|schema cache[^\n]*/gi, 'função ainda não disponível no sistema (avise o administrador)'],
    [/\s*\(?\s*rode (antes )?o SQL [^\n.)]*\)?\.?/gi, ' (avise o administrador)'],
    [/\s*\(o SQL [A-Z0-9_]+ foi rodado\?\)/gi, '']
  ];
  R.forEach(([re, novo]) => { t = t.replace(re, novo); });
  return t;
};
// pedirTexto: janela do sistema no lugar da caixinha prompt() do navegador (mesmo uso: devolve o texto ou null se cancelar)
// lerValor: lê "1.250,00", "1250,00" ou "1250.5" corretamente
window.lerValor = window.lerValor || function (t) {
  let x = String(t ?? '').trim().replace(/\s|R\$/g, '');
  if (!x) return NaN;
  if (x.includes(',')) x = x.replace(/\./g, '').replace(',', '.');
  else if (!/^-?\d+\.\d{1,2}$/.test(x)) x = x.replace(/\./g, '');
  return parseFloat(x);
};
window.pedirTexto = window.pedirTexto || function (mensagem, inicial, opcoes) {
  const o = opcoes || {};
  return new Promise(resolve => {
    const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const fundo = document.createElement('div');
    fundo.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(16,24,40,.55);display:flex;align-items:flex-start;justify-content:center;padding:60px 16px;font-family:Inter,ui-sans-serif,system-ui,Segoe UI,Arial,sans-serif';
    const longo = /motivo|justific|explique|observa|o que há/i.test(String(mensagem));
    fundo.innerHTML = `<div role="dialog" aria-modal="true" style="background:#fff;border-radius:14px;max-width:520px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.35);padding:18px 18px 14px">
      <div style="font-size:13.5px;color:#1e293b;line-height:1.5;white-space:pre-wrap;max-height:50vh;overflow:auto">${esc(mensagem)}</div>
      ${longo ? `<textarea rows="3" style="margin-top:10px;width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:8px;padding:8px;font:inherit;font-size:13px"></textarea>`
              : `<input type="text" style="margin-top:10px;width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:8px;padding:8px;font:inherit;font-size:13px">`}
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
        <button type="button" data-a="nao" style="border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:8px;padding:7px 14px;font:inherit;font-size:13px;font-weight:600;cursor:pointer">Cancelar</button>
        <button type="button" data-a="ok" style="border:0;background:#12161C;color:#fff;border-radius:8px;padding:7px 16px;font:inherit;font-size:13px;font-weight:700;cursor:pointer">OK</button></div></div>`;
    const campo = fundo.querySelector('textarea, input');
    campo.value = inicial == null ? '' : String(inicial);
    const fim = v => { document.removeEventListener('keydown', tecla, true); fundo.remove(); resolve(v); };
    const tecla = e => { if (e.key === 'Escape') { e.preventDefault(); fim(null); } else if (e.key === 'Enter' && (campo.tagName === 'INPUT' || e.ctrlKey)) { e.preventDefault(); fim(campo.value); } };
    fundo.addEventListener('click', e => { const b = e.target.closest('button[data-a]'); if (b) fim(b.dataset.a === 'ok' ? campo.value : null); });
    document.addEventListener('keydown', tecla, true);
    document.body.appendChild(fundo);
    setTimeout(() => { campo.focus(); if (campo.select) campo.select(); }, 30);
  });
};
// Rascunho: o que foi digitado numa tela fica guardado neste computador até confirmar (regra de 28/10/2026)
window.Rascunho = window.Rascunho || {
  ler(ch) { try { return JSON.parse(localStorage.getItem(ch) || 'null'); } catch (e) { return null; } },
  gravar(ch, itens) { try { if (itens && Object.keys(itens).length) localStorage.setItem(ch, JSON.stringify({ em: new Date().toISOString(), itens })); else localStorage.removeItem(ch); } catch (e) { } },
  tirar(ch, ids) { const r = this.ler(ch); if (!r || !r.itens) return; ids.forEach(i => delete r.itens[i]); this.gravar(ch, r.itens); },
  apagar(ch) { try { localStorage.removeItem(ch); } catch (e) { } },
  faixa(el, n, em, acaoDescartar) {
    if (!el) return;
    if (!n) { el.style.display = 'none'; el.innerHTML = ''; return; }
    const dh = em ? new Date(em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
    el.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:10px;background:#FFFAEB;border:1px solid #FEC84B;color:#7A2E0E;border-radius:8px;padding:7px 12px;font-size:11.5px;margin:6px 0';
    el.innerHTML = `<span style="flex:1">💾 <b>${n} preenchimento(s) guardado(s) neste computador</b> (ainda não confirmados). Pode fechar e voltar depois: nada se perde até confirmar.${dh ? ' Guardado em ' + dh + '.' : ''}</span><button type="button" style="background:#fff;border:1px solid #FEC84B;border-radius:6px;padding:3px 8px;font-weight:700;cursor:pointer" onclick="${acaoDescartar}">descartar o que foi digitado</button>`;
  }
};
// Dia útil para pagamento (regra de 28/10/2026): sábado, domingo e feriado NACIONAL ou ESTADUAL (tabela feriados, sem loja)
// não têm pagamento; antecipa para o dia útil anterior. Feriado municipal (com loja) não entra: o Financeiro trabalha normal.
window.DiaUtil = window.DiaUtil || {
  _fer: null, _carregando: null,
  carregar(cli) {
    if (this._fer) return Promise.resolve();
    if (this._carregando) return this._carregando;
    const c = cli || window.ACESSO_CLI || window._supabase;
    if (!c || !c.from) { this._fer = new Map(); return Promise.resolve(); }
    this._carregando = (async () => {
      try { const { data } = await c.from('feriados').select('data, nome').is('loja_id', null); this._fer = new Map((data || []).map(f => [String(f.data).slice(0, 10), f.nome])); }
      catch (e) { this._fer = new Map(); }
    })();
    return this._carregando;
  },
  _d(iso) { const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number); return new Date(a, m - 1, d); },
  _iso(dt) { return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`; },
  _br(iso) { return String(iso).slice(0, 10).split('-').reverse().join('/'); },
  // null = dia útil; senão o motivo ("sábado", "domingo", "feriado: NATAL")
  motivo(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(String(iso))) return null;
    const dow = this._d(iso).getDay();
    if (dow === 6) return 'sábado'; if (dow === 0) return 'domingo';
    const f = this._fer && this._fer.get(String(iso).slice(0, 10));
    return f ? 'feriado: ' + f : null;
  },
  anterior(iso) {
    if (!iso) return iso;
    const dt = this._d(iso);
    for (let i = 0; i < 15 && this.motivo(this._iso(dt)); i++) dt.setDate(dt.getDate() - 1);
    return this._iso(dt);
  },
  // confere a data escolhida pelo RH: se não for dia útil, pergunta se usa o dia útil anterior. Devolve a data final ou null (cancelou).
  async conferir(iso, cli) {
    if (!iso) return iso;
    await this.carregar(cli);
    const mot = this.motivo(iso); if (!mot) return iso;
    const ant = this.anterior(iso);
    const SEM = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    const diaAnt = SEM[this._d(ant).getDay()];
    return new Promise(resolve => {
      const f = document.createElement('div');
      f.style.cssText = 'position:fixed;inset:0;z-index:100001;background:rgba(16,24,40,.55);display:flex;align-items:flex-start;justify-content:center;padding:70px 16px;font-family:Inter,ui-sans-serif,system-ui,Segoe UI,Arial,sans-serif';
      f.innerHTML = `<div role="dialog" aria-modal="true" style="background:#fff;border-radius:14px;max-width:480px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.35);overflow:hidden">
        <div style="background:#B54708;color:#fff;padding:12px 18px;font-weight:800;font-size:15px">📅 ${this._br(iso)} é ${mot}</div>
        <div style="padding:14px 18px;font-size:13.5px;color:#1e293b;line-height:1.5">Nesse dia não há pagamento. O dia útil anterior é <b>${diaAnt}, ${this._br(ant)}</b>.<br><span style="font-size:12px;color:#475569">Pagar antes não tem problema; pagar depois é atraso.</span></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;padding:0 18px 16px">
          <button type="button" data-a="ant" style="flex:1;border:0;background:#059669;color:#fff;border-radius:8px;padding:10px 12px;font:inherit;font-size:13px;font-weight:800;cursor:pointer">✓ Usar ${diaAnt} ${this._br(ant)}</button>
          <button type="button" data-a="manter" style="border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:8px;padding:10px 12px;font:inherit;font-size:13px;font-weight:600;cursor:pointer">Manter ${this._br(iso)}</button>
          <button type="button" data-a="cancelar" style="border:0;background:none;color:#64748b;padding:10px 6px;font:inherit;font-size:12.5px;cursor:pointer">Cancelar</button></div></div>`;
      f.addEventListener('click', e => { const b = e.target.closest('button[data-a]'); if (!b) return; f.remove(); resolve(b.dataset.a === 'ant' ? ant : b.dataset.a === 'manter' ? iso : null); });
      document.body.appendChild(f);
    });
  }
};
if (!window.__alertTraduzido) {
  window.__alertTraduzido = true;
  const alertaOriginal = window.alert.bind(window);
  window.alert = m => alertaOriginal(window.traduzirErro(m));
}

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

  // sem conexão: avisa no topo em vez de deixar a tela vazia, sem explicação (regra de 28/10/2026)
  function faixaSemConexao() {
    const pôr = () => { if (document.getElementById('faixaSemConexao')) return;
      const d = document.createElement('div'); d.id = 'faixaSemConexao';
      d.style.cssText = 'position:sticky;top:0;z-index:99998;background:#B42318;color:#fff;font:600 13px system-ui,sans-serif;padding:9px 14px;text-align:center';
      d.innerHTML = 'Sem conexão com o servidor agora. Confira a internet e <a href="#" style="color:#fff;text-decoration:underline" onclick="location.reload();return false">recarregue a página</a>.';
      document.body.prepend(d); };
    if (document.body) pôr(); else document.addEventListener('DOMContentLoaded', pôr);
  }
  const raiz = document.documentElement;
  raiz.style.visibility = 'hidden';
  const liberar = () => { raiz.style.visibility = ''; };
  const cli = window.supabase.createClient('https://jmetpmdnaxwabeccimgg.supabase.co', 'sb_publishable_hAUmVXDFrzRg5R1xGx_CoQ_bgct2D6k');
  (async () => {
    try {
      const { data: { user }, error: eu } = await cli.auth.getUser();
      if (!user) {
        // sem conexão com o Supabase: não derruba o login (senão vira laço); avisa e libera a tela
        if (eu && /fetch|network|timeout|Failed/i.test(eu.message || '')) { console.warn('Sem conexão com o banco:', eu.message); liberar(); faixaSemConexao(); return; }
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
        const sm = document.createElement('script'); sm.src = 'menu.js?v=34'; (document.head || document.documentElement).appendChild(sm);
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
