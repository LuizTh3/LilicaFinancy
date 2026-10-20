import fs from 'node:fs';
const out = new URL('../specs/010-recorrencias-mensais/', import.meta.url);
const time = '2026-10-20T18:00:00Z', old = '2020-01-01T00:00:00Z';
const clone = value => structuredClone(value);
const path = (collection, id) => `/databases/(default)/documents/users/fixture/${collection}${id ? '/' + id : ''}`;
const mock = (fn, p, value) => ({ function: fn, args: [{ exactValue: p.replace('(default)', '%28default%29') }], result: { value } });
const profile = { uid: 'fixture', schemaVersion: 1, timezone: 'America/Rio_Branco', primeiro_login: false, passwordChangeCompletedAt: old };
const catalog = nature => ({ schemaVersion: 2, version: 1, nome: 'Fixture', estado: 'ativo', createdAt: old, updatedAt: old, ...(nature ? { natureza: nature } : {}), usoFinanceiro: { eventoId: nature ? 'criarDespesa__past' : 'pagar__past', origemId: 'past', papel: nature ? 'classificacao' : 'movimentacao', createdAt: old } });
const baseMocks = [mock('get', '/databases/(default)/documents/users/fixture', { data: profile }), mock('getAfter', path('categorias', 'cat'), { data: catalog('despesa') }), mock('getAfter', path('categorias', 'income'), { data: { ...catalog('receita'), usoFinanceiro: { ...catalog('receita').usoFinanceiro, eventoId: 'criarReceita__past' } } }), mock('getAfter', path('contas', 'account'), { data: { ...catalog(), tipo: 'banco' } }), mock('getAfter', path('cartoes', 'card'), { data: { schemaVersion: 1, version: 1, estado: 'ativo' } })];
const fatura = { cartaoId: 'card', competencia: '2026-11', inicio: '2026-10-10', fechamento: '2026-11-10', vencimento: '2026-11-17', calendarioOrigem: { calendarVersion: 2, cartaoVersion: 1, diaFechamento: 10, diaVencimento: 17, vencimentoOriginal: '2026-11-17', origemInicio: 'padrao', origemFechamento: 'padrao' }, schemaVersion: 1, versaoConteudo: 1, version: 1, ultimoEventoId: 'confirmarFatura__past', createdAt: old, updatedAt: old };
const fid = 'card__2026-11';
const control = { schemaVersion: 2, faturaId: fid, cartaoId: 'card', competencia: '2026-11', calendarioVersion: 1, version: 1, exigivelCentavos: 0, liquidadoLiquidoCentavos: 0, possuiHistoricoPagamento: false, revisaoEstado: 'normal', ultimoEventoTipo: 'recInicializarFatura', ultimoEventoId: 'recInicializarFatura__past', createdAt: old, updatedAt: old };
const cases = [];
function add(name, collection, id, method, data, before, mocks = [], allow = true, auth = { uid: 'fixture', token: { auth_time: 1792510000 } }) {
  const unique = [...new Map([...clone(baseMocks), ...clone(mocks)].map(m => [m.function + '|' + m.args[0].exactValue, m])).values()];
  cases.push({ name, test: { expectation: allow ? 'ALLOW' : 'DENY', request: { path: path(collection, id), method, time, ...(auth ? { auth } : {}), ...(data ? { resource: { data } } : {}) }, ...(before ? { resource: { data: before } } : {}), functionMocks: unique, expressionReportLevel: 'FULL' } });
}
function command(type, key, version = 1) {
  return { tipo: type, serieId: 'serie', operationKey: key, expectedVersion: version, ocorrenciaIds: [], ocorrencias: {}, revisoes: {}, referenciasNovas: {}, faturaIds: [], deltasFaturas: {}, versoesFaturas: {} };
}
function revision(nature, stamp = old) {
  return { schemaVersion: 1, serieId: 'serie', inicioMes: '2026-10', version: 1, descricao: 'Mensalidade', categoriaId: nature === 'receitaExterna' ? 'income' : 'cat', valorCentavos: 15000, estimado: true, diaAncora: 5, ...(nature === 'assinaturaCartao' ? { cartaoId: 'card' } : {}), ultimoEventoId: 'recCriarSerie__past', createdAt: stamp, updatedAt: stamp };
}
function series(nature = 'despesaExterna') {
  return { schemaVersion: 1, version: 1, natureza: nature, inicio: '2026-10-01', primeiraRevisaoId: 'serie-202610', estado: 'ativa', ultimoEventoId: 'recCriarSerie__past', comandoAtual: command('recCriarSerie', 'past', 0), createdAt: old, updatedAt: old };
}
function occurrence(nature, stamp = old) {
  const common = { descricao: 'Mensalidade', categoriaId: nature === 'receitaExterna' ? 'income' : 'cat', valorCentavos: 15000, estimado: true };
  const financial = nature === 'assinaturaCartao' ? { ...common, dataCompra: '2026-11-05', cartaoId: 'card', faturaId: fid, competenciaFatura: '2026-11', inicioCiclo: fatura.inicio, fechamentoCiclo: fatura.fechamento } : { ...common, competenciaPlanejamento: '2026-11', liquidadoLiquidoCentavos: 0, jaLiquidada: false, ...(nature === 'receitaExterna' ? { dataPrevista: '2026-11-05' } : { vencimento: '2026-11-05', dataConsumo: '2026-11-05' }) };
  return { schemaVersion: 1, version: 1, serieId: 'serie', mesReferencia: '2026-11', natureza: nature, revisaoId: 'serie-202610', revisaoVersion: 1, estado: 'persistida', excecaoIndividual: false, financeiro: financial, ...(nature === 'assinaturaCartao' ? { capacidadeItem: { schemaVersion: 1, valorOriginalCentavos: 15000, correcaoAcrescimosCentavos: 0, correcaoReducoesCentavos: 0, devolvidoCentavos: 0, categoriaEfetivaId: 'cat' } } : {}), ultimoEventoId: 'recMaterializar__past', createdAt: stamp, updatedAt: stamp };
}
function operation(type, key, nature = 'despesaExterna') {
  const before = series(nature), c = command(type, key), event = type + '__' + key;
  const after = { ...clone(before), version: 2, updatedAt: time, ultimoEventoId: event, comandoAtual: c };
  const receipt = { schemaVersion: 1, contractVersion: 1, tipo: type, operationKey: key, serieId: 'serie', expectedVersion: 1, resultVersion: 2, comando: c, createdAt: time };
  return { before, after, c, event, receipt, extra: [], oldControl: undefined, newControl: undefined };
}
function finalize(op) {
  op.after.comandoAtual = clone(op.c); op.receipt.comando = clone(op.c);
  if (op.c.fato) op.receipt.fato = clone(op.c.fato);
  const mocks = [mock('get', path('seriesRecorrentes', 'serie'), { data: op.before }), mock('getAfter', path('seriesRecorrentes', 'serie'), { data: op.after }), mock('getAfter', path('operacoesRecorrentes', op.event), { data: op.receipt }), mock('get', path('faturas', fid), { data: fatura }), ...op.extra];
  for (const [id, pair] of Object.entries(op.c.revisoes)) {
    mocks.push(mock('get', path('revisoesRecorrentes', id), pair.antes ? { data: pair.antes } : null), mock('getAfter', path('revisoesRecorrentes', id), { data: pair.depois }));
  }
  for (const [id, pair] of Object.entries(op.c.ocorrencias)) {
    mocks.push(mock('get', path('ocorrenciasRecorrentes', id), pair.antes ? { data: pair.antes } : null), mock('getAfter', path('ocorrenciasRecorrentes', id), { data: pair.depois }));
  }
  if (op.oldControl) mocks.push(mock('get', path('controlesFaturas', fid), { data: op.oldControl }));
  if (op.newControl) mocks.push(mock('getAfter', path('controlesFaturas', fid), { data: op.newControl }));
  return [...new Map(mocks.map(m => [m.function + '|' + m.args[0].exactValue, m])).values()];
}
function emit(op, prefix, allow = true) {
  const mocks = finalize(op);
  add(prefix + 'Series', 'seriesRecorrentes', 'serie', op.c.tipo === 'recCriarSerie' ? 'create' : 'update', op.after, op.c.tipo === 'recCriarSerie' ? undefined : op.before, mocks, allow);
  add(prefix + 'Receipt', 'operacoesRecorrentes', op.event, 'create', op.receipt, undefined, mocks, allow);
  for (const [id, pair] of Object.entries(op.c.revisoes)) add(prefix + 'Revision' + id, 'revisoesRecorrentes', id, pair.antes ? 'update' : 'create', pair.depois, pair.antes, mocks, allow);
  for (const [id, pair] of Object.entries(op.c.ocorrencias)) add(prefix + 'Occurrence' + id, 'ocorrenciasRecorrentes', id, pair.antes ? 'update' : 'create', pair.depois, pair.antes, mocks, allow);
  if (op.newControl) add(prefix + 'InvoiceControl', 'controlesFaturas', fid, 'update', op.newControl, op.oldControl, mocks, allow);
  return mocks;
}
function attachCard(op, before, after) {
  const amount = value => value?.estado === 'persistida' ? value.financeiro.valorCentavos : 0;
  op.oldControl = { ...clone(control), exigivelCentavos: amount(before) };
  op.newControl = { ...clone(op.oldControl), version: 2, exigivelCentavos: amount(after), ultimoEventoId: op.event, ultimoEventoTipo: op.c.tipo, updatedAt: time };
  Object.assign(op.c, { faturaIds: [fid], deltasFaturas: { [fid]: amount(after) - amount(before) }, versoesFaturas: { [fid]: 1 } });
}
const created = [], generated = [], edited = [];
for (const nature of ['receitaExterna', 'despesaExterna', 'assinaturaCartao']) {
  const op = operation('recCriarSerie', 'create-' + nature, nature), v = revision(nature, time);
  op.c.expectedVersion = 0; op.receipt.expectedVersion = 0; op.receipt.resultVersion = 1;
  Object.assign(op.after, { version: 1, createdAt: time });
  v.ultimoEventoId = op.event;
  op.c.revisaoId = 'serie-202610'; op.c.revisoes[op.c.revisaoId] = { depois: v };
  op.c.referenciasNovas = { categoriaId: v.categoriaId, ...(v.cartaoId ? { cartaoId: v.cartaoId } : {}) };
  emit(op, 'create-' + nature); created.push(op);
  const gen = operation('recMaterializar', 'generate-' + nature, nature), o = occurrence(nature, time), id = 'r10-serie-202611';
  o.ultimoEventoId = gen.event; gen.c.mesReferencia = '2026-11'; gen.c.revisaoId = 'serie-202610';
  gen.c.ocorrenciaIds = [id]; gen.c.ocorrencias[id] = { depois: o }; gen.after.ultimoMesOcupado = '2026-11';
  gen.c.referenciasNovas = clone(op.c.referenciasNovas);
  gen.extra.push(mock('get', path('revisoesRecorrentes', 'serie-202610'), { data: revision(nature) }));
  if (nature === 'assinaturaCartao') attachCard(gen, undefined, o);
  emit(gen, 'generate-' + nature); generated.push(gen);
  const edit = operation('recConfirmarValor', 'confirm-' + nature, nature), a = occurrence(nature), b = clone(a);
  edit.before.ultimoMesOcupado = '2026-11'; edit.after.ultimoMesOcupado = '2026-11';
  Object.assign(b, { version: 2, excecaoIndividual: true, ultimoEventoId: edit.event, updatedAt: time });
  Object.assign(b.financeiro, { valorCentavos: 17342, estimado: false });
  if (b.capacidadeItem) b.capacidadeItem.correcaoAcrescimosCentavos = 2342;
  Object.assign(edit.c, { mesReferencia: '2026-11', ocorrenciaIds: [id], ocorrencias: { [id]: { antes: a, depois: b } } });
  if (nature === 'assinaturaCartao') attachCard(edit, a, b);
  emit(edit, 'confirm-' + nature); edited.push(edit);
}
for (const source of generated) {
  const op = clone(source), id = op.c.ocorrenciaIds[0];
  op.c.tipo = 'recConfirmarValor'; op.c.operationKey = 'confirmVirtual-' + op.after.natureza; op.event = op.c.tipo + '__' + op.c.operationKey;
  Object.assign(op.receipt, { tipo: op.c.tipo, operationKey: op.c.operationKey }); op.after.ultimoEventoId = op.event;
  const o = op.c.ocorrencias[id].depois; o.excecaoIndividual = true; o.ultimoEventoId = op.event; o.financeiro.estimado = false;
  if (op.newControl) { op.newControl.ultimoEventoId = op.event; op.newControl.ultimoEventoTipo = op.c.tipo; }
  emit(op, 'confirmVirtual-' + op.after.natureza);
}
for (const nature of ['receitaExterna', 'despesaExterna', 'assinaturaCartao']) {
  const id = 'r10-serie-202611', op = operation('recCancelar', 'cancel-' + nature, nature), a = occurrence(nature), b = clone(a);
  op.before.ultimoMesOcupado = '2026-11'; op.after.ultimoMesOcupado = '2026-11';
  Object.assign(b, { version: 2, estado: 'cancelada', excecaoIndividual: true, motivoSupressao: 'Cancelamento explícito', ultimoEventoId: op.event, updatedAt: time });
  Object.assign(op.c, { mesReferencia: '2026-11', motivo: b.motivoSupressao, ocorrenciaIds: [id], ocorrencias: { [id]: { antes: a, depois: b } } });
  if (nature === 'assinaturaCartao') attachCard(op, a, b);
  emit(op, 'cancel-' + nature);
  const skip = operation('recPular', 'skip-' + nature, nature), tombstone = occurrence(nature, time);
  delete tombstone.financeiro; delete tombstone.capacidadeItem;
  Object.assign(tombstone, { estado: 'pulada', excecaoIndividual: true, motivoSupressao: 'Pulo explícito', ultimoEventoId: skip.event });
  Object.assign(skip.c, { mesReferencia: '2026-11', motivo: tombstone.motivoSupressao, revisaoId: 'serie-202610', ocorrenciaIds: [id], ocorrencias: { [id]: { depois: tombstone } } }); skip.after.ultimoMesOcupado = '2026-11';
  skip.extra.push(mock('get', path('revisoesRecorrentes', 'serie-202610'), { data: revision(nature) }));
  emit(skip, 'skip-' + nature);
}
const end = operation('recEncerrar', 'end');
Object.assign(end.c, { motivo: 'Fim da recorrência', encerradaDesdeMes: '2026-12' });
Object.assign(end.after, { estado: 'encerrada', encerradaDesdeMes: '2026-12' }); emit(end, 'end');

