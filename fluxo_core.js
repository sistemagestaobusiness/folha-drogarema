// =====================================================================
// FLUXO DE CAIXA · cálculo (21/10/2026). Usado por fluxo_caixa.html.
// Entrada: linhas de fn_fin_fluxo + cadastros. Saída: um registro por dia.
//  - até ontem: venda e pagamentos realizados (data de pagamento no Alpha7); saldo real = partida + extrato
//  - de hoje em diante: venda prevista (regra abaixo), contas a pagar em aberto pela data útil de vencimento,
//    previsão manual de fornecedor e ajuste diário (desconto de cartão + Farmácia Popular na CEF)
//  - saldo previsto: parte do último saldo real; a venda entra no dia útil seguinte (a de sexta, sábado e domingo na segunda)
// Venda prevista: dias 08 e 20 (medicamento barato) = média desses dias nos últimos 3 meses;
//   domingo = média dos últimos 4 domingos; dias 1 a 10 e 11 em diante = média dos últimos 7 dias do mesmo período.
// =====================================================================
(function (global) {
  const isoDe = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const dataDe = iso => new Date(iso + 'T12:00:00');
  const somaDia = (iso, n) => { const d = dataDe(iso); d.setDate(d.getDate() + n); return isoDe(d); };
  const dow = iso => dataDe(iso).getDay();   // 0 domingo … 6 sábado
  const dia = iso => +iso.slice(8, 10);
  const media = l => l.length ? l.reduce((a, b) => a + b, 0) / l.length : 0;

  // histórico de venda por dia (iso -> valor), só dias antes de hoje
  function vendaPrevista(iso, hist, hoje) {
    const dias = Object.keys(hist).filter(d => d < hoje && hist[d] > 0).sort().reverse();
    const dd = dia(iso);
    if (dd === 8 || dd === 20) {
      const l = dias.filter(d => dia(d) === dd).slice(0, 3).map(d => hist[d]);
      if (l.length) return { valor: media(l), regra: `média dos dias ${String(dd).padStart(2, '0')} dos últimos ${l.length} meses` };
    }
    if (dow(iso) === 0) {
      const l = dias.filter(d => dow(d) === 0).slice(0, 4).map(d => hist[d]);
      if (l.length) return { valor: media(l), regra: `média dos últimos ${l.length} domingos` };
    }
    const ini = dd <= 10;
    const l = dias.filter(d => (dia(d) <= 10) === ini && dia(d) !== 8 && dia(d) !== 20 && dow(d) !== 0).slice(0, 7).map(d => hist[d]);
    return { valor: media(l), regra: `média dos últimos ${l.length} dias ${ini ? 'de 1 a 10' : 'de 11 em diante'}` };
  }

  // e: { ini, fim, hoje, linhas, categorias:{plano:{grupo,nome}}, contas:[{conta,banco,empresa,no_fluxo}], previsoes:{'venda|iso':v,'fornecedor|iso':v},
  //      vendaHist:{iso:v}, ajusteUtil, ajusteSegunda }
  function montar(e) {
    const L = e.linhas || [];
    const por = {};   // iso -> acumuladores
    const de = iso => (por[iso] = por[iso] || { venda: null, cred: 0, cat: {}, catp: {}, ext: {}, saldo: {}, partida: {} });
    const ancora = {};
    let ultExt = null, ultVenda = null;
    L.forEach(r => {
      const iso = String(r.data).slice(0, 10), v = Number(r.valor) || 0;
      if (r.tipo === 'ancora') { ancora[r.chave] = v; return; }
      const x = de(iso);
      if (r.tipo === 'venda') { x.venda = (x.venda || 0) + v; if (!ultVenda || iso > ultVenda) ultVenda = iso; }
      else if (r.tipo === 'cred') x.cred += v;
      else if (r.tipo === 'cat') x.cat[r.chave] = (x.cat[r.chave] || 0) + v;
      else if (r.tipo === 'catp') x.catp[r.chave] = (x.catp[r.chave] || 0) + v;
      else if (r.tipo === 'ext') { x.ext[r.chave] = (x.ext[r.chave] || 0) + v; if (!ultExt || iso > ultExt) ultExt = iso; }
      else if (r.tipo === 'saldo') { x.saldo[r.chave] = v; if (!ultExt || iso > ultExt) ultExt = iso; }
      else if (r.tipo === 'partida') x.partida[r.chave] = v;
    });
    const grupoDe = p => { const c = e.categorias[p]; return c && c.grupo ? c.grupo : 'SEM GRUPO'; };
    const contasFluxo = e.contas.filter(c => c.no_fluxo).map(c => c.conta);
    const todasContas = [...new Set([...e.contas.map(c => c.conta), ...Object.keys(ancora)])];
    const s = {}; todasContas.forEach(c => s[c] = ancora[c] || 0);
    const dias = [];
    let saldoProj = null, vendaFds = 0;
    for (let iso = e.ini; iso <= e.fim; iso = somaDia(iso, 1)) {
      const x = por[iso] || de(iso);
      const passado = iso < e.hoje;
      const comExtrato = ultExt && iso <= ultExt;
      // saldo real por conta
      if (comExtrato) todasContas.forEach(c => {
        if (x.saldo[c] !== undefined) s[c] = x.saldo[c];
        else if (x.partida[c] !== undefined) s[c] = x.partida[c];
        else s[c] += x.ext[c] || 0;
      });
      // venda
      let venda = null, vendaRegra = '', vendaManual = false;
      if (passado) venda = ultVenda && iso <= ultVenda ? (x.venda || 0) : null;
      else {
        const m = e.previsoes['venda|' + iso];
        if (m !== undefined) { venda = m; vendaManual = true; vendaRegra = 'valor informado à mão'; }
        else { const p = vendaPrevista(iso, e.vendaHist, e.hoje); venda = p.valor; vendaRegra = p.regra; }
      }
      // pagamentos por grupo
      const fonte = passado ? x.cat : x.catp;
      const grupos = {};
      Object.entries(fonte).forEach(([p, v]) => { const g = grupoDe(p); const o = grupos[g] = grupos[g] || { tot: 0, cats: {} }; o.tot += v; o.cats[p] = (o.cats[p] || 0) + v; });
      const forn = passado ? 0 : (e.previsoes['fornecedor|' + iso] || 0);
      const w = dow(iso);
      const projetado = !comExtrato;
      const ajuste = projetado && !passado ? (w === 1 ? e.ajusteSegunda : (w >= 2 && w <= 5 ? e.ajusteUtil : 0)) : 0;
      const totPag = Object.values(grupos).reduce((a, g) => a + g.tot, 0) + forn + ajuste;
      // saldo
      const saldoReal = comExtrato ? contasFluxo.reduce((a, c) => a + (s[c] || 0), 0) : null;
      // a venda cai no banco no dia útil seguinte: terça recebe a de segunda; segunda recebe sexta, sábado e domingo
      let saldoPrev = null;
      if (comExtrato) { saldoProj = saldoReal; vendaFds = venda || 0; }
      else if (saldoProj !== null) {
        if (w === 0 || w === 6) { saldoProj -= totPag; vendaFds += venda || 0; }
        else { saldoProj += vendaFds - totPag; vendaFds = venda || 0; }
        saldoPrev = saldoProj;
      }
      const semCarga = passado && (venda === null || !comExtrato);
      dias.push({ iso, passado, projetado, semCarga, venda, vendaRegra, vendaManual, vendaSemCarga: passado && venda === null,
        cred: comExtrato ? x.cred : null, grupos, forn, ajuste, totPag,
        saldoContas: comExtrato ? Object.fromEntries(todasContas.map(c => [c, s[c]])) : null, saldoReal, saldoPrev });
    }
    return { dias, ultExt, ultVenda };
  }

  global.FluxoCore = { montar, vendaPrevista, somaDia, isoDe, dow };
})(typeof window !== 'undefined' ? window : globalThis);
