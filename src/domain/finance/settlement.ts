import { dataCalendario } from './calendar'
import { camposPermitidos, falha, registro, sucesso, texto, versaoValida, umDe } from './errors'
import type { Resultado } from './errors'
import { validarCalendarioFatura } from './invoiceCalendar'
import { aplicarCreditoObrigacao, somarCentavos, subtrairCentavos, valorPositivo } from './money'
import type { Centavos } from './money'
import type { CreditoObrigacao, EstornoConsumo, FatoLiquidacao, OrigemConsumo, ReferenciaAlvo, SnapshotAlvo, VersaoEsperada } from './contracts/commands'

export const idValido = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,512}$/.test(value)
export function referenciaValida(value: unknown): value is ReferenciaAlvo {
  return registro(value) && camposPermitidos(value, ['tipo', 'id']) && idValido(value.id) && umDe(value.tipo, ['receita', 'obrigacaoExternaAvulsa', 'parcelaExterna', 'fatura', 'parcelaCartao'])
}
export const mesmaReferencia = (a: ReferenciaAlvo, b: ReferenciaAlvo) => a.id === b.id && a.tipo === b.tipo
const inconsistente = () => falha('referenciaInvalida', 'Os registros do compromisso são inconsistentes. Recarregue os dados completos.', { recuperacao: 'reler' })
const copia = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export type ResumoLiquidacao = Readonly<{ exigivelCentavos: Centavos; liquidadoLiquidoCentavos: Centavos; pendenteCentavos: Centavos; estadoLiquidacao: 'pendente' | 'parcial' | 'liquidada' | 'semExigibilidade'; atrasada: boolean; viaFatura?: string }>
function somar(values: readonly number[]): Resultado<Centavos> { return somarCentavos(values) }

export function validarFatos(fatos: unknown, uid: string): Resultado<readonly FatoLiquidacao[]> {
  if (!Array.isArray(fatos)) return inconsistente()
  const ids = new Set<string>()
  for (const fact of fatos) {
    if (!registro(fact) || !camposPermitidos(fact, ['id', 'uid', 'schemaVersion', 'version', 'tipo', 'alvo', 'valorCentavos', 'dataEfetiva', 'contaId', 'operacaoId', 'originalId', 'motivo', 'estornoId']) || !idValido(fact.id) || ids.has(fact.id) || fact.uid !== uid || !referenciaValida(fact.alvo) || !idValido(fact.contaId) || !idValido(fact.operacaoId) || !valorPositivo(fact.valorCentavos).ok || !dataCalendario(fact.dataEfetiva).ok || !umDe(fact.tipo, ['pagamento', 'recebimento', 'reversaoPagamento', 'reversaoRecebimento', 'reembolso'])) return inconsistente()
    if (fact.schemaVersion !== 1) return falha('esquemaIncompativel', 'O formato do fato não é suportado.')
    if (fact.version !== 1 || fact.alvo.tipo === 'parcelaCartao') return inconsistente()
    if (umDe(fact.tipo, ['recebimento', 'reversaoRecebimento']) !== (fact.alvo.tipo === 'receita')) return inconsistente()
    const reverse = !umDe(fact.tipo, ['pagamento', 'recebimento'])
    if (reverse ? !idValido(fact.originalId) || !texto(fact.motivo, 1000) : fact.originalId !== undefined || fact.motivo !== undefined || fact.estornoId !== undefined) return inconsistente()
    if (fact.tipo === 'reembolso' ? !idValido(fact.estornoId) : fact.estornoId !== undefined) return inconsistente()
    ids.add(fact.id)
  }
  const typed = fatos as FatoLiquidacao[]
  for (const fact of typed) {
    if (!fact.originalId) continue
    const original = typed.find(item => item.id === fact.originalId)
    if (!original || !['pagamento', 'recebimento'].includes(original.tipo) || !mesmaReferencia(original.alvo, fact.alvo) || original.contaId !== fact.contaId || fact.dataEfetiva < original.dataEfetiva || (fact.tipo === 'reversaoRecebimento') !== (original.tipo === 'recebimento')) return inconsistente()
    const reversed = somar(typed.filter(item => item.originalId === original.id).map(item => item.valorCentavos))
    if (!reversed.ok) return reversed
    if (reversed.valor > original.valorCentavos) return inconsistente()
  }
  return sucesso(copia(typed))
}

