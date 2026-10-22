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
  //  fator de segurança: × fator (padrão 97%)
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
    let txt = `últim${ART_DOW[w]} ${l.length} ${NOME_DOW[w]} (dias ${ini ? '1 a 10' : '11+'})`;
    if (l.length < 2) { l = dias.filter(d => dow(d) === w).slice(0, 4).map(d => h[d]); txt = `últim${ART_DOW[w]} ${l.length} ${NOME_DOW[w]}`; }
    if (!l.length) return { v: 0, txt: 'sem histórico' };
    return { v: Math.min(media(l), mediana(l)), txt: 'menor entre média e mediana dos ' + txt };
  }
  const NOME_DOW = ['domingos', 'segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados'];
  const ART_DOW = ['os', 'as', 'as', 'as', 'as', 'as', 'os'];
  const NOME_MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const pct = f => (f >= 1 ? '+' : '') + ((f - 1) * 100).toFixed(1).replace('.', ',') + '%';
  const mil = v => (v / 1000).toFixed(1).replace('.', ',') + ' mil';
  const idLoja = u => String(parseInt(u, 10) || u);
  const mediaJanela = (h, ini, fim) => { const l = []; for (let d = ini; d < fim; d = somaDia(d, 1)) if (h[d] > 0) l.push(h[d]); return l; };

  // Venda prevista (regra de 21/10/2026, conservadora)
  //  lojas antigas: média do mesmo período (1 a 10 / 11+) do mesmo mês nos anos anteriores
  //                 × crescimento delas (últimas 8 semanas × as mesmas semanas do ano anterior)
  //                 × peso do dia da semana (8 semanas recentes) · dias 08 e 20 têm peso próprio
  //  lojas novas (sem ano anterior para comparar, ex.: loja 7): últimas 4 iguais da semana
  //  tudo × fator de segurança (padrão 97%)
  // H: { total: {iso: v}, lojas: {loja: {iso: v}} } · novas: {loja: 'aaaa-mm-dd' abertura}
  function vendaPrevista(iso, H, hoje, fator = 0.97, novas = { 7: '2026-01-02' }) {
    if (!H || !H.total) H = { total: H || {}, lojas: {} };
    const lojas = H.lojas || {}, ids = Object.keys(lojas);
    const comparar = anoAtras(iso, 1).slice(0, 7) + '-01';
    const ehNova = u => { const ab = novas[idLoja(u)]; return !!ab && ab > comparar; };
    const nv = ids.filter(ehNova);
    // série das lojas antigas = total - lojas novas
    const ant = {}; Object.keys(H.total).forEach(d => { ant[d] = H.total[d] - nv.reduce((a, u) => a + (lojas[u][d] || 0), 0); });
    const dd = dia(iso), ini = dd <= 10, w = dow(iso);
    // A · lojas antigas
    let A = 0, txtA = '';
    const est = [];
    for (let k = 1; k <= 3; k++) {
      const alvo = anoAtras(iso, k), mesAlvo = alvo.slice(0, 7);
      const lv = Object.keys(ant).filter(d => d.slice(0, 7) === mesAlvo && (dia(d) <= 10) === ini && ant[d] > 0).map(d => ant[d]);
      const rec = mediaJanela(ant, somaDia(hoje, -56), hoje), pas = mediaJanela(ant, somaDia(anoAtras(hoje, k), -56), anoAtras(hoje, k));
      if (lv.length >= 5 && rec.length >= 30 && pas.length >= 30) est.push({ ano: +alvo.slice(0, 4), nivel: media(lv), cresc: media(rec) / media(pas) });
    }
    const rec8 = Object.keys(ant).filter(d => d < hoje && d >= somaDia(hoje, -56) && ant[d] > 0);
    const mRec = media(rec8.map(d => ant[d]));
    let peso = 1, txtPeso = '';
    if (dd === 8 || dd === 20) {
      const l = Object.keys(ant).filter(d => d < hoje && d >= somaDia(hoje, -100) && dia(d) === dd && ant[d] > 0);
      const viz = Object.keys(ant).filter(d => d < hoje && d >= somaDia(hoje, -100) && dia(d) !== 8 && dia(d) !== 20 && ant[d] > 0);
      if (l.length && viz.length) { peso = media(l.map(d => ant[d])) / media(viz.map(d => ant[d])); txtPeso = `peso do dia ${dd} ${peso.toFixed(2).replace('.', ',')}`; }
    } else if (mRec > 0) {
      const l = rec8.filter(d => dow(d) === w && dia(d) !== 8 && dia(d) !== 20);
      if (l.length >= 3) { peso = media(l.map(d => ant[d])) / mRec; txtPeso = `peso d${ART_DOW[w]} ${NOME_DOW[w]} ${peso.toFixed(2).replace('.', ',')}`; }
    }
    if (est.length) {
      const base = media(est.map(e => e.nivel * Math.min(1.3, Math.max(0.8, e.cresc))));
      A = base * peso;
      txtA = `lojas antigas: ${NOME_MES[+iso.slice(5, 7) - 1]} ${ini ? '1 a 10' : '11+'} de ` + est.map(e => `${e.ano} (${mil(e.nivel)} × ${pct(e.cresc)})`).join(', ') + (txtPeso ? ' · ' + txtPeso : '') + ` = ${mil(A)}`;
    } else {
      const b = baseSerie(ant, iso, hoje); A = b.v; txtA = `lojas antigas: ${b.txt} = ${mil(A)} (sem ano anterior)`;
    }
    // B · lojas novas
    let B = 0; const txtB = [];
    nv.forEach(u => { const b = baseSerie(lojas[u], iso, hoje); B += b.v; txtB.push(`loja ${idLoja(u)}: ${b.txt.replace(/^menor entre média e mediana dos /, '')} = ${mil(b.v)}`); });
    const regra = txtA + (txtB.length ? ' · ' + txtB.join(' · ') : '') + ` · × ${Math.round(fator * 100)}% de segurança`;
    return { valor: (A + B) * fator, regra, lojasAntigas: A, lojasNovas: B };
  }

  // e: { ini, fim, hoje, linhas, categorias:{plano:{grupo,nome}}, contas:[{conta,banco,empresa,no_fluxo}], previsoes:{'venda|iso':v,'fornecedor|iso':v},
  //      vendaHist:{total:{iso:v}, lojas:{loja:{iso:v}}}, ajusteUtil, ajusteSegunda, fatorVenda, lojasNovas:{loja:'aaaa-mm-dd'} }
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
      // venda real só de dia fechado: dias até a véspera da carga (22/10/2026). O dia da exportação vem parcial
      // no relatório; ele e os dias sem carga usam a venda prevista.
      const vendaReal = passado && ultVenda && iso <= ultVenda && (!e.vendaFechadaAte || iso <= e.vendaFechadaAte);
      if (vendaReal) venda = x.venda || 0;
      else {
        const m = e.previsoes['venda|' + iso];
        if (m !== undefined && !passado) { venda = m; vendaManual = true; vendaRegra = 'valor informado à mão'; }
        else { const p = vendaPrevista(iso, e.vendaHist, e.hoje, e.fatorVenda == null ? 0.97 : e.fatorVenda, e.lojasNovas || undefined); venda = p.valor; vendaRegra = p.regra; }
      }
      // pagamentos por grupo
      const fonte = passado ? x.cat : x.catp;
      const grupos = {};
      Object.entries(fonte).forEach(([p, v]) => { const g = grupoDe(p); const o = grupos[g] = grupos[g] || { tot: 0, cats: {} }; o.tot += v; o.cats[p] = (o.cats[p] || 0) + v; });
      // previsões manuais (dias futuros): por grupo ('G:<GRUPO>|dia'; fornecedor também em 'fornecedor|dia') e de entrada ('entrada|dia')
      const prevG = {};
      if (!passado) {
        Object.keys(e.previsoes).forEach(k => { if (k.startsWith('G:') && k.endsWith('|' + iso)) { const g = k.slice(2, k.length - iso.length - 1); prevG[g] = (prevG[g] || 0) + e.previsoes[k]; } });
        if (e.previsoes['fornecedor|' + iso]) prevG.FORNECEDORES = (prevG.FORNECEDORES || 0) + e.previsoes['fornecedor|' + iso];
      }
      const forn = prevG.FORNECEDORES || 0, totPrevG = Object.values(prevG).reduce((a, v) => a + v, 0);
      const entPrev = passado ? 0 : (e.previsoes['entrada|' + iso] || 0);
      const w = dow(iso);
      const projetado = !comExtrato;
      const ajuste = projetado ? (w === 1 ? e.ajusteSegunda : (w >= 2 && w <= 5 ? e.ajusteUtil : 0)) : 0;
      const totPag = Object.values(grupos).reduce((a, g) => a + g.tot, 0) + totPrevG;   // o ajuste reduz a venda, não entra nos pagamentos (21/10/2026)
      // saldo
      const saldoReal = comExtrato ? contasFluxo.reduce((a, c) => a + (s[c] || 0), 0) : null;
      // a venda cai no banco no dia útil seguinte: terça recebe a de segunda; segunda recebe sexta, sábado e domingo
      let saldoPrev = null;
      if (comExtrato) { saldoProj = saldoReal; vendaFds = venda || 0; }
      else if (saldoProj !== null) {
        if (w === 0 || w === 6) { saldoProj += entPrev - totPag; vendaFds += venda || 0; }
        else { saldoProj += vendaFds - ajuste + entPrev - totPag; vendaFds = venda || 0; }
        saldoPrev = saldoProj;
      }
      const semCarga = passado && !comExtrato;   // dia passado ainda sem extrato: saldo estimado
      dias.push({ iso, passado, projetado, semCarga, venda, vendaRegra, vendaManual, vendaSemCarga: false, vendaPrevista: !vendaReal,
        cred: comExtrato ? x.cred : null, grupos, forn, prevG, entPrev, ajuste, totPag,
        saldoContas: comExtrato ? Object.fromEntries(todasContas.map(c => [c, s[c]])) : null, saldoReal, saldoPrev });
    }
    return { dias, ultExt, ultVenda };
  }

  global.FluxoCore = { montar, vendaPrevista, somaDia, isoDe, dow };
})(typeof window !== 'undefined' ? window : globalThis);
