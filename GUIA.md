# 💙 Sonhaí — Guia de publicação e venda

## ⚡ Resumo: do zero ao app no seu celular

1. **Publicar de graça (uma vez só, ~40 min):** siga o passo 2 abaixo (Supabase + GitHub + Render + cron-job.org). Você ganha um endereço tipo `https://sonhai-ab12.onrender.com`.
2. **Instalar no Android:** abra o endereço no **Chrome** → menu **⋮** → **Instalar app** (ou "Adicionar à tela inicial"). O ícone do Sonhaí aparece junto dos outros apps e abre em tela cheia, sem barra do navegador.
3. **Criar sua conta:** toque em **Criar conta**, informe nome, WhatsApp e senha. Seus dados ficam guardados no servidor e protegidos pela senha.
4. **Importar seus dados:** Ajustes → ⬆️ Importar backup → `backup-rodrigo-e-aline.json` (abra o arquivo pelo celular ou faça isso no computador, já logado).
5. **Compartilhar:** mande o endereço para quem quiser. Cada pessoa cria a própria conta e vê só os próprios dados.
   - **iPhone:** abrir no **Safari** → botão **Compartilhar** → **Adicionar à Tela de Início**.

## 🔐 Usuário e senha

- **Login:** número do WhatsApp + senha. A senha é guardada criptografada (scrypt), nunca em texto.
- **Bloqueio:** 5 senhas erradas seguidas bloqueiam aquele número por 15 minutos (proteção contra adivinhação).
- **Esqueci a senha:** a pessoa manda *esqueci minha senha* para o Sonhaí no WhatsApp e recebe um link que vale 30 minutos. Ao trocar a senha, todos os aparelhos antigos são desconectados.
- **Confirmação do número:** quem cria a conta pelo app recebe um código (ex.: *SONHAI 4821*) para mandar no WhatsApp. Só depois disso o WhatsApp passa a lançar gastos e enviar lembretes. Assim ninguém usa o número de outra pessoa.
- **Sair:** Ajustes → Minha conta → Sair (ou "Sair de todos os aparelhos", se perder o celular).
- Quem começar pelo WhatsApp recebe um link de entrada e o app pede para criar a senha.

---

## O que vem no pacote

| Arquivo | Para que serve |
|---|---|
| `public/index.html` | O app (celular e computador). Instalável na tela inicial e funciona sem internet. |
| `public/core.js` | O "cérebro": entende frases como "gastei 50 no mercado" e calcula os resumos. |
| `server.js` | Servidor: WhatsApp (texto e áudio), lembretes e sincronização com o app. Não precisa instalar nada além do Node. |
| `.env.exemplo` | Modelo das senhas e configurações. |
| `public/privacidade.html` e `termos.html` | Política de privacidade (LGPD) e termos de uso. A Meta exige a de privacidade. Preencha os campos entre [ ]. |
| `meus-dados/backup-rodrigo-e-aline.json` | Seus dados da Planilha dos Sonhos (novembro/26), prontos para importar. |
| `tools/planilha_para_app.py` | Converte uma Planilha dos Sonhos em backup do app (útil para clientes que já usam a planilha). |

## O que o app faz

- **Início com todos os resumos:** quanto sobrou, barra do orçamento (verde, amarela, vermelha), entrou/gastei/guardei/saldo acumulado, contas e compromissos de hoje, gráfico por categoria, sonhos, contas do mês, parcelas e últimos lançamentos.
- **Voz:** botão 🎤 central. Fale "gastei 45 no mercado", "paguei 120 de luz", "comprei uma TV de 2000 em 10x", "conta de internet vence dia 10, 110 reais", "dentista amanhã às 15h", "guardei 200 para a viagem", "retire 500 da reserva e coloque como renda", **"exclui o gasto de 45"** ou "desfazer".
- **WhatsApp:** o cliente manda texto ou **áudio** e o lançamento entra no planejamento. Também responde "resumo", "contas a pagar" e "agenda".
- **Cartões de crédito:** cada gasto e parcelado vai para a fatura do seu cartão (Itaú, Bradesco, Nubank…). Fatura com situação paga, parcial (com o valor pago) ou em aberto.
- **Lembretes no WhatsApp:** contas e faturas de cartão **1 dia antes e no dia do vencimento**, compromissos do dia (no horário escolhido) e **1 hora antes**. Às segundas, incentivo dos sonhos. No último dia do mês, parabéns se terminou no azul ou uma mensagem carinhosa se ficou no vermelho.
- Contas fixas com "paguei?", parcelados automáticos, gastos do ano (IPVA, IPTU…), dívidas com ordem de pagamento, sonhos com valor sugerido por mês, relatórios dos últimos 6 meses, limites por categoria, tema claro/escuro, backup.

