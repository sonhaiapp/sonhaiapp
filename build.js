// Gera public/index.html (app instalável) e dist/sonhai-artifact.html (versão de demonstração)
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(R, 'src/app.html'), 'utf8');
const core = fs.readFileSync(path.join(R, 'public/core.js'), 'utf8');
const body = app.replace('/* CORE_INLINE */', () => core);
fs.writeFileSync(path.join(R, 'dist/sonhai-artifact.html'), body);
const head = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="description" content="Sonhaí: controle financeiro por voz e WhatsApp, com lembretes de contas e metas de sonhos.">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style>
<!--CC_SERVER--></head><body>
`;
fs.writeFileSync(path.join(R, 'public/index.html'), head + body + '\n</body></html>\n');
console.log('ok', body.length);
