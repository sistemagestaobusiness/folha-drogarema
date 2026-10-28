// =====================================================================
// CRONOGRAMA DO RH (regra de 28/10/2026)
// Prazos do mês (adiantamento dia 15, início do fechamento dia 25, VT e envio à contabilidade no último dia útil,
// comissões do Gestor no 1º dia útil) calculados no banco (fn_cronograma).
// Aviso obrigatório: a partir de 3 dias úteis antes do prazo abre uma janela que só fecha com "Ciente";
// volta a cada 60 min (3 dias), 30 min (2), 15 min (1) e 5 min (no dia e atrasado). Para sozinho quando a etapa fica feita.
// Usado pelo menu.js (aviso, RH e Gestor) e pela Central de pendências (tabela do cronograma).
// =====================================================================
(function (global) {
  const INTERVALO_MIN = d => d >= 3 ? 60 : d === 2 ? 30 : d === 1 ? 15 : 5;
  const SEM = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dbr = iso => iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '';
  const dSem = iso => { const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number); return SEM[new Date(a, m - 1, d).getDay()]; };
  const dh = ts => ts ? new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
  const quando = e => e.status === 'FEITO' ? 'feito' : e.dias < 0 ? `ATRASADO ${-e.dias} dia(s) útil(eis)` : e.dias === 0 ? 'HOJE' : e.dias === 1 ? 'amanhã (1 dia útil)' : `em ${e.dias} dias úteis`;
  const cor = e => e.status === 'FEITO' ? '#059669' : e.dias <= 0 ? '#dc2626' : e.dias === 1 ? '#ea580c' : e.dias <= 3 ? '#B54708' : '#64748b';

  async function carregar(cli) {
    const { data, error } = await cli.rpc('fn_cronograma');
    if (error) throw error;
    return data || { etapas: [] };
  }

  // etapas que pedem aviso agora para este perfil
  function devidas(dados, perfil, pagina) {
    const agora = Date.now();
    return (dados.etapas || []).filter(e => e.status !== 'FEITO' && e.status !== 'FUTURO' && e.dias <= 3 && e.resp === perfil && e.tela !== pagina
      && (!e.ultima_ciencia || agora - new Date(e.ultima_ciencia).getTime() >= INTERVALO_MIN(e.dias) * 60e3));
  }

  // ---------- janela obrigatória ----------
  let cli = null, perfil = null, pagina = '', dados = null, somCtx = null, ultimoSom = 0;
  function beep() {
    try { if (!somCtx) somCtx = new (window.AudioContext || window.webkitAudioContext)(); if (somCtx.state === 'suspended') return;
      [0, 0.25].forEach(t => { const o = somCtx.createOscillator(), g = somCtx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(somCtx.destination);
        g.gain.setValueAtTime(0.18, somCtx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, somCtx.currentTime + t + 0.2); o.start(somCtx.currentTime + t); o.stop(somCtx.currentTime + t + 0.22); });
    } catch (e) { }
  }
  function mostrar(lista) {
    let m = document.getElementById('cronAviso');
    if (!lista.length) { if (m) m.remove(); return; }
    if (!m) { m = document.createElement('div'); m.id = 'cronAviso'; document.body.appendChild(m); }
    const urg = lista.some(e => e.dias <= 0);
    m.style.cssText = 'position:fixed;inset:0;z-index:99996;background:rgba(15,23,42,.6);display:flex;align-items:flex-start;justify-content:center;padding:60px 16px;overflow:auto;font-family:Inter,ui-sans-serif,system-ui,Segoe UI,Arial,sans-serif';
    m.innerHTML = `<div role="dialog" aria-modal="true" style="background:#fff;border-radius:16px;max-width:620px;width:100%;overflow:hidden;box-shadow:0 0 0 ${urg ? '5px rgba(220,38,38,.9)' : '3px rgba(181,71,8,.7)'},0 20px 50px rgba(0,0,0,.4)">
      <div style="background:${urg ? '#dc2626' : '#B54708'};color:#fff;padding:14px 20px;font-weight:800;font-size:16px">📅 Cronograma da folha: ${lista.length === 1 ? 'prazo chegando' : lista.length + ' prazos chegando'}</div>
      <div style="padding:6px 20px 4px">${lista.map((e, i) => `<div style="padding:12px 0;border-bottom:1px solid #f1f5f9">
          <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px"><span style="background:${cor(e)};color:#fff;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:800">${esc(quando(e).toUpperCase())}</span>
            <b style="font-size:14.5px;color:#0f172a">${esc(e.titulo)}</b><span style="font-size:12px;color:#64748b">· ${esc(e.ref)} · prazo ${dSem(e.prazo)}, ${dbr(e.prazo)}${e.prazo !== e.prazo_base ? ` (dia ${dbr(e.prazo_base).slice(0, 5)} não é útil)` : ''}</span></div>
          <ul style="margin:6px 0 0 18px;padding:0;font-size:13px;color:#334155;line-height:1.5">${(e.falta || []).map(f => `<li>${esc(f)}</li>`).join('')}</ul>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
            <button type="button" data-i="${i}" data-a="ciente" style="background:#059669;color:#fff;border:0;border-radius:8px;padding:9px 14px;font:inherit;font-size:13px;font-weight:800;cursor:pointer">✓ Ciente</button>
            <button type="button" data-i="${i}" data-a="abrir" style="background:#12161C;color:#fff;border:0;border-radius:8px;padding:9px 14px;font:inherit;font-size:13px;font-weight:800;cursor:pointer">Ciente e abrir a tela →</button>
          </div></div>`).join('')}</div>
      <div style="padding:8px 20px 16px;font-size:11.5px;color:#64748b">O aviso volta a cada ${[...new Set(lista.map(e => INTERVALO_MIN(e.dias)))].sort((a, b) => a - b)[0]} min enquanto a etapa não estiver feita (3 dias úteis antes: 1 h · 2 dias: 30 min · 1 dia: 15 min · no dia e atrasado: 5 min). A ciência fica registrada.</div></div>`;
    m.onclick = async ev => {
      const b = ev.target.closest('button[data-a]'); if (!b) return;
      const e = lista[Number(b.dataset.i)]; b.disabled = true;
      try { const { error } = await cli.rpc('fn_cron_ciencia', { p_etapa: e.etapa, p_ref: e.ref }); if (error) throw error; }
      catch (err) { b.disabled = false; alert('Não foi possível registrar a ciência: ' + (err.message || err)); return; }
      e.ultima_ciencia = new Date().toISOString();
      const resto = lista.filter(x => x !== e);
      if (b.dataset.a === 'abrir') { location.href = e.tela; return; }
      mostrar(resto);
    };
    if (Date.now() - ultimoSom > 60e3) { ultimoSom = Date.now(); beep(); }
  }
  async function ciclo(recarregar) {
    try { if (recarregar || !dados) dados = await carregar(cli); } catch (e) { return; }
    mostrar(devidas(dados, perfil, pagina));
  }
  function iniciarAvisos(c, pf, pag) {
    if (!['RH', 'GESTOR'].includes(pf) || window.top !== window) return;
    cli = c; perfil = pf; pagina = pag;
    ['click', 'keydown'].forEach(ev => document.addEventListener(ev, () => { try { if (!somCtx) somCtx = new (window.AudioContext || window.webkitAudioContext)(); somCtx.resume(); } catch (e) { } }, { once: true, capture: true }));
    ciclo(true);
    setInterval(() => ciclo(false), 60e3);        // confere o relógio a cada minuto
    setInterval(() => ciclo(true), 5 * 60e3);     // e o que falta a cada 5 minutos
  }

  // ---------- tabela (Central de pendências) ----------
  function tabela(d, pf) {
    const L = (d.etapas || []).slice().sort((a, b) => String(a.prazo).localeCompare(String(b.prazo)));
    if (!L.length) return '<div style="color:#64748b;font-size:13px;padding:8px 0">Nenhum prazo nos próximos dias.</div>';
    const st = e => e.status === 'FEITO' ? '<span class="pill p-ok">✓ feito</span>' : e.status === 'FUTURO' ? '<span class="pill p-info">mais adiante</span>'
      : e.dias < 0 ? `<span class="pill p-crit">atrasado ${-e.dias} dia(s)</span>` : e.dias === 0 ? '<span class="pill p-crit">hoje</span>' : e.dias <= 3 ? `<span class="pill p-aten">${e.dias} dia(s) útil(eis)</span>` : `<span class="pill p-info">${e.dias} dias úteis</span>`;
    const acao = e => {
      const b = [];
      if (e.etapa === 'CONTABILIDADE' && ['RH', 'GESTOR'].includes(pf)) b.push(e.marco ? `<button type="button" onclick="Cronograma.desmarcar('${e.etapa}','${e.ref}')" class="btnc">↺ Voltou da contabilidade</button>`
        : `<button type="button" onclick="Cronograma.marcar('${e.etapa}','${e.ref}')" class="btnc verde">✓ Folha enviada à contabilidade</button>`);
      if (e.etapa === 'COMISSOES' && pf === 'GESTOR') b.push(e.marco ? `<button type="button" onclick="Cronograma.desmarcar('${e.etapa}','${e.ref}')" class="btnc">↺ Desfazer</button>`
        : `<button type="button" onclick="Cronograma.marcar('${e.etapa}','${e.ref}')" class="btnc verde">✓ Comissões lançadas</button>`);
      b.push(`<a href="${esc(e.tela)}">Abrir →</a>`);
      return b.join(' ');
    };
    return `<div class="rola"><table style="min-width:820px"><thead><tr><th>Prazo</th><th>Etapa</th><th>Quem</th><th>Situação</th><th>O que falta</th><th></th></tr></thead><tbody>
      ${L.map(e => `<tr><td class="mono" style="white-space:nowrap">${dbr(e.prazo)} <span style="color:var(--sub);font-size:11px">${dSem(e.prazo)}</span></td>
        <td><b>${esc(e.titulo)}</b> <span style="color:var(--sub);font-size:12px">· ${esc(e.ref)}</span></td><td>${e.resp === 'GESTOR' ? 'Gestor' : 'RH'}</td><td>${st(e)}</td>
        <td style="font-size:12.5px;color:var(--sub)">${e.status === 'FEITO' ? (e.marco ? `confirmado por ${esc(e.marco.por)} em ${dh(e.marco.em)}` : 'tudo enviado') : e.status === 'FUTURO' ? 'conferido 5 dias úteis antes' : (e.falta || []).map(esc).join('<br>')}
          ${e.ultima_ciencia ? `<div style="font-size:11px">sua última ciência: ${dh(e.ultima_ciencia)}</div>` : ''}</td>
        <td style="text-align:right;white-space:nowrap">${acao(e)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  async function marcar(etapa, ref) {
    const c = cli || global._supabase;
    const txt = etapa === 'CONTABILIDADE' ? `Confirmar que a folha ${ref} foi enviada à contabilidade?\n\nSó é aceito com a Conferência do fechamento sem vermelho. Se a contabilidade devolver, use "Voltou da contabilidade".`
      : `Confirmar que as comissões de ${ref} foram geradas e lançadas?`;
    if (!confirm(txt)) return;
    const { error } = await c.rpc('fn_cron_marcar', { p_etapa: etapa, p_ref: ref, p_obs: null });
    if (error) { alert(global.traduzirErro ? global.traduzirErro(error.message) : error.message); return; }
    if (global.Cronograma.aoMudar) global.Cronograma.aoMudar();
  }
  async function desmarcar(etapa, ref) {
    const c = cli || global._supabase;
    const m = await (global.pedirTexto ? global.pedirTexto(`${etapa === 'CONTABILIDADE' ? 'A folha voltou da contabilidade' : 'Desfazer a confirmação das comissões'} (${ref}).\n\nOs avisos voltam até confirmar de novo. Explique o motivo:`, '') : Promise.resolve(prompt('Motivo:')));
    if (!m) return;
    const { error } = await c.rpc('fn_cron_desmarcar', { p_etapa: etapa, p_ref: ref, p_motivo: m });
    if (error) { alert(global.traduzirErro ? global.traduzirErro(error.message) : error.message); return; }
    if (global.Cronograma.aoMudar) global.Cronograma.aoMudar();
  }

  global.Cronograma = { carregar, devidas, iniciarAvisos, tabela, marcar, desmarcar, INTERVALO_MIN, aoMudar: null };
})(window);
