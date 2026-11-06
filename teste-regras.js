// Sonhaí: teste das regras (frases, desfazer, cartão, histórico e renda fixa)
// Como rodar: node teste-regras.js
const fs = require('fs'), path = require('path');
const arq = fs.existsSync(path.join(__dirname, 'core.js')) ? path.join(__dirname, 'core.js') : path.join(__dirname, 'public', 'core.js');
const CC = require(arq);
let ok = 0, falhas = 0;
const confere = (nome, real, esperado) => {
  const a = JSON.stringify(real), b = JSON.stringify(esperado);
  if (a === b) ok++; else { falhas++; console.log('❌ ' + nome + '\n   veio:     ' + a + '\n   esperado: ' + b); }
};
const quarta = new Date(2026, 10, 4, 20, 0); // quarta-feira, 04/11/2026
const novo = () => { const e = CC.estadoVazio(); e.perfil.nome = 'Teste'; return e; };
const le = (f, hoje) => CC.interpretar(f, { hoje: hoje || quarta });
const fala = (e, f, hoje) => CC.conversar(e, f, { hoje: hoje || quarta, origem: 'whatsapp' });

// ---------------------------------------------------------------- valores
for (const [f, v] of [
  ['gastei 2 mil no conserto do carro', 2000], ['gastei 1 mil de aluguel', 1000], ['gastei 3 mil reais na viagem', 3000], ['paguei 1,5 mil no dentista', 1500],
  ['gastei 2 mil e 500 na reforma', 2500], ['gastei mil e quinhentos no conserto', 1500], ['gastei dois mil reais', 2000], ['gastei dois mil e quinhentos no conserto', 2500],
  ['comprei 2 camisas por 100', 100], ['almoço para 3 pessoas 120', 120], ['abasteci 40 litros 230', 230], ['comprei 3 pizzas 90', 90], ['gastei 200 em 2 pneus', 200],
  ['99 pop 18', 18], ['gastei 50 no mercado com 2 filhos', 50], ['comprei uma TV de 2000', 2000], ['2 kg de carne 80', 80],
  ['gastei cinquenta e dois e noventa no mercado', 52.9], ['cinco e cinquenta na padaria', 5.5], ['gastei vinte e cinco reais e cinquenta centavos', 25.5], ['cento e vinte reais de luz', 120],
  ['cinquenta e dois reais e noventa no mercado', 52.9], ['gastei um real e cinquenta na bala', 1.5], ['gastei cem reais', 100], ['duzentos e cinquenta e cinco no mercado', 255],
  ['R$ 1.234,56 no mercado', 1234.56], ['gastei 1.500,00 no aluguel', 1500], ['paguei 99.90 na farmácia', 99.9], ['gastei 45,90 no mercado', 45.9], ['ifood 22', 22], ['15 reais de pão', 15],
  ['compras 350', 350], ['roupas 200', 200], ['gastei com roupas 200', 200], ['gás 130', 130], ['frutas 20', 20], ['pizzas 90', 90], ['verduras 30', 30],
  ['gastei 120 dia 28', 120], ['gastei 60 dia 30 de outubro', 60], ['gastei 500 mês passado', 500], ['gastei 50 no cartão c6', 50]
]) { const a = le(f); confere(f, [a.tipo, a.valor], ['gasto', v]); }
confere('comprei 3 pizzas não tem preço: pergunta quanto foi', le('comprei 3 pizzas').tipo, 'falta_valor');
confere('5 kg de arroz não tem preço: pergunta quanto foi', le('comprei 5 kg de arroz').tipo, 'falta_valor');

// ---------------------------------------------------------------- categorias
confere('compras vai para Mercado', le('compras 350').cat, 'Mercado');
confere('gás vai para Contas da Casa', le('gás 130').cat, 'Contas da Casa');
confere('caixa eletrônico não é Eletrônicos', le('tirei 100 no caixa eletrônico').cat, 'Outros');
confere('mercado livre é compra online', le('gastei 80 no mercado livre').cat, 'Compras Online');

// ---------------------------------------------------------------- datas
confere('gasto na sexta olha para trás', le('gastei 50 na sexta').data, '2026-10-30');
confere('gasto no sábado olha para trás', le('gastei 80 no sábado').data, '2026-10-31');
confere('gasto na segunda olha para trás', le('gastei 40 na segunda').data, '2026-11-02');
confere('gasto dia 28 é do mês passado', le('gastei 120 dia 28').data, '2026-10-28');
confere('gasto dia 3 é deste mês', le('gastei 70 dia 3').data, '2026-11-03');
confere('gasto dia 30 de outubro', le('gastei 60 dia 30 de outubro').data, '2026-10-30');
confere('gasto em 25/12 é do ano passado', le('gastei 90 em 25/12').data, '2025-12-25');
confere('dentista dia 3 vai para o mês seguinte', le('dentista dia 3 às 15h').data, '2026-12-03');
confere('compromisso segunda olha para a frente', le('reunião segunda às 9h').data, '2026-11-09');
confere('compromisso dia 31 em novembro não estoura', le('dentista dia 31 às 15h').data, '2026-11-30');
confere('segunda parcela não é dia da semana', le('paguei a segunda parcela do carro 300').data, '2026-11-04');
confere('gastei ontem', le('gastei 30 ontem').data, '2026-11-03');
confere('dentista amanhã', le('dentista amanhã às 15h').data, '2026-11-05');
confere('compromisso em data passada avisa', /já passou/.test(fala(novo(), 'dentista 02/11 às 15h').msg), true);