---

## 1. Testar no seu computador (Windows), 10 minutos

1. Instale o **Node.js LTS** em nodejs.org (avançar, avançar, concluir).
2. Descompacte o `sonhai.zip` em `C:\sonhai`.
3. Abra a pasta, clique na barra de endereço, digite `cmd` e aperte Enter.
4. Digite `node server.js` e aperte Enter.
5. Abra o Chrome em **http://localhost:3000**.

Sem o WhatsApp configurado, o servidor roda em **modo demonstração**: as mensagens aparecem na janela preta. Dá para testar a conversa na tela **WhatsApp** do app.

**Para importar seus dados:** Ajustes → ⬆️ Importar backup → `meus-dados/backup-rodrigo-e-aline.json`.

## 2. Hospedagem grátis, passo a passo (Supabase + GitHub + Render + cron-job.org)

Tudo pelo navegador do computador, sem instalar nada. Reserve uns 40 minutos. São 4 sites, todos grátis:
- **Supabase:** guarda os dados.
- **GitHub:** guarda os arquivos do app.
- **Render:** deixa o app no ar.
- **cron-job.org:** não deixa o app "dormir".

### Antes de começar
Descompacte o `sonhai.zip` (botão direito → **Extrair tudo**). Vai aparecer a pasta `sonhai`.

### Parte A: Supabase (banco de dados), 10 min
1. Acesse **supabase.com** → **Start your project** → **Continue with GitHub**. Se não tiver GitHub, faça antes a Parte B, item 1.
2. **New project** → Name: `sonhai`.
   - **Database Password:** clique em *Generate a password* e guarde num bloco de notas.
   - **Region:** *South America (São Paulo)*.
   - Clique em **Create new project** e espere uns 2 minutos.
3. No menu da esquerda, abra **SQL Editor** → **New query**.
4. Abra o arquivo `supabase.sql` da pasta (botão direito → Abrir com → Bloco de Notas), copie tudo, cole no Supabase e clique em **Run**. Deve aparecer *Success*.
5. Abra **Project Settings** (engrenagem) → **API Keys**. Anote no bloco de notas:
   - **Project URL** (ex.: `https://abcd1234.supabase.co`). Também aparece em *Data API*.
   - **Secret key** (começa com `sb_secret_…`). Clique em *Reveal* e copie. Se só aparecer a aba *Legacy*, use a chave **service_role**.
   - ⚠️ Essa chave é secreta: nunca mande para ninguém.

### Parte B: GitHub (onde ficam os arquivos), 10 min
1. Acesse **github.com** → **Sign up** e crie a conta com seu e-mail.
2. Clique em **+** (canto superior direito) → **New repository**.
   - Repository name: `sonhai`.
   - Marque **Private**.
   - Clique em **Create repository**.
3. Na página que abrir, clique no link **uploading an existing file**.
4. Abra a pasta `sonhai` no Windows, selecione **tudo o que está dentro dela** (Ctrl+A) e arraste para a página do GitHub.
5. Espere subir e clique em **Commit changes**.
   - Confira que aparecem `server.js`, `render.yaml`, a pasta `public`… direto na raiz. Não pode aparecer uma pasta `sonhai` dentro de outra.

### Parte C: Render (deixa o app no ar), 10 min
1. Acesse **render.com** → **Get Started** → **GitHub**. Autorize e permita acesso ao repositório `sonhai`.
2. Clique em **New +** → **Blueprint** → escolha o repositório `sonhai` → **Connect**.
3. Ele lê o arquivo `render.yaml` e pede duas informações:
   - **SUPABASE_URL:** cole o *Project URL* da Parte A.
   - **SUPABASE_KEY:** cole a *Secret key* da Parte A.
