/**
 * Sonhaí — servidor (Node 18+, sem dependências externas)
 *
 * • Serve o app (pasta public/) — instalável no celular (PWA)
 * • Recebe mensagens do WhatsApp (texto e ÁUDIO) pela API oficial da Meta (WhatsApp Cloud API)
 * • Transcreve áudios (OpenAI) e lança gastos, contas, compromissos, exclusões…
 * • Envia lembretes: contas 1 dia antes e no dia do vencimento, compromissos do dia e 1h antes
 * • Sincroniza os dados entre WhatsApp e app
 *
 * Como rodar:  node server.js     (configure o arquivo .env — veja .env.exemplo)
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
// Funciona com os arquivos na pasta public/ ou todos soltos na mesma pasta (upload pelo GitHub)
const PUB = fs.existsSync(path.join(__dirname, 'public', 'index.html')) ? path.join(__dirname, 'public') : __dirname;
const CC = require(path.join(PUB, 'core.js'));
// só estes arquivos podem ser abertos pelo navegador
const PUBLICOS = new Set(['index.html', 'core.js', 'sw.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'privacidade.html', 'termos.html']);

// ------------------------------------------------------------------ config
(function carregarEnv() {
  const f = path.join(__dirname, '.env');
  if (!fs.existsSync(f)) return;
  for (const linha of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
})();
const CFG = {
  porta: +process.env.PORT || 3000,
  url: (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + (process.env.PORT || 3000)).replace(/\/$/, ''),
  waToken: process.env.WHATSAPP_TOKEN || '',
  waPhoneId: process.env.WHATSAPP_PHONE_ID || '',
  waVerify: process.env.WHATSAPP_VERIFY_TOKEN || 'sonhai',
  waSecret: process.env.WHATSAPP_APP_SECRET || '',
  waVersao: process.env.WHATSAPP_API_VERSION || 'v21.0',
  template: process.env.WHATSAPP_TEMPLATE || '', // ex.: lembrete_sonhai
  templateLang: process.env.WHATSAPP_TEMPLATE_LANG || 'pt_BR',
  openai: process.env.OPENAI_API_KEY || '',
  modeloAudio: process.env.TRANSCRIBE_MODEL || 'whisper-1',
  tz: process.env.APP_TZ || 'America/Sao_Paulo',
  admin: process.env.ADMIN_KEY || '',
  dados: process.env.DATA_DIR || path.join(__dirname, 'data')
};
const DEMO = !CFG.waToken || !CFG.waPhoneId;
const log = (...a) => console.log(new Date().toISOString(), ...a);

// ------------------------------------------------------------------ banco de dados
// Com SUPABASE_URL + SUPABASE_KEY os dados ficam no Supabase (grátis, permanente).
// Sem eles, ficam no arquivo data/db.json (bom para testar no computador).
const SB = { url: (process.env.SUPABASE_URL || '').replace(/\/$/, ''), key: process.env.SUPABASE_KEY || '' };
const USA_SB = !!(SB.url && SB.key);
const ARQ = path.join(CFG.dados, 'db.json');
let DB = { usuarios: {}, tokens: {}, resets: {} };
async function sb(metodo, caminho, corpo, prefer) {
  const r = await fetch(SB.url + '/rest/v1/' + caminho, {
    method: metodo,
    // chaves novas (sb_secret_...) vão só no "apikey"; as antigas (JWT eyJ...) também no Authorization
    headers: Object.assign({ apikey: SB.key, 'Content-Type': 'application/json', Prefer: prefer || 'return=minimal' }, SB.key.startsWith('eyJ') ? { Authorization: 'Bearer ' + SB.key } : {}),
    body: corpo ? JSON.stringify(corpo) : undefined
  });
  if (!r.ok) throw new Error('Supabase ' + r.status + ': ' + (await r.text()).slice(0, 300));
  return r.status === 204 ? null : r.json().catch(() => null);
}
const salvos = new Map(); // chave -> texto já gravado
async function carregarDB() {
  if (!USA_SB) {
    fs.mkdirSync(CFG.dados, { recursive: true });
    try { DB = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) { /* primeiro uso */ }
    return;
  }
  let de = 0; const passo = 1000;
  for (;;) {
    const linhas = await sb('GET', `kv?select=chave,valor&order=chave&offset=${de}&limit=${passo}`, null, 'count=none');
    for (const l of linhas) {
      if (l.chave === 'sys') { DB.tokens = l.valor.tokens || {}; DB.resets = l.valor.resets || {}; }
      else if (l.chave.startsWith('u:')) DB.usuarios[l.chave.slice(2)] = l.valor;
      salvos.set(l.chave, JSON.stringify(l.valor));
    }
    if (linhas.length < passo) break; de += passo;
  }
}
let salvarT = null, gravando = false, pendente = false;
function salvarDB() {
  clearTimeout(salvarT);
  salvarT = setTimeout(gravar, 400);
}
async function gravar() {
  if (!USA_SB) {
    const tmp = ARQ + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(DB));
    fs.renameSync(tmp, ARQ);
    return;
  }
  if (gravando) { pendente = true; return; }
  gravando = true;
  try {
    const atual = new Map();
    atual.set('sys', JSON.stringify({ tokens: DB.tokens, resets: DB.resets }));
    for (const [k, u] of Object.entries(DB.usuarios)) if (u) atual.set('u:' + k, JSON.stringify(u));
    const mudou = [];
    for (const [k, txt] of atual) if (salvos.get(k) !== txt) mudou.push({ chave: k, valor: JSON.parse(txt), atualizado: new Date().toISOString() });
    const apagar = [...salvos.keys()].filter((k) => !atual.has(k));
    for (let i = 0; i < mudou.length; i += 50) await sb('POST', 'kv?on_conflict=chave', mudou.slice(i, i + 50), 'resolution=merge-duplicates,return=minimal');
    for (const k of apagar) await sb('DELETE', 'kv?chave=eq.' + encodeURIComponent(k));
    mudou.forEach((m) => salvos.set(m.chave, atual.get(m.chave)));
    apagar.forEach((k) => salvos.delete(k));
  } catch (e) { log('Falha ao gravar no Supabase (tento de novo):', e.message); pendente = true; }
  finally { gravando = false; if (pendente) { pendente = false; setTimeout(gravar, 3000); } }
}
/** Número no padrão internacional (55 + DDD + número). */
function normFone(f) {
  let d = String(f || '').replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) d = '55' + d;
  return d;
}
/** Chave do usuário: no Brasil ignora o "9" extra (o WhatsApp às vezes manda sem ele). */
function chaveFone(f) {
  const d = normFone(f);
  return d.startsWith('55') && d.length >= 12 ? '55' + d.slice(2, 4) + d.slice(-8) : d;
}
function prepararDB() {
DB.usuarios = DB.usuarios || {}; DB.tokens = DB.tokens || {};
// migração: chaves antigas -> chave nova; tokens antigos (texto) -> objeto
for (const k of Object.keys(DB.usuarios)) { const nk = chaveFone(k); if (nk !== k && !DB.usuarios[nk]) { DB.usuarios[nk] = DB.usuarios[k]; delete DB.usuarios[k]; } }
for (const [t, v] of Object.entries(DB.tokens)) if (typeof v === 'string') DB.tokens[t] = { k: chaveFone(v), em: Date.now() };
DB.resets = DB.resets || {};
}