// ---------------------------------------------------------------- parcelas
for (const [f, n, v] of [['comprei uma geladeira em 3x de 1.200', 3, 1200], ['comprei tv 12 parcelas de 199,90', 12, 199.9], ['tv de 3.000 em 10x', 10, 300], ['parcelei 600 em 6', 6, 100], ['comprei uma TV de 2000 em 10x no cartão Nubank', 10, 200], ['comprei uma tv de 2 mil em 10x', 10, 200]]) { const a = le(f); confere(f, [a.tipo, a.n, a.valorParcela], ['parcelado', n, v]); }

// ---------------------------------------------------------------- intenção
for (const f of ['gastei 50 em Tiradentes', 'comprei removedor de esmalte 12', 'gastei 30 na cancela do estacionamento', 'conta do restaurante 120', 'a conta do bar deu 80', 'dividi a conta do almoço 45', 'reservei o hotel 500', 'tirei 100 no caixa eletrônico']) confere(f, le(f).tipo, 'gasto');
for (const f of ['vale a pena comprar uma tv de 2000', 'quero comprar um carro de 30000', 'posso gastar 100 no mercado?', 'vou pagar 100 de luz amanhã', 'quero guardar 500 por mês para viagem']) confere(f, le(f).tipo, 'plano');
confere('meta do carro', [le('meta de 10000 para o carro').tipo, le('meta de 10000 para o carro').valor, le('meta de 10000 para o carro').nome], ['meta_sonho', 10000, 'Carro']);
confere('quero juntar', le('quero juntar 8000 para a viagem').tipo, 'meta_sonho');
confere('cancelei a netflix não lança nada', le('cancelei a netflix 40').tipo, 'desconhecido');
for (const f of ['exclui o gasto de 45,90', 'apaga o gasto do restaurante', 'pode excluir o gasto de 50', 'remove a conta de luz', 'cancela o compromisso do dentista', 'tira o gasto de 45']) confere(f, le(f).tipo, 'excluir');
for (const [f, t] of [['conta de luz vence dia 10, 150 reais', 'conta'], ['conta de água vence dia 17, 90 reais', 'conta'], ['boleto da escola 500 dia 10', 'conta'], ['conta de internet todo dia 15 110 reais', 'conta'], ['mensalidade da escola 900 dia 8', 'conta'], ['me lembra de pagar o boleto amanhã', 'compromisso'], ['dentista quinta às 14h', 'compromisso'], ['guardei 200 para a viagem', 'sonho'], ['investi 500', 'sonho'], ['reservei 500 para a viagem', 'sonho'], ['recebi 5000 de salário', 'entrada'], ['ganhei 100 de presente', 'entrada'], ['recebi 800 de vale alimentação', 'ticket_credito'], ['paguei a fatura do Itaú', 'pagar_fatura'], ['a fatura do Itaú vence dia 10 e fecha dia 3', 'config_cartao'], ['resumo', 'resumo'], ['contas a pagar', 'contas_pendentes'], ['agenda', 'agenda_hoje'], ['desfazer', 'desfazer'], ['quanto sobrou', 'resumo'], ['quanto posso gastar', 'quanto_posso'], ['oi', 'ajuda']]) confere(f, le(f).tipo, t);
confere('vale sozinho continua sendo adiantamento', le('recebi 500 de vale').cat, 'Adiantamento');
confere('frases do guia', ['retire 500 da reserva de emergência e coloque como renda', 'transfere 300 da reserva para a viagem'].map((f) => CC.interpretar(f, { hoje: quarta, sonhos: [{ id: '1', nome: 'Reserva de emergência' }, { id: '2', nome: 'Viagem' }] }).tipo), ['resgate', 'resgate']);

// ---------------------------------------------------------------- exclusão com confirmação
{ const e = novo(); fala(e, 'gastei 50 no mercado'); const r = fala(e, 'gastei 50 em Tiradentes'); confere('Tiradentes não apaga nada', [e.lancamentos.length, r.ok], [2, true]); }
{ const e = novo(); fala(e, 'gastei 50 no mercado'); const r = fala(e, 'exclui o gasto de 50'); confere('pede confirmação', [e.lancamentos.length, /sim/.test(r.msg)], [1, true]); const r2 = fala(e, 'sim'); confere('exclui depois do sim', [e.lancamentos.length, r2.ok, !!r2.podeDesfazer], [0, true, true]); fala(e, 'desfazer'); confere('desfazer traz de volta', e.lancamentos.map((l) => l.valor), [50]); }
{ const e = novo(); fala(e, 'gastei 50 no mercado'); fala(e, 'exclui o gasto de 50'); const r = fala(e, 'não'); confere('não mantém', [e.lancamentos.length, r.msg], [1, 'Tudo bem, não excluí nada. 🙂']); }
{ const e = novo(); fala(e, 'gastei 50 no mercado'); fala(e, 'exclui o gasto de 50'); fala(e, 'gastei 30 na padaria'); confere('outra frase cancela a pergunta e segue', [e.lancamentos.length, e.pendente], [2, undefined]); }