export function validarSnapshot(input: unknown): Resultado<SnapshotAlvo> {
  if (!registro(input) || !camposPermitidos(input, ['uid', 'schemaVersion', 'version', 'alvo', 'completo', 'revisao', 'estadoObrigacao', 'vencimento', 'valorOriginalCentavos', 'origemId', 'dataConsumo', 'estimado', 'calendario', 'itens', 'fatura', 'contas', 'fatos', 'creditos']) || !idValido(input.uid) || !referenciaValida(input.alvo) || !versaoValida(input.version)) return inconsistente()
  if (input.schemaVersion !== 1) return falha('esquemaIncompativel', 'Recarregue com uma versão compatível do aplicativo.')
  if (input.completo !== true || !registro(input.revisao) || input.revisao.antes !== input.version || input.revisao.depois !== input.version) return falha('indisponivel', 'Carregue todas as páginas de uma revisão consistente.', { recuperacao: 'reler' })
  if (!umDe(input.estadoObrigacao, ['ativa', 'cancelada']) || !dataCalendario(input.vencimento).ok || (input.dataConsumo !== undefined && !dataCalendario(input.dataConsumo).ok) || (input.estimado !== undefined && typeof input.estimado !== 'boolean') || (input.origemId !== undefined && !idValido(input.origemId)) || !Array.isArray(input.contas) || !Array.isArray(input.creditos)) return inconsistente()
  const accountIds = new Set<string>()
  for (const account of input.contas) {
    if (!registro(account) || !camposPermitidos(account, ['id', 'uid', 'estadoCadastro']) || !idValido(account.id) || account.uid !== input.uid || !umDe(account.estadoCadastro, ['ativo', 'arquivado']) || accountIds.has(account.id)) return inconsistente()
    accountIds.add(account.id)
  }
  const validatedFacts = validarFatos(input.fatos, input.uid)
  if (!validatedFacts.ok) return validatedFacts
  for (const fact of validatedFacts.valor) if (!mesmaReferencia(fact.alvo, input.alvo) || !accountIds.has(fact.contaId)) return inconsistente()
  const snapshot = input as unknown as SnapshotAlvo
  const creditIds = new Set<string>()
  for (const credit of input.creditos) {
    if (!registro(credit) || !camposPermitidos(credit, ['id', 'uid', 'schemaVersion', 'version', 'tipo', 'alvo', 'origemId', 'valorCentavos', 'dataEfeito', 'motivo', 'operacaoId', 'estornoId']) || credit.tipo !== 'creditoObrigacao' || !idValido(credit.id) || creditIds.has(credit.id) || credit.uid !== input.uid || credit.schemaVersion !== 1 || credit.version !== 1 || !referenciaValida(credit.alvo) || !idValido(credit.origemId) || !idValido(credit.operacaoId) || !valorPositivo(credit.valorCentavos).ok || !dataCalendario(credit.dataEfeito).ok || !texto(credit.motivo, 1000) || (credit.estornoId !== undefined && !idValido(credit.estornoId))) return inconsistente()
    const creditTarget = credit.alvo
    if (!mesmaReferencia(creditTarget, input.alvo) && !(input.alvo.tipo === 'fatura' && creditTarget.tipo === 'parcelaCartao' && Array.isArray(input.itens) && input.itens.some(item => registro(item) && item.id === creditTarget.id && item.origemId === credit.origemId))) return inconsistente()
    if (input.alvo.tipo !== 'fatura' && credit.origemId !== input.origemId) return inconsistente()
    creditIds.add(credit.id)
  }
  if (input.alvo.tipo === 'parcelaCartao') {
    if (input.fatura === input || validatedFacts.valor.length || input.creditos.length) return inconsistente()
    // Nested bills cannot contain further snapshots: prevent unbounded/cyclic recursion.
    if (!registro(input.fatura) || input.fatura.fatura !== undefined || !referenciaValida(input.fatura.alvo) || input.fatura.alvo.tipo !== 'fatura') return inconsistente()
    const bill = validarSnapshot(input.fatura)
    if (!bill.ok) return bill
    const target = input.alvo
    const item = bill.valor.itens?.find(it => it.id === target.id)
    if (!item || bill.valor.uid !== input.uid || item.vencimento !== input.vencimento || item.origemId !== input.origemId) return inconsistente()
    return sucesso(copia(snapshot))
  }
  if (input.fatura !== undefined) return inconsistente()
  if (input.alvo.tipo === 'fatura') {
    const invoice = validarCalendarioFatura(input.calendario)
    if (!invoice.ok) return invoice
    if (!registro(input.calendario) || !camposPermitidos(input.calendario, ['cartaoId', 'competencia', 'fechamento', 'vencimento', 'ciclo']) || !idValido(input.calendario.cartaoId) || !umDe(input.calendario.ciclo, ['aberta', 'fechada']) || invoice.valor.vencimento !== input.vencimento || !Array.isArray(input.itens) || input.valorOriginalCentavos !== undefined) return inconsistente()
    const ids = new Set<string>()
    for (const item of input.itens) {
      if (!registro(item) || !camposPermitidos(item, ['id', 'uid', 'origemId', 'cartaoId', 'faturaId', 'valorCentavos', 'competenciaPlanejamento', 'vencimento', 'estadoObrigacao']) || !idValido(item.id) || ids.has(item.id) || item.uid !== input.uid || !idValido(item.origemId) || item.cartaoId !== input.calendario.cartaoId || item.faturaId !== input.alvo.id || item.competenciaPlanejamento !== invoice.valor.competencia || item.vencimento !== invoice.valor.vencimento || !valorPositivo(item.valorCentavos).ok || !umDe(item.estadoObrigacao, ['ativa', 'cancelada'])) return inconsistente()
      ids.add(item.id)
    }
  } else if (!valorPositivo(input.valorOriginalCentavos).ok || input.itens !== undefined || input.calendario !== undefined || !idValido(input.origemId)) return inconsistente()
  const summary = calcular(snapshot, input.vencimento as string)
  return summary.ok ? sucesso(copia(snapshot)) : summary
}