for (const nature of ['receitaExterna', 'despesaExterna']) {
  const id = 'r10-serie-202611', type = nature === 'receitaExterna' ? 'recReceber' : 'recPagar';
  const pay = operation(type, 'partial-' + nature, nature), a = occurrence(nature), b = clone(a);
  a.financeiro.estimado = false; b.financeiro.estimado = false;
  Object.assign(b, { version: 2, ultimoEventoId: pay.event, updatedAt: time }); Object.assign(b.financeiro, { liquidadoLiquidoCentavos: 6000, jaLiquidada: true });
  pay.before.ultimoMesOcupado = '2026-11'; pay.after.ultimoMesOcupado = '2026-11';
  Object.assign(pay.c, { mesReferencia: '2026-11', ocorrenciaIds: [id], ocorrencias: { [id]: { antes: a, depois: b } }, fato: { tipo: nature === 'receitaExterna' ? 'recebimento' : 'pagamento', valorCentavos: 6000, contaId: 'account', dataEfetiva: '2026-10-20' } }); emit(pay, 'pay-' + nature);
  const reverse = operation('recReverter', 'reverse-' + nature, nature), restored = clone(b), original = clone(pay.receipt);
  reverse.before.version = 2; reverse.before.ultimoMesOcupado = '2026-11'; reverse.after.version = 3; reverse.after.ultimoMesOcupado = '2026-11'; reverse.c.expectedVersion = 2; reverse.receipt.expectedVersion = 2; reverse.receipt.resultVersion = 3;
  Object.assign(restored, { version: 3, ultimoEventoId: reverse.event, updatedAt: time }); restored.financeiro.liquidadoLiquidoCentavos = 0;
  Object.assign(reverse.c, { mesReferencia: '2026-11', ocorrenciaIds: [id], ocorrencias: { [id]: { antes: b, depois: restored } }, motivo: 'Erro de registro', originalEventoId: pay.event, fato: { ...clone(pay.c.fato), tipo: nature === 'receitaExterna' ? 'reversaoRecebimento' : 'reversaoPagamento', originalId: pay.event, motivo: 'Erro de registro' } });
  const marker = { serieId: 'serie', originalEventoId: pay.event, reversaoEventoId: reverse.event, createdAt: time };
  reverse.extra.push(mock('get', path('operacoesRecorrentes', pay.event), { data: original }), mock('getAfter', path('reversoesRecorrentes', pay.event), { data: marker }));
  const mocks = emit(reverse, 'reverse-' + nature); add('reverseMarker-' + nature, 'reversoesRecorrentes', pay.event, 'create', marker, undefined, mocks);
}