// ---------------------------------------------------------------- desfazer
{ const e = novo(); fala(e, 'gastei 50 no mercado'); fala(e, 'recebi 3000 de salário'); fala(e, 'guardei 200 para a viagem'); const r = fala(e, 'desfazer'); confere('desfazer sonho', [e.lancamentos.length, e.sonhos.length, /guardados/.test(r.msg)], [2, 1, true]); }
{ const e = novo(); fala(e, 'conta de luz vence dia 10, 150 reais'); fala(e, 'gastei 30 na padaria'); const r0 = fala(e, 'paguei 160 de luz'); confere('paguei oferece desfazer', !!r0.podeDesfazer, true); const r = fala(e, 'desfazer'); confere('desfazer pagamento mantém a conta', [e.contas.length, CC.valorConta(e.contas[0], '2026-11'), !!(e.contas[0].pagos || {})['2026-11'], e.lancamentos.length, /pagamento/.test(r.msg)], [1, 150, false, 1, true]); }
{ const e = novo(); fala(e, 'conta de luz vence dia 10, 150 reais'); fala(e, 'paguei a conta de luz'); fala(e, 'desfazer'); confere('desfazer "paguei a conta"', [e.contas.length, !!(e.contas[0].pagos || {})['2026-11']], [1, false]); }
{ const e = novo(); fala(e, 'gastei 50 no mercado no cartão de crédito Itaú'); fala(e, 'desfazer'); confere('desfazer tira gasto e cartão novo', [e.lancamentos.length, e.cartoes.length], [0, 0]); }
{ const e = novo(); fala(e, 'gastei 50 no mercado no cartão de crédito Itaú'); fala(e, 'paguei a fatura do Itaú'); const y = Object.keys(e.cartoes[0].faturas); fala(e, 'desfazer'); confere('desfazer pagamento de fatura', [y.length, Object.keys(e.cartoes[0].faturas).length, e.lancamentos.length], [1, 0, 1]); }
{ const e = novo(); fala(e, 'guardei 500 na reserva'); fala(e, 'retire 200 da reserva de emergência e coloque como renda'); const s = e.sonhos[0]; confere('retirada', [CC.totalSonho(s), e.lancamentos.length], [300, 1]); fala(e, 'desfazer'); confere('desfazer retirada', [CC.totalSonho(e.sonhos[0]), e.lancamentos.length], [500, 0]); }
{ const e = novo(); fala(e, 'gastei 10 na padaria'); fala(e, 'gastei 20 na padaria'); fala(e, 'desfazer'); fala(e, 'desfazer'); confere('desfazer duas vezes', e.lancamentos.length, 0); confere('sem mais nada', fala(e, 'desfazer').ok, false); }
{ const e = novo(); fala(e, 'comprei uma TV de 2000 em 10x no cartão Nubank'); fala(e, 'desfazer'); confere('desfazer parcelado', [e.parcelados.length, e.cartoes.length], [0, 0]); }
{ const e = novo(); fala(e, 'dentista amanhã às 15h'); fala(e, 'desfazer'); confere('desfazer compromisso', e.agenda.length, 0); }
{ const e = novo(); fala(e, 'meu salário é 5000 todo dia 2'); fala(e, 'desfazer'); confere('desfazer renda fixa', [e.rendas.length, e.lancamentos.length], [0, 0]); }

// ---------------------------------------------------------------- cartão
const dia20 = new Date(2026, 10, 20, 20, 0);
{ const e = novo(); const r = fala(e, 'gastei 100 na lanchonete no cartão de crédito Itaú', dia20); const c = e.cartoes[0]; const ym = CC.mesFatura(c, '2026-11-20'); const f = CC.fatura(e, c.id, ym, dia20); confere('cartão sem fechamento', [ym, f.venc, f.situacao, CC.faturasAVencer(e, dia20, 30).length], ['2026-12', '2026-12-10', 'aberta', 1]); confere('resposta diz o vencimento', /vence em 10\/12/.test(r.msg), true); }
{ const e = novo(); fala(e, 'gastei 100 na lanchonete no cartão de crédito Itaú', dia20); fala(e, 'a fatura do Itaú vence dia 5 e fecha dia 28', dia20); const c = e.cartoes[0]; const f = CC.fatura(e, c.id, CC.mesFatura(c, '2026-11-20'), dia20); confere('fecha 28, vence 5', [f.ym, f.venc, f.situacao], ['2026-11', '2026-12-05', 'aberta']); confere('lembra um dia antes', CC.faturasAVencer(e, new Date(2026, 11, 4, 8, 0), 1).map((x) => x.emDias), [1]); const dez5 = new Date(2026, 11, 5, 9, 0); confere('lembra no dia', CC.faturasAVencer(e, dez5, 1).map((x) => x.emDias), [0]); fala(e, 'paguei a fatura do Itaú', dez5); confere('paga a fatura certa', Object.keys(e.cartoes[0].faturas), ['2026-11']); confere('depois de paga', CC.fatura(e, c.id, '2026-11', dez5).situacao, 'paga'); }
{ const e = novo(); const h = new Date(2026, 10, 2, 9, 0); fala(e, 'gastei 100 na lanchonete no cartão de crédito Itaú', h); fala(e, 'a fatura do Itaú vence dia 10 e fecha dia 3', h); const c = e.cartoes[0]; confere('fecha 3, vence 10, compra dia 2', [CC.mesFatura(c, '2026-11-02'), CC.vencFatura(c, '2026-11')], ['2026-11', '2026-11-10']); confere('compra depois do fechamento', [CC.mesFatura(c, '2026-11-05'), CC.vencFatura(c, '2026-12')], ['2026-12', '2026-12-10']); }
{ const c = { diaVenc: 5 }; confere('fechamento padrão com vencimento dia 5', [CC.diaFechamento(c), CC.vencFatura(c, '2026-12')], [28, '2027-01-05']); confere('vencimento em fevereiro', CC.vencFatura({ diaVenc: 31, fechamento: 20 }, '2027-02'), '2027-02-28'); }

