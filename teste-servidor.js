// Sonhaí: teste do servidor com WhatsApp, Telegram e e-mail simulados (nada sai para a internet)
// Como rodar: node teste-servidor.js
const http = require('http'), fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const ARQ = path.join(__dirname, 'server.js');
const DADOS = fs.mkdtempSync(path.join(os.tmpdir(), 'sonhai-teste-'));
let ok = 0, falhas = 0;
const confere = (nome, real, esperado) => { const a = JSON.stringify(real), b = JSON.stringify(esperado); if (a === b) ok++; else { falhas++; console.log('❌ ' + nome + '\n   veio:     ' + a + '\n   esperado: ' + b); } };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------- serviços simulados
const saida = { zap: [], tg: [], email: [] };
const zerar = () => { saida.zap = []; saida.tg = []; saida.email = []; };
const simulador = http.createServer((req, res) => {
  let c = ''; req.on('data', (d) => c += d); req.on('end', () => {
    const j = c ? JSON.parse(c) : {};
    const manda = (o) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (req.url.includes('/getMe')) return manda({ ok: true, result: { username: 'SonhaiTesteBot' } });
    if (req.url.includes('/sendMessage')) { saida.tg.push(j); return manda({ ok: true, result: {} }); }
    if (req.url.includes('/bot')) return manda({ ok: true, result: {} });
    if (req.url.includes('/v3/smtp/email')) { saida.email.push(j); return manda({ messageId: 'x' }); }
    if (req.url.includes('/messages')) { saida.zap.push(j); return manda({ messages: [{ id: 'm' }] }); }
    manda({});
  });
});

let proc = null;
const PORTA = 3199, B = 'http://127.0.0.1:' + PORTA, CHAVE = 'chave-de-teste', TG = '123:tg', SEG = 'segredo-meta';
const TG_SEG = crypto.createHash('sha256').update('sonhai:' + TG).digest('hex').slice(0, 32);
async function ligar(extra) {
  proc = spawn(process.execPath, [ARQ], { env: Object.assign({}, process.env, { PORT: PORTA, DATA_DIR: DADOS, ADMIN_KEY: CHAVE, ADMIN_FONES: '16999990001', TELEGRAM_TOKEN: TG, TELEGRAM_API: 'http://127.0.0.1:3198', BREVO_API: 'http://127.0.0.1:3198', WHATSAPP_API: 'http://127.0.0.1:3198', SUPABASE_URL: '', SUPABASE_KEY: '', PUBLIC_URL: '', RENDER: '', LOG_MENSAGENS: '0' }, extra || {}), stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { const r = await fetch(B + '/api/saude'); if (r.ok) break; } catch (e) { /* subindo */ } await espera(100); }
  await espera(200);
}
async function desligar() { await espera(600); proc.kill(); await espera(250); }
const req = async (m, p, b, t, h) => { const r = await fetch(B + p, { method: m, headers: Object.assign({ 'Content-Type': 'application/json' }, t ? { Authorization: 'Bearer ' + t } : {}, h || {}), body: b ? JSON.stringify(b) : undefined }); const tx = await r.text(); let j = null; try { j = JSON.parse(tx); } catch (e) { /* texto */ } return { s: r.status, j, tx }; };
const ciclo = async () => { await req('POST', '/api/ciclo', {}, null, { 'x-admin-key': CHAVE }); await espera(250); };
const cadastro = (nome, fone, email, extra) => req('POST', '/api/cadastro', Object.assign({ nome, fone, email, senha: 'Abcdefg1' }, extra || {}));
const hojeSP = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
const contaHoje = (nome) => ({ id: 'c-' + nome, nome, cat: 'Contas da Casa', valor: 150, dia: hojeSP().getDate(), recorrente: true, pagos: {}, upd: Date.now() });
const pendurarConta = async (t, nome) => { const g = await req('GET', '/api/estado', null, t); const e = g.j.estado; e.contas.push(contaHoje(nome)); e.perfil.lembreteHora = '00:00'; e.perfilUpd = Date.now(); await req('PUT', '/api/estado', { estado: e }, t); };
const telegram = (msg) => fetch(B + '/telegram', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-telegram-bot-api-secret-token': TG_SEG }, body: JSON.stringify({ message: msg }) });
const conectarTelegram = async (t, chatId) => { const j = (await req('POST', '/api/telegram/link', {}, t)).j; await telegram({ chat: { id: chatId }, text: '/start ' + j.link.split('start=')[1] }); await espera(200); };
const zapEntra = async (de, texto) => { const corpo = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ from: de, type: 'text', text: { body: texto } }] } }] }] }); const sig = 'sha256=' + crypto.createHmac('sha256', SEG).update(corpo).digest('hex'); await fetch(B + '/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': sig }, body: corpo }); await espera(250); };