const futureOps = [];
// Future split before a scheduled December boundary; November is the only occupied month.
for (const nature of ['despesaExterna', 'assinaturaCartao']) {
  const id = 'r10-serie-202611', op = operation('recRevisarFuturas', 'future-' + nature, nature), v = revision(nature), a = occurrence(nature), b = clone(a);
  v.fimExclusivo = '2026-12'; const prior = { ...clone(v), version: 2, fimExclusivo: '2026-11', ultimoEventoId: op.event, updatedAt: time };
  const next = { ...clone(v), inicioMes: '2026-11', valorCentavos: 17000, version: 1, ultimoEventoId: op.event, createdAt: time, updatedAt: time };
  Object.assign(b, { version: 2, revisaoId: 'serie-202611', revisaoVersion: 1, ultimoEventoId: op.event, updatedAt: time }); b.financeiro.valorCentavos = 17000;
  if (b.capacidadeItem) b.capacidadeItem.correcaoAcrescimosCentavos = 2000;
  op.before.ultimoMesOcupado = '2026-11'; op.after.ultimoMesOcupado = '2026-11';
  Object.assign(op.c, { motivo: 'Reajuste explícito', vigencia: '2026-11', revisaoAnteriorId: 'serie-202610', revisaoId: 'serie-202611', ocorrenciaIds: [id], ocorrencias: { [id]: { antes: a, depois: b } }, revisoes: { 'serie-202610': { antes: v, depois: prior }, 'serie-202611': { depois: next } } });
  if (nature === 'assinaturaCartao') attachCard(op, a, b);
  emit(op, 'future-' + nature); futureOps.push(op);
}
const initEvent = 'recInicializarFatura__initialize', init = { ...clone(control), ultimoEventoId: initEvent, createdAt: time, updatedAt: time };
const initReceipt = { schemaVersion: 1, contractVersion: 1, tipo: 'recInicializarFatura', operationKey: 'initialize', serieId: '', expectedVersion: 0, resultVersion: 1, comando: { tipo: 'recInicializarFatura', operationKey: 'initialize', expectedVersion: 0, faturaId: fid }, createdAt: time };
const initMocks = [mock('getAfter', path('operacoesRecorrentes', initEvent), { data: initReceipt }), mock('getAfter', path('controlesFaturas', fid), { data: init }), mock('get', path('faturas', fid), { data: fatura }), mock('getAfter', path('faturas', fid), { data: fatura })];
add('initializeControl', 'controlesFaturas', fid, 'create', init, undefined, initMocks); add('initializeReceipt', 'operacoesRecorrentes', initEvent, 'create', initReceipt, undefined, initMocks);

