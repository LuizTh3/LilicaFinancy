import fs from 'node:fs'
import crypto from 'node:crypto'

const dir = new URL('../specs/007-compras-cartao-parceladas/', import.meta.url)
const time = '2026-11-01T12:00:00Z', old = '2020-01-01T00:00:00Z'
const path = (c, id) => `/databases/(default)/documents/users/fixture/${c}/${id}`
const mock = (name, p, value) => ({ function: name, args: [{ exactValue: p.replace('(default)', '%28default%29') }], result: { value } })
const profile = { uid: 'fixture', schemaVersion: 1, primeiro_login: false, timezone: 'America/Rio_Branco', passwordChangeCompletedAt: old }
const card = { schemaVersion: 1, version: 1, banco: 'Fixture', nome: 'Fixture', titularId: 'holder', diaFechamento: 10, diaVencimento: 17, estado: 'ativo', ultimoEventoId: 'criarCartao__prior', createdAt: old, updatedAt: old }
const cat = { schemaVersion: 2, version: 1, nome: 'Fixture', natureza: 'despesa', estado: 'ativo', createdAt: old, updatedAt: old }
const witness = { eventoId: 'criarDespesa__prior', origemId: 'prior', papel: 'classificacao', createdAt: old }
const clone = v => structuredClone(v)
const month = (start, offset) => { const [y, m] = start.split('-').map(Number), index = y * 12 + m - 1 + offset; return `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}` }
const date = (m, day) => `${m}-${String(day).padStart(2, '0')}`
const calendar = mes => ({ cartaoId: 'card', competencia: mes, inicio: date(month(mes, -1), 10), fechamento: date(mes, 10), vencimento: date(mes, 17), calendarioOrigem: { calendarVersion: 2, cartaoVersion: 1, diaFechamento: 10, diaVencimento: 17, vencimentoOriginal: date(mes, 17), origemInicio: 'padrao', origemFechamento: 'padrao' } })
const empty = (mes, instant = old, key = 'prior') => ({ ...calendar(mes), schemaVersion: 1, versaoConteudo: 4, version: 1, ultimoEventoId: `confirmarFatura__${key}`, createdAt: instant, updatedAt: instant, conteudo: { schemaVersion: 2, version: 1, exigivelCentavos: 0, liquidadoLiquidoCentavos: 0, possuiHistoricoPagamento: false, revisaoEstado: 'normal', ultimoEventoTipo: 'confirmarFatura', ultimoEventoId: `confirmarFatura__${key}`, createdAt: instant, updatedAt: instant } })
function make(n = 3, labels = [], firstUse = false) {
  const event = 'criarCompra__intent', parcelas = {}, faturas = {}, before = {}, after = {}
  for (let i = 1; i <= n; i++) {
    const mes = month('2026-11', i - 1), id = `card__${mes}`, valor = Math.floor(10000 / n) + (i <= 10000 % n ? 1 : 0)
    parcelas[`p${String(i).padStart(2, '0')}`] = { numero: i, quantidadeOriginal: n, valorCentavos: valor, competenciaFatura: mes, faturaId: id, capacidade: { schemaVersion: 1, valorOriginalCentavos: valor, correcaoAcrescimosCentavos: 0, correcaoReducoesCentavos: 0, devolvidoCentavos: 0, categoriaEfetivaId: 'cat' } }
    before[id] = empty(mes)
    after[id] = { ...clone(before[id]), conteudo: { ...clone(before[id].conteudo), version: 2, exigivelCentavos: valor, ultimoEventoTipo: 'criarCompra', ultimoEventoId: event, ultimoEventoOrigemId: 'buy', updatedAt: time } }
    faturas[id] = { calendarioVersion: 1, expectedVersion: 1, resultVersion: 2, deltaCentavos: valor }
  }
  const imagem = { cartaoId: 'card', descricao: 'Compra fictícia100/3', dataCompra: '2026-11-01', categoriaId: 'cat', etiquetaIds: labels, valorTotalCentavos: 10000, quantidadeParcelas: n, primeiraCompetenciaFatura: '2026-11', schemaVersion: 2, version: 1, cronogramaRevision: 1, primeiraFaturaEscolha: 'sugerida', parcelas, competenciasFaturas: Object.values(parcelas).map(p => p.competenciaFatura), estadoObrigacao: 'ativa' }
  const comando = { tipo: 'criarCompra', eventoId: event, cartaoVersion: 1, expectedVersion: 0, resultVersion: 1, antes: null, depois: clone(imagem), faturas }
  const compra = { ...clone(imagem), ultimoEventoId: event, createdAt: time, updatedAt: time, comandoAtual: comando }
  const receipt = { schemaVersion: 1, contractVersion: 1, tipo: 'criarCompra', operationKey: 'intent', compraId: 'buy', comando: clone(comando), createdAt: time }
  return { compra, receipt, before, after, categoria: { ...clone(cat), usoFinanceiro: firstUse ? { ...witness, eventoId: event, origemId: 'buy', createdAt: time } : clone(witness) } }
}
const cases = []
function mocks(o) {
  return [mock('get', '/databases/(default)/documents/users/fixture', { data: profile }), mock('getAfter', path('cartoes', 'card'), { data: card }), mock('getAfter', path('categorias', 'cat'), { data: o.categoria }), mock('getAfter', path('compras', 'buy'), { data: o.compra }), mock('getAfter', path('compras', 'other'), null), mock('getAfter', path('operacoesCompras', 'criarCompra__intent'), { data: o.receipt }), ...Object.entries(o.after).map(([id, data]) => mock('getAfter', path('faturas', id), { data })), ...Array.from({ length: 5 }, (_, i) => mock('getAfter', path('etiquetas', `label${i}`), { data: { schemaVersion: 1, version: 1, nome: 'Fixture', estado: 'ativo', createdAt: old, updatedAt: old } }))]
}
function add(name, c, id, method, data, before, functions, allow = true, auth = { uid: 'fixture', token: { auth_time: Date.parse(time) / 1000 } }) {
  cases.push({ name, test: { expectation: allow ? 'ALLOW' : 'DENY', request: { path: path(c, id), method, ...(auth ? { auth } : {}), time, ...(data ? { resource: { data } } : {}) }, ...(before ? { resource: { data: before } } : {}), functionMocks: functions, expressionReportLevel: 'FULL' } })
}
function pair(prefix, o) {
  const m = mocks(o)
  add(`${prefix}Purchase`, 'compras', 'buy', 'create', o.compra, undefined, m)
  add(`${prefix}Receipt`, 'operacoesCompras', 'criarCompra__intent', 'create', o.receipt, undefined, m)
  Object.entries(o.after).forEach(([id, data], i) => add(`${prefix}Invoice${i + 1}`, 'faturas', id, 'update', data, o.before[id], m))
  if (o.categoria.usoFinanceiro.eventoId === 'criarCompra__intent') add(`${prefix}Category`, 'categorias', 'cat', 'update', o.categoria, cat, m)
}
pair('create100by3', make())
pair('createTwoFirstCategory', make(2, [], true))
pair('createOneFiveLabelsFirstCategory', make(1, Array.from({ length: 5 }, (_, i) => `label${i}`), true))
pair('createThreeTwoLabels', make(3, ['label0', 'label1']))
const maximum = make()
maximum.compra.valorTotalCentavos = Number.MAX_SAFE_INTEGER
for (const p of Object.values(maximum.compra.parcelas)) {
  const v = Number(BigInt(Number.MAX_SAFE_INTEGER) / 3n + (BigInt(p.numero) <= BigInt(Number.MAX_SAFE_INTEGER) % 3n ? 1n : 0n))
  p.valorCentavos = v; p.capacidade.valorOriginalCentavos = v
  maximum.compra.comandoAtual.faturas[p.faturaId].deltaCentavos = v
  maximum.after[p.faturaId].conteudo.exigivelCentavos = v
}
maximum.compra.comandoAtual.depois = Object.fromEntries(Object.entries(clone(maximum.compra)).filter(([k]) => !['ultimoEventoId', 'createdAt', 'updatedAt', 'comandoAtual'].includes(k)))
maximum.receipt.comando = clone(maximum.compra.comandoAtual)
pair('maximumSafeMoneyThree', maximum)
function denyPurchase(name, change, responsible = 'compras') {
  const o = make(); change(o)
  const id = 'card__2026-11'
  if (responsible === 'faturas') add(name, 'faturas', id, 'update', o.after[id], o.before[id], mocks(o), false)
  else if (responsible === 'operacoesCompras') add(name, 'operacoesCompras', 'criarCompra__intent', 'create', o.receipt, undefined, mocks(o), false)
  else add(name, 'compras', 'buy', 'create', o.compra, undefined, mocks(o), false)
}
denyPurchase('missingReceipt', o => { o.receipt = null })
denyPurchase('receiptOtherPurchase', o => { o.receipt.compraId = 'other' })
denyPurchase('receiptDifferentCommand', o => { o.receipt.comando.cartaoVersion = 99 })
denyPurchase('wrongRemainder', o => { o.compra.parcelas.p01.valorCentavos = 3333 }, 'faturas')
denyPurchase('missingPosition', o => { delete o.compra.parcelas.p02 })
denyPurchase('extraOriginalCapital', o => { o.compra.capitalEmprestimo = 100000 })
denyPurchase('injectedOwner', o => { o.compra.uid = 'other' })
denyPurchase('fractionalMoney', o => { o.compra.valorTotalCentavos = 1.5 })
denyPurchase('fakeCapacity', o => { o.compra.parcelas.p01.capacidade.valorOriginalCentavos = 9999 }, 'faturas')
denyPurchase('missingCapacity', o => { delete o.compra.parcelas.p01.capacidade }, 'faturas')
denyPurchase('wrongIndex', o => { o.compra.competenciasFaturas = ['2026-11'] })
denyPurchase('wrongCommandImage', o => { o.compra.comandoAtual.depois.descricao = 'Outra'; o.receipt.comando = clone(o.compra.comandoAtual) }, 'operacoesCompras')
denyPurchase('recursiveImage', o => { o.compra.comandoAtual.depois.comandoAtual = {}; o.receipt.comando = clone(o.compra.comandoAtual) }, 'operacoesCompras')
denyPurchase('staleCard', o => { o.compra.comandoAtual.cartaoVersion = 2; o.receipt.comando = clone(o.compra.comandoAtual) })
denyPurchase('missingInvoiceTransition', o => { delete o.compra.comandoAtual.faturas['card__2026-12']; o.receipt.comando = clone(o.compra.comandoAtual) })
denyPurchase('missingSecondInvoiceWrite', o => { o.after['card__2026-12'] = clone(o.before['card__2026-12']) })
denyPurchase('categoryArchived', o => { o.categoria.estado = 'arquivado'; o.categoria.archivedAt = old })
denyPurchase('categoryIncome', o => { o.categoria.natureza = 'receita' })
denyPurchase('missingCategoryWitness', o => { delete o.categoria.usoFinanceiro })
denyPurchase('firstUseThreeExceeds18', o => { o.categoria.usoFinanceiro = { ...witness, eventoId: 'criarCompra__intent', origemId: 'buy', createdAt: time } })
for (const [name, n, labels] of [['fourDestinations', 4, []], ['threeWithThreeLabels', 3, ['label0', 'label1', 'label2']]]) {
  const o = make(n, labels)
  add(name, 'compras', 'buy', 'create', o.compra, undefined, mocks(o), false)
}
const core = make(), m = mocks(core), id = 'card__2026-11'
for (const [name, patch] of [['resetHistory', { possuiHistoricoPagamento: true }], ['inventedPaid', { liquidadoLiquidoCentavos: 1 }], ['wrongDelta', { exigivelCentavos: 3333 }], ['wrongVersion', { version: 3 }], ['resetCreatedAt', { createdAt: time }], ['wrongOrigin', { ultimoEventoOrigemId: 'other' }]]) {
  add(name, 'faturas', id, 'update', { ...core.after[id], conteudo: { ...core.after[id].conteudo, ...patch } }, core.before[id], m, false)
}
add('financialWriteChangesCalendar', 'faturas', id, 'update', { ...core.after[id], version: 2 }, core.before[id], m, false)
add('historyCannotResetAfterReversal', 'faturas', id, 'update', core.after[id], { ...core.before[id], conteudo: { ...core.before[id].conteudo, possuiHistoricoPagamento: true } }, m, false)
const staleCalendar = make(); staleCalendar.compra.comandoAtual.faturas[id].calendarioVersion = 2; staleCalendar.receipt.comando = clone(staleCalendar.compra.comandoAtual)
add('staleCalendarVersion', 'faturas', id, 'update', staleCalendar.after[id], staleCalendar.before[id], mocks(staleCalendar), false)
const legacy = clone(core.before[id]); delete legacy.conteudo; legacy.versaoConteudo = 1
add('legacyInitializationDenied', 'faturas', id, 'update', core.after[id], legacy, m, false)
add('purchaseEditDenied', 'compras', 'buy', 'update', core.compra, core.compra, m, false)
add('purchaseDeleteDenied', 'compras', 'buy', 'delete', undefined, core.compra, m, false)
add('receiptDeleteDenied', 'operacoesCompras', 'criarCompra__intent', 'delete', undefined, core.receipt, m, false)
add('oldPhysicalPositionDenied', 'parcelasCartao', 'buy__r1__n1', 'create', core.compra.parcelas.p01, undefined, m, false)
add('oldSeparateControlDenied', 'controlesFaturas', id, 'create', core.before[id].conteudo, undefined, m, false)
for (const [name, auth, pending] of [['visitor', null, false], ['otherUid', { uid: 'other', token: { auth_time: Date.parse(time) / 1000 } }, false], ['pending', undefined, true]]) {
  const functions = pending ? m.map(v => v.function === 'get' && v.args[0].exactValue.endsWith('/users/fixture') ? mock('get', '/databases/(default)/documents/users/fixture', { data: { ...profile, primeiro_login: true } }) : v) : m
  add(`${name}Receipt`, 'operacoesCompras', 'criarCompra__intent', 'create', core.receipt, undefined, functions, false, auth)
}
const fresh = empty('2026-11', time, 'newCalendar'), b = calendar('2026-11')
const r = { schemaVersion: 1, contractVersion: 1, operationKey: 'newCalendar', tipo: 'confirmarFatura', alvoId: id, expectedVersion: 0, resultVersion: 1, comando: { contractVersion: 1, tipo: 'confirmarFatura', operationKey: 'newCalendar', alvoId: id, expectedVersion: 0, payload: { ...b, cartaoVersion: 1 } }, resultado: b, createdAt: time }
const freshMocks = [mock('get', '/databases/(default)/documents/users/fixture', { data: profile }), mock('getAfter', path('cartoes', 'card'), { data: card }), mock('getAfter', path('faturas', id), { data: fresh }), mock('getAfter', path('operacoesFaturas', 'confirmarFatura__newCalendar'), { data: r }), ...[-2, -1, 1, 2].map(n => mock('get', path('faturas', `card__${month('2026-11', n)}`), null))]
add('freshEmptyV4Calendar', 'faturas', id, 'create', fresh, undefined, freshMocks)
add('freshEmptyV4Receipt', 'operacoesFaturas', 'confirmarFatura__newCalendar', 'create', r, undefined, freshMocks)
const badFresh = { ...fresh, conteudo: { ...fresh.conteudo, exigivelCentavos: 1 } }
add('freshCalendarNonzeroDenied', 'operacoesFaturas', 'confirmarFatura__newCalendar', 'create', r, undefined, freshMocks.map(m => m.function === 'getAfter' && m.args[0].exactValue.endsWith(`/faturas/${id}`) ? mock('getAfter', path('faturas', id), { data: badFresh }) : m), false)
const maxFresh = clone(fresh), maxReceipt = clone(r), maxEvent = 'confirmarFatura__maximumNew'
maxFresh.ultimoEventoId = maxEvent; maxFresh.conteudo.ultimoEventoId = maxEvent
Object.assign(maxFresh.calendarioOrigem, { origemInicio: 'vizinhoConfirmado', origemFechamento: 'vizinhoConfirmado' })
maxReceipt.operationKey = 'maximumNew'; maxReceipt.comando.operationKey = 'maximumNew'
maxReceipt.resultado.calendarioOrigem = clone(maxFresh.calendarioOrigem)
maxReceipt.comando.payload.calendarioOrigem = clone(maxFresh.calendarioOrigem)
const maximumMocks = [mock('get', '/databases/(default)/documents/users/fixture', { data: profile }), mock('getAfter', path('cartoes', 'card'), { data: card }), mock('getAfter', path('faturas', id), { data: maxFresh }), mock('getAfter', path('operacoesFaturas', maxEvent), { data: maxReceipt }), ...[-2, -1, 1, 2].map(n => mock('get', path('faturas', `card__${month('2026-11', n)}`), { data: empty(month('2026-11', n)) }))]
add('freshEmptyV4Maximum', 'faturas', id, 'create', maxFresh, undefined, maximumMocks)
add('freshEmptyV4MaximumReceipt', 'operacoesFaturas', maxEvent, 'create', maxReceipt, undefined, maximumMocks)
const legacySuite = JSON.parse(fs.readFileSync(new URL('../006-cartoes-ciclos-faturas/rules-evaluation-cases.json', dir), 'utf8'))
for (const item of legacySuite.cases) {
  const copy = clone(item)
  if (item.name === 'creationWrongEvent') copy.test.functionMocks.push(mock('getAfter', path('operacoesFaturas', 'confirmarFatura__another'), null))
  cases.push({ ...copy, name: `regression006_${item.name}` })
}
const suite = { schemaVersion: 1, purpose: 'Synthetic candidate evaluation only. No deployment, migration or real financial records.', cases }
fs.writeFileSync(new URL('finite-rules-evaluation-cases.json', dir), JSON.stringify(suite, null, 2) + '\n')
const source = fs.readFileSync(new URL('firestore-compras-finite.candidate.rules', dir), 'utf8')
const manifestFile = new URL('finite-candidate-manifest.json', dir), manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
manifest.candidateSha256 = crypto.createHash('sha256').update(source).digest('hex')
manifest.suiteSha256 = crypto.createHash('sha256').update(JSON.stringify(suite)).digest('hex')
manifest.cases = cases.length
manifest.allow = cases.filter(c => c.test.expectation === 'ALLOW').length
manifest.deny = cases.length - manifest.allow
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n')
process.stdout.write(JSON.stringify({ cases: manifest.cases, allow: manifest.allow, deny: manifest.deny, network: false }) + '\n')