const SESSAO_DIAS = 180;
function novaSessao(u) {
  const t = crypto.randomBytes(24).toString('base64url');
  DB.tokens[t] = { k: chaveFone(u.fone), em: Date.now() };
  salvarDB();
  return t;
}
function usuario(fone, criar) {
  const k = chaveFone(fone);
  let u = DB.usuarios[k];
  if (!u && criar) {
    u = DB.usuarios[k] = { fone: normFone(fone), estado: CC.estadoVazio(), rev: 1, enviados: {}, ultimaMsg: 0, criadoEm: Date.now(), verificado: true };
    u.estado.perfil.whatsapp = normFone(fone);
    salvarDB();
  }
  return u;
}
function porToken(t) {
  const s = t && DB.tokens[t];
  if (!s) return null;
  if (Date.now() - s.em > SESSAO_DIAS * 864e5) { delete DB.tokens[t]; salvarDB(); return null; }
  return DB.usuarios[s.k] || null;
}

// ------------------------------------------------------------------ senhas
function hashSenha(senha, sal) {
  sal = sal || crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(String(senha), sal, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return sal + ':' + h;
}
function confereSenha(senha, guardado) {
  if (!guardado) return false;
  const [sal, h] = guardado.split(':');
  const novo = hashSenha(senha, sal).split(':')[1];
  return crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(novo, 'hex'));
}
const senhaFraca = (s) => !s || String(s).length < 6 ? 'A senha precisa ter pelo menos 6 caracteres.' : /^(\d)\1+$|^123456|^654321|^senha|^abcdef/i.test(s) ? 'Essa senha é fácil de adivinhar. Tente outra.' : '';
// limite de tentativas: 5 erros em 15 min por número e 30 por IP
const tentativas = new Map();
function bloqueado(chave, max) { const x = tentativas.get(chave); return x && x.n >= max && Date.now() - x.em < 15 * 60e3; }
function errou(chave) { const x = tentativas.get(chave); if (!x || Date.now() - x.em > 15 * 60e3) tentativas.set(chave, { n: 1, em: Date.now() }); else x.n++; }
const codigoVerif = () => String(crypto.randomInt(1000, 9999));
function linkEntrada(u) { return `${CFG.url}/?t=${novaSessao(u)}`; }