// ---------------------------------------------------------------- histórico
{ const e = novo(); for (const m of ['09', '10']) e.lancamentos.push({ id: 'a' + m, tipo: 'entrada', data: `2026-${m}-05`, desc: 'Sal', cat: 'Salário', valor: 5000, upd: 1 });
  fala(e, 'conta de aluguel vence dia 5, 2000 reais'); confere('conta nova não mexe no passado', [CC.resumoMes(e, '2026-09').gastoTotal, CC.resumoMes(e, '2026-10').gastoTotal, CC.resumoMes(e, '2026-11').gastoTotal, CC.resumoMes(e, '2026-11').saldoAcum], [0, 0, 2000, 8000]);
  const d1 = new Date(2026, 11, 3, 9, 0); fala(e, 'paguei 2500 de aluguel', d1); confere('valor novo vale daqui para a frente', [CC.resumoMes(e, '2026-11').gastoTotal, CC.resumoMes(e, '2026-12').gastoTotal, CC.resumoMes(e, '2027-01').gastoTotal], [2000, 2500, 2500]); }
{ const e = novo(); e.contas.push({ id: 'x', nome: 'Luz', cat: 'Contas da Casa', valor: 150, dia: 10, recorrente: true, pagos: {}, upd: 1 }); fala(e, 'paguei 200 de luz'); confere('conta antiga guarda o valor antigo', [CC.valorConta(e.contas[0], '2026-09'), CC.valorConta(e.contas[0], '2026-11'), e.contas[0].valor], [150, 200, 200]); }
{ const e = novo(); e.contas.push({ id: 'x', nome: 'Luz', cat: 'Contas da Casa', valor: 150, dia: 10, recorrente: true, pagos: {}, upd: 1 }); fala(e, 'exclui a conta de luz'); fala(e, 'sim'); confere('excluir conta preserva meses anteriores', [e.contas.length, CC.resumoMes(e, '2026-10').fixas, CC.resumoMes(e, '2026-11').fixas, CC.resumoMes(e, '2026-12').fixas], [1, 150, 0, 0]); fala(e, 'desfazer'); confere('desfazer reativa a conta', CC.resumoMes(e, '2026-12').fixas, 150); }
{ const e = novo(); fala(e, 'conta de luz vence dia 10, 150 reais'); fala(e, 'conta de luz vence dia 12, 170 reais'); confere('atualiza sem duplicar', [e.contas.length, e.contas[0].dia, CC.valorConta(e.contas[0], '2026-11')], [1, 12, 170]); }

// ---------------------------------------------------------------- renda fixa
const dia1 = new Date(2026, 11, 1, 9, 0);
{ const e = novo(); fala(e, 'conta de aluguel vence dia 20, 1500 reais', dia1); fala(e, 'conta de luz vence dia 25, 200 reais', dia1); const r = CC.resumoMes(e, '2026-12'); confere('sem renda, a mensagem pede a renda', /renda/.test(CC.mensagemHumor(r)), true); }
{ const e = novo(); const a = le('meu salário é 5000 todo dia 5'); confere('entende renda fixa', [a.tipo, a.nome, a.valor, a.dia], ['renda_fixa', 'Salário', 5000, 5]); confere('recebo por mês', [le('recebo 3000 por mês').tipo, le('recebo 3000 por mês').dia], ['renda_fixa', 5]); confere('aposentadoria', le('minha aposentadoria é 2800 todo dia 25').cat, 'Aposentadoria');
  fala(e, 'meu salário é 5000 todo dia 5', dia1); fala(e, 'conta de aluguel vence dia 20, 1700 reais', dia1); const r = CC.resumoMes(e, '2026-12'); confere('dia 1º com renda fixa', [r.entradas, r.entradasReais, r.previsto, r.sobra], [5000, 0, 5000, 3300]);
  const d5 = new Date(2026, 11, 5, 9, 0); confere('lança no dia', CC.garantirRendas(e, d5), true); const r2 = CC.resumoMes(e, '2026-12'); confere('depois de cair', [r2.entradas, r2.entradasReais, r2.previsto, e.lancamentos.length], [5000, 5000, 0, 1]); confere('não duplica', CC.garantirRendas(e, d5), false);
  confere('mês seguinte fica previsto', CC.resumoMes(e, '2027-01').previsto, 5000); CC.garantirRendas(e, new Date(2027, 2, 10)); confere('recupera meses sem abrir o app', e.lancamentos.filter((l) => l.tipo === 'entrada').length, 4);
  fala(e, 'recebi 5300 de salário', new Date(2027, 2, 10)); confere('"recebi" ajusta em vez de duplicar', [e.lancamentos.filter((l) => l.data.startsWith('2027-03')).length, e.lancamentos.find((l) => l.data.startsWith('2027-03')).valor], [1, 5300]); }
{ const e = novo(); fala(e, 'recebi 5000 de salário', new Date(2026, 11, 6)); fala(e, 'meu salário é 5000 todo dia 5', new Date(2026, 11, 6)); confere('já lançado à mão não duplica', [e.lancamentos.length, CC.resumoMes(e, '2026-12').entradas], [1, 5000]); }
{ const e = novo(); fala(e, 'meu salário é 5000 todo dia 5', dia1); fala(e, 'meu salário é 5500 todo dia 6', dia1); confere('atualiza a renda fixa', [e.rendas.length, e.rendas[0].dia, CC.valorConta(e.rendas[0], '2026-12')], [1, 6, 5500]); }
{ const e = novo(); fala(e, 'meu salário é 5000 todo dia 5', new Date(2026, 11, 6)); confere('lançou', e.lancamentos.length, 1); CC.remover(e, 'lancamentos', e.lancamentos[0].id); CC.garantirRendas(e, new Date(2026, 11, 7)); confere('excluída não volta', [e.lancamentos.length, CC.resumoMes(e, '2026-12').previsto], [0, 0]); }
{ const a = novo(); fala(a, 'meu salário é 5000 todo dia 5', dia1); const b = JSON.parse(JSON.stringify(a)); const d5 = new Date(2026, 11, 5, 9, 0); CC.garantirRendas(a, d5); CC.garantirRendas(b, d5); const m = CC.mesclar(a, b); confere('celular e servidor não duplicam', m.lancamentos.length, 1); }