// Each invalid state is tested at the authority that must reject it. Mocks retain unrelated dependencies.
const core = generated[1], coreId = core.c.ocorrenciaIds[0];
for (const [name, mutate] of [
  ['zeroAmount', o => { o.financeiro.valorCentavos = 0; }], ['fractionalAmount', o => { o.financeiro.valorCentavos = 0.5; }],
  ['overflowAmount', o => { o.financeiro.valorCentavos = 9007199254740992; }], ['invalidDate', o => { o.financeiro.vencimento = '2026-02-30'; }],
  ['unknownField', o => { o.forged = true; }], ['inventedPayment', o => { o.financeiro.liquidadoLiquidoCentavos = 100; }],
  ['wrongMonth', o => { o.mesReferencia = '2026-12'; }], ['invalidSchema', o => { o.schemaVersion = 2; }],
]) {
  const op = clone(core); mutate(op.c.ocorrencias[coreId].depois);
  add(name, 'ocorrenciasRecorrentes', coreId, 'create', op.c.ocorrencias[coreId].depois, undefined, finalize(op), false);
}
for (const group of created) {
  const bad = clone(group); bad.c.revisoes[bad.c.revisaoId].depois.valorCentavos = 0;
  add('invalidPattern-' + group.after.natureza, 'revisoesRecorrentes', bad.c.revisaoId, 'create', bad.c.revisoes[bad.c.revisaoId].depois, undefined, finalize(bad), false);
}
for (const role of ['other', 'admin', 'pending', 'visitor']) {
  const op = clone(core), mocks = finalize(op), auth = role === 'visitor' ? undefined : { uid: role === 'pending' ? 'fixture' : role, token: { auth_time: 1792510000 } };
  if (role === 'pending') mocks.push(mock('get', '/databases/(default)/documents/users/fixture', { data: { ...profile, primeiro_login: true } }));
  add(role + 'Receipt', 'operacoesRecorrentes', op.event, 'create', op.receipt, undefined, mocks, false, auth ?? null);
  add(role + 'Get', 'seriesRecorrentes', 'serie', 'get', undefined, op.before, mocks, false, auth ?? null);
}
for (const collection of ['seriesRecorrentes', 'revisoesRecorrentes', 'ocorrenciasRecorrentes', 'operacoesRecorrentes', 'controlesFaturas', 'reversoesRecorrentes']) {
  add('ownRead-' + collection, collection, 'fixture-id', 'get', undefined, {}, [], true);
  add('denyDelete-' + collection, collection, 'fixture-id', 'delete', undefined, {}, [], false);
}
const missing = finalize(core).filter(m => !(m.function === 'getAfter' && m.args[0].exactValue.endsWith('/operacoesRecorrentes/' + core.event)));
missing.push(mock('getAfter', path('operacoesRecorrentes', core.event), null));
add('seriesWithoutReceipt', 'seriesRecorrentes', 'serie', 'update', core.after, core.before, missing, false);
const forgedG = clone(generated[2]); forgedG.newControl.exigivelCentavos++;
add('forgedInvoiceDelta', 'controlesFaturas', fid, 'update', forgedG.newControl, forgedG.oldControl, finalize(forgedG), false);
const paidG = clone(generated[2]); paidG.oldControl.possuiHistoricoPagamento = true; paidG.newControl.possuiHistoricoPagamento = true;
add('paidInvoiceBlocked', 'controlesFaturas', fid, 'update', paidG.newControl, paidG.oldControl, finalize(paidG), false);