function calcular(snapshot: SnapshotAlvo, hoje: string): Resultado<ResumoLiquidacao> {
  if (snapshot.alvo.tipo === 'parcelaCartao') {
    if (!snapshot.fatura) return inconsistente()
    const result = calcular(snapshot.fatura, hoje)
    return result.ok ? sucesso({ ...result.valor, viaFatura: snapshot.fatura.alvo.id }) : result
  }
  const creditsFor = (target: ReferenciaAlvo) => somar(snapshot.creditos.filter(credit => mesmaReferencia(credit.alvo, target)).map(credit => credit.valorCentavos))
  const bases: number[] = []
  if (snapshot.alvo.tipo === 'fatura') {
    for (const item of snapshot.itens ?? []) {
      const credits = creditsFor({ tipo: 'parcelaCartao', id: item.id })
      if (!credits.ok) return credits
      const net = subtrairCentavos(item.valorCentavos, credits.valor)
      if (!net.ok) return net
      if (item.estadoObrigacao === 'ativa') bases.push(net.valor)
    }
  } else bases.push(snapshot.valorOriginalCentavos ?? 0)
  const base = somar(bases), credits = creditsFor(snapshot.alvo)
  if (!base.ok) return base
  if (!credits.ok) return credits
  const exigivel = subtrairCentavos(base.valor, credits.valor)
  if (!exigivel.ok) return exigivel
  const total = somar(snapshot.fatos.filter(f => !f.originalId).map(f => f.valorCentavos))
  const reverse = somar(snapshot.fatos.filter(f => f.originalId).map(f => f.valorCentavos))
  if (!total.ok) return total
  if (!reverse.ok) return reverse
  const paid = subtrairCentavos(total.valor, reverse.valor)
  if (!paid.ok) return paid
  const effective = snapshot.estadoObrigacao === 'cancelada' ? 0 : exigivel.valor
  const pending = subtrairCentavos(effective, paid.valor)
  if (!pending.ok) return pending
  return sucesso({ exigivelCentavos: effective as Centavos, liquidadoLiquidoCentavos: paid.valor, pendenteCentavos: pending.valor, estadoLiquidacao: snapshot.estadoObrigacao === 'cancelada' ? 'semExigibilidade' : pending.valor === 0 ? 'liquidada' : paid.valor > 0 ? 'parcial' : 'pendente', atrasada: pending.valor > 0 && snapshot.vencimento < hoje })
}
export function derivarLiquidacao(input: unknown, hoje: unknown): Resultado<ResumoLiquidacao> {
  const snapshot = validarSnapshot(input), date = dataCalendario(hoje)
  if (!snapshot.ok) return snapshot
  return date.ok ? calcular(snapshot.valor, date.valor) : date
}
function atualizar(snapshot: SnapshotAlvo, patch: Partial<SnapshotAlvo>): SnapshotAlvo {
  const version = snapshot.version + 1
  return { ...snapshot, ...patch, version, revisao: { antes: version, depois: version } }
}
const conflito = (version: number) => falha('conflitoVersao', 'O registro mudou. Recarregue antes de confirmar.', { versaoAtual: version, recuperacao: 'reler' })

