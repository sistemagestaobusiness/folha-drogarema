// =====================================================================
// RESULTADO DA LOJA e METAS: contas usadas pelo fechamento (que publica o
// resultado do mês), pelo console de metas (Gestor) e pela tela de resultado.
// Só indicadores de venda: nada de valores pagos a pessoas.
// Regra da meta (a mesma da planilha "Meta mês X e Resultado mês Y"):
//   faturamento = média diária dos 3 últimos meses + 2%, vezes os dias do mês da meta
//   perfumaria  = média diária dos 3 últimos meses + 10%, vezes os dias
//   similar/genérico = meta de faturamento x % da loja ; linha Sidney = 4% da meta de faturamento
// =====================================================================
(function (global) {
  const LOJAS = [1, 2, 3, 4, 5, 6, 7];
  const PCT_SIMGEN_PADRAO = { 1: 0.40, 2: 0.45, 3: 0.45, 4: 0.43, 5: 0.43, 6: 0.43, 7: 0.40 };   // planilha de out/2026
  const REGRA = { fatAcrescimo: 0.02, perfAcrescimo: 0.10, sidneyPct: 0.04, meses: 3 };
  const r2 = v => Math.round((Number(v) || 0) * 100) / 100;
  const diasDoMes = comp => { const [m, a] = comp.split('/').map(Number); return new Date(a, m, 0).getDate(); };
  const somaMes = (comp, n) => { let [m, a] = comp.split('/').map(Number); m += n; while (m > 12) { m -= 12; a++; } while (m < 1) { m += 12; a--; } return String(m).padStart(2, '0') + '/' + a; };
  const ordem = comp => { const [m, a] = comp.split('/').map(Number); return a * 12 + m; };
  const NOMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const nomeMes = comp => { const [m, a] = comp.split('/').map(Number); return NOMES[m - 1] + '/' + String(a).slice(2); };

  // do resultado do fechamento (uma coluna = uma loja) para o que a loja enxerga
  function publicar(r) {
    const n = v => (v == null || !isFinite(v) ? null : r2(v));
    return {
      fat: n(r.liq), lucro: n(r.lucro), simgen: n((r.gen || 0) + (r.sim || 0)), perf: n(r.perf_sem_sidney), sidney: n(r.sidney), etico: n(r.etico),
      dermo_outros: n((r.dermo || 0) + (r.rennova || 0) + (r.formulas || 0) + (r.servicos || 0) + (r.covid || 0)),
      bruto: n(r.bruto), desconto: n(r.desc),
      delivery: r.delivery == null ? null : n(r.delivery), entregas: r.entregas == null ? null : Math.round(r.entregas),
      descp: r.descp || null, ticket: r.ticket || null
    };
  }

  // meta de uma loja para a competência, a partir dos resultados publicados dos meses anteriores
  // hist: { 'MM/AAAA': dados publicados }  ->  { dias, fat, pct_simgen, simgen, perf, sidney, base: {...} }
  function calcularMeta(comp, hist, pctSimgen) {
    const meses = []; for (let k = 1; k <= 12 && meses.length < REGRA.meses; k++) { const c = somaMes(comp, -k); if (hist[c] && hist[c].fat > 0) meses.push(c); }
    if (!meses.length) return null;
    const media = campo => meses.reduce((a, c) => a + (hist[c][campo] || 0) / diasDoMes(c), 0) / meses.length;
    const dias = diasDoMes(comp), mdFat = media('fat'), mdPerf = media('perf');
    const fat = r2(mdFat * (1 + REGRA.fatAcrescimo) * dias), perf = r2(mdPerf * (1 + REGRA.perfAcrescimo) * dias);
    return { dias, fat, pct_simgen: pctSimgen, simgen: r2(fat * pctSimgen), perf, sidney: r2(fat * REGRA.sidneyPct),
      base: { meses: meses.slice().reverse(), media_diaria_fat: r2(mdFat), media_diaria_perf: r2(mdPerf), media_perf_3m: r2(meses.reduce((a, c) => a + (hist[c].perf || 0), 0) / meses.length) } };
  }

  global.MetasCore = { LOJAS, PCT_SIMGEN_PADRAO, REGRA, publicar, calcularMeta, diasDoMes, somaMes, ordem, nomeMes, r2 };
})(typeof window !== 'undefined' ? window : globalThis);