// ------------------------------------------------------------------ WhatsApp
async function waApi(caminho, corpo) {
  const r = await fetch(`https://graph.facebook.com/${CFG.waVersao}/${caminho}`, {
    method: corpo ? 'POST' : 'GET',
    headers: { Authorization: 'Bearer ' + CFG.waToken, 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('WhatsApp ' + r.status + ': ' + JSON.stringify(j.error || j));
  return j;
}
/** Envia mensagem. Fora da janela de 24h a Meta exige modelo (template) aprovado. */
async function enviar(u, texto, opts = {}) {
  u.estado.chat = u.estado.chat || [];
  u.estado.chat.push({ de: 'bot', txt: texto, em: Date.now() });
  if (u.estado.chat.length > 200) u.estado.chat = u.estado.chat.slice(-200);
  salvarDB();
  if (DEMO) { log('[DEMO → ' + u.fone + ']\n' + texto); return; }
  const dentroJanela = Date.now() - (u.ultimaMsg || 0) < 23.5 * 3600 * 1000;
  try {
    if (dentroJanela || !CFG.template || opts.forcarTexto) {
      await waApi(`${CFG.waPhoneId}/messages`, { messaging_product: 'whatsapp', to: u.fone, type: 'text', text: { body: texto.slice(0, 4000), preview_url: true } });
    } else {
      // parâmetros de modelo não aceitam quebra de linha
      const p = texto.replace(/\n+/g, ' • ').replace(/\s{4,}/g, '   ').slice(0, 1000);
      await waApi(`${CFG.waPhoneId}/messages`, { messaging_product: 'whatsapp', to: u.fone, type: 'template', template: { name: CFG.template, language: { code: CFG.templateLang }, components: [{ type: 'body', parameters: [{ type: 'text', text: p }] }] } });
    }
  } catch (e) { log('Falha ao enviar para', u.fone, e.message); }
}
async function baixarMidia(id) {
  const meta = await waApi(id);
  const r = await fetch(meta.url, { headers: { Authorization: 'Bearer ' + CFG.waToken } });
  if (!r.ok) throw new Error('mídia ' + r.status);
  return { buf: Buffer.from(await r.arrayBuffer()), tipo: meta.mime_type || 'audio/ogg' };
}
async function transcrever(buf, tipo) {
  if (!CFG.openai) throw new Error('Configure OPENAI_API_KEY para entender áudios.');
  const ext = /mpeg|mp3/.test(tipo) ? 'mp3' : /mp4|m4a|aac/.test(tipo) ? 'm4a' : /webm/.test(tipo) ? 'webm' : /wav/.test(tipo) ? 'wav' : 'ogg';
  const fd = new FormData();
  fd.append('file', new Blob([buf], { type: tipo.split(';')[0] }), 'audio.' + ext);
  fd.append('model', CFG.modeloAudio);
  fd.append('language', 'pt');
  fd.append('prompt', 'Gastos, contas e compromissos em reais. Ex.: gastei 45,90 no mercado; conta de luz vence dia 10; dentista amanhã às 15h.');
  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + CFG.openai }, body: fd });
  const j = await r.json();
  if (!r.ok) throw new Error('transcrição: ' + JSON.stringify(j.error || j));
  return String(j.text || '').trim();
}

