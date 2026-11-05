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
// Funciona com os arquivos todos soltos na mesma pasta (upload pelo GitHub) ou na pasta public/.
// Os soltos têm prioridade: são sempre os da atualização mais recente.
const PUB = fs.existsSync(path.join(__dirname, 'index.html')) ? __dirname : path.join(__dirname, 'public');
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
  groq: process.env.GROQ_API_KEY || '',
  modeloAudio: process.env.TRANSCRIBE_MODEL || '',
  tgToken: process.env.TELEGRAM_TOKEN || '',
  tz: process.env.APP_TZ || 'America/Sao_Paulo',
  admin: process.env.ADMIN_KEY || '',
  dados: process.env.DATA_DIR || path.join(__dirname, 'data')
};
const DEMO = !CFG.waToken || !CFG.waPhoneId;
const PRODUCAO = !!process.env.RENDER || /^https:/.test(process.env.PUBLIC_URL || '');
const LOG_MENSAGENS = !PRODUCAO || process.env.LOG_MENSAGENS === '1'; // em produção não registra mensagens (LGPD)
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
    const linhas = await sb('GET', `kv?select=chave,valor&chave=not.like.backup*&order=chave&offset=${de}&limit=${passo}`, null, 'count=none');
    for (const l of linhas) {
      if (l.chave === 'sys') { DB.tokens = l.valor.tokens || {}; DB.resets = l.valor.resets || {}; DB.tg = l.valor.tg || {}; DB.tgcodigos = l.valor.tgcodigos || {}; DB.convites = l.valor.convites || {}; DB.config = l.valor.config || {}; DB.auditoria = l.valor.auditoria || []; }
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
    atual.set('sys', JSON.stringify({ tokens: DB.tokens, resets: DB.resets, tg: DB.tg || {}, tgcodigos: DB.tgcodigos || {}, convites: DB.convites || {}, config: DB.config || {}, auditoria: DB.auditoria || [] }));
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
// segurança: sessões e códigos ficam guardados só como hash (se o banco vazar, não dá para usar)
for (const nome of ['tokens', 'resets', 'convites', 'tgcodigos']) { const o = DB[nome] || {}; const novo = {}; for (const [kk, v] of Object.entries(o)) novo[/^[0-9a-f]{64}$/.test(kk) ? kk : H(kk)] = v; DB[nome] = novo; }
DB.auditoria = DB.auditoria || [];
DB.resets = DB.resets || {};
}

const SESSAO_DIAS = 180;
// usuário(s) master: números separados por vírgula na variável ADMIN_FONES
const ADMINS = new Set(String(process.env.ADMIN_FONES || '').split(/[,;\s]+/).filter(Boolean).map((f) => chaveFone(f)));
const ehAdmin = (u) => !!u && ADMINS.has(chaveFone(u.fone));

