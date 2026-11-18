// =====================================================================
// AVISO DE ATUALIZAÇÃO DA BASE DO FINANCEIRO (18/11/2026, HQ)
// Usado nas telas que mostram números do Alpha7 (Fluxo de caixa, Saldos e aplicações).
// Enquanto uma carga do Alpha7 está sendo enviada ou aplicada (fin_cargas ENVIANDO recente, NA_FILA, APLICANDO),
// aparece uma janela no meio da tela que não fecha: os números ainda não estão completos.
// Quando a carga termina, a tela recarrega sozinha com a base nova.
// =====================================================================
(function () {
  let ativo = false, timer = null, el = null;
  const hhmm = t => t ? new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function mostrar(c) {
    if (!el) {
      el = document.createElement('div'); el.id = 'finCargaAviso';
      el.style.cssText = 'position:fixed;inset:0;z-index:99997;background:rgba(15,23,42,.6);display:flex;align-items:center;justify-content:center;padding:16px';
      document.body.appendChild(el);
      if (!document.getElementById('finCargaAnim')) { const st = document.createElement('style'); st.id = 'finCargaAnim';
        st.textContent = '@keyframes finCargaVai{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}'; document.head.appendChild(st); }
    }
    const quem = String(c.por || '').split('@')[0], fase = c.status === 'ENVIANDO' ? 'enviando o arquivo do Alpha7' : 'atualizando a base do financeiro';
    el.innerHTML = `<div style="background:#fff;border-radius:16px;max-width:520px;width:100%;padding:24px;box-shadow:0 20px 50px rgba(0,0,0,.35);border-top:10px solid #d97706;font-family:inherit;text-align:center">
      <div style="font-size:34px">⏳</div>
      <div style="font-size:19px;font-weight:800;color:#0f172a;margin-top:4px">O sistema está ${fase}</div>
      <div style="font-size:14px;color:#334155;margin-top:8px">Os números desta tela <b style="color:#b45309">ainda NÃO estão completos</b>. Arquivo enviado por <b>${esc(quem)}</b> às ${hhmm(c.fila_em || c.em)}.</div>
      <div style="height:8px;background:#fde68a;border-radius:999px;overflow:hidden;margin:16px 0 10px"><div style="height:8px;width:40%;background:#d97706;border-radius:999px;animation:finCargaVai 1.4s linear infinite"></div></div>
      <div style="font-size:12px;color:#64748b">Leva poucos minutos. Esta tela recarrega sozinha quando terminar.</div></div>`;
  }
  async function checar() {
    clearTimeout(timer);
    const cli = window.ACESSO_CLI;
    if (!cli || document.hidden) { timer = setTimeout(checar, ativo ? 3000 : 5000); return; }
    let c = null;
    try {
      const { data } = await cli.from('fin_cargas').select('id, status, por, em, fila_em, atualizado_em').order('id', { ascending: false }).limit(5);
      c = (data || []).find(x => x.status === 'NA_FILA' || x.status === 'APLICANDO'
        || (x.status === 'ENVIANDO' && Date.now() - new Date(x.atualizado_em || x.em).getTime() < 3 * 60000)) || null;
    } catch (e) { }
    if (c) { ativo = true; mostrar(c); }
    else if (ativo) { location.reload(); return; }   // terminou: recarrega com a base nova
    timer = setTimeout(checar, c ? 5000 : 30000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', checar); else checar();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checar(); });
})();