// ------------------------------------------------------------------ conversa
async function receber(fone, texto, origemAudio) {
  const novo = !DB.usuarios[chaveFone(fone)];
  const u = usuario(fone, true);
  u.ultimaMsg = Date.now();
  u.fone = normFone(fone); // o número exato que o WhatsApp usa
  const t0 = CC.sem(texto).trim();
  // conta criada no app e ainda não confirmada pelo WhatsApp
  if (u.verificado === false) {
    const m0 = t0.match(/^sonhai\s*(\d{4})$/);
    if (m0 && m0[1] === u.codigo) { u.verificado = true; delete u.codigo; salvarDB(); return enviar(u, `✅ WhatsApp confirmado, ${u.estado.perfil.nome || ''}! 💙\nAgora você pode lançar gastos por aqui, por texto ou áudio, e vai receber os lembretes.\n\n` + CC.textoAjuda(u.estado).split('\n').slice(2).join('\n')); }
    if (t0 === 'nova conta') { DB.usuarios[chaveFone(fone)] = null; delete DB.usuarios[chaveFone(fone)]; salvarDB(); return receber(fone, 'oi'); }
    return enviar(u, '🔐 Existe uma conta Sonhaí com este número esperando confirmação.\nSe foi você que criou, mande o código que aparece no app, assim: *SONHAI 1234*\n\nNão foi você? Responda *NOVA CONTA* para começar a sua.', { forcarTexto: true });
  }
  if (/^(esqueci (a |minha )?senha|recuperar senha|trocar senha|nova senha)$/.test(t0)) {
    const cod = crypto.randomBytes(16).toString('base64url');
    DB.resets[cod] = { k: chaveFone(u.fone), em: Date.now() }; salvarDB();
    return enviar(u, `🔐 Para criar uma senha nova, toque no link (vale por 30 minutos):\n${CFG.url}/?r=${cod}\n\nSe não foi você que pediu, é só ignorar.`, { forcarTexto: true });
  }
  u.estado.chat.push({ de: 'me', txt: (origemAudio ? '🎤 ' : '') + texto, em: Date.now() });
  const hoje = CC.agora(CFG.tz);
  const t = CC.sem(texto);
  if (novo) {
    await enviar(u, `Olá! 💙 Que alegria ter você aqui.\nEu sou o *Sonhaí* e vou te ajudar a organizar o dinheiro sem complicação.\n\n📲 Abra seu app e crie sua senha:\n${linkEntrada(u)}\n\nComo você gostaria de ser chamado(a)? Responda: "meu nome é ..."`);
    if (/^(oi|ola|bom dia|boa tarde|boa noite|comecar|começar)\b/.test(t)) return;
  }
  let m = t.match(/^(meu nome e|me chame de|pode me chamar de|sou o|sou a)\s+(.+)/);
  if (m) {
    const nome = texto.split(/\s+/).slice(texto.split(/\s+/).length - m[2].split(/\s+/).length).join(' ').replace(/[.!]$/, '');
    u.estado.perfil.nome = nome.charAt(0).toUpperCase() + nome.slice(1); u.estado.perfilUpd = Date.now(); u.rev++;
    return enviar(u, `Prazer, ${u.estado.perfil.nome}! 🤗\n\n` + CC.textoAjuda(u.estado).split('\n').slice(2).join('\n'));
  }
  if (/^apagar meus dados$/.test(t)) return enviar(u, '⚠️ Isso apaga TODOS os seus lançamentos, contas, sonhos e compromissos, sem volta.\nSe tiver certeza, responda exatamente: *CONFIRMAR APAGAR*');
  if (/^confirmar apagar$/.test(t)) {
    for (const [tk, v] of Object.entries(DB.tokens)) if (v.k === chaveFone(u.fone)) delete DB.tokens[tk];
    delete DB.usuarios[chaveFone(u.fone)]; salvarDB();
    if (!DEMO) await waApi(`${CFG.waPhoneId}/messages`, { messaging_product: 'whatsapp', to: u.fone, type: 'text', text: { body: '🗑️ Pronto, seus dados foram apagados. Se quiser voltar, é só mandar "oi". Foi um prazer! 💙' } }).catch(() => {});
    return;
  }
  if (/^(link|app|aplicativo|abrir app|meu app)\b/.test(t)) return enviar(u, `📲 Seu acesso ao app (vale para este celular; não compartilhe):\n${linkEntrada(u)}`, { forcarTexto: true });
  m = t.match(/^(orcamento|meu orcamento|limite do mes)\D*([\d.,]+)/);
  if (m) { u.estado.perfil.orcamento = CC.extrairValor(m[2]).valor; u.estado.perfilUpd = Date.now(); u.rev++; return enviar(u, `🎯 Orçamento do mês definido: ${CC.brl(u.estado.perfil.orcamento)}. Eu te aviso quando estiver chegando perto!`); }

  const acao = CC.interpretar(texto, { hoje, categorias: u.estado.categorias, sonhos: u.estado.sonhos, cartoes: u.estado.cartoes });
  const r = CC.aplicar(u.estado, acao, { hoje, origem: 'whatsapp' });
  if (r.ok && r.colecao) u.rev++;
  let resp = r.msg;
  if (origemAudio) resp = `🎤 Entendi: "${texto}"\n\n` + resp;
  if (r.ok && r.item && ['gasto', 'entrada', 'parcelado', 'compromisso', 'conta', 'resgate'].includes(acao.tipo)) resp += '\n\nErrou? Responda *desfazer*.';
  await enviar(u, resp);
}