for (const source of edited) {
  const op = clone(source); op.c.tipo = 'recEditarEsta'; op.c.motivo = 'Correção individual';
  op.c.operationKey = 'edit-' + op.after.natureza; op.event = op.c.tipo + '__' + op.c.operationKey;
  op.after.ultimoEventoId = op.event; op.receipt.tipo = op.c.tipo; op.receipt.operationKey = op.c.operationKey;
  op.c.ocorrencias[op.c.ocorrenciaIds[0]].depois.ultimoEventoId = op.event;
  if (op.newControl) { op.newControl.ultimoEventoId = op.event; op.newControl.ultimoEventoTipo = op.c.tipo; }
  emit(op, 'edit-' + op.after.natureza);
}
const move = clone(edited[2]), moveId = move.c.ocorrenciaIds[0], newFid = 'card2__2026-11';
move.c.tipo = 'recEditarEsta'; move.c.motivo = 'Trocar cartão'; move.c.operationKey = 'move-card'; move.event = 'recEditarEsta__move-card';
move.after.ultimoEventoId = move.event; move.receipt.tipo = move.c.tipo; move.receipt.operationKey = move.c.operationKey;
Object.assign(move.c.ocorrencias[moveId].depois.financeiro, { cartaoId: 'card2', faturaId: newFid });
move.c.ocorrencias[moveId].depois.ultimoEventoId = move.event;
move.c.referenciasNovas = { cartaoId: 'card2' }; move.c.faturaIds = [fid, newFid]; move.c.deltasFaturas = { [fid]: -15000, [newFid]: 17342 }; move.c.versoesFaturas = { [fid]: 1, [newFid]: 1 };
move.newControl.exigivelCentavos = 0; move.newControl.ultimoEventoId = move.event; move.newControl.ultimoEventoTipo = move.c.tipo;
const newG = { ...clone(control), cartaoId: 'card2', faturaId: newFid };
const newGAfter = { ...clone(newG), version: 2, exigivelCentavos: 17342, ultimoEventoId: move.event, ultimoEventoTipo: move.c.tipo, updatedAt: time };
move.extra.push(mock('getAfter', path('cartoes', 'card2'), { data: { schemaVersion: 1, version: 1, estado: 'ativo' } }), mock('get', path('faturas', newFid), { data: { ...clone(fatura), cartaoId: 'card2' } }), mock('get', path('controlesFaturas', newFid), { data: newG }), mock('getAfter', path('controlesFaturas', newFid), { data: newGAfter }));
const moveMocks = emit(move, 'moveCard'); add('moveCardNewControl', 'controlesFaturas', newFid, 'update', newGAfter, newG, moveMocks);