// ------------------------------------------------------------------ planos de acesso
const PLANOS = {
  gratis: { nome: 'Grátis (7 dias)', dias: 7 },
  '1m': { nome: '1 mês', meses: 1 },
  '3m': { nome: '3 meses', meses: 3 },
  '6m': { nome: '6 meses', meses: 6 },
  '12m': { nome: '1 ano', meses: 12 },
  ilimitado: { nome: 'Ilimitado' }
};
const hojeSP = () => CC.iso(CC.agora(CFG.tz));
/** Nova data de validade: soma o plano a partir de hoje (ou do fim do plano atual, se ainda estiver valendo). */
function calcValidade(plano, atual) {
  const p = PLANOS[plano]; if (!p || plano === 'ilimitado') return null;
  const h = hojeSP();
  const base = atual && atual >= h ? new Date(atual + 'T12:00') : new Date(h + 'T12:00');
  if (p.dias) base.setDate(base.getDate() + p.dias); else base.setMonth(base.getMonth() + p.meses);
  return CC.iso(base);
}
const expirado = (u) => !!u && !ehAdmin(u) && !!u.validade && hojeSP() > u.validade;
const diasRestantes = (u) => u && u.validade ? Math.round((new Date(u.validade + 'T12:00') - new Date(hojeSP() + 'T12:00')) / 864e5) : null;
const suporte = () => { const k = [...ADMINS][0]; return normFone(process.env.SUPORTE_WHATSAPP || '') || (k && DB.usuarios[k] ? DB.usuarios[k].fone : normFone(String(process.env.ADMIN_FONES || '').split(/[,;\s]+/)[0])) || ''; };
const fmtFone = (f) => { const d = String(f || '').replace(/\D/g, '').replace(/^55/, ''); return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}` : f; };
const msgExpirado = (u) => `⏳ Seu acesso ao Sonhaí venceu em ${CC.dataBR(u.validade)}. Para renovar, fale com o suporte${suporte() ? ' no WhatsApp ' + fmtFone(suporte()) : ''}. Seus dados continuam guardados. 💙`;
const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());
const porEmail = (e) => { e = String(e || '').trim().toLowerCase(); return e ? Object.values(DB.usuarios).find((u) => u && (u.email || '').toLowerCase() === e) : null; };
function senhaInicial() { const L = 'abcdefghjkmnpqrstuvwxyz'; let x = ''; for (let i = 0; i < 4; i++) x += L[crypto.randomInt(L.length)]; return x + '-' + crypto.randomInt(1000, 9999); }
function novoConvite(u) { DB.convites = DB.convites || {}; for (const [c, v] of Object.entries(DB.convites)) if (v.k === chaveFone(u.fone)) delete DB.convites[c]; const c = crypto.randomBytes(16).toString('base64url'); DB.convites[H(c)] = { k: chaveFone(u.fone), em: Date.now() }; return c; }
function textoAcesso(u, senha, convite) {
  return `Olá, ${u.estado.perfil.nome || ''}! 💙\nSeu acesso ao *Sonhaí* está pronto.\n\n📲 Abra e instale o app por este link:\n${CFG.url}/?acesso=${convite}\n\n👤 Login: ${fmtFone(u.fone)}${u.email ? ' ou ' + u.email : ''}\n🔑 Senha inicial: ${senha}\n📅 Plano: ${(PLANOS[u.plano] || PLANOS.ilimitado).nome}${u.validade ? ' (até ' + CC.dataBR(u.validade) + ')' : ''}\n\nNo primeiro acesso você cria a sua senha pessoal.`;
}
function H(x) { return crypto.createHash('sha256').update(String(x)).digest('hex'); }
const pega = (obj, k) => obj && Object.prototype.hasOwnProperty.call(obj, k) ? obj[k] : null;
function auditar(req, quem, acao, alvo) {
  DB.auditoria = DB.auditoria || [];
  DB.auditoria.push({ em: new Date().toISOString(), quem: quem ? (quem.estado.perfil.nome || quem.fone) : '?', acao, alvo: alvo || '', ip: ipDe(req) });
  if (DB.auditoria.length > 500) DB.auditoria = DB.auditoria.slice(-500);
  salvarDB();
}
// IP real: o último endereço do X-Forwarded-For é o que o Render adiciona (os anteriores podem ser falsos)
function ipDe(req) { const x = String(req.headers['x-forwarded-for'] || '').split(',').map((v) => v.trim()).filter(Boolean); return x.length ? x[x.length - 1] : (req.socket.remoteAddress || ''); }
function novaSessao(u) {
  const t = crypto.randomBytes(24).toString('base64url');
  DB.tokens[H(t)] = { k: chaveFone(u.fone), em: Date.now() };
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
  const s = t && pega(DB.tokens, H(t));
  if (!s) return null;
  if (Date.now() - s.em > SESSAO_DIAS * 864e5) { delete DB.tokens[H(t)]; salvarDB(); return null; }
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
const senhaFraca = (s) => { s = String(s || ''); if (s.length < 8) return 'A senha precisa ter pelo menos 8 caracteres, com letras e números.'; if (s.length > 128) return 'Senha longa demais.'; if (!/[a-zA-ZÀ-ú]/.test(s) || !/\d/.test(s)) return 'Use letras e números na senha.'; if (/^(.)\1+$|12345678|87654321|senha|password|sonhai|qwerty|abcd1234/i.test(s)) return 'Essa senha é fácil de adivinhar. Tente outra.'; return ''; };
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
  const canal = opts.canal || (u.telegram && (DEMO || u.verificado === false || u.canal === 'telegram') ? 'telegram' : 'whatsapp');
  if (canal === 'telegram') { if (u.telegram) return tgEnviar(u.telegram, texto); return; }
  if (DEMO) { if (LOG_MENSAGENS) log('[DEMO → ' + u.fone + ']\n' + texto); return; }
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
  if (!CFG.groq && !CFG.openai) throw new Error('Configure GROQ_API_KEY (grátis) ou OPENAI_API_KEY para entender áudios.');
  const ext = /mpeg|mp3/.test(tipo) ? 'mp3' : /mp4|m4a|aac/.test(tipo) ? 'm4a' : /webm/.test(tipo) ? 'webm' : /wav/.test(tipo) ? 'wav' : 'ogg';
  const fd = new FormData();
  fd.append('file', new Blob([buf], { type: tipo.split(';')[0] }), 'audio.' + ext);
  fd.append('model', CFG.modeloAudio || (CFG.groq ? 'whisper-large-v3-turbo' : 'whisper-1'));
  fd.append('language', 'pt');
  fd.append('prompt', 'Gastos, contas e compromissos em reais. Ex.: gastei 45,90 no mercado; conta de luz vence dia 10; dentista amanhã às 15h.');
  const base = CFG.groq ? (process.env.GROQ_API_BASE || 'https://api.groq.com/openai/v1') : 'https://api.openai.com/v1';
  const r = await fetch(base + '/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + (CFG.groq || CFG.openai) }, body: fd });
  const j = await r.json();
  if (!r.ok) throw new Error('transcrição: ' + JSON.stringify(j.error || j));
  return String(j.text || '').trim();
}

// ------------------------------------------------------------------ Telegram (grátis)
let TG_BOT = '';
const TG_API = process.env.TELEGRAM_API || 'https://api.telegram.org';
const TG_SEGREDO = CFG.tgToken ? crypto.createHash('sha256').update('sonhai:' + CFG.tgToken).digest('hex').slice(0, 32) : '';
async function tgApi(metodo, corpo) {
  const r = await fetch(`${TG_API}/bot${CFG.tgToken}/${metodo}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo || {}) });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error('Telegram: ' + (j.description || r.status));
  return j.result;
}
async function tgEnviar(chatId, texto) {
  try { await tgApi('sendMessage', { chat_id: chatId, text: texto.slice(0, 4000), parse_mode: 'Markdown', disable_web_page_preview: true }); }
  catch (e) { try { await tgApi('sendMessage', { chat_id: chatId, text: texto.replace(/\*/g, '').slice(0, 4000), disable_web_page_preview: true }); } catch (e2) { log('Telegram envio', e2.message); } }
}
async function tgIniciar() {
  if (!CFG.tgToken) return;
  try {
    TG_BOT = (await tgApi('getMe')).username;
    if (/^https:/.test(CFG.url)) await tgApi('setWebhook', { url: CFG.url + '/telegram', secret_token: TG_SEGREDO, allowed_updates: ['message'] });
    await tgApi('setMyCommands', { commands: [{ command: 'resumo', description: 'Resumo do mês' }, { command: 'contas', description: 'Contas a pagar' }, { command: 'agenda', description: 'Compromissos de hoje' }, { command: 'ajuda', description: 'O que posso dizer' }] });
    log('🤖 Telegram ligado: @' + TG_BOT);
  } catch (e) { log('❌ Telegram:', e.message); }
}
async function tgReceber(msg) {
  const chatId = msg.chat && msg.chat.id; if (!chatId) return;
  const texto = String(msg.text || '').trim();
  DB.tg = DB.tg || {}; DB.tgcodigos = DB.tgcodigos || {};
  const m = texto.match(/^\/start\s+(\S+)/);
  if (m) {
    const c = pega(DB.tgcodigos, H(m[1]));
    if (!c || Date.now() - c.em > 30 * 60e3) return tgEnviar(chatId, '⏰ Esse link expirou. No app, abra *Mais → Mensagens* e toque em *Conectar Telegram* de novo.');
    const u = DB.usuarios[c.k]; if (!u) return;
    if (u.telegram && u.telegram !== chatId) delete DB.tg[u.telegram];
    u.telegram = chatId; DB.tg[chatId] = c.k; delete DB.tgcodigos[H(m[1])]; u.rev++; salvarDB();
    return tgEnviar(chatId, `✅ Pronto, ${u.estado.perfil.nome || ''}! Seu Telegram está ligado ao Sonhaí. 💙\n\n` + CC.textoAjuda(u.estado).split('\n').slice(2).join('\n'));
  }
  const k = DB.tg[chatId]; const u = k && DB.usuarios[k];
  if (!u) return tgEnviar(chatId, 'Oi! 💙 Eu sou o *Sonhaí*.\nPara começar, crie sua conta em ' + CFG.url + ' e depois, no app, toque em *Mais → Mensagens → Conectar Telegram*.');
  const t = texto.replace(/^\/(resumo|contas|agenda|ajuda)\b.*/, (x, c) => ({ resumo: 'resumo', contas: 'contas a pagar', agenda: 'agenda', ajuda: 'ajuda' })[c]);
  if (msg.voice || msg.audio) {
    try {
      if (((msg.voice || msg.audio).file_size || 0) > 10 * 1024 * 1024) return tgEnviar(chatId, '🙈 Áudio muito grande. Mande um áudio mais curto, por favor.');
      if (bloqueado('aud:' + chaveFone(u.fone), 60)) return tgEnviar(chatId, 'Muitos áudios em pouco tempo. Espere alguns minutos. 🙂'); errou('aud:' + chaveFone(u.fone));
      const f = await tgApi('getFile', { file_id: (msg.voice || msg.audio).file_id });
      const r = await fetch(`${TG_API}/file/bot${CFG.tgToken}/${f.file_path}`);
      const txt = await transcrever(Buffer.from(await r.arrayBuffer()), (msg.voice || msg.audio).mime_type || 'audio/ogg');
      if (!txt) throw new Error('vazio');
      return processar(u, txt, true, 'telegram');
    } catch (e) { log('áudio telegram', e.message); return tgEnviar(chatId, '🙈 Não consegui entender o áudio. Pode repetir ou escrever?'); }
  }
  if (!t) return tgEnviar(chatId, 'Por enquanto eu entendo textos e áudios. 😊 Mande /ajuda para ver exemplos.');
  return processar(u, t, false, 'telegram');
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
  if (novo) {
    u.estado.chat.push({ de: 'me', txt: texto, em: Date.now() });
    await enviar(u, `Olá! 💙 Que alegria ter você aqui.\nEu sou o *Sonhaí* e vou te ajudar a organizar o dinheiro sem complicação.\n\n📲 Abra seu app e crie sua senha:\n${linkEntrada(u)}\n\nComo você gostaria de ser chamado(a)? Responda: "meu nome é ..."`);
    if (/^(oi|ola|bom dia|boa tarde|boa noite|comecar|começar)\b/.test(t0)) return;
  }
  return processar(u, texto, origemAudio, 'whatsapp');
}
/** Entende o pedido (texto já transcrito) e responde pelo mesmo canal. */
async function processar(u, texto, origemAudio, canal) {
  texto = String(texto || '').slice(0, 500);
  const env = (msg, o) => enviar(u, msg, Object.assign({ canal }, o || {}));
  if (u.bloqueado) return env('Seu acesso está suspenso. Fale com o suporte do Sonhaí.');
  if (expirado(u)) return env(msgExpirado(u));
  u.estado.chat.push({ de: 'me', txt: (origemAudio ? '🎤 ' : '') + texto, em: Date.now() });
  const hoje = CC.agora(CFG.tz);
  if (CC.garantirRendas(u.estado, hoje)) u.rev++;
  const t = CC.sem(texto).trim();
  if (/^(esqueci (a |minha )?senha|recuperar senha|trocar senha|nova senha)$/.test(t)) {
    const cod = crypto.randomBytes(16).toString('base64url');
    DB.resets[H(cod)] = { k: chaveFone(u.fone), em: Date.now() }; salvarDB();
    return env(`🔐 Para criar uma senha nova, toque no link (vale por 30 minutos):\n${CFG.url}/?r=${cod}\n\nSe não foi você que pediu, é só ignorar.`, { forcarTexto: true });
  }
  let m = t.match(/^(meu nome e|me chame de|pode me chamar de|sou o|sou a)\s+(.+)/);
  if (m) {
    const nome = texto.split(/\s+/).slice(texto.split(/\s+/).length - m[2].split(/\s+/).length).join(' ').replace(/[.!]$/, '');
    u.estado.perfil.nome = nome.charAt(0).toUpperCase() + nome.slice(1); u.estado.perfilUpd = Date.now(); u.rev++;
    return env(`Prazer, ${u.estado.perfil.nome}! 🤗\n\n` + CC.textoAjuda(u.estado).split('\n').slice(2).join('\n'));
  }
  if (/^apagar meus dados$/.test(t)) return env('⚠️ Isso apaga TODOS os seus lançamentos, contas, sonhos e compromissos, sem volta.\nSe tiver certeza, responda exatamente: *CONFIRMAR APAGAR*');
  if (/^confirmar apagar$/.test(t)) {
    for (const [tk, v] of Object.entries(DB.tokens)) if (v.k === chaveFone(u.fone)) delete DB.tokens[tk];
    delete DB.usuarios[chaveFone(u.fone)]; salvarDB();
    const adeus = '🗑️ Pronto, seus dados foram apagados. Se quiser voltar, é só criar uma conta nova. Foi um prazer! 💙';
    if (u.telegram) { if (DB.tg) delete DB.tg[u.telegram]; if (canal === 'telegram') await tgEnviar(u.telegram, adeus); }
    if (canal === 'whatsapp' && !DEMO) await waApi(`${CFG.waPhoneId}/messages`, { messaging_product: 'whatsapp', to: u.fone, type: 'text', text: { body: adeus } }).catch(() => {});
    return;
  }
  if (/^(link|app|aplicativo|abrir app|meu app)\b/.test(t)) return env(`📲 Seu acesso ao app (vale para este celular; não compartilhe):\n${linkEntrada(u)}`, { forcarTexto: true });
  m = t.match(/^(orcamento|meu orcamento|limite do mes)\D*([\d.,]+)/);
  if (m) { u.estado.perfil.orcamento = CC.extrairValor(m[2]).valor; u.estado.perfilUpd = Date.now(); u.rev++; return env(`🎯 Orçamento do mês definido: ${CC.brl(u.estado.perfil.orcamento)}. Eu te aviso quando estiver chegando perto!`); }

  const r = CC.conversar(u.estado, texto, { hoje, origem: canal });
  const acao = r.acao || {};
  if (r.ok && r.colecao) u.rev++;
  let resp = r.msg;
  if (origemAudio) resp = `🎤 Entendi: "${texto}"\n\n` + resp;
  if (r.podeDesfazer) resp += '\n\nErrou? Responda *desfazer*.';
  await env(resp);
}