export function avaliarLiquidacao(input: unknown, comando: unknown): Resultado<{ snapshot: SnapshotAlvo; fatos: readonly FatoLiquidacao[]; versoes: readonly VersaoEsperada[] }> {
  const valid = validarSnapshot(input)
  if (!valid.ok) return valid
  const s = valid.valor
  if (!registro(comando) || !camposPermitidos(comando, ['tipo', 'id', 'valorCentavos', 'dataEfetiva', 'contaId', 'operacaoId', 'expectedVersion']) || !idValido(comando.id) || !idValido(comando.operacaoId) || !idValido(comando.contaId) || !valorPositivo(comando.valorCentavos).ok || !dataCalendario(comando.dataEfetiva).ok) return falha('valorInvalido', 'Informe um pagamento ou recebimento válido.')
  if (comando.expectedVersion !== s.version) return conflito(s.version)
  if (s.alvo.tipo === 'parcelaCartao' || s.estadoObrigacao === 'cancelada' || comando.tipo !== (s.alvo.tipo === 'receita' ? 'recebimento' : 'pagamento') || !s.contas.some(c => c.id === comando.contaId && c.estadoCadastro === 'ativo')) return inconsistente()
  const fact = { id: comando.id, uid: s.uid, schemaVersion: 1, version: 1, tipo: comando.tipo, alvo: s.alvo, valorCentavos: comando.valorCentavos, dataEfetiva: comando.dataEfetiva, contaId: comando.contaId, operacaoId: comando.operacaoId } as FatoLiquidacao
  const next = validarSnapshot(atualizar(s, { fatos: [...s.fatos, fact] }))
  return next.ok ? sucesso({ snapshot: next.valor, fatos: [fact], versoes: [{ id: s.alvo.id, version: s.version }] }) : next
}