// ------------------------------------------------------------------ lembretes
function textoManha(u, hoje) {
  const e = u.estado; const nome = e.perfil.nome ? e.perfil.nome.split(/\s+/)[0] : '';
  const venc = CC.contasAVencer(e, hoje, 1);
  const atras = CC.contasAtrasadas(e, hoje);
  const hojeIso = CC.iso(hoje);
  const ag = (e.agenda || []).filter((a) => a.data === hojeIso && !a.feito && a.lembrar !== false).sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99'));
  const linhas = [];
  venc.filter((x) => x.emDias === 0).forEach((x) => linhas.push(`🔴 *HOJE* vence: ${x.conta.nome} — ${CC.brl(x.conta.valor)}`));
  venc.filter((x) => x.emDias === 1).forEach((x) => linhas.push(`🟡 *Amanhã* vence: ${x.conta.nome} — ${CC.brl(x.conta.valor)}`));
  const fv = CC.faturasAVencer(e, hoje, 1);
  fv.forEach((x) => linhas.push(`${x.emDias ? '🟡 *Amanhã*' : '🔴 *HOJE*'} vence a fatura do cartão *${x.fatura.cartao.nome}* — ${CC.brl(x.fatura.falta)}${x.fatura.situacao === 'parcial' ? ' (restante)' : ''}`));
  if (atras.length && hoje.getDay() === 1) atras.forEach((c) => linhas.push(`⚠️ Em atraso: ${c.nome} (dia ${c.dia}) — ${CC.brl(c.valor)}`));
  if (hoje.getDate() === 1) (e.anuais || []).filter((a) => +a.mes === hoje.getMonth() + 1).forEach((a) => linhas.push(`📌 Este mês vence: ${a.nome} — ${CC.brl(a.valor)}`));
  if (ag.length) { linhas.push(''); linhas.push('📌 *Compromissos de hoje:*'); ag.forEach((a) => linhas.push(`• ${a.hora ? a.hora + ' — ' : ''}${a.titulo}`)); }
  // segunda-feira: incentivo dos sonhos
  if (hoje.getDay() === 1 && (e.sonhos || []).some((s) => s.custo)) {
    const s = e.sonhos.filter((x) => x.custo).sort((a, b) => CC.totalSonho(b) / b.custo - CC.totalSonho(a) / a.custo)[0];
    const pct = Math.round(CC.totalSonho(s) / s.custo * 100);
    linhas.push(''); linhas.push(`⭐ Seu sonho *${s.nome}* está em ${pct}%. ${CC.INCENTIVOS[hoje.getDate() % CC.INCENTIVOS.length]}`);
  }
  if (!linhas.length) return '';
  const temConta = venc.length || atras.length || fv.length;
  const h = hoje.getHours(); const sd = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  return `${sd}${nome ? ', ' + nome : ''}! ☀️💙\n\n` + linhas.join('\n') + (temConta ? '\n\nQuando pagar, me responda: "paguei a conta de ..." ou "paguei a fatura do ..." (ou "paguei 500 da fatura do ..." se for parcial) ✅' : '');
}
function textoFimDoMes(u, hoje) {
  const r = CC.resumoMes(u.estado, CC.mesDe(CC.iso(hoje)));
  if (!r.entradas && !r.gastoTotal) return '';
  const cab = r.sobra >= 0 ? `🏆 *Parabéns!* ${CC.nomeMes(r.ym)} está terminando com saldo positivo de ${CC.brl(r.sobra)}${r.guardado ? ' e você ainda guardou ' + CC.brl(r.guardado) + ' para os seus sonhos' : ''}! Que orgulho! 🎉` : `💛 ${CC.nomeMes(r.ym)} está terminando no vermelho (${CC.brl(r.sobra)}). Tudo bem — mês que vem a gente ajusta junto. Comece revendo ${r.maiorCategoria ? r.maiorCategoria.nome : 'os gastos do dia a dia'}.`;
  return cab + '\n\n' + CC.textoResumo(u.estado, r.ym, hoje).split('\n').slice(2, 10).join('\n');
}
async function ciclo() {
  const agora = CC.agora(CFG.tz);
  const hojeIso = CC.iso(agora);
  const hm = CC.pad(agora.getHours()) + ':' + CC.pad(agora.getMinutes());
  for (const u of Object.values(DB.usuarios)) {
    if (!u || u.verificado === false) continue;
    const e = u.estado; u.enviados = u.enviados || {};
    const marca = async (chave, fn) => { if (u.enviados[chave]) return; u.enviados[chave] = Date.now(); salvarDB(); const t = fn(); if (t) await enviar(u, t); };
    try {
      if (hm >= (e.perfil.lembreteHora || '08:00')) await marca('manha:' + hojeIso, () => textoManha(u, agora));
      for (const a of e.agenda || []) {
        if (!a.hora || a.feito || a.lembrar === false || a.data !== hojeIso) continue;
        const [h, m] = a.hora.split(':').map(Number); const min = h * 60 + m - (agora.getHours() * 60 + agora.getMinutes());
        if (min <= 60 && min > 0) await marca('ag:' + a.id, () => `⏰ Daqui a ${min} min: *${a.titulo}* (${a.hora}). Pode contar com o Sonhaí! 💙`);
      }
      if (agora.getDate() === CC.diasNoMes(hojeIso.slice(0, 7)) && hm >= '19:00') await marca('fim:' + hojeIso.slice(0, 7), () => textoFimDoMes(u, agora));
    } catch (err) { log('lembrete', u.fone, err.message); }
    // limpa marcas antigas
    for (const k of Object.keys(u.enviados)) if (Date.now() - u.enviados[k] > 40 * 864e5) delete u.enviados[k];
  }
}
setInterval(() => ciclo().catch((e) => log('ciclo', e.message)), 60 * 1000);

