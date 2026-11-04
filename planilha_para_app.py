"""Converte a Planilha dos Sonhos (.xlsx) para um backup do Sonhaí (.json)."""
import openpyxl, sys, json, time, random, string, datetime as dt, subprocess
src, out = sys.argv[1], sys.argv[2]
wb = openpyxl.load_workbook(src, data_only=True)
uid = lambda: hex(int(time.time()*1000))[2:] + ''.join(random.choices(string.ascii_lowercase+string.digits, k=6))
now = int(time.time()*1000)
base = json.loads(subprocess.check_output(['node', '-e', "console.log(JSON.stringify(require('/home/claude/sonhai/public/core.js').estadoVazio()))"]))
CATS = [c['nome'] for c in base['categorias']]
def cat(c):
    if not c: return 'Contas da Casa'
    for n in CATS:
        if n.lower() == str(c).strip().lower(): return n
    return 'Outros'
ws = wb['Nov-26']; ym = '2026-11'
s = base; s['perfil']['nome'] = wb['Início']['C4'].value or 'Rodrigo e Aline'
s['perfil']['saldoInicial'] = 0; s['perfilUpd'] = now
for i, r in enumerate(range(30, 38)):
    d, tipo, v = ws[f'C{r}'].value, ws[f'D{r}'].value, ws[f'E{r}'].value
    if v: s['lancamentos'].append(dict(id=uid(), tipo='entrada', data=f'{ym}-{min(i+1,28):02d}', desc=d, cat=tipo or 'Outra renda', valor=round(v,2), pago=True, origem='planilha', upd=now))
for r in range(42, 62):
    d, nome, c, v, pg = (ws[f'{k}{r}'].value for k in 'BCDEF')
    if not nome: continue
    s['contas'].append(dict(id=uid(), nome=nome[0].upper()+nome[1:], cat=cat(c), valor=round(v or 0,2), dia=int(d) if d else 1, recorrente=True, pagos=({ym: True} if pg == 'Sim' else {}), origem='planilha', upd=now))
for r in range(66, 200):
    d, desc, c, v, pg = (ws[f'{k}{r}'].value for k in 'BCDEF')
    if isinstance(d, str) and d.startswith('Total'): break
    if v in (None, 0) or not desc or not isinstance(v, (int, float)): continue
    if isinstance(d, dt.datetime) and d.strftime('%Y-%m') < ym:
        data = f'{ym}-01'; desc = f'{desc} (compra {d:%d/%m})'
    else: data = d.strftime('%Y-%m-%d') if isinstance(d, dt.datetime) else f'{ym}-01'
    s['lancamentos'].append(dict(id=uid(), tipo='gasto', data=data, desc=desc, cat=cat(c), valor=round(v,2), pago=pg != 'Não', origem='planilha', upd=now))
MES = {m:i+1 for i,m in enumerate(['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'])}
wp = wb['Parcelados']
for r in range(5, 60):
    desc, c, v, n, ini = (wp[f'{k}{r}'].value for k in 'BCDEF')
    if not desc or not v: continue
    if not isinstance(v, (int, float)) or not n: continue
    if isinstance(ini, dt.datetime): inicio = ini.strftime('%Y-%m')
    elif '/' in str(ini): m, y = str(ini).split('/'); inicio = f'{y}-{MES[m[:3].title()]:02d}'
    else: continue
    s['parcelados'].append(dict(id=uid(), desc=desc, cat=cat(c), valor=round(v,2), n=int(n), inicio=inicio, origem='planilha', upd=now))
wa = wb['Gastos do Ano']; MESL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
for r in range(5, 30):
    nome, c, v, m = (wa[f'{k}{r}'].value for k in 'BCDE')
    if nome and v and m in MESL: s['anuais'].append(dict(id=uid(), nome=nome, cat=cat(c), valor=round(v,2), mes=MESL.index(m)+1, upd=now))
wsn = wb['Meus Sonhos']; EMO = {'viagem':'✈️','apto':'🏠','casa':'🛋️','carro':'🚗','poupan':'💰','invest':'📈','caixinha':'📦','reserva':'🛟'}
s['sonhos'] = []
for r in range(6, 20):
    nome, custo, prazo, antes = (wsn[f'{k}{r}'].value for k in 'BCDE')
    if nome == 'TOTAL': break
    if not nome: continue
    p = ''
    if prazo and '/' in str(prazo): m, y = str(prazo).split('/'); p = f'{y}-{MES[m]:02d}'
    s['sonhos'].append(dict(id=uid(), nome=nome[0].upper()+nome[1:], emoji=next((e for k,e in EMO.items() if k in nome.lower()), '⭐'), custo=custo or 0, prazo=p, guardadoAntes=antes or 0, aportes=[], upd=now))
for r in range(18, 25):
    nome, v = ws[f'C{r}'].value, ws[f'E{r}'].value
    if nome and v and isinstance(v, (int, float)):
        for sn in s['sonhos']:
            if sn['nome'].lower() == str(nome).lower(): sn['aportes'].append(dict(id=uid(), data=f'{ym}-05', valor=round(v,2)))
json.dump(s, open(out, 'w'), ensure_ascii=False)
print(len(s['lancamentos']), 'lançamentos', len(s['contas']), 'contas', len(s['parcelados']), 'parcelados', len(s['anuais']), 'anuais', len(s['sonhos']), 'sonhos')
