// =====================================================================
// DROGAREMA - cronograma de empréstimo (usado em emprestimos.html e na
// automação de lancamentos.html). Além das exceções por parcela que já
// existiam (valor editado / parcela cancelada), aceita exceções por MÊS,
// guardadas em emprestimos.excecoes.meses = { "MM/AAAA": {...} }:
//   { tipo: 'PULADO' }               o governo não cobrou no mês: não lança nada
//                                    e a parcela fica para o mês seguinte (o contrato estica)
//   { tipo: 'PARCIAL', valor: 86.91} descontou a menor: lança esse valor e o saldo
//                                    residual é somado ao desconto do mês seguinte
// plano(emp) devolve uma linha por mês, do início até quitar.
// =====================================================================
(function (global) {
  const r2 = v => Math.round((parseFloat(v) || 0) * 100) / 100;
  const prox = c => { let [m, a] = c.split('/').map(Number); m++; if (m > 12) { m = 1; a++; } return String(m).padStart(2, '0') + '/' + a; };
  const numComp = c => { const [m, a] = String(c).split('/').map(Number); return a * 12 + m; };
  function plano(emp) {
    const exc = emp.excecoes || {}, meses = exc.meses || {}, qtd = parseInt(emp.qtd_parcelas, 10) || 0, out = [];
    if (!/^\d{2}\/\d{4}$/.test(String(emp.competencia_inicio || ''))) return out;
    let comp = emp.competencia_inicio, parc = 1, residual = 0, guarda = 0;
    while (parc <= qtd && guarda++ < 600) {
      const em = meses[comp] || {};
      if (em.tipo === 'PULADO') { out.push({ competencia: comp, parcela: null, status: 'PULADO', valor: 0, devido: 0, residualAnterior: residual, residual }); comp = prox(comp); continue; }
      const ep = exc[parc] || {};
      if (ep.status === 'cancelada') { out.push({ competencia: comp, parcela: parc, status: 'CANCELADA', valor: 0, devido: 0, residualAnterior: residual, residual }); parc++; comp = prox(comp); continue; }
      const base = r2(ep.valor !== undefined ? ep.valor : emp.valor_parcela), devido = r2(base + residual), ant = residual;
      let valor = devido, status = 'NORMAL';
      if (em.tipo === 'PARCIAL') { valor = Math.min(devido, r2(em.valor)); status = 'PARCIAL'; }
      residual = r2(devido - valor);
      out.push({ competencia: comp, parcela: parc, status, valor, base, devido, residualAnterior: ant, residual, editado: ep.valor !== undefined });
      parc++; comp = prox(comp);
    }
    // sobrou saldo depois da última parcela: meses extras só com o residual
    while (residual > 0.004 && guarda++ < 600) {
      const em = meses[comp] || {};
      if (em.tipo === 'PULADO') { out.push({ competencia: comp, parcela: null, status: 'PULADO', valor: 0, devido: 0, residualAnterior: residual, residual }); comp = prox(comp); continue; }
      const devido = residual, valor = em.tipo === 'PARCIAL' ? Math.min(devido, r2(em.valor)) : devido;
      residual = r2(devido - valor);
      out.push({ competencia: comp, parcela: null, status: 'RESIDUAL', valor, base: 0, devido, residualAnterior: devido, residual });
      comp = prox(comp);
    }
    return out;
  }
  const doMes = (emp, competencia) => plano(emp).find(l => l.competencia === competencia) || null;
  global.EmprestimoCore = { plano, doMes, numComp, prox };
})(typeof window !== 'undefined' ? window : globalThis);