// ------------------------------------------------------------------ backup diário (guarda 3 dias)
async function backupDiario(hojeIso) {
  if (DB.ultimoBackup === hojeIso) return;
  DB.ultimoBackup = hojeIso;
  const copia = { geradoEm: new Date().toISOString(), usuarios: DB.usuarios };
  const limite = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
  try {
    if (USA_SB) {
      const txt = JSON.stringify(copia);
      if (Buffer.byteLength(txt) > 50 * 1048576) return log('backup grande demais para o plano grátis; use o backup geral do painel master');
      await sb('POST', 'kv?on_conflict=chave', [{ chave: 'backup:' + hojeIso, valor: copia, atualizado: new Date().toISOString() }], 'resolution=merge-duplicates,return=minimal');
      await sb('DELETE', 'kv?chave=like.backup*&chave=lt.backup:' + limite);
    } else {
      fs.writeFileSync(path.join(CFG.dados, 'backup-' + hojeIso + '.json'), JSON.stringify(copia));
      for (const f of fs.readdirSync(CFG.dados)) { const m = f.match(/^backup-(\d{4}-\d{2}-\d{2})\.json$/); if (m && m[1] < limite) fs.unlinkSync(path.join(CFG.dados, f)); }
    }
    log('💾 Backup diário salvo:', hojeIso);
  } catch (e) { DB.ultimoBackup = ''; log('backup', e.message); }
}