// ------------------------------------------------------------------ HTTP
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
function lerCorpo(req, limite = 20 * 1024 * 1024) {
  return new Promise((ok, erro) => { const partes = []; let n = 0; req.on('data', (c) => { n += c.length; if (n > limite) { erro(new Error('grande demais')); req.destroy(); } else partes.push(c); }); req.on('end', () => ok(Buffer.concat(partes))); req.on('error', erro); });
}
// rotas de teste: só no seu computador, ou com a ADMIN_KEY
const testeLiberado = (req) => CFG.admin ? req.headers['x-admin-key'] === CFG.admin : /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '');
const autenticar = (req) => porToken((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const rota = url.pathname;
  try {
    // --- verificação do webhook (Meta)
    if (rota === '/webhook' && req.method === 'GET') {
      if (url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === CFG.waVerify) { res.writeHead(200); return res.end(url.searchParams.get('hub.challenge')); }
      res.writeHead(403); return res.end();
    }
    // --- mensagens recebidas
    if (rota === '/webhook' && req.method === 'POST') {
      const bruto = await lerCorpo(req);
      if (CFG.waSecret) {
        const assinatura = req.headers['x-hub-signature-256'] || '';
        const esperado = 'sha256=' + crypto.createHmac('sha256', CFG.waSecret).update(bruto).digest('hex');
        if (assinatura.length !== esperado.length || !crypto.timingSafeEqual(Buffer.from(assinatura), Buffer.from(esperado))) { res.writeHead(401); return res.end(); }
      }
      res.writeHead(200); res.end('ok'); // responde rápido; processa depois
      const corpo = JSON.parse(bruto.toString() || '{}');
      for (const ent of corpo.entry || []) for (const ch of ent.changes || []) for (const msg of (ch.value && ch.value.messages) || []) {
        (async () => {
          try {
            if (msg.type === 'text') await receber(msg.from, msg.text.body);
            else if (msg.type === 'audio') {
              const u = usuario(msg.from, true); u.ultimaMsg = Date.now();
              try { const m = await baixarMidia(msg.audio.id); const txt = await transcrever(m.buf, m.tipo); if (!txt) throw new Error('vazio'); await receber(msg.from, txt, true); }
              catch (e) { log('áudio', e.message); await enviar(u, '🙈 Não consegui entender o áudio. Pode repetir ou escrever?'); }
            } else if (msg.type === 'interactive' || msg.type === 'button') {
              const t = (msg.button && msg.button.text) || (msg.interactive && (msg.interactive.button_reply || msg.interactive.list_reply || {}).title) || '';
              if (t) await receber(msg.from, t);
            } else { const u = usuario(msg.from, true); u.ultimaMsg = Date.now(); await enviar(u, 'Por enquanto eu entendo textos e áudios. 😊 Mande "ajuda" para ver exemplos.'); }
          } catch (e) { log('mensagem', e.message); }
        })();
      }
      return;
    }
    // --- API do app
    if (rota === '/api/saude') {
      // mantém o banco gratuito ativo (o Supabase pausa projetos parados por 7 dias)
      if (USA_SB && Date.now() - (global.ultimoToqueSB || 0) > 6 * 3600e3) { global.ultimoToqueSB = Date.now(); sb('GET', 'kv?select=chave&limit=1').catch((e) => log('saúde', e.message)); }
      return json(res, 200, { ok: true, whatsapp: !DEMO, banco: USA_SB ? 'supabase' : 'arquivo', usuarios: Object.keys(DB.usuarios).length });
    }
    if (rota === '/api/config') return json(res, 200, { whatsapp: process.env.WHATSAPP_NUMERO_EXIBICAO || '', demo: DEMO });
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const corpoJSON = async () => { try { return JSON.parse((await lerCorpo(req, 64 * 1024)).toString() || '{}'); } catch (e) { return {}; } };
    if (rota === '/api/cadastro' && req.method === 'POST') {
      const b = await corpoJSON(); const fone = normFone(b.fone); const nome = String(b.nome || '').trim().slice(0, 60);
      if (bloqueado('ip:' + ip, 30)) return json(res, 429, { erro: 'Muitas tentativas. Espere alguns minutos.' });
      if (fone.length < 12 || fone.length > 13) return json(res, 400, { erro: 'Informe o WhatsApp com DDD. Ex.: (16) 99999-8888' });
      if (!nome) return json(res, 400, { erro: 'Como você quer ser chamado(a)?' });
      const fr = senhaFraca(b.senha); if (fr) return json(res, 400, { erro: fr });
      const ja = DB.usuarios[chaveFone(fone)];
      if (ja && ja.senha) return json(res, 409, { erro: 'Esse número já tem conta. Toque em "Entrar".' });
      if (ja && !ja.senha) return json(res, 409, { erro: 'Esse número já começou pelo WhatsApp. Mande "esqueci minha senha" para o Sonhaí no WhatsApp para criar sua senha.' });
      errou('ip:' + ip);
      const u = usuario(fone, true);
      u.senha = hashSenha(b.senha); u.estado.perfil.nome = nome; u.estado.perfilUpd = Date.now();
      if (b.estado && typeof b.estado === 'object' && !b.estado.demo) { u.estado = CC.mesclar(u.estado, b.estado); u.estado.perfil.nome = nome; u.estado.perfil.whatsapp = fone; }
      if (!DEMO) { u.verificado = false; u.codigo = codigoVerif(); }
      salvarDB();
      return json(res, 200, { token: novaSessao(u), verificado: u.verificado !== false, codigo: u.codigo || '' });
    }
    if (rota === '/api/login' && req.method === 'POST') {
      const b = await corpoJSON(); const k = chaveFone(b.fone);
      if (bloqueado('f:' + k, 5) || bloqueado('ip:' + ip, 30)) return json(res, 429, { erro: 'Muitas tentativas erradas. Espere 15 minutos ou mande "esqueci minha senha" no WhatsApp.' });
      const u = DB.usuarios[k];
      if (!u || !u.senha || !confereSenha(b.senha || '', u.senha)) { errou('f:' + k); errou('ip:' + ip); return json(res, 401, { erro: u && !u.senha ? 'Você ainda não criou senha. Mande "esqueci minha senha" para o Sonhaí no WhatsApp.' : 'Número ou senha incorretos.' }); }
      tentativas.delete('f:' + k);
      return json(res, 200, { token: novaSessao(u) });
    }
    if (rota === '/api/redefinir' && req.method === 'POST') {
      const b = await corpoJSON(); const r = DB.resets[b.codigo];
      if (!r || Date.now() - r.em > 30 * 60e3) return json(res, 400, { erro: 'Esse link expirou. Mande "esqueci minha senha" no WhatsApp de novo.' });
      const fr = senhaFraca(b.senha); if (fr) return json(res, 400, { erro: fr });
      const u = DB.usuarios[r.k]; if (!u) return json(res, 400, { erro: 'Conta não encontrada.' });
      u.senha = hashSenha(b.senha); delete DB.resets[b.codigo];
      for (const [tk, v] of Object.entries(DB.tokens)) if (v.k === r.k) delete DB.tokens[tk]; // derruba sessões antigas
      salvarDB();
      return json(res, 200, { token: novaSessao(u) });
    }
    if (rota === '/api/eu') {
      const u = autenticar(req); if (!u) return json(res, 401, { erro: 'Entre novamente.' });
      return json(res, 200, { fone: u.fone, nome: u.estado.perfil.nome, temSenha: !!u.senha, verificado: u.verificado !== false, codigo: u.verificado === false ? u.codigo : '' });
    }
    if (rota === '/api/senha' && req.method === 'POST') {
      const u = autenticar(req); if (!u) return json(res, 401, { erro: 'Entre novamente.' });
      const b = await corpoJSON();
      if (u.senha && !confereSenha(b.atual || '', u.senha)) return json(res, 400, { erro: 'A senha atual não confere.' });
      const fr = senhaFraca(b.nova); if (fr) return json(res, 400, { erro: fr });
      u.senha = hashSenha(b.nova); salvarDB();
      return json(res, 200, { ok: true });
    }
    if (rota === '/api/sair' && req.method === 'POST') {
      const t = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const b = await corpoJSON();
      const u = porToken(t);
      if (u && b.todos) { for (const [tk, v] of Object.entries(DB.tokens)) if (v.k === chaveFone(u.fone)) delete DB.tokens[tk]; } else delete DB.tokens[t];
      salvarDB(); return json(res, 200, { ok: true });
    }
    if (rota === '/api/estado') {
      const u = autenticar(req); if (!u) return json(res, 401, { erro: 'Faça login pelo link enviado no WhatsApp.' });
      if (req.method === 'GET') return json(res, 200, { estado: u.estado, rev: u.rev, fone: u.fone });
      if (req.method === 'PUT') {
        const { estado } = JSON.parse((await lerCorpo(req, 5 * 1024 * 1024)).toString());
        const chat = u.estado.chat;
        u.estado = CC.mesclar(estado, u.estado); u.estado.chat = chat; delete u.estado.demo; u.rev++; salvarDB();
        return json(res, 200, { estado: u.estado, rev: u.rev });
      }
    }
    if (rota === '/api/transcrever' && req.method === 'POST') {
      const u = autenticar(req); if (!u) return json(res, 401, { erro: 'não autorizado' });
      const buf = await lerCorpo(req);
      try { return json(res, 200, { texto: await transcrever(buf, req.headers['content-type'] || 'audio/webm') }); }
      catch (e) { return json(res, 500, { erro: e.message }); }
    }
    // simulador para testes locais (sem WhatsApp configurado) ou com chave de administrador
    if (rota === '/api/simular' && req.method === 'POST' && testeLiberado(req)) {
      const { de, texto } = JSON.parse((await lerCorpo(req)).toString());
      await receber(de, texto);
      const u = usuario(de); return json(res, 200, { respostas: u ? u.estado.chat.slice(-3) : [] });
    }
    if (rota === '/api/ciclo' && req.method === 'POST' && testeLiberado(req)) { await ciclo(); return json(res, 200, { ok: true }); }

    // --- arquivos do app
    const nomeArq = rota === '/' ? 'index.html' : decodeURIComponent(rota).replace(/^\/+/, '');
    let arq = PUBLICOS.has(nomeArq) ? path.join(PUB, nomeArq) : path.join(PUB, 'index.html');
    if (!fs.existsSync(arq)) arq = path.join(PUB, 'index.html');
    let conteudo = fs.readFileSync(arq);
    const ext = path.extname(arq);
    if (arq.endsWith('index.html')) conteudo = Buffer.from(conteudo.toString().replace('<!--CC_SERVER-->', '<script>window.CC_SERVER=true</script>'));
    res.writeHead(200, { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', 'Strict-Transport-Security': 'max-age=31536000', 'Content-Type': TIPOS[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' || arq.endsWith('sw.js') ? 'no-cache' : 'public, max-age=3600' });
    res.end(conteudo);
  } catch (e) {
    log('erro', rota, e.message);
    if (!res.headersSent) json(res, 500, { erro: 'Erro interno' });
  }
});
(async () => {
  try { await carregarDB(); } catch (e) { log('❌ Não consegui abrir o banco de dados:', e.message); process.exit(1); }
  prepararDB();
  servidor.listen(CFG.porta, () => {
  log(`💙 Sonhaí rodando em ${CFG.url} (porta ${CFG.porta})`);
  if (DEMO) log('⚠️  WhatsApp não configurado: modo demonstração (mensagens aparecem aqui no terminal). Veja o GUIA.');
  if (!CFG.openai) log('⚠️  OPENAI_API_KEY ausente: áudios do WhatsApp não serão transcritos.');
  log(USA_SB ? '🗄️  Dados no Supabase.' : '🗄️  Dados em ' + ARQ);
  });
})();
