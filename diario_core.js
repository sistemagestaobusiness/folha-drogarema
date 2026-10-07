// =====================================================================
// ACOMPANHAMENTO DO MÊS (substitui a planilha "Diário" das lojas).
// Lê os dois relatórios do Alpha7 que o líder já exporta e devolve o resumo:
//   1) Análise de Venda (Data, Usuário Orçamento, Classificação 3º nível, Itens, Venda...)
//   2) Análise de Venda por Item (Data, Usuário Orçamento, Embalagem, Itens, Venda...) = vitaminas e valor fixo
// Guarda só os totais por dia e por atendente (não guarda linha a linha).
// =====================================================================
(function (global) {
  const norm = t => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
  const num = v => { if (typeof v === 'number') return v; const s = String(v == null ? '' : v).trim(); if (!s) return 0; const n = parseFloat(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s); return isFinite(n) ? n : 0; };
  const r2 = v => Math.round(v * 100) / 100;
  const p2 = n => String(n).padStart(2, '0');
  // data da célula -> 'AAAA-MM-DD' (aceita número do Excel, Date ou texto dd/mm/aaaa e aaaa-mm-dd)
  function dia(v) {
    if (v == null || v === '') return null;
    if (v instanceof Date) return isNaN(v) ? null : v.getFullYear() + '-' + p2(v.getMonth() + 1) + '-' + p2(v.getDate());
    if (typeof v === 'number') { if (v < 30000 || v > 80000) return null; const d = new Date(Math.round((v - 25569) * 86400000)); return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()); }
    const s = String(v).trim(); let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return m[1] + '-' + m[2] + '-' + m[3];
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s); return m ? m[3] + '-' + p2(m[2]) + '-' + p2(m[1]) : null;
  }
  const compDe = d => d.slice(5, 7) + '/' + d.slice(0, 4);
  // "ALINE INAMURA - 875" -> "ALINE INAMURA"; vazio ou "sistema" -> '' (entra em "Demais")
  // diretoria: a venda conta para a loja, mas a pessoa não aparece na lista (entra em "Demais usuários")
  const FORA_DA_LISTA = [/^SANDRO\b.*\bGOTO\b/, /^SANDRO BURON\b/, /^WAGNER GABRIEL\b/];
  const oculto = s => FORA_DA_LISTA.some(re => re.test(norm(s)));
  function usuario(v) { const s = String(v == null ? '' : v).replace(/\s*-\s*\d+\s*$/, '').trim().toUpperCase(); return !s || /^SISTEMA\b/.test(s) || oculto(s) ? '' : s; }
  function cabecalho(rows, precisa) {
    for (let i = 0; i < Math.min(rows.length, 30); i++) { const r = (rows[i] || []).map(norm); const ix = {}; let ok = true;
      Object.keys(precisa).forEach(k => { const j = r.findIndex(c => precisa[k].test(c)); if (j < 0) ok = false; ix[k] = j; }); if (ok) return { linha: i, ix }; }
    return null;
  }
  function tipo(rows) {
    if (cabecalho(rows, { n: /^COD\.? UN\.? NEG/, c: /^CLASSIFICACAO/, v: /^VENDA$/ })) return 'GERAL';
    if (cabecalho(rows, { d: /^DATA$/, u: /^USUARIO/, e: /^EMBALAGEM$/, v: /^VENDA$/ })) return 'CAMPANHA';
    if (cabecalho(rows, { d: /^DATA$/, u: /^USUARIO/, c: /^CLASSIFICACAO/, v: /^VENDA$/ })) return 'VENDA';
    return null;
  }
  // -> { dias: { 'AAAA-MM-DD': { USUARIO: { f, s, i } } }, linhas, outrosMeses: ['MM/AAAA'] }
  function lerVenda(rows, comp) {
    const c = cabecalho(rows, { d: /^DATA$/, u: /^USUARIO/, c: /^CLASSIFICACAO/, v: /^VENDA$/ }); if (!c) return null;
    const cab = (rows[c.linha] || []).map(norm), it = cab.findIndex(x => /^ITENS$/.test(x)), cu = cab.findIndex(x => /^CUSTO$/.test(x));
    const dias = {}, outros = new Set(); let linhas = 0;
    for (let i = c.linha + 1; i < rows.length; i++) { const r = rows[i]; if (!r) continue;
      const d = dia(r[c.ix.d]), cl = norm(r[c.ix.c]); if (!d || !cl) continue;
      if (compDe(d) !== comp) { outros.add(compDe(d)); continue; }
      const u = usuario(r[c.ix.u]), v = num(r[c.ix.v]); const o = ((dias[d] = dias[d] || {})[u] = dias[d][u] || { f: 0, s: 0, p: 0, l: 0, i: 0 });
      o.f += v; if (/MEDICAMENTOS\s*>\s*(GENERICO|SIMILAR)\s*$/.test(cl)) o.s += v; if (/^P\s*>\s*PERFUMARIA\s*>/.test(cl)) o.p += v; if (cu >= 0) o.l += v - num(r[cu]); if (it >= 0) o.i += num(r[it]); linhas++; }
    Object.values(dias).forEach(us => Object.values(us).forEach(o => { o.f = r2(o.f); o.s = r2(o.s); o.p = r2(o.p); if (cu >= 0) o.l = r2(o.l); else delete o.l; }));
    return { dias, linhas, outrosMeses: [...outros] };
  }
  // -> { camp: { USUARIO: { itens, venda, prod: { NOME: itens } } }, linhas }
  function lerCampanha(rows, comp) {
    const c = cabecalho(rows, { d: /^DATA$/, u: /^USUARIO/, e: /^EMBALAGEM$/, v: /^VENDA$/ }); if (!c) return null;
    const it = (rows[c.linha] || []).map(norm).findIndex(x => /^ITENS$/.test(x)); const camp = {}; let linhas = 0;
    for (let i = c.linha + 1; i < rows.length; i++) { const r = rows[i]; if (!r) continue;
      const d = dia(r[c.ix.d]), e = String(r[c.ix.e] == null ? '' : r[c.ix.e]).trim(); if (!d || !e || compDe(d) !== comp) continue;
      const u = usuario(r[c.ix.u]), q = it >= 0 ? num(r[it]) : 1; const o = (camp[u] = camp[u] || { itens: 0, venda: 0, prod: {} });
      o.itens += q; o.venda = r2(o.venda + num(r[c.ix.v])); o.prod[e] = (o.prod[e] || 0) + q; linhas++; }
    return { camp, linhas };
  }
  // relatório geral (todas as lojas, sem data): Cód. Un. Neg., Classificação 3º nível, Fabricante, Venda, Lucro
  // -> { 1: { f, s, p, sid, l }, ... }  (acumulado do mês até a véspera)
  function lerGeral(rows) {
    const c = cabecalho(rows, { n: /^COD\.? UN\.? NEG/, c: /^CLASSIFICACAO/, v: /^VENDA$/ }); if (!c) return null;
    const cab = (rows[c.linha] || []).map(norm), fb = cab.findIndex(x => /^FABRICANTE$/.test(x)), lu = cab.findIndex(x => /^LUCRO$/.test(x)), cu = cab.findIndex(x => /^CUSTO$/.test(x)); const out = {};
    for (let i = c.linha + 1; i < rows.length; i++) { const r = rows[i]; if (!r) continue; const n = parseInt(r[c.ix.n], 10), cl = norm(r[c.ix.c]); if (!(n >= 1 && n <= 7) || !cl) continue;
      const v = num(r[c.ix.v]), o = (out[n] = out[n] || { f: 0, s: 0, p: 0, sid: 0, l: 0 });
      o.f += v; if (/MEDICAMENTOS\s*>\s*(GENERICO|SIMILAR)\s*$/.test(cl)) o.s += v; if (/^P\s*>\s*PERFUMARIA\s*>/.test(cl)) o.p += v;
      if (fb >= 0 && /^SIDNEY OLIVEIRA$/.test(norm(r[fb]))) o.sid += v; o.l += lu >= 0 ? num(r[lu]) : cu >= 0 ? v - num(r[cu]) : 0; }
    Object.values(out).forEach(o => Object.keys(o).forEach(k => o[k] = r2(o[k]))); return out;
  }
  const diasDoMes = comp => new Date(Number(comp.slice(3)), Number(comp.slice(0, 2)), 0).getDate();
  // notas da planilha de metas: desvio = 1 - esperado/alcance  (> 5% ótimo, > -5% bom, > -10% regular, senão ruim)
  function desvio(alcance, ritmo) { return alcance > 0 && ritmo > 0 ? 1 - ritmo / alcance : null; }
  function nota(dv) { return dv == null ? null : dv > 0.05 ? 'ÓTIMO' : dv > -0.05 ? 'BOM' : dv > -0.10 ? 'REGULAR' : 'RUIM'; }
  function notaMargem(m) { return m == null ? null : m < 0.36 ? 'RUIM' : m < 0.37 ? 'REGULAR' : m < 0.385 ? 'BOM' : 'ÓTIMO'; }
  // resumo para a tela. meta = linha de loja_metas (ou null). ate = 'AAAA-MM-DD' para ver como estava naquela data.
  function resumo(dados, meta, comp, ate, ant) {
    const todos = (dados && dados.dias) || {}, datas = Object.keys(todos).filter(d => !ate || d <= ate).sort(), hoje = datas[datas.length - 1] || null;
    const tot = { f: 0, s: 0, p: 0, l: 0 }, hj = { f: 0, s: 0 }, at = {}; let temLucro = false;
    datas.forEach(d => Object.keys(todos[d]).forEach(u0 => { const o = todos[d][u0], u = oculto(u0) ? '' : u0; tot.f += o.f; tot.s += o.s; tot.p += o.p || 0; if (o.l != null) { tot.l += o.l; temLucro = true; }
      if (d === hoje) { hj.f += o.f; hj.s += o.s; }
      const a = (at[u] = at[u] || { nome: u, f: 0, s: 0, fh: 0, sh: 0, dias: 0 }); a.f += o.f; a.s += o.s; if (o.f > 0) a.dias++; if (d === hoje) { a.fh += o.f; a.sh += o.s; } }));
    // relatório geral: última foto até a data (traz Sidney; e serve de base quando a loja ainda não subiu o relatório do dia)
    const fotos = (dados && dados.geral) || {}, kf = Object.keys(fotos).filter(d => !ate || d <= ate).sort().pop() || null, foto = kf ? fotos[kf] : null;
    const semDia = !datas.length && foto; if (semDia) { tot.f = foto.f; tot.s = foto.s; tot.p = foto.p; tot.l = foto.l; temLucro = true; }
    const ref = hoje || (kf ? menosDias(kf, 1) : null);   // a foto do relatório geral vai até a véspera
    const nDias = diasDoMes(comp), nHoje = ref ? Number(ref.slice(8)) : 0, rest = Math.max(1, nDias - nHoje + (semDia ? 0 : 1)), ritmo = nHoje / nDias;
    const equipe = Object.values(at).filter(a => a.nome).sort((a, b) => b.f - a.f), demais = at[''] || null;
    const camp = (dados && dados.camp) || {};
    // objetivo individual = meta da loja x participação da pessoa.
    //   participação: a do mês anterior fechado (venda dela / venda da equipe), quando esse mês foi enviado;
    //   sem mês anterior: divisão igual entre quem tem pelo menos 3% da venda da loja (quem vende de passagem fica sem objetivo).
    const antTot = ant ? Object.keys(ant).filter(k => k && !oculto(k)).reduce((t, k) => t + ant[k].f, 0) : 0;
    const fixos = equipe.filter(a => tot.f && a.f / tot.f >= 0.03), n = fixos.length || 1;
    equipe.forEach(a => { a.pct = a.f ? a.s / a.f : 0; a.pctHoje = a.fh ? a.sh / a.fh : null; a.camp = camp[a.nome] || null;
      a.fixo = fixos.includes(a);
      a.part = antTot > 0 ? (ant[a.nome] ? ant[a.nome].f / antTot : 0) : (a.fixo ? 1 / n : 0);
      a.objS = meta && meta.simgen && a.part > 0 ? Number(meta.simgen) * a.part : null; a.objF = meta && meta.fat && a.part > 0 ? Number(meta.fat) * a.part : null; });
    const origemObj = antTot > 0 ? 'ANTERIOR' : 'IGUAL';
    // indicadores: realizado, meta, alcance, desvio contra o esperado para o dia, nota, quanto falta e por dia
    const ind = (k, rot, real, me, antesDeHoje) => { me = Number(me) || null; const alc = me ? real / me : null, dv = desvio(alc, ritmo), falta = me ? Math.max(0, me - real) : null;
      return { k, rot, real, meta: me, alc, dv, nota: nota(dv), falta, porDia: falta != null ? Math.max(0, me - (antesDeHoje == null ? real : antesDeHoje)) / rest : null }; };
    const inds = [ind('fat', 'Faturamento total', tot.f, meta && meta.fat, tot.f - hj.f), ind('simgen', 'Similar e genérico', tot.s, meta && meta.simgen, tot.s - hj.s), ind('perf', 'Perfumaria', tot.p, meta && meta.perf)];
    if (foto && !ate) inds.push(Object.assign(ind('sidney', 'Sidney Oliveira', foto.sid, meta && meta.sidney), { foto: kf }));
    else if (!ate && meta && meta.sidney) inds.push({ k: 'sidney', rot: 'Sidney Oliveira', real: null, meta: Number(meta.sidney), alc: null, dv: null, nota: null, falta: null, porDia: null, semDado: true });
    const margem = temLucro && tot.f ? tot.l / tot.f : null;
    return { hoje, ref, datas, nDias, nHoje, ritmo, tot, hj, equipe, demais, nEquipe: n, origemObj, inds, margem, notaMargem: notaMargem(margem), semDia: !!semDia,
      pct: tot.f ? tot.s / tot.f : 0, pctHoje: hj.f ? hj.s / hj.f : null, alvo: meta && meta.pct_simgen ? Number(meta.pct_simgen) : 0.45 };
  }
  const menosDias = (d, n) => { const x = new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8))); x.setUTCDate(x.getUTCDate() - n); return x.toISOString().slice(0, 10); };
  // venda de cada atendente no mês anterior até o mesmo dia do mês -> { NOME: { f, s } }
  function ateODia(dadosAnt, diaDoMes) { const out = {}; Object.keys((dadosAnt && dadosAnt.dias) || {}).forEach(d => { if (Number(d.slice(8)) > diaDoMes) return;
    Object.keys(dadosAnt.dias[d]).forEach(u0 => { const u = oculto(u0) ? '' : u0, o = dadosAnt.dias[d][u], a = (out[u] = out[u] || { f: 0, s: 0 }); a.f += o.f; a.s += o.s; }); }); return out; }
  // cor do % de similar e genérico: verde na meta, amarelo até 7,5 pontos abaixo, vermelho além disso (regra da planilha: 45% / 37,5%)
  function nivel(p, alvo) { if (p == null) return ''; return p >= alvo ? 'ok' : p >= alvo - 0.075 ? 'atencao' : 'baixo'; }
  global.DiarioCore = { tipo, lerVenda, lerCampanha, lerGeral, resumo, nivel, desvio, nota, notaMargem, menosDias, ateODia, dia, usuario, diasDoMes, norm };
})(typeof window !== 'undefined' ? window : globalThis);