4. Clique em **Apply** (ou *Deploy Blueprint*). Em 2 a 5 minutos aparece **Live** em verde.
5. Clique no serviço `sonhai`. No topo está o endereço do app, ex.: `https://sonhai-ab12.onrender.com`.
   - Abra o endereço: deve aparecer a tela de entrar do Sonhaí. 🎉
   - Se aparecer erro, veja a aba **Logs**. A mensagem "Não consegui abrir o banco de dados" quer dizer que a URL ou a chave do Supabase foi copiada errada. Corrija em **Environment** → **Save, rebuild and deploy**.

### Parte D: cron-job.org (impede o app de dormir), 5 min
O plano grátis do Render desliga o app depois de 15 minutos sem visitas. Desligado, ele demora para abrir e não manda lembretes.
1. Acesse **cron-job.org** → **Sign up** → confirme o e-mail.
2. **Create cronjob**:
   - Title: `Sonhaí acordado`.
   - URL: seu endereço + `/api/saude`, ex.: `https://sonhai-ab12.onrender.com/api/saude`.
   - Execution schedule: **Every 10 minutes**.
   - Clique em **Create**.

### Parte E: no seu celular Android, 5 min
1. Abra o endereço do app no **Chrome**.
2. Toque no menu **⋮** → **Instalar app** (ou *Adicionar à tela inicial*) → **Instalar**.
3. Abra o Sonhaí pelo ícone → **Criar conta** → nome, WhatsApp e senha.
4. Para trazer os dados da planilha: no computador, entre no app com seu WhatsApp e senha → **Ajustes** → **Importar backup** → arquivo `backup-rodrigo-e-aline.json` (enviado separado, fora do zip, para seus dados não irem para o GitHub). Pronto: aparece no celular também.

### Para compartilhar
Mande o endereço para as pessoas. Cada uma cria a própria conta.
- **Android:** Chrome → ⋮ → Instalar app.
- **iPhone:** Safari → Compartilhar → Adicionar à Tela de Início.

### Para atualizar o app depois
Quando eu te mandar uma versão nova, suba os arquivos de novo no GitHub (*Add file* → *Upload files* → arraste → *Commit changes*). O Render atualiza sozinho em poucos minutos. Seus dados continuam no Supabase.

### Limites do plano grátis (para você saber)
- **Render:** 750 horas por mês, o que dá para ficar ligado o mês inteiro. Atualizar o app leva alguns minutos.
- **Supabase:** 500 MB de dados, suficiente para centenas de usuários. O projeto pausa se ficar 7 dias sem uso, mas o próprio Sonhaí faz um acesso a cada 6 horas para evitar isso.
- Quando tiver clientes pagando, mude o Render para o plano **Starter**: fica mais rápido e com mais memória.

## 3. Ligar o WhatsApp (API oficial da Meta)

1. Acesse **developers.facebook.com** → *Meus apps → Criar app* → tipo **Empresa** → adicione o produto **WhatsApp**.
2. Em *WhatsApp → Configuração da API* você recebe um **número de teste**. Copie:
   - **Identificação do número de telefone** → `WHATSAPP_PHONE_ID`
   - **Token** → `WHATSAPP_TOKEN` (o temporário dura 24h; para o definitivo, crie um *Usuário do sistema* no Gerenciador de Negócios com permissão `whatsapp_business_messaging` e gere um token sem validade).
3. *Configurações do app → Básico* → **Chave secreta do app** → `WHATSAPP_APP_SECRET`. Na mesma tela, coloque a URL `https://SEU-ENDERECO/privacidade.html`.
4. *WhatsApp → Configuração → Webhook*:
   - URL de retorno: `https://SEU-ENDERECO/webhook`
   - Token de verificação: o mesmo de `WHATSAPP_VERIFY_TOKEN`
   - Clique em **Gerenciar** e assine o campo **messages**.
5. Mande "oi" do seu celular para o número. O Sonhaí responde com o link do seu app. 🎉

**Número oficial para clientes:** adicione um número próprio (chip que não esteja no WhatsApp comum) e faça a **verificação do negócio** com CNPJ (MEI serve). Sem ela, o limite é pequeno.

## 4. Áudios (transcrição)

Crie uma chave em **platform.openai.com** → API keys → coloque em `OPENAI_API_KEY` e adicione créditos. O custo é de frações de centavo por áudio curto. Sem a chave, o WhatsApp aceita só texto. O botão 🎤 do app continua funcionando no Chrome e no Android, porque usa o reconhecimento de voz do próprio celular.