type PropostaAjuste = Readonly<{ snapshots: readonly SnapshotAlvo[]; estornos: readonly EstornoConsumo[]; versoes: readonly VersaoEsperada[] }>
export function avaliarAjuste(inputs: unknown, command: unknown): Resultado<PropostaAjuste> {
  const list = Array.isArray(inputs) ? inputs : [inputs]
  const targets: SnapshotAlvo[] = []
  for (const input of list) {
    const parsed = validarSnapshot(input)
    if (!parsed.ok) return parsed
    if (parsed.valor.alvo.tipo === 'parcelaCartao' || targets.some(s => mesmaReferencia(s.alvo, parsed.valor.alvo)) || (targets.length > 0 && targets[0].uid !== parsed.valor.uid)) return inconsistente()
    targets.push(parsed.valor)
  }
  if (targets.length === 0 || !registro(command) || !camposPermitidos(command, ['tipo', 'id', 'operacaoId', 'motivo', 'valorCentavos', 'expectedVersion', 'dataEfetiva', 'dataEfeito', 'origemId', 'alvo', 'originalId', 'origemTipo', 'origem', 'creditos', 'reembolsos']) || !idValido(command.id) || !idValido(command.operacaoId) || !texto(command.motivo, 1000) || !valorPositivo(command.valorCentavos).ok) return falha('valorInvalido', 'Informe correção tipada com motivo e valor positivo.')
  if (targets.length > 32 || !versaoValida(targets[0].version + 1)) return falha('limiteOperacional', 'A correção excede o limite da operação.')
  const working = targets.map(copia), estornos: EstornoConsumo[] = []
  const metadata = command
  function inversao(s: SnapshotAlvo, c: Record<string, unknown>, tipo: string, estornoId?: string): Resultado<SnapshotAlvo> {
    if (!idValido(c.id) || !idValido(c.originalId) || !valorPositivo(c.valorCentavos).ok || !dataCalendario(c.dataEfetiva).ok) return inconsistente()
    if (c.expectedVersion !== s.version) return conflito(s.version)
    const original = s.fatos.find(f => f.id === c.originalId && !f.originalId)
    if (!original) return inconsistente()
    const fact = { id: c.id, uid: s.uid, schemaVersion: 1, version: 1, tipo, alvo: s.alvo, valorCentavos: c.valorCentavos, dataEfetiva: c.dataEfetiva, contaId: original.contaId, originalId: original.id, motivo: metadata.motivo, operacaoId: metadata.operacaoId, ...(estornoId ? { estornoId } : {}) } as FatoLiquidacao
    return sucesso({ ...s, fatos: [...s.fatos, fact] })
  }
  function adicionarCredito(s: SnapshotAlvo, c: Record<string, unknown>, origemId: string, estornoId?: string): Resultado<SnapshotAlvo> {
    if (c.expectedVersion !== s.version) return conflito(s.version)
    if (!idValido(c.id) || !valorPositivo(c.valorCentavos).ok || !dataCalendario(metadata.dataEfeito).ok) return inconsistente()
    const target = c.alvo === undefined ? s.alvo : c.alvo
    if (!referenciaValida(target)) return inconsistente()
    const summary = calcular(s, metadata.dataEfeito as string)
    if (!summary.ok) return summary
    const arithmetic = aplicarCreditoObrigacao(summary.valor.pendenteCentavos, { tipo: 'creditoObrigacao', valorCentavos: c.valorCentavos, origemId, motivo: metadata.motivo, dataEfeito: metadata.dataEfeito })
    if (!arithmetic.ok) return arithmetic
    const credit: CreditoObrigacao = { id: c.id, uid: s.uid, schemaVersion: 1, version: 1, tipo: 'creditoObrigacao', alvo: target, origemId, valorCentavos: c.valorCentavos as number, dataEfeito: metadata.dataEfeito as string, motivo: metadata.motivo as string, operacaoId: metadata.operacaoId as string, ...(estornoId ? { estornoId } : {}) }
    return sucesso({ ...s, creditos: [...s.creditos, credit] })
  }
  if (command.tipo === 'creditoObrigacao') {
    if (targets.length !== 1 || !idValido(command.origemId)) return inconsistente()
    const next = adicionarCredito(working[0], command, command.origemId)
    if (!next.ok) return next
    working[0] = next.valor
  } else if (umDe(command.tipo, ['reversaoPagamento', 'reversaoRecebimento'])) {
    if (targets.length !== 1) return inconsistente()
    const next = inversao(working[0], command, command.tipo as string)
    if (!next.ok) return next
    working[0] = next.valor
  } else if (command.tipo === 'estornoConsumo') {
    if (!registro(command.origem) || command.origem.uid !== targets[0].uid || command.origem.id !== command.origemId || command.origem.tipo !== command.origemTipo || !umDe(command.origemTipo, ['compra', 'obrigacaoExterna']) || !idValido(command.origemId) || !dataCalendario(command.dataEfeito).ok || !valorPositivo(command.origem.valorTotalCentavos).ok || (command.origem.dataConsumo !== undefined && (!dataCalendario(command.origem.dataConsumo).ok || (command.dataEfeito as string) < (command.origem.dataConsumo as string))) || !Array.isArray(command.creditos) || !Array.isArray(command.reembolsos)) return inconsistente()
    const origin = command.origem as unknown as OrigemConsumo
    const sum = somar(command.creditos.map(c => registro(c) ? c.valorCentavos as number : NaN))
    if (!sum.ok) return sum
    if (sum.valor !== command.valorCentavos || sum.valor > origin.valorTotalCentavos!) return inconsistente()
    for (const refund of command.reembolsos) {
      if (!registro(refund) || !referenciaValida(refund.alvo)) return inconsistente()
      const i = working.findIndex(s => mesmaReferencia(s.alvo, refund.alvo as ReferenciaAlvo))
      if (i < 0) return inconsistente()
      const next = inversao(working[i], refund, 'reembolso', command.id)
      if (!next.ok) return next
      working[i] = next.valor
    }
    for (const credit of command.creditos) {
      if (!registro(credit) || !referenciaValida(credit.alvo)) return inconsistente()
      const creditTarget = credit.alvo
      const i = working.findIndex(s => mesmaReferencia(s.alvo, creditTarget) || s.alvo.tipo === 'fatura' && creditTarget.tipo === 'parcelaCartao' && s.itens?.some(item => item.id === creditTarget.id && item.origemId === origin.id))
      if (i < 0 || (working[i].alvo.tipo !== 'fatura' && working[i].origemId !== origin.id) || (working[i].alvo.tipo === 'fatura' && creditTarget.tipo !== 'parcelaCartao')) return inconsistente()
      const next = adicionarCredito(working[i], credit, origin.id, command.id)
      if (!next.ok) return next
      working[i] = next.valor
    }
    estornos.push({ id: command.id, uid: targets[0].uid, origemId: origin.id, origemTipo: origin.tipo, valorCentavos: command.valorCentavos as number, dataEfeito: command.dataEfeito as string, motivo: command.motivo, operacaoId: command.operacaoId })
  } else return falha('valorInvalido', 'Escolha uma operação de correção suportada.')
  const result: SnapshotAlvo[] = []
  for (const [i, next] of working.entries()) {
    const valid = validarSnapshot(atualizar(next, {}))
    if (!valid.ok) return valid
    if (JSON.stringify(next) === JSON.stringify(targets[i])) return inconsistente()
    result.push(valid.valor)
  }
  return sucesso({ snapshots: result, estornos, versoes: targets.map(s => ({ id: s.alvo.id, version: s.version })) })
}

