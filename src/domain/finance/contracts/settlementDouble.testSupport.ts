import { falha, sucesso } from '../errors'
import type { Resultado } from '../errors'
import { canonicalizarComando, identidadeNatural } from '../identity'
import { avaliarOrcamento } from '../operationBudget'
import { avaliarAjuste, avaliarLiquidacao, mesmaReferencia, validarSnapshot } from '../settlement'
import type { ComandoCorrecao, ComandoRegistrarLiquidacao, Confirmacao, ConsultaOperacao, PortaLiquidacao, SnapshotAlvo } from './commands'

export function comandoPagamento(operationKey = 'op1', id = 'p1', valorCentavos = 4000): ComandoRegistrarLiquidacao {
  return { contractVersion: 1, tipo: 'registrarLiquidacao', operationKey, expectedVersions: [{ id: 'ob1', version: 3 }], payload: { alvo: { tipo: 'obrigacaoExternaAvulsa', id: 'ob1' }, comando: { tipo: 'pagamento', id, valorCentavos, dataEfetiva: '2026-11-17', contaId: 'conta' } } }
}
export function criarLiquidacaoDouble(initial: SnapshotAlvo): PortaLiquidacao & { estado(): SnapshotAlvo; falha(modo: 'antes' | 'depois'): void; offline(value: boolean): void } {
  let target = structuredClone(initial), receipts = new Map<string, { canonico: string; resultado: Confirmacao }>()
  let failure: 'antes' | 'depois' | undefined, offline = false
  async function execute(command: ComandoRegistrarLiquidacao | ComandoCorrecao): Promise<Resultado<Confirmacao>> {
    await Promise.resolve()
    if (offline) return falha('indisponivel', 'Sem leitura remota confirmada.')
    const canonical = canonicalizarComando(command), operation = identidadeNatural(['operacao', command.tipo, command.operationKey])
    if (!canonical.ok) return canonical
    if (!operation.ok) return operation
    const previous = receipts.get(operation.valor)
    if (previous) return previous.canonico === canonical.valor ? sucesso(structuredClone(previous.resultado)) : falha('conflitoIdempotencia', 'Chave reutilizada com outro conteúdo.')
    const parsed = validarSnapshot(target)
    if (!parsed.ok) return parsed
    const expected = command.expectedVersions.find(v => v.id === target.alvo.id)
    if (command.expectedVersions.length !== 1 || expected?.version !== target.version) return falha('conflitoVersao', 'Recarregue o alvo.', { versaoAtual: target.version })
    let next: SnapshotAlvo
    if (command.tipo === 'registrarLiquidacao') {
      if (!mesmaReferencia(command.payload.alvo, target.alvo)) return falha('referenciaInvalida', 'Alvo fora do repositório vinculado.')
      const proposal = avaliarLiquidacao(target, { ...command.payload.comando, operacaoId: operation.valor, expectedVersion: expected.version })
      if (!proposal.ok) return proposal
      next = proposal.valor.snapshot
    } else {
      const proposal = avaliarAjuste(target, { ...command.payload, operacaoId: operation.valor, expectedVersion: expected.version })
      if (!proposal.ok) return proposal
      next = proposal.valor.snapshots[0]
    }
    const budget = avaliarOrcamento({ parcelas: 0, ocorrencias: 0, mutacoes: 3, bytesRequisicao: 16384, bytesDocumentos: [4096, 512, 2048], acessosPorOperacao: [2, 2, 2], expressoes: 100, incluiMetadados: true }, { status: 'simulacao', contractVersion: 1 })
    if (!budget.ok) return budget
    const confirmation: Confirmacao = { estado: 'confirmado', operacaoId: operation.valor, resultados: [{ tipo: target.alvo.tipo, id: target.alvo.id, version: next.version }] }
    const nextReceipts = new Map(receipts)
    nextReceipts.set(operation.valor, { canonico: canonical.valor, resultado: confirmation })
    if (failure === 'antes') { failure = undefined; return falha('indisponivel', 'Falha antes do commit.') }
    target = next; receipts = nextReceipts
    if (failure === 'depois') { failure = undefined; return falha('confirmacaoIndeterminada', 'Resposta perdida.', { recuperacao: 'repetirMesmaChave' }) }
    return sucesso(structuredClone(confirmation))
  }
  return {
    estado: () => structuredClone(target),
    falha(modo) { failure = modo }, offline(value) { offline = value },
    registrar: execute, corrigir: execute,
    async consultarOperacao(tipo, chave): Promise<Resultado<ConsultaOperacao>> {
      if (offline) return sucesso({ estado: 'indeterminado' })
      const key = identidadeNatural(['operacao', tipo, chave])
      if (!key.ok) return key
      const receipt = receipts.get(key.valor)
      return sucesso(receipt ? structuredClone(receipt.resultado) : { estado: 'ausenteConfirmado' })
    },
  }
}
