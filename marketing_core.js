// Marketing (regra de 28/10/2026): utilidades comuns das telas de Pedidos e Comunicados.
// Arquivos vão para o Storage "marketing" (privado). Baixar passa por fn_mkt_baixar, que confere o acesso e registra quem baixou;
// depois o sistema gera um link que vale 2 minutos.
(function () {
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dbr = d => d ? String(d).slice(0, 10).split('-').reverse().join('/') : '-';
  const dh = v => v ? new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
  const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const CHIP_STATUS = {
    ABERTA: ['Aguardando o Marketing', 'bg-amber-100 text-amber-900'], EM_PRODUCAO: ['Em produção', 'bg-sky-100 text-sky-900'],
    AGUARDANDO_LOJA: ['Marketing pediu informação', 'bg-violet-100 text-violet-900'], ENTREGUE: ['Entregue · loja confirmar', 'bg-emerald-100 text-emerald-900'],
    CONCLUIDA: ['Concluído', 'bg-slate-200 text-slate-700'], CANCELADA: ['Cancelado', 'bg-slate-100 text-slate-500'],
    AGUARDANDO_GESTOR: ['Aguardando o Gestor', 'bg-orange-100 text-orange-900'], APROVADA: ['Aprovado', 'bg-emerald-600 text-white'], RECUSADA: ['Recusado', 'bg-rose-100 text-rose-800']
  };
  const CHIP_PRIOR = { URGENTE: ['URGENTE', 'bg-rose-600 text-white'], ALTA: ['ALTA', 'bg-orange-500 text-white'], MEDIA: ['MÉDIA', 'bg-amber-200 text-amber-900'], NORMAL: ['NORMAL', 'bg-slate-200 text-slate-700'] };
  const TIPOS_MAT = [
    ['ARTE_REDE_SOCIAL', 'Artes para rede social'], ['FEED_STORIES', 'Feed ou stories'], ['STATUS_WHATSAPP', 'Status do WhatsApp'],
    ['IMPRESSAO', 'Cartaz ou material para impressão'], ['FAIXA_BANNER_FACHADA', 'Faixa, banner ou fachada'], ['OFERTAS_PROMOCOES', 'Divulgação de ofertas e promoções'],
    ['COMUNICADO_INTERNO', 'Comunicado interno'], ['VIDEO_ANIMACAO', 'Vídeo ou animação'], ['AJUSTE_ARTE', 'Ajustes em artes existentes'],
    ['CRACHAS', 'Crachás'], ['FOTOS', 'Fotos'], ['REGULATORIOS_POPUP', 'Documentos regulatórios e pop-up'], ['OUTROS', 'Outros']];
  const nomeTipo = k => (TIPOS_MAT.find(t => t[0] === k) || [k, k])[1];
  const nomePerfil = p => ({ MARKETING: 'Marketing', LIDER: 'Líder', SUPERVISOR: 'Supervisor', GESTOR: 'Gestor' }[p] || p || '');
  const TIPOS_ENVIO = { PROMOCAO: ['Promoção', 'bg-rose-100 text-rose-800'], MATERIAL: ['Material do Marketing', 'bg-fuchsia-100 text-fuchsia-800'], ORIENTACAO: ['Orientação', 'bg-sky-100 text-sky-800'],
    INFORMATIVO: ['Informativo', 'bg-slate-200 text-slate-700'], ENQUETE: ['Enquete', 'bg-amber-100 text-amber-900'] };

  // dias úteis de amanhã até o prazo (sábado, domingo e feriado nacional/estadual não contam) — mesma regra do banco
  function prioridadePorPrazo(prazo) {
    let dias = 0; const d = new Date(hoje() + 'T12:00:00'), fim = new Date(prazo + 'T12:00:00');
    for (let i = 0; i < 400; i++) { d.setDate(d.getDate() + 1); if (d > fim) break; if (!window.DiaUtil.motivo(d.toISOString().slice(0, 10))) dias++; }
    return { dias, prioridade: dias <= 1 ? 'URGENTE' : dias <= 3 ? 'ALTA' : dias <= 7 ? 'MEDIA' : 'NORMAL' };
  }

  const LIMITE = 50 * 1024 * 1024;
  async function subirArquivos(cli, files) {
    const out = [];
    for (const f of [...(files || [])]) {
      if (f.size > LIMITE) throw new Error(`"${f.name}" tem ${(f.size / 1048576).toFixed(1)} MB: o limite é 50 MB por arquivo.`);
      const nome = f.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_');
      const path = `${(crypto.randomUUID ? crypto.randomUUID() : Date.now() + '_' + Math.random().toString(36).slice(2))}/${nome}`;
      const { error } = await cli.storage.from('marketing').upload(path, f, { contentType: f.type || 'application/octet-stream', upsert: false });
      if (error) throw new Error(`Falha ao enviar "${f.name}": ${error.message}`);
      out.push({ path, nome: f.name, tamanho: f.size, mime: f.type || null });
    }
    return out;
  }
  async function baixar(id) {
    const cli = window.ACESSO_CLI || window._supabase;
    const { data: path, error } = await cli.rpc('fn_mkt_baixar', { p_anexo: id });
    if (error) return alert(error.message);
    const { data, error: e2 } = await cli.storage.from('marketing').createSignedUrl(path, 120, { download: true });
    if (e2) return alert('Não foi possível gerar o link: ' + e2.message);
    window.open(data.signedUrl, '_blank');
  }
  const tam = b => b == null ? '' : b > 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
  const icone = m => /^image\//.test(m || '') ? '🖼' : /pdf/.test(m || '') ? '📄' : /^video\//.test(m || '') ? '🎬' : '📎';
  function listaAnexos(lista) {
    if (!lista || !lista.length) return '';
    return `<div class="flex flex-wrap gap-1.5 mt-1">${lista.map(a => `<button type="button" onclick="event.stopPropagation(); MKT.baixar('${a.id}')" class="inline-flex items-center gap-1 bg-white border border-slate-300 hover:border-slate-500 rounded-lg px-2 py-1 text-[11px] cursor-pointer" title="Baixar (fica registrado)">${icone(a.mime)} ${esc(a.nome)} <span class="text-slate-400">${tam(a.tamanho)}${a.baixados != null ? ' · ⬇ ' + a.baixados : ''}</span></button>`).join('')}</div>`;
  }
  window.MKT = { esc, dbr, dh, hoje, CHIP_STATUS, CHIP_PRIOR, TIPOS_MAT, TIPOS_ENVIO, nomeTipo, nomePerfil, prioridadePorPrazo, subirArquivos, baixar, listaAnexos };
})();