// ---------------------------------------------------------------- ticket alimentação/refeição
for (const f of ['coloquei 800 no ticket', 'recarreguei 650,50 no vale alimentação', 'caiu 800 no ticket', 'recebi 800 de vale alimentação', 'caiu o vale refeição 450', 'entrou 1200 no cartão alimentação', 'crédito de 800 no ticket', 'coloca 800 no ticket', 'oitocentos reais de crédito no ticket', 'recebi 700 no alelo', 'tíquete 800 de crédito', 'coloquei 800 no vale-alimentação', 'caiu 800 no ticket alimentação/refeição', 'coloquei 300 de saldo no ticket']) confere('crédito: ' + f, le(f).tipo, 'ticket_credito');
for (const [f, c] of [['gastei 50 no mercado no ticket', 'Mercado'], ['almoço 32 no vale refeição', 'Restaurante/Lanche'], ['paguei 120 com o ticket no assaí', 'Mercado'], ['mercado 200 no cartão alimentação', 'Mercado'], ['almocei 30 no vr', 'Restaurante/Lanche'], ['comprei pão 15 no va', 'Padaria'], ['padaria 12,50 no alelo', 'Padaria'], ['coloquei 100 de gasolina no ticket', 'Combustível'], ['paguei 60 no ticket restaurante', 'Restaurante/Lanche']]) { const a = le(f); confere('compra: ' + f, [a.tipo, a.cat, !!a.ticket, a.pagamento, a.paguei], ['gasto', c, true, 'Ticket', false]); }
for (const f of ['saldo do ticket', 'quanto tem no ticket', 'quanto tenho no vale alimentação', 'quanto gastei no ticket', 'qual o saldo do vr', 'ticket']) confere('saldo: ' + f, le(f).tipo, 'ver_ticket');
confere('ticket do estacionamento não é o cartão', [le('paguei 20 no ticket do estacionamento').tipo, !!le('paguei 20 no ticket do estacionamento').ticket], ['gasto', false]);
confere('plano no ticket não lança', [le('vou gastar 100 no ticket').tipo, le('posso gastar 100 no ticket?').tipo], ['plano', 'plano']);
confere('resumo continua sendo resumo', [le('saldo').tipo, le('quanto gastei').tipo], ['resumo', 'resumo']);
confere('crédito mensal não vira renda fixa', le('recebo 800 de ticket todo mês').tipo, 'plano');
{ const e = novo(); const saldo = () => CC.saldoTicket(e, e.tickets[0].id);
  fala(e, 'caiu 800 no ticket'); confere('crédito sobe o saldo', [e.tickets.length, e.tickets[0].nome, saldo()], [1, CC.NOME_TICKET, 800]);
  const r1 = fala(e, 'gastei 50,25 no mercado no ticket'); confere('compra desce o saldo', saldo(), 749.75); confere('compra avisa o saldo', r1.msg.includes('Saldo: R$ 749,75'), true);
  fala(e, 'almoço 49,75 no vale refeição'); confere('toda frase cai no mesmo cartão', [e.tickets.length, saldo()], [1, 700]);
  fala(e, 'recarreguei 100 no ticket'); confere('novo crédito soma', saldo(), 800);
  const m = CC.resumoMes(e, '2026-11');
  confere('ticket fica fora do saldo do mês', [m.entradas, m.gastoTotal, m.sobra, m.ticketGasto], [0, 0, 0, 100]);
  confere('compra aparece nas categorias', m.porCategoria.Mercado, 50.25);
  confere('resumo mostra o ticket', CC.textoResumo(e, '2026-11', quarta).includes('saldo R$ 800,00'), true);
  fala(e, 'gastei 50 no mercado no ticket'); fala(e, 'desfazer'); confere('desfazer compra devolve o saldo', saldo(), 800);
  fala(e, 'caiu 200 no ticket'); fala(e, 'desfazer'); confere('desfazer crédito tira do saldo', saldo(), 800);
  fala(e, 'exclui o crédito de 100 do ticket'); confere('exclusão de crédito pede confirmação', [saldo(), e.pendente.tipo], [800, 'excluir']); fala(e, 'sim'); confere('crédito excluído', saldo(), 700);
  fala(e, 'desfazer'); confere('desfazer exclusão de crédito', saldo(), 800);
  fala(e, 'exclui o gasto de 50,25 do ticket'); fala(e, 'sim'); confere('compra excluída devolve o saldo', saldo(), 850.25);
  const r2 = fala(e, 'mercado 1000 no ticket'); confere('saldo negativo é avisado', [saldo(), r2.msg.includes('negativo')], [-149.75, true]);
  CC.sanearEstado(e); confere('saneamento mantém o ticket', saldo(), -149.75);
}
{ const e = novo(); fala(e, 'gastei 30 no mercado no ticket'); confere('compra antes do crédito cria o cartão', CC.saldoTicket(e, e.tickets[0].id), -30);
  const f = CC.fatura(e, 'x', '2026-11', quarta); confere('ticket não tem fatura', [f, CC.faturasAVencer(e, quarta, 40).length], [null, 0]);
  fala(e, 'gastei 20 no cartão'); confere('"no cartão" não vai para o ticket', e.lancamentos.filter((l) => l.ticketId).length, 1);
  confere('fatura com só ticket não acha cartão', fala(e, 'quanto está a fatura').msg.includes('ainda não tem cartões'), true); }
{ const e = novo(); e.lancamentos.push({ id: 'velho', tipo: 'gasto', data: '2026-10-01', desc: 'Antigo', cat: 'Mercado', valor: 300, ticket: true, pagamento: 'Ticket', upd: 1 }); fala(e, 'caiu 800 no ticket'); confere('compra antiga no Ticket/VA não desconta do novo saldo', CC.saldoTicket(e, e.tickets[0].id), 800); }
{ const e = novo(); delete e.tickets; delete e.recargas; fala(e, 'caiu 800 no ticket'); fala(e, 'mercado 100 no ticket'); confere('backup antigo, sem ticket, funciona', CC.saldoTicket(e, e.tickets[0].id), 700); }
{ const a = novo(), b = JSON.parse(JSON.stringify(a)); fala(a, 'caiu 100 no ticket'); fala(b, 'caiu 300 no ticket');
  const m = CC.mesclar(a, b); confere('dois aparelhos: não duplica o cartão e não perde crédito', [m.tickets.length, CC.saldoTicket(m, m.tickets[0].id)], [1, 400]);
  const v = CC.mesclar(m, { lancamentos: [], excluidos: [] }); confere('mesclagem mantém o ticket', v.recargas.length, 2); }
{ const e = novo(); fala(e, 'caiu 800 no ticket'); fala(e, 'gastei 50 no mercado no ticket'); const id = e.tickets[0].id; CC.excluirTicket(e, id);
  confere('excluir o cartão tira os créditos e mantém as compras fora do mês', [e.tickets.length, e.recargas.length, e.lancamentos.length, CC.resumoMes(e, '2026-11').gastoTotal], [0, 0, 1, 0]);
  fala(e, 'caiu 90 no ticket'); const m = CC.mesclar(e, JSON.parse(JSON.stringify(e))); confere('depois de excluído, um novo cartão sobrevive à sincronização', [m.tickets.length, CC.saldoTicket(m, m.tickets[0].id)], [1, 90]); }
{ const e = novo(); const va = CC.garantirTicket(e, { nome: 'Vale Alimentação' }), vr = CC.garantirTicket(e, { nome: 'Vale Refeição' }), cj = CC.garantirTicket(e, { nome: 'Caju' });
  fala(e, 'caiu 500 no vale alimentação'); fala(e, 'caiu 400 no vale refeição'); fala(e, 'caiu 300 no caju'); fala(e, 'almoço 40 no vr'); fala(e, 'mercado 60 no va'); fala(e, 'padaria 10 com o caju');
  confere('cada frase vai para o cartão certo', [va, vr, cj].map((c) => CC.saldoTicket(e, c.id)), [440, 360, 290]);
  fala(e, 'comprei caju 5'); confere('fruta não é o cartão Caju', CC.saldoTicket(e, cj.id), 290);
  confere('saldo genérico mostra todos', fala(e, 'saldo do ticket').msg.split('🎟️').length, 4); }
{ const e = novo(); fala(e, 'caiu 800 no ticket'); fala(e, 'gastei 50 no mercado no ticket'); const x = CC.extratoTicket(e, e.tickets[0].id, '2026-11'); confere('extrato traz crédito e compra', x.map((m) => m.tipo).sort(), ['compra', 'credito']); confere('extrato de outro mês vazio', CC.extratoTicket(e, e.tickets[0].id, '2026-12').length, 0); }
// ---------------------------------------------------------------- primeiro acesso
{ const e = CC.marcarPrimeiroAcesso(novo());
  confere('conta nova tem guia e primeiros passos', [e.perfil.guiaTour, e.perfil.guiaPassos], [true, true]);
  confere('estado vazio não marca nada: conta antiga não vê o guia', [CC.estadoVazio().perfil.guiaTour, CC.estadoVazio().perfil.guiaPassos], [undefined, undefined]);
  confere('aparelho novo recebe a marca do servidor', CC.mesclar(CC.estadoVazio(), e).perfil.guiaTour, true);
  const cel = JSON.parse(JSON.stringify(e)); cel.perfil.guiaTour = false; cel.perfilUpd = e.perfilUpd + 1;
  confere('guia visto não volta ao sincronizar', [CC.mesclar(cel, e).perfil.guiaTour, CC.mesclar(e, cel).perfil.guiaTour], [false, false]);
  CC.sanearEstado(e); confere('saneamento mantém a marca', e.perfil.guiaPassos, true); }
