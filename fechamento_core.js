// =====================================================================
// DROGAREMA - FECHAMENTO FINANCEIRO (RESULTADO LOJA): leitura dos relatórios do
// Alpha7 e cálculo. Mesma conta da planilha (abas RESUMO e RESULTADO LOJA):
//   por loja e classificação = Classificação Nível 3
//                              − Prefeitura/Wagner
//                              ± Farmácia Popular (venda na loja 3 de usuário de outra loja)
//                              − e-commerce (vira coluna própria)
// Funções puras (sem banco): a tela entrega as abas como matrizes de células.
// =====================================================================
(function (global) {
  const LOJAS = [1, 2, 3, 4, 5, 6, 7];
  const norm = t => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  const num = v => typeof v === 'number' ? v : (v == null || v === '' ? 0 : (parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0));
  const C = {
    DERMO: 'P > DERMOCOSMETICOS > DERMO', RENNOVA: 'P > DERMOCOSMETICOS > RENNOVA', FORMULAS: 'P > FORMULAS SEM DESCONTO > FORMULAS',
    ETICO: 'P > MEDICAMENTOS > ETICO', FITO: 'P > MEDICAMENTOS > FITOTERAPICOS', GENERICO: 'P > MEDICAMENTOS > GENERICO', SIMILAR: 'P > MEDICAMENTOS > SIMILAR',
    LEITES: 'P > PERFUMARIA > LEITES', COCA: 'P > PERFUMARIA > LINHA COCA COLA', PERF: 'P > PERFUMARIA > PERFUMARIA', SUPL: 'P > PERFUMARIA > SUPLEMENTOS',
    VAREJO: 'P > PERFUMARIA > VAREJO/MATERIAIS CIRURGICOS', SERVICOS: 'P > SERVICOS > SERVICOS', COVID: 'P > SERVICOS > TESTE DE COVID'
  };
  const achaAba = (abas, ...chaves) => { const k = Object.keys(abas).find(n => chaves.some(c => norm(n).includes(c))); return k ? abas[k] : null; };
  const vazio = () => ({ v: 0, d: 0, l: 0 });
  const soma = (a, b, s) => { a.v += s * b.v; a.d += s * b.d; a.l += s * b.l; };

  // "Análise de venda por item" agrupada por "Cód. Un. Neg.: NN" (Classificação Nível 3 e Prefeitura + Wagner)
  function lerPorUnidade(rows) {
    const out = {}; let loja = null;
    (rows || []).forEach(r => {
      if (!r) return;
      for (const c of r) { const m = /C[oó]d\.\s*Un\.\s*Neg\.\s*:\s*(\d+)/i.exec(String(c == null ? '' : c)); if (m) { loja = parseInt(m[1], 10); return; } }
      const b = r.findIndex(c => typeof c === 'string' && /^P\s*>/.test(c.trim()));
      if (loja && b >= 0 && typeof r[b + 2] === 'number') {
        const k = norm(r[b]); out[loja] = out[loja] || {};
        const o = out[loja][k] || (out[loja][k] = vazio());
        o.v += num(r[b + 2]); o.d += num(r[b + 4]); o.l += num(r[b + 8]);
      }
    });
    return out;
  }
  const colunas = (r, nomes) => { const idx = {}; (r || []).forEach((c, i) => { const n = norm(c); Object.keys(nomes).forEach(k => { if (idx[k] == null && nomes[k].test(n)) idx[k] = i; }); }); return idx; };

  // e-commerce: linhas com unidade, classificação, origem, fabricante
  function lerEcommerce(rows) {
    const out = {}; let ix = null;
    (rows || []).forEach(r => {
      if (!r) return;
      if (r.some(c => /FABRICANTE/.test(norm(c))) && r.some(c => /^VENDA$/.test(norm(c)))) {
        ix = colunas(r, { un: /^COD\. UN\. NEG/, cls: /^CLASSIFICACAO 3/, fab: /^FABRICANTE$/, v: /^VENDA$/, d: /^DESCONTO$/, l: /^LUCRO$/ }); return;
      }
      if (!ix || !/^\d+$/.test(String(r[ix.un] == null ? '' : r[ix.un]).trim()) || typeof r[ix.v] !== 'number') return;
      const loja = parseInt(r[ix.un], 10);
      (out[loja] = out[loja] || []).push({ cls: norm(r[ix.cls]), fab: norm(r[ix.fab]), v: num(r[ix.v]), d: num(r[ix.d]), l: num(r[ix.l]) });
    });
    return out;
  }

  // detalhe total vendido: blocos "VITAMINAS" e "SIDNEY OLIVEIRA", uma linha por unidade
  function lerDetalhe(rows) {
    const out = { vit: {}, sid: {} }; let sec = null, ix = null;
    (rows || []).forEach(r => {
      if (!r) return;
      const cheias = r.filter(c => c != null && String(c).trim() !== '');
      if (cheias.length === 1 && typeof cheias[0] === 'string') {
        const t = norm(cheias[0]);
        if (/^VITAMINA/.test(t)) sec = 'vit'; else if (/^SIDNEY/.test(t)) sec = 'sid';
        return;
      }
      if (r.some(c => /^COD\. UN\. NEG/.test(norm(c)))) { ix = colunas(r, { un: /^COD\. UN\. NEG/, v: /^VENDA$/ }); return; }
      if (sec && ix && /^\d+$/.test(String(r[ix.un] == null ? '' : r[ix.un]).trim()) && typeof r[ix.v] === 'number')
        out[sec][parseInt(r[ix.un], 10)] = (out[sec][parseInt(r[ix.un], 10)] || 0) + num(r[ix.v]);
    });
    return out;
  }

  // farmácia popular (loja 3): blocos por classificação, uma linha por usuário do orçamento
  function lerFarmaciaPopular(rows) {
    const out = []; let cls = null, ix = null;
    (rows || []).forEach(r => {
      if (!r) return;
      for (const c of r) { const m = /Classifica[cç][aã]o 3.{0,3}N[ií]vel:\s*(P\s*>.+)$/i.exec(String(c == null ? '' : c).trim()); if (m) { cls = norm(m[1]); break; } }
      if (r.some(c => /^USUARIO ORCAMENTO$/.test(norm(c)))) { ix = colunas(r, { u: /^USUARIO ORCAMENTO$/, v: /^VENDA$/, d: /^DESCONTO$/, l: /^LUCRO$/ }); return; }
      if (!cls || !ix) return;
      const u = String(r[ix.u] == null ? '' : r[ix.u]).trim();
      if (!u || /^TOTAL/i.test(u) || typeof r[ix.v] !== 'number') return;
      out.push({ usuario: u, cls, v: num(r[ix.v]), d: num(r[ix.d]), l: num(r[ix.l]) });
    });
    return out;
  }

  // abas: { nomeDaAba: [[celulas...], ...] } ; lojaDoUsuario(usuario) -> nº da loja (ou null = fica na loja 3)
  function calcular(abas, lojaDoUsuario) {
    const avisos = [];
    const rC3 = achaAba(abas, 'CLASSIFICACAO NIVEL 3', 'NIVEL 3');
    if (!rC3) throw new Error('Não encontrei a aba "Classificação Nível 3" no arquivo.');
    const c3 = lerPorUnidade(rC3);
    const rPref = achaAba(abas, 'PREFEITURA'); const pref = lerPorUnidade(rPref);
    if (!rPref) avisos.push('Aba "PREFEITURA + WAGNER" não encontrada: nada foi abatido de prefeitura / Wagner.');
    const rEco = achaAba(abas, 'ECOMMERCE', 'E-COMMERCE'); const eco = lerEcommerce(rEco);
    if (!rEco) avisos.push('Aba "ECOMMERCE" não encontrada: a coluna de e-commerce ficou zerada.');
    const rDet = achaAba(abas, 'DETALHE TOTAL VENDIDO', 'DETALHE'); const det = lerDetalhe(rDet);
    if (!rDet) avisos.push('Aba "DETALHE TOTAL VENDIDO" não encontrada: vitaminas e Sidney ficaram zerados.');
    const rFp = achaAba(abas, 'FARMACIA POPULAR'); const fp = lerFarmaciaPopular(rFp);
    if (!rFp) avisos.push('Aba "FARMACIA POPULAR LOJA 3" não encontrada: sem separação da farmácia popular.');
    if (!Object.keys(c3).length) throw new Error('A aba "Classificação Nível 3" está sem dados (não achei "Cód. Un. Neg.: 01").');

    // 1) base por loja = classificação nível 3 − prefeitura/Wagner
    const L = {};
    LOJAS.forEach(i => { L[i] = {}; Object.keys(c3[i] || {}).forEach(k => { L[i][k] = { ...c3[i][k] }; });
      Object.keys(pref[i] || {}).forEach(k => { L[i][k] = L[i][k] || vazio(); soma(L[i][k], pref[i][k], -1); }); });

    // 2) farmácia popular: venda na loja 3 feita por usuário de outra loja vai para a loja dele
    const transferencias = [], semVinculo = [];
    fp.forEach(x => {
      const dest = lojaDoUsuario ? lojaDoUsuario(x.usuario) : null;
      if (dest === undefined) { if (!semVinculo.includes(x.usuario)) semVinculo.push(x.usuario); return; }
      if (!dest || dest === 3 || !LOJAS.includes(dest)) return;
      L[3][x.cls] = L[3][x.cls] || vazio(); L[dest][x.cls] = L[dest][x.cls] || vazio();
      soma(L[3][x.cls], x, -1); soma(L[dest][x.cls], x, 1);
      transferencias.push({ ...x, destino: dest });
    });

    // 3) e-commerce sai da loja e vira coluna própria (linha Sidney: só o fabricante SIDNEY OLIVEIRA, como na planilha)
    const E = {}; let eSid = 0; const sidEco = {};
    LOJAS.forEach(i => (eco[i] || []).forEach(x => {
      L[i][x.cls] = L[i][x.cls] || vazio(); soma(L[i][x.cls], x, -1);
      E[x.cls] = E[x.cls] || vazio(); soma(E[x.cls], x, 1);
      if (x.fab === 'SIDNEY OLIVEIRA') { sidEco[i] = (sidEco[i] || 0) + x.v; eSid += x.v; }
    }));

    const cols = [...LOJAS.map(i => ({ id: String(i), nome: 'LOJA ' + i, m: L[i], vit: det.vit[i] || 0, sid: (det.sid[i] || 0) - (sidEco[i] || 0) })),
                  { id: 'E', nome: 'E-COMMERCE', m: E, vit: 0, sid: eSid }];
    const g = (c, k, campo) => ((c.m[norm(k)] || {})[campo || 'v']) || 0;
    const tot = (c, campo) => Object.values(c.m).reduce((a, x) => a + x[campo], 0);
    const R = {};
    cols.forEach(c => {
      const liq = tot(c, 'v'), desc = tot(c, 'd'), lucro = tot(c, 'l');
      const gen = g(c, C.GENERICO), sim = g(c, C.SIMILAR), gensim = gen + sim;
      const perfItens = { leites: g(c, C.LEITES), coca: g(c, C.COCA), perfumaria: g(c, C.PERF), suplementos: g(c, C.SUPL), varejo: g(c, C.VAREJO), fito: g(c, C.FITO) };
      const perf = Object.values(perfItens).reduce((a, b) => a + b, 0);
      const dermo = g(c, C.DERMO), rennova = g(c, C.RENNOVA), etico = g(c, C.ETICO), formulas = g(c, C.FORMULAS), servicos = g(c, C.SERVICOS), covid = g(c, C.COVID);
      R[c.id] = { nome: c.nome, bruto: liq + desc, desc, liq, lucro, gen, sim, gensim, vit: c.vit, gensim_sem_vit: gensim - c.vit,
        perf, ...perfItens, sidney: c.sid, perf_sem_sidney: perf - c.sid,
        dermo_total: dermo + rennova, dermo, rennova, efs: etico + formulas + servicos + covid, etico, formulas, servicos, covid };
    });
    // classificações que vieram no relatório e não estão no modelo (ficam só no total da loja)
    const conhecidas = new Set(Object.values(C).map(norm)); const novas = new Set();
    cols.forEach(c => Object.keys(c.m).forEach(k => { if (!conhecidas.has(k) && Math.abs(c.m[k].v) > 0.005) novas.add(k); }));
    if (novas.size) avisos.push('Classificações novas no relatório (entram no faturamento total, mas não têm linha própria): ' + [...novas].join(' · '));
    return { colunas: cols.map(c => c.id), resultado: R, transferencias, semVinculo, avisos, usuariosFp: [...new Set(fp.map(x => x.usuario))] };
  }

  // bônus de faturamento: base arredondada para o milhar, faixa = maior "a partir de" que não passa da base
  function bonus(regra, base) {
    const arred = Math.round(base / 1000) * 1000;
    const fx = (regra.faixas || []).map(f => [num(f[0]), num(f[1])]).sort((a, b) => a[0] - b[0]);
    let escolhida = null; fx.forEach(f => { if (arred >= f[0]) escolhida = f; });
    if (!escolhida) return { base, arred, valor: 0, faixa: null, piso: fx.length ? fx[0][0] : null };
    const valor = regra.tipo === 'PERCENTUAL' ? Math.round(arred * escolhida[1] * 100) / 100 : escolhida[1];
    return { base, arred, valor, faixa: escolhida, noTeto: escolhida === fx[fx.length - 1] };
  }

  global.FechamentoCore = { calcular, bonus, norm, LOJAS, lerPorUnidade, lerEcommerce, lerDetalhe, lerFarmaciaPopular };
})(typeof window !== 'undefined' ? window : globalThis);
