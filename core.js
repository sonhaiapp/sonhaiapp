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
    { nome: 'Mercado', emoji: '🛒', cor: '#2BB673', chaves: ['mercado', 'supermercado', 'assai', 'atacad', 'atacadao', 'savegnago', 'carrefour', 'feira', 'hortifruti', 'sacolao', 'acougue', 'tonin', 'big compras', 'compras do mes', 'compras'] },
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
  /** Dentro de um número falado, cada parte seguinte precisa ser menor: "cento e vinte e cinco". */
  function podeSeguir(ant, prox) {
    if (ant === 'cem') return false;
    const a = UNID[ant], p = UNID[prox];
    if (a >= 100) return p > 0 && p < 100;
    if (a >= 20) return p > 0 && p < 10;
    return false;
  }
  /** Troca números por extenso por algarismos: "cinquenta e dois reais" -> "52 reais"; "2 mil" -> "2000". */
  function extensoParaNumero(txt) {
    txt = txt.replace(/(\d+(?:[.,]\d{1,3})?)\s*mil\b/g, (_, n) => String(Math.round(parseFloat(n.replace(',', '.')) * 1000)));
    const tokens = txt.split(/(\s+)/);
    const out = []; let i = 0;
    while (i < tokens.length) {
      const w = tokens[i];
      if (UNID[w] !== undefined || w === 'mil') {
        let total = 0, atual = 0, j = i, ultimo = i, achou = false, ant = null;
        while (j < tokens.length) {
          const t = tokens[j];
          if (/^\s+$/.test(t)) { j++; continue; }
          if (UNID[t] !== undefined) {
            if (ant && !podeSeguir(ant, t)) break;
            atual += UNID[t]; achou = true; ultimo = j; ant = t; j++; continue;
          }
          if (t === 'mil') { total += (atual || 1) * 1000; atual = 0; achou = true; ultimo = j; ant = null; j++; continue; }
          if (t === 'e' && achou) {
            let k = j + 1; while (k < tokens.length && /^\s+$/.test(tokens[k])) k++;
            if (k < tokens.length && UNID[tokens[k]] !== undefined && (!ant || podeSeguir(ant, tokens[k]))) { j = k; continue; }
          }
          break;
        }
        // "um"/"uma" sozinhos geralmente são artigos ("um lanche"), menos em "um real"
        const pal = tokens.slice(i, ultimo + 1).join('').trim();
        let k2 = ultimo + 1; while (k2 < tokens.length && /^\s+$/.test(tokens[k2])) k2++;
        const moedaDepois = /^(real|conto|pila)$/.test(tokens[k2] || '');
        if (achou && (!(pal === 'um' || pal === 'uma') || moedaDepois)) { out.push(String(total + atual)); i = ultimo + 1; continue; }
      }
      out.push(w); i++;
    }
    // "2000 e 500" -> 2500 (milhar e o resto)
    return out.join('').replace(/\b(\d{1,3}000)\s+e\s+(\d{1,3})\b(?!\s*(?:x\b|vezes|parcelas?|h\b|horas?|:|\/|centavos?))/g, (_, a, b) => String(+a + +b));
  }

  // -------------------------------------------------------- extração de valor
  /** "1.234,56", "1234.56", "99.90", "1.500" -> número */
  function paraNumero(bruto) {
    let s = String(bruto);
    if (/\.\d{3}/.test(s) && !/,\d{1,2}$/.test(s) && !/\.\d{1,2}$/.test(s)) s = s.replace(/\./g, '');
    else if (/,/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    return parseFloat(s);
  }
  const UNIDADES = /^\s*(kgs?|quilos?|kilos?|gramas?|litros?|lts?|ml|pessoas?|unidades?|unid|metros?|km|duzias?)\b/;
  // o que costuma vir logo depois de um preço; outra palavra indica quantidade ("2 camisas")
  const LIGACAO = /^\s*($|[,.;!?]|\d|(de|do|da|dos|das|no|na|nos|nas|em|para|pra|pro|com|por|ao|a|o|e|hoje|ontem|anteontem|amanha|agora|dia)\b)/;
  function extrairValor(t) {
    // "45 reais e 90 centavos" / "52 reais e 90"
    let m = t.match(/(\d+)\s*(?:reais|real|contos?)\s*e\s*(\d{1,2})\s*centavos?/);
    if (m) return { valor: +m[1] + (+m[2]) / 100, trecho: m[0], moeda: true };
    m = t.match(/(\d+)\s*(?:reais|real)\s*e\s*(\d{2})\b/);
    if (m && LIGACAO.test(t.slice(m.index + m[0].length))) return { valor: +m[1] + (+m[2]) / 100, trecho: m[0], moeda: true };
    m = t.match(/(\d+)\s*centavos?/);
    const re = /r\$\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)|(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(reais|real|conto|contos|pila|r\$)?/g;
    let melhor = null, x;
    while ((x = re.exec(t))) {
      const bruto = x[1] || x[2];
      const comMoeda = !!x[1] || !!x[3];
      const pos = x.index;
      if (pos > 0 && /[a-z]/.test(t[pos - 1])) continue; // "c6", "h2o"
      // ignora números que são datas/horas/parcelas/dias/quantidades
      const antes = t.slice(Math.max(0, pos - 14), pos);
      const depois = t.slice(pos + x[0].length);
      if (!comMoeda) {
        if (/\b(dia|as|em)\s*$/.test(antes) && /^\s*(h\b|hora|x\b|vez|parcela|\/|:)/.test(depois)) continue;
        if (/^\s*(h\b|horas?\b|x\b|vez\b|vezes\b|parcelas?\b|\/|:|de (janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b|meses\b|mes\b(?!\s+(passado|retrasado))|anos?\b|dias\b|dia\b(?!\s+\d))/.test(depois)) continue;
        if (/\bdia\s*$|\/\s*$|:\s*$|\bas\s*$/.test(antes)) continue;
        if (/\d\s*h\s*$/.test(antes)) continue;
        if (UNIDADES.test(depois)) continue;
        if (/\bparcel\w*\b/.test(t) && /\bem\s*$/.test(antes)) continue;
      }
      let valor = paraNumero(bruto), trecho = x[0];
      if (!isFinite(valor)) continue;
      // "52 e 90" -> 52,90
      if (!comMoeda && /^\d+$/.test(bruto)) {
        const d = depois.match(/^\s*e\s+(\d{2})(?!\d)/);
        if (d && LIGACAO.test(depois.slice(d[0].length))) { valor += +d[1] / 100; trecho = x[0] + d[0]; re.lastIndex += d[0].length; }
      }
      // pontuação: moeda > palavra de preço > número solto > número seguido de substantivo ("3 pizzas")
      let pts = comMoeda ? 10 : 0;
      const qtd = !comMoeda && !LIGACAO.test(t.slice(pos + trecho.length));
      if (!comMoeda) {
        if (/\b(por|custou|custa|deu|foi|ficou|saiu|valor|total|de)\s*$/.test(antes)) pts += 3;
        else if (/\b(gastei|gastamos|paguei|pagamos|gasto|pago)\s*$/.test(antes)) pts += 2;
        if (qtd) pts -= 3;
      }
      const cand = { valor, trecho, moeda: comMoeda, pos, pts, plural: qtd && /\b(comprei|compramos|comprou)\s*$/.test(antes) && /^\s*[a-z]+s\b/.test(t.slice(pos + trecho.length)) };
      if (!melhor || cand.pts > melhor.pts || (cand.pts === melhor.pts && !cand.moeda)) melhor = cand;
    }
    if (melhor && melhor.plural) return null; // "comprei 3 pizzas": sem preço
    if (melhor) return melhor;
    if (m) return { valor: +m[1] / 100, trecho: m[0] };
    return null;
  }

  // --------------------------------------------------------- datas e horas
  const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const MESES_SEM = MESES.map(sem);
  /** modo 'passado' (gastos e entradas) olha para trás; 'futuro' (compromissos) olha para a frente. */
  function extrairData(t, hoje, modo) {
    const futuro = modo !== 'passado';
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const add = (n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
    const dt = (y, mes, dia) => new Date(y, mes, Math.min(dia, new Date(y, mes + 1, 0).getDate()));
    /** Sem ano informado: escolhe o ano que faz sentido para o modo. */
    const noAno = (mes, dia) => {
      const y = d.getFullYear(); const r = dt(y, mes, dia);
      if (futuro) return r < add(-60) ? dt(y + 1, mes, dia) : r;
      return r > d ? dt(y - 1, mes, dia) : r;
    };
    if (/depois de amanha/.test(t)) return { data: iso(add(2)), trecho: 'depois de amanha' };
    if (/anteontem/.test(t)) return { data: iso(add(-2)), trecho: 'anteontem' };
    if (/\bontem\b/.test(t)) return { data: iso(add(-1)), trecho: 'ontem' };
    if (/\bamanha\b/.test(t)) return { data: iso(add(1)), trecho: 'amanha' };
    if (/\bhoje\b/.test(t)) return { data: iso(d), trecho: 'hoje' };
    let m = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (m && +m[2] >= 1 && +m[2] <= 12) {
      if (m[3]) { let y = +m[3]; if (y < 100) y += 2000; return { data: iso(dt(y, +m[2] - 1, +m[1])), trecho: m[0] }; }
      return { data: iso(noAno(+m[2] - 1, +m[1])), trecho: m[0] };
    }
    m = t.match(/\bdia\s+(\d{1,2})(?:\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro))?/);
    if (m) {
      const dia = +m[1];
      if (m[2]) return { data: iso(noAno(MESES_SEM.indexOf(m[2]), dia)), trecho: m[0], dia };
      // sem mês: "dia 3" já passou? compromisso vai para o mês que vem; "dia 28" ainda não chegou? gasto foi no mês passado
      let r = dt(d.getFullYear(), d.getMonth(), dia);
      if (futuro && r < d) r = dt(d.getFullYear(), d.getMonth() + 1, dia);
      if (!futuro && r > d) r = dt(d.getFullYear(), d.getMonth() - 1, dia);
      return { data: iso(r), trecho: m[0], dia };
    }
    m = t.match(/\b(\d{1,2})\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/);
    if (m) return { data: iso(noAno(MESES_SEM.indexOf(m[2]), +m[1])), trecho: m[0] };
    for (let i = 0; i < 7; i++) {
      const re = new RegExp('\\b(?:na |no |nessa |nesta |proxima |proximo |ultima |ultimo )?' + DIAS_SEMANA[i] + '(?:-feira| feira)?\\b(?!\\s+(?:parcela|via|vez|mao|prestacao))');
      const mm = t.match(re);
      if (mm) {
        let n = (i - d.getDay() + 7) % 7;
        const passado = /\b(passad[oa]|ultim[oa])\b/.test(t), proximo = /\b(proxim[oa]|que vem)\b/.test(t);
        if (passado || (!futuro && !proximo)) n = n === 0 ? -7 : n - 7;
        else if (n === 0) n = 7;
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
    const tt = ' ' + t.replace(/caixa eletronico/g, ' ') + ' ';
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
  /** Interpreta e aplica; se havia uma pergunta pendente, resolve primeiro. Exclusões sempre pedem confirmação. */
  function conversar(estado, texto, opts) {
    opts = opts || {};
    const hoje = opts.hoje || new Date();
    const p = estado.pendente;
    if (p && Date.now() - (p.em || 0) < 15 * 60e3) {
      const t = sem(texto).trim();
      if (/^(cancela|cancelar|deixa|deixa pra la|nao|n|esquece)\b/.test(t)) { delete estado.pendente; return { ok: true, msg: p.tipo === 'excluir' ? 'Tudo bem, não excluí nada. 🙂' : 'Tudo bem, não guardei nada. 🙂' }; }
      if (p.tipo === 'excluir') {
        delete estado.pendente;
        if (/^(sim|s|pode|isso|confirmo|confirmar|ok|exclui|excluir|apaga|apagar)\b/.test(t)) { const r = aplicar(estado, p.acao, opts); r.acao = p.acao; return r; }
      } else if (p.tipo === 'sonho' && !extrairValor(t.replace(/^\d{1,2}$/, '')) && !/\b(gastei|paguei|comprei|recebi)\b/.test(t)) {
        delete estado.pendente;
        const n = t.match(/^(\d{1,2})\.?$/);
        const lista = estado.sonhos || [];
        const alvo = n ? lista[+n[1] - 1] : acharSonho(lista, t);
        const acao = { tipo: 'sonho', valor: p.valor, data: p.data, investir: p.investir, sonhoId: alvo ? alvo.id : undefined, termo: alvo ? '' : String(texto).trim().replace(/^(novo|criar|cria|sonho|um sonho)\s+/i, '') };
        if (!alvo && n) return { ok: false, msg: 'Não achei esse número. Responda de novo, por favor. 🙂', pergunta: p };
        return aplicar(estado, acao, opts);
      } else if (p.tipo === 'valor' && extrairValor(extensoParaNumero(t))) {
        delete estado.pendente;
        return conversar(estado, p.texto + ' ' + texto, opts);
      }
    }
    delete estado.pendente;
    const ctx = { hoje, categorias: estado.categorias, sonhos: estado.sonhos, cartoes: estado.cartoes, tickets: estado.tickets };
    const varios = separarLancamentos(texto, ctx);
    if (varios) { const rv = lancarVarios(estado, varios, opts); rv.acao = { tipo: 'varios' }; return rv; }
    const acao = interpretar(texto, ctx);
    if (acao.tipo === 'excluir') {
      const alvo = acharExclusao(estado, acao);
      if (!alvo.item) return { ok: false, msg: alvo.msg, acao };
      const pergunta = { tipo: 'excluir', em: Date.now(), acao: Object.assign({}, acao, { alvoCol: alvo.col, alvoId: alvo.item.id }) };
      estado.pendente = pergunta;
      return { ok: false, acao, pergunta, msg: `🗑️ Quer mesmo excluir ${descreverAlvo(alvo)}?\nResponda *sim* ou *não*.` };
    }
    const r = aplicar(estado, acao, opts);
    if (r.pergunta) estado.pendente = r.pergunta;
    r.acao = acao;
    return r;
  }

  /** "gastei 50 no mercado e 30 na padaria" são dois gastos. Só separa com certeza; na dúvida, segue como uma frase. */
  function separarLancamentos(texto, opts) {
    const original = String(texto || '').trim();
    const norm = extensoParaNumero(sem(original));
    if (/\b\d{1,2}\s*(x|vezes|parcelas?)\b/.test(norm)) return null;
    const base = norm === sem(original) ? original : norm; // mantém os acentos quando dá
    let partes = base.split(/\s*[;,]\s+|\s+e\s+|\s+mais\s+|\s+depois\s+/i).map((x) => x.trim()).filter(Boolean);
    if (partes.length < 2) partes = paresSemSeparador(base);
    if (!partes || partes.length < 2 || partes.length > 5) return null;
    const verbo = (base.match(/^\s*(?:eu\s+)?(gastei|gastamos|paguei|pagamos|comprei|compramos|recebi|recebemos|ganhei)\b/i) || [])[1];
    const hoje = opts.hoje || new Date();
    const dataGeral = extrairData(norm, hoje, 'passado');
    const acoes = [];
    for (const p of partes) {
      const frase = verbo && !new RegExp('\\b' + sem(verbo) + '\\b').test(sem(p)) && !/\b(gastei|paguei|comprei|recebi|ganhei)\b/.test(sem(p)) ? verbo + ' ' + p : p;
      const v = extrairValor(extensoParaNumero(sem(frase)));
      if (!v || !(v.moeda || v.pts >= 0)) return null;
      const a = interpretar(frase, opts);
      if (a.tipo !== 'gasto' && a.tipo !== 'entrada') return null;
      if (!a.desc || (a.tipo === 'gasto' && a.cat === 'Outros' && a.desc === 'Outros')) return null;
      if (dataGeral && a.data === iso(hoje)) a.data = dataGeral.data;
      acoes.push(a);
    }
    // "... e 30 na padaria no cartão Nubank": a forma de pagamento citada no fim vale para todos
    const ult = acoes[acoes.length - 1];
    if (ult.tipo === 'gasto' && (ult.cartao || ult.ticket || ult.pagamento)) for (const a of acoes) if (a.tipo === 'gasto' && !a.cartao && !a.ticket && !a.pagamento) { a.cartao = ult.cartao; a.ticket = ult.ticket; a.pagamento = ult.pagamento; if (ult.cartao || ult.ticket) a.paguei = false; }
    return acoes;
  }
  /** "mercado 50 padaria 30": pares de nome e valor, sem verbo, vírgula ou "e". */
  function paresSemSeparador(b) {
    const par = '(?:[^\\d\\s]+\\s+){1,3}\\d+(?:[.,]\\d{1,2})?(?:\\s+reais)?';
    if (!new RegExp('^' + par + '(?:\\s+' + par + ')+$', 'i').test(b)) return null;
    const pares = b.match(new RegExp(par, 'gi')).map((x) => x.trim());
    const tn = sem(b);
    if (/^(gastei|gastamos|paguei|pagamos|comprei|compramos|abasteci)\b/.test(tn)) return null;
    if (pares.some((p) => /\b(para|pra|por|de|com|em|dia|as)\b/.test(sem(p)) || UNIDADES.test(sem(p)))) return null;
    return pares;
  }
  /** Lança tudo de uma vez; "desfazer" volta o conjunto. */
  function lancarVarios(estado, acoes, opts) {
    const rs = acoes.map((a) => aplicar(estado, a, opts));
    const k = rs.filter((r) => r.podeDesfazer).length;
    if (k > 1) {
      const blocos = estado.desfazer.splice(-k);
      const vistos = new Set(); const alterados = [];
      for (const b of blocos) for (const x of b.alterados) { const c = x.col + ':' + x.item.id; if (!vistos.has(c)) { vistos.add(c); alterados.push(x); } }
      estado.desfazer.push({ criados: blocos.flatMap((b) => b.criados), alterados, removidos: blocos.flatMap((b) => b.removidos), rotulo: acoes.length + ' lançamentos', em: Date.now() });
    }
    const linhas = acoes.map((a) => `• ${a.desc && a.desc !== a.cat ? a.desc : a.cat}: ${brl(a.valor)}${a.tipo === 'entrada' ? ' (entrada)' : ''}`);
    const gastos = acoes.filter((a) => a.tipo === 'gasto');
    const aviso = (rs[rs.length - 1].msg || '').split('\n').filter((l) => /orçamento/i.test(l)).pop();
    return { ok: rs.every((r) => r.ok), colecao: 'lancamentos', podeDesfazer: k > 0, msg: `✅ Anotei ${acoes.length} lançamentos:\n${linhas.join('\n')}${gastos.length > 1 ? `\nTotal: ${brl(gastos.reduce((q, a) => q + a.valor, 0))}` : ''}${aviso ? '\n' + aviso : ''}` };
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
  /** Dia de fechamento; sem ele informado, considera 7 dias antes do vencimento (o mais comum nos bancos). */
  function diaFechamento(cartao) {
    const f = +(cartao && cartao.fechamento);
    if (f) return f;
    const v = +(cartao && cartao.diaVenc) || 10;
    return v > 7 ? v - 7 : v + 23;
  }
  /** Em qual fatura (mês do fechamento) uma compra cai. */
  function mesFatura(cartao, data) {
    const ym = mesDe(data);
    if (!cartao) return ym;
    return +String(data).slice(8, 10) >= Math.min(diaFechamento(cartao), diasNoMes(ym)) ? somaMes(ym, 1) : ym;
  }
  /** Vencimento da fatura: no mesmo mês do fechamento ou, se vence "antes" do fechamento, no mês seguinte. */
  function vencFatura(cartao, ym) {
    const v = +cartao.diaVenc || 10;
    const m = v > diaFechamento(cartao) ? ym : somaMes(ym, 1);
    return m + '-' + pad(Math.min(v, diasNoMes(m)));
  }
  /** Primeira fatura do cartão que ainda não tinha vencido na data informada. */
  function primeiraFaturaAberta(cartao, quando) {
    const d = iso(quando instanceof Date ? quando : new Date(quando));
    const ym0 = mesDe(d);
    for (const k of [-1, 0, 1, 2]) { const ym = somaMes(ym0, k); if (vencFatura(cartao, ym) >= d) return ym; }
    return ym0;
  }
  /**
   * A partir de qual fatura a parcelada é cobrada no cartão.
   * Parcelas de faturas que já tinham vencido quando a compra foi ligada ao cartão ficam fora:
   * a pessoa já pagou essas faturas fora do app. Sem o registro (dados antigos), usa a data da última alteração.
   */
  function parcelaDesde(p, cartao) {
    if (/^\d{4}-\d{2}$/.test(p.cartaoDesde || '')) return p.cartaoDesde;
    return cartao && +p.upd ? primeiraFaturaAberta(cartao, new Date(+p.upd)) : p.inicio;
  }
  /** Liga (ou desliga) a parcelada a um cartão, guardando a partir de qual fatura ela entra. */
  function ligarCartaoParcelado(estado, p, cartaoId, hoje) {
    cartaoId = cartaoId || undefined;
    const c = cartaoId ? (estado.cartoes || []).find((x) => x.id === cartaoId) : null;
    if (!c) { p.cartaoId = undefined; delete p.cartaoDesde; return; }
    if (p.cartaoId === cartaoId) { if (!p.cartaoDesde) p.cartaoDesde = parcelaDesde(p, c); return; }
    p.cartaoId = cartaoId;
    p.cartaoDesde = primeiraFaturaAberta(c, hoje || new Date());
  }
  /** Fatura de um cartão num mês: compras, parcelas, restante anterior, total, pago, situação. */
  function fatura(estado, cartaoId, ym, hoje, prof) {
    prof = prof || 0;
    const c = (estado.cartoes || []).find((x) => x.id === cartaoId);
    if (!c) return null;
    const compras = (estado.lancamentos || []).filter((l) => l.tipo === 'gasto' && l.cartaoId === cartaoId && mesFatura(c, l.data) === ym);
    const parcelas = (estado.parcelados || []).filter((p) => p.cartaoId === cartaoId && ym >= parcelaDesde(p, c)).map((p) => ({ p, k: parcelaNoMes(p, ym) })).filter((x) => x.k);
    let anterior = 0;
    if (prof < 12) { const fa = fatura(estado, cartaoId, somaMes(ym, -1), hoje, prof + 1); if (fa && fa.situacao === 'parcial') anterior = fa.falta; }
    const total = Math.round((compras.reduce((a, b) => a + b.valor, 0) + parcelas.reduce((a, b) => a + b.p.valor, 0) + anterior) * 100) / 100;
    const reg = (c.faturas || {})[ym] || null;
    const pago = reg ? (reg.status === 'total' ? total : Number(reg.pago) || 0) : 0;
    const falta = Math.max(0, Math.round((total - pago) * 100) / 100);
    const venc = vencFatura(c, ym);
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
    const ym0 = mesDe(iso(hoje));
    for (const c of estado.cartoes || []) {
      for (const ym of [somaMes(ym0, -1), ym0, somaMes(ym0, 1)]) {
        const f = fatura(estado, c.id, ym, hoje); if (!f || f.situacao === 'paga' || f.situacao === 'vazia' || f.falta <= 0) continue;
        const dd = Math.round((new Date(f.venc + 'T12:00') - new Date(iso(hoje) + 'T12:00')) / 864e5);
        if (dd >= 0 && dd <= dias) out.push({ fatura: f, emDias: dd });
      }
    }
    return out;
  }
  /** A fatura em aberto mais antiga do cartão (é a que a pessoa quer pagar ou consultar). */
  function faturaDaVez(estado, cartao, hoje) {
    const ym0 = mesDe(iso(hoje));
    for (const k of [-2, -1, 0, 1]) {
      const ym = somaMes(ym0, k); const f = fatura(estado, cartao.id, ym, hoje);
      if (f && f.falta > 0 && f.situacao !== 'paga' && f.situacao !== 'vazia') return ym;
    }
    return ym0;
  }

  // ------------------------------------------------------- ticket (saldo pré-pago)
  // O crédito entra em estado.recargas e as compras são lançamentos com ticketId.
  // O saldo é sempre calculado, então celular e WhatsApp nunca brigam por um número.
  const TICKET_PADRAO = 'ticket-padrao';
  const NOME_TICKET = 'Ticket Alimentação/Refeição';
  const COR_TICKET = '#0B7A54';
  const NAO_BENEFICIO = '(?!\\s+(?:d[oae]s?\\s+)?(?:estacionamento|show|cinema|onibus|metro|trem|pedagio|medio|teatro|jogo|evento|festa|estadio|parque|suporte|atendimento|embarque|aviao|voo|sorteio|bar)\\b)';
  const COMPLEMENTO_TICKET = '(?:[ /-]+(?:de\\s+)?(?:alimentacao|refeicao)){0,2}';
  const RE_TICKET = new RegExp('\\b(?:vales?[ -](?:alimentacao|refeicao|ticket|mercado)' + COMPLEMENTO_TICKET + '|cartao[ -](?:de\\s+)?(?:alimentacao|refeicao|ticket|beneficios?)' + COMPLEMENTO_TICKET + '|(?:ticket|tiquete|tiket)s?' + COMPLEMENTO_TICKET + NAO_BENEFICIO + '|alelo|sodexo|pluxee|swile)\\b');
  const RE_VA_VR = /\b(?:no|na|do|da|de|com|pelo|pela|usando)\s+(?:o\s+|a\s+|meu\s+|minha\s+)?(va|vr)\b/;
  const COMPRA_TICKET = /\b(gastei|gastamos|gasto|gastar|comprei|compramos|compra|comprar|paguei|pagamos|pagar|despesa|torrei|debitou|saiu|almocei|jantei)\b/;
  const CREDITO_FORTE = /\b(recarreguei|recarregar|recarrega|recarregue|recarga|carreguei|carregar|carrega|carregue|recebi|recebemos|caiu|cairam|entrou|depositaram|depositei|depositar|creditaram|creditou|creditei|creditar|credite|pingou|veio|vieram|estornou|estornaram|devolveram|devolveu)\b/;
  const CREDITO_FRACO = /\b(credito|coloquei|colocar|coloca|coloque|botei|botar|bota|adicionei|adicionar|adiciona|adicione|acrescentei|acrescenta|somei)\b/;
  const PALAVRAS_CREDITO = ['recarreguei', 'recarregar', 'recarrega', 'recarregue', 'recarga', 'carreguei', 'carregar', 'carrega', 'carregue', 'colocar', 'coloca', 'coloque', 'adicionei', 'acrescentei', 'acrescenta', 'somei', 'saldo', 'no valor'];
  const escRe = (x) => String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  /** Acha o cartão de benefício citado: "no ticket", "vale refeição", "no va", "no alelo" ou o nome cadastrado. */
  function detectarTicket(t, tickets) {
    tickets = tickets || [];
    const marca = t.match(RE_TICKET);
    const sigla = marca ? null : t.match(RE_VA_VR);
    const tt = ' ' + t.replace(/\bva\b/g, 'alimentacao').replace(/\bvr\b/g, 'refeicao').replace(/[/-]/g, ' ') + ' ';
    let melhor = null, tam = 0, trecho = '';
    for (const c of tickets) {
      const n = sem(c.nome);
      const partes = [n].concat(n.split(/[\s/-]+/).filter((p) => p.length > 2 && !['ticket', 'tiquete', 'cartao', 'vale', 'beneficio', 'beneficios'].includes(p)));
      for (const p of partes) {
        // nome próprio ("Caju") só conta depois de "no", "com", "do"...: "comprei caju" não é o cartão
        const achou = marca || sigla ? tt.includes(' ' + p + ' ') : !/^(alimentacao|refeicao)$/.test(p) && new RegExp('\\b(?:no|na|do|da|com|pelo|pela|usando)\\s+(?:o\\s+|a\\s+|meu\\s+|minha\\s+)?(?:cartao\\s+)?' + escRe(p) + '\\b').test(t);
        if (achou && p.length > tam) { melhor = c; tam = p.length; trecho = p; }
      }
    }
    if (!marca && !sigla && !melhor) return null;
    trecho = marca ? marca[0] : sigla ? sigla[1] : trecho;
    if (melhor) return { id: melhor.id, nome: melhor.nome, trecho };
    if (tickets.length) return { id: tickets[0].id, nome: tickets[0].nome, trecho, generico: tickets.length > 1 };
    return { novo: true, nome: NOME_TICKET, trecho };
  }
  /** Devolve o ticket citado; o primeiro tem id fixo para não duplicar quando dois aparelhos o criam. */
  function garantirTicket(estado, info) {
    estado.tickets = estado.tickets || [];
    if (info && info.id) return estado.tickets.find((c) => c.id === info.id) || null;
    if (!info || !info.nome || info.nome === NOME_TICKET) { const ja = estado.tickets[0]; if (ja) return ja; }
    const usado = estado.tickets.some((c) => c.id === TICKET_PADRAO) || (estado.excluidos || []).some((x) => x.id === TICKET_PADRAO);
    const c = { id: usado ? uid() : TICKET_PADRAO, nome: (info && info.nome) || NOME_TICKET, cor: (info && info.cor) || COR_TICKET, upd: Date.now() };
    estado.tickets.push(c);
    return c;
  }
  const centavos = (v) => Math.round(v * 100) / 100;
  const somaValor = (lista) => lista.reduce((a, b) => a + (Number(b.valor) || 0), 0);
  const recargasDe = (estado, id) => (estado.recargas || []).filter((r) => r.ticketId === id);
  const comprasTicket = (estado, id) => (estado.lancamentos || []).filter((l) => l.tipo === 'gasto' && l.ticketId === id);
  function saldoTicket(estado, id) { return centavos(somaValor(recargasDe(estado, id)) - somaValor(comprasTicket(estado, id))); }
  function gastoTicketMes(estado, id, ym) { return centavos(somaValor(comprasTicket(estado, id).filter((l) => mesDe(l.data) === ym))); }
  /** Créditos e compras do mês, do mais recente para o mais antigo. */
  function extratoTicket(estado, id, ym) {
    const cred = recargasDe(estado, id).filter((r) => mesDe(r.data) === ym).map((r) => ({ tipo: 'credito', item: r }));
    const comp = comprasTicket(estado, id).filter((l) => mesDe(l.data) === ym).map((l) => ({ tipo: 'compra', item: l }));
    return cred.concat(comp).sort((a, b) => b.item.data.localeCompare(a.item.data) || (b.item.upd || 0) - (a.item.upd || 0));
  }
  /** Tira o cartão: as compras continuam no histórico e os créditos dele saem. */
  function excluirTicket(estado, id) {
    for (const l of comprasTicket(estado, id)) { delete l.ticketId; l.upd = Date.now(); }
    for (const r of recargasDe(estado, id)) remover(estado, 'recargas', r.id);
    remover(estado, 'tickets', id);
  }

  // -------------------------------------------------------------- interpretar
  /**
   * Transforma uma frase em uma ação.
   * Retorna { tipo, ...dados } — tipos: gasto, entrada, excluir, desfazer, conta, compromisso,
   * sonho, parcelado, ticket_credito, ver_ticket, resumo, contas_pendentes, agenda_hoje, ajuda, desconhecido
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
    const tk = detectarTicket(t, opts.tickets);
    if (tk && /\b(saldo|quanto|extrato|como esta|mostra|qual)\b/.test(t) && !(extrairValor(t) && (COMPRA_TICKET.test(t) || CREDITO_FORTE.test(t) || CREDITO_FRACO.test(t)))) return { tipo: 'ver_ticket', ticket: tk };
    if (/^(muito )?(obrigad[oa]|brigad[oa]|valeu|vlw|show|beleza|blz|ok|okay|perfeito|otimo|legal|top|boa|entendi|combinado)\b/.test(t) && !extrairValor(t)) return { tipo: 'conversa', msg: 'Por nada! Estou aqui sempre que precisar. 💙' };
    if (/^(tudo bem|tudo bom|td bem|como vai|como voce esta|e ai)\b/.test(t) && !extrairValor(t)) return { tipo: 'conversa', msg: 'Tudo ótimo por aqui! 💙 Me conta: gastou alguma coisa hoje?' };
    if (!tk && /\bquanto (eu )?(ainda )?posso gastar\b/.test(t) && !extrairValor(t)) return { tipo: 'quanto_posso' };
    if (!tk && /\b(maior gasto|gastei mais|mais gastei|gasto mais|mais gasto)\b/.test(t) && !extrairValor(t)) return { tipo: 'maior_gasto' };
    const consulta = !tk && t.match(/\bquanto (?:eu )?(?:ja )?(?:gastei|gastamos|paguei)\s+(?:com|de|em|no|na|nos|nas)\s+(.+)$/);
    if (consulta && !extrairValor(t)) {
      const passado = /\bmes passado\b/.test(consulta[1]);
      const termoC = consulta[1].replace(/\b(?:n?este|n?esse|no|em)?\s*mes(?:\s+passado)?\b|\bate agora\b|\bhoje\b|\bo\b|\ba\b|\bos\b|\bas\b|[?!.]/g, ' ').replace(/\s+/g, ' ').trim();
      if (termoC) { const catC = adivinharCategoria(termoC, opts.categorias); return { tipo: 'consulta_gasto', termo: termoC, cat: catC === 'Outros' ? '' : catC, ym: somaMes(mesDe(iso(hoje)), passado ? -1 : 0) }; }
    }
    if (!tk && /\b(quanto (eu )?(ja )?gastei|quanto (me )?(sobrou|sobra|resta)|quanto (eu )?(tenho|posso gastar)|resumo|saldo|como (estou|esta|to|ta)|balanco|extrato|meu mes)\b/.test(t)) return { tipo: 'resumo' };
    if (/\b(contas? (a|pra|para) (pagar|vencer)|o que vence|quais contas|contas da semana|contas pendentes|boletos)\b/.test(t) && !extrairValor(t)) return { tipo: 'contas_pendentes' };
    if (/\b(agenda|compromissos? (de )?hoje|meus compromissos|o que tenho hoje)\b/.test(t) && !/\b(marca|marcar|agenda[r]? (uma|um|o|a)|lembra)/.test(t)) return { tipo: 'agenda_hoje' };

    const val = extrairValor(t);
    const dt = extrairData(t, hoje, 'passado'); // gastos, entradas e sonhos olham para trás
    const dtF = extrairData(t, hoje, 'futuro'); // compromissos e vencimentos olham para a frente
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

    // EXCLUIR: só quando a frase é um pedido ("apaga o gasto...", "pode excluir..."), nunca em "gastei 50 em Tiradentes"
    const pedidoExcluir = /^(?:(?:por favor|pode|quero|preciso|favor|me|vamos|tem como|da pra|da para|sonhai|oi|ola|ei)\s+)*(?:exclui|excluir|exclua|excluo|apaga|apagar|apague|remove|remover|remova|deleta|deletar|delete|cancela|cancelar|cancele|tira|tirar|tire|retira|retirar|retire|estorna|estornar|estorne)\b/.test(t);
    const passadoExcluir = /^(?:cancelei|apaguei|exclui|removi|deletei|estornei|retirei|tirei)\s+(?:o |a |um |uma |aquele |aquela )?(?:gasto|lancamento|compra|entrada|conta|compromisso)\b/.test(t);
    if (pedidoExcluir || passadoExcluir) {
      const termo = limparDescricao(original.replace(/\b(exclu|apag|remov|delet|cancel|tira|retira|estorn)\w*/gi, ''), [val && val.trecho, dt && dt.trecho, 'gasto', 'lancamento', 'lançamento', 'ultimo', 'último']);
      return { tipo: 'excluir', valor: val ? val.valor : null, termo: sem(termo), data: dt ? dt.data : null, alvo: tk && /\b(credito|recarga)\b/.test(t) ? 'recarga' : /compromisso|consulta|reuniao/.test(t) ? 'agenda' : /conta\b|boleto/.test(t) && !val ? 'conta' : 'lancamento' };
    }

    // "cancelei a netflix 40" conta uma novidade, não um gasto
    if (/^(cancelei|cancelamos)\b/.test(t)) return { tipo: 'desconhecido', texto: original };

    const fatoFeito = /\b(gastei|gastamos|comprei|compramos|paguei|pagamos|recebi|recebemos|ganhei|ganhamos|guardei|guardamos|juntei|poupei|economizei|investi|abasteci|almocei|jantei|caiu|entrou)\b/;

    // "recebo 800 de ticket todo mês" não é renda fixa nem conta: o crédito é lançado quando cai
    if (tk && val && /\b(todo mes|todos os meses|todo dia|cada mes|por mes|ao mes|mensal)\b/.test(t) && !fatoFeito.test(t)) return { tipo: 'plano', texto: original, msg: '🎟️ O crédito do Ticket não entra sozinho. Quando cair, me diga: "caiu 800 no ticket". 💙' };

    // RENDA FIXA: "meu salário é 5000 todo dia 5", "recebo 3000 por mês"
    const palavraRenda = /\b(salario|renda|aposentadoria|pensao|pro labore|adiantamento|recebo|ganho)\b/;
    const repeteRenda = /\b(todo|toda|todos|cada mes|por mes|ao mes|mensal|renda fixa|meu salario e|minha renda e|recebo|ganho)\b/;
    if (val && palavraRenda.test(t) && repeteRenda.test(t) && !fatoFeito.test(t)) {
      const diaR = t.match(/\bdia\s+(\d{1,2})\b/);
      const catR = /adiantamento/.test(t) ? 'Adiantamento' : /aposentadoria|pensao/.test(t) ? 'Aposentadoria' : /salario|recebo|ganho/.test(t) ? 'Salário' : 'Outra renda';
      return { tipo: 'renda_fixa', nome: catR === 'Outra renda' ? 'Renda fixa' : catR, cat: catR, valor: val.valor, dia: diaR ? +diaR[1] : 5 };
    }

    // META DE SONHO: "meta de 10000 para o carro", "quero juntar 8000 para a viagem"
    const fazPorMes = /\b(por mes|ao mes|todo mes|por semana|toda semana)\b/.test(t);
    const ehMeta = val && !fatoFeito.test(t) && !fazPorMes && (/^(?:(?:minha|meu|nossa|nosso|a|o)\s+)?(?:meta|objetivo|sonho)\b/.test(t) || /\b(?:quero|queremos|vou|vamos|preciso|pretendo|planejo)\s+(?:juntar|guardar|poupar)\b/.test(t));
    if (ehMeta) {
      const nomeM = limparDescricao(original, [val.trecho, dt && dt.trecho, 'meta', 'objetivo', 'sonho', 'quero', 'queremos', 'vou', 'vamos', 'preciso', 'pretendo', 'planejo', 'juntar', 'guardar', 'poupar', 'nosso', 'nossa', 'minha', 'meu', 'por']) || 'Meu sonho';
      return { tipo: 'meta_sonho', valor: val.valor, nome: nomeM };
    }

    // PLANO ou PERGUNTA: "vale a pena comprar uma TV de 2000" não é um gasto
    const quer = /\b(vale a pena|sera que|posso|devo|deveria|quero|queremos|queria|gostaria|pretendo|planejo|vou|vamos|preciso|pensando em|penso em|se eu)\b/.test(t);
    const verboPlano = /\b(compr\w*|gast\w*|pag\w*|guard\w*|junt\w*|invest\w*|poup\w*|econom\w*|troc\w*|viaj\w*|parcel\w*)\b/.test(t);
    const vaiPagar = /\b(tenho que|preciso|vou ter que) pagar\b/.test(t) && /\bdia\s+\d{1,2}\b/.test(t);
    if (val && !fatoFeito.test(t) && !vaiPagar && !/\b(vence|vencimento|lembr\w*|agend\w*|boleto)\b/.test(t) && ((quer && verboPlano) || /\?\s*$/.test(original))) return { tipo: 'plano', texto: original };

    // TICKET: crédito sobe o saldo, compra desce. Sem verbo ("mercado 50 no ticket") é compra, como no resto do app.
    if (tk) {
      if (!val) return { tipo: 'ver_ticket', ticket: tk, dica: true };
      const dataTk = dt ? dt.data : iso(hoje);
      const resto = limparDescricao(original, [val.trecho, dt && dt.trecho, tk.trecho].concat(PALAVRAS_CREDITO));
      const ehCredito = !COMPRA_TICKET.test(t) && (CREDITO_FORTE.test(t) || (CREDITO_FRACO.test(t) && !resto));
      if (ehCredito) return { tipo: 'ticket_credito', ticket: tk, valor: val.valor, data: dataTk };
      const tSemTk = t.replace(tk.trecho, ' ');
      const catTk = adivinharCategoria(tSemTk, opts.categorias);
      const descTk = limparDescricao(original, [val.trecho, dt && dt.trecho, tk.trecho, 'paguei', 'pago', 'usando']) || catTk;
      return { tipo: 'gasto', valor: val.valor, desc: descTk, cat: catTk, data: dataTk, pagamento: 'Ticket', ticket: tk, cartao: null, cartaoSemBanco: false, paguei: false, chave: t };
    }

    // SONHO (guardar / investir / cofrinho)
    const verboGuardar = /\b(guard(ei|ar|e|a|amos)|junt(ei|ar|e|a)|poup(ei|ar|e|a)|economiz(ei|ar)|separ(ei|ar|e|a)|reserv(ei|ar|e)|invest(i|ir|e|a|imos)|deposit(ei|ar|e|a)|apliq(uei)|aplic(ar|a|ou)|cofrinho|caixinha)\b|\b(coloquei|botei)\b.*\b(poupanca|reserva|sonho)\b/;
    const soReservou = /\breserv(ei|ar|e)\b/.test(t) && !/\b(guard|junt|poup|economiz|separ|invest|deposit|aplic|cofrinho|caixinha)/.test(t) && !/\b(para|pra|pro)\b/.test(t); // "reservei o hotel 500" é gasto
    if (val && verboGuardar.test(t) && !soReservou && !/\b(gastei|comprei|paguei|guarda.?roupa|guarda.?chuva)\b/.test(t)) {
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
      let tipoE = /salario/.test(t) ? 'Salário' : /adiantamento|vale\b(?!\s*(alimentacao|refeicao|ticket))/.test(t) ? 'Adiantamento' : /13|decimo/.test(t) ? '13º salário' : /bonus|plr/.test(t) ? 'Bônus/PLR' : /comissao/.test(t) ? 'Comissão' : /aluguel/.test(t) ? 'Aluguel recebido' : /vendi|venda/.test(t) ? 'Venda' : /reembolso|restituicao|cashback/.test(t) ? 'Reembolso' : /rendimento|dividendo/.test(t) ? 'Rendimentos' : /freela/.test(t) ? 'Freela' : /pix/.test(t) ? 'Pix recebido' : /aposentadoria|inss/.test(t) ? 'Aposentadoria' : 'Outra renda';
      const desc = limparDescricao(original, [val.trecho, dt && dt.trecho, 'recebi', 'recebemos', 'receber', 'recebido', 'recebida', 'ganhei', 'ganhamos', 'entrou', 'entrada', 'renda', 'receita', 'caiu', 'me pagaram', 'pagaram', 'pingou', 'depositaram', 'criar', 'cria', 'crie', 'nova', 'novo', 'lançar', 'lança', 'lance', 'registrar', 'adicionar', 'adiciona', 'colocar', 'coloca', 'vendi', 'por', 'pela', 'pelo']) || tipoE;
      return { tipo: 'entrada', valor: val.valor, desc, cat: tipoE, data: dt ? dt.data : iso(hoje) };
    }

    // FATURA DO CARTÃO (pagar / consultar)
    if (/\bfatura\b/.test(t) || (/\bcartao\b/.test(t) && /\b(paguei|quitei|quanto|como esta|ver)\b/.test(t) && !/\b(com|no)\s+(o\s+)?cartao\b/.test(t))) {
      const card = detectarCartao(t, opts.cartoes, true);
      const mesM = t.match(/\b(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/);
      let ym = mesDe(iso(hoje)); let ymAuto = false;
      if (mesM) { const mi = MESES_SEM.indexOf(mesM[1]) + 1; ym = hoje.getFullYear() + '-' + pad(mi); if (ym > somaMes(mesDe(iso(hoje)), 2)) ym = (hoje.getFullYear() - 1) + '-' + pad(mi); }
      else if (/\b(passad|anterior)\w*/.test(t)) ym = somaMes(ym, -1);
      else if (/\b(proxim|que vem)\w*/.test(t)) ym = somaMes(ym, 1);
      else ymAuto = true;
      const vM = t.match(/\b(?:vence|vencimento)\D{0,12}(\d{1,2})\b/); const fM = t.match(/\bfecha\w*\D{0,12}(\d{1,2})\b/);
      if ((vM || fM) && !/\b(paguei|quitei)\b/.test(t)) return { tipo: 'config_cartao', cartao: card, diaVenc: vM ? +vM[1] : null, fechamento: fM ? +fM[1] : null };
      if (/\b(paguei|quitei|pago|paga|pagamos)\b/.test(t)) {
        const parcial = val && !/\b(toda|total|inteira|tudo)\b/.test(t);
        return { tipo: 'pagar_fatura', cartao: card, ym, ymAuto, valor: val ? val.valor : null, parcial: !!parcial };
      }
      if (/\b(quanto|ver|mostra|como esta|valor|qual)\b/.test(t) || !val) return { tipo: 'ver_fatura', cartao: card, ym, ymAuto };
    }

    // COMPROMISSO (sem dinheiro, com data/hora ou palavra-chave)
    const ehCompromisso = /\b(compromisso|consulta|reuniao|lembr\w*|agend\w*|marc\w*|dentista|medico|aniversario|encontro|visita|entrevista|exame|buscar|levar|ligar para|evento|festa|curso)\b/.test(t);
    const ehConta = /\b(conta|boleto|fatura|vence|vencimento|mensalidade|todo dia|todo mes|mensal)\b/.test(t);
    // "conta do restaurante 120" é um gasto; conta fixa precisa de sinal de vencimento
    const contaFixa = vaiPagar || (ehConta && (/\b(vence|vencimento|boleto|mensalidade|todo dia|todo mes|mensal)\b/.test(t) || (/\bdia\s+\d{1,2}\b/.test(t) && !/\b(deu|ficou|saiu|custou|dividi|dividimos|rachei|rachamos)\b/.test(t))));
    if (ehCompromisso && (!val || (hr && !/\b(paguei|gastei|comprei)\b/.test(t))) && !(ehConta && val)) {
      const titulo = limparDescricao(original, [dtF && dtF.trecho, hr && hr.trecho, 'compromisso', 'me lembra', 'me lembre', 'lembrete', 'lembrar', 'agendar', 'agenda', 'marcar', 'marca', 'tenho', 'vou ter', 'vou', 'que', 'de', 'as', 'às', 'horas', 'hora', 'amanhã', 'hoje']) || 'Compromisso';
      return { tipo: 'compromisso', titulo, data: dtF ? dtF.data : iso(hoje), hora: hr ? hr.hora : '', valor: val ? val.valor : null };
    }

    // CONTA A PAGAR (vencimento)
    if (contaFixa && !/\b(paguei|gastei)\b/.test(t)) {
      const diaM = t.match(/\bdia\s+(\d{1,2})\b/);
      const dia = diaM ? +diaM[1] : (dtF ? +dtF.data.slice(8, 10) : null);
      const nome = limparDescricao(original, [val && val.trecho, dtF && dtF.trecho, diaM && diaM[0], 'conta de', 'conta do', 'conta da', 'conta', 'boleto', 'fatura', 'vence', 'vencimento', 'todo', 'mes', 'mês', 'mensal', 'cadastra', 'cadastrar', 'nova', 'tenho', 'preciso', 'vou ter', 'que', 'pagar', 'valor']) || 'Conta';
      const recorrente = !/\b(so esse mes|uma vez|unica)\b/.test(t);
      return { tipo: 'conta', nome, valor: val ? val.valor : 0, dia: Math.max(1, Math.min(31, dia || hoje.getDate())), cat: adivinharCategoria(t + ' ' + sem(nome), opts.categorias) === 'Outros' ? 'Contas da Casa' : adivinharCategoria(t + ' ' + sem(nome), opts.categorias), recorrente, vencimento: dtF && !diaM ? dtF.data : null };
    }

    if (!val) {
      if (/\bpaguei\b/.test(t)) return { tipo: 'pagar_conta', chave: t, data: dt ? dt.data : iso(hoje) };
      if (/\b(gastei|gastamos|comprei|compramos|abasteci|almocei|jantei|fui (ao|no|na))\b/.test(t)) return { tipo: 'falta_valor', texto: original };
      return { tipo: 'desconhecido', texto: original };
    }

    // PARCELADO
    const parc = t.match(/\b(?:em\s*)?(\d{1,2})\s*(?:x|vezes|parcelas)\b(?:\s*de\s*(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?))?/) || t.match(/\bparcel\w*\b.*?\bem\s*(\d{1,2})\b/);
    if (parc && +parc[1] > 1) {
      const n = +parc[1];
      let vp;
      if (parc[2]) vp = paraNumero(parc[2]);
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
    return { tipo: 'gasto', valor: val.valor, desc, cat, data: dt ? dt.data : iso(hoje), pagamento: card ? 'Cartão' : pagamento(t), cartao: card && !card.semBanco ? card : null, cartaoSemBanco: !!(card && card.semBanco), paguei: (/\b(paguei|pagamos)\b/.test(t) || ehConta) && !card, chave: t };
  }

  // ------------------------------------------------------------ estado padrão
  function estadoVazio() {
    return {
      versao: 2,
      perfil: { nome: '', whatsapp: '', orcamento: 0, saldoInicial: 0, lembreteHora: '08:00', ticket: false, tema: 'auto', criadoEm: new Date().toISOString() },
      categorias: CATEGORIAS.map((c) => ({ nome: c.nome, emoji: c.emoji, cor: c.cor, limite: 0 })),
      lancamentos: [], contas: [], rendas: [], parcelados: [], cartoes: [], tickets: [], recargas: [], anuais: [], sonhos: [{ id: uid(), nome: 'Reserva de emergência', emoji: '🛟', custo: 0, prazo: '', guardadoAntes: 0, aportes: [], upd: Date.now() }],
      dividas: [], agenda: [], excluidos: [], chat: []
    };
  }

  /** Conta nova: o app mostra o guia e os primeiros passos. Contas antigas não têm essas marcas. */
  function marcarPrimeiroAcesso(estado) {
    estado.perfil.guiaTour = true; estado.perfil.guiaPassos = true; estado.perfilUpd = Date.now();
    return estado;
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
  const limpaEmoji = (e) => String(e == null ? '' : e).replace(/[<>"'&`]/g, '').slice(0, 8);
  const corValida = (c, padrao) => (/^#[0-9a-f]{3,8}$/i.test(c) ? c : padrao);
  const COLS_ITENS = ['lancamentos', 'contas', 'rendas', 'parcelados', 'cartoes', 'tickets', 'recargas', 'anuais', 'sonhos', 'dividas', 'agenda'];
  /** Corrige o que chega de fora (app antigo, backup ou requisição forjada) antes de ser usado. */
  function sanearEstado(estado) {
    if (!estado || typeof estado !== 'object') return estado;
    if (!estado.perfil || typeof estado.perfil !== 'object' || Array.isArray(estado.perfil)) estado.perfil = {};
    const pf = estado.perfil;
    if (typeof pf.nome !== 'string') pf.nome = '';
    if (typeof pf.whatsapp !== 'string') pf.whatsapp = String(pf.whatsapp == null ? '' : pf.whatsapp);
    if (!/^\d{2}:\d{2}$/.test(pf.lembreteHora || '')) pf.lembreteHora = '08:00';
    pf.orcamento = Number(pf.orcamento) || 0; pf.saldoInicial = Number(pf.saldoInicial) || 0;
    // atalhos da tela inicial: até 3 nomes de tela, sem repetir
    if ('atalhos' in pf) pf.atalhos = Array.isArray(pf.atalhos) ? [...new Set(pf.atalhos.filter((x) => typeof x === 'string' && /^[a-z]{2,20}$/.test(x)))].slice(0, 3) : [];
    if (Number(estado.perfilUpd) > Date.now() + 864e5) estado.perfilUpd = Date.now();
    for (const col of COLS_ITENS) estado[col] = Array.isArray(estado[col]) ? estado[col].filter((x) => x && typeof x === 'object' && !Array.isArray(x) && x.id) : [];
    if (!Array.isArray(estado.categorias) || !estado.categorias.length) estado.categorias = CATEGORIAS.map((c) => ({ nome: c.nome, emoji: c.emoji, cor: c.cor, limite: 0 }));
    estado.categorias = estado.categorias.filter((c) => c && typeof c === 'object' && !Array.isArray(c)).map((c) => Object.assign(c, { nome: String(c.nome == null ? '' : c.nome), emoji: limpaEmoji(c.emoji), cor: corValida(c.cor, '#9AA3AF') }));
    if (!Array.isArray(estado.excluidos)) estado.excluidos = [];
    for (const col of COLS_ITENS.concat('categorias')) estado[col].forEach((x) => sanearItem(x));
    for (const col of ['lancamentos', 'recargas', 'agenda']) for (const x of estado[col]) if (!/^\d{4}-\d{2}-\d{2}$/.test(x.data || '')) x.data = iso(new Date());
    for (const a of estado.agenda) if (a.hora && !/^\d{2}:\d{2}$/.test(a.hora)) a.hora = '';
    for (const x of estado.sonhos) { x.emoji = limpaEmoji(x.emoji); if (!Array.isArray(x.aportes)) x.aportes = []; }
    for (const x of estado.cartoes) x.cor = corValida(x.cor, '#1B3A6B');
    for (const x of estado.parcelados) {
      const c = x.cartaoId && estado.cartoes.find((k) => k.id === x.cartaoId);
      if (!c) delete x.cartaoDesde;
      else if (!/^\d{4}-\d{2}$/.test(x.cartaoDesde || '')) x.cartaoDesde = parcelaDesde(Object.assign({}, x, { cartaoDesde: '' }), c);
    }
    for (const x of estado.tickets) x.cor = corValida(x.cor, COR_TICKET);
    sanearItem(pf);
    if (Array.isArray(estado.chat)) estado.chat = estado.chat.slice(-200).map((m) => ({ de: m.de === 'me' ? 'me' : 'bot', txt: String(m.txt || '').slice(0, 4000), em: +m.em || 0 }));
    return estado;
  }

  const COLS_DESFAZER = ['lancamentos', 'contas', 'rendas', 'parcelados', 'cartoes', 'tickets', 'recargas', 'anuais', 'sonhos', 'dividas', 'agenda'];
  const DESFAZIVEIS = new Set(['pagar_conta', 'gasto', 'entrada', 'parcelado', 'config_cartao', 'pagar_fatura', 'conta', 'renda_fixa', 'meta_sonho', 'compromisso', 'resgate', 'sonho', 'excluir', 'ticket_credito']);
  function fotografar(estado) {
    const foto = {};
    for (const col of COLS_DESFAZER) foto[col] = new Map((estado[col] || []).map((x) => [x.id, JSON.stringify(x)]));
    return foto;
  }
  /** O que a última ação criou, alterou ou removeu, para poder voltar exatamente ao estado anterior. */
  function compararFoto(estado, foto) {
    const d = { criados: [], alterados: [], removidos: [] };
    for (const col of COLS_DESFAZER) {
      const antes = foto[col]; const vistos = new Set();
      for (const it of estado[col] || []) {
        vistos.add(it.id);
        if (!antes.has(it.id)) d.criados.push({ col, id: it.id });
        else if (antes.get(it.id) !== JSON.stringify(it)) d.alterados.push({ col, item: JSON.parse(antes.get(it.id)) });
      }
      for (const [id, txt] of antes) if (!vistos.has(id)) d.removidos.push({ col, item: JSON.parse(txt) });
    }
    return d.criados.length || d.alterados.length || d.removidos.length ? d : null;
  }
  function rotuloDesfazer(acao, r) {
    const it = r.item || r.removido || {};
    switch (acao.tipo) {
      case 'gasto': return r.colecao === 'contas' ? `pagamento da conta ${it.nome}` : `${acao.desc || acao.cat} (${brl(acao.valor)})`;
      case 'pagar_conta': return `pagamento da conta ${it.nome}`;
      case 'pagar_fatura': return `pagamento da fatura ${it.nome}`;
      case 'config_cartao': return `ajuste do cartão ${it.nome}`;
      case 'entrada': return `${acao.desc || acao.cat} (${brl(acao.valor)})`;
      case 'ticket_credito': return `crédito de ${brl(acao.valor)} no Ticket`;
      case 'parcelado': return `${acao.desc} (${acao.n}x de ${brl(acao.valorParcela)})`;
      case 'conta': return `conta ${it.nome}`;
      case 'renda_fixa': return `renda fixa ${it.nome}`;
      case 'meta_sonho': return `meta do sonho ${it.nome}`;
      case 'compromisso': return `compromisso ${it.titulo}`;
      case 'sonho': return `${brl(acao.valor)} guardados em ${it.nome}`;
      case 'resgate': return `retirada de ${brl(acao.valor)}`;
      case 'excluir': return `exclusão de ${it.desc || it.titulo || it.nome || it.cat}`;
      default: return 'última ação';
    }
  }
  /** Aplica a ação e guarda como desfazê-la. */
  function aplicar(estado, acao, opts) {
    const foto = acao && DESFAZIVEIS.has(acao.tipo) ? fotografar(estado) : null;
    const r = executar(estado, acao, opts);
    if (foto) {
      const d = compararFoto(estado, foto);
      if (d) { d.rotulo = rotuloDesfazer(acao, r); d.em = Date.now(); estado.desfazer = (estado.desfazer || []).concat([d]).slice(-5); r.podeDesfazer = true; }
    }
    return r;
  }
  function desfazerUltima(estado) {
    const u = (estado.desfazer || []).pop();
    if (!u) return { ok: false, msg: 'Não há nada para desfazer. 🙂' };
    const now = Date.now();
    for (const x of u.criados) remover(estado, x.col, x.id);
    for (const x of u.alterados) {
      const lista = estado[x.col] = estado[x.col] || [];
      const i = lista.findIndex((y) => y.id === x.item.id);
      if (x.col === 'sonhos' && i >= 0) { const volta = new Set((x.item.aportes || []).map((ap) => ap.id)); for (const ap of lista[i].aportes || []) if (!volta.has(ap.id)) marcarExcluido(estado, ap.id, 'aportes'); }
      const item = Object.assign({}, x.item, { upd: now });
      if (i >= 0) lista[i] = item; else lista.push(item);
    }
    // o item volta com id novo: o antigo ficou marcado como excluído nos outros aparelhos
    const novos = {};
    for (const x of u.removidos) { const id = uid(); novos[x.item.id] = id; (estado[x.col] = estado[x.col] || []).push(Object.assign({}, x.item, { id, upd: now })); }
    for (const s of estado.sonhos || []) for (const ap of s.aportes || []) if (ap.entradaId && novos[ap.entradaId]) ap.entradaId = novos[ap.entradaId];
    return { ok: true, colecao: 'lancamentos', msg: `↩️ Desfeito: ${u.rotulo}.` };
  }
  function executar(estado, acao, opts) {
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
        const ym = mesDe(acao.data || iso(hoje));
        const c = acharConta(estado, acao.chave, ym);
        if (!c) return { ok: false, msg: 'Não encontrei essa conta cadastrada. 🤔 Me diga o valor, ex.: "paguei 120 de luz".' };
        c.pagos = c.pagos || {}; c.pagos[ym] = true; c.upd = now;
        return { ok: true, item: c, colecao: 'contas', msg: `✅ Marquei *${c.nome}* (${brl(valorConta(c, ym))}) como paga em ${nomeMes(ym)}. Uma preocupação a menos! 😌` };
      }
      case 'gasto': {
        if (acao.paguei) {
          const ym = mesDe(acao.data);
          const c = acharConta(estado, acao.chave, ym);
          if (c) { c.pagos = c.pagos || {}; c.pagos[ym] = true; if (acao.valor) definirValorConta(c, ym, acao.valor); c.upd = now; return { ok: true, item: c, colecao: 'contas', msg: `✅ Conta *${c.nome}* paga: ${brl(valorConta(c, ym))} em ${nomeMes(ym)}. Uma preocupação a menos! 😌` }; }
        }
        const cc = garantirCartao(estado, acao.cartao);
        const tkc = acao.ticket ? garantirTicket(estado, acao.ticket) : null;
        const item = { id: uid(), tipo: 'gasto', data: acao.data, desc: acao.desc, cat: acao.cat, valor: acao.valor, pago: !cc && acao.pagamento !== 'Cartão', pagamento: cc ? 'Cartão' : (acao.pagamento || ''), cartaoId: cc ? cc.id : undefined, origem, upd: now };
        if (tkc) { item.ticket = true; item.ticketId = tkc.id; }
        estado.lancamentos.push(item);
        let txtCartao = '';
        if (tkc) { const sd = saldoTicket(estado, tkc.id); txtCartao = `\n🎟️ Pago no *${tkc.nome}*. Saldo: ${brl(sd)}.` + (sd < 0 ? '\n⚠️ O saldo ficou negativo. Se já caiu crédito, me diga: "caiu 800 no ticket".' : ''); }
        else if (cc) { const f = fatura(estado, cc.id, mesFatura(cc, acao.data), hoje); txtCartao = `\n💳 Lançado no cartão *${cc.nome}* — fatura que vence em ${dataBR(f.venc)}: ${brl(f.total)}.`; if (acao.cartao.novo) txtCartao += `\n💡 Para acertar as datas, me diga: "a fatura do ${cc.nome} vence dia 10 e fecha dia 3".`; }
        else if (acao.pagamento && acao.pagamento !== 'Cartão') txtCartao = `\n✅ Pago no ${acao.pagamento === 'Dinheiro' ? 'dinheiro' : acao.pagamento} — já saiu do seu saldo do mês.`;
        else if (acao.cartaoSemBanco) txtCartao = (estado.cartoes || []).length ? `\n💳 Em qual cartão? Diga, por ex.: "no cartão ${(estado.cartoes[0] || {}).nome}".` : '\n💳 Dica: diga o banco ("cartão de crédito Itaú") que eu separo por cartão.';
        const r = resumoMes(estado, mesDe(acao.data));
        let extra = '';
        if (r.orcamento > 0 && !tkc) {
          if (r.pctOrcamento >= 1) extra = `\n⚠️ Atenção: você passou do orçamento do mês (${Math.round(r.pctOrcamento * 100)}%). Vamos segurar um pouquinho? 💛`;
          else if (r.pctOrcamento >= 0.85) extra = `\n🟡 Você já usou ${Math.round(r.pctOrcamento * 100)}% do orçamento. Faltam ${brl(r.orcamento - r.gastoTotal)}.`;
          else extra = `\n✅ Orçamento sob controle: ${Math.round(r.pctOrcamento * 100)}% usado.`;
        }
        const lim = catInfo(acao.cat).limite;
        if (lim > 0) { const g = r.porCategoria[acao.cat] || 0; if (g > lim) extra += `\n🔔 ${acao.cat} passou do limite de ${brl(lim)}.`; }
        return { ok: true, item, colecao: 'lancamentos', msg: `${catInfo(acao.cat).emoji} Anotado! ${brl(acao.valor)} em *${acao.cat}*${acao.desc && acao.desc !== acao.cat ? ` (${acao.desc})` : ''} — ${dataBR(acao.data)}.${txtCartao}${extra}` };
      }
      case 'entrada': {
        const ymE = mesDe(acao.data);
        const rf = acharRenda(estado, acao.cat, ymE);
        if (rf) {
          // renda fixa: a entrada deste mês é uma só; lançar de novo só ajusta o valor
          const idR = idRenda(rf, ymE);
          const ja = estado.lancamentos.find((l) => l.id === idR || (l.rendaId === rf.id && mesDe(l.data) === ymE));
          rf.lancados = rf.lancados || {}; rf.lancados[ymE] = true; rf.upd = now;
          if (ja) { ja.valor = acao.valor; ja.data = acao.data; ja.upd = now; return { ok: true, item: ja, colecao: 'lancamentos', msg: `💰 Atualizei *${rf.nome}* de ${nomeMes(ymE)} para ${brl(acao.valor)}.` }; }
          const excluido = (estado.excluidos || []).some((x) => x.id === idR);
          const itemR = { id: excluido ? uid() : idR, tipo: 'entrada', data: acao.data, desc: acao.desc, cat: acao.cat, valor: acao.valor, pago: true, origem, rendaId: rf.id, upd: now };
          estado.lancamentos.push(itemR);
          return { ok: true, item: itemR, colecao: 'lancamentos', msg: `💰 Que notícia boa${nomeP ? ', ' + nomeP : ''}! Entrada de ${brl(acao.valor)} (${acao.cat}) registrada.` };
        }
        const item = { id: uid(), tipo: 'entrada', data: acao.data, desc: acao.desc, cat: acao.cat, valor: acao.valor, pago: true, origem, upd: now };
        estado.lancamentos.push(item);
        return { ok: true, item, colecao: 'lancamentos', msg: `💰 Que notícia boa${nomeP ? ', ' + nomeP : ''}! Entrada de ${brl(acao.valor)} (${acao.cat}) registrada.` };
      }
      case 'ticket_credito': {
        const tkc = garantirTicket(estado, acao.ticket);
        if (!tkc) return { ok: false, msg: 'Não encontrei esse cartão. Confere pra mim? 🤔' };
        const item = { id: uid(), ticketId: tkc.id, data: acao.data || iso(hoje), desc: 'Crédito', valor: acao.valor, origem, upd: now };
        estado.recargas = estado.recargas || [];
        estado.recargas.push(item);
        return { ok: true, item, colecao: 'recargas', msg: `🎟️ Crédito de ${brl(acao.valor)} no *${tkc.nome}*!\nSaldo: ${brl(saldoTicket(estado, tkc.id))}. 💙` };
      }
      case 'ver_ticket': {
        const lista = estado.tickets || [];
        if (!lista.length) return { ok: true, msg: '🎟️ Seu Ticket ainda não tem crédito. Quando cair, me diga: "caiu 800 no ticket". 💙' };
        const ymT = mesDe(iso(hoje));
        const umSo = acao.ticket && acao.ticket.id && !acao.ticket.generico ? lista.filter((c) => c.id === acao.ticket.id) : lista;
        const linhas = umSo.map((c) => `🎟️ *${c.nome}*\nSaldo: ${brl(saldoTicket(estado, c.id))}\nGasto em ${nomeMes(ymT)}: ${brl(gastoTicketMes(estado, c.id, ymT))}`).join('\n\n');
        return { ok: true, msg: linhas + (acao.dica ? '\n\nPara lançar, me diga: "caiu 800 no ticket" ou "gastei 50 no mercado no ticket".' : '') };
      }
      case 'parcelado': {
        const cc = garantirCartao(estado, acao.cartao);
        const inicio = cc && acao.data ? mesFatura(cc, acao.data) : acao.inicio;
        const item = { id: uid(), desc: acao.desc, cat: acao.cat, valor: acao.valorParcela, n: acao.n, inicio, origem, upd: now };
        if (cc) ligarCartaoParcelado(estado, item, cc.id, hoje);
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
          if (acao.tipo === 'ver_fatura') return { ok: true, msg: '💳 *Suas faturas*\n' + cartoes.map((c) => { const f = fatura(estado, c.id, acao.ymAuto ? faturaDaVez(estado, c, hoje) : acao.ym, hoje); return `• ${c.nome}: ${brl(f.total)}, vence ${dataBR(f.venc)} — ${rotuloFatura(f)}`; }).join('\n') };
          return { ok: false, msg: 'Qual cartão? 🤔 ' + cartoes.map((c) => c.nome).join(', ') + '.\nEx.: "paguei a fatura do ' + cartoes[0].nome + '"' };
        }
        const ymF = acao.ymAuto ? faturaDaVez(estado, cc, hoje) : acao.ym;
        const f = fatura(estado, cc.id, ymF, hoje);
        if (acao.tipo === 'ver_fatura') return { ok: true, msg: `💳 *Fatura ${cc.nome} — ${nomeMes(ymF)}*\nTotal: ${brl(f.total)}${f.anterior ? ` (inclui ${brl(f.anterior)} do mês anterior)` : ''}\nVence em ${dataBR(f.venc)} · ${rotuloFatura(f)}${f.situacao === 'parcial' ? `\nPago ${brl(f.pago)} · falta ${brl(f.falta)}` : ''}\n\nQuando pagar, me diga: "paguei a fatura do ${cc.nome}" ou "paguei 500 da fatura do ${cc.nome}".` };
        const parcial = acao.parcial && acao.valor != null && acao.valor < f.total - 0.005;
        pagarFatura(estado, cc.id, ymF, parcial ? 'parcial' : 'total', acao.valor);
        const f2 = fatura(estado, cc.id, ymF, hoje);
        if (parcial) return { ok: true, item: cc, colecao: 'cartoes', msg: `💳 Pagamento parcial registrado na fatura *${cc.nome}* de ${mesCurto(ymF)}: pago ${brl(f2.pago)} de ${brl(f2.total)}.\n⚠️ Ficou faltando ${brl(f2.falta)} — vai aparecer na próxima fatura. Cuidado com os juros do rotativo! 💛` };
        return { ok: true, item: cc, colecao: 'cartoes', msg: `✅ Fatura *${cc.nome}* de ${mesCurto(ymF)} paga: ${brl(f2.total)}. Uma preocupação a menos! 😌` };
      }
      case 'conta': {
        const existente = estado.contas.find((c) => sem(c.nome) === sem(acao.nome));
        const ymC = mesDe(acao.vencimento || iso(hoje));
        if (existente) { if (acao.valor) definirValorConta(existente, ymC, acao.valor); existente.dia = acao.dia; delete existente.ate; existente.upd = now; return { ok: true, item: existente, colecao: 'contas', msg: `🗓️ Atualizei a conta *${existente.nome}*: vence todo dia ${existente.dia}${valorConta(existente, ymC) ? ', ' + brl(valorConta(existente, ymC)) : ''}. Vou te lembrar um dia antes e no dia. 😉` }; }
        const item = { id: uid(), nome: acao.nome, cat: acao.cat, valor: acao.valor, dia: acao.dia, recorrente: acao.recorrente !== false, mesUnico: acao.recorrente === false ? ymC : '', desde: ymC, pagos: {}, origem, upd: now };
        estado.contas.push(item);
        return { ok: true, item, colecao: 'contas', msg: `🗓️ Conta cadastrada: *${acao.nome}*${acao.valor ? ' — ' + brl(acao.valor) : ''}, vence dia ${acao.dia}. Pode deixar que eu te lembro um dia antes e no dia do vencimento. 💙` };
      }
      case 'renda_fixa': {
        estado.rendas = estado.rendas || [];
        const ymR = mesDe(iso(hoje));
        const exR = estado.rendas.find((r) => sem(r.nome) === sem(acao.nome) && contaNoMes(r, ymR));
        if (exR) {
          definirValorConta(exR, ymR, acao.valor); exR.dia = acao.dia; exR.upd = now;
          const l = estado.lancamentos.find((x) => x.rendaId === exR.id && mesDe(x.data) === ymR); if (l) { l.valor = acao.valor; l.upd = now; }
          return { ok: true, item: exR, colecao: 'rendas', msg: `💰 Atualizei *${exR.nome}*: ${brl(acao.valor)}, todo dia ${exR.dia}. 💙` };
        }
        const itemR = { id: uid(), nome: acao.nome, cat: acao.cat, valor: acao.valor, dia: Math.max(1, Math.min(31, +acao.dia || 5)), desde: ymR, lancados: {}, origem, upd: now };
        // se este mês já foi lançado à mão, não lança de novo
        if (estado.lancamentos.some((l) => l.tipo === 'entrada' && mesDe(l.data) === ymR && l.cat === acao.cat)) itemR.lancados[ymR] = true;
        estado.rendas.push(itemR);
        garantirRendas(estado, hoje);
        return { ok: true, item: itemR, colecao: 'rendas', msg: `💰 Renda fixa cadastrada: *${itemR.nome}*, ${brl(itemR.valor)} todo dia ${itemR.dia}. Ela entra sozinha todo mês, sem você lançar. 💙` };
      }
      case 'meta_sonho': {
        estado.sonhos = estado.sonhos || [];
        let s = acharSonho(estado.sonhos, acao.nome); let criado = false;
        if (s) { s.custo = acao.valor; s.upd = now; }
        else { s = { id: uid(), nome: acao.nome, emoji: '⭐', custo: acao.valor, prazo: '', guardadoAntes: 0, aportes: [], upd: now }; estado.sonhos.push(s); criado = true; }
        return { ok: true, item: s, colecao: 'sonhos', msg: `🌈 ${criado ? 'Sonho criado' : 'Meta atualizada'}: *${s.nome}*, ${brl(acao.valor)}. Quando guardar, me diga: "guardei 200 para ${s.nome.toLowerCase()}". ⭐` };
      }
      case 'conversa': return { ok: true, msg: acao.msg };
      case 'falta_valor': return { ok: false, pergunta: { tipo: 'valor', texto: acao.texto, em: now }, msg: 'Quanto foi? 🙂 É só me mandar o valor.' };
      case 'quanto_posso': {
        const ymQ = mesDe(iso(hoje)); const rq = resumoMes(estado, ymQ);
        const temOrc = Number(estado.perfil && estado.perfil.orcamento) > 0;
        if (!temOrc && !rq.entradas) return { ok: true, msg: '🌱 Ainda não sei a sua renda deste mês. Me diga: "meu salário é 3500 todo dia 5" ou "orçamento 3000".' };
        const livre = centavos(temOrc ? rq.orcamento - rq.gastoTotal : rq.sobra);
        const dias = diasNoMes(ymQ) - hoje.getDate() + 1;
        if (livre <= 0) return { ok: true, msg: `💛 O ${temOrc ? 'orçamento' : 'dinheiro'} deste mês já acabou${livre < 0 ? ` e passou ${brl(-livre)}` : ''}. Vamos segurar até o mês virar?` };
        return { ok: true, msg: `💵 Até o fim do mês, você ainda pode gastar ${brl(livre)}.\nDá ${brl(Math.floor(livre / dias * 100) / 100)} por dia, contando hoje (${dias} ${dias === 1 ? 'dia' : 'dias'}).` };
      }
      case 'maior_gasto': {
        const ymM = mesDe(iso(hoje)); const rm = resumoMes(estado, ymM);
        if (!rm.maiorCategoria) return { ok: true, msg: `🌱 Ainda não há gastos em ${nomeMes(ymM)}.` };
        const totM = Object.values(rm.porCategoria).reduce((q, w) => q + w, 0);
        return { ok: true, msg: `🔝 Seu maior gasto em ${nomeMes(ymM)} é *${rm.maiorCategoria.nome}*: ${brl(rm.maiorCategoria.valor)} (${Math.round(rm.maiorCategoria.valor / totM * 100)}% do total).` };
      }
      case 'consulta_gasto': {
        const achados = (estado.lancamentos || []).filter((l) => l.tipo === 'gasto' && mesDe(l.data) === acao.ym && (acao.cat ? l.cat === acao.cat : sem(l.desc + ' ' + l.cat).includes(acao.termo)));
        const totC = acao.cat ? centavos(resumoMes(estado, acao.ym).porCategoria[acao.cat] || 0) : centavos(somaValor(achados));
        if (!totC) return { ok: true, msg: `🔎 Não achei gastos com ${acao.cat || acao.termo} em ${nomeMes(acao.ym)}.` };
        return { ok: true, msg: `🔎 Em ${nomeMes(acao.ym)} você gastou ${brl(totC)} com *${acao.cat || acao.termo}*${achados.length ? ` (${achados.length} ${achados.length === 1 ? 'lançamento' : 'lançamentos'})` : ''}.` };
      }
      case 'plano': return { ok: true, msg: acao.msg || '💭 Entendi isso como um plano ou uma pergunta, então não lancei nada.\nQuando acontecer, me diga: "comprei ...", "paguei ..." ou "guardei ...".' };
      case 'compromisso': {
        const item = { id: uid(), titulo: acao.titulo, data: acao.data, hora: acao.hora || '', lembrar: true, feito: false, origem, upd: now };
        estado.agenda.push(item);
        const jaPassou = acao.data < iso(hoje);
        return { ok: true, item, colecao: 'agenda', msg: `📌 Compromisso anotado: *${acao.titulo}* — ${dataBR(acao.data)}${acao.hora ? ' às ' + acao.hora : ''}. ${jaPassou ? '⚠️ Essa data já passou, então não vou lembrar. Confere pra mim?' : `Eu te lembro no dia${acao.hora ? ' e 1 hora antes' : ''}! ⏰`}` };
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
        const alvo = acharExclusao(estado, acao);
        if (!alvo.item) return { ok: false, msg: alvo.msg };
        if (alvo.col === 'contas') { encerrarConta(estado, alvo.item.id, mesDe(iso(hoje))); return { ok: true, removido: alvo.item, colecao: 'contas', msg: `🗑️ Conta *${alvo.item.nome}* encerrada. Os meses anteriores continuam no seu histórico.` }; }
        remover(estado, alvo.col, alvo.item.id);
        if (alvo.col === 'agenda') return { ok: true, removido: alvo.item, colecao: 'agenda', msg: `🗑️ Compromisso *${alvo.item.titulo}* removido.` };
        if (alvo.col === 'recargas') return { ok: true, removido: alvo.item, colecao: 'recargas', msg: `🗑️ Prontinho! Excluí o crédito de ${brl(alvo.item.valor)} do Ticket. Saldo: ${brl(saldoTicket(estado, alvo.item.ticketId))}.` };
        const l = alvo.item;
        return { ok: true, removido: l, colecao: 'lancamentos', msg: `🗑️ Prontinho! Excluí ${l.tipo === 'entrada' ? 'a entrada' : 'o gasto'} de ${brl(l.valor)} (${l.desc || l.cat}, ${dataBR(l.data)}).` };
      }
      case 'desfazer': return desfazerUltima(estado);
      case 'resumo': return { ok: true, msg: textoResumo(estado, mesDe(iso(hoje)), hoje) };
      case 'contas_pendentes': return { ok: true, msg: textoContas(estado, hoje) };
      case 'agenda_hoje': return { ok: true, msg: textoAgenda(estado, hoje) };
      case 'ajuda': return { ok: true, msg: textoAjuda(estado) };
      default: return { ok: false, msg: 'Hmm, não entendi direitinho. 🙈 Tente assim:\n• "gastei 35 reais na padaria"\n• "conta de luz vence dia 10, 120 reais"\n• "dentista amanhã às 15h"\n• "exclui o gasto de 35"\n• "resumo"' };
    }
  }

  function acharConta(estado, chave, ym) {
    const t = ' ' + sem(chave) + ' ';
    let melhor = null, pts = 0;
    for (const c of estado.contas || []) {
      if (ym && !contaNoMes(c, ym)) continue;
      const ps = sem(c.nome).split(/\s+/).filter((p) => p.length > 2 && !['conta', 'apto', 'casa', 'das', 'dos', 'para'].includes(p));
      const n = ps.filter((p) => t.includes(' ' + p)).length;
      if (n > pts) { pts = n; melhor = c; }
    }
    return melhor;
  }
  /** Encontra o que a pessoa pediu para excluir, sem excluir ainda. */
  function acharExclusao(estado, acao) {
    if (acao.alvoId) {
      const item = (estado[acao.alvoCol] || []).find((x) => x.id === acao.alvoId);
      return item ? { col: acao.alvoCol, item } : { msg: 'Esse item já não existe. 🙂' };
    }
    if (acao.alvo === 'agenda') {
      const cand = estado.agenda.filter((a) => !acao.termo || acao.termo.split(' ').some((p) => p.length > 2 && sem(a.titulo).includes(p)));
      const a = cand.sort((x, y) => (y.upd || 0) - (x.upd || 0))[0];
      return a ? { col: 'agenda', item: a } : { msg: 'Não encontrei esse compromisso. 🤔' };
    }
    if (acao.alvo === 'recarga') {
      let cand = (estado.recargas || []).slice();
      if (acao.valor != null) cand = cand.filter((r) => Math.abs(r.valor - acao.valor) < 0.005);
      if (acao.data) cand = cand.filter((r) => r.data === acao.data);
      const r = cand.sort((a, b) => (b.upd || 0) - (a.upd || 0))[0];
      return r ? { col: 'recargas', item: r } : { msg: `Não encontrei esse crédito do Ticket${acao.valor != null ? ' de ' + brl(acao.valor) : ''}. Confere pra mim? 🤔` };
    }
    if (acao.alvo === 'conta') {
      const c = estado.contas.find((x) => acao.termo && contaNoMes(x, mesDe(iso(new Date()))) && acao.termo.split(' ').some((p) => p.length > 2 && sem(x.nome).includes(p)));
      return c ? { col: 'contas', item: c } : { msg: 'Não encontrei essa conta. 🤔' };
    }
    const termos = (acao.termo || '').split(' ').filter((p) => p.length > 2 && !['gasto', 'lancamento', 'ultimo', 'valor', 'reais', 'aquele', 'esse'].includes(p));
    let cand = estado.lancamentos.slice();
    if (acao.valor != null) cand = cand.filter((l) => Math.abs(l.valor - acao.valor) < 0.005);
    if (acao.data) cand = cand.filter((l) => l.data === acao.data);
    if (termos.length) {
      const c2 = cand.filter((l) => termos.some((p) => sem(l.desc + ' ' + l.cat + (l.ticket ? ' ticket vale alimentacao refeicao' : '')).includes(p)));
      if (c2.length || acao.valor == null) cand = c2;
    }
    if (!cand.length) return { msg: `Não encontrei esse lançamento${acao.valor != null ? ' de ' + brl(acao.valor) : ''}. Confere pra mim? 🤔` };
    return { col: 'lancamentos', item: cand.sort((a, b) => (b.upd || 0) - (a.upd || 0))[0] };
  }
  function descreverAlvo(alvo) {
    const x = alvo.item;
    if (alvo.col === 'agenda') return `o compromisso *${x.titulo}*`;
    if (alvo.col === 'contas') return `a conta *${x.nome}*`;
    if (alvo.col === 'recargas') return `o crédito de ${brl(x.valor)} do Ticket (${dataBR(x.data)})`;
    return `${x.tipo === 'entrada' ? 'a entrada' : 'o gasto'} de ${brl(x.valor)} (${x.desc || x.cat}, ${dataBR(x.data)})`;
  }
  function rotuloFatura(f) { return { paga: '✅ Paga', parcial: '🟡 Paga parcialmente', vencida: '🔴 Vencida', aberta: '⏳ Em aberto', vazia: 'Sem compras' }[f.situacao]; }
  function remover(estado, col, id) {
    if (col === 'lancamentos') {
      const l = (estado.lancamentos || []).find((x) => x.id === id);
      if (l && l.sonhoId) { const sn = (estado.sonhos || []).find((x) => x.id === l.sonhoId); if (sn) { for (const ap of sn.aportes || []) if (ap.entradaId === id) marcarExcluido(estado, ap.id, 'aportes'); sn.aportes = (sn.aportes || []).filter((ap) => ap.entradaId !== id); sn.upd = Date.now(); } }
    }
    estado[col] = (estado[col] || []).filter((x) => x.id !== id);
    marcarExcluido(estado, id, col);
  }
  function marcarExcluido(estado, id, col) {
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
  /** Valor de uma conta ou renda fixa naquele mês: mudar o valor agora não reescreve os meses passados. */
  function valorConta(c, ym) {
    const h = c && c.hist;
    if (!h || !h.length) return Number(c && c.valor) || 0;
    let v = h[0].valor;
    for (const x of h) if (x.de <= ym) v = x.valor;
    return Number(v) || 0;
  }
  function definirValorConta(c, ym, valor) {
    valor = Number(valor) || 0;
    if (valorConta(c, ym) === valor) return;
    const h = (c.hist && c.hist.length ? c.hist : [{ de: c.desde || '0000-00', valor: Number(c.valor) || 0 }]).filter((x) => x.de !== ym);
    h.push({ de: ym, valor });
    h.sort((a, b) => a.de.localeCompare(b.de));
    c.hist = h; c.valor = h[h.length - 1].valor; c.upd = Date.now();
  }
  /** Parar uma conta fixa sem apagar o que ela representou nos meses anteriores. */
  function encerrarConta(estado, id, ym, col) {
    col = col || 'contas';
    const c = (estado[col] || []).find((x) => x.id === id); if (!c) return;
    const feito = col === 'rendas' ? c.lancados : c.pagos;
    if (c.recorrente === false || (c.desde && c.desde >= ym && !(feito && feito[ym]))) { remover(estado, col, id); return; }
    c.ate = feito && feito[ym] ? ym : somaMes(ym, -1);
    c.upd = Date.now();
  }

  // ---------------------------------------------------------------- renda fixa
  const idRenda = (r, ym) => 'rf-' + r.id + '-' + ym;
  function acharRenda(estado, cat, ym) {
    if (!cat || cat === 'Outra renda') return null;
    return (estado.rendas || []).find((r) => r.cat === cat && contaNoMes(r, ym)) || null;
  }
  /** Lança as rendas fixas que já chegaram. O id é fixo por mês: celular e servidor nunca duplicam. */
  function garantirRendas(estado, hoje) {
    let mudou = false;
    const ymHoje = mesDe(iso(hoje));
    const excl = new Set((estado.excluidos || []).map((x) => x.id));
    estado.lancamentos = estado.lancamentos || [];
    for (const r of estado.rendas || []) {
      r.lancados = r.lancados || {};
      let ym = r.desde || ymHoje;
      for (let i = 0; i < 36 && ym <= ymHoje; i++, ym = somaMes(ym, 1)) {
        if (r.lancados[ym] || !contaNoMes(r, ym)) continue;
        const dia = Math.min(+r.dia || 1, diasNoMes(ym));
        if (ym === ymHoje && hoje.getDate() < dia) continue;
        const id = idRenda(r, ym);
        r.lancados[ym] = true; r.upd = Date.now(); mudou = true;
        if (excl.has(id) || estado.lancamentos.some((l) => l.id === id)) continue;
        estado.lancamentos.push({ id, tipo: 'entrada', data: ym + '-' + pad(dia), desc: r.nome, cat: r.cat, valor: valorConta(r, ym), pago: true, origem: 'renda_fixa', rendaId: r.id, upd: Date.now() });
      }
    }
    return mudou;
  }

  function resumoMes(estado, ym) {
    const L = (estado.lancamentos || []).filter((l) => mesDe(l.data) === ym);
    const entradasReais = L.filter((l) => l.tipo === 'entrada').reduce((a, b) => a + b.valor, 0);
    // renda fixa que ainda vai cair neste mês
    const previsto = (estado.rendas || []).filter((r) => contaNoMes(r, ym) && !(r.lancados && r.lancados[ym])).reduce((a, b) => a + valorConta(b, ym), 0);
    const entradas = entradasReais + previsto;
    const gastosDia = L.filter((l) => l.tipo === 'gasto' && !l.ticket).reduce((a, b) => a + b.valor, 0);
    const ticketGasto = L.filter((l) => l.tipo === 'gasto' && l.ticket).reduce((a, b) => a + b.valor, 0);
    const contas = (estado.contas || []).filter((c) => contaNoMes(c, ym));
    const fixas = contas.reduce((a, b) => a + valorConta(b, ym), 0);
    const fixasPagas = contas.filter((c) => c.pagos && c.pagos[ym]).reduce((a, b) => a + valorConta(b, ym), 0);
    const parcs = (estado.parcelados || []).map((p) => ({ p, k: parcelaNoMes(p, ym) })).filter((x) => x.k);
    const parcelas = parcs.reduce((a, b) => a + b.p.valor, 0);
    const guardado = (estado.sonhos || []).reduce((a, s) => a + (s.aportes || []).filter((x) => mesDe(x.data) === ym && contaNoGuardado(x)).reduce((q, w) => q + (Number(w.valor) || 0), 0), 0);
    const anuaisMes = (estado.anuais || []).filter((a) => +a.mes === +ym.slice(5, 7));
    const gastoTotal = gastosDia + fixas + parcelas;
    const sobraAntes = entradas - gastoTotal;
    const sobra = sobraAntes - guardado;
    const porCategoria = {};
    L.filter((l) => l.tipo === 'gasto').forEach((l) => { porCategoria[l.cat] = (porCategoria[l.cat] || 0) + l.valor; });
    contas.forEach((c) => { porCategoria[c.cat] = (porCategoria[c.cat] || 0) + valorConta(c, ym); });
    parcs.forEach((x) => { porCategoria[x.p.cat] = (porCategoria[x.p.cat] || 0) + x.p.valor; });
    const orcamento = Number(estado.perfil && estado.perfil.orcamento) || entradas;
    const _ym = ym;
    // saldo acumulado
    let saldoAcum = Number(estado.perfil && estado.perfil.saldoInicial) || 0;
    const meses = mesesComDados(estado);
    if (meses.length) for (let m = meses[0], i = 0; m < ym && i < 600; m = somaMes(m, 1), i++) saldoAcum += resumoSimples(estado, m);
    saldoAcum += sobra;
    const maior = Object.entries(porCategoria).sort((a, b) => b[1] - a[1])[0];
    return {
      ym, entradas, entradasReais, previsto, gastosDia, ticketGasto, fixas, fixasPagas, parcelas, parcs, contas, guardado, gastoTotal, sobraAntes, sobra, saldoAcum, porCategoria, orcamento,
      pctOrcamento: orcamento > 0 ? gastoTotal / orcamento : 0, pctGuardado: entradas > 0 ? guardado / entradas : 0,
      maiorCategoria: maior ? { nome: maior[0], valor: maior[1] } : null, anuaisMes, lancamentos: L,
      // dinheiro que já saiu de fato: gastos pagos (dinheiro, pix, débito), contas pagas, faturas pagas e o que foi guardado
      jaSaiu: (() => { const g = L.filter((l) => l.tipo === 'gasto' && !l.ticket && !l.cartaoId && l.pagamento !== 'Cartão').reduce((a, b) => a + b.valor, 0); const fat = (estado.cartoes || []).reduce((a, c) => a + Object.entries(c.faturas || {}).reduce((q, [ymF, reg]) => { if (!reg || (reg.em ? mesDe(iso(new Date(reg.em))) : ymF) !== ym) return q; const f = fatura(estado, c.id, ymF); return q + (f ? f.pago : 0); }, 0), 0); const parcSem = parcs.filter((x) => !x.p.cartaoId && x.p.pagos && x.p.pagos[ym]).reduce((a, b) => a + b.p.valor, 0); return g + fixasPagas + fat + parcSem + guardado; })()
    };
  }
  function resumoSimples(estado, ym) {
    const L = (estado.lancamentos || []).filter((l) => mesDe(l.data) === ym);
    const e = L.filter((l) => l.tipo === 'entrada').reduce((a, b) => a + b.valor, 0);
    const g = L.filter((l) => l.tipo === 'gasto' && !l.ticket).reduce((a, b) => a + b.valor, 0);
    const f = (estado.contas || []).filter((c) => contaNoMes(c, ym)).reduce((a, b) => a + valorConta(b, ym), 0);
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
        if (dia === d.getDate() && !(c.pagos && c.pagos[ym])) out.push({ conta: c, data: iso(d), emDias: i, ym, valor: valorConta(c, ym) });
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
    let s = `📊 *Resumo de ${nomeMes(ym)}*${nome ? ' — ' + nome : ''}\n\n💰 Entrou: ${brl(r.entradasReais)}${r.previsto ? `\n   • Ainda vai cair: ${brl(r.previsto)}` : ''}\n🛒 Gastos: ${brl(r.gastoTotal)}\n   • Contas fixas: ${brl(r.fixas)}\n   • Dia a dia: ${brl(r.gastosDia)}\n   • Parcelas: ${brl(r.parcelas)}\n⭐ Guardei p/ sonhos: ${brl(r.guardado)}\n✅ Sobrou: ${brl(r.sobra)}`;
    for (const c of estado.tickets || []) s += `\n🎟️ ${c.nome}: saldo ${brl(saldoTicket(estado, c.id))} · gastei ${brl(gastoTicketMes(estado, c.id, ym))}`;
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
    if (atras.length) s += '\n⚠️ Atrasadas:\n' + atras.map((c) => `• ${c.nome} — ${brl(valorConta(c, mesDe(iso(hoje))))} (dia ${c.dia})`).join('\n') + '\n';
    if (prox.length) s += '\n' + prox.map((x) => `• ${x.emDias === 0 ? '*HOJE*' : x.emDias === 1 ? '*Amanhã*' : dataBR(x.data)} — ${x.conta.nome}: ${brl(x.valor)}`).join('\n');
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
    return `Oi${n}! 💙 Eu sou o *Sonhaí*, seu parceiro das finanças.\n\nVocê pode me mandar texto ou áudio:\n🛒 "gastei 45,90 no mercado"\n🛒 "gastei 50 no mercado e 30 na padaria"\n💰 "recebi 3500 de salário"\n🔁 "meu salário é 3500 todo dia 5"\n🛍️ "comprei uma TV de 2000 em 10x no cartão Nubank"\n💳 "gastei 10 na lanchonete no cartão de crédito Itaú"\n💳 "paguei a fatura do Itaú" • "paguei 500 da fatura do Bradesco"\n🎟️ "caiu 800 no ticket" • "gastei 50 no mercado no ticket" • "saldo do ticket"\n🗓️ "conta de luz vence dia 10, 150 reais"\n📌 "dentista quinta às 14h"\n⭐ "guardei 200 para a viagem" • "investi 500"\n🌈 "meta de 10000 para o carro"\n💸 "retire 500 da reserva de emergência e coloque como renda"\n🔁 "transfere 300 da reserva para a viagem"\n🗑️ "exclui o gasto de 45,90"\n↩️ "desfazer"\n📊 "resumo" • "contas a pagar" • "agenda"\n🔎 "quanto gastei com mercado" • "quanto posso gastar hoje" • "qual meu maior gasto"`;
  }
  function barra(p) { const n = Math.max(0, Math.min(10, Math.round(p * 10))); return '🟩'.repeat(Math.min(n, 7)) + (n > 7 ? '🟨'.repeat(Math.min(n - 7, 2)) : '') + (n > 9 ? '🟥' : '') + '⬜'.repeat(10 - n); }
  function mensagemHumor(r) {
    if (r.entradas === 0 && r.gastoTotal === 0) return '🌱 Mês novinho! Comece anotando o que entrou.';
    if (r.entradas === 0) return '🌱 Ainda não sei a sua renda deste mês. Me diga: "meu salário é 3500 todo dia 5" ou "recebi 3500 de salário".';
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

  // ------------------------------------------------------------ palavra do dia
  const VERSICULOS = [
    ['Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará.', 'Salmos 37:5'],
    ['Tudo posso naquele que me fortalece.', 'Filipenses 4:13'],
    ['O meu Deus, segundo as suas riquezas, suprirá todas as vossas necessidades em glória, por Cristo Jesus.', 'Filipenses 4:19'],
    ['Confia ao Senhor as tuas obras, e teus pensamentos serão estabelecidos.', 'Provérbios 16:3'],
    ['Os pensamentos do diligente tendem só à abundância.', 'Provérbios 21:5'],
    ['Lança o teu cuidado sobre o Senhor, e ele te susterá.', 'Salmos 55:22'],
    ['O Senhor é o meu pastor; nada me faltará.', 'Salmos 23:1'],
    ['Eu é que sei que pensamentos tenho a vosso respeito, diz o Senhor; pensamentos de paz e não de mal, para vos dar o fim que desejais.', 'Jeremias 29:11'],
    ['Buscai primeiro o Reino de Deus, e a sua justiça, e todas essas coisas vos serão acrescentadas.', 'Mateus 6:33'],
    ['Não estejais inquietos por coisa alguma; antes, as vossas petições sejam em tudo conhecidas diante de Deus, pela oração e súplica, com ação de graças.', 'Filipenses 4:6'],
    ['A bênção do Senhor é que enriquece, e ele não lhe acrescenta dores.', 'Provérbios 10:22'],
    ['Honra ao Senhor com a tua fazenda e com as primícias de toda a tua renda.', 'Provérbios 3:9'],
    ['Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento.', 'Provérbios 3:5'],
    ['Os que esperam no Senhor renovarão as suas forças.', 'Isaías 40:31'],
    ['Esforça-te e tem bom ânimo; não temas, nem te espantes, porque o Senhor, teu Deus, é contigo por onde quer que andares.', 'Josué 1:9'],
    ['Deleita-te também no Senhor, e ele te concederá o que deseja o teu coração.', 'Salmos 37:4'],
    ['Quem é fiel no mínimo também é fiel no muito.', 'Lucas 16:10'],
    ['Vai ter com a formiga, ó preguiçoso; olha para os seus caminhos e sê sábio. Ela prepara no verão o seu pão.', 'Provérbios 6:6,8'],
    ['Tesouro desejável e azeite há na casa do sábio, mas o homem insensato os devora.', 'Provérbios 21:20'],
    ['Sejam vossos costumes sem avareza, contentando-vos com o que tendes.', 'Hebreus 13:5'],
    ['Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia.', 'Salmos 46:1'],
    ['Sabemos que todas as coisas contribuem juntamente para o bem daqueles que amam a Deus.', 'Romanos 8:28'],
    ['Cada um contribua segundo propôs no seu coração, não com tristeza ou por necessidade, porque Deus ama ao que dá com alegria.', '2 Coríntios 9:7'],
    ['Não nos cansemos de fazer o bem, porque a seu tempo ceifaremos, se não houvermos desfalecido.', 'Gálatas 6:9'],
    ['O choro pode durar uma noite, mas a alegria vem pela manhã.', 'Salmos 30:5'],
    ['O Senhor te abençoe e te guarde.', 'Números 6:24'],
    ['Com a sabedoria se edifica a casa, e com o entendimento ela se estabelece.', 'Provérbios 24:3'],
    ['Qual de vós, querendo edificar uma torre, não se assenta primeiro a fazer as contas dos gastos, para ver se tem com que a acabar?', 'Lucas 14:28'],
    ['Melhor é o pouco com o temor do Senhor do que um grande tesouro onde há inquietação.', 'Provérbios 15:16'],
    ['Lâmpada para os meus pés é tua palavra e luz, para o meu caminho.', 'Salmos 119:105'],
    ['Este é o dia que fez o Senhor; regozijemo-nos e alegremo-nos nele.', 'Salmos 118:24']
  ];
  /** Um versículo por dia (o mesmo para todos no mesmo dia). */
  function versiculoDoDia(data) {
    const d = data || new Date();
    const n = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
    const v = VERSICULOS[n % VERSICULOS.length];
    return { texto: v[0], ref: v[1] };
  }

  // ---------------------------------------------------------------- fala
  // Frases que o Whisper inventa quando o áudio tem silêncio ou ruído (vêm de legendas de vídeos)
  const ALUCINACOES = [
    /legendas?\s+(?:pela|por|feitas? pela)\s+comunidade\s+amara\.?\s*org/gi, /amara\.org/gi,
    /(?:obrigad[oa]|valeu)\s+por\s+(?:assistir|ver|ouvir)[^.!?]*[.!?]?/gi,
    /inscreva-se\s+(?:no|em nosso|no nosso)\s+canal[^.!?]*[.!?]?/gi, /ative\s+o\s+sininho[^.!?]*[.!?]?/gi,
    /deixe\s+(?:seu|o seu)\s+like[^.!?]*[.!?]?/gi, /at[eé]\s+o\s+pr[oó]ximo\s+v[ií]deo[^.!?]*[.!?]?/gi,
    /\b(?:sous-titrage|subtitles by)[^.!?]*[.!?]?/gi, /^\s*(?:tchau[\s,!.]*)+$/i
  ];
  // Grafias que o reconhecimento de voz costuma errar
  const TROCAS_FALA = [
    [/\b(?:i|ai|ay)\s*-?\s*food\b/gi, 'iFood'], [/\bnu\s+bank\b/gi, 'Nubank'], [/\bpic\s*pay\b/gi, 'PicPay'],
    [/\bmercado\s+pago\b/gi, 'Mercado Pago'], [/\buber\s+eats\b/gi, 'Uber Eats'],
    [/\br\s*\$\s*/gi, 'R$ '], [/(\d)\s*reais\b/gi, '$1 reais'], [/(\d)\s+,(\d{2})\b/g, '$1,$2']
  ];
  /** Limpa o texto vindo de um áudio: tira frases inventadas e acerta grafias comuns. */
  function limparFala(txt) {
    let t = String(txt || '').replace(/\s+/g, ' ').trim();
    for (const re of ALUCINACOES) t = t.replace(re, ' ');
    for (const [re, por] of TROCAS_FALA) t = t.replace(re, por);
    t = t.replace(/\s+/g, ' ').replace(/^[\s.,;!?…-]+/, '').trim();
    // um "Obrigado." solto no fim, depois de um pedido, costuma ser inventado
    t = t.replace(/^(.{6,}?)[.!,]?\s+(?:obrigad[oa]|tchau)[.!]*$/i, '$1');
    t = t.replace(/[.!…]+$/, '').trim();
    if (!/[a-z0-9à-ú]/i.test(t)) return '';
    return t;
  }
  /** Entre várias versões do que a pessoa disse, fica com a que o Sonhaí entende melhor. */
  function notaFrase(f, opts) {
    const a = interpretar(f, opts || {});
    let n = 0;
    const varios = typeof separarLancamentos === 'function' ? separarLancamentos(f, opts || {}) : null;
    if (Array.isArray(varios) && varios.length > 1) n += 6;
    if (a.tipo && a.tipo !== 'desconhecido') n += 4;
    if (a.valor > 0 || a.valorParcela > 0 || (Array.isArray(a.itens) && a.itens.length)) n += 2;
    if (a.cat && a.cat !== 'Outros') n += 1;
    if ((a.cartao && a.cartao.id) || a.sonhoId) n += 1;
    return n;
  }
  function melhorFrase(frases, opts) {
    let melhor = '', nota = -1;
    for (const f of frases || []) {
      const t = limparFala(f); if (!t) continue;
      const n = notaFrase(t, opts);
      if (n > nota) { nota = n; melhor = t; }
    }
    return melhor;
  }

  // ---------------------------------------------------------------- mesclagem
  const COLECOES = ['lancamentos', 'contas', 'rendas', 'parcelados', 'cartoes', 'tickets', 'recargas', 'anuais', 'sonhos', 'dividas', 'agenda', 'categorias'];
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
    // cada dinheiro guardado é um registro: o que entrou em dois aparelhos soma, nunca sobrescreve
    for (const s of out.sonhos || []) {
      const porId = new Map();
      for (const lado of [a, b]) { const c = (lado.sonhos || []).find((x) => x && x.id === s.id); for (const ap of (c && Array.isArray(c.aportes) && c.aportes) || []) if (ap && ap.id && !exc.has(ap.id)) porId.set(ap.id, ap); }
      s.aportes = (Array.isArray(s.aportes) ? s.aportes : []).filter((ap) => ap && !ap.id).concat([...porId.values()].sort((x, y) => String(x.data).localeCompare(String(y.data))));
    }
    if ((b.perfilUpd || 0) > (a.perfilUpd || 0)) { out.perfil = b.perfil; out.perfilUpd = b.perfilUpd; }
    out.chat = (b.chat || a.chat || []).slice(-200);
    return out;
  }

  return {
    CATEGORIAS, TIPOS_ENTRADA, INCENTIVOS, MESES, sem, uid, iso, pad, brl, dataBR, mesDe, nomeMes, mesCurto, somaMes, difMeses, diasNoMes, agora,
    limparFala, melhorFrase, VERSICULOS, versiculoDoDia, LIMITE_VALOR, LIMITE_TEXTO, sanearEstado, BANCOS, detectarCartao, garantirCartao, mesFatura, diaFechamento, vencFatura, primeiraFaturaAberta, parcelaDesde, ligarCartaoParcelado, fatura, pagarFatura, faturasAVencer, faturaDaVez, rotuloFatura,
    NOME_TICKET, COR_TICKET, detectarTicket, garantirTicket, saldoTicket, gastoTicketMes, extratoTicket, excluirTicket,
    conversar, interpretar, separarLancamentos, lancarVarios, aplicar, remover, marcarExcluido, acharExclusao, descreverAlvo, valorConta, definirValorConta, encerrarConta, garantirRendas, acharSonho, retirarDoSonho, estadoVazio, marcarPrimeiroAcesso, resumoMes, mesesComDados, parcelaNoMes, contaNoMes, contasAVencer, contasAtrasadas, totalSonho,
    textoResumo, textoContas, textoAgenda, textoAjuda, mensagemHumor, barra, mesclar, adivinharCategoria, extrairValor, extrairData, extrairHora
  };
});