// Preserve the original error graph as a negative regression; test forged and omitted payloads at S.
for (const [name, edit] of [
  ['watermarkReduced', op => { op.before.ultimoMesOcupado = '2027-01'; }],
  ['forgedBeforeCreate', op => { op.c.ocorrencias[coreId].antes = clone(op.c.ocorrencias[coreId].depois); }],
  ['createAsCancelled', op => { const o = op.c.ocorrencias[coreId].depois; o.estado = 'cancelada'; o.excecaoIndividual = true; o.motivoSupressao = 'Forjado'; }],
  ['unknownCommandField', op => { op.c.unsafe = true; }],
  ['wrongExpectedVersion', op => { op.c.expectedVersion = 0; }],
]) {
  const op = clone(core); edit(op);
  const collection = name === 'forgedBeforeCreate' ? 'ocorrenciasRecorrentes' : 'seriesRecorrentes';
  const target = collection === 'seriesRecorrentes' ? 'serie' : coreId;
  add(name, collection, target, collection === 'seriesRecorrentes' ? 'update' : 'create', collection === 'seriesRecorrentes' ? op.after : op.c.ocorrencias[coreId].depois, collection === 'seriesRecorrentes' ? op.before : undefined, finalize(op), false);
}
const tombstoneReplay = clone(core); const tomb = clone(tombstoneReplay.c.ocorrencias[coreId].depois);
delete tomb.financeiro; Object.assign(tomb, { estado: 'pulada', excecaoIndividual: true, motivoSupressao: 'Pulo anterior', ultimoEventoId: 'recPular__past', createdAt: old, updatedAt: old });
tombstoneReplay.c.ocorrencias[coreId].antes = tomb;
const replayAfter = tombstoneReplay.c.ocorrencias[coreId].depois; replayAfter.version = 2; replayAfter.createdAt = old;
add('tombstoneNotReactivated', 'ocorrenciasRecorrentes', coreId, 'update', replayAfter, tomb, finalize(tombstoneReplay), false);

for (const limit of [1, 50, 51]) for (const collection of ['seriesRecorrentes', 'revisoesRecorrentes', 'ocorrenciasRecorrentes', 'operacoesRecorrentes', 'controlesFaturas']) {
  add(`list-${collection}-${limit}`, collection, '', 'list', undefined, undefined, [], limit <= 50);
  cases.at(-1).test.request.query = { limit };
}
for (const source of created) {
  const op = clone(source), v = op.c.revisoes[op.c.revisaoId].depois;
  v.descricao = '漢'.repeat(120); v.observacao = '漢'.repeat(1000);
  emit(op, 'unicodeMax-' + op.after.natureza);
}
const first = clone(created[1]), firstUse = { eventoId: first.event, origemId: 'serie', papel: 'classificacao', createdAt: time };
const categoryBefore = catalog('despesa'); delete categoryBefore.usoFinanceiro; categoryBefore.schemaVersion = 1;
const categoryAfter = { ...clone(categoryBefore), schemaVersion: 2, usoFinanceiro: firstUse };
first.extra.push(mock('get', path('operacoesRecorrentes', first.event), null), mock('getAfter', path('categorias', 'cat'), { data: categoryAfter }));
const firstMocks = emit(first, 'firstCategory'); add('firstCategoryPatch', 'categorias', 'cat', 'update', categoryAfter, categoryBefore, firstMocks);

// Existing005 creation remains valid; recurrence does not broaden its closed schema.
const externalData = { natureza: 'despesa', descricao: 'Avulsa', categoriaId: 'cat', valorCentavos: 15000, estimado: false, competenciaPlanejamento: '2026-11', vencimento: '2026-11-05', dataConsumo: '2026-10-20' };
const externalCommand = { contractVersion: 1, tipo: 'criarDespesa', operationKey: 'legacy', origemId: 'avulsa', expectedVersion: 0, dados: externalData };
const externalReceipt = { schemaVersion: 1, contractVersion: 1, tipo: 'criarDespesa', operationKey: 'legacy', origemId: 'avulsa', natureza: 'despesa', expectedVersion: 0, resultVersion: 1, comando: externalCommand, depois: externalData, createdAt: time };
const externalOrigin = { ...clone(externalData), schemaVersion: 1, version: 1, createdAt: time, updatedAt: time, estadoObrigacao: 'ativa', liquidadoLiquidoCentavos: 0, jaLiquidada: false, ultimoEventoId: 'criarDespesa__legacy' };
const externalMocks = [mock('getAfter', path('operacoesExternas', 'criarDespesa__legacy'), { data: externalReceipt }), mock('getAfter', path('lancamentosExternos', 'avulsa'), { data: externalOrigin })];
add('legacy005Origin', 'lancamentosExternos', 'avulsa', 'create', externalOrigin, undefined, externalMocks);
add('legacy005Receipt', 'operacoesExternas', 'criarDespesa__legacy', 'create', externalReceipt, undefined, externalMocks);
add('legacy005UnknownRecurrenceField', 'lancamentosExternos', 'avulsa', 'create', { ...externalOrigin, recorrenciaId: 'serie' }, undefined, externalMocks, false);

const legacyPath = new URL('../006-cartoes-ciclos-faturas/rules-evaluation-cases.json', out);
const legacySuite = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
for (const entry of Array.isArray(legacySuite) ? legacySuite : legacySuite.cases) {
  const item = clone(entry); item.name = 'legacy006-' + item.name;
  if (item.test.request.method === 'update' && /\/faturas\//.test(item.test.request.path)) {
    const id = item.test.request.path.split('/').at(-1);
    item.test.functionMocks.push(mock('get', path('controlesFaturas', id), null));
  }
  cases.push(item);
}