// ------------------------------------------------------------------ lembretes
function textoManha(u, hoje) {
  const e = u.estado; const nome = e.perfil.nome ? e.perfil.nome.split(/\s+/)[0] : '';
  const venc = CC.contasAVencer(e, hoje, 1);
  const atras = CC.contasAtrasadas(e, hoje);
  const hojeIso = CC.iso(hoje);
  const ag = (e.agenda || []).filter((a) => a.data === hojeIso && !a.feito && a.lembrar !== false).sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99'));
  const linhas = [];
  venc.filter((x) => x.emDias === 0).forEach((x) => linhas.push(`🔴 *HOJE* vence: ${x.conta.nome} — ${CC.brl(x.valor)}`));
  venc.filter((x) => x.emDias === 1).forEach((x) => linhas.push(`🟡 *Amanhã* vence: ${x.conta.nome} — ${CC.brl(x.valor)}`));
  const fv = CC.faturasAVencer(e, hoje, 1);
  fv.forEach((x) => linhas.push(`${x.emDias ? '🟡 *Amanhã*' : '🔴 *HOJE*'} vence a fatura do cartão *${x.fatura.cartao.nome}* — ${CC.brl(x.fatura.falta)}${x.fatura.situacao === 'parcial' ? ' (restante)' : ''}`));
  if (atras.length && hoje.getDay() === 1) atras.forEach((c) => linhas.push(`⚠️ Em atraso: ${c.nome} (dia ${c.dia}) — ${CC.brl(CC.valorConta(c, hojeIso.slice(0, 7)))}`));
  if (hoje.getDate() === 1) (e.anuais || []).filter((a) => +a.mes === hoje.getMonth() + 1).forEach((a) => linhas.push(`📌 Este mês vence: ${a.nome} — ${CC.brl(a.valor)}`));
  if (ag.length) { linhas.push(''); linhas.push('📌 *Compromissos de hoje:*'); ag.forEach((a) => linhas.push(`• ${a.hora ? a.hora + ' — ' : ''}${a.titulo}`)); }
  // segunda-feira: incentivo dos sonhos
  if (hoje.getDay() === 1 && (e.sonhos || []).some((s) => s.custo)) {
    const s = e.sonhos.filter((x) => x.custo).sort((a, b) => CC.totalSonho(b) / b.custo - CC.totalSonho(a) / a.custo)[0];
    const pct = Math.round(CC.totalSonho(s) / s.custo * 100);
    linhas.push(''); linhas.push(`⭐ Seu sonho *${s.nome}* está em ${pct}%. ${CC.INCENTIVOS[hoje.getDate() % CC.INCENTIVOS.length]}`);
  }
  // sem nada para lembrar, só manda o versículo pelo Telegram (grátis); no WhatsApp cada mensagem tem custo
  if (!linhas.length && !(u.telegram && e.perfil.versiculo !== false)) return '';
  if (e.perfil.versiculo !== false) { const v = CC.versiculoDoDia(hoje); if (linhas.length) linhas.push(''); linhas.push(`📖 _"${v.texto}"_ (${v.ref})`); }
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
  if (hm >= '03:00') backupDiario(hojeIso);
  for (const [kk, v] of tentativas) if (Date.now() - v.em > 15 * 60e3) tentativas.delete(kk);
  for (const nome of ['resets', 'tgcodigos']) for (const [kk, v] of Object.entries(DB[nome] || {})) if (Date.now() - v.em > 864e5) delete DB[nome][kk];
  for (const u of Object.values(DB.usuarios)) {
    if (!u || (u.verificado === false && !u.telegram) || u.bloqueado || expirado(u)) continue;
    const e = u.estado; u.enviados = u.enviados || {};
    const marca = async (chave, fn) => { if (u.enviados[chave]) return; u.enviados[chave] = Date.now(); salvarDB(); const t = fn(); if (t) await enviar(u, t); };
    try {
      if (CC.garantirRendas(e, agora)) { u.rev++; salvarDB(); }
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
function testeLiberado(req) {
  if (CFG.admin) { const a = Buffer.from(String(req.headers['x-admin-key'] || '')); const b = Buffer.from(CFG.admin); return a.length === b.length && crypto.timingSafeEqual(a, b); }
  return !PRODUCAO && /^(127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)$/.test(req.socket.remoteAddress || '') && !req.headers['x-forwarded-for'];
}
function autenticar(req) {
  const u = porToken((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
  if (!u || u.bloqueado || expirado(u)) return null;
  if (Date.now() - (u.ultimo || 0) > 3600e3) { u.ultimo = Date.now(); salvarDB(); }
  return u;
}

const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'";
const servidor = http.createServer(async (req, res) => {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=(self)');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
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
      // só aceita mensagens do WhatsApp quando ele está configurado E com a assinatura da Meta
      if (DEMO || !CFG.waSecret) { res.writeHead(403); return res.end(); }
      const bruto = await lerCorpo(req, 2 * 1024 * 1024);
      {
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
    if (rota === '/api/config') return json(res, 200, { whatsapp: DEMO ? '' : process.env.WHATSAPP_NUMERO_EXIBICAO || '', demo: DEMO, telegram: TG_BOT, cadastroAberto: !(DB.config && DB.config.cadastroAberto === false), suporte: suporte() });
    if (rota === '/api/acesso') {
      const c = pega(DB.convites, H(url.searchParams.get('c') || ''));
      const u = c && DB.usuarios[c.k];
      if (!u || Date.now() - c.em > 60 * 864e5) return json(res, 404, { erro: 'Link de acesso inválido ou vencido. Peça um novo ao suporte.' });
      return json(res, 200, { nome: u.estado.perfil.nome, fone: u.fone, plano: (PLANOS[u.plano] || PLANOS.ilimitado).nome, validade: u.validade || null });
    }
    if (rota === '/telegram' && req.method === 'POST') {
      if (!CFG.tgToken || req.headers['x-telegram-bot-api-secret-token'] !== TG_SEGREDO) { res.writeHead(401); return res.end(); }
      const corpo = JSON.parse((await lerCorpo(req, 1024 * 1024)).toString() || '{}');
      res.writeHead(200); res.end('ok');
      if (corpo.message) tgReceber(corpo.message).catch((e) => log('telegram', e.message));
      return;
    }
    if (rota === '/api/telegram/link' && req.method === 'POST') {
      const u = autenticar(req); if (!u) return json(res, 401, { erro: 'Entre novamente.' });
      if (!TG_BOT) return json(res, 400, { erro: 'O Telegram ainda não foi ligado no servidor.' });
      DB.tgcodigos = DB.tgcodigos || {};
      const cod = crypto.randomBytes(12).toString('base64url');
      DB.tgcodigos[H(cod)] = { k: chaveFone(u.fone), em: Date.now() }; salvarDB();
      return json(res, 200, { link: `https://t.me/${TG_BOT}?start=${cod}`, bot: TG_BOT });
    }
    if (rota.startsWith('/api/admin/')) {
      const a = autenticar(req); if (!ehAdmin(a)) return json(res, 403, { erro: 'Acesso restrito ao usuário master.' });
      if (rota === '/api/admin/usuarios') {
        const agora = Date.now(); const dia = 864e5;
        const lista = Object.entries(DB.usuarios).filter(([, u]) => u).map(([k, u]) => ({
          k, nome: u.estado.perfil.nome || '', fone: u.fone, email: u.email || '', plano: ehAdmin(u) ? 'ilimitado' : (u.plano || 'ilimitado'), validade: ehAdmin(u) ? null : (u.validade || null), dias: ehAdmin(u) ? null : diasRestantes(u), expirado: expirado(u), criadoPor: u.criadoPor || '', trocarSenha: !!u.trocarSenha, criado: new Date(u.criadoEm || agora).toISOString().slice(0, 10),
          ultimo: u.ultimo ? new Date(u.ultimo).toISOString().slice(0, 10) : (u.ultimaMsg ? new Date(u.ultimaMsg).toISOString().slice(0, 10) : ''),
          ultimoMs: Math.max(u.ultimo || 0, u.ultimaMsg || 0), lancamentos: (u.estado.lancamentos || []).length,
          telegram: !!u.telegram, whatsapp: !DEMO && u.verificado !== false && !!u.ultimaMsg, temSenha: !!u.senha, bloqueado: !!u.bloqueado, admin: ehAdmin(u)
        })).sort((x, y) => y.ultimoMs - x.ultimoMs);
        const totais = { usuarios: lista.length, novos7: Object.values(DB.usuarios).filter((u) => u && agora - (u.criadoEm || 0) < 7 * dia).length,
          ativos7: lista.filter((u) => agora - u.ultimoMs < 7 * dia).length, ativos30: lista.filter((u) => agora - u.ultimoMs < 30 * dia).length,
          telegram: lista.filter((u) => u.telegram).length, whatsapp: lista.filter((u) => u.whatsapp).length,
          lancamentos: lista.reduce((x, u) => x + u.lancamentos, 0), bytes: Buffer.byteLength(JSON.stringify(DB.usuarios)) };
        totais.expirados = lista.filter((u) => u.expirado).length;
        totais.vencendo = lista.filter((u) => u.dias != null && u.dias >= 0 && u.dias <= 7).length;
        return json(res, 200, { auditoria: (DB.auditoria || []).slice(-60).reverse(), usuarios: lista, totais, planos: PLANOS, config: { cadastroAberto: !(DB.config && DB.config.cadastroAberto === false) } });
      }
      let b = {}; if (req.method === 'POST') { try { b = JSON.parse((await lerCorpo(req, 64 * 1024)).toString() || '{}'); } catch (e) { /* vazio */ } }
      if (rota === '/api/admin/criar' && req.method === 'POST') {
        const fone = normFone(b.fone); const nome = String(b.nome || '').trim().slice(0, 60); const email = String(b.email || '').trim().toLowerCase();
        if (fone.length < 12 || fone.length > 13) return json(res, 400, { erro: 'WhatsApp com DDD inválido.' });
        if (!nome) return json(res, 400, { erro: 'Informe o nome.' });
        if (email && !emailValido(email)) return json(res, 400, { erro: 'E-mail inválido.' });
        if (DB.usuarios[chaveFone(fone)]) return json(res, 409, { erro: 'Esse WhatsApp já tem conta. Use "Renovar" ou "Nova senha" na lista.' });
        if (email && porEmail(email)) return json(res, 409, { erro: 'Esse e-mail já está em outra conta.' });
        if (!PLANOS[b.plano]) return json(res, 400, { erro: 'Escolha um plano.' });
        const u = usuario(fone, true);
        const senha = senhaInicial();
        Object.assign(u, { senha: hashSenha(senha), trocarSenha: true, email, plano: b.plano, validade: calcValidade(b.plano), criadoPor: 'admin', verificado: true });
        u.estado.perfil.nome = nome; u.estado.perfilUpd = Date.now();
        const c = novoConvite(u); auditar(req, a, 'criou acesso (' + b.plano + ')', nome + ' ' + fmtFone(fone));
        return json(res, 200, { senha, link: `${CFG.url}/?acesso=${c}`, mensagem: textoAcesso(u, senha, c), fone: u.fone });
      }
      const alvo = b.k ? DB.usuarios[b.k] : null;
      if (['/api/admin/renovar', '/api/admin/editar', '/api/admin/senha', '/api/admin/excluir'].includes(rota) && (!alvo || (ehAdmin(alvo) && rota !== '/api/admin/editar'))) return json(res, 400, { erro: 'Usuário não encontrado.' });
      if (rota === '/api/admin/renovar') {
        if (b.validade) { if (!/^\d{4}-\d{2}-\d{2}$/.test(b.validade)) return json(res, 400, { erro: 'Data inválida.' }); alvo.validade = b.validade; alvo.plano = alvo.plano || '1m'; }
        else { if (!PLANOS[b.plano]) return json(res, 400, { erro: 'Plano inválido.' }); alvo.validade = calcValidade(b.plano, alvo.validade); alvo.plano = b.plano; }
        auditar(req, a, 'renovou para ' + (alvo.validade ? CC.dataBR(alvo.validade) : 'ilimitado'), alvo.estado.perfil.nome + ' ' + fmtFone(alvo.fone));
        return json(res, 200, { ok: true, validade: alvo.validade });
      }
      if (rota === '/api/admin/editar') {
        const email = String(b.email || '').trim().toLowerCase();
        if (email && !emailValido(email)) return json(res, 400, { erro: 'E-mail inválido.' });
        const outro = email && porEmail(email); if (outro && outro !== alvo) return json(res, 409, { erro: 'Esse e-mail já está em outra conta.' });
        if (b.nome) { alvo.estado.perfil.nome = String(b.nome).trim().slice(0, 60); alvo.estado.perfilUpd = Date.now(); alvo.rev++; }
        alvo.email = email; auditar(req, a, 'editou nome/e-mail', alvo.estado.perfil.nome + ' ' + fmtFone(alvo.fone)); return json(res, 200, { ok: true });
      }
      if (rota === '/api/admin/senha') {
        const senha = senhaInicial(); alvo.senha = hashSenha(senha); alvo.trocarSenha = true;
        for (const [tk, v] of Object.entries(DB.tokens)) if (v.k === b.k) delete DB.tokens[tk];
        const c = novoConvite(alvo); auditar(req, a, 'gerou nova senha inicial', alvo.estado.perfil.nome + ' ' + fmtFone(alvo.fone));
        return json(res, 200, { senha, link: `${CFG.url}/?acesso=${c}`, mensagem: textoAcesso(alvo, senha, c), fone: alvo.fone });
      }
      if (rota === '/api/admin/excluir') {
        for (const [tk, v] of Object.entries(DB.tokens)) if (v.k === b.k) delete DB.tokens[tk];
        if (alvo.telegram && DB.tg) delete DB.tg[alvo.telegram];
        auditar(req, a, 'EXCLUIU usuário', alvo.estado.perfil.nome + ' ' + fmtFone(alvo.fone)); delete DB.usuarios[b.k]; salvarDB(); return json(res, 200, { ok: true });
      }
      if (rota === '/api/admin/config') {
        DB.config = DB.config || {};
        if (typeof b.cadastroAberto === 'boolean') DB.config.cadastroAberto = b.cadastroAberto;
        auditar(req, a, b.cadastroAberto ? 'abriu o cadastro' : 'fechou o cadastro'); return json(res, 200, { ok: true });
      }
      if (rota === '/api/admin/bloquear' && req.method === 'POST') {
        const u = DB.usuarios[b.k];
        if (!u || ehAdmin(u)) return json(res, 400, { erro: 'Usuário não encontrado.' });
        u.bloqueado = !!b.bloquear; auditar(req, a, u.bloqueado ? 'bloqueou' : 'liberou', u.estado.perfil.nome + ' ' + fmtFone(u.fone));
        if (u.bloqueado) for (const [tk, v] of Object.entries(DB.tokens)) if (v.k === b.k) delete DB.tokens[tk];
        salvarDB(); return json(res, 200, { ok: true });
      }
      if (rota === '/api/admin/backup') {
        if (req.method !== 'POST') return json(res, 405, { erro: 'Confirme sua senha para baixar o backup.' });
        if (bloqueado('adm:' + chaveFone(a.fone), 5)) return json(res, 429, { erro: 'Muitas tentativas. Espere 15 minutos.' });
        if (!confereSenha(b.senha || '', a.senha)) { errou('adm:' + chaveFone(a.fone)); auditar(req, a, 'backup geral NEGADO (senha errada)'); return json(res, 403, { erro: 'Senha incorreta.' }); }
        auditar(req, a, 'baixou o backup geral');
        return json(res, 200, { geradoEm: new Date().toISOString(), versao: 1, usuarios: DB.usuarios });
      }
      return json(res, 404, { erro: 'Rota não encontrada.' });
    }
    if (rota === '/api/telegram/desligar' && req.method === 'POST') {
      const u = autenticar(req); if (!u) return json(res, 401, { erro: 'Entre novamente.' });
      if (u.telegram && DB.tg) delete DB.tg[u.telegram]; delete u.telegram; salvarDB();
      return json(res, 200, { ok: true });
    }
    const ip = ipDe(req);
    const corpoJSON = async () => { try { return JSON.parse((await lerCorpo(req, 64 * 1024)).toString() || '{}'); } catch (e) { return {}; } };
    if (rota === '/api/cadastro' && req.method === 'POST') {
      const b = await corpoJSON(); const fone = normFone(b.fone); const nome = String(b.nome || '').trim().slice(0, 60);
      if (bloqueado('ip:' + ip, 30)) return json(res, 429, { erro: 'Muitas tentativas. Espere alguns minutos.' });
      if (fone.length < 12 || fone.length > 13) return json(res, 400, { erro: 'Informe o WhatsApp com DDD. Ex.: (16) 99999-8888' });
      if (!nome) return json(res, 400, { erro: 'Como você quer ser chamado(a)?' });
      if (DB.config && DB.config.cadastroAberto === false) return json(res, 403, { erro: 'O cadastro está fechado. Peça seu link de acesso ao Sonhaí.' });
      const email = String(b.email || '').trim().toLowerCase();
      if (!emailValido(email)) return json(res, 400, { erro: 'Informe um e-mail válido.' });
      if (porEmail(email)) return json(res, 409, { erro: 'Esse e-mail já tem conta. Toque em "Entrar".' });
      const fr = senhaFraca(b.senha); if (fr) return json(res, 400, { erro: fr });
      const ja = DB.usuarios[chaveFone(fone)];
      if (ADMINS.has(chaveFone(fone)) && Object.values(DB.usuarios).some((x) => x && ehAdmin(x))) return json(res, 403, { erro: 'Esse número é reservado. Peça o seu acesso ao administrador do Sonhaí.' });
      if (ja && ja.senha) return json(res, 409, { erro: 'Esse número já tem conta. Toque em "Entrar".' });
      if (ja && !ja.senha) return json(res, 409, { erro: 'Esse número já começou pelo WhatsApp. Mande "esqueci minha senha" para o Sonhaí no WhatsApp para criar sua senha.' });
      errou('ip:' + ip);
      const u = usuario(fone, true);
      u.senha = hashSenha(b.senha); u.estado.perfil.nome = nome; u.estado.perfilUpd = Date.now();
      u.email = email; u.criadoPor = 'cadastro';
      if (!ehAdmin(u)) { u.plano = (DB.config && DB.config.planoCadastro) || 'gratis'; u.validade = calcValidade(u.plano); }
      if (b.estado && typeof b.estado === 'object' && !b.estado.demo) { u.estado = CC.sanearEstado(CC.mesclar(u.estado, b.estado)); u.estado.perfil.nome = nome; u.estado.perfil.whatsapp = fone; }
      if (!DEMO) { u.verificado = false; u.codigo = codigoVerif(); }
      salvarDB();
      return json(res, 200, { token: novaSessao(u), verificado: u.verificado !== false, codigo: u.codigo || '' });
    }
    if (rota === '/api/login' && req.method === 'POST') {
      const b = await corpoJSON();
      const pe = String(b.fone || '').includes('@') ? porEmail(b.fone) : null;
      const k = pe ? chaveFone(pe.fone) : chaveFone(b.fone);
      if (bloqueado('f:' + k, 5) || bloqueado('ip:' + ip, 30)) return json(res, 429, { erro: 'Muitas tentativas erradas. Espere 15 minutos ou mande "esqueci minha senha" no WhatsApp.' });
      const u = DB.usuarios[k];
      if (!u || !u.senha || !confereSenha(b.senha || '', u.senha)) { errou('f:' + k); errou('ip:' + ip); return json(res, 401, { erro: u && !u.senha ? 'Você ainda não criou senha. Mande "esqueci minha senha" para o Sonhaí no WhatsApp.' : 'WhatsApp/e-mail ou senha incorretos.' }); }
      tentativas.delete('f:' + k);
      if (u.bloqueado) return json(res, 403, { erro: 'Seu acesso está suspenso. Fale com o suporte do Sonhaí.' });
      if (expirado(u)) return json(res, 403, { erro: msgExpirado(u).replace(/\*/g, '') });
      u.ultimo = Date.now();
      return json(res, 200, { token: novaSessao(u) });
    }
    if (rota === '/api/redefinir' && req.method === 'POST') {
      const b = await corpoJSON(); const r = pega(DB.resets, H(String(b.codigo || '')));
      if (!r || Date.now() - r.em > 30 * 60e3) return json(res, 400, { erro: 'Esse link expirou. Mande "esqueci minha senha" no WhatsApp de novo.' });
      const fr = senhaFraca(b.senha); if (fr) return json(res, 400, { erro: fr });
      const u = DB.usuarios[r.k]; if (!u) return json(res, 400, { erro: 'Conta não encontrada.' });
      u.senha = hashSenha(b.senha); delete DB.resets[H(String(b.codigo || ''))];
      for (const [tk, v] of Object.entries(DB.tokens)) if (v.k === r.k) delete DB.tokens[tk]; // derruba sessões antigas
      salvarDB();
      return json(res, 200, { token: novaSessao(u) });
    }
    if (rota === '/api/eu') {
      const u = autenticar(req); if (!u) return json(res, 401, { erro: 'Entre novamente.' });
      return json(res, 200, { email: u.email || '', plano: ehAdmin(u) ? 'ilimitado' : (u.plano || 'ilimitado'), planoNome: (PLANOS[ehAdmin(u) ? 'ilimitado' : u.plano] || PLANOS.ilimitado).nome, validade: ehAdmin(u) ? null : (u.validade || null), dias: ehAdmin(u) ? null : diasRestantes(u), trocarSenha: !!u.trocarSenha, suporte: suporte(), admin: ehAdmin(u), telegram: !!u.telegram, fone: u.fone, nome: u.estado.perfil.nome, temSenha: !!u.senha, verificado: u.verificado !== false, codigo: u.verificado === false ? u.codigo : '' });
    }
    if (rota === '/api/senha' && req.method === 'POST') {
      const u = autenticar(req); if (!u) return json(res, 401, { erro: 'Entre novamente.' });
      const b = await corpoJSON();
      if (u.senha && !confereSenha(b.atual || '', u.senha)) return json(res, 400, { erro: 'A senha atual não confere.' });
      const fr = senhaFraca(b.nova); if (fr) return json(res, 400, { erro: fr });
      u.senha = hashSenha(b.nova); u.trocarSenha = false;
      const atualTk = H((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
      for (const [tk, v] of Object.entries(DB.tokens)) if (v.k === chaveFone(u.fone) && tk !== atualTk) delete DB.tokens[tk];
      salvarDB();
      return json(res, 200, { ok: true });
    }
    if (rota === '/api/sair' && req.method === 'POST') {
      const t = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const b = await corpoJSON();
      const u = porToken(t);
      if (u && b.todos) { for (const [tk, v] of Object.entries(DB.tokens)) if (v.k === chaveFone(u.fone)) delete DB.tokens[tk]; } else delete DB.tokens[H(t)];
      salvarDB(); return json(res, 200, { ok: true });
    }
    if (rota === '/api/estado') {
      const u = autenticar(req); if (!u) return json(res, 401, { erro: 'Faça login pelo link enviado no WhatsApp.' });
      if (req.method === 'GET') return json(res, 200, { estado: u.estado, rev: u.rev, fone: u.fone });
      if (req.method === 'PUT') {
        const { estado } = JSON.parse((await lerCorpo(req, 5 * 1024 * 1024)).toString());
        // conversa, pergunta em aberto e "desfazer" do WhatsApp/Telegram pertencem ao servidor
        const { chat, pendente, desfazer } = u.estado;
        u.estado = CC.sanearEstado(CC.mesclar(estado, u.estado)); u.estado.chat = chat; delete u.estado.demo;
        if (pendente) u.estado.pendente = pendente; else delete u.estado.pendente;
        if (desfazer) u.estado.desfazer = desfazer; else delete u.estado.desfazer;
        u.rev++; salvarDB();
        return json(res, 200, { estado: u.estado, rev: u.rev });
      }
    }
    if (rota === '/api/transcrever' && req.method === 'POST') {
      const u = autenticar(req); if (!u) return json(res, 401, { erro: 'não autorizado' });
      if (bloqueado('aud:' + chaveFone(u.fone), 60)) return json(res, 429, { erro: 'Muitos áudios em pouco tempo. Espere alguns minutos.' }); errou('aud:' + chaveFone(u.fone));
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

    if (rota.startsWith('/api/') || rota === '/webhook' || rota === '/telegram') return json(res, 404, { erro: 'Rota não encontrada.' });
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
servidor.headersTimeout = 15000;
servidor.requestTimeout = 60000;
(async () => {
  try { await carregarDB(); } catch (e) { log('❌ Não consegui abrir o banco de dados:', e.message); process.exit(1); }
  prepararDB();
  servidor.listen(CFG.porta, () => {
  log(`💙 Sonhaí rodando em ${CFG.url} (porta ${CFG.porta})`);
  if (DEMO) log('⚠️  WhatsApp não configurado: modo demonstração (mensagens aparecem aqui no terminal). Veja o GUIA.');
  if (!CFG.groq && !CFG.openai) log('⚠️  Sem GROQ_API_KEY/OPENAI_API_KEY: áudios não serão transcritos.');
  log(USA_SB ? '🗄️  Dados no Supabase.' : '🗄️  Dados em ' + ARQ);
  tgIniciar();
  });
})();