## 5. Modelo de mensagem para os lembretes (obrigatório)

A Meta só deixa a empresa **iniciar** conversa (lembrete) com um **modelo aprovado**. Dentro de 24h após o cliente falar com você, qualquer texto pode ser enviado.

No Gerenciador do WhatsApp → **Modelos de mensagem → Criar**:
- Categoria: **Utilidade** · Nome: `lembrete_sonhai` · Idioma: **Português (BR)**
- Corpo: `Olá! Aqui é o Sonhaí 💙 {{1}}`
- Exemplo para {{1}}: `HOJE vence: Energia — R$ 189,90 • Amanhã vence: Internet — R$ 109,90`

A aprovação costuma sair em minutos. O servidor usa o modelo sozinho quando precisa.

## 6. Custos mensais aproximados

| Item | Custo |
|---|---|
| Hospedagem | Grátis (Render free + Supabase free). Com clientes: Render Starter ~US$ 7/mês |
| WhatsApp: mensagens de modelo (lembretes) | cobrança por mensagem, em centavos; respostas dentro de 24h para o que o cliente mandou costumam ser gratuitas. Confira a tabela atual em developers.facebook.com/docs/whatsapp/pricing |
| Transcrição de áudio | centavos por cliente/mês |
| Domínio .com.br / .app.br | ~R$ 40/ano |

## 7. Como vender

- **Modelo:** assinatura mensal (ex.: R$ 9,90 a R$ 19,90) ou anual com desconto, com **7 dias grátis**.
- **Cobrança:** Hotmart, Kiwify ou Eduzz (cuidam de Pix, cartão, nota e reembolso). Depois do pagamento, o cliente recebe o número do WhatsApp e manda "oi".
- **Divulgação:** vídeos curtos mostrando o áudio virando lançamento e o lembrete chegando. Esse é o "uau" do produto.
- **Combo:** Planilha dos Sonhos + Sonhaí. O `tools/planilha_para_app.py` importa a planilha do cliente.
- **Legal:** abra um MEI, preencha `privacidade.html` e `termos.html` e coloque os links na página de vendas.

### Próximos passos quando passar de algumas centenas de clientes

1. Trocar o arquivo `data/db.json` por um banco (Supabase/Postgres).
2. Bloquear o acesso de quem não pagou (webhook da Hotmart → marcar usuário ativo/inativo).
3. Publicar nas lojas da Apple e do Google empacotando o app (PWABuilder.com gera os pacotes a partir do endereço).

## Comandos que o Sonhaí entende

| Diga ou escreva | O que acontece |
|---|---|
| gastei 45,90 no mercado / ifood 22 / 15 reais de pão | Gasto com categoria automática |
| gastei 10 na lanchonete no cartão de crédito Itaú | Gasto na fatura do cartão Itaú (cria o cartão se não existir) |
| comprei uma TV de 2000 em 10x no cartão Nubank | Parcelado no cartão Nubank |
| a fatura do Itaú vence dia 10 e fecha dia 3 | Ajusta vencimento e fechamento |
| quanto está a fatura do Itaú / ver fatura | Mostra fatura e situação |
| paguei a fatura do Itaú / paguei 500 da fatura do Bradesco | Pagamento total ou parcial (o restante vai para a próxima fatura) |
| paguei 130 de luz / paguei a conta de internet | Marca a conta fixa como paga |
| recebi 5000 de salário | Entrada |
| comprei uma TV de 2000 em 10x | Parcelado (aparece sozinho nos próximos meses) |
| conta de água vence dia 17, 90 reais | Conta fixa com lembretes |
| dentista quinta às 14h / reunião amanhã 9h30 | Compromisso com lembrete |
| guardei 200 para a viagem | Dinheiro no sonho |
| retire 500 da reserva de emergência e coloque como renda | Tira do sonho e lança como renda do mês |
| transfere 300 da reserva para a viagem | Passa dinheiro de um sonho para outro |
| exclui o gasto de 45,90 / apaga o gasto do restaurante | Exclui |
| desfazer | Desfaz o último lançamento |
| resumo · contas a pagar · agenda · link | Consultas |
| orçamento 8000 · meu nome é Rodrigo | Ajustes pelo WhatsApp |
| apagar meus dados | Exclusão (LGPD), com confirmação |