for (const original of futureOps) {
  const id = original.c.ocorrenciaIds[0];
  const omitted = clone(original); omitted.c.ocorrenciaIds = []; omitted.c.ocorrencias = {};
  const mocks = [...finalize(original), ...finalize(omitted)];
  add('omitFuture-' + original.after.natureza, 'seriesRecorrentes', 'serie', 'update', omitted.after, omitted.before, mocks, false);
  const overwrite = clone(original); overwrite.c.revisoes[overwrite.c.revisaoId].depois.fimExclusivo = '2027-01';
  add('overwriteNextRevision-' + original.after.natureza, 'seriesRecorrentes', 'serie', 'update', overwrite.after, overwrite.before, finalize(overwrite), false);
  const protectedOp = clone(original);
  if (protectedOp.oldControl) { protectedOp.oldControl.possuiHistoricoPagamento = true; protectedOp.newControl.possuiHistoricoPagamento = true; }
  else protectedOp.c.ocorrencias[id].antes.financeiro.jaLiquidada = true;
  add('protectedFuture-' + original.after.natureza, 'seriesRecorrentes', 'serie', 'update', protectedOp.after, protectedOp.before, finalize(protectedOp), false);
  const same = clone(original), currentV = clone(same.c.revisoes[same.c.revisaoAnteriorId].antes);
  currentV.inicioMes = '2026-11';
  const nextV = { ...clone(currentV), version: 2, valorCentavos: 17000, ultimoEventoId: same.event, updatedAt: time };
  same.c.revisaoAnteriorId = same.c.revisaoId; same.c.revisoes = { [same.c.revisaoId]: { antes: currentV, depois: nextV } };
  same.c.ocorrencias[id].antes.revisaoId = same.c.revisaoId; same.c.ocorrencias[id].depois.revisaoVersion = 2;
  emit(same, 'sameBoundary-' + original.after.natureza);
}
const overMetadata = clone(futureOps[0]); overMetadata.c.motivo = '漢'.repeat(1000);
for (const pair of Object.values(overMetadata.c.revisoes)) for (const value of Object.values(pair)) value.observacao = '漢'.repeat(1000);
for (const pair of Object.values(overMetadata.c.ocorrencias)) for (const value of Object.values(pair)) value.financeiro.observacao = '漢'.repeat(1000);
add('metadataByteBound', 'seriesRecorrentes', 'serie', 'update', overMetadata.after, overMetadata.before, finalize(overMetadata), false);

const payCase = cases.find(item => item.name === 'pay-despesaExternaOccurrencer10-serie-202611');
if (!payCase) throw Error('PAY_FIXTURE_NOT_FOUND');
const payEvent = payCase.test.request.resource.data.ultimoEventoId;
const accountBefore = { ...catalog(), tipo: 'banco', schemaVersion: 1 }; delete accountBefore.usoFinanceiro;
const accountAfter = { ...clone(accountBefore), schemaVersion: 2, usoFinanceiro: { eventoId: payEvent, origemId: 'serie', papel: 'movimentacao', createdAt: time } };
const firstAccountMocks = [...payCase.test.functionMocks, mock('get', path('operacoesRecorrentes', payEvent), null), mock('getAfter', path('contas', 'account'), { data: accountAfter })];
add('firstAccountPatch', 'contas', 'account', 'update', accountAfter, accountBefore, firstAccountMocks);
add('firstAccountOldReceiptDenied', 'contas', 'account', 'update', accountAfter, accountBefore, [...firstAccountMocks, mock('get', path('operacoesRecorrentes', payEvent), { data: { tipo: 'recPagar' } })], false);

