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
      // o valor pode vir como número ou como texto "166.95" (relatório colado na planilha)
      const ehNum = v => typeof v === 'number' || (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim()));
      const n2 = v => typeof v === 'number' ? v : parseFloat(v) || 0;
      if (loja && b >= 0 && ehNum(r[b + 2])) {
        const k = norm(r[b]); out[loja] = out[loja] || {};
        const o = out[loja][k] || (out[loja][k] = { v: 0, d: 0, l: 0, q: 0 });
        o.v += n2(r[b + 2]); o.d += n2(r[b + 4]); o.l += n2(r[b + 8]); o.q += ehNum(r[b + 1]) ? n2(r[b + 1]) : 0;
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

  // "Análise de Entrega": uma linha por unidade (valor do delivery e quantidade de entregas)
  function lerEntregas(rows) {
    const out = {}; let ix = null;
    (rows || []).forEach(r => {
      if (!r) return;
      if (r.some(c => /^ENTREGAS$/.test(norm(c))) && r.some(c => /^UN\. NEG\.?$/.test(norm(c)))) { ix = colunas(r, { un: /^UN\. NEG\.?$/, v: /^VALOR$/, e: /^ENTREGAS$/ }); return; }
      if (!ix || !/^\d+$/.test(String(r[ix.un] == null ? '' : r[ix.un]).trim())) return;
      out[parseInt(r[ix.un], 10)] = { valor: num(r[ix.v]), entregas: num(r[ix.e]) };
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
    const transferencias = [], semVinculo = [], fpGS = {}, fpV = {};   // fpV: venda de farmácia popular que ficou em cada loja   // fpGS: genérico + similar que entrou (+) ou saiu (−) da loja pela farmácia popular
    fp.forEach(x => {
      const dest = lojaDoUsuario ? lojaDoUsuario(x.usuario) : null;
      { const fica = dest && dest !== 3 && LOJAS.includes(dest) ? dest : 3; fpV[fica] = (fpV[fica] || 0) + x.v; }
      if (dest === undefined) { if (!semVinculo.includes(x.usuario)) semVinculo.push(x.usuario); return; }
      if (!dest || dest === 3 || !LOJAS.includes(dest)) return;
      L[3][x.cls] = L[3][x.cls] || vazio(); L[dest][x.cls] = L[dest][x.cls] || vazio();
      soma(L[3][x.cls], x, -1); soma(L[dest][x.cls], x, 1);
      transferencias.push({ ...x, destino: dest });
      if (x.cls === norm(C.GENERICO) || x.cls === norm(C.SIMILAR)) { fpGS[dest] = (fpGS[dest] || 0) + x.v; fpGS[3] = (fpGS[3] || 0) - x.v; }
    });

    // 3) e-commerce sai da loja e vira coluna própria (linha Sidney: só o fabricante SIDNEY OLIVEIRA, como na planilha)
    const E = {}; let eSid = 0; const sidEco = {};
    LOJAS.forEach(i => (eco[i] || []).forEach(x => {
      L[i][x.cls] = L[i][x.cls] || vazio(); soma(L[i][x.cls], x, -1);
      E[x.cls] = E[x.cls] || vazio(); soma(E[x.cls], x, 1);
      if (x.fab === 'SIDNEY OLIVEIRA') { sidEco[i] = (sidEco[i] || 0) + x.v; eSid += x.v; }
    }));

    // % de desconto e ticket médio por classificação: direto do nível 3 da loja (como na planilha de resultado)
    const rEnt = achaAba(abas, 'ENTREGAS', 'ANALISE DE ENTREGA'); const ent = rEnt ? lerEntregas(rEnt) : null;
    const porClasse = i => { const o = { descp: {}, ticket: {} };
      [['etico', C.ETICO], ['similar', C.SIMILAR], ['generico', C.GENERICO]].forEach(([k, cls]) => { const x = (c3[i] || {})[norm(cls)];
        o.descp[k] = x && x.v + x.d > 0 ? Math.round(x.d / (x.v + x.d) * 10000) / 10000 : null;
        o.ticket[k] = x && x.q > 0 ? Math.round(x.v / x.q * 100) / 100 : null; });
      return o; };
    const cols = [...LOJAS.map(i => ({ id: String(i), loja: i, nome: 'LOJA ' + i, m: L[i], vit: det.vit[i] || 0, sid: (det.sid[i] || 0) - (sidEco[i] || 0) })),
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
        // comissão/bônus não considera farmácia popular (sem margem): base = gen + sim − vitaminas, sem a transferência
        ...(c.loja ? porClasse(c.loja) : {}), delivery: c.loja && ent ? ((ent[c.loja] || {}).valor || 0) : null, entregas: c.loja && ent ? ((ent[c.loja] || {}).entregas || 0) : null,
        fp_venda: fpV[c.id] || 0, fp_gensim: fpGS[c.id] || 0, base_bonus: gensim - c.vit - (fpGS[c.id] || 0),
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

  // relatório "Análise de Plano de Remuneração" (comissão): resumo por usuário até a linha "Total"
  function lerComissao(rows) {
    const out = { usuarios: [], total: 0 }; let ix = null;
    for (const r of (rows || [])) {
      if (!r) continue;
      if (!ix) { if (r.some(c => /^USUARIO$/.test(norm(c))) && r.some(c => /^REMUNERACAO$/.test(norm(c)))) ix = colunas(r, { u: /^USUARIO$/, rem: /^REMUNERACAO$/, v: /^VENDA$/ }); continue; }
      const u = String(r[ix.u] == null ? '' : r[ix.u]).trim();
      if (/^TOTAL/i.test(u)) { out.totalRelatorio = num(r[ix.rem]); break; }
      if (!u || typeof r[ix.rem] !== 'number') continue;
      out.usuarios.push({ usuario: u, venda: num(r[ix.v]), valor: num(r[ix.rem]) }); out.total += num(r[ix.rem]);
    }
    return out;
  }

  // Descobre qual relatório do Alpha7 é o arquivo (pelo conteúdo; o nome só desempata relatórios de formato igual).
  // tipos: NIVEL3, PREFEITURA, WAGNER, ECOMMERCE, FP, VIT, SID e comissão C2018/C2019/C2020/C2021/C2022/CQUARENTENA
  const PLANOS = [['C2018', /\bSM\b|\bGN\b|GENERIC|SIMILAR/], ['CQUARENTENA', /QUARENTENA/], ['C2021', /FIXO/], ['C2020', /SIDNEY/], ['C2022', /VITAMINA/], ['C2019', /PERFUMARIA/]];
  function identificar(nomeArquivo, rows) {
    const nome = norm(String(nomeArquivo || '').replace(/\.[a-z0-9]+$/i, '').replace(/[_\-.]+/g, ' '));
    const topo = (rows || []).slice(0, 12);
    const tem = re => topo.some(r => (r || []).some(c => re.test(norm(c))));
    const titulo = norm(((rows || [])[0] || [])[0]);
    const per = /(\d{2})\/(\d{2})\/(\d{4})(?:\s+[\d:]+)?\s+a\s+(\d{2})\/(\d{2})\/(\d{4})/.exec(String(((rows || [])[0] || [])[0] || ''));
    const info = { tipo: null, periodo: per ? per[0].replace(/\s+\d{2}:\d{2}:\d{2}/g, '') : '', competencia: per ? per[2] + '/' + per[3] : '', mesmoMes: per ? per[2] === per[5] && per[3] === per[6] : null };
    if (/PLANO DE REMUNERACAO/.test(titulo)) {
      let p = PLANOS.find(x => x[1].test(nome));
      if (!p) { const dims = new Set(); let col = -1; (rows || []).forEach(r => { if (!r) return; const j = r.findIndex(c => /^DIMENSAO$/.test(norm(c))); if (j >= 0) { col = j; return; } if (col >= 0 && r[col]) dims.add(norm(r[col])); });
        const d = [...dims].join(' '); p = PLANOS.find(x => x[0] !== 'CQUARENTENA' && x[0] !== 'C2021' && x[1].test(d)); }
      info.tipo = p ? p[0] : 'C?'; Object.assign(info, lerComissao(rows));
      return info;
    }
    if (/^ANALISE DE ENTREGA/.test(titulo)) info.tipo = 'ENTREGAS';
    else if (tem(/^USUARIO ORCAMENTO$/)) info.tipo = 'FP';
    else if (tem(/^FABRICANTE$/)) info.tipo = 'ECOMMERCE';
    else if (tem(/^CLASSIFICACAO 3. NIVEL$/) || tem(/^COD\. UN\. NEG\.\s*:/)) info.tipo = /PREFEIT/.test(nome) ? 'PREFEITURA' : /WAGNER/.test(nome) ? 'WAGNER' : 'NIVEL3';
    else if (tem(/^COD\. UN\. NEG\.?$/)) info.tipo = /VITAMINA/.test(nome) ? 'VIT' : /SIDNEY/.test(nome) ? 'SID' : 'RESUMO?';
    if (info.tipo && !/\?$/.test(info.tipo)) {
      let v = 0; (rows || []).forEach(r => { if (!r) return; const j = r.findIndex(c => /^TOTAL( GERAL)?$/.test(norm(c))); if (j === 0) { const n = r.find(c => typeof c === 'number' && !Number.isInteger(c)); if (n != null) v = n; } });
      info.total = v;
    }
    return info;
  }

  global.FechamentoCore = { calcular, bonus, norm, LOJAS, lerPorUnidade, lerEcommerce, lerDetalhe, lerFarmaciaPopular, lerComissao, lerEntregas, identificar };
})(typeof window !== 'undefined' ? window : globalThis);