// ---------------------------------------------------------------- várias coisas na mesma frase
{ const vale = (f) => (CC.separarLancamentos(f, { hoje: quarta }) || []).map((a) => [a.tipo, a.valor, a.cat]);
  confere('dois gastos com "e"', vale('gastei 50 no mercado e 30 na padaria'), [['gasto', 50, 'Mercado'], ['gasto', 30, 'Padaria']]);
  confere('dois sem verbo', vale('mercado 50 padaria 30'), [['gasto', 50, 'Mercado'], ['gasto', 30, 'Padaria']]);
  confere('vírgula', vale('almoço 40, café 12'), [['gasto', 40, 'Restaurante/Lanche'], ['gasto', 12, 'Restaurante/Lanche']]);
  confere('verbo vale para os dois', vale('paguei 100 de luz e 80 de água'), [['gasto', 100, 'Contas da Casa'], ['gasto', 80, 'Contas da Casa']]);
  confere('três itens', vale('mercado 50, padaria 30 e farmácia 20').length, 3);
  confere('por extenso', vale('gastei cinquenta no mercado e trinta na padaria').map((x) => x[1]), [50, 30]);
  confere('duas entradas', vale('recebi 100 do João e 200 da Maria').map((x) => x[0]), ['entrada', 'entrada']);
  for (const f of ['gastei 2 mil e 500 na reforma', 'gastei 52 e 90 no mercado', '45 reais e 90 centavos no mercado', 'abasteci 40 litros 230', 'almoço para 3 pessoas 120', 'comprei 2 camisas por 100', 'comprei 3 pizzas 90', 'gastei 200 em 2 pneus', 'gastei 100 com 2 pizzas e 1 refrigerante', 'comprei uma TV de 2000 em 10x e um sofá de 1000', 'pão e leite 15', 'gastei 45,90 no mercado', 'conta de luz vence dia 10, 150 reais', 'guardei 200 para a viagem e 100 na reserva', 'vou gastar 50 no mercado e 30 na padaria']) confere('não separa: ' + f, CC.separarLancamentos(f, { hoje: quarta }), null); }
{ const e = novo(); const r = fala(e, 'ontem gastei 50 no mercado e 30 na padaria no cartão Nubank');
  confere('lança os dois com data e cartão', e.lancamentos.map((l) => [l.valor, l.data, !!l.cartaoId]), [[50, '2026-11-03', true], [30, '2026-11-03', true]]);
  confere('resposta traz o total', r.msg.includes('Total: R$ 80,00'), true);
  const e2 = novo(); fala(e2, 'gastei 50 no mercado e 30 na padaria'); fala(e2, 'desfazer'); confere('desfazer volta os dois', e2.lancamentos.length, 0);
  const e3 = novo(); fala(e3, 'conta de luz vence dia 10, 150 reais'); fala(e3, 'conta de água vence dia 12, 80 reais'); fala(e3, 'paguei 150 de luz e 80 de água'); confere('paguei duas contas', e3.contas.map((c) => !!(c.pagos || {})['2026-11']), [true, true]); }
