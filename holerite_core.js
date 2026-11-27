// Leitura do holerite contábil (PDF "Recibo de Pagamento" da contabilidade) — 27/11/2026
// Cada página traz o mesmo recibo duas vezes (via do funcionário e via da empresa): lê só a primeira metade.
// Colunas pela posição horizontal: código | descrição | referência | vencimentos | descontos.
// Confere a soma de cada recibo com o "Total de Vencimentos / Total de Descontos" impresso: se não bater, recusa o arquivo.
(function (global) {
  const num = s => Number(String(s).replace(/\./g, '').replace(',', '.'));
  const ehValor = s => /^-?[\d.]+,\d{2}$/.test(String(s).trim());
  const MESES = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  const semAcento = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

  // palavras com posição (x, topo) da página
  async function palavras(page) {
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const out = [];
    tc.items.forEach(it => {
      const s = String(it.str || ''); if (!s.trim()) return;
      const x = it.transform[4], h = Math.abs(it.transform[3]) || 8, top = vp.height - it.transform[5] - h;
      // divide em palavras mantendo a posição aproximada (largura proporcional)
      const w = it.width || 0, partes = s.split(/(\s+)/); let pos = 0;
      partes.forEach(p => { if (p.trim()) out.push({ x: x + (s.length ? w * pos / s.length : 0), top, t: p }); pos += p.length; });
    });
    return { ws: out, altura: vp.height };
  }

  function linhas(ws) {
    const ord = ws.slice().sort((a, b) => a.top - b.top || a.x - b.x), res = [];
    ord.forEach(w => { const l = res.length && Math.abs(res[res.length - 1].top - w.top) <= 2.5 ? res[res.length - 1] : null;
      if (l) l.ws.push(w); else res.push({ top: w.top, ws: [w] }); });
    res.forEach(l => { l.ws.sort((a, b) => a.x - b.x); l.txt = l.ws.map(w => w.t).join(' '); });
    return res;
  }

  function lerRecibo(ls) {
    const r = { empresa: '', cnpj: '', comp: '', cod: '', nome: '', itens: [], totV: null, totD: null, liquido: null };
    const iCab = ls.findIndex(l => /Código\s+Nome do Funcionário/i.test(l.txt));
    const iItens = ls.findIndex(l => /^Código\s+Descrição/i.test(l.txt));
    const iTot = ls.findIndex(l => /Total de Vencimentos/i.test(l.txt));
    if (iCab < 0 || iItens < 0 || iTot < 0) return null;
    r.empresa = ls[0] ? ls[0].txt : '';
    const lc = ls.find(l => /CNPJ/i.test(l.txt)); const mc = lc && lc.txt.match(/[\d.]{2,}\/[\d]{4}-\d{2}/); r.cnpj = mc ? mc[0] : '';
    const lm = ls.find(l => new RegExp('(' + MESES.join('|') + ')\\s+de\\s+20\\d\\d', 'i').test(semAcento(l.txt)));
    if (lm) { const m = semAcento(lm.txt).match(new RegExp('(' + MESES.join('|') + ')\\s+DE\\s+(20\\d\\d)')); if (m) r.comp = String(MESES.indexOf(m[1]) + 1).padStart(2, '0') + '/' + m[2]; }
    const lf = ls[iCab + 1]; if (lf) { r.cod = lf.ws[0] && lf.ws[0].x < 45 ? lf.ws[0].t : ''; r.nome = lf.ws.filter(w => w.x > 45 && w.x < 360).map(w => w.t).join(' '); }
    for (let i = iItens + 1; i < iTot; i++) {
      const ws = ls[i].ws;
      const cod = ws.filter(w => w.x < 35 && /^\d+$/.test(w.t)), desc = ws.filter(w => w.x >= 35 && w.x < 285);
      const ref = ws.filter(w => w.x >= 285 && w.x < 360 && ehValor(w.t)), ven = ws.filter(w => w.x >= 360 && w.x < 440 && ehValor(w.t)), dsc = ws.filter(w => w.x >= 440 && ehValor(w.t));
      if (!desc.length) continue;
      r.itens.push({ cod_evento: cod.length ? cod[0].t : '', descricao: desc.map(w => w.t).join(' '), referencia: ref.length ? ref[0].t : '',
        tipo: ven.length ? 'PROVENTO' : 'DESCONTO', valor: ven.length ? num(ven[0].t) : (dsc.length ? num(dsc[0].t) : 0) });
    }
    // totais: primeira linha com valores depois do "Total de Vencimentos"
    for (let i = iTot + 1; i < ls.length; i++) { const vs = ls[i].ws.filter(w => ehValor(w.t) && w.x > 360);
      if (vs.length >= 2) { r.totV = num(vs[0].t); r.totD = num(vs[vs.length - 1].t); break; } }
    const il = ls.findIndex(l => /Valor Líquido/i.test(l.txt));
    if (il >= 0) for (let i = il; i < Math.min(ls.length, il + 3); i++) { const v = ls[i].ws.filter(w => ehValor(w.t)); if (v.length) { r.liquido = num(v[v.length - 1].t); break; } }
    return r;
  }

  // pdf = documento aberto pelo pdf.js; devolve { comp, recibos: [...], itens: [...], erros: [...] }
  async function ler(pdf) {
    const recibos = [], erros = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const { ws, altura } = await palavras(page);
      const ls = linhas(ws.filter(w => w.top < altura / 2 - 5 && w.x < 520));
      const r = lerRecibo(ls);
      if (!r) { erros.push(`Página ${p}: não parece um recibo de pagamento (cabeçalho não encontrado).`); continue; }
      r.pagina = p;
      const sv = Math.round(r.itens.filter(i => i.tipo === 'PROVENTO').reduce((a, i) => a + i.valor, 0) * 100) / 100;
      const sd = Math.round(r.itens.filter(i => i.tipo === 'DESCONTO').reduce((a, i) => a + i.valor, 0) * 100) / 100;
      if (r.totV == null || Math.abs(sv - r.totV) > 0.009 || Math.abs(sd - r.totD) > 0.009)
        erros.push(`Página ${p} (${r.nome || '?'}): a leitura não fecha com o total do recibo (lido ${sv.toFixed(2)} / ${sd.toFixed(2)} · impresso ${r.totV} / ${r.totD}).`);
      recibos.push(r);
    }
    const comps = [...new Set(recibos.map(r => r.comp).filter(Boolean))];
    const itens = [];
    recibos.forEach(r => r.itens.forEach(i => itens.push({ pagina: r.pagina, cnpj: r.cnpj, cod_func: r.cod, nome: r.nome, ...i })));
    return { comp: comps.length === 1 ? comps[0] : null, comps, recibos, itens, erros,
      totais: { vencimentos: Math.round(recibos.reduce((a, r) => a + (r.totV || 0), 0) * 100) / 100, descontos: Math.round(recibos.reduce((a, r) => a + (r.totD || 0), 0) * 100) / 100 } };
  }

  global.HoleriteCore = { ler };
})(typeof window !== 'undefined' ? window : globalThis);