(async () => {
  await new Promise((r) => simulador.listen(3198, r));
  // ================================================================ WhatsApp desligado
  await ligar({ BREVO_API_KEY: 'k', EMAIL_REMETENTE: 'oi@sonhai.app', EMPRESA_NOME: 'Sonhaí <Teste>', EMPRESA_DOC: 'CNPJ 00.000.000/0001-00', CONTATO_EMAIL: 'privacidade@sonhai.app', DIAS_RETENCAO: '90' });
  const adm = await cadastro('Master', '16999990001', 'm@x.com');
  const T = adm.j.token;
  const ana = await cadastro('Ana', '16911110000', 'ana@x.com', { aceite: true });
  const bia = await cadastro('Bia', '16922220000', 'bia@x.com');

  // item 6: lembretes
  let eu = (await req('GET', '/api/eu', null, ana.j.token)).j;
  confere('sem canal, o app sabe que não há lembrete', [eu.canal, eu.verificado], ['', false]);
  confere('aceite registrado no cadastro', [eu.aceite, (await req('GET', '/api/eu', null, bia.j.token)).j.aceite], [true, false]);
  await pendurarConta(ana.j.token, 'Luz');
  zerar(); await ciclo();
  confere('sem canal, nada é enviado', [saida.tg.length, saida.zap.length], [0, 0]);
  await conectarTelegram(bia.j.token, 777);
  confere('com Telegram, o canal aparece', (await req('GET', '/api/eu', null, bia.j.token)).j.canal, 'telegram');
  await pendurarConta(bia.j.token, 'Agua');
  zerar(); await ciclo();
  confere('lembrete chega no Telegram', saida.tg.some((m) => m.chat_id === 777 && /Agua/.test(m.text)), true);
  confere('canal indisponível é recusado', (await req('POST', '/api/canal', { canal: 'whatsapp' }, bia.j.token)).s, 400);

  // item 7: senha
  confere('configuração avisa do e-mail', (await req('GET', '/api/config')).j.email, true);
  zerar(); const e1 = await req('POST', '/api/esqueci', { login: 'bia@x.com' }); await espera(250);
  confere('resposta igual', [e1.s, e1.j], [200, { ok: true }]);
  confere('link vai por e-mail e Telegram', [saida.email.length, saida.email[0] && saida.email[0].to[0].email, saida.tg.length], [1, 'bia@x.com', 1]);
  const linkR = saida.email[0].textContent.match(/\?r=([\w-]+)/)[1];
  const r2 = await req('POST', '/api/redefinir', { codigo: linkR, senha: 'Flores2026x' });
  confere('link troca a senha', [r2.s, (await req('POST', '/api/login', { fone: 'bia@x.com', senha: 'Flores2026x' })).s, (await req('POST', '/api/login', { fone: 'bia@x.com', senha: 'Abcdefg1' })).s], [200, 200, 401]);
  confere('link não fica no chat nem no banco', [JSON.stringify((await req('GET', '/api/estado', null, r2.j.token)).j).includes(linkR)], [false]);
  zerar(); const e2 = await req('POST', '/api/esqueci', { login: 'ninguem@x.com' }); await espera(150);
  confere('conta inexistente: mesma resposta e nada enviado', [e2.s, e2.j, saida.email.length], [200, { ok: true }, 0]);
  zerar(); for (let i = 0; i < 5; i++) await req('POST', '/api/esqueci', { login: '16911110000' }); await espera(250);
  confere('limite de 3 pedidos', saida.email.length, 3);
  await espera(650);

  // itens 10 e 11: textos legais
  const priv = (await req('GET', '/privacidade.html')).tx, term = (await req('GET', '/termos.html')).tx;
  confere('sem campos em branco', [/\[[A-ZÀ-Ú]/.test(priv + term), /\{\{/.test(priv + term)], [false, false]);
  confere('dados do responsável, com escape', [priv.includes('Sonhaí &lt;Teste&gt;, CNPJ 00.000.000/0001-00'), priv.includes('privacidade@sonhai.app'), priv.includes('até 90 dias')], [true, true, true]);
  confere('cita quem realmente usa os dados', ['Groq', 'Telegram', 'Supabase', 'Render', 'Brevo', 'Estados Unidos'].every((x) => priv.includes(x)), true);
  confere('app tem aceite', (await req('POST', '/api/aceite', {}, r2.j.token)).s, 200);

  // item 11: exportar e excluir
  const g0 = await req('GET', '/api/meus-dados', null, ana.j.token);
  confere('exporta sem segredo', [g0.s, !!g0.j.dados.contas, /senha|codigo|"hash/.test(JSON.stringify(g0.j.conta)), g0.tx.includes('scrypt')], [200, true, false, false]);
  await req('PUT', '/api/estado', { estado: Object.assign((await req('GET', '/api/estado', null, ana.j.token)).j.estado, { lancamentos: [{ id: 'l1', tipo: 'gasto', data: '2026-11-04', desc: 'Pão; leite', cat: 'Mercado', valor: 12.5, upd: Date.now() }] }) }, ana.j.token);
  const csv = await req('GET', '/api/meus-dados?formato=csv', null, ana.j.token);
  confere('CSV abre no Excel', [csv.s, csv.tx.includes('Data;Tipo;Descrição'), csv.tx.includes('2026-11-04;Gasto;"Pão; leite";Mercado;12,5;')], [200, true, true]);
  // ticket: crédito entra pelo app, compra pelo canal, e o CSV leva os dois
  { const g = await req('GET', '/api/estado', null, ana.j.token); const e = g.j.estado; e.tickets = [{ id: 'ticket-padrao', nome: 'Ticket Alimentação/Refeição', cor: '#0B7A54', upd: Date.now() }]; e.recargas = [{ id: 'r1', ticketId: 'ticket-padrao', data: '2026-11-04', desc: 'Crédito', valor: 800, upd: Date.now() }]; e.lancamentos.push({ id: 't1', tipo: 'gasto', data: '2026-11-04', desc: 'Feira', cat: 'Mercado', valor: 50, pago: true, pagamento: 'Ticket', ticket: true, ticketId: 'ticket-padrao', upd: Date.now() }); await req('PUT', '/api/estado', { estado: e }, ana.j.token);
    const v = (await req('GET', '/api/estado', null, ana.j.token)).j.estado; confere('sincronização guarda ticket e crédito', [v.tickets.length, v.recargas.length, v.lancamentos.filter((l) => l.ticketId).length], [1, 1, 1]);
    const c2 = await req('GET', '/api/meus-dados?formato=csv', null, ana.j.token); confere('CSV traz crédito e compra do ticket', [c2.tx.includes('2026-11-04;Crédito no Ticket;Crédito;;800;Ticket'), c2.tx.includes('2026-11-04;Gasto;Feira;Mercado;50;Ticket')], [true, true]); }
  confere('sem login não exporta', (await req('GET', '/api/meus-dados')).s, 401);

  const L = (await req('GET', '/api/admin/usuarios', null, T)).j;
  confere('painel sem pendências quando tudo configurado', L.pendencias, []);
  const kAna = L.usuarios.find((u) => u.fone.endsWith('11110000')).k, kBia = L.usuarios.find((u) => u.fone.endsWith('22220000')).k;
  const d = (n) => { const x = hojeSP(); x.setDate(x.getDate() + n); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  await req('POST', '/api/admin/renovar', { k: kAna, validade: d(-10) }, T);
  const lg = await req('POST', '/api/login', { fone: '16911110000', senha: 'Abcdefg1' });
  confere('vencida entra só para ver a conta', [lg.s, lg.j.expirado], [200, true]);
  const ev = (await req('GET', '/api/eu', null, lg.j.token)).j;
  confere('sabe quando apaga', [ev.expirado, ev.apagaEm], [true, 80]);
  confere('vencida não usa o app', [(await req('GET', '/api/estado', null, lg.j.token)).s, (await req('POST', '/api/transcrever', {}, lg.j.token)).s], [401, 401]);
  confere('vencida baixa os dados', (await req('GET', '/api/meus-dados', null, lg.j.token)).s, 200);
  confere('senha errada não exclui', (await req('POST', '/api/excluir-conta', { senha: 'errada' }, lg.j.token)).s, 403);
  confere('admin não se exclui', (await req('POST', '/api/excluir-conta', { senha: 'Abcdefg1' }, T)).s, 400);
  confere('vencida exclui a conta', (await req('POST', '/api/excluir-conta', { senha: 'Abcdefg1' }, lg.j.token)).s, 200);
  confere('conta sumiu', [(await req('POST', '/api/login', { fone: '16911110000', senha: 'Abcdefg1' })).s, (await req('GET', '/api/eu', null, lg.j.token)).s], [401, 401]);

  // ticket pelo canal: crédito, compra, saldo e resumo
  zerar(); await telegram({ chat: { id: 777 }, text: 'caiu 800 no ticket' }); await espera(150); await telegram({ chat: { id: 777 }, text: 'gastei 50 no mercado no ticket' }); await espera(150); await telegram({ chat: { id: 777 }, text: 'saldo do ticket' }); await espera(150);
  { const tx = saida.tg.map((m) => m.text || ''); confere('Telegram: crédito, compra e saldo', [/Saldo: R\$\s800,00/.test(tx[0] || ''), /Saldo: R\$\s750,00/.test(tx[1] || ''), /Saldo: R\$\s750,00/.test(tx[2] || '')], [true, true, true]); }
  // apagar pelo Telegram com o acesso vencido
  await req('POST', '/api/admin/renovar', { k: kBia, validade: d(-5) }, T);
  zerar(); await telegram({ chat: { id: 777 }, text: 'apagar meus dados' }); await espera(200);
  confere('vencida pede para apagar pelo chat', /CONFIRMAR APAGAR/.test((saida.tg[0] || {}).text || ''), true);
  await telegram({ chat: { id: 777 }, text: 'confirmar apagar' }); await espera(250);
  confere('apagou pelo chat', (await req('POST', '/api/login', { fone: 'bia@x.com', senha: 'Flores2026x' })).s, 401);

  // retenção: quem venceu há 90 dias some; quem está a 15 dias é avisado
  const c1 = await cadastro('Velha', '16933330000', 'velha@x.com'), c2 = await cadastro('Aviso', '16944440000', 'aviso@x.com'), c3 = await cadastro('Ok', '16955550000', 'ok@x.com');
  const L2 = (await req('GET', '/api/admin/usuarios', null, T)).j.usuarios; const kk = (f) => L2.find((u) => u.fone.endsWith(f)).k;
  await req('POST', '/api/admin/renovar', { k: kk('33330000'), validade: d(-90) }, T);
  await req('POST', '/api/admin/renovar', { k: kk('44440000'), validade: d(-75) }, T);
  await req('POST', '/api/admin/renovar', { k: kk('55550000'), validade: d(-20) }, T);
  await desligar();
  await ligar({ BREVO_API_KEY: 'k', EMAIL_REMETENTE: 'oi@sonhai.app' });
  zerar(); await ciclo();
  const horaSP = hojeSP().getHours();
  if (horaSP >= 4) {
    const L3 = (await req('GET', '/api/admin/usuarios', null, T));
    const fones = L3.j.usuarios.map((u) => u.fone.slice(-8));
    confere('retenção', [fones.includes('33330000'), fones.includes('44440000'), fones.includes('55550000')], [false, true, true]);
    confere('avisa 15 dias antes', saida.email.map((m) => m.to[0].email), ['aviso@x.com']);
    confere('registra a limpeza sem dados da pessoa', /retenção de 90 dias/.test(JSON.stringify(L3.j.auditoria)), true);
    zerar(); await desligar(); await ligar({ BREVO_API_KEY: 'k', EMAIL_REMETENTE: 'oi@sonhai.app' }); await ciclo();
    confere('não repete o aviso', saida.email.length, 0);
    confere('painel lista pendências', (await req('GET', '/api/admin/usuarios', null, T)).j.pendencias.length, 3);
  } else console.log('(retenção só roda depois das 4h)');

  // cadastro com Telegram para a próxima etapa
  const dani = await cadastro('Dani', '16966660000', 'dani@x.com'); await conectarTelegram(dani.j.token, 888); await pendurarConta(dani.j.token, 'Gas');
  const edu = await cadastro('Edu', '16977770000', 'edu@x.com'); await pendurarConta(edu.j.token, 'Net');
  await desligar();

  // ================================================================ WhatsApp ligado
  // Fábio já falou no WhatsApp há dois dias, com o número confirmado (fora da janela de 24h)
  const db = JSON.parse(fs.readFileSync(path.join(DADOS, 'db.json'), 'utf8'));
  await ligar({ WHATSAPP_TOKEN: 'x', WHATSAPP_PHONE_ID: 'y', WHATSAPP_APP_SECRET: SEG });

  // item 8: número não confirmado e Telegram
  zerar(); await ciclo();
  confere('número nunca confirmado não recebe nada', saida.zap.filter((m) => m.to.endsWith('77770000')).length, 0);
  confere('quem usa Telegram continua no Telegram', [saida.zap.filter((m) => m.to.endsWith('66660000')).length, saida.tg.some((m) => m.chat_id === 888)], [0, true]);

  // item 8: "oi" não dá mais conta ilimitada
  await zapEntra('5516988880000', 'oi');
  let lista = (await req('GET', '/api/admin/usuarios', null, T)).j.usuarios; let novo = lista.find((u) => u.fone.endsWith('88880000'));
  confere('oi vira teste de 7 dias', [novo.plano, !!novo.validade, novo.dias], ['gratis', true, 7]);
  confere('boas-vindas com Termos', saida.zap.some((m) => m.text && /termos\.html/.test(m.text.body)), true);
  await req('POST', '/api/admin/config', { cadastroAberto: false }, T);
  zerar(); await zapEntra('5516989990000', 'oi');
  lista = (await req('GET', '/api/admin/usuarios', null, T)).j.usuarios;
  confere('cadastro fechado: não cria conta', lista.some((u) => u.fone.endsWith('89990000')), false);
  confere('cadastro fechado: explica', /convite/.test((saida.zap[0] || { text: {} }).text.body || ''), true);
  await req('POST', '/api/admin/config', { cadastroAberto: true }, T);

  // confirmar o número
  zerar(); const codEdu = (await req('GET', '/api/eu', null, edu.j.token)).j.codigo;
  confere('migração gerou código', /^\d{4}$/.test(codEdu), true);
  await zapEntra('5516977770000', 'SONHAI ' + codEdu);
  confere('número confirmado', (await req('GET', '/api/eu', null, edu.j.token)).j.canal, 'whatsapp');
  confere('confirmação respondida pelo WhatsApp', saida.zap.some((m) => /confirmado/.test((m.text || {}).body || '')), true);
  await zapEntra('5516966660000', 'qualquer coisa');
  confere('escolher canal', (await req('POST', '/api/canal', { canal: 'telegram' }, dani.j.token)).j.canal, 'telegram');
  await desligar();

  // item 9: modelos fora da janela de 24h
  const dbf = path.join(DADOS, 'db.json'); const salvo = JSON.parse(fs.readFileSync(dbf, 'utf8'));
  const eduK = Object.keys(salvo.usuarios).find((k) => k.endsWith('77770000')); const ued = salvo.usuarios[eduK];
  ued.ultimaMsg = Date.now() - 2 * 864e5; ued.enviados = {};
  ued.estado.perfil.nome = 'Edu Silva'; ued.estado.perfil.versiculo = true;
  const hj = hojeSP(), hIso = hj.getFullYear() + '-' + String(hj.getMonth() + 1).padStart(2, '0') + '-' + String(hj.getDate()).padStart(2, '0');
  ued.estado.agenda = [{ id: 'a1', titulo: 'Dentista', data: hIso, hora: '', lembrar: true, upd: 1 }];
  fs.writeFileSync(dbf, JSON.stringify(salvo));
  await ligar({ WHATSAPP_TOKEN: 'x', WHATSAPP_PHONE_ID: 'y', WHATSAPP_APP_SECRET: SEG });
  zerar(); await ciclo();
  const tpl = saida.zap.filter((m) => m.to.endsWith('77770000'));
  confere('fora da janela usa o modelo certo', [tpl.length, tpl[0] && tpl[0].type, tpl[0] && tpl[0].template.name, tpl[0] && tpl[0].template.language.code], [1, 'template', 'lembrete_dia', 'pt_BR']);
  const ps = tpl[0].template.components[0].parameters.map((p) => p.text);
  confere('nome e lembretes', [ps[0], /Net/.test(ps[1]), /Dentista/.test(ps[1])], ['Edu', true, true]);
  confere('sem versículo nem marcação no modelo', [/Salmos|Provérbios|\*|\n/.test(ps.join(' '))], [false]);
  await desligar();

  // dentro da janela: texto completo, de graça
  const s2 = JSON.parse(fs.readFileSync(dbf, 'utf8')); const u2 = s2.usuarios[eduK]; u2.ultimaMsg = Date.now() - 3600e3; u2.enviados = {}; fs.writeFileSync(dbf, JSON.stringify(s2));
  await ligar({ WHATSAPP_TOKEN: 'x', WHATSAPP_PHONE_ID: 'y', WHATSAPP_APP_SECRET: SEG });
  zerar(); await ciclo();
  const dentro = saida.zap.filter((m) => m.to.endsWith('77770000'));
  confere('dentro da janela vai como texto', [dentro.length, dentro[0] && dentro[0].type, /Net/.test(dentro[0].text.body)], [1, 'text', true]);
  await desligar();

  // só incentivo ou versículo, fora da janela: não envia e não custa
  const s3 = JSON.parse(fs.readFileSync(dbf, 'utf8')); const u3 = s3.usuarios[eduK]; u3.ultimaMsg = Date.now() - 2 * 864e5; u3.enviados = {}; u3.estado.contas = []; u3.estado.agenda = []; fs.writeFileSync(dbf, JSON.stringify(s3));
  await ligar({ WHATSAPP_TOKEN: 'x', WHATSAPP_PHONE_ID: 'y', WHATSAPP_APP_SECRET: SEG });
  zerar(); await ciclo();
  confere('sem nada para lembrar, não gasta mensagem', saida.zap.filter((m) => m.to.endsWith('77770000')).length, 0);
  await desligar();

  simulador.close();
  try { fs.rmSync(DADOS, { recursive: true, force: true }); } catch (e) { /* tudo bem */ }
  console.log(`\n${falhas ? '⚠️' : '✅'} ${ok} testes passaram, ${falhas} falharam.`);
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.log('ERRO', e); if (proc) proc.kill(); process.exit(1); });