const legacyInvoice = cases.find(item => item.name.startsWith('legacy006-') && item.test.expectation === 'ALLOW' && item.test.request.method === 'update' && /\/faturas\//.test(item.test.request.path));
if (!legacyInvoice) throw Error('CALENDAR_BRIDGE_FIXTURE_NOT_FOUND');
const bridge = clone(legacyInvoice), bridgeId = bridge.test.request.path.split('/').at(-1), bridgeF = bridge.test.request.resource.data;
const bridgeBefore = { ...clone(control), faturaId: bridgeId, cartaoId: bridgeF.cartaoId, competencia: bridgeF.competencia, calendarioVersion: bridge.test.resource.data.version, version: 7 };
const bridgeAfter = { ...clone(bridgeBefore), calendarioVersion: bridgeF.version, version: 8, ultimoEventoTipo: 'calendario006', ultimoEventoId: bridgeF.ultimoEventoId, updatedAt: bridge.test.request.time };
bridge.name = 'calendar006WithControl';
bridge.test.functionMocks = [...new Map([...bridge.test.functionMocks, mock('get', path('controlesFaturas', bridgeId), { data: bridgeBefore }), mock('getAfter', path('controlesFaturas', bridgeId), { data: bridgeAfter })].map(m => [m.function + '|' + m.args[0].exactValue, m])).values()];
cases.push(bridge);
const bridgeControl = clone(bridge); bridgeControl.name = 'calendar006ControlHalf';
bridgeControl.test.request.path = path('controlesFaturas', bridgeId); bridgeControl.test.request.resource.data = bridgeAfter; bridgeControl.test.resource.data = bridgeBefore;
cases.push(bridgeControl);
const staleBridge = clone(bridge); staleBridge.name = 'calendar006MissingControlUpdate'; staleBridge.test.expectation = 'DENY';
staleBridge.test.functionMocks = [...new Map([...staleBridge.test.functionMocks, mock('getAfter', path('controlesFaturas', bridgeId), { data: bridgeBefore })].map(m => [m.function + '|' + m.args[0].exactValue, m])).values()];
cases.push(staleBridge);
const staleVersion = clone(bridgeControl); staleVersion.name = 'calendar006OldReceiptReplay'; staleVersion.test.expectation = 'DENY'; staleVersion.test.resource.data.calendarioVersion = bridgeF.version;
cases.push(staleVersion);

const maximumRefs = clone(created[1]), refPattern = maximumRefs.c.revisoes[maximumRefs.c.revisaoId].depois;
Object.assign(refPattern, { titularId: 'holder', contaPrevistaId: 'account', etiquetaIds: Array.from({ length: 5 }, (_, i) => 'label' + i) });
Object.assign(maximumRefs.c.referenciasNovas, { titularId: refPattern.titularId, contaPrevistaId: refPattern.contaPrevistaId, etiquetaIds: clone(refPattern.etiquetaIds) });
const plainCatalog = { schemaVersion: 1, version: 1, nome: 'Fixture', estado: 'ativo', createdAt: old, updatedAt: old };
maximumRefs.extra.push(mock('getAfter', path('titulares', 'holder'), { data: plainCatalog }));
for (let i = 0; i < 5; i++) maximumRefs.extra.push(mock('getAfter', path('etiquetas', 'label' + i), { data: plainCatalog }));
emit(maximumRefs, 'createMaximumReferences');
const maximumMoney = clone(created[1]); maximumMoney.c.revisoes[maximumMoney.c.revisaoId].depois.valorCentavos = 9007199254740991;
emit(maximumMoney, 'maximumSafeMoney');
const tooManyLabels = clone(generated[2]); tooManyLabels.c.referenciasNovas.etiquetaIds = Array.from({ length: 5 }, (_, i) => 'label' + i);
tooManyLabels.c.ocorrencias[coreId].depois.financeiro.etiquetaIds = clone(tooManyLabels.c.referenciasNovas.etiquetaIds);
const labeledRevision = revision('assinaturaCartao'); labeledRevision.etiquetaIds = clone(tooManyLabels.c.referenciasNovas.etiquetaIds);
tooManyLabels.extra = [mock('get', path('revisoesRecorrentes', 'serie-202610'), { data: labeledRevision }), ...Array.from({ length: 5 }, (_, i) => mock('getAfter', path('etiquetas', 'label' + i), { data: plainCatalog }))];
add('cardGraphExceedsBudget', 'seriesRecorrentes', 'serie', 'update', tooManyLabels.after, tooManyLabels.before, finalize(tooManyLabels), false);
add('denyDuplicateItemControlAuthority', 'controlesItensFaturas', 'recorrencia__r10-serie-202611', 'create', {}, undefined, finalize(generated[2]), false);

for (const role of ['other', 'admin', 'pending', 'visitor']) {
  const auth = role === 'visitor' ? null : { uid: role === 'pending' ? 'fixture' : role, token: { auth_time: 1792510000 } };
  const roleMocks = role === 'pending' ? [mock('get', '/databases/(default)/documents/users/fixture', { data: { ...profile, primeiro_login: true } })] : [];
  for (const collection of ['seriesRecorrentes', 'revisoesRecorrentes', 'ocorrenciasRecorrentes', 'operacoesRecorrentes', 'controlesFaturas', 'reversoesRecorrentes']) {
    add(`matrix-get-${role}-${collection}`, collection, 'fixture-id', 'get', undefined, {}, roleMocks, false, auth);
    if (collection !== 'reversoesRecorrentes') {
      add(`matrix-list-${role}-${collection}`, collection, '', 'list', undefined, undefined, roleMocks, false, auth); cases.at(-1).test.request.query = { limit: 50 };
    }
  }
  if (role !== 'pending') for (const prototype of [created[0], generated[1], generated[2], edited[1]]) {
    const op = clone(prototype), mocks = [...finalize(op), ...roleMocks];
    add(`matrix-series-${role}-${op.c.tipo}-${op.after.natureza}`, 'seriesRecorrentes', 'serie', op.c.tipo === 'recCriarSerie' ? 'create' : 'update', op.after, op.c.tipo === 'recCriarSerie' ? undefined : op.before, mocks, false, auth);
  }
}

const names = cases.map(item => item.name);
if (new Set(names).size !== names.length) throw Error('DUPLICATE_CASES');
fs.writeFileSync(new URL('rules-evaluation-cases.json', out), JSON.stringify({ scope: 'synthetic-official-evaluation-fixtures-only', constructionComplete: true, officialEvaluation: 'NOT_RUN', notes: ['Ready delegada é negada na contraparte obrigatória R; mocks de um auxiliar isolado não provam atomicidade SDK.', 'Concorrência e snapshots exigem integração real futura; fixture oficial individual não substitui SDK.', 'Valores/Unicode máximos são fixtures, não prova geral de bytes/expressões.'], cases }, null, 2) + '\n');
process.stdout.write(JSON.stringify({ cases: cases.length, allow: cases.filter(item => item.test.expectation === 'ALLOW').length, deny: cases.filter(item => item.test.expectation === 'DENY').length, constructionComplete: true }) + '\n');

