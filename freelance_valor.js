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
    return `<span style="display:inline-flex;flex-wrap:wrap;gap:6px;align-items:center">${horario}${tipo}${val}${pago}</span>`;
  }
  window.FreelaValor = { BASE, diaria, tabela, brl, selo };
})();
