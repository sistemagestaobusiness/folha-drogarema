// =====================================================================
// FREELANCE · HORÁRIO E VALOR DE TABELA (19/11/2026, HU)
// Diária de freelance = 7,5 h. Tabela: caixa/atendente/auxiliar R$ 100 · líder/balconista/farmacêutico R$ 150 · limpeza R$ 200.
// Menos de 7,5 h = proporcional por hora (diária / 7,5 × horas). Mesma conta do banco (fn_freelance_valor_tabela).
// Usado nas telas do líder (Solicitação), do supervisor e do RH.
// =====================================================================
(function () {
  const BASE = 7.5;
  const diaria = cargo => {
    const c = String(cargo || '').toUpperCase();
    if (/^LIMPEZA/.test(c)) return 200;
    if (/^(FARMAC|BALCON|LIDER|LÍDER)/.test(c)) return 150;
    if (/^(CAIXA|ATENDENTE|AUX)/.test(c)) return 100;
    return null;
  };
  const tabela = (cargo, horas) => {
    const d = diaria(cargo), h = Number(horas) || 0;
    if (d === null || h <= 0) return null;
    return h >= BASE ? d : Math.round(d / BASE * h * 100) / 100;
  };
  const brl = v => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const hh = h => String(Number(h) || 0).replace('.', ',') + ' h';
  const hora = t => t ? String(t).slice(0, 5) : '--';
  // selo do horário executado + diária/por hora (só freelance)
  function selo(r) {
    const he = r.tipo_solicitacao === 'HORA_EXTRA';
    const h = Number(r.horas_trabalhadas) || 0;
    const horario = `<span style="display:inline-block;background:#0f172a;color:#fff;border-radius:6px;padding:1px 8px;font:700 11.5px 'JetBrains Mono',monospace">⏰ ${hora(r.hora_inicio)} às ${hora(r.hora_fim)}</span>`;
    if (he) return horario;
    const ref = r.valor_sugerido != null ? Number(r.valor_sugerido) : tabela(r.cargo_exercido, h);
    const cheia = h >= BASE;
    const tipo = cheia
      ? `<span style="display:inline-block;background:#dcfce7;color:#166534;border:1px solid #86efac;border-radius:6px;padding:1px 7px;font-size:10.5px;font-weight:800">DIÁRIA · ${hh(h)}</span>`
      : `<span style="display:inline-block;background:#fef3c7;color:#92400e;border:1px solid #f59e0b;border-radius:6px;padding:1px 7px;font-size:10.5px;font-weight:800">POR HORA · ${hh(h)} de ${hh(BASE)}</span>`;
    const val = ref != null ? `<span style="font-size:10.5px;color:#475569">tabela <b>${brl(ref)}</b>${r.valor_sugerido != null ? ' (sugerido pelo supervisor)' : cheia ? '' : ` (diária ${brl(diaria(r.cargo_exercido))} ÷ 7,5 × ${hh(h)})`}</span>` : '';
    const pago = r.status === 'APROVADA' && r.valor_pago != null && ref != null && Math.abs(Number(r.valor_pago) - ref) >= 0.01
      ? `<span style="font-size:10.5px;font-weight:800;color:#b91c1c">pago ${brl(r.valor_pago)} (fora da tabela${r.valor_justif ? ': “' + String(r.valor_justif).replace(/[<>&"]/g, '') + '”' : ''})</span>` : '';
    return `<span style="display:inline-flex;flex-wrap:wrap;gap:6px;align-items:center">${horario}${tipo}${val}${pago}</span>${alertaTurno(r)}`;
  }
  // (19/11/2026, HW) pedido DEVOLVIDO PARA CORREÇÃO (freelance no horário de trabalho): a loja corrige e volta ao supervisor
  async function conflitos(cli, lista) {
    (lista || []).forEach(r => { if (r) r._turno = r.devolvido_turno && r.status === 'REJEITADA' ? (r.devolvido_motivo || 'Freelance no horário de trabalho') : null; });
    return (lista || []).filter(r => r && r._turno);
  }
  const mapa = {};
  function alertaTurno(r) {
    if (!r) return '';
    let out = '';
    if (r.turno_correcao) out += `<div style="margin-top:6px;background:#ecfdf5;border:1px solid #10b981;border-radius:8px;padding:4px 10px;color:#065f46;font-size:11px">✅ Corrigido pela loja (${String(r.turno_corrigido_por || '').split('@')[0]}${r.turno_corrigido_em ? ' em ' + new Date(r.turno_corrigido_em).toLocaleDateString('pt-BR') : ''}): ${String(r.turno_correcao).replace(/[<>&]/g, '')}</div>`;
    if (!r._turno) return out;
    mapa[r.id] = r;
    return out + `<div style="margin-top:6px;background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:6px 10px;color:#991b1b;font-size:11.5px;line-height:1.4">
      <b style="font-size:12px">🔁 DEVOLVIDO PARA CORREÇÃO · freelance no horário de trabalho</b><br>${String(r._turno).replace(/[<>&]/g, '').replace(/^DEVOLVIDO PARA CORREÇÃO:\s*/, '').replace(/ Peça o freelance.*$/, '')}<br>
      Freelance não pode ser no horário em que a pessoa já recebe salário. Corrija conforme o que aconteceu de verdade no dia: o pedido volta para o supervisor e depois para o RH.
      <div style="margin-top:5px"><button type="button" onclick="FreelaValor.corrigir('${r.id}')" style="background:#dc2626;color:#fff;border:0;border-radius:6px;padding:5px 12px;font-weight:800;font-size:11.5px;cursor:pointer">✏ Corrigir este pedido</button></div></div>`;
  }
  // janela de correção (HW): FOLGA · TURNO do dia · novo horário do FREELANCE, com justificativa
  let aoCorrigir = null, cliCorr = null;
  function corrigir(id, r0) {
    const r = r0 || mapa[id]; if (!r) return;
    const cli = cliCorr || window.ACESSO_CLI || window._supabase;
    const e = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const dbr = d => String(d).slice(8, 10) + '/' + String(d).slice(5, 7) + '/' + String(d).slice(0, 4);
    const old = document.getElementById('fvCorr'); if (old) old.remove();
    const m = document.createElement('div'); m.id = 'fvCorr';
    m.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(15,23,42,.6);display:flex;align-items:center;justify-content:center;padding:16px';
    const op = (v, t, d) => `<label style="display:block;border:2px solid #e2e8f0;border-radius:10px;padding:8px 10px;margin-bottom:6px;cursor:pointer"><input type="radio" name="fvAc" value="${v}" style="margin-right:6px"><b>${t}</b><div style="font-size:11.5px;color:#64748b;margin-left:20px">${d}</div></label>`;
    m.innerHTML = `<div style="background:#fff;border-radius:14px;max-width:560px;width:100%;max-height:92vh;overflow:auto;padding:20px;border-top:8px solid #dc2626;font-size:13px;color:#0f172a">
      <div style="font-weight:800;font-size:16px">✏ Corrigir freelance devolvido (horário de trabalho)</div>
      <div style="margin:6px 0 10px;color:#334155"><b>${e(r.nome || (typeof window.nomeFunc === 'function' ? window.nomeFunc(r.funcionario_id) : typeof window.nome === 'function' ? window.nome(r.funcionario_id) : ''))}</b> · ${dbr(r.data_servico || r.data)} · freelance ${String(r.hora_inicio).slice(0, 5)} às ${String(r.hora_fim).slice(0, 5)}<br><span style="color:#991b1b">${e(String(r._turno || r.msg || '').replace(/ Peça o freelance.*$/, ''))}</span></div>
      <div style="font-weight:700;margin-bottom:6px">O que aconteceu de verdade nesse dia?</div>
      ${op('FOLGA', 'A pessoa estava de FOLGA nesse dia', 'O dia vira folga na escala. O freelance fica como está.')}
      ${op('TURNO', 'O turno dela nesse dia foi OUTRO', 'Informe o turno de verdade (sem cruzar o freelance).')}
      ${op('FREELANCE', 'O horário do FREELANCE está errado', 'Informe só as horas de freelance FORA do turno.')}
      ${op('CANCELAR', 'Não houve freelance (cancelar o pedido)', 'A pessoa só trabalhou o turno normal dela.')}
      <div id="fvHoras" style="display:none;gap:8px;margin:6px 0"><label style="flex:1;font-size:11px;font-weight:700">Início <input type="time" id="fvIni" style="width:100%;border:1px solid #cbd5e1;border-radius:6px;padding:6px"></label>
        <label style="flex:1;font-size:11px;font-weight:700">Fim <input type="time" id="fvFim" style="width:100%;border:1px solid #cbd5e1;border-radius:6px;padding:6px"></label></div>
      <label style="display:block;font-size:11px;font-weight:700;margin-top:6px">Justificativa (o que aconteceu, mínimo 15 letras)
        <textarea id="fvJust" rows="2" style="width:100%;border:1px solid #cbd5e1;border-radius:6px;padding:6px;font:inherit"></textarea></label>
      <div id="fvMsg" style="display:none;margin-top:8px;border-radius:8px;padding:8px;font-weight:700"></div>
      <div style="display:flex;gap:8px;margin-top:12px"><button type="button" id="fvCanc" style="flex:1;border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:10px;font-weight:700;cursor:pointer">Fechar</button>
        <button type="button" id="fvOk" style="flex:2;border:0;background:#0f172a;color:#fff;border-radius:8px;padding:10px;font-weight:800;cursor:pointer">SALVAR CORREÇÃO</button></div></div>`;
    document.body.appendChild(m);
    const $ = id => m.querySelector('#' + id), msg = (ok, t) => { const b = $('fvMsg'); b.style.display = 'block'; b.style.background = ok ? '#dcfce7' : '#fee2e2'; b.style.color = ok ? '#166534' : '#991b1b'; b.textContent = t; };
    m.querySelectorAll('input[name="fvAc"]').forEach(x => x.onchange = () => {
      m.querySelectorAll('input[name="fvAc"]').forEach(y => y.closest('label').style.borderColor = y.checked ? '#0f172a' : '#e2e8f0');
      $('fvHoras').style.display = ['FOLGA', 'CANCELAR'].includes(x.value) ? 'none' : 'flex';
      if (x.value === 'FREELANCE') { $('fvIni').value = String(r.hora_inicio).slice(0, 5); $('fvFim').value = String(r.hora_fim).slice(0, 5); } else { $('fvIni').value = ''; $('fvFim').value = ''; } });
    $('fvCanc').onclick = () => m.remove();
    $('fvOk').onclick = async () => {
      const ac = (m.querySelector('input[name="fvAc"]:checked') || {}).value;
      if (!ac) return msg(false, 'Escolha o que aconteceu de verdade.');
      if (!['FOLGA', 'CANCELAR'].includes(ac) && (!$('fvIni').value || !$('fvFim').value)) return msg(false, 'Informe o início e o fim.');
      if ($('fvJust').value.replace(/[^A-Za-zÀ-ÿ]/g, '').length < 15) return msg(false, 'Escreva a justificativa (mínimo 15 letras).');
      $('fvOk').disabled = true; $('fvOk').textContent = 'Salvando…';
      const { data, error } = await cli.rpc('fn_freelance_corrigir_turno', { p_id: r.id, p_acao: ac, p_ini: ['FOLGA', 'CANCELAR'].includes(ac) ? null : $('fvIni').value, p_fim: ['FOLGA', 'CANCELAR'].includes(ac) ? null : $('fvFim').value, p_justif: $('fvJust').value.trim() });
      if (error) { $('fvOk').disabled = false; $('fvOk').textContent = 'SALVAR CORREÇÃO'; return msg(false, error.message); }
      msg(true, '✅ Corrigido: ' + data);
      setTimeout(() => { m.remove(); if (typeof aoCorrigir === 'function') aoCorrigir(); }, 1500);
    };
  }
  function quadroTurno(lista) {
    const e = (lista || []).filter(r => r && r._turno);
    if (!e.length) return '';
    return `<div style="background:#dc2626;color:#fff;border-radius:10px;padding:10px 14px;margin-bottom:10px;font-size:13px;font-weight:700">🔁 ${e.length} freelance(s) DEVOLVIDO(S) PARA CORREÇÃO: pedidos no mesmo horário de trabalho da pessoa. A loja corrige no botão “Corrigir este pedido” e o pedido volta ao supervisor e ao RH.</div>`;
  }
  window.FreelaValor = { BASE, diaria, tabela, brl, selo, conflitos, alertaTurno, quadroTurno, corrigir,
    aoCorrigir(fn, cli) { aoCorrigir = fn; if (cli) cliCorr = cli; } };
})();