export function preverEdicaoSerie(inputs: unknown, escopo: unknown, alteracoes: unknown): Resultado<{ alvos: readonly VersaoEsperada[]; impacto: readonly { id: string; antesCentavos: number; depoisCentavos: number }[]; preservados: readonly { id: string; motivo: 'liquidacaoPreservada' }[] }> {
  if (!Array.isArray(inputs) || inputs.length === 0 || inputs.length > 12 || !umDe(escopo, ['estaOcorrencia', 'estaEFuturasNaoLiquidadas']) || !registro(alteracoes) || !umDe(alteracoes.tipo, ['cancelar', 'cancelarOrigem', 'alterarValor', 'alterarVencimento']) || !idValido(alteracoes.origemId) || !idValido(alteracoes.alvoId) || !Array.isArray(alteracoes.expectedVersions)) return falha('valorInvalido', 'Informe escopo, origem e versões da prévia.')
  const all: SnapshotAlvo[] = []
  for (const input of inputs) { const valid = validarSnapshot(input); if (!valid.ok) return valid; all.push(valid.valor) }
  const start = all.find(s => s.alvo.id === alteracoes.alvoId)
  if (!start || all.some(s => s.uid !== start.uid) || new Set(all.map(s => `${s.alvo.tipo}:${s.alvo.id}`)).size !== all.length) return inconsistente()
  const selected = escopo === 'estaOcorrencia' ? [start] : all.filter(s => s.vencimento >= start.vencimento)
  if (alteracoes.tipo === 'cancelarOrigem') {
    const manifest = alteracoes.origemSerie
    if (selected.length !== all.length || !registro(manifest) || !Number.isInteger(manifest.quantidadeOriginal) || !Number.isInteger(manifest.numeroInicial) || (manifest.numeroInicial as number) < 1 || (manifest.quantidadeOriginal as number) > 12 || (manifest.quantidadeOriginal as number) < (manifest.numeroInicial as number) || !Array.isArray(manifest.parcelas) || manifest.parcelas.length !== (manifest.quantidadeOriginal as number) - (manifest.numeroInicial as number) + 1 || all.length !== manifest.parcelas.length) return inconsistente()
    const ids = new Set<string>(), ordinals = new Set<number>()
    for (const row of manifest.parcelas) {
      if (!registro(row) || !idValido(row.alvoId) || typeof row.numero !== 'number' || !Number.isInteger(row.numero) || row.numero < (manifest.numeroInicial as number) || row.numero > (manifest.quantidadeOriginal as number) || ids.has(row.alvoId) || ordinals.has(row.numero) || !all.some(s => s.alvo.id === row.alvoId)) return inconsistente()
      ids.add(row.alvoId); ordinals.add(row.numero)
    }
  }
  const impacto: { id: string; antesCentavos: number; depoisCentavos: number }[] = []
  const preserved: { id: string; motivo: 'liquidacaoPreservada' }[] = []
  const changed: SnapshotAlvo[] = []
  for (const s of selected) {
    const expected = alteracoes.expectedVersions.find(v => registro(v) && v.id === s.alvo.id)
    if (!registro(expected) || expected.version !== s.version) return conflito(s.version)
    if (s.origemId !== alteracoes.origemId && !s.itens?.some(it => it.origemId === alteracoes.origemId)) return inconsistente()
    const summary = calcular(s, s.vencimento)
    if (!summary.ok) return summary
    if (summary.valor.liquidadoLiquidoCentavos > 0 && escopo === 'estaEFuturasNaoLiquidadas' && alteracoes.tipo !== 'cancelarOrigem') { preserved.push({ id: s.alvo.id, motivo: 'liquidacaoPreservada' }); continue }
    if (summary.valor.liquidadoLiquidoCentavos > 0 || s.calendario?.ciclo === 'fechada' || s.fatura?.calendario?.ciclo === 'fechada' || s.estadoObrigacao === 'cancelada' || (alteracoes.tipo === 'alterarVencimento' && ['fatura', 'parcelaCartao'].includes(s.alvo.tipo))) return falha('valorInvalido', 'A alteração afeta histórico liquidado ou calendário de cartão protegido.')
    if (alteracoes.tipo === 'alterarVencimento' && !dataCalendario(alteracoes.vencimento).ok) return falha('dataInvalida', 'Informe o novo vencimento externo.')
    const next = alteracoes.tipo === 'alterarValor' ? valorPositivo(alteracoes.valorCentavos) : sucesso(summary.valor.exigivelCentavos)
    if (!next.ok) return next
    impacto.push({ id: s.alvo.id, antesCentavos: summary.valor.exigivelCentavos, depoisCentavos: umDe(alteracoes.tipo, ['cancelar', 'cancelarOrigem']) ? 0 : next.valor })
    changed.push(s)
  }
  if (!changed.length) return falha('valorInvalido', 'Não há compromissos elegíveis para esta alteração.')
  return sucesso({ alvos: changed.map(s => ({ id: s.alvo.id, version: s.version })), impacto, preservados: preserved })
}
