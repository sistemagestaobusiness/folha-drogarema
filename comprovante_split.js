// =====================================================================
// DROGAREMA - separação automática de comprovantes bancários
// O Financeiro salva vários comprovantes num PDF só (ex.: Sicredi
// "Pagamento de Funcionários Conta Salário por Grupo", ou vários PIX
// juntos). Este módulo lê o texto do PDF, encontra cada comprovante,
// identifica o funcionário (CPF, nome) e o valor, e recorta a parte
// daquela pessoa num PDF próprio (1 página, com o cabeçalho do banco).
// Nada é enviado a outro lugar: tudo roda no navegador.
// Uso: const a = await ComprovanteSplit.analisar(arquivo);
//      const blob = await ComprovanteSplit.recortar(a, a.blocos[0]);
// =====================================================================
(function (global) {
  const CDN_PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  const CDN_PDFLIB = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';

  function carregarScript(src) {
    return new Promise((ok, erro) => {
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = () => erro(new Error('Não foi possível carregar ' + src));
      document.head.appendChild(s);
    });
  }
  async function libs() {
    if (!global.pdfjsLib) await carregarScript(CDN_PDFJS + 'pdf.min.js');
    if (global.pdfjsLib && global.pdfjsLib.GlobalWorkerOptions && !global.pdfjsLib.GlobalWorkerOptions.workerSrc)
      global.pdfjsLib.GlobalWorkerOptions.workerSrc = CDN_PDFJS + 'pdf.worker.min.js';
    if (!global.PDFLib) await carregarScript(CDN_PDFLIB);
    return { pdfjs: global.pdfjsLib, PDFLib: global.PDFLib };
  }

  const semAcento = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  const numBR = t => { const m = String(t || '').match(/(\d{1,3}(?:\.\d{3})*,\d{2})/); return m ? parseFloat(m[1].replace(/\./g, '').replace(',', '.')) : null; };

  // agrupa os pedaços de texto em linhas (mesma altura na página)
  function linhasDaPagina(items) {
    const linhas = [];
    items.filter(i => String(i.str).trim()).forEach(i => {
      const y = i.transform[5], x = i.transform[4], h = Math.abs(i.height || i.transform[3] || 10);
      let l = linhas.find(l => Math.abs(l.y - y) < 2.5);
      if (!l) { l = { y, h, partes: [] }; linhas.push(l); }
      l.h = Math.max(l.h, h); l.partes.push({ x, s: i.str });
    });
    linhas.forEach(l => { l.texto = l.partes.sort((a, b) => a.x - b.x).map(p => p.s).join(' ').replace(/\s+/g, ' ').trim(); });
    return linhas.sort((a, b) => b.y - a.y);   // de cima para baixo
  }

  // cabeçalho/rodapé da impressão do navegador ("04/09/2026, 14:47 Internet Banking", "https://... 1/2")
  const ehMargem = t => /^\d{2}\/\d{2}\/\d{4},?\s+\d{2}:\d{2}/.test(t) || /https?:\/\//i.test(t) || /^\d+\s*\/\s*\d+$/.test(t);

  async function analisar(arquivo) {
    const { pdfjs } = await libs();
    const dados = arquivo instanceof ArrayBuffer ? arquivo : await arquivo.arrayBuffer();
    const bytes = new Uint8Array(dados.slice(0));
    const doc = await pdfjs.getDocument({ data: new Uint8Array(dados.slice(0)) }).promise;
    const paginas = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const pg = await doc.getPage(n);
      const vp = pg.getViewport({ scale: 1 });
      const tc = await pg.getTextContent();
      const linhas = linhasDaPagina(tc.items);
      const conteudo = linhas.filter(l => !ehMargem(l.texto));
      paginas.push({ n, largura: vp.width, altura: vp.height, linhas: conteudo,
        topo: conteudo.length ? conteudo[0].y + conteudo[0].h + 6 : vp.height - 20,
        base: conteudo.length ? conteudo[conteudo.length - 1].y - 8 : 20 });
    }
    // Cada página decide o seu marcador de início: título "Comprovante de ..." (PIX/TED avulsos)
    // ou, no pagamento por grupo do Sicredi, a linha "Solicitante:". Um PDF pode misturar os dois.
    const ehTitulo = t => /^comprovante d[eo]/i.test(t);
    paginas.forEach(p => {
      p.modo = p.linhas.some(l => ehTitulo(l.texto)) ? 'TITULO' : 'GRUPO';
      p.marcos = p.linhas.filter(l => p.modo === 'TITULO' ? ehTitulo(l.texto) : /^solicitante\s*:/i.test(l.texto));
      const acima = p.marcos.length ? p.linhas.filter(l => l.y > p.marcos[0].y + 1) : p.linhas;
      // cabeçalho do relatório por grupo (associado, conta, grupo...)
      p.cabecalho = p.modo === 'GRUPO' && acima.some(l => /^associado\s*:/i.test(l.texto)) && p.marcos.length
        ? { pagina: p.n, topo: p.topo, base: p.marcos[0].y + p.marcos[0].h + 4 } : null;
      // a página começa um documento novo (não é continuação do comprovante anterior)?
      p.novo = !!p.cabecalho || (p.marcos.length > 0 && !acima.length) || p.modo === 'TITULO';
    });
    const marcos = [];
    let cabAtual = null;
    paginas.forEach(p => { if (p.cabecalho) cabAtual = p.cabecalho; if (p.modo === 'TITULO') cabAtual = null; p.marcos.forEach(l => marcos.push({ p, l, cab: cabAtual })); });

    // Outro banco / layout desconhecido (nenhum marcador encontrado): trata cada página com texto como um comprovante
    if (!marcos.length) {
      const blocosPag = paginas.filter(p => p.linhas.length >= 3).map((p, i) => {
        const texto = p.linhas.map(l => l.texto).join('\n');
        const campo = re => { const x = texto.match(re); return x ? x[1].trim() : ''; };
        return { indice: i + 1, partes: [{ pagina: p.n, topo: Math.min(p.altura - 2, p.topo + 60), base: Math.max(2, p.base), texto: p.linhas.map(l => l.texto) }], cabecalho: null, texto, porPagina: true,
          nome: campo(/(?:Nome(?: do)?(?: (?:destinat[aá]rio|favorecido|benefici[aá]rio|recebedor))?|Favorecido|Recebedor|Para)\s*:?\s+([A-ZÀ-Ú][A-ZÀ-Ú .']{5,})/i),
          cpf: campo(/CPF(?:\/CNPJ)?[^\d*\n]{0,25}([\d*.\-\/ ]{9,})/i).replace(/\s/g, ''),
          valor: numBR(campo(/Valor[^\d\n]{0,25}([\d.]+,\d{2})/i)), data: campo(/(\d{2}\/\d{2}\/\d{4})/), situacao: '' };
      });
      return { nomeArquivo: arquivo.name || 'comprovante.pdf', bytes, paginas: paginas.length, blocos: blocosPag };
    }

    const blocos = marcos.map((m, i) => {
      const prox = marcos[i + 1];
      const partes = [];
      for (let k = m.p.n; k <= paginas.length; k++) {
        const p = paginas[k - 1];
        const primeiraDoBloco = k === m.p.n;
        if (!primeiraDoBloco && p.novo) break;            // próxima página já é outro comprovante/documento
        let topo = primeiraDoBloco ? m.l.y + m.l.h + 4 : p.topo;
        // comprovante com título no alto da página (ex.: PIX): inclui o logo do banco acima do título
        if (primeiraDoBloco && p.modo === 'TITULO' && !p.linhas.some(l => l.y > m.l.y + 1)) topo = Math.min(p.altura - 4, m.l.y + m.l.h + 70);
        const fimAqui = prox && prox.p.n === k;
        const base = fimAqui ? prox.l.y + prox.l.h + 4 : p.base;
        if (topo - base > 4) {
          const texto = p.linhas.filter(l => l.y <= topo && l.y > base).map(l => l.texto);
          if (texto.length) partes.push({ pagina: k, topo, base, texto });
        }
        if (fimAqui) break;
      }
      const texto = partes.flatMap(p => p.texto).join('\n');
      const campo = re => { const x = texto.match(re); return x ? x[1].trim() : ''; };
      const nome = campo(/Nome(?: do (?:destinat[aá]rio|favorecido|benefici[aá]rio))?\s*:\s*(.+)/i) || campo(/Favorecido\s*:\s*(.+)/i);
      const cpf = campo(/CPF(?:\/CNPJ)?(?: do (?:destinat[aá]rio|favorecido))?\s*:\s*([\d*.\-\/ ]{6,})/i).replace(/\s/g, '');
      const valor = numBR(campo(/Valor[^:\n]*:\s*(?:R\$\s*)?([\d.]+,\d{2})/i));
      const data = campo(/(?:Data (?:do )?Pagamento|Realizado em|Data)\s*:\s*(\d{2}\/\d{2}\/\d{4})/i);
      const situacao = campo(/Situa[cç][aã]o\s*:\s*(.+)/i);
      return { indice: i + 1, partes, cabecalho: m.cab, texto, nome, cpf, valor, data, situacao };
    }).filter(b => b.partes.length);
    blocos.forEach((b, i) => b.indice = i + 1);
    return { nomeArquivo: arquivo.name || 'comprovante.pdf', bytes, paginas: paginas.length, blocos };
  }

  // devolve o funcionário (entre os candidatos) que bate com o bloco: CPF > nome
  function identificar(bloco, candidatos) {
    const dig = String(bloco.cpf || '').replace(/[^\d*]/g, '');
    const nomeB = semAcento(bloco.nome);
    let melhor = null, pontos = 0;
    candidatos.forEach(c => {
      let p = 0;
      const cpfC = String(c.cpf || '').replace(/\D/g, '');
      if (cpfC.length === 11 && dig.length === 11) {
        const ok = [...dig].every((d, i) => d === '*' || d === cpfC[i]);
        const visiveis = [...dig].filter(d => d !== '*').length;
        if (ok && visiveis >= 6) p += visiveis >= 11 ? 100 : 60;
        else if (visiveis >= 6) p -= 50;           // CPF diferente: não é a pessoa
      }
      const nomeC = semAcento(c.nome);
      if (nomeB && nomeC) {
        if (nomeB === nomeC) p += 50;
        else {
          const tB = nomeB.split(' ').filter(t => t.length > 2), tC = nomeC.split(' ').filter(t => t.length > 2);
          const comuns = tB.filter(t => tC.includes(t)).length;
          if (tB.length && comuns === tB.length) p += 35; else if (comuns >= 2 && tB[0] === tC[0]) p += 25;
        }
      }
      if (bloco.valor != null && c.valor != null && Math.abs(bloco.valor - c.valor) < 0.01) p += 10;
      // reforço pelo texto inteiro do comprovante (ajuda em layouts de outros bancos, onde o campo não foi lido)
      if (p < 25 && bloco.texto) {
        const txt = semAcento(bloco.texto), dig = bloco.texto.replace(/\D/g, '');
        if (cpfC.length === 11 && dig.includes(cpfC)) p += 100;
        if (nomeC && nomeC.split(' ').length >= 2 && txt.includes(nomeC)) p += 50;
        if (p > 0 && c.valor != null && bloco.texto.includes(c.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))) p += 10;
      }
      if (p > pontos) { pontos = p; melhor = c; }
    });
    return pontos >= 25 ? { candidato: melhor, pontos } : null;
  }

  // gera o PDF só com a parte da pessoa (cabeçalho do banco + o comprovante dela), numa página
  async function recortar(analise, bloco) {
    const { PDFLib } = await libs();
    const origem = await PDFLib.PDFDocument.load(analise.bytes);
    const novo = await PDFLib.PDFDocument.create();
    const pedacos = [];
    if (bloco.cabecalho) pedacos.push(bloco.cabecalho);
    bloco.partes.forEach(p => pedacos.push(p));
    const largura = origem.getPage(0).getWidth();
    const embutidos = [];
    for (const p of pedacos) {
      const pg = origem.getPage(p.pagina - 1);
      embutidos.push({ e: await novo.embedPage(pg, { left: 0, right: pg.getWidth(), bottom: p.base, top: p.topo }), h: p.topo - p.base });
    }
    const margem = 24, rodape = 22, gap = 6;
    const altura = margem + embutidos.reduce((a, x) => a + x.h + gap, 0) + rodape;
    const folha = novo.addPage([largura, altura]);
    let y = altura - margem;
    for (const x of embutidos) { y -= x.h; folha.drawPage(x.e, { x: 0, y }); y -= gap; }
    const fonte = await novo.embedFont(PDFLib.StandardFonts.Helvetica);
    const sem = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E]/g, '');
    folha.drawText(sem(`Recorte automatico do arquivo "${analise.nomeArquivo}" - comprovante ${bloco.indice} de ${analise.blocos.length} (pag. ${bloco.partes.map(p => p.pagina).join(', ')})`),
      { x: 40, y: 10, size: 7, font: fonte, color: PDFLib.rgb(0.45, 0.45, 0.45) });
    const saida = await novo.save();
    return new Blob([saida], { type: 'application/pdf' });
  }

  // junta vários comprovantes (PDF ou imagem) num PDF só, para imprimir de uma vez. itens: [{ bytes, tipo, titulo }]
  async function juntar(itens) {
    const { PDFLib } = await libs();
    const novo = await PDFLib.PDFDocument.create(); const falhas = [];
    for (const it of itens) {
      try {
        const b = new Uint8Array(it.bytes), ehPdf = b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
        if (ehPdf) {
          const src = await PDFLib.PDFDocument.load(b, { ignoreEncryption: true });
          (await novo.copyPages(src, src.getPageIndices())).forEach(p => novo.addPage(p));
        } else {
          const ehPng = b[0] === 0x89 && b[1] === 0x50, img = ehPng ? await novo.embedPng(b) : await novo.embedJpg(b);
          const W = 595, H = 842, m = 30, esc = Math.min((W - 2 * m) / img.width, (H - 2 * m) / img.height, 1);
          novo.addPage([W, H]).drawImage(img, { x: (W - img.width * esc) / 2, y: H - m - img.height * esc, width: img.width * esc, height: img.height * esc });
        }
      } catch (e) { falhas.push(it.titulo || '?'); }
    }
    if (!novo.getPageCount()) throw new Error('Nenhum comprovante pôde ser lido.');
    return { blob: new Blob([await novo.save()], { type: 'application/pdf' }), falhas, paginas: novo.getPageCount() };
  }

  global.ComprovanteSplit = { analisar, identificar, recortar, semAcento, juntar };
})(typeof window !== 'undefined' ? window : globalThis);
