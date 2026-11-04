/*!
 * Sonhaí — núcleo compartilhado (app + servidor)
 * Interpreta frases em português ("gastei 50 no mercado"), calcula resumos
 * e mescla dados entre celular e servidor.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CC = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------- categorias
  const CATEGORIAS = [
    { nome: 'Mercado', emoji: '🛒', cor: '#2BB673', chaves: ['mercado', 'supermercado', 'assai', 'atacad', 'atacadao', 'savegnago', 'carrefour', 'feira', 'hortifruti', 'sacolao', 'acougue', 'tonin', 'big compras', 'compras do mes'] },
    { nome: 'Padaria', emoji: '🥖', cor: '#E9A23B', chaves: ['padaria', 'pao', 'paes', 'croissant', 'confeitaria'] },
    { nome: 'Restaurante/Lanche', emoji: '🍔', cor: '#F2643D', chaves: ['restaurante', 'lanche', 'lanchonete', 'ifood', 'i food', 'almoco', 'almocei', 'jantar', 'jantei', 'pizza', 'hamburguer', 'burger', 'bar ', 'barzinho', 'cafe', 'sorveteria', 'marmita', 'pastel', 'churrasc', 'esfiha', 'sushi', 'chicken', 'delivery', 'rappi'] },
    { nome: 'Combustível', emoji: '⛽', cor: '#D64545', chaves: ['gasolina', 'etanol', 'alcool', 'combustivel', 'posto', 'abasteci', 'abastecer', 'diesel', 'gnv'] },
    { nome: 'Carro/Manutenção', emoji: '🔧', cor: '#6C7A89', chaves: ['mecanico', 'oficina', 'pneu', 'oleo', 'bateria', 'lava jato', 'lavagem', 'revisao', 'carro', 'moto', 'funilaria', 'estacionamento', 'zona azul', 'uber', '99 pop', 'ipva', 'licenciamento', 'seguro do carro'] },
    { nome: 'Pedágio/Tag', emoji: '🛣️', cor: '#8E6CEF', chaves: ['pedagio', 'tag', 'sem parar', 'conectcar', 'veloe'] },
    { nome: 'Assinaturas', emoji: '📺', cor: '#C2418C', chaves: ['netflix', 'spotify', 'assinatura', 'streaming', 'prime video', 'disney', 'globoplay', 'youtube', 'deezer', 'hbo', 'max ', 'icloud', 'google one', 'chatgpt', 'claude'] },
    { nome: 'Compras Online', emoji: '📦', cor: '#FF8A3D', chaves: ['shopee', 'shein', 'mercado livre', 'amazon', 'aliexpress', 'magalu', 'magazine', 'temu', 'americanas'] },
    { nome: 'Casa', emoji: '🛋️', cor: '#9B6B43', chaves: ['guarda-roupa', 'guarda roupa', 'moveis', 'movel', 'utensilio', 'havan', 'ferramenta', 'tinta', 'limpeza', 'decoracao', 'cama', 'toalha', 'eletrodomestico', 'material de construcao', 'reforma', 'chaveiro', 'faxina', 'diarista'] },
    { nome: 'Contas da Casa', emoji: '🏠', cor: '#1F8FB5', chaves: ['luz', 'energia', 'agua', 'internet', 'gas', 'condominio', 'aluguel', 'iptu', 'telefone', 'celular conta', 'conta de celular', 'parcela do apto', 'financiamento', 'prestacao da casa', 'vaga de garagem'] },
    { nome: 'Saúde/Farmácia', emoji: '💊', cor: '#E8505B', chaves: ['farmacia', 'remedio', 'drogaria', 'droga', 'medico', 'consulta', 'exame', 'dentista', 'plano de saude', 'hospital', 'laboratorio', 'psicolog', 'fisioterap', 'otica', 'oculos', 'drogasil', 'pague menos'] },
    { nome: 'Educação', emoji: '📚', cor: '#3B6FD4', chaves: ['escola', 'curso', 'livro', 'faculdade', 'material escolar', 'mensalidade', 'apostila', 'ingles', 'aula'] },
    { nome: 'Lazer', emoji: '🎉', cor: '#F5B700', chaves: ['cinema', 'passeio', 'show', 'viagem', 'parque', 'brinquedo', 'sorvete', 'cacau show', 'chocolate', 'teatro', 'festa', 'shopping', 'clube', 'hotel', 'pousada', 'ingresso', 'jogo'] },
    { nome: 'Vestuário', emoji: '👕', cor: '#D96BA0', chaves: ['roupa', 'sapato', 'tenis', 'camisa', 'camiseta', 'calca', 'vestido', 'blusa', 'bermuda', 'chinelo', 'fantasia', 'bolsa', 'cueca', 'meia', 'lingerie', 'renner', 'riachuelo', 'c&a'] },
    { nome: 'Eletrônicos', emoji: '📱', cor: '#4A5BD8', chaves: ['celular', 'fone', 'carregador', 'computador', 'notebook', 'tv', 'televisao', 'tablet', 'caixa de som', 'eletronico', 'cabo usb', 'videogame'] },
    { nome: 'Beleza', emoji: '💅', cor: '#E46FC7', chaves: ['cabelo', 'salao', 'manicure', 'unha', 'cosmetico', 'perfume', 'maquiagem', 'barbearia', 'barbeiro', 'boticario', 'natura', 'depilacao', 'sobrancelha'] },
    { nome: 'Pets', emoji: '🐶', cor: '#A0763A', chaves: ['racao', 'pet', 'veterinario', 'banho e tosa', 'cachorro', 'gato', 'petshop', 'vacina do'] },
    { nome: 'Academia', emoji: '💪', cor: '#14A098', chaves: ['academia', 'suplemento', 'whey', 'creatina', 'personal', 'crossfit', 'pilates', 'mfit'] },
    { nome: 'Dívidas/Empréstimos', emoji: '💳', cor: '#7A2E3B', chaves: ['emprestimo', 'divida', 'consignado', 'acordo', 'renegociacao', 'fatura atrasada'] },
    { nome: 'Taxas/Juros', emoji: '🧾', cor: '#8A8F98', chaves: ['juros', 'tarifa', 'taxa', 'anuidade', 'multa', 'iof'] },
    { nome: 'Presentes/Doações', emoji: '🎁', cor: '#E0697A', chaves: ['presente', 'doacao', 'dizimo', 'oferta', 'aniversario', 'vaquinha'] },
    { nome: 'Outros', emoji: '✨', cor: '#9AA3AF', chaves: [] }
  ];
  const TIPOS_ENTRADA = ['Salário', 'Adiantamento', 'Bônus/PLR', 'Comissão', '13º salário', 'Aposentadoria', 'Aluguel recebido', 'Venda', 'Pix recebido', 'Freela', 'Reembolso', 'Rendimentos', 'Resgate de sonho', 'Outra renda'];

  // ------------------------------------------------------------------ helpers
  const sem = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const mesDe = (dataIso) => String(dataIso).slice(0, 7);
  const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const nomeMes = (ym) => { const [y, m] = ym.split('-').map(Number); return MESES[m - 1] + ' de ' + y; };
  const mesCurto = (ym) => { const [y, m] = ym.split('-').map(Number); return MESES_CURTOS[m - 1] + '/' + String(y).slice(2); };
  const somaMes = (ym, n) => { let [y, m] = ym.split('-').map(Number); m += n; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; } return y + '-' + pad(m); };
  const difMeses = (a, b) => { const [y1, m1] = a.split('-').map(Number); const [y2, m2] = b.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1); };
  const diasNoMes = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };

  /** Data "agora" num fuso (o servidor usa America/Sao_Paulo). */
  function agora(tz) {
    if (!tz) return new Date();
    const p = {};
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(new Date()).forEach((x) => { p[x.type] = x.value; });
    return new Date(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
  }

  // --------------------------------------------------------- números falados
  const UNID = { zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90, cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300, quatrocentos: 400, quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900 };
  /** Troca números por extenso por algarismos: "cinquenta e dois reais" -> "52 reais". */
  function extensoParaNumero(txt) {
    const tokens = txt.split(/(\s+)/);
    const out = []; let i = 0;
    while (i < tokens.length) {
      const w = tokens[i];
      if (UNID[w] !== undefined || w === 'mil') {
        let total = 0, atual = 0, j = i, ultimo = i, achou = false;
        while (j < tokens.length) {
          const t = tokens[j];
          if (/^\s+$/.test(t)) { j++; continue; }
          if (UNID[t] !== undefined) { atual += UNID[t]; achou = true; ultimo = j; j++; continue; }
          if (t === 'mil') { total += (atual || 1) * 1000; atual = 0; achou = true; ultimo = j; j++; continue; }
          if (t === 'e' && achou) {
            let k = j + 1; while (k < tokens.length && /^\s+$/.test(tokens[k])) k++;
            if (k < tokens.length && (UNID[tokens[k]] !== undefined)) { j = k; continue; }
          }
          break;
        }
        // "um"/"uma" sozinhos geralmente são artigos ("um lanche")
        const pal = tokens.slice(i, ultimo + 1).join('').trim();
        if (achou && !(pal === 'um' || pal === 'uma')) { out.push(String(total + atual)); i = ultimo + 1; continue; }
      }
      out.push(w); i++;
    }
    return out.join('');
  }

  // -------------------------------------------------------- extração de valor
  function extrairValor(t) {
    // "45 reais e 90 centavos"
    let m = t.match(/(\d+)\s*reais?\s*e\s*(\d{1,2})\s*centavos?/);
    if (m) return { valor: +m[1] + (+m[2]) / 100, trecho: m[0] };
    m = t.match(/(\d+)\s*centavos?/);
    const re = /r\$\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)|(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(reais|real|conto|contos|pila|r\$)?/g;
    let melhor = null, x;
    while ((x = re.exec(t))) {
      const bruto = x[1] || x[2];
      const comMoeda = !!x[1] || !!x[3];
      const pos = x.index;
      // ignora números que são datas/horas/parcelas/dias
      const antes = t.slice(Math.max(0, pos - 6), pos);
      const depois = t.slice(pos + x[0].length, pos + x[0].length + 8);
      if (!comMoeda) {
        if (/dia\s*$|as\s*$|às\s*$|em\s*$/.test(antes) && /^\s*(h|hora|x|vez|vezes|parcela|\/|:)/.test(depois)) continue;
        if (/^\s*(h\b|horas?|x\b|vez|vezes|parcelas?|\/|:|de (janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)|meses|mes|anos?|dias?)/.test(depois)) continue;
        if (/dia\s*$|\/\s*$|:\s*$|as\s*$/.test(antes)) continue;
        if (/\d\s*h\s*$/.test(antes)) continue;
      }
      let s = bruto;
      if (/\.\d{3}/.test(s) && !/,\d{1,2}$/.test(s) && !/\.\d{1,2}$/.test(s)) s = s.replace(/\./g, '');
      else if (/,/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
      const v = parseFloat(s);
      if (!isFinite(v)) continue;
      const cand = { valor: v, trecho: x[0], moeda: comMoeda, pos };
      if (!melhor || (cand.moeda && !melhor.moeda)) melhor = cand;
    }
    if (melhor) return melhor;
    if (m) return { valor: +m[1] / 100, trecho: m[0] };
    return null;
  }

  // --------------------------------------------------------- datas e horas
  const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const MESES_SEM = MESES.map(sem);
  function extrairData(t, hoje) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const add = (n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
    if (/depois de amanha/.test(t)) return { data: iso(add(2)), trecho: 'depois de amanha' };
    if (/anteontem/.test(t)) return { data: iso(add(-2)), trecho: 'anteontem' };
    if (/\bontem\b/.test(t)) return { data: iso(add(-1)), trecho: 'ontem' };
    if (/\bamanha\b/.test(t)) return { data: iso(add(1)), trecho: 'amanha' };
    if (/\bhoje\b/.test(t)) return { data: iso(d), trecho: 'hoje' };
    let m = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (m) {
      let y = m[3] ? +m[3] : d.getFullYear(); if (y < 100) y += 2000;
      return { data: iso(new Date(y, +m[2] - 1, +m[1])), trecho: m[0] };
    }
    m = t.match(/\bdia\s+(\d{1,2})(?:\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro))?/);
    if (m) {
      const dia = +m[1];
      let mes = m[2] ? MESES_SEM.indexOf(m[2]) : d.getMonth();
      let y = d.getFullYear();
      return { data: iso(new Date(y, mes, dia)), trecho: m[0], dia };
    }
    m = t.match(/\b(\d{1,2})\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/);
    if (m) {
      let y = d.getFullYear(); const mes = MESES_SEM.indexOf(m[2]);
      let r = new Date(y, mes, +m[1]); if (r < add(-60)) r = new Date(y + 1, mes, +m[1]);
      return { data: iso(r), trecho: m[0] };
    }
    for (let i = 0; i < 7; i++) {
      const re = new RegExp('\\b(?:na |no |nessa |nesta |proxima |proximo )?' + DIAS_SEMANA[i] + '(?:-feira| feira)?\\b');
      const mm = t.match(re);
      if (mm) {
        let n = (i - d.getDay() + 7) % 7; if (n === 0) n = 7;
        return { data: iso(add(n)), trecho: mm[0] };
      }
    }
    return null;
  }
  function extrairHora(t) {
    let m = t.match(/\b(?:as|às|a partir das|por volta das)?\s*(\d{1,2})[:h](\d{2})\b/);
    if (m && +m[1] < 24) return { hora: pad(+m[1]) + ':' + m[2], trecho: m[0] };
    m = t.match(/\b(?:as|às)\s*(\d{1,2})\s*(?:h|horas?)?(?:\s*e\s*(meia|\d{1,2}))?(?:\s*da\s*(manha|tarde|noite))?/);
    if (!m) m = t.match(/\b(\d{1,2})\s*(?:h|horas)\b(?:\s*e\s*(meia|\d{1,2}))?(?:\s*da\s*(manha|tarde|noite))?/);
    if (m) {
      let h = +m[1]; let min = m[2] === 'meia' ? 30 : (m[2] ? +m[2] : 0);
      if ((m[3] === 'tarde' || m[3] === 'noite') && h < 12) h += 12;
      if (h < 24) return { hora: pad(h) + ':' + pad(min), trecho: m[0] };
    }
    if (/\bmeio dia\b/.test(t)) return { hora: '12:00', trecho: 'meio dia' };
    return null;
  }

  function adivinharCategoria(t, cats) {
    const lista = cats && cats.length ? cats : CATEGORIAS;
    let melhor = null, tam = 0;
    const tt = ' ' + t + ' ';
    for (const c of lista) {
      const base = CATEGORIAS.find((x) => x.nome === c.nome);
      const chaves = (c.chaves || (base && base.chaves) || []).concat([sem(c.nome)]);
      for (const k of chaves) {
        if (!k) continue;
        if (tt.includes(k.length <= 4 ? ' ' + k.trim() + ' ' : k) && k.length > tam) { melhor = c.nome; tam = k.length; }
      }
    }
    return melhor || 'Outros';
  }

  const VERBOS = /\b(gastei|gastamos|gastar|gaste|despesa|despesas|saida|torrei|desembolsei|comprar|compramos|pagamos|criar|cria|crie|novo|nova|lancamento|registro|incluir|inclui|inclua|bota|botar|gastei|paguei|comprei|almocei|jantei|abasteci|coloquei|botei|lancei|lanca|lancar|lance|anota|anotar|anote|registra|registrar|registre|adiciona|adicionar|adicione|foi|deu|custou|tive um gasto de|tive gasto de|gasto de|gasto|compra de|compra|fiz|fui|no valor de|valor de|reais|real|conto|contos|pila|r\$|com|de|do|da|no|na|em|um|uma|o|a|os|as|e|pra|para|pro|hoje|ontem|anteontem|agora|cartao|credito|debito|pix|dinheiro|no cartao|eu|me|meu|minha)\b/g;
  function limparDescricao(original, remover) {
    let t = ' ' + extensoParaNumero(sem(original)) + ' ';
    const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const r of remover) if (r) t = t.replace(new RegExp('(^|[^a-z0-9])' + esc(sem(r).trim()) + '(?=[^a-z0-9]|$)', 'g'), '$1 ');
    t = t.replace(/[.,!?;]/g, ' ').replace(VERBOS, ' ').replace(/\b\d+\b/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    // reaproveita grafia original (com acentos) quando possível
    const palavras = t.split(' ');
    const orig = String(original).split(/\s+/);
    const res = palavras.map((p) => orig.find((o) => sem(o).replace(/[.,!?;]/g, '') === p) || p).map((p) => p.replace(/[.,!?;]/g, ''));
    const s = res.join(' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  const pagamento = (t) => (/credito|cartao/.test(t) ? 'Cartão' : /\bpix\b/.test(t) ? 'Pix' : /debito/.test(t) ? 'Débito' : /dinheiro|especie/.test(t) ? 'Dinheiro' : '');

  // ------------------------------------------------------- conversa com perguntas
  /** Interpreta e aplica; se havia uma pergunta pendente (ex.: em qual sonho guardar), resolve primeiro. */
  function conversar(estado, texto, opts) {
    opts = opts || {};
    const hoje = opts.hoje || new Date();
    const p = estado.pendente;
    if (p && Date.now() - (p.em || 0) < 15 * 60e3) {
      const t = sem(texto).trim();
      if (/^(cancela|cancelar|deixa|deixa pra la|nao|esquece)\b/.test(t)) { delete estado.pendente; return { ok: true, msg: 'Tudo bem, não guardei nada. 🙂' }; }
      if (p.tipo === 'sonho' && !extrairValor(t.replace(/^\d{1,2}$/, '')) && !/\b(gastei|paguei|comprei|recebi)\b/.test(t)) {
        delete estado.pendente;
        const n = t.match(/^(\d{1,2})\.?$/);
        const lista = estado.sonhos || [];
        const alvo = n ? lista[+n[1] - 1] : acharSonho(lista, t);
        const acao = { tipo: 'sonho', valor: p.valor, data: p.data, investir: p.investir, sonhoId: alvo ? alvo.id : undefined, termo: alvo ? '' : String(texto).trim().replace(/^(novo|criar|cria|sonho|um sonho)\s+/i, '') };
        if (!alvo && n) return { ok: false, msg: 'Não achei esse número. Responda de novo, por favor. 🙂', pergunta: p };
        return aplicar(estado, acao, opts);
      }
      delete estado.pendente;
    }
    const acao = interpretar(texto, { hoje, categorias: estado.categorias, sonhos: estado.sonhos, cartoes: estado.cartoes });
    const r = aplicar(estado, acao, opts);
    if (r.pergunta) estado.pendente = r.pergunta;
    r.acao = acao;
    return r;
  }

  // ------------------------------------------------------------------ cartões
  const BANCOS = [
    ['banco do brasil', 'Banco do Brasil', '#F8D117'], ['bb', 'Banco do Brasil', '#F8D117'], ['itau', 'Itaú', '#EC7000'], ['bradesco', 'Bradesco', '#CC092F'],
    ['nubank', 'Nubank', '#820AD1'], ['nu', 'Nubank', '#820AD1'], ['santander', 'Santander', '#EC0000'], ['caixa', 'Caixa', '#005CA9'], ['inter', 'Inter', '#FF7A00'],
    ['c6', 'C6 Bank', '#242424'], ['sicoob', 'Sicoob', '#00A091'], ['sicredi', 'Sicredi', '#3FA110'], ['mercado pago', 'Mercado Pago', '#00B1EA'],
    ['picpay', 'PicPay', '#21C25E'], ['neon', 'Neon', '#00A5E0'], ['next', 'Next', '#00D355'], ['original', 'Original', '#00A859'], ['pan', 'Banco Pan', '#00AEEF'],
    ['will', 'Will Bank', '#FFD400'], ['xp', 'XP', '#111111'], ['btg', 'BTG', '#0B2A5B'], ['porto', 'Porto Seguro', '#0055A5'], ['renner', 'Renner', '#C8102E'],
    ['carrefour', 'Carrefour', '#1E5BC6'], ['havan', 'Havan', '#0B3B8C'], ['magalu', 'Magalu', '#0086FF'], ['ourocard', 'Banco do Brasil', '#F8D117'], ['credicard', 'Credicard', '#E4002B']
  ];
  /** Acha o cartão citado: "cartão de crédito itaú", "no crédito do nubank", "cartão bradesco". */
  function detectarCartao(t, cartoes, forcar) {
    cartoes = cartoes || [];
    const temChave = /\b(cartao|credito|fatura)\b/.test(t);
    if (!temChave && !forcar) return null;
    const tt = ' ' + t + ' ';
    // cartões já cadastrados (pelo nome)
    let melhor = null, tam = 0;
    for (const c of cartoes) {
      const n = sem(c.nome);
      const partes = [n].concat(n.split(/\s+/).filter((p) => p.length > 2 && !['banco', 'bank', 'cartao', 'credito'].includes(p)));
      for (const p of partes) if (tt.includes(' ' + p + ' ') && p.length > tam) { melhor = c; tam = p.length; }
    }
    if (melhor) return { id: melhor.id, nome: melhor.nome, trecho: sem(melhor.nome) };
    for (const [k, nome, cor] of BANCOS) {
      if ((k.length <= 2 ? new RegExp('\\b(cartao|credito)\\s+(do\\s+|da\\s+)?' + k + '\\b') : new RegExp('\\b' + k + '\\b')).test(t)) {
        if (k.length > 2 && !temChave && !forcar) continue;
        const ja = cartoes.find((c) => sem(c.nome) === sem(nome));
        return ja ? { id: ja.id, nome: ja.nome, trecho: k } : { novo: true, nome, cor, trecho: k };
      }
    }
    if (temChave && cartoes.length === 1) return { id: cartoes[0].id, nome: cartoes[0].nome, trecho: '' };
    return temChave ? { semBanco: true } : null;
  }
  function garantirCartao(estado, info) {
    if (!info || info.semBanco) return null;
    estado.cartoes = estado.cartoes || [];
    if (info.id) return estado.cartoes.find((c) => c.id === info.id) || null;
    const c = { id: uid(), nome: info.nome, cor: info.cor || '#1B3A6B', diaVenc: 10, fechamento: 0, limite: 0, faturas: {}, upd: Date.now() };
    estado.cartoes.push(c);
    return c;
  }
  /** Em qual fatura (mês) uma compra cai, considerando o dia de fechamento. */
  function mesFatura(cartao, data) {
    const ym = mesDe(data);
    return cartao && +cartao.fechamento && +String(data).slice(8, 10) >= +cartao.fechamento ? somaMes(ym, 1) : ym;
  }
  /** Fatura de um cartão num mês: compras, parcelas, restante anterior, total, pago, situação. */
  function fatura(estado, cartaoId, ym, hoje, prof) {
    prof = prof || 0;
    const c = (estado.cartoes || []).find((x) => x.id === cartaoId);
    if (!c) return null;
    const compras = (estado.lancamentos || []).filter((l) => l.tipo === 'gasto' && l.cartaoId === cartaoId && mesFatura(c, l.data) === ym);
    const parcelas = (estado.parcelados || []).filter((p) => p.cartaoId === cartaoId).map((p) => ({ p, k: parcelaNoMes(p, ym) })).filter((x) => x.k);
    let anterior = 0;
    if (prof < 12) { const fa = fatura(estado, cartaoId, somaMes(ym, -1), hoje, prof + 1); if (fa && fa.situacao === 'parcial') anterior = fa.falta; }
    const total = Math.round((compras.reduce((a, b) => a + b.valor, 0) + parcelas.reduce((a, b) => a + b.p.valor, 0) + anterior) * 100) / 100;
    const reg = (c.faturas || {})[ym] || null;
    const pago = reg ? (reg.status === 'total' ? total : Number(reg.pago) || 0) : 0;
    const falta = Math.max(0, Math.round((total - pago) * 100) / 100);
    const venc = ym + '-' + pad(Math.min(+c.diaVenc || 10, diasNoMes(ym)));
    const h = hoje ? iso(hoje) : iso(new Date());
    let situacao = 'aberta';
    if (reg && reg.status === 'total') situacao = 'paga';
    else if (reg && reg.status === 'parcial') situacao = falta <= 0.005 ? 'paga' : 'parcial';
    else if (total === 0) situacao = 'vazia';
    else if (h > venc) situacao = 'vencida';
    return { cartao: c, ym, compras, parcelas, anterior, total, pago, falta, venc, situacao };
  }
  /** Marca o pagamento da fatura: total, ou parcial com o valor pago. */
  function pagarFatura(estado, cartaoId, ym, status, valor) {
    const c = (estado.cartoes || []).find((x) => x.id === cartaoId); if (!c) return;
    c.faturas = c.faturas || {};
    if (status === 'aberta') delete c.faturas[ym]; else c.faturas[ym] = { status, pago: status === 'parcial' ? Number(valor) || 0 : null, em: Date.now() };
    c.upd = Date.now();
  }
  function faturasAVencer(estado, hoje, dias) {
    const out = [];
    for (const c of estado.cartoes || []) {
      for (const ym of [mesDe(iso(hoje)), somaMes(mesDe(iso(hoje)), 1)]) {
        const f = fatura(estado, c.id, ym, hoje); if (!f || f.situacao === 'paga' || f.situacao === 'vazia' || f.falta <= 0) continue;
        const dd = Math.round((new Date(f.venc + 'T12:00') - new Date(iso(hoje) + 'T12:00')) / 864e5);
        if (dd >= 0 && dd <= dias) out.push({ fatura: f, emDias: dd });
      }
    }
    return out;
  }

  // -------------------------------------------------------------- interpretar
  /**
   * Transforma uma frase em uma ação.
   * Retorna { tipo, ...dados } — tipos: gasto, entrada, excluir, desfazer, conta, compromisso,
   * sonho, parcelado, resumo, contas_pendentes, agenda_hoje, ajuda, desconhecido
   */
  function interpretar(frase, opts) {
    opts = opts || {};
    const hoje = opts.hoje || new Date();
    const original = String(frase || '').trim();
    let t = sem(original).replace(/[“”"]/g, '');
    t = extensoParaNumero(t);
    if (!t) return { tipo: 'desconhecido' };

    if (/^(oi|ola|bom dia|boa tarde|boa noite|ajuda|menu|comandos|help|inicio|começar|comecar)\b/.test(t) && !extrairValor(t)) return { tipo: 'ajuda' };
    if (/\b(desfaz|desfazer|desfaca|volta o ultimo|cancela o ultimo|apaga o ultimo|exclui o ultimo|exclua o ultimo|remove o ultimo)\b/.test(t) && !/\d/.test(t)) return { tipo: 'desfazer' };
    if (/\b(quanto (eu )?(ja )?gastei|resumo|saldo|como (estou|esta|to|ta)|balanco|extrato|meu mes)\b/.test(t)) return { tipo: 'resumo' };
    if (/\b(contas? (a|pra|para) (pagar|vencer)|o que vence|quais contas|contas da semana|contas pendentes|boletos)\b/.test(t) && !extrairValor(t)) return { tipo: 'contas_pendentes' };
    if (/\b(agenda|compromissos? (de )?hoje|meus compromissos|o que tenho hoje)\b/.test(t) && !/\b(marca|marcar|agenda[r]? (uma|um|o|a)|lembra)/.test(t)) return { tipo: 'agenda_hoje' };

    const val = extrairValor(t);
    const dt = extrairData(t, hoje);
    const hr = extrairHora(t);

    // RESGATE / TRANSFERÊNCIA de sonho (cofrinho)
    const sonhosOpts = opts.sonhos || [];
    const verboResgate = /\b(retir\w*|resgat\w*|saque|saquei|sacar|saca|tirei|tire|tira|tirar|tiro|peguei|pegue|pega|pegar|usei|usar|use|transfir\w*|transferi|transfere|passa|passe|passar|mova|move|mover|movi)\b/;
    const palavraCofre = /\b(reserva|sonhos?|cofrinhos?|caixinhas?|poupanca|metas?)\b/;
    if (val && verboResgate.test(t) && (palavraCofre.test(t) || acharSonho(sonhosOpts, t))) {
      let origemTxt = t, destinoTxt = '';
      const mDest = t.match(/^(.*?)\s(?:para|pra|pro|ao|no|na)\s+(?:o |a |os |as )?(?:sonho |cofrinho |caixinha )?(.+)$/);
      if (mDest) {
        const d = acharSonho(sonhosOpts, mDest[2]);
        const o = acharSonho(sonhosOpts, mDest[1]);
        if (d && o && d.id !== o.id) { origemTxt = mDest[1]; destinoTxt = mDest[2]; }
      }
      const renda = !destinoTxt;
      return { tipo: 'resgate', valor: val.valor, termo: origemTxt, destino: destinoTxt, renda, data: dt ? dt.data : iso(hoje) };
    }

    // EXCLUIR
    if (/\b(exclu|apag|remov|delet|cancel|tira|retira|estorn)\w*/.test(t)) {
      const termo = limparDescricao(original.replace(/\b(exclu|apag|remov|delet|cancel|tira|retira|estorn)\w*/gi, ''), [val && val.trecho, dt && dt.trecho, 'gasto', 'lancamento', 'lançamento', 'ultimo', 'último']);
      return { tipo: 'excluir', valor: val ? val.valor : null, termo: sem(termo), data: dt ? dt.data : null, alvo: /compromisso|consulta|reuniao/.test(t) ? 'agenda' : /conta\b|boleto/.test(t) && !val ? 'conta' : 'lancamento' };
    }

    // SONHO (guardar / investir / cofrinho)
    const verboGuardar = /\b(guard(ei|ar|e|a|amos)|junt(ei|ar|e|a)|poup(ei|ar|e|a)|economiz(ei|ar)|separ(ei|ar|e|a)|reserv(ei|ar|e)|invest(i|ir|e|a|imos)|deposit(ei|ar|e|a)|apliq(uei)|aplic(ar|a|ou)|cofrinho|caixinha)\b/;
    if (val && verboGuardar.test(t) && !/\b(gastei|comprei|paguei|guarda.?roupa|guarda.?chuva)\b/.test(t)) {
      const restoOrig = (limparDescricao(original, [val.trecho, dt && dt.trecho, 'guardei', 'guardar', 'guarde', 'guarda', 'juntei', 'juntar', 'poupei', 'poupar', 'economizei', 'separei', 'separar', 'reservei', 'reservar', 'investi', 'investir', 'invista', 'depositei', 'depositar', 'apliquei', 'aplicar', 'coloquei', 'colocar', 'coloca', 'coloque', 'botei', 'sonho', 'meu', 'minha', 'nosso', 'nossa', 'dinheiro', 'valor'])) || '';
      const resto = sem(restoOrig);
      const generico = !resto || /^(cofrinho|caixinha|sonhos?|cofre|poupanca da casa|algum|um|uma)$/.test(resto.trim()) || resto.trim().length < 3;
      return { tipo: 'sonho', valor: val.valor, termo: generico ? '' : restoOrig.replace(/\b(cofrinho|caixinha)\b/gi, '').trim(), investir: /\binvest|aplic/.test(t), data: dt ? dt.data : iso(hoje) };
    }

    // ENTRADA (renda) — todas as formas comuns de dizer que entrou dinheiro
    const fortesEntrada = /\b(recebi|recebemos|receber|recebido|recebida|ganhei|ganhamos|entrou|entrada|entradas|renda|rendas|receita|receitas|caiu|cairam|pingou|me pagaram|pagaram|depositaram|transferiram pra mim|me mandaram|recebimento|faturei|lucrei|lucro)\b/;
    const fracosEntrada = /\b(salario|adiantamento|vale|13o?|decimo terceiro|bonus|plr|comissao|aposentadoria|pensao|aluguel recebido|reembolso|restituicao|cashback|freela|freelance|venda|vendi|rendimento|dividendos?|pro labore)\b/;
    const verbosGasto = /\b(gastei|gastamos|gasto|gastar|comprei|compramos|compra|comprar|paguei|pagamos|pagar|despesa|saida|torrei|desembolsei|debitou|saiu)\b/;
    const ehEntrada = val && (fortesEntrada.test(t) && !/\b(receita medica|receita de bolo)\b/.test(t) || (fracosEntrada.test(t) && !verbosGasto.test(t)));
    if (ehEntrada && !(verbosGasto.test(t) && !fortesEntrada.test(t))) {
      let tipoE = /salario/.test(t) ? 'Salário' : /adiantamento|vale\b/.test(t) ? 'Adiantamento' : /13|decimo/.test(t) ? '13º salário' : /bonus|plr/.test(t) ? 'Bônus/PLR' : /comissao/.test(t) ? 'Comissão' : /aluguel/.test(t) ? 'Aluguel recebido' : /vendi|venda/.test(t) ? 'Venda' : /reembolso|restituicao|cashback/.test(t) ? 'Reembolso' : /rendimento|dividendo/.test(t) ? 'Rendimentos' : /freela/.test(t) ? 'Freela' : /pix/.test(t) ? 'Pix recebido' : /aposentadoria|inss/.test(t) ? 'Aposentadoria' : 'Outra renda';
      const desc = limparDescricao(original, [val.trecho, dt && dt.trecho, 'recebi', 'recebemos', 'receber', 'recebido', 'recebida', 'ganhei', 'ganhamos', 'entrou', 'entrada', 'renda', 'receita', 'caiu', 'me pagaram', 'pagaram', 'pingou', 'depositaram', 'criar', 'cria', 'crie', 'nova', 'novo', 'lançar', 'lança', 'lance', 'registrar', 'adicionar', 'adiciona', 'colocar', 'coloca', 'vendi', 'por', 'pela', 'pelo']) || tipoE;
      return { tipo: 'entrada', valor: val.valor, desc, cat: tipoE, data: dt ? dt.data : iso(hoje) };
    }

    // FATURA DO CARTÃO (pagar / consultar)
    if (/\bfatura\b/.test(t) || (/\bcartao\b/.test(t) && /\b(paguei|quitei|quanto|como esta|ver)\b/.test(t) && !/\b(com|no)\s+(o\s+)?cartao\b/.test(t))) {
      const card = detectarCartao(t, opts.cartoes, true);
      const mesM = t.match(/\b(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/);
      let ym = mesDe(iso(hoje));
      if (mesM) { const mi = MESES_SEM.indexOf(mesM[1]) + 1; ym = hoje.getFullYear() + '-' + pad(mi); if (ym > somaMes(mesDe(iso(hoje)), 2)) ym = (hoje.getFullYear() - 1) + '-' + pad(mi); }
      else if (/\b(passad|anterior)\w*/.test(t)) ym = somaMes(ym, -1);
      else if (/\b(proxim|que vem)\w*/.test(t)) ym = somaMes(ym, 1);
      const vM = t.match(/\b(?:vence|vencimento)\D{0,12}(\d{1,2})\b/); const fM = t.match(/\bfecha\w*\D{0,12}(\d{1,2})\b/);
      if ((vM || fM) && !/\b(paguei|quitei)\b/.test(t)) return { tipo: 'config_cartao', cartao: card, diaVenc: vM ? +vM[1] : null, fechamento: fM ? +fM[1] : null };
      if (/\b(paguei|quitei|pago|paga|pagamos)\b/.test(t)) {
        const parcial = val && !/\b(toda|total|inteira|tudo)\b/.test(t);
        return { tipo: 'pagar_fatura', cartao: card, ym, valor: val ? val.valor : null, parcial: !!parcial };
      }
      if (/\b(quanto|ver|mostra|como esta|valor|qual)\b/.test(t) || !val) return { tipo: 'ver_fatura', cartao: card, ym };
    }

    // COMPROMISSO (sem dinheiro, com data/hora ou palavra-chave)
    const ehCompromisso = /\b(compromisso|consulta|reuniao|lembr\w*|agend\w*|marc\w*|dentista|medico|aniversario|encontro|visita|entrevista|exame|buscar|levar|ligar para|evento|festa|curso)\b/.test(t);
    const ehConta = /\b(conta|boleto|fatura|vence|vencimento|mensalidade|todo dia|todo mes|mensal)\b/.test(t);
    if (ehCompromisso && (!val || (hr && !/\b(paguei|gastei|comprei)\b/.test(t))) && !(ehConta && val)) {
      const titulo = limparDescricao(original, [dt && dt.trecho, hr && hr.trecho, 'compromisso', 'me lembra', 'me lembre', 'lembrete', 'lembrar', 'agendar', 'agenda', 'marcar', 'marca', 'tenho', 'vou ter', 'vou', 'que', 'de', 'as', 'às', 'horas', 'hora', 'amanhã', 'hoje']) || 'Compromisso';
      return { tipo: 'compromisso', titulo, data: dt ? dt.data : iso(hoje), hora: hr ? hr.hora : '', valor: val ? val.valor : null };
    }

    // CONTA A PAGAR (vencimento)
    if (ehConta && !/\b(paguei|gastei)\b/.test(t)) {
      const diaM = t.match(/\bdia\s+(\d{1,2})\b/);
      const dia = diaM ? +diaM[1] : (dt ? +dt.data.slice(8, 10) : null);
      const nome = limparDescricao(original, [val && val.trecho, dt && dt.trecho, diaM && diaM[0], 'conta de', 'conta do', 'conta da', 'conta', 'boleto', 'fatura', 'vence', 'vencimento', 'todo', 'mes', 'mês', 'mensal', 'cadastra', 'cadastrar', 'nova', 'tenho', 'que', 'pagar', 'valor']) || 'Conta';
      const recorrente = !/\b(so esse mes|uma vez|unica)\b/.test(t);
      return { tipo: 'conta', nome, valor: val ? val.valor : 0, dia: dia || hoje.getDate(), cat: adivinharCategoria(t + ' ' + sem(nome), opts.categorias) === 'Outros' ? 'Contas da Casa' : adivinharCategoria(t + ' ' + sem(nome), opts.categorias), recorrente, vencimento: dt && !diaM ? dt.data : null };
    }

    if (!val) {
      if (/\bpaguei\b/.test(t)) return { tipo: 'pagar_conta', chave: t, data: dt ? dt.data : iso(hoje) };
      return { tipo: 'desconhecido', texto: original };
    }

    // PARCELADO
    const parc = t.match(/\b(?:em\s*)?(\d{1,2})\s*(?:x|vezes|parcelas)\b(?:\s*de\s*(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?))?/);
    if (parc && +parc[1] > 1) {
      const n = +parc[1];
      let vp;
      if (parc[2]) vp = parseFloat(parc[2].replace(',', '.'));
      else vp = Math.round((val.valor / n) * 100) / 100;
      const desc = limparDescricao(original, [parc[0], val.trecho, dt && dt.trecho, 'parcelado', 'parcelada', 'vezes']) || 'Compra parcelada';
      const cardP = detectarCartao(t, opts.cartoes, true);
      const descP = cardP && cardP.trecho ? limparDescricao(original, [parc[0], val.trecho, dt && dt.trecho, cardP.trecho, 'parcelado', 'parcelada', 'vezes', 'banco']) || 'Compra parcelada' : desc;
      return { tipo: 'parcelado', desc: descP, valorParcela: vp, n, cat: adivinharCategoria(t, opts.categorias), inicio: mesDe(dt ? dt.data : iso(hoje)), data: dt ? dt.data : iso(hoje), cartao: cardP && !cardP.semBanco ? cardP : null };
    }

    // GASTO (padrão)
    const card = detectarCartao(t, opts.cartoes, false);
    const tSemBanco = card && card.trecho ? t.replace(new RegExp('\\b' + card.trecho + '\\b', 'g'), ' ') : t;
    const cat = adivinharCategoria(tSemBanco, opts.categorias);
    const desc = limparDescricao(original, [val.trecho, dt && dt.trecho, card && card.trecho, 'no cartão', 'no crédito', 'no débito', 'no pix', 'paguei', 'pago', 'banco', 'do', 'da']) || cat;
    return { tipo: 'gasto', valor: val.valor, desc, cat, data: dt ? dt.data : iso(hoje), pagamento: card ? 'Cartão' : pagamento(t), cartao: card && !card.semBanco ? card : null, cartaoSemBanco: !!(card && card.semBanco), paguei: /\bpaguei\b/.test(t) && !card, chave: t };
  }

  // ------------------------------------------------------------ estado padrão
  function estadoVazio() {
    return {
      versao: 2,
      perfil: { nome: '', whatsapp: '', orcamento: 0, saldoInicial: 0, lembreteHora: '08:00', ticket: false, tema: 'auto', criadoEm: new Date().toISOString() },
      categorias: CATEGORIAS.map((c) => ({ nome: c.nome, emoji: c.emoji, cor: c.cor, limite: 0 })),
      lancamentos: [], contas: [], parcelados: [], cartoes: [], anuais: [], sonhos: [{ id: uid(), nome: 'Reserva de emergência', emoji: '🛟', custo: 0, prazo: '', guardadoAntes: 0, aportes: [], upd: Date.now() }],
      dividas: [], agenda: [], excluidos: [], chat: []
    };
  }

  // ------------------------------------------------------------- aplicar ação
  /** Aplica a ação interpretada ao estado. Retorna { ok, msg, item, colecao }. */
  // ------------------------------------------------------------------ limites
  const LIMITE_VALOR = 99000000;
  const LIMITE_TEXTO = 150;
  const CAMPOS_VALOR = ['valor', 'custo', 'limite', 'saldo', 'parcela', 'guardadoAntes', 'orcamento', 'saldoInicial', 'pago'];
  /** Corta textos em 150 caracteres e prende valores entre -99 milhões e 99 milhões (em qualquer item). */
  function sanearItem(o, prof) {
    if (!o || typeof o !== 'object' || (prof || 0) > 4) return o;
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === 'string' && k !== 'id' && k !== 'txt') o[k] = v.slice(0, LIMITE_TEXTO);
      else if (typeof v === 'number' && CAMPOS_VALOR.includes(k)) o[k] = !isFinite(v) ? 0 : Math.max(-LIMITE_VALOR, Math.min(LIMITE_VALOR, Math.round(v * 100) / 100));
      else if (v && typeof v === 'object') sanearItem(v, (prof || 0) + 1);
    }
    return o;
  }
  function sanearEstado(estado) {
    if (!estado || typeof estado !== 'object') return estado;
    for (const col of ['lancamentos', 'contas', 'parcelados', 'cartoes', 'anuais', 'sonhos', 'dividas', 'agenda', 'categorias']) if (Array.isArray(estado[col])) estado[col].forEach((x) => sanearItem(x));
    if (estado.perfil) sanearItem(estado.perfil);
    if (Array.isArray(estado.chat)) estado.chat = estado.chat.slice(-200).map((m) => ({ de: m.de === 'me' ? 'me' : 'bot', txt: String(m.txt || '').slice(0, 4000), em: +m.em || 0 }));
    return estado;
  }

  function aplicar(estado, acao, opts) {
    opts = opts || {};
    for (const k of ['valor', 'valorParcela']) if (acao && typeof acao[k] === 'number' && Math.abs(acao[k]) > LIMITE_VALOR) return { ok: false, msg: '🙈 O valor máximo é R$ 99.000.000,00. Confere o valor pra mim?' };
    for (const k of ['desc', 'titulo', 'nome', 'termo']) if (acao && typeof acao[k] === 'string') acao[k] = acao[k].slice(0, LIMITE_TEXTO);
    const origem = opts.origem || 'app';
    const hoje = opts.hoje || new Date();
    const now = Date.now();
    const nomeP = (estado.perfil && estado.perfil.nome ? estado.perfil.nome.split(/\s|,|e\s/)[0] : '');
    const catInfo = (n) => (estado.categorias || []).find((c) => c.nome === n) || CATEGORIAS.find((c) => c.nome === n) || { emoji: '✨' };
    switch (acao.tipo) {
      case 'pagar_conta': {
        const c = acharConta(estado, acao.chave);
        if (!c) return { ok: false, msg: 'Não encontrei essa conta cadastrada. 🤔 Me diga o valor, ex.: "paguei 120 de luz".' };
        const ym = mesDe(acao.data || iso(hoje)); c.pagos = c.pagos || {}; c.pagos[ym] = true; c.upd = now;
        return { ok: true, item: c, colecao: 'contas', msg: `✅ Marquei *${c.nome}* (${brl(c.valor)}) como paga em ${nomeMes(ym)}. Uma preocupação a menos! 😌` };
      }
      case 'gasto': {
        if (acao.paguei) {
          const c = acharConta(estado, acao.chave);
          if (c) { const ym = mesDe(acao.data); c.pagos = c.pagos || {}; c.pagos[ym] = true; if (acao.valor) c.valor = acao.valor; c.upd = now; return { ok: true, item: c, colecao: 'contas', msg: `✅ Conta *${c.nome}* paga: ${brl(c.valor)} em ${nomeMes(ym)}. Uma preocupação a menos! 😌` }; }
        }
        const cc = garantirCartao(estado, acao.cartao);
        const item = { id: uid(), tipo: 'gasto', data: acao.data, desc: acao.desc, cat: acao.cat, valor: acao.valor, pago: !cc && acao.pagamento !== 'Cartão', pagamento: cc ? 'Cartão' : (acao.pagamento || ''), cartaoId: cc ? cc.id : undefined, origem, upd: now };
        estado.lancamentos.push(item);
        let txtCartao = '';
        if (cc) { const f = fatura(estado, cc.id, mesFatura(cc, acao.data), hoje); txtCartao = `\n💳 Lançado no cartão *${cc.nome}* — fatura de ${mesCurto(f.ym)}: ${brl(f.total)}.`; }
        else if (acao.pagamento && acao.pagamento !== 'Cartão') txtCartao = `\n✅ Pago no ${acao.pagamento === 'Dinheiro' ? 'dinheiro' : acao.pagamento} — já saiu do seu saldo do mês.`;
        else if (acao.cartaoSemBanco) txtCartao = (estado.cartoes || []).length ? `\n💳 Em qual cartão? Diga, por ex.: "no cartão ${(estado.cartoes[0] || {}).nome}".` : '\n💳 Dica: diga o banco ("cartão de crédito Itaú") que eu separo por cartão.';
        const r = resumoMes(estado, mesDe(acao.data));
        let extra = '';
        if (r.orcamento > 0) {
          if (r.pctOrcamento >= 1) extra = `\n⚠️ Atenção: você passou do orçamento do mês (${Math.round(r.pctOrcamento * 100)}%). Vamos segurar um pouquinho? 💛`;
          else if (r.pctOrcamento >= 0.85) extra = `\n🟡 Você já usou ${Math.round(r.pctOrcamento * 100)}% do orçamento. Faltam ${brl(r.orcamento - r.gastoTotal)}.`;
          else extra = `\n✅ Orçamento sob controle: ${Math.round(r.pctOrcamento * 100)}% usado.`;
        }
        const lim = catInfo(acao.cat).limite;
        if (lim > 0) { const g = r.porCategoria[acao.cat] || 0; if (g > lim) extra += `\n🔔 ${acao.cat} passou do limite de ${brl(lim)}.`; }
        return { ok: true, item, colecao: 'lancamentos', msg: `${catInfo(acao.cat).emoji} Anotado! ${brl(acao.valor)} em *${acao.cat}*${acao.desc && acao.desc !== acao.cat ? ` (${acao.desc})` : ''} — ${dataBR(acao.data)}.${txtCartao}${extra}` };
      }
      case 'entrada': {
        const item = { id: uid(), tipo: 'entrada', data: acao.data, desc: acao.desc, cat: acao.cat, valor: acao.valor, pago: true, origem, upd: now };
        estado.lancamentos.push(item);
        return { ok: true, item, colecao: 'lancamentos', msg: `💰 Que notícia boa${nomeP ? ', ' + nomeP : ''}! Entrada de ${brl(acao.valor)} (${acao.cat}) registrada.` };
      }
      case 'parcelado': {
        const cc = garantirCartao(estado, acao.cartao);
        const inicio = cc && acao.data ? mesFatura(cc, acao.data) : acao.inicio;
        const item = { id: uid(), desc: acao.desc, cat: acao.cat, valor: acao.valorParcela, n: acao.n, inicio, cartaoId: cc ? cc.id : undefined, origem, upd: now };
        estado.parcelados.push(item);
        return { ok: true, item, colecao: 'parcelados', msg: `🛍️ Compra parcelada anotada: ${acao.desc} — ${acao.n}x de ${brl(acao.valorParcela)} a partir de ${mesCurto(inicio)}${cc ? ` no cartão *${cc.nome}*` : ''}. As parcelas entram sozinhas nos meses certos.${cc ? '' : '\n💳 Dica: diga o cartão ("em 10x no cartão Nubank") que eu separo por cartão.'}` };
      }
      case 'config_cartao': {
        const cc = garantirCartao(estado, acao.cartao && !acao.cartao.semBanco ? acao.cartao : null) || ((estado.cartoes || []).length === 1 ? estado.cartoes[0] : null);
        if (!cc) return { ok: false, msg: 'De qual cartão? Ex.: "a fatura do Itaú vence dia 10 e fecha dia 3".' };
        if (acao.diaVenc) cc.diaVenc = acao.diaVenc; if (acao.fechamento) cc.fechamento = acao.fechamento; cc.upd = now;
        return { ok: true, item: cc, colecao: 'cartoes', msg: `💳 Cartão *${cc.nome}*: vence dia ${cc.diaVenc}${cc.fechamento ? `, fecha dia ${cc.fechamento}` : ''}. Vou te lembrar da fatura 1 dia antes e no dia. 💙` };
      }
      case 'pagar_fatura': case 'ver_fatura': {
        const cartoes = estado.cartoes || [];
        if (!cartoes.length) return { ok: false, msg: '💳 Você ainda não tem cartões cadastrados. Lance um gasto assim: "gastei 50 no mercado no cartão de crédito Itaú" que eu crio o cartão.' };
        const cc = acao.cartao && acao.cartao.id ? cartoes.find((c) => c.id === acao.cartao.id) : cartoes.length === 1 ? cartoes[0] : null;
        if (!cc) {
          if (acao.tipo === 'ver_fatura') return { ok: true, msg: '💳 *Faturas de ' + nomeMes(acao.ym) + '*\n' + cartoes.map((c) => { const f = fatura(estado, c.id, acao.ym, hoje); return `• ${c.nome}: ${brl(f.total)} — ${rotuloFatura(f)}`; }).join('\n') };
          return { ok: false, msg: 'Qual cartão? 🤔 ' + cartoes.map((c) => c.nome).join(', ') + '.\nEx.: "paguei a fatura do ' + cartoes[0].nome + '"' };
        }
        const f = fatura(estado, cc.id, acao.ym, hoje);
        if (acao.tipo === 'ver_fatura') return { ok: true, msg: `💳 *Fatura ${cc.nome} — ${nomeMes(acao.ym)}*\nTotal: ${brl(f.total)}${f.anterior ? ` (inclui ${brl(f.anterior)} do mês anterior)` : ''}\nVence dia ${f.venc.slice(8)} · ${rotuloFatura(f)}${f.situacao === 'parcial' ? `\nPago ${brl(f.pago)} · falta ${brl(f.falta)}` : ''}\n\nQuando pagar, me diga: "paguei a fatura do ${cc.nome}" ou "paguei 500 da fatura do ${cc.nome}".` };
        const parcial = acao.parcial && acao.valor != null && acao.valor < f.total - 0.005;
        pagarFatura(estado, cc.id, acao.ym, parcial ? 'parcial' : 'total', acao.valor);
        const f2 = fatura(estado, cc.id, acao.ym, hoje);
        if (parcial) return { ok: true, item: cc, colecao: 'cartoes', msg: `💳 Pagamento parcial registrado na fatura *${cc.nome}* de ${mesCurto(acao.ym)}: pago ${brl(f2.pago)} de ${brl(f2.total)}.\n⚠️ Ficou faltando ${brl(f2.falta)} — vai aparecer na próxima fatura. Cuidado com os juros do rotativo! 💛` };
        return { ok: true, item: cc, colecao: 'cartoes', msg: `✅ Fatura *${cc.nome}* de ${mesCurto(acao.ym)} paga: ${brl(f2.total)}. Uma preocupação a menos! 😌` };
      }
      case 'conta': {
        const existente = estado.contas.find((c) => sem(c.nome) === sem(acao.nome));
        if (existente) { existente.valor = acao.valor || existente.valor; existente.dia = acao.dia; existente.upd = now; return { ok: true, item: existente, colecao: 'contas', msg: `🗓️ Atualizei a conta *${existente.nome}*: vence todo dia ${existente.dia}${existente.valor ? ', ' + brl(existente.valor) : ''}. Vou te lembrar um dia antes e no dia. 😉` }; }
        const item = { id: uid(), nome: acao.nome, cat: acao.cat, valor: acao.valor, dia: acao.dia, recorrente: acao.recorrente !== false, mesUnico: acao.recorrente === false ? mesDe(acao.vencimento || iso(hoje)) : '', pagos: {}, origem, upd: now };
        estado.contas.push(item);
        return { ok: true, item, colecao: 'contas', msg: `🗓️ Conta cadastrada: *${acao.nome}*${acao.valor ? ' — ' + brl(acao.valor) : ''}, vence dia ${acao.dia}. Pode deixar que eu te lembro um dia antes e no dia do vencimento. 💙` };
      }
      case 'compromisso': {
        const item = { id: uid(), titulo: acao.titulo, data: acao.data, hora: acao.hora || '', lembrar: true, feito: false, origem, upd: now };
        estado.agenda.push(item);
        return { ok: true, item, colecao: 'agenda', msg: `📌 Compromisso anotado: *${acao.titulo}* — ${dataBR(acao.data)}${acao.hora ? ' às ' + acao.hora : ''}. Eu te lembro no dia${acao.hora ? ' e 1 hora antes' : ''}! ⏰` };
      }
      case 'resgate': {
        const sonhos = estado.sonhos || [];
        if (!sonhos.length) return { ok: false, msg: 'Você ainda não tem sonhos cadastrados. Crie um na aba ⭐ Sonhos!' };
        const s = acharSonho(sonhos, acao.termo) || (sonhos.length === 1 ? sonhos[0] : null);
        if (!s) return { ok: false, msg: 'De qual cofrinho você quer retirar? 🤔 Seus sonhos: ' + sonhos.map((x) => x.nome).join(', ') + '.\nEx.: "retire 500 da ' + sonhos[0].nome + ' e coloque como renda"' };
        const saldo = totalSonho(s);
        if (acao.valor > saldo + 0.005) return { ok: false, msg: saldo > 0 ? `💛 Em *${s.nome}* só tem ${brl(saldo)} guardados. Quer retirar esse valor?` : `💛 *${s.nome}* ainda não tem nada guardado.` };
        const destino = acao.destino ? acharSonho(sonhos, acao.destino) : null;
        const res = retirarDoSonho(estado, s, acao.valor, { data: acao.data, destino, renda: acao.renda && !destino, origem });
        if (destino) return { ok: true, item: s, colecao: 'sonhos', msg: `🔁 Transferi ${brl(acao.valor)} de *${s.nome}* para *${destino.nome}*.\n${s.emoji || '⭐'} ${s.nome}: ${brl(totalSonho(s))}\n${destino.emoji || '⭐'} ${destino.nome}: ${brl(totalSonho(destino))}` };
        return { ok: true, item: res.entrada || s, colecao: res.entrada ? 'lancamentos' : 'sonhos', msg: `💸 Retirei ${brl(acao.valor)} de *${s.nome}*${res.entrada ? ' e lancei como renda do mês' : ''}.\n${s.emoji || '⭐'} Ficaram ${brl(totalSonho(s))} guardados${s.custo ? ` (${Math.round(totalSonho(s) / s.custo * 100)}% do sonho)` : ''}.\n${/reserva|emergencia/.test(sem(s.nome)) ? 'Tudo bem usar a reserva quando precisa, é pra isso que ela existe. Depois a gente repõe juntos! 💙' : 'Quando der, a gente repõe juntos! 💙'}` };
      }
      case 'sonho': {
        estado.sonhos = estado.sonhos || [];
        const sonhos = estado.sonhos;
        let s = acao.sonhoId ? sonhos.find((x) => x.id === acao.sonhoId) : acharSonho(sonhos, acao.termo);
        let criado = false;
        if (!s && acao.termo && !acao.sonhoId) {
          const nome = acao.termo.split(' ').map((p, i) => i === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p).join(' ');
          s = { id: uid(), nome, emoji: acao.investir ? '📈' : '⭐', custo: 0, prazo: '', guardadoAntes: 0, aportes: [], upd: now };
          sonhos.push(s); criado = true;
        }
        if (!s) {
          const pergunta = { tipo: 'sonho', valor: acao.valor, data: acao.data, investir: !!acao.investir, em: now };
          return { ok: false, pergunta, msg: `💛 Onde você quer ${acao.investir ? 'investir' : 'guardar'} ${brl(acao.valor)}?\n` + sonhos.map((x, i) => `${i + 1}. ${x.emoji || '⭐'} ${x.nome}`).join('\n') + `\n\nResponda o *número*${sonhos.length ? '' : ''} ou o *nome de um sonho novo* (ex.: "Viagem para a praia").` };
        }
        s.aportes = s.aportes || []; s.aportes.push({ id: uid(), data: acao.data, valor: acao.valor }); s.upd = now;
        const tot = totalSonho(s);
        const pct = s.custo ? Math.min(100, Math.round((tot / s.custo) * 100)) : 0;
        return { ok: true, item: s, colecao: 'sonhos', msg: `${criado ? `🌈 Criei o sonho *${s.nome}* para você!\n` : ''}⭐ Uhuul! ${brl(acao.valor)} ${acao.investir ? 'investidos' : 'guardados'} em *${s.nome}*.${s.custo ? ` Você já está em ${pct}% do caminho (${brl(tot)} de ${brl(s.custo)}).` : ''} Cada passo conta! 🚀` };
      }
      case 'excluir': {
        if (acao.alvo === 'agenda') {
          const cand = estado.agenda.filter((a) => !acao.termo || acao.termo.split(' ').some((p) => p.length > 2 && sem(a.titulo).includes(p)));
          const a = cand.sort((x, y) => (y.upd || 0) - (x.upd || 0))[0];
          if (!a) return { ok: false, msg: 'Não encontrei esse compromisso. 🤔' };
          remover(estado, 'agenda', a.id);
          return { ok: true, removido: a, colecao: 'agenda', msg: `🗑️ Compromisso *${a.titulo}* removido.` };
        }
        if (acao.alvo === 'conta') {
          const c = estado.contas.find((x) => acao.termo && acao.termo.split(' ').some((p) => p.length > 2 && sem(x.nome).includes(p)));
          if (!c) return { ok: false, msg: 'Não encontrei essa conta. 🤔' };
          remover(estado, 'contas', c.id);
          return { ok: true, removido: c, colecao: 'contas', msg: `🗑️ Conta *${c.nome}* removida.` };
        }
        const termos = (acao.termo || '').split(' ').filter((p) => p.length > 2 && !['gasto', 'lancamento', 'ultimo', 'valor', 'reais', 'aquele', 'esse'].includes(p));
        let cand = estado.lancamentos.slice();
        if (acao.valor != null) cand = cand.filter((l) => Math.abs(l.valor - acao.valor) < 0.005);
        if (acao.data) cand = cand.filter((l) => l.data === acao.data);
        if (termos.length) {
          const c2 = cand.filter((l) => termos.some((p) => sem(l.desc + ' ' + l.cat).includes(p)));
          if (c2.length || acao.valor == null) cand = c2;
        }
        if (!cand.length) return { ok: false, msg: `Não encontrei esse lançamento${acao.valor != null ? ' de ' + brl(acao.valor) : ''}. Confere pra mim? 🤔` };
        const l = cand.sort((a, b) => (b.upd || 0) - (a.upd || 0))[0];
        remover(estado, 'lancamentos', l.id);
        return { ok: true, removido: l, colecao: 'lancamentos', msg: `🗑️ Prontinho! Excluí ${l.tipo === 'entrada' ? 'a entrada' : 'o gasto'} de ${brl(l.valor)} (${l.desc || l.cat}, ${dataBR(l.data)}).` };
      }
      case 'desfazer': {
        const todos = [];
        for (const col of ['lancamentos', 'agenda', 'contas', 'parcelados']) for (const it of estado[col] || []) if (it.origem === origem || !opts.soOrigem) todos.push({ col, it });
        todos.sort((a, b) => (b.it.upd || 0) - (a.it.upd || 0));
        const u = todos[0];
        if (!u) return { ok: false, msg: 'Não há nada para desfazer. 🙂' };
        remover(estado, u.col, u.it.id);
        return { ok: true, removido: u.it, colecao: u.col, msg: `↩️ Desfeito: ${u.it.desc || u.it.titulo || u.it.nome}${u.it.valor ? ' (' + brl(u.it.valor) + ')' : ''}.` };
      }
      case 'resumo': return { ok: true, msg: textoResumo(estado, mesDe(iso(hoje)), hoje) };
      case 'contas_pendentes': return { ok: true, msg: textoContas(estado, hoje) };
      case 'agenda_hoje': return { ok: true, msg: textoAgenda(estado, hoje) };
      case 'ajuda': return { ok: true, msg: textoAjuda(estado) };
      default: return { ok: false, msg: 'Hmm, não entendi direitinho. 🙈 Tente assim:\n• "gastei 35 reais na padaria"\n• "conta de luz vence dia 10, 120 reais"\n• "dentista amanhã às 15h"\n• "exclui o gasto de 35"\n• "resumo"' };
    }
  }

  function acharConta(estado, chave) {
    const t = ' ' + sem(chave) + ' ';
    let melhor = null, pts = 0;
    for (const c of estado.contas || []) {
      const ps = sem(c.nome).split(/\s+/).filter((p) => p.length > 2 && !['conta', 'apto', 'casa', 'das', 'dos', 'para'].includes(p));
      const n = ps.filter((p) => t.includes(' ' + p)).length;
      if (n > pts) { pts = n; melhor = c; }
    }
    return melhor;
  }
  function rotuloFatura(f) { return { paga: '✅ Paga', parcial: '🟡 Paga parcialmente', vencida: '🔴 Vencida', aberta: '⏳ Em aberto', vazia: 'Sem compras' }[f.situacao]; }
  function remover(estado, col, id) {
    if (col === 'lancamentos') {
      const l = (estado.lancamentos || []).find((x) => x.id === id);
      if (l && l.sonhoId) { const sn = (estado.sonhos || []).find((x) => x.id === l.sonhoId); if (sn) { sn.aportes = (sn.aportes || []).filter((ap) => ap.entradaId !== id); sn.upd = Date.now(); } }
    }
    estado[col] = (estado[col] || []).filter((x) => x.id !== id);
    estado.excluidos = estado.excluidos || [];
    estado.excluidos.push({ id, col, em: Date.now() });
    if (estado.excluidos.length > 2000) estado.excluidos = estado.excluidos.slice(-2000);
  }

  const dataBR = (d) => { if (!d) return ''; const [y, m, dd] = d.split('-'); return dd + '/' + m + (y && +y !== new Date().getFullYear() ? '/' + y : ''); };
  const PARADAS = ['para', 'pra', 'pro', 'meu', 'minha', 'nosso', 'nossa', 'sonho', 'cofrinho', 'caixinha', 'familia', 'com', 'das', 'dos', 'nas', 'nos'];
  /** Encontra o sonho citado no texto ("reserva de emergência", "viagem"…). */
  function acharSonho(sonhos, texto) {
    const t = ' ' + sem(texto || '') + ' ';
    let melhor = null, pts = 0;
    for (const s of sonhos || []) {
      const nome = sem(s.nome);
      let n = t.includes(' ' + nome + ' ') ? 10 : 0;
      n += nome.split(/[^a-z0-9]+/).filter((p) => p.length > 2 && !PARADAS.includes(p) && t.includes(' ' + p.slice(0, Math.max(4, p.length - 2)))).length;
      if (n > pts) { pts = n; melhor = s; }
    }
    return melhor;
  }
  /** Tira dinheiro de um sonho; opcionalmente lança como renda ou manda para outro sonho. */
  function retirarDoSonho(estado, s, valor, o) {
    o = o || {};
    const data = o.data || iso(new Date());
    const now = Date.now();
    const ap = { id: uid(), data, valor: -Math.abs(valor), resgate: true };
    let entrada = null;
    if (o.destino) {
      ap.transferencia = true; ap.para = o.destino.id;
      o.destino.aportes = o.destino.aportes || [];
      o.destino.aportes.push({ id: uid(), data, valor: Math.abs(valor), transferencia: true, de: s.id }); o.destino.upd = now;
    } else if (o.renda !== false) {
      entrada = { id: uid(), tipo: 'entrada', data, desc: 'Resgate: ' + s.nome, cat: 'Resgate de sonho', valor: Math.abs(valor), pago: true, origem: o.origem || 'app', sonhoId: s.id, upd: now };
      estado.lancamentos.push(entrada); ap.entradaId = entrada.id;
    }
    s.aportes = s.aportes || []; s.aportes.push(ap); s.upd = now;
    return { aporte: ap, entrada };
  }
  const contaNoGuardado = (x) => !x.resgate && !x.transferencia;
  const totalSonho = (s) => (Number(s.guardadoAntes) || 0) + (s.aportes || []).reduce((a, b) => a + (Number(b.valor) || 0), 0);

  // ----------------------------------------------------------------- cálculos
  function parcelaNoMes(p, ym) {
    const k = difMeses(p.inicio, ym);
    return k >= 0 && k < p.n ? k + 1 : 0;
  }
  function contaNoMes(c, ym) { return c.recorrente !== false ? (!c.desde || c.desde <= ym) && (!c.ate || c.ate >= ym) : c.mesUnico === ym; }

  function resumoMes(estado, ym) {
    const L = (estado.lancamentos || []).filter((l) => mesDe(l.data) === ym);
    const entradas = L.filter((l) => l.tipo === 'entrada').reduce((a, b) => a + b.valor, 0);
    const gastosDia = L.filter((l) => l.tipo === 'gasto' && !l.ticket).reduce((a, b) => a + b.valor, 0);
    const ticketGasto = L.filter((l) => l.tipo === 'gasto' && l.ticket).reduce((a, b) => a + b.valor, 0);
    const contas = (estado.contas || []).filter((c) => contaNoMes(c, ym));
    const fixas = contas.reduce((a, b) => a + (Number(b.valor) || 0), 0);
    const fixasPagas = contas.filter((c) => c.pagos && c.pagos[ym]).reduce((a, b) => a + (Number(b.valor) || 0), 0);
    const parcs = (estado.parcelados || []).map((p) => ({ p, k: parcelaNoMes(p, ym) })).filter((x) => x.k);
    const parcelas = parcs.reduce((a, b) => a + b.p.valor, 0);
    const guardado = (estado.sonhos || []).reduce((a, s) => a + (s.aportes || []).filter((x) => mesDe(x.data) === ym && contaNoGuardado(x)).reduce((q, w) => q + (Number(w.valor) || 0), 0), 0);
    const anuaisMes = (estado.anuais || []).filter((a) => +a.mes === +ym.slice(5, 7));
    const gastoTotal = gastosDia + fixas + parcelas;
    const sobraAntes = entradas - gastoTotal;
    const sobra = sobraAntes - guardado;
    const porCategoria = {};
    L.filter((l) => l.tipo === 'gasto').forEach((l) => { porCategoria[l.cat] = (porCategoria[l.cat] || 0) + l.valor; });
    contas.forEach((c) => { porCategoria[c.cat] = (porCategoria[c.cat] || 0) + (Number(c.valor) || 0); });
    parcs.forEach((x) => { porCategoria[x.p.cat] = (porCategoria[x.p.cat] || 0) + x.p.valor; });
    const orcamento = Number(estado.perfil && estado.perfil.orcamento) || entradas;
    const _ym = ym;
    // saldo acumulado
    let saldoAcum = Number(estado.perfil && estado.perfil.saldoInicial) || 0;
    const meses = mesesComDados(estado);
    for (const m of meses) { if (m > ym) break; if (m === ym) continue; const r = resumoSimples(estado, m); saldoAcum += r; }
    saldoAcum += sobra;
    const maior = Object.entries(porCategoria).sort((a, b) => b[1] - a[1])[0];
    return {
      ym, entradas, gastosDia, ticketGasto, fixas, fixasPagas, parcelas, parcs, contas, guardado, gastoTotal, sobraAntes, sobra, saldoAcum, porCategoria, orcamento,
      pctOrcamento: orcamento > 0 ? gastoTotal / orcamento : 0, pctGuardado: entradas > 0 ? guardado / entradas : 0,
      maiorCategoria: maior ? { nome: maior[0], valor: maior[1] } : null, anuaisMes, lancamentos: L,
      // dinheiro que já saiu de fato: gastos pagos (dinheiro, pix, débito), contas pagas, faturas pagas e o que foi guardado
      jaSaiu: (() => { const g = L.filter((l) => l.tipo === 'gasto' && !l.ticket && !l.cartaoId && l.pagamento !== 'Cartão').reduce((a, b) => a + b.valor, 0); const fat = (estado.cartoes || []).reduce((a, c) => { const f = fatura(estado, c.id, ym); return a + (f ? f.pago : 0); }, 0); const parcSem = parcs.filter((x) => !x.p.cartaoId && x.p.pagos && x.p.pagos[ym]).reduce((a, b) => a + b.p.valor, 0); return g + fixasPagas + fat + parcSem + guardado; })()
    };
  }
  function resumoSimples(estado, ym) {
    const L = (estado.lancamentos || []).filter((l) => mesDe(l.data) === ym);
    const e = L.filter((l) => l.tipo === 'entrada').reduce((a, b) => a + b.valor, 0);
    const g = L.filter((l) => l.tipo === 'gasto' && !l.ticket).reduce((a, b) => a + b.valor, 0);
    const f = (estado.contas || []).filter((c) => contaNoMes(c, ym)).reduce((a, b) => a + (Number(b.valor) || 0), 0);
    const p = (estado.parcelados || []).filter((x) => parcelaNoMes(x, ym)).reduce((a, b) => a + b.valor, 0);
    const s = (estado.sonhos || []).reduce((a, q) => a + (q.aportes || []).filter((x) => mesDe(x.data) === ym && contaNoGuardado(x)).reduce((z, w) => z + (Number(w.valor) || 0), 0), 0);
    return e - g - f - p - s;
  }
  function mesesComDados(estado) {
    const set = new Set();
    (estado.lancamentos || []).forEach((l) => set.add(mesDe(l.data)));
    (estado.sonhos || []).forEach((s) => (s.aportes || []).forEach((a) => set.add(mesDe(a.data))));
    return Array.from(set).sort();
  }

  /** Contas a vencer nos próximos `dias` dias (inclui hoje). */
  function contasAVencer(estado, hoje, dias) {
    const out = [];
    const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    for (let i = -0; i <= dias; i++) {
      const d = new Date(base); d.setDate(d.getDate() + i);
      const ym = iso(d).slice(0, 7);
      const ultimo = diasNoMes(ym);
      for (const c of estado.contas || []) {
        if (!contaNoMes(c, ym)) continue;
        const dia = Math.min(+c.dia, ultimo);
        if (dia === d.getDate() && !(c.pagos && c.pagos[ym])) out.push({ conta: c, data: iso(d), emDias: i, ym });
      }
      for (const p of estado.parcelados || []) { /* cartão: lembrado pela fatura */ }
    }
    return out;
  }
  function contasAtrasadas(estado, hoje) {
    const ym = iso(hoje).slice(0, 7);
    return (estado.contas || []).filter((c) => contaNoMes(c, ym) && !(c.pagos && c.pagos[ym]) && Math.min(+c.dia, diasNoMes(ym)) < hoje.getDate());
  }

  // -------------------------------------------------------- textos (WhatsApp)
  function textoResumo(estado, ym, hoje) {
    const r = resumoMes(estado, ym);
    const nome = estado.perfil && estado.perfil.nome ? estado.perfil.nome : '';
    let s = `📊 *Resumo de ${nomeMes(ym)}*${nome ? ' — ' + nome : ''}\n\n💰 Entrou: ${brl(r.entradas)}\n🛒 Gastos: ${brl(r.gastoTotal)}\n   • Contas fixas: ${brl(r.fixas)}\n   • Dia a dia: ${brl(r.gastosDia)}\n   • Parcelas: ${brl(r.parcelas)}\n⭐ Guardei p/ sonhos: ${brl(r.guardado)}\n✅ Sobrou: ${brl(r.sobra)}`;
    if (r.maiorCategoria) s += `\n🔝 Maior gasto: ${r.maiorCategoria.nome} (${brl(r.maiorCategoria.valor)})`;
    if (r.orcamento > 0) s += `\n\n${barra(r.pctOrcamento)} ${Math.round(r.pctOrcamento * 100)}% do orçamento`;
    s += '\n\n' + mensagemHumor(r);
    return s;
  }
  function textoContas(estado, hoje) {
    const prox = contasAVencer(estado, hoje, 7);
    const atras = contasAtrasadas(estado, hoje);
    if (!prox.length && !atras.length) return '🎉 Nenhuma conta para os próximos 7 dias. Aproveite a tranquilidade!';
    let s = '🗓️ *Contas a pagar*\n';
    if (atras.length) s += '\n⚠️ Atrasadas:\n' + atras.map((c) => `• ${c.nome} — ${brl(c.valor)} (dia ${c.dia})`).join('\n') + '\n';
    if (prox.length) s += '\n' + prox.map((x) => `• ${x.emDias === 0 ? '*HOJE*' : x.emDias === 1 ? '*Amanhã*' : dataBR(x.data)} — ${x.conta.nome}: ${brl(x.conta.valor)}`).join('\n');
    s += '\n\nQuando pagar, me diga: "paguei a conta de luz" ✅';
    return s;
  }
  function textoAgenda(estado, hoje) {
    const h = iso(hoje);
    const it = (estado.agenda || []).filter((a) => a.data === h && !a.feito).sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99'));
    if (!it.length) return '☀️ Nenhum compromisso hoje. Dia livre!';
    return '📌 *Seus compromissos de hoje*\n' + it.map((a) => `• ${a.hora ? a.hora + ' — ' : ''}${a.titulo}`).join('\n');
  }
  function textoAjuda(estado) {
    const n = estado.perfil && estado.perfil.nome ? ', ' + estado.perfil.nome.split(' ')[0] : '';
    return `Oi${n}! 💙 Eu sou o *Sonhaí*, seu parceiro das finanças.\n\nVocê pode me mandar texto ou áudio:\n🛒 "gastei 45,90 no mercado"\n💰 "recebi 3500 de salário"\n🛍️ "comprei uma TV de 2000 em 10x no cartão Nubank"\n💳 "gastei 10 na lanchonete no cartão de crédito Itaú"\n💳 "paguei a fatura do Itaú" • "paguei 500 da fatura do Bradesco"\n🗓️ "conta de luz vence dia 10, 150 reais"\n📌 "dentista quinta às 14h"\n⭐ "guardei 200 para a viagem" • "investi 500"\n💸 "retire 500 da reserva de emergência e coloque como renda"\n🔁 "transfere 300 da reserva para a viagem"\n🗑️ "exclui o gasto de 45,90"\n↩️ "desfazer"\n📊 "resumo" • "contas a pagar" • "agenda"`;
  }
  function barra(p) { const n = Math.max(0, Math.min(10, Math.round(p * 10))); return '🟩'.repeat(Math.min(n, 7)) + (n > 7 ? '🟨'.repeat(Math.min(n - 7, 2)) : '') + (n > 9 ? '🟥' : '') + '⬜'.repeat(10 - n); }
  function mensagemHumor(r) {
    if (r.entradas === 0 && r.gastoTotal === 0) return '🌱 Mês novinho! Comece anotando o que entrou.';
    if (r.orcamento > 0 && r.pctOrcamento >= 1) return '💛 O orçamento estourou este mês. Respira: dá para ajustar! Que tal rever os gastos do dia a dia nos próximos dias?';
    if (r.orcamento > 0 && r.pctOrcamento >= 0.85) return '🟡 Atenção: você está chegando no limite do mês. Segura firme que dá!';
    if (r.sobra > 0 && r.guardado > 0) return '🏆 Parabéns! Você está seguindo o planejado e ainda guardou para os seus sonhos. Orgulho!';
    if (r.sobra > 0) return '👏 Muito bem! O mês está no azul. Que tal separar um pouquinho para um sonho?';
    return '💪 Saiu mais do que entrou até agora. Vamos juntos virar esse jogo!';
  }

  const INCENTIVOS = [
    'Cada real guardado é um tijolinho do seu sonho. Continue! 🧱✨',
    'Sonho com plano vira meta. Meta com constância vira realidade. 🚀',
    'Você não precisa ser perfeito, só constante. Hoje é um ótimo dia para guardar um pouquinho. 💙',
    'Imagine o dia em que esse sonho se realizar... Falta menos do que ontem! 🌈',
    'Pequenas escolhas de hoje, grandes conquistas amanhã. Bora? ⭐',
    'Viver bem e guardar dinheiro andam juntos. Você está no caminho certo! 🌻'
  ];

  // ---------------------------------------------------------------- mesclagem
  const COLECOES = ['lancamentos', 'contas', 'parcelados', 'cartoes', 'anuais', 'sonhos', 'dividas', 'agenda', 'categorias'];
  /** Junta dois estados (celular e servidor) sem perder o que veio do WhatsApp. */
  function mesclar(a, b) {
    if (!a) return b; if (!b) return a;
    const out = JSON.parse(JSON.stringify(a));
    const exc = new Set([...(a.excluidos || []), ...(b.excluidos || [])].map((x) => x.id));
    out.excluidos = Object.values([...(a.excluidos || []), ...(b.excluidos || [])].reduce((m, x) => { m[x.id] = x; return m; }, {})).slice(-2000);
    for (const col of COLECOES) {
      if (col === 'categorias') { out.categorias = (b.perfilUpd || 0) > (a.perfilUpd || 0) ? b.categorias : a.categorias; continue; }
      const mapa = Object.create(null);
      for (const it of [...(a[col] || []), ...(b[col] || [])]) {
        if (!it || !it.id || exc.has(it.id)) continue;
        if (!mapa[it.id] || (it.upd || 0) > (mapa[it.id].upd || 0)) mapa[it.id] = it;
      }
      out[col] = Object.values(mapa);
    }
    if ((b.perfilUpd || 0) > (a.perfilUpd || 0)) { out.perfil = b.perfil; out.perfilUpd = b.perfilUpd; }
    out.chat = (b.chat || a.chat || []).slice(-200);
    return out;
  }

  return {
    CATEGORIAS, TIPOS_ENTRADA, INCENTIVOS, MESES, sem, uid, iso, pad, brl, dataBR, mesDe, nomeMes, mesCurto, somaMes, difMeses, diasNoMes, agora,
    LIMITE_VALOR, LIMITE_TEXTO, sanearEstado, BANCOS, detectarCartao, garantirCartao, mesFatura, fatura, pagarFatura, faturasAVencer, rotuloFatura,
    conversar, interpretar, aplicar, remover, acharSonho, retirarDoSonho, estadoVazio, resumoMes, mesesComDados, parcelaNoMes, contaNoMes, contasAVencer, contasAtrasadas, totalSonho,
    textoResumo, textoContas, textoAgenda, textoAjuda, mensagemHumor, barra, mesclar, adivinharCategoria, extrairValor, extrairData, extrairHora
  };
});
