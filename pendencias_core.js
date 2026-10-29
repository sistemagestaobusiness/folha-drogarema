// =====================================================================
// PENDÊNCIAS DO SISTEMA (regra de 21/10/2026)
// Uma lista única do que está esperando alguém, com prazo e responsável.
// Usada pela tela pendencias.html (início do RH e do Supervisor, Central do Gestor)
// e pelo menu lateral (bolha com o número; pisca em vermelho quando está fora do prazo).
//
// Prazos (mudar aqui vale para o sistema todo):
//  - Supervisor: decide o freelance/HE em até 24 h do pedido (ou da contestação do líder).
//  - RH: decide em até 24 h depois que o supervisor aprovou.
//  - Pedido para daqui a mais de 7 dias: o prazo só começa a contar quando entra na janela de 7 dias.
//  - Data do serviço já passou e ninguém decidiu: fora do prazo.
//  - Cadastro de pessoa nova: 24 h. Atestado para conferir: 48 h.
//  - Férias: fora do prazo a 15 dias do início sem estar calculada; atenção a 30 dias.
// =====================================================================
(function (global) {
  const PRAZO_SUP_H = 24, PRAZO_RH_H = 24, JANELA_DIAS = 7, PRAZO_CADASTRO_H = 24, PRAZO_ATESTADO_H = 48;
  const FERIAS_CRIT = 15, FERIAS_ATEN = 30;
  const FERIAS_CONTROLE_DESDE = '2027-01-01';   // etapas de férias (RH e ciência do supervisor) só a partir de 2027
  const H = 3600000;

  const hojeIso = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const diasAte = iso => Math.round((new Date(String(iso).slice(0, 10) + 'T12:00:00') - new Date(hojeIso() + 'T12:00:00')) / 86400000);
  const dbr = iso => iso ? String(iso).slice(8, 10) + '/' + String(iso).slice(5, 7) : '';
  const curto = n => { const p = String(n || '').trim().split(/\s+/); return p.length > 1 ? p[0] + ' ' + p[p.length - 1] : (p[0] || '-'); };
  const titulo = n => String(n || '').toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());
  const tempo = ms => { const h = Math.max(0, Math.round(ms / H)); return h < 48 ? h + ' h' : Math.round(h / 24) + ' dias'; };
  const dataHora = v => v ? new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

  // prazo de decisão de um pedido que chegou em "desde" para um serviço em "data"
  function prazoDecisao(desde, data, horas) {
    const inicioJanela = new Date(String(data).slice(0, 10) + 'T00:00:00').getTime() - JANELA_DIAS * 86400000;
    const base = Math.max(new Date(desde).getTime(), inicioJanela);
    return Math.min(base + horas * H, new Date(String(data).slice(0, 10) + 'T00:00:00').getTime());
  }

  // 5º dia útil do mês seguinte a "ano/mes" (mes 1..12): sábado conta como dia útil (CLT); domingo e feriado nacional não
  const FERIADOS = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'];
  function quintoDiaUtil(ano, mes) {
    const d = new Date(ano, mes, 1); let n = 0;
    while (true) { const md = String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (d.getDay() !== 0 && !FERIADOS.includes(md)) { n++; if (n === 5) break; } d.setDate(d.getDate() + 1); }
    return d;
  }
  const isoDe = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  async function carregar(cli, perfil) {
    perfil = String(perfil || '').toUpperCase();
    const agora = Date.now();
    const itens = [];
    const add = it => itens.push(it);
    const ok = r => (r && !r.error && r.data) ? r.data : [];
    const veTudo = ['GESTOR', 'RH'].includes(perfil);

    const consultas = [
      cli.from('freelance_solicitacoes').select('id, funcionario_id, data_servico, status, tipo_solicitacao, loja_solicitante, created_at, contestado_em, supervisor_em')
        .in('status', ['PENDENTE', 'PENDENTE_SUPERVISOR', 'PENDENTE_RH']).order('data_servico'),
      cli.from('ferias_solicitacoes').select('id, funcionario_id, data_inicio, dias, status, supervisor_ciente_em')
        .in('status', ['SOLICITADA', 'PRE_APROVADA', 'CONTABILIDADE', 'CALCULADA']).order('data_inicio'),
      veTudo || perfil === 'SUPERVISOR' ? cli.from('cadastro_solicitacoes').select('id, nome, loja_id, solicitado_em, status, lojas(nome_loja)').eq('status', 'PENDENTE') : Promise.resolve({ data: [] }),
      cli.from('vw_atestados_conferencia').select('id, nome_registro, nome_loja, enviado_em, conferencia_status').is('conferencia_status', null),
      veTudo || perfil === 'SUPERVISOR' ? cli.from('abatimentos').select('id', { count: 'exact', head: true }).eq('status', 'PENDENTE_LIDER') : Promise.resolve({ count: 0 }),
      ['LIDER', 'RH'].includes(perfil) ? cli.rpc('fn_holerite_pendentes') : Promise.resolve({ data: [] }),
      cli.from('competencias').select('mes, ano, status').eq('status', 'ABERTO').order('ano', { ascending: false }).order('mes', { ascending: false }).limit(1)
    ];
    const [rf, rv, rc, ra, rab, rh, rcomp] = await Promise.all(consultas.map(p => Promise.resolve(p).catch(e => ({ error: e }))));
    const fl = ok(rf), fe = ok(rv), cad = ok(rc), ate = ok(ra), hol = ok(rh);
    const compAberta = ok(rcomp)[0] || null;
    const compStr = compAberta ? String(compAberta.mes).padStart(2, '0') + '/' + compAberta.ano : null;

    // nomes
    const ids = [...new Set([...fl, ...fe].map(x => x.funcionario_id).filter(Boolean))];
    const nomes = {};
    if (ids.length) {
      const tab = veTudo ? 'funcionarios' : 'vw_funcionarios_basico';
      const r = await cli.from(tab).select('id, nome_registro').in('id', ids);
      ok(r).forEach(x => nomes[x.id] = x.nome_registro);
    }
    const nomeF = id => titulo(curto(nomes[id]));

    // ---- freelance e hora extra
    fl.forEach(x => {
      const comSup = x.status === 'PENDENTE_SUPERVISOR';
      const desde = comSup ? (x.contestado_em && x.contestado_em > x.created_at ? x.contestado_em : x.created_at) : (x.supervisor_em || x.created_at);
      const prazo = prazoDecisao(desde, x.data_servico, comSup ? PRAZO_SUP_H : PRAZO_RH_H);
      const n = diasAte(x.data_servico);
      const fora = n < 0 || agora > prazo;
      const nivel = fora ? 'critico' : n <= JANELA_DIAS ? 'atencao' : 'info';
      const tipo = x.tipo_solicitacao === 'HORA_EXTRA' ? 'Hora extra' : 'Freelance';
      const quando = n < 0 ? `serviço ${dbr(x.data_servico)} · já passou há ${-n} dia(s)` : n === 0 ? `serviço hoje, ${dbr(x.data_servico)}` : n === 1 ? `serviço amanhã, ${dbr(x.data_servico)}` : `serviço ${dbr(x.data_servico)} · em ${n} dias`;
      add({ assunto: 'freelance', com: comSup ? 'SUPERVISOR' : 'RH', tela: comSup ? 'supervisor_freelance.html' : 'rh_aprovacao_freelance.html',
        titulo: `${tipo} · ${nomeF(x.funcionario_id)}`, sub: x.loja_solicitante || '', detalhe: `${quando} · ${comSup ? 'pedido em ' + dataHora(desde) : 'supervisor aprovou em ' + dataHora(desde)}${fora && n >= 0 ? ' · fora do prazo há ' + tempo(agora - prazo) : ''}`,
        nivel, data: x.data_servico, desde, prazo, foraHa: fora ? agora - Math.min(prazo, agora) : 0 });
    });

    // ---- faltas da escala com desconto aguardando o RH (SQL DI, regra de 26/10/2026)
    if (veTudo) {
      const rdf = await Promise.resolve(cli.from('escala_faltas_desconto').select('id, data, criado_em').eq('status', 'PENDENTE').order('data')).catch(e => ({ error: e }));
      const dfs = ok(rdf);
      if (dfs.length) {
        const desde = dfs.reduce((a, x) => x.criado_em < a ? x.criado_em : a, dfs[0].criado_em);
        const prazo = new Date(desde).getTime() + PRAZO_RH_H * 3600e3;
        const fora = agora > prazo;
        add({ assunto: 'falta', com: 'RH', tela: 'lancamentos.html', titulo: `Faltas da escala · ${dfs.length} desconto(s) para confirmar`,
          sub: 'aprovar, ajustar com justificativa ou recusar', detalhe: `mais antiga marcada em ${dataHora(desde)}${fora ? ' · fora do prazo há ' + tempo(agora - prazo) : ''}`,
          nivel: fora ? 'critico' : 'atencao', data: dfs[0].data, desde, prazo, foraHa: fora ? agora - prazo : 0 });
      }
    }

    // ---- férias (etapas do RH) e ciência do supervisor
    const ETAPA = { SOLICITADA: 'pré-aprovar', PRE_APROVADA: 'enviar à contabilidade', CONTABILIDADE: 'registrar o cálculo da contabilidade', CALCULADA: 'lançar na folha' };
    // férias de 2026: o RH controlou fora do sistema; valem só para a escala, sem pendência (regra de 22/10/2026)
    fe.filter(x => String(x.data_inicio || '') >= FERIAS_CONTROLE_DESDE).forEach(x => {
      const n = diasAte(x.data_inicio);
      const nivel = n <= FERIAS_CRIT ? 'critico' : n <= FERIAS_ATEN ? 'atencao' : 'info';
      const quando = n < 0 ? `começou ${dbr(x.data_inicio)} (há ${-n} dias)` : n === 0 ? 'começa hoje' : `começa ${dbr(x.data_inicio)} (em ${n} dias)`;
      add({ assunto: 'ferias', com: 'RH', tela: 'ferias.html', titulo: `Férias · ${nomeF(x.funcionario_id)}`, sub: `${x.dias} dias`,
        detalhe: `${quando} · falta ${ETAPA[x.status] || x.status.toLowerCase()}`, nivel, data: x.data_inicio, desde: null, foraHa: nivel === 'critico' ? 1 : 0 });
      if (x.status === 'SOLICITADA' && !x.supervisor_ciente_em && perfil === 'SUPERVISOR')
        add({ assunto: 'ferias', com: 'SUPERVISOR', tela: 'ferias.html', titulo: `Férias · ${nomeF(x.funcionario_id)}`, sub: `${x.dias} dias`,
          detalhe: `${quando} · dar ciência e conferir a escala`, nivel: n <= FERIAS_CRIT ? 'atencao' : 'info', data: x.data_inicio, foraHa: 0 });
    });

    // ---- cadastro de pessoa nova (RH)
    cad.forEach(x => {
      const prazo = new Date(x.solicitado_em).getTime() + PRAZO_CADASTRO_H * H, fora = agora > prazo;
      add({ assunto: 'cadastro', com: 'RH', tela: 'cadastro_solicitacoes.html', titulo: `Cadastro · ${titulo(curto(x.nome))}`, sub: (x.lojas && x.lojas.nome_loja) || '',
        detalhe: `pedido em ${dataHora(x.solicitado_em)}${fora ? ' · fora do prazo há ' + tempo(agora - prazo) : ' · aprovar e criar a ficha'}`,
        nivel: fora ? 'critico' : 'atencao', data: String(x.solicitado_em).slice(0, 10), desde: x.solicitado_em, foraHa: fora ? agora - prazo : 0 });
    });

    // ---- atestados para o supervisor conferir
    ate.forEach(x => {
      const prazo = new Date(x.enviado_em).getTime() + PRAZO_ATESTADO_H * H, fora = agora > prazo;
      add({ assunto: 'atestados', com: 'SUPERVISOR', tela: 'atestados_conferencia.html', titulo: `Atestado · ${titulo(curto(x.nome_registro))}`, sub: x.nome_loja || '',
        detalhe: `anexado em ${dataHora(x.enviado_em)}${fora ? ' · fora do prazo há ' + tempo(agora - prazo) : ' · conferir o documento'}`,
        nivel: fora ? 'critico' : 'atencao', data: String(x.enviado_em).slice(0, 10), desde: x.enviado_em, foraHa: fora ? agora - prazo : 0 });
    });

    // ---- holerites: o lado de quem está logado
    hol.forEach(r => { if (!r.qtd) return;
      add({ assunto: 'holerites', com: perfil, tela: 'holerite_entrega.html', link: `holerite_entrega.html?comp=${encodeURIComponent(r.competencia)}&pend=1`,
        titulo: `Entrega de holerites ${r.competencia}`, sub: '', detalhe: `${r.qtd} funcionário(s) sem a sua confirmação`, nivel: 'atencao', foraHa: 0 }); });

    // ---- retirada de falta/atestado da escala pedida pelo líder: decide o supervisor (regra de 29/10/2026)
    if (perfil === 'SUPERVISOR') {
      try {
        const r = await cli.rpc('fn_escala_retiradas_lista');
        ok(r).filter(x => x.status === 'PENDENTE' && x.pode_decidir).forEach(x => {
          const prazo = new Date(x.solicitado_em).getTime() + PRAZO_SUP_H * H, fora = agora > prazo;
          add({ assunto: 'falta', com: 'SUPERVISOR', tela: 'escala.html', titulo: `Retirada de ${String(x.tipo_antes).toLowerCase()} · ${titulo(curto(x.funcionario))}`, sub: x.loja || '',
            detalhe: `dia ${dbr(x.data)} · pedido em ${dataHora(x.solicitado_em)}${fora ? ' · fora do prazo há ' + tempo(agora - prazo) : ' · aprovar ou recusar na Escala'}`,
            nivel: fora ? 'critico' : 'atencao', data: String(x.solicitado_em).slice(0, 10), desde: x.solicitado_em, foraHa: fora ? agora - prazo : 0 });
        });
      } catch (e) { }
    }

    // ---- abatimentos com os líderes (só informativo)
    if (rab && rab.count) add({ assunto: 'outros', com: 'LIDER', tela: 'abatimentos.html', titulo: 'Abatimentos', sub: '', detalhe: `${rab.count} aguardando o líder da loja`, nivel: 'info', foraHa: 0 });

    // ---- conferência do fechamento (RH e Gestor): vermelhos da competência aberta
    if (veTudo && compStr) {
      try {
        const r = await cli.rpc('fn_conferencia', { p_comp: compStr });
        const verm = ok(r).filter(l => l.gravidade === 'VERMELHO').length;
        if (verm) add({ assunto: 'folha', com: 'RH', tela: 'conferencia_fechamento.html', titulo: `Conferência do fechamento ${compStr}`, sub: '',
          detalhe: `${verm} item(ns) vermelho(s) para resolver ou justificar`, nivel: 'atencao', foraHa: 0, contaMenu: verm });
      } catch (e) { }
    }

    // ---- aprovações do Gestor
    if (perfil === 'GESTOR') {
      const AP = [['fn_adiant_pendentes', 'adiantamento.html', 'Adiantamento salarial'], ['fn_vt_pendentes', 'vale_transporte.html', 'Vale transporte'],
        ['fn_decimo_antecip_pendentes', 'decimo_terceiro.html', '13º antecipado'], ['fn_plano_pendentes', 'planos.html', 'Planos'],
        ['fn_alteracao_pendentes', 'conferencia_fechamento.html', 'Alteração na própria ficha do RH']];
      const rs = await Promise.all(AP.map(a => Promise.resolve(cli.rpc(a[0])).catch(e => ({ error: e }))));
      rs.forEach((r, k) => { const x = ok(r)[0]; if (!x || !x.qtd) return;
        add({ assunto: 'gestor', com: 'GESTOR', tela: AP[k][1], link: AP[k][1] + '?aba=aprovacao', titulo: AP[k][2], sub: '',
          detalhe: `${x.qtd} aguardando a sua aprovação`, nivel: 'critico', foraHa: 0, contaMenu: x.qtd }); });
    }

    // ---- próximas datas da folha (RH e Gestor)
    if (veTudo) {
      const hoje = new Date(hojeIso() + 'T12:00:00'), a = hoje.getFullYear(), m = hoje.getMonth();
      const datas = [];
      // adiantamento (15), início do fechamento (25), VT e contabilidade (último dia útil) e comissões: agora no Cronograma da folha (cronograma.js, 28/10/2026)
      const q5 = quintoDiaUtil(a, m + 1); q5.setHours(12); const q5ant = quintoDiaUtil(a, m); q5ant.setHours(12);
      datas.push([q5ant >= hoje ? q5ant : q5, 'Fechamento · 5º dia útil', 'Conferência do fechamento sem vermelho', 'conferencia_fechamento.html']);
      const t1 = new Date(a, 10, 30, 12), t2 = new Date(a, 11, 20, 12);
      if (t1 >= hoje) datas.push([t1, '13º · 1ª parcela', 'pagar até 30/11', 'decimo_terceiro.html']);
      if (t2 >= hoje) datas.push([t2, '13º · 2ª parcela', 'pagar até 20/12', 'decimo_terceiro.html']);
      datas.sort((x, y) => x[0] - y[0]).slice(0, 5).forEach(([d, t, det, tela]) => {
        const iso = isoDe(d), n = diasAte(iso);
        add({ assunto: 'datas', com: 'RH', tela, titulo: `${dbr(iso)} · ${t}`, sub: '', detalhe: `${n === 0 ? 'hoje' : n === 1 ? 'amanhã' : 'em ' + n + ' dias'} · ${det}`,
          nivel: n <= 3 ? 'atencao' : 'info', data: iso, foraHa: 0, semMenu: true });
      });
    }

    return { itens, competencia: compStr, perfil };
  }

  // tempo médio de decisão dos últimos 30 dias (Central do Gestor)
  async function tempos(cli) {
    const desde = new Date(Date.now() - 30 * 86400000).toISOString();
    const r = await cli.from('freelance_solicitacoes').select('created_at, supervisor_em, rh_em, supervisor_forcado').gte('created_at', desde).not('supervisor_em', 'is', null);
    if (r.error || !r.data) return null;
    const med = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const sup = r.data.filter(x => !x.supervisor_forcado).map(x => new Date(x.supervisor_em) - new Date(x.created_at)).filter(v => v >= 0);
    const rh = r.data.filter(x => x.rh_em).map(x => new Date(x.rh_em) - new Date(x.supervisor_em)).filter(v => v >= 0);
    return { SUPERVISOR: { media: med(sup), n: sup.length }, RH: { media: med(rh), n: rh.length } };
  }

  // o que cada perfil precisa resolver (o resto é "com outras pessoas")
  const meus = (lista, perfil) => lista.filter(i => i.com === perfil || (perfil === 'GESTOR' && i.com === 'GESTOR'));

  global.Pendencias = { carregar, tempos, meus, tempo, diasAte, PRAZO_SUP_H, PRAZO_RH_H, JANELA_DIAS };
})(window);
