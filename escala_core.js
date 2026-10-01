/* =====================================================================
   DROGAREMA · escala_core.js
   Mesmas regras da tela Escala, para as outras telas (freelance, aprovações,
   férias, lançamentos) consultarem quem trabalha em cada dia e a cobertura.
   Regra do dia: férias > exceção do dia > falta informada no freelance > padrão.
   Uso:  const EC = EscalaCore.criar(_supabase);
         await EC.garantir('2026-09-01', '2026-09-30');
         EC.cobertura(lojaId, '2026-09-24', { ignorarSolic: id })
   ===================================================================== */
(function (g) {
  'use strict';
  const AUSENCIAS_FREELA = { FALTA_DIA: 'FALTA', ATESTADO: 'ATESTADO', AUSENCIA: 'FALTA' };
  const NOMES = { TRABALHO: 'trabalha', FOLGA: 'folga', FALTA: 'falta', ATESTADO: 'atestado', AFASTADO: 'afastado',
    FERIAS: 'férias', FERIAS_PEDIDA: 'férias (pedida)', FECHADA: 'loja fechada', SEM: 'sem escala', FORA: 'fora do contrato' };
  const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const hm = t => t ? String(t).slice(0, 5) : '';
  const toMin = t => { if (!t) return null; const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
  const minHm = m => { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  const addDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const difDias = (a, b) => Math.round((new Date(a + 'T12:00:00') - new Date(b + 'T12:00:00')) / 86400000);
  const dow = iso => new Date(iso + 'T12:00:00').getDay();
  const dbr = iso => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '';
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // intervalo [a,b) em minutos; saída menor que a entrada = passa da meia-noite
  const faixa = (ini, fim) => { let a = toMin(ini), b = toMin(fim); if (a == null || b == null) return null; if (b <= a) b += 1440; return [a, b]; };
  const sobrepoe = (x, y) => x && y && x[0] < y[1] && y[0] < x[1];

  function criar(sb) {
    const st = { base: false, ini: null, fim: null, lojas: [], funcs: [], porId: {}, horarios: {}, padroes: {},
      exc: {}, ferias: {}, freelas: [], freelaAus: {}, erro: null };

    async function carregarBase() {
      if (st.base) return;
      const [rl, rf, rh, rp] = await Promise.all([
        sb.from('lojas').select('id, nome_loja, ativo').order('nome_loja'),
        sb.from('vw_funcionarios_basico').select('id, nome_registro, cargo, loja_id, data_contratacao, data_rescisao, status'),
        sb.from('escala_loja_horario').select('*'),
        sb.from('escala_funcionario').select('*')
      ]);
      st.erro = (rh.error || rp.error || rf.error || {}).message || null;
      st.lojas = rl.data || [];
      st.funcs = (rf.data || []).filter(f => String(f.status || 'ATIVO').toUpperCase() === 'ATIVO' || f.data_rescisao);
      st.porId = {}; st.funcs.forEach(f => st.porId[f.id] = f);
      st.horarios = {}; (rh.data || []).forEach(h => { (st.horarios[h.loja_id] = st.horarios[h.loja_id] || {})[h.dia_semana] = h; });
      st.padroes = {}; (rp.data || []).forEach(p => st.padroes[p.funcionario_id] = p);
      st.base = true;
    }

    // carrega exceções, férias e freelances do intervalo (com folga de 7 dias)
    async function garantir(ini, fim) {
      await carregarBase();
      if (!ini) return;
      fim = fim || ini;
      if (st.ini && ini >= st.ini && fim <= st.fim) return;
      const a = addDias(st.ini && st.ini < ini ? st.ini : ini, -7), b = addDias(st.fim && st.fim > fim ? st.fim : fim, 7);
      const [re, rf, rs] = await Promise.all([
        sb.from('escala_dias').select('*').gte('data', a).lte('data', b),
        sb.from('ferias_solicitacoes').select('id, funcionario_id, data_inicio, data_fim, status').lte('data_inicio', b).gte('data_fim', a),
        sb.from('freelance_solicitacoes').select('id, funcionario_id, funcionario_ausente_id, loja_id, data_servico, hora_inicio, hora_fim, motivo, status, tipo_solicitacao, tratamento_ausencia, cargo_exercido')
          .gte('data_servico', a).lte('data_servico', b)
      ]);
      if (re.error && !st.erro) st.erro = re.error.message;
      st.exc = {}; (re.data || []).forEach(e => st.exc[e.funcionario_id + '|' + e.data] = e);
      st.ferias = {}; (rf.data || []).filter(s => !['RECUSADA', 'CANCELADA'].includes(s.status))
        .forEach(s => (st.ferias[s.funcionario_id] = st.ferias[s.funcionario_id] || []).push(s));
      st.freelas = (rs.data || []).filter(s => !['REJEITADA', 'CANCELADA'].includes(s.status));
      st.freelaAus = {}; st.freelas.filter(s => s.funcionario_ausente_id)
        .forEach(s => (st.freelaAus[s.funcionario_ausente_id + '|' + s.data_servico] = st.freelaAus[s.funcionario_ausente_id + '|' + s.data_servico] || []).push(s));
      st.ini = a; st.fim = b;
    }

    const func = id => st.porId[id] || null;
    const horario = (loja, iso) => (st.horarios[loja] || {})[dow(iso)] || null;
    const temEscala = loja => !!st.horarios[loja] || st.funcs.some(f => f.loja_id === loja && st.padroes[f.id]);

    function padraoDoDia(f, iso) {
      const p = st.padroes[f.id];
      if (!p) return { tipo: 'SEM' };
      const d = dow(iso), h = horario(f.loja_id, iso);
      if (h && h.aberta === false) return { tipo: 'FECHADA' };
      const trab = () => d === 0 ? { tipo: 'TRABALHO', entrada: hm(p.dom_entrada || p.entrada), saida: hm(p.dom_saida || p.saida), loja: f.loja_id }
        : d === 6 ? { tipo: 'TRABALHO', entrada: hm(p.sab_entrada || p.entrada), saida: hm(p.sab_saida || p.saida), loja: f.loja_id }
        : { tipo: 'TRABALHO', entrada: hm(p.entrada), saida: hm(p.saida), loja: f.loja_id };
      if (p.regime === 'CICLO' && p.ciclo_ref && p.ciclo_trabalho && p.ciclo_folga) {
        const n = p.ciclo_trabalho + p.ciclo_folga;
        const folgaCiclo = x => { const k = ((difDias(x, p.ciclo_ref) % n) + n) % n; return k < p.ciclo_folga; };
        if (folgaCiclo(iso)) return { tipo: 'FOLGA' };
        // 5x1: quando a folga cai na QUINTA, o DOMINGO seguinte também é folga
        if (d === 0 && p.ciclo_trabalho === 5 && p.ciclo_folga === 1 && folgaCiclo(addDias(iso, -3))) return { tipo: 'FOLGA' };
        return trab();
      }
      // folga fixa que muda por semana (ex.: semana 1 sábado, semana 2 domingo)
      if (p.regime === 'ROTATIVO' && Array.isArray(p.semanas) && p.semanas.length && p.semanas_ref) {
        const n = p.semanas.length, w = Math.floor(difDias(addDias(iso, -d), p.semanas_ref) / 7);
        return (p.semanas[((w % n) + n) % n] || []).map(Number).includes(d) ? { tipo: 'FOLGA' } : trab();
      }
      if (d === 0) {
        if (p.domingo === 'FOLGA') return { tipo: 'FOLGA' };
        const ciclo = p.domingo === 'ALTERNADO' ? 2 : p.domingo === 'DOIS_UM' ? 3 : 0;
        if (ciclo && p.domingo_ref && ((Math.round(difDias(iso, p.domingo_ref) / 7) % ciclo) + ciclo) % ciclo === 0) return { tipo: 'FOLGA' };
        return trab();
      }
      if ((p.folgas || []).map(Number).includes(d)) return { tipo: 'FOLGA' };
      return trab();
    }

    // situação de uma pessoa no dia
    // opts.previsto  = ignora falta/atestado/afastamento (mostra o turno que a pessoa faria)
    // opts.ausentes  = [{ funcionario_id, ini, fim }] simula férias (tela de férias)
    function dia(fOuId, iso, opts) {
      opts = opts || {};
      const f = typeof fOuId === 'string' ? func(fOuId) : fOuId;
      if (!f) return { tipo: 'SEM' };
      if ((f.data_contratacao && iso < f.data_contratacao) || (f.data_rescisao && iso > f.data_rescisao)) return { tipo: 'FORA' };
      if ((opts.ausentes || []).some(a => a.funcionario_id === f.id && a.ini <= iso && a.fim >= iso)) return { tipo: 'FERIAS', origem: 'SIMULADA' };
      const fe = (st.ferias[f.id] || []).find(s => s.data_inicio <= iso && s.data_fim >= iso && s.id !== opts.ignorarFerias);
      if (fe) return { tipo: fe.status === 'SOLICITADA' ? 'FERIAS_PEDIDA' : 'FERIAS', origem: 'FERIAS', ini: fe.data_inicio, fim: fe.data_fim };
      const ex = st.exc[f.id + '|' + iso];
      if (ex && !(opts.previsto && ['FALTA', 'ATESTADO', 'AFASTADO'].includes(ex.tipo))) {
        if (ex.tipo !== 'TRABALHO') return { tipo: ex.tipo, origem: 'DIA', obs: ex.observacao, exc: ex };
        return { tipo: 'TRABALHO', entrada: hm(ex.entrada), saida: hm(ex.saida), loja: ex.loja_id || f.loja_id, origem: 'DIA', obs: ex.observacao };
      }
      if (!opts.previsto) {
        const fl = (st.freelaAus[f.id + '|' + iso] || []).find(s => AUSENCIAS_FREELA[s.motivo]);
        if (fl) return { tipo: AUSENCIAS_FREELA[fl.motivo], origem: 'FREELA', solic: fl };
      }
      const r = padraoDoDia(f, iso), p = st.padroes[f.id], d = dow(iso);
      // regra por funcionário: trabalhou no SÁBADO => domingo e segunda seguintes são folga
      if (p && p.sab_folga_dom_seg && (d === 0 || d === 1) && r.tipo === 'TRABALHO' && !opts._semRegraSab
          && ['TRABALHO', 'FALTA', 'ATESTADO'].includes(dia(f, addDias(iso, d === 0 ? -1 : -2), Object.assign({}, opts, { _semRegraSab: true })).tipo))
        return { tipo: 'FOLGA' };
      return r;
    }

    // pessoas da loja no dia (+ emprestadas) e extras (freelance / HE)
    // opts.ignorarSolic = id de uma solicitação que não entra na conta
    // opts.extras = [{ id, funcionario_id, entrada, saida }] simula um pedido que ainda não foi enviado
    function pessoas(loja, iso, opts) {
      opts = opts || {};
      const lista = [];
      st.funcs.forEach(f => {
        const r = dia(f, iso, opts);
        if (f.loja_id === loja) {
          if (r.tipo === 'TRABALHO' && r.loja !== loja) lista.push({ f, r: { ...r, tipo: 'EMPRESTADO' } });
          else if (r.tipo !== 'FORA') lista.push({ f, r });
        } else if (r.tipo === 'TRABALHO' && r.loja === loja) lista.push({ f, r: { ...r, veioDe: f.loja_id } });
      });
      const extras = st.freelas.filter(s => s.loja_id === loja && s.data_servico === iso && s.id !== opts.ignorarSolic)
        .map(s => ({ f: func(s.funcionario_id) || { id: s.funcionario_id, nome_registro: '?' }, extra: s, r: { tipo: 'TRABALHO', entrada: hm(s.hora_inicio), saida: hm(s.hora_fim), extra: true } }));
      (opts.extras || []).forEach((x, i) => extras.push({ f: func(x.funcionario_id) || { id: 'novo' + i, nome_registro: 'este pedido' }, extra: { id: 'novo' + i }, simulado: true,
        r: { tipo: 'TRABALHO', entrada: x.entrada, saida: x.saida, extra: true } }));
      return { lista, extras };
    }

    // cobertura em meia hora dentro do funcionamento da loja
    function cobertura(loja, iso, opts) {
      const h = horario(loja, iso);
      const { lista, extras } = pessoas(loja, iso, opts);
      const trab = [...lista, ...extras].filter(p => p.r.tipo === 'TRABALHO' && p.r.entrada && p.r.saida);
      const base = { n: new Set(trab.map(p => p.f.id)).size, lista, extras, trab, h, minimo: h ? h.minimo : null, slots: [], falta: false, semEscala: !temEscala(loja) };
      if (!h || h.aberta === false || !h.abre || !h.fecha) return { ...base, fechada: !!(h && h.aberta === false) };
      const [a, b] = faixa(h.abre, h.fecha);
      for (let m = a; m < b; m += 30) {
        const ids = new Set();
        trab.forEach(p => { const fx = faixa(p.r.entrada, p.r.saida); if (fx && m >= fx[0] && m < fx[1]) ids.add(p.f.id || p.extra.id); });
        base.slots.push({ m, qtd: ids.size });
      }
      base.falta = base.slots.some(s => s.qtd < h.minimo);
      return base;
    }

    function buracos(cob) {
      const r = []; let atual = null;
      (cob.slots || []).forEach(s => {
        if (s.qtd < cob.minimo) { if (!atual) atual = { ini: s.m, fim: s.m + 30, falta: cob.minimo - s.qtd }; else { atual.fim = s.m + 30; atual.falta = Math.max(atual.falta, cob.minimo - s.qtd); } }
        else if (atual) { r.push(atual); atual = null; }
      });
      if (atual) r.push(atual);
      return r;
    }
    const txtBuracos = bs => bs.map(b => `${minHm(b.ini)}–${minHm(b.fim)} (falta${b.falta > 1 ? 'm' : ''} ${b.falta})`).join(', ');

    // menor número de pessoas dentro de um horário (ex.: horário do freelance)
    function menorNoHorario(cob, ini, fim) {
      const fx = faixa(ini, fim); if (!fx || !cob.slots.length) return null;
      const dentro = cob.slots.filter(s => (s.m >= fx[0] && s.m < fx[1]) || (s.m + 1440 >= fx[0] && s.m + 1440 < fx[1]));
      if (!dentro.length) return { foraDoHorario: true };
      const menor = Math.min(...dentro.map(s => s.qtd));
      return { menor, abaixo: menor < cob.minimo, slots: dentro.length };
    }

    // horas de uma jornada (desconta o intervalo do padrão quando passa de 6h)
    function horasTurno(r, fid) {
      const fx = faixa(r.entrada, r.saida); if (!fx) return 0;
      let min = fx[1] - fx[0];
      const p = st.padroes[fid];
      if (min > 360) min -= (p && p.intervalo_min != null ? p.intervalo_min : 60);
      return Math.round(min / 30) / 2;
    }

    // ---------- blocos de texto prontos (HTML) ----------
    function nomeCurto(n) { const p = String(n || '').trim().split(/\s+/); return p.length > 1 ? p[0] + ' ' + p[p.length - 1][0] + '.' : p[0]; }
    function htmlDia(loja, iso, opts) {
      const cob = cobertura(loja, iso, opts);
      const titulo = `${DIAS[dow(iso)]} ${dbr(iso)}`;
      if (cob.semEscala) return `<div class="text-slate-500">📅 ${titulo}: a escala desta loja ainda não foi cadastrada.</div>`;
      if (cob.fechada) return `<div class="text-slate-600">📅 ${titulo}: loja fechada neste dia.</div>`;
      const trab = cob.lista.filter(p => p.r.tipo === 'TRABALHO').sort((a, b) => (a.r.entrada || '').localeCompare(b.r.entrada || ''));
      const fora = cob.lista.filter(p => !['TRABALHO', 'EMPRESTADO', 'SEM', 'FECHADA'].includes(p.r.tipo));
      const bs = buracos(cob);
      const chip = (p, cls) => `<span class="inline-block ${cls} px-1.5 py-0.5 rounded mr-1 mb-1">${esc(nomeCurto(p.f.nome_registro))}${p.r.entrada ? ' ' + p.r.entrada + '–' + p.r.saida : ''}${p.r.veioDe ? ' (emprest.)' : ''}</span>`;
      return `<div class="font-bold">📅 ${titulo} · ${cob.n} pessoa(s) escalada(s)${cob.minimo ? ` · mínimo ${cob.minimo}` : ''}${cob.h && cob.h.abre ? ` · loja ${hm(cob.h.abre)}–${hm(cob.h.fecha)}` : ''}</div>`
        + (cob.minimo ? (bs.length ? `<div class="text-rose-700 font-bold">⚠ Abaixo do mínimo: ${txtBuracos(bs)}</div>` : '<div class="text-emerald-700 font-bold">✓ Cobertura mínima atendida o dia todo</div>') : '')
        + `<div class="mt-1">${trab.map(p => chip(p, 'bg-emerald-100 text-emerald-800')).join('')}${cob.extras.map(p => chip(p, p.simulado ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-800')).join('')}</div>`
        + (fora.length ? `<div class="text-[10px] text-slate-500">Fora: ${fora.map(p => `${esc(nomeCurto(p.f.nome_registro))} (${NOMES[p.r.tipo] || p.r.tipo})`).join(', ')}</div>` : '');
    }

    // resumo para as telas de aprovação: o dia estava mesmo abaixo do mínimo sem este pedido?
    function htmlPedido(r, nomeFn) {
      const iso = r.data_servico, loja = r.loja_id;
      if (!iso || !loja || !st.base) return '';
      const nm = id => esc(nomeFn ? nomeFn(id) : (func(id) || {}).nome_registro || '?');
      const ini = hm(r.hora_inicio), fim = hm(r.hora_fim), he = r.tipo_solicitacao === 'HORA_EXTRA';
      const ok = t => `<div class="text-emerald-700 font-bold">${t}</div>`, av = t => `<div class="text-amber-800 font-bold">${t}</div>`,
            ruim = t => `<div class="text-rose-700 font-bold">${t}</div>`, info = t => `<div class="text-slate-600">${t}</div>`;
      const itens = [];
      const cob = cobertura(loja, iso, { ignorarSolic: r.id });
      if (cob.semEscala) itens.push(info('📅 Escala desta loja não cadastrada: sem conferência de cobertura.'));
      else if (cob.fechada) itens.push(av('📅 Pela escala a loja está FECHADA neste dia.'));
      else if (cob.minimo) {
        const m = menorNoHorario(cob, ini, fim);
        if (!m || m.foraDoHorario) itens.push(info(`📅 O horário ${ini}–${fim} fica fora do funcionamento da loja.`));
        else if (m.abaixo) itens.push(ok(`📅 Sem este pedido a loja ficaria com ${m.menor} pessoa(s) no horário (mínimo ${cob.minimo}): pedido necessário.`));
        else if (['ALTA_DEMANDA', 'COMPENSAR'].includes(r.motivo)) itens.push(info(`📅 Sem este pedido a loja já teria ${m.menor} pessoa(s) no horário (mínimo ${cob.minimo}).`));
        else itens.push(av(`⚠ Sem este pedido a loja já teria ${m.menor} pessoa(s) das ${ini} às ${fim} (mínimo ${cob.minimo}). Confira a necessidade.`));
        const outros = cob.extras.length;
        if (outros) itens.push(info(`+ ${outros} outro(s) freelance/HE pedido(s) para esta loja neste dia.`));
      }
      if (r.funcionario_ausente_id) {
        const p = dia(r.funcionario_ausente_id, iso, { previsto: true });
        if (p.tipo === 'TRABALHO') itens.push(info(`🙋 ${nm(r.funcionario_ausente_id)} faria ${p.entrada}–${p.saida}${(p.entrada !== ini || p.saida !== fim) && !he ? ` · pedido: ${ini}–${fim}` : ''}.`));
        else if (p.tipo !== 'SEM') itens.push(av(`⚠ Pela escala, ${nm(r.funcionario_ausente_id)} não trabalharia neste dia (${NOMES[p.tipo] || p.tipo}).`));
      }
      if (he) {
        const d = dia(r.funcionario_id, iso);
        if (['FERIAS', 'FERIAS_PEDIDA', 'FALTA', 'ATESTADO', 'AFASTADO'].includes(d.tipo)) itens.push(ruim(`⛔ ${nm(r.funcionario_id)} está de ${NOMES[d.tipo]} neste dia pela escala.`));
        else if (d.tipo === 'FOLGA') itens.push(av(`⚠ ${nm(r.funcionario_id)} está de FOLGA neste dia (trabalho na folga).`));
        else if (d.tipo === 'TRABALHO') {
          const sob = sobrepoe(faixa(d.entrada, d.saida), faixa(ini, fim));
          itens.push(sob ? ruim(`⛔ HE ${ini}–${fim} coincide com o turno normal (${d.entrada}–${d.saida}).`) : info(`⏰ Turno normal ${d.entrada}–${d.saida} · HE ${ini}–${fim} fora do turno ✓`));
        } else if (d.tipo === 'SEM') itens.push(info('⏰ Funcionário sem escala cadastrada.'));
      }
      return itens.length ? `<div class="text-[11px] bg-slate-50 border border-slate-200 rounded p-2 mt-1 space-y-0.5 leading-snug">${itens.join('')}</div>` : '';
    }

    return { htmlPedido, garantir, carregarBase, dia, pessoas, cobertura, buracos, txtBuracos, menorNoHorario, horasTurno, horario, temEscala, func, htmlDia,
      estado: st, util: { hm, toMin, minHm, addDias, difDias, dow, dbr, esc, faixa, sobrepoe, NOMES, DIAS, nomeCurto } };
  }

  g.EscalaCore = { criar };
})(window);