// ---------------------------------------------------------------- perguntas e conversa
{ const e = novo(); fala(e, 'gastei 100 no mercado'); fala(e, 'gastei 40 na feira'); fala(e, 'almocei 30'); e.lancamentos.push({ id: 'x', tipo: 'gasto', data: '2026-10-01', desc: 'Antigo', cat: 'Mercado', valor: 7, upd: 1 });
  confere('quanto gastei com mercado', fala(e, 'quanto gastei com mercado').msg.includes('R$ 140,00'), true);
  confere('mês passado', fala(e, 'quanto gastei no mercado mês passado').msg.includes('R$ 7,00'), true);
  confere('termo livre', fala(e, 'quanto gastei com feira').msg.includes('Mercado'), true);
  confere('sem gasto', fala(e, 'quanto gastei com academia').msg.includes('Não achei'), true);
  confere('maior gasto', fala(e, 'qual meu maior gasto').msg.includes('Mercado'), true);
  confere('resumo segue igual', [le('quanto gastei').tipo, le('quanto gastei esse mês').tipo], ['resumo', 'resumo']); }
{ const e = novo(); confere('sem renda: pede a renda', fala(e, 'quanto posso gastar hoje').msg.includes('renda'), true); e.perfil.orcamento = 2700; fala(e, 'gastei 100 no mercado');
  const m = fala(e, 'quanto posso gastar hoje').msg; confere('quanto posso gastar por dia', [m.includes('R$ 2.600,00'), m.includes('96,29 por dia'), m.includes('27 dias')], [true, true, true]);
  fala(e, 'gastei 3000 na reforma'); confere('passou do orçamento', fala(e, 'quanto posso gastar').msg.includes('já acabou'), true); }
{ const e = novo(); const r = fala(e, 'comprei pão'); confere('pergunta o valor', [r.msg.includes('Quanto foi'), e.lancamentos.length], [true, 0]); fala(e, '15'); confere('lança com a resposta', e.lancamentos.map((l) => [l.valor, l.cat]), [[15, 'Padaria']]);
  const e2 = novo(); fala(e2, 'gastei'); fala(e2, 'resumo'); confere('pergunta some se mudar de assunto', e2.pendente, undefined); }
for (const f of ['obrigado', 'valeu', 'tudo bem?', 'ok']) confere('conversa: ' + f, le(f).tipo, 'conversa');
confere('tenho que pagar vira conta', [le('tenho que pagar o iptu dia 20, 300 reais').tipo, le('tenho que pagar o iptu dia 20, 300 reais').nome], ['conta', 'Iptu']);
confere('coloquei na poupança é sonho', le('coloquei 300 na poupança').tipo, 'sonho');
confere('coloquei gasolina segue gasto', le('coloquei 100 de gasolina').tipo, 'gasto');
// ---------------------------------------------------------------- dados entre aparelhos
{ const srv = novo(); const cel = JSON.parse(JSON.stringify(srv)); fala(cel, 'guardei 100 na reserva de emergência'); fala(srv, 'guardei 300 na reserva de emergência');
  const m = CC.mesclar(cel, srv); confere('dinheiro guardado em dois aparelhos soma', CC.totalSonho(m.sonhos[0]), 400);
  fala(m, 'desfazer'); const velho = JSON.parse(JSON.stringify(srv)); velho.excluidos = []; const m2 = CC.mesclar(m, velho); confere('desfazer não volta de outro aparelho', CC.totalSonho(m2.sonhos[0]), m.sonhos[0].aportes.reduce((a, b) => a + b.valor, 0)); }
{ const e = novo(); e.perfil.saldoInicial = 0; fala(e, 'conta de luz vence dia 10, 100 reais', new Date(2026, 7, 1)); fala(e, 'recebi 1000 de salário', new Date(2026, 7, 5)); fala(e, 'recebi 1000 de salário', new Date(2026, 9, 5));
  confere('saldo acumulado conta mês sem lançamento', CC.resumoMes(e, '2026-10').saldoAcum, 1700); }
{ const e = novo(); fala(e, 'recebi 1000 de salário'); fala(e, 'gastei 100 no mercado no cartão nubank'); fala(e, 'paguei a fatura do nubank'); confere('fatura paga sai no mês do pagamento', CC.resumoMes(e, CC.mesDe(CC.iso(new Date()))).jaSaiu, 100); }
{ const e = novo(); e.perfil = null; e.lancamentos = 'x'; e.categorias = null; e.sonhos = [null, 5, { id: 's', nome: 'A', emoji: '<img>', aportes: 'q' }]; e.agenda = [{ id: 'a', titulo: 't', data: 5, hora: '<b>' }]; e.cartoes = [{ id: 'c', nome: 'n', cor: 'red"' }]; e.perfilUpd = 9e15;
  CC.sanearEstado(e); confere('dado forjado vira dado seguro', [typeof e.perfil.nome, e.lancamentos, e.categorias.length > 5, e.sonhos.length, e.sonhos[0].emoji, e.sonhos[0].aportes, e.agenda[0].hora, /^\d{4}-/.test(e.agenda[0].data), e.cartoes[0].cor, e.perfilUpd < 9e15], ['string', [], true, 1, 'img', [], '', true, '#1B3A6B', true]); }
