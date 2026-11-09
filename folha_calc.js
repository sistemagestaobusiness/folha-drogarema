// folha_calc.js · regra única da folha (06/11/2026)
// O Resumo da competência é a origem: o Painel (index), o Resumo da diretoria e o envio ao Financeiro usam esta mesma conta.
// Mudou alguma regra do líquido? Muda AQUI e sobe a versão (?v=) em todas as telas que carregam este arquivo.
(function () {
  const VIGENCIA = 2026 * 12 + 10;   // regra do inativo vale a partir de 10/2026 (meses anteriores ficam como foram pagos)
  const ordComp = c => { const m = String(c || '').match(/^(\d{2})\/(\d{4})$/); return m ? (+m[2]) * 12 + (+m[1]) : 0; };
  // corte contábil: fato do dia 26 em diante é da competência seguinte
  const compDoFato = iso => {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return '';
    let a = +m[1], mes = +m[2]; if (+m[3] >= 26) { mes++; if (mes > 12) { mes = 1; a++; } }
    return String(mes).padStart(2, '0') + '/' + a;
  };
  const ehSocio = f => [f && f.cargo, f && f.organograma_funcao].some(v => /^S[OÓ]CIO/i.test(String(v || '').trim()));
  // Saiu da empresa: cadastro INATIVO (com data de rescisão até esta competência, ou sem data) não entra mais na folha.
  // A rescisão é tratada na tela de rescisão. Mesma regra do banco: fn_func_fora_da_folha.
  const foraDaFolha = (f, comp) => {
    if (!f || String(f.status || 'ATIVO').toUpperCase() !== 'INATIVO') return false;   // mesma regra do banco: só INATIVO
    if (ordComp(comp) < VIGENCIA) return false;
    const cr = compDoFato(f.data_rescisao);
    return !cr || ordComp(cr) <= ordComp(comp);
  };
  const naFolha = (f, comp) => !!f && !ehSocio(f) && !foraDaFolha(f, comp);

  // eventos pagos fora do holerite (13º, férias, rescisão, VT...): não entram no líquido; ADIANTAMENTO entra
  function regrasEventos(eventos) {
    const natureza = {}, foraDesde = {};
    (eventos || []).forEach(e => {
      natureza[String(e.codigo_evento)] = e.natureza_do_evento || 'CONTABIL';
      natureza[String(e.descricao_do_evento || '').toUpperCase()] = e.natureza_do_evento || 'CONTABIL';
      if (e.pagamento_extra_tipo && e.pagamento_extra_tipo !== 'ADIANTAMENTO') foraDesde[String(e.codigo_evento)] = e.pagamento_extra_desde || '';
    });
    const foraDoHolerite = it => { const c = (String(it.rubrica || '').match(/^\s*(\d+)/) || [])[1];
      return (c in foraDesde) && (!foraDesde[c] || ordComp(it.competencia) >= ordComp(foraDesde[c])); };
    const naturezaDe = rubrica => {
      const r = String(rubrica || '').toUpperCase(); let n = 'CONTABIL';
      for (const k in natureza) { if (r.includes(k)) { n = natureza[k]; break; } }
      return (n === 'NAO_CONTABIL' || r.includes('FORA')) ? 'NAO_CONTABIL' : 'CONTABIL';
    };
    return { foraDoHolerite, naturezaDe };
  }

  // Líquido por funcionário de UMA competência (exatamente a conta do Resumo da competência).
  // dinheiro: { funcionario_id: valor } da tabela pagamentos_dinheiro desta competência.
  function calcular({ funcionarios, itens, eventos, comp, dinheiro }) {
    const R = regrasEventos(eventos), porId = new Map((funcionarios || []).map(f => [String(f.id), f]));
    const map = new Map();
    (itens || []).forEach(it => {
      if (it.competencia && comp && it.competencia !== comp) return;
      const f = porId.get(String(it.funcionario_id)); if (!naFolha(f, comp)) return;
      if (R.foraDoHolerite(it)) return;
      const tipo = String(it.tipo || 'PROVENTO').toUpperCase(), nat = R.naturezaDe(it.rubrica);
      if (tipo !== 'PROVENTO' && tipo !== 'DESCONTO') return;
      const cat = (tipo === 'DESCONTO' ? 'd' : 'c'), chave = (nat === 'NAO_CONTABIL' ? 'n' : '') + 'c' + cat;   // cc, cd, ncc, ncd
      const r = map.get(f.id) || { id: f.id, nome: f.nome_registro, tot_cc: 0, tot_cd: 0, tot_ncc: 0, tot_ncd: 0 };
      r['tot_' + chave] += parseFloat(it.valor || 0); map.set(f.id, r);
    });
    const r2 = v => Math.round(v * 100) / 100;
    const lista = [...map.values()].map(r => {
      const liquido = r2((r.tot_cc - r.tot_cd) + (r.tot_ncc - r.tot_ncd)), din = r2((dinheiro || {})[r.id] || 0);
      return { ...r, liquido, dinheiro: din, banco: r2(liquido - din) };
    });
    const tot = lista.reduce((t, r) => ({ proventos: t.proventos + r.tot_cc + r.tot_ncc, descontos: t.descontos + r.tot_cd + r.tot_ncd,
      contabil: t.contabil + r.tot_cc, naoContabil: t.naoContabil + r.tot_ncc, liquido: t.liquido + r.liquido, dinheiro: t.dinheiro + r.dinheiro }),
      { proventos: 0, descontos: 0, contabil: 0, naoContabil: 0, liquido: 0, dinheiro: 0 });
    Object.keys(tot).forEach(k => tot[k] = r2(tot[k])); tot.banco = r2(tot.liquido - tot.dinheiro);
    return { lista, porId: new Map(lista.map(r => [String(r.id), r])), total: tot };
  }

  // Telas abertas se atualizam sozinhas (06/11/2026; 10 s desde 08/11): a cada 10 s pergunta ao banco se algum lançamento, dinheiro ou pagamento mudou
  // (fn_folha_versao: lê um número, menos de 1 ms no banco) e, só se mudou, chama recarregar(). Aba escondida (outra aba do sistema
  // na frente ou janela minimizada) não pergunta nada; ao voltar a aparecer, confere na hora. Não recarrega com alguém digitando
  // ou com janela (modal) aberta: espera terminar.
  function vigiar(cli, recarregar, opc) {
    opc = opc || {}; let ultima = null, pendente = false, rodando = false;
    const ocupado = () => {
      const a = document.activeElement;
      if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !a.readOnly && a.type !== 'checkbox') return true;
      if (opc.pausar && opc.pausar()) return true;
      return [...document.querySelectorAll('[id^="modal"]')].some(m => !m.classList.contains('hidden') && m.offsetParent !== null);
    };
    const selo = () => {
      let el = document.getElementById('seloAtualizado');
      if (!el) { el = document.createElement('div'); el.id = 'seloAtualizado';
        el.style.cssText = 'position:fixed;bottom:10px;right:12px;z-index:80;background:#0f766e;color:#fff;font:600 11px system-ui,sans-serif;padding:5px 10px;border-radius:8px;box-shadow:0 2px 8px #0003;opacity:.92';
        document.body.appendChild(el); }
      el.textContent = '↻ atualizado automaticamente às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };
    const escondida = () => { if (document.hidden) return true;
      try { const fe = window.frameElement; return !!fe && (fe.offsetParent === null || fe.offsetWidth === 0); } catch (e) { return false; } };
    let estavaEscondida = false;
    async function checar() {
      if (escondida()) { estavaEscondida = true; return; }
      if (rodando) return; rodando = true; estavaEscondida = false;
      try {
        const { data, error } = await cli.rpc('fn_folha_versao');
        if (!error && data != null) {
          if (ultima === null) ultima = data;
          else if (data !== ultima) { ultima = data; pendente = true; }
        }
        if (pendente && !ocupado()) { pendente = false; await recarregar(); selo(); }
      } catch (e) { } finally { rodando = false; if (pendente && !escondida() && !ocupado()) setTimeout(checar, 200); }
    }
    checar();
    // (08/11/2026) AO VIVO: o banco grava um sinal a cada alteração (folha_sinal, Realtime do Supabase) e a tela recarrega
    // na hora. A verificação a cada 10 s continua como reserva (internet caiu, Realtime fora do ar).
    try {
      cli.channel('folha_sinal_' + Math.random().toString(36).slice(2))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'folha_sinal' }, () => { pendente = true; setTimeout(checar, 150); })
        .subscribe();
    } catch (e) { }
    setInterval(checar, opc.ms || 10000);
    // aba do sistema voltou a aparecer: confere logo (sem esperar os 20 s)
    setInterval(() => { if (estavaEscondida && !escondida()) checar(); }, 1500);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checar(); });
    window.addEventListener('focus', () => checar());
    // terminou de digitar (saiu do campo) ou fechou a janela (modal): se havia mudança esperando, atualiza na hora
    document.addEventListener('focusout', () => { if (pendente) setTimeout(checar, 150); });
    document.addEventListener('click', () => { if (pendente) setTimeout(checar, 300); }, true);
  }

  window.FolhaCalc = { ordComp, compDoFato, ehSocio, foraDaFolha, naFolha, regrasEventos, calcular, vigiar, VERSAO: 3 };
})();
