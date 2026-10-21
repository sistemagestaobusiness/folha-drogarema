// =====================================================================
// FLUXO DE CAIXA · cálculo (21/10/2026). Usado por fluxo_caixa.html.
// Entrada: linhas de fn_fin_fluxo + cadastros. Saída: um registro por dia.
//  - até ontem: venda e pagamentos realizados (data de pagamento no Alpha7); saldo real = partida + extrato
//  - de hoje em diante: venda prevista (regra abaixo), contas a pagar em aberto pela data útil de vencimento,
//    previsão manual de fornecedor; o ajuste diário (desconto de cartão + Farmácia Popular na CEF) reduz a entrada da venda
//  - saldo previsto: parte do último saldo real; a venda entra no dia útil seguinte (a de sexta, sábado e domingo na segunda)
// Venda prevista: ver vendaPrevista (dia da semana + tendência dos anos anteriores loja a loja + fator de segurança).
// =====================================================================
(function (global) {
  const isoDe = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const dataDe = iso => new Date(iso + 'T12:00:00');
  const somaDia = (iso, n) => { const d = dataDe(iso); d.setDate(d.getDate() + n); return isoDe(d); };
  const dow = iso => dataDe(iso).getDay();   // 0 domingo … 6 sábado
  const dia = iso => +iso.slice(8, 10);
  const media = l => l.length ? l.reduce((a, b) => a + b, 0) / l.length : 0;

  // ---- venda prevista (regra de 21/10/2026, conservadora)
  //  base: dias 08/20 = média desses dias nos últimos 3 meses; demais = menor entre média e mediana
  //        dos últimos 4 dias iguais da semana no mesmo período do mês (1 a 10 / 11 em diante)
  //  tendência: quanto o mês-alvo vendeu em relação às 4 semanas anteriores à data de hoje, em cada ano anterior
  //        (média dos anos, limitada entre 0,80 e 1,30) · loja a loja quando a loja tem histórico; senão, o total
  //  fator de segurança: × fator (padrão 90%)
  const mediana = l => { const o = [...l].sort((a, b) => a - b), m = o.length >> 1; return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2; };
  const anoAtras = (iso, k) => (+iso.slice(0, 4) - k) + iso.slice(4);
  function baseSerie(h, iso, hoje) {
    const dd = dia(iso), ini = dd <= 10;
    const dias = Object.keys(h).filter(d => d < hoje && d >= somaDia(hoje, -120) && h[d] > 0).sort().reverse();
    if (dd === 8 || dd === 20) {
      const l = dias.filter(d => dia(d) === dd).slice(0, 3).map(d => h[d]);
      if (l.length) return { v: media(l), txt: `média dos dias ${String(dd).padStart(2, '0')} dos últimos ${l.length} meses` };
    }
    const w = dow(iso);
    let l = dias.filter(d => dow(d) === w && (dia(d) <= 10) === ini && dia(d) !== 8 && dia(d) !== 20).slice(0, 4).map(d => h[d]);
    let txt = `últimos ${l.length} ${NOME_DOW[w]} (dias ${ini ? '1 a 10' : '11+'})`;
    if (l.length < 2) { l = dias.filter(d => dow(d) === w).slice(0, 4).map(d => h[d]); txt = `últimos ${l.length} ${NOME_DOW[w]}`; }
    if (!l.length) return { v: 0, txt: 'sem histórico' };
    return { v: Math.min(media(l), mediana(l)), txt: 'menor entre média e mediana dos ' + txt };
  }
  function tendencia(h, iso, hoje) {
    const fat = [];
    for (let k = 1; k <= 3; k++) {
      const hj = anoAtras(hoje, k), ref = [];
      for (let d = somaDia(hj, -28); d < hj; d = somaDia(d, 1)) if (h[d] > 0) ref.push(h[d]);
      const alvo = anoAtras(iso, k), ini = dia(iso) <= 10, mesAlvo = alvo.slice(0, 7), tgt = [];
      Object.keys(h).forEach(d => { if (d.slice(0, 7) === mesAlvo && (dia(d) <= 10) === ini && h[d] > 0) tgt.push(h[d]); });
      if (ref.length >= 20 && tgt.length >= 5) fat.push({ ano: +alvo.slice(0, 4), f: media(tgt) / media(ref) });
    }
    if (!fat.length) return null;
    return { f: Math.min(1.3, Math.max(0.8, media(fat.map(x => x.f)))), anos: fat };
  }
  const NOME_DOW = ['domingos', 'segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados'];
  const pct = f => (f >= 1 ? '+' : '') + ((f - 1) * 100).toFixed(1).replace('.', ',') + '%';
  // H: { total: {iso: v}, lojas: {loja: {iso: v}} } · fator: 0,9 = 90%
  function vendaPrevista(iso, H, hoje, fator = 0.9) {
    if (!H || !H.total) H = { total: H || {}, lojas: {} };
    const lojas = Object.keys(H.lojas || {}).filter(l => Object.keys(H.lojas[l]).some(d => d < hoje && d >= somaDia(hoje, -28) && H.lojas[l][d] > 0));
    const tTot = tendencia(H.total, iso, hoje);
    let total = 0, partes = [];
    const calc = (h, rotulo) => {
      const b = baseSerie(h, iso, hoje), t = tendencia(h, iso, hoje) || tTot;
      const v = b.v * (t ? t.f : 1);
      partes.push({ loja: rotulo, base: b.v, tend: t ? t.f : 1, txt: b.txt, propria: !!tendencia(h, iso, hoje) });
      return v;
    };
    if (lojas.length) lojas.forEach(l => { total += calc(H.lojas[l], l); });
    else total = calc(H.total, 'total');
    const t = partes.length === 1 ? partes[0] : null;
    const regra = (t ? t.txt : `soma de ${partes.length} lojas (${partes[0] ? partes[0].txt.replace(/^menor entre média e mediana dos /, '') : ''})`)
      + (tTot ? ` · tendência ${pct(tTot.f)} (${tTot.anos.map(a => a.ano + ': ' + pct(a.f)).join(', ')})` : ' · sem tendência (falta histórico)')
      + (partes.length > 1 ? ` · ${partes.filter(p => !p.propria).length} loja(s) sem histórico usam a tendência do total` : '')
      + ` · × ${Math.round(fator * 100)}% de segurança`;
    return { valor: total * fator, regra, partes };
  }

  // e: { ini, fim, hoje, linhas, categorias:{plano:{grupo,nome}}, contas:[{conta,banco,empresa,no_fluxo}], previsoes:{'venda|iso':v,'fornecedor|iso':v},
  //      vendaHist:{total:{iso:v}, lojas:{loja:{iso:v}}}, ajusteUtil, ajusteSegunda, fatorVenda }
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
        else { const p = vendaPrevista(iso, e.vendaHist, e.hoje, e.fatorVenda == null ? 0.9 : e.fatorVenda); venda = p.valor; vendaRegra = p.regra; }
      }
      // pagamentos por grupo
      const fonte = passado ? x.cat : x.catp;
      const grupos = {};
      Object.entries(fonte).forEach(([p, v]) => { const g = grupoDe(p); const o = grupos[g] = grupos[g] || { tot: 0, cats: {} }; o.tot += v; o.cats[p] = (o.cats[p] || 0) + v; });
      const forn = passado ? 0 : (e.previsoes['fornecedor|' + iso] || 0);
      const w = dow(iso);
      const projetado = !comExtrato;
      const ajuste = projetado && !passado ? (w === 1 ? e.ajusteSegunda : (w >= 2 && w <= 5 ? e.ajusteUtil : 0)) : 0;
      const totPag = Object.values(grupos).reduce((a, g) => a + g.tot, 0) + forn;   // o ajuste reduz a venda, não entra nos pagamentos (21/10/2026)
      // saldo
      const saldoReal = comExtrato ? contasFluxo.reduce((a, c) => a + (s[c] || 0), 0) : null;
      // a venda cai no banco no dia útil seguinte: terça recebe a de segunda; segunda recebe sexta, sábado e domingo
      let saldoPrev = null;
      if (comExtrato) { saldoProj = saldoReal; vendaFds = venda || 0; }
      else if (saldoProj !== null) {
        if (w === 0 || w === 6) { saldoProj -= totPag; vendaFds += venda || 0; }
        else { saldoProj += vendaFds - ajuste - totPag; vendaFds = venda || 0; }
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