// ---------------------------------------------------------------- frases do guia continuam funcionando
{ const e = novo(); for (const f of ['gastei 45,90 no mercado', 'gastei 10 na lanchonete no cartão de crédito Itaú', 'comprei uma TV de 2000 em 10x no cartão Nubank', 'a fatura do Itaú vence dia 10 e fecha dia 3', 'quanto está a fatura do Itaú', 'paguei a fatura do Itaú', 'paguei 130 de luz', 'recebi 5000 de salário', 'conta de água vence dia 17, 90 reais', 'dentista quinta às 14h', 'guardei 200 para a viagem', 'transfere 100 da viagem para a reserva', 'exclui o gasto de 45,90', 'sim', 'desfazer', 'resumo', 'contas a pagar', 'agenda']) { const r = fala(e, f); if (!r.ok && !r.pergunta) { falhas++; console.log('❌ guia: ' + f + ' → ' + r.msg); } else ok++; } }

// ---------------------------------------------------------------- 1.12: parcelada ligada ao cartão depois
{ const hoje5 = new Date(2026, 10, 5, 22, 0);
  const montar = () => { const e = novo(); e.cartoes.push({ id: 'i', nome: 'Itaú', cor: '#EC7000', diaVenc: 10, fechamento: 3, limite: 0, faturas: {} });
    e.lancamentos.push({ id: 'g1', tipo: 'gasto', valor: 120, data: '2026-11-02', cat: 'Mercado', desc: 'Mercado', cartaoId: 'i', pagamento: 'Cartão' });
    e.parcelados.push({ id: 'p1', desc: 'TV', cat: 'Casa', valor: 200, n: 10, inicio: '2026-07', upd: new Date(2026, 6, 10).getTime() }); return e; };
  const sit = (e) => ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'].map((ym) => { const f = CC.fatura(e, 'i', ym, hoje5); return f.situacao + ':' + f.total; });
  { const e = montar(); CC.ligarCartaoParcelado(e, e.parcelados[0], 'i', hoje5);
    confere('ligar parcelada antiga não cria fatura vencida', sit(e), ['vazia:0', 'vazia:0', 'vazia:0', 'vazia:0', 'aberta:320', 'aberta:200']);
    confere('cartão mostra a fatura de novembro', CC.faturaDaVez(e, e.cartoes[0], hoje5), '2026-11');
    confere('parcela de novembro é a 5ª', CC.fatura(e, 'i', '2026-11', hoje5).parcelas.map((x) => x.k), [5]);
    confere('resumo do mês continua contando a parcela', CC.resumoMes(e, '2026-09').parcelas, 200); }
  { const e = montar(); e.parcelados[0].cartaoId = 'i'; e.parcelados[0].upd = hoje5.getTime();
    confere('dados já salvos (ligados hoje, sem registro) se corrigem sozinhos', sit(e).slice(2, 5), ['vazia:0', 'vazia:0', 'aberta:320']);
    CC.sanearEstado(e); confere('servidor grava a partir de qual fatura', e.parcelados[0].cartaoDesde, '2026-11'); }
  { const e = montar(); e.parcelados[0].cartaoId = 'i'; e.parcelados[0].upd = new Date(2026, 6, 1).getTime();
    confere('parcelada ligada desde a compra continua igual', sit(e).slice(0, 2), ['vencida:200', 'vencida:200']); }
  { const e = montar(); const p = e.parcelados[0]; CC.ligarCartaoParcelado(e, p, 'i', hoje5); CC.ligarCartaoParcelado(e, p, 'i', new Date(2026, 11, 20));
    confere('editar sem trocar o cartão não muda nada', p.cartaoDesde, '2026-11');
    CC.ligarCartaoParcelado(e, p, '', hoje5); confere('tirar o cartão limpa o registro', [p.cartaoId, p.cartaoDesde], [undefined, undefined]); }
  { const e = montar(); e.cartoes.push({ id: 'n', nome: 'Nubank', cor: '#820AD1', diaVenc: 15, fechamento: 8, limite: 0, faturas: {} });
    const p = e.parcelados[0]; CC.ligarCartaoParcelado(e, p, 'i', hoje5); CC.ligarCartaoParcelado(e, p, 'n', new Date(2026, 10, 20));
    confere('trocar de cartão passa a valer da próxima fatura em aberto', [p.cartaoId, p.cartaoDesde], ['n', '2026-12']); }
  { const e = novo(); fala(e, 'comprei uma TV de 2000 em 10x no cartão Nubank', hoje5); const p = e.parcelados[0], c = e.cartoes[0];
    confere('compra nova por voz entra na fatura certa', [!!p.cartaoDesde, CC.fatura(e, c.id, p.inicio, hoje5).parcelas.length], [true, 1]); }
  { const e = montar(); const p = e.parcelados[0]; p.cartaoId = 'i'; p.cartaoDesde = '<script>'; CC.sanearEstado(e);
    confere('registro inválido é refeito', /^\d{4}-\d{2}$/.test(p.cartaoDesde), true); }
}

console.log(`\n${falhas ? '⚠️' : '✅'} ${ok} testes passaram, ${falhas} falharam.`);
process.exit(falhas ? 1 : 0);
