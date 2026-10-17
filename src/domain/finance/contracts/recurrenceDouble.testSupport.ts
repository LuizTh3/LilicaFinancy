import { falha, sucesso } from '../errors'
import type { Resultado } from '../errors'
import { canonicalizarComando, identidadeNatural } from '../identity'
import { avaliarOrcamento } from '../operationBudget'
import { confirmarValorOcorrencia, projetarOcorrencias } from '../recurrence'
import type { MoldeRecorrencia, Ocorrencia } from '../recurrence'
import type { ComandoConfirmarOcorrencia, ComandoMaterializar, Confirmacao, PortaRecorrencia, SnapshotAlvo } from './commands'

export function comandoMaterializar(): ComandoMaterializar {
  return { contractVersion: 1, tipo: 'materializarOcorrencias', operationKey: 'mat1', expectedVersions: [{ id: 'energia', version: 2 }], payload: { recorrenciaId: 'energia', competencias: ['2026-11', '2026-12'] } }
}
export function criarRecorrenciaDouble(uid = 'A', existentes: readonly Ocorrencia[] = []): PortaRecorrencia & { estado(): readonly Ocorrencia[]; falha(modo: 'antes' | 'depois'): void } {
  const molde: MoldeRecorrencia = { id: 'energia', uid, schemaVersion: 1, version: 2, tipo: 'obrigacaoExterna', descricao: 'Energia', categoriaId: 'cat', valorCentavos: 15000, estimado: true, inicio: '2026-10-01', diaAncora: 30, frequencia: 'mensal', estado: 'ativa' }
  let occurrences = new Map(existentes.map(o => [o.id, structuredClone(o)])), receipts = new Map<string, { canonico: string; resultado: Confirmacao }>()
  let failure: 'antes' | 'depois' | undefined
  async function execute(command: ComandoMaterializar | ComandoConfirmarOcorrencia): Promise<Resultado<Confirmacao>> {
    await Promise.resolve()
    const canonical = canonicalizarComando(command), key = identidadeNatural(['operacao', command.tipo, command.operationKey])
    if (!canonical.ok) return canonical
    if (!key.ok) return key
    const previous = receipts.get(key.valor)
    if (previous) return previous.canonico === canonical.valor ? sucesso(structuredClone(previous.resultado)) : falha('conflitoIdempotencia', 'A chave pertence a outra intenção.')
    const next = new Map(occurrences)
    const results: { tipo: string; id: string; version: number }[] = []
    let count = 0
    if (command.tipo === 'materializarOcorrencias') {
      const p = command.payload
      if (p.recorrenciaId !== molde.id || command.expectedVersions.length !== 1 || command.expectedVersions[0].id !== molde.id || command.expectedVersions[0].version !== molde.version) return falha('conflitoVersao', 'Recarregue o molde.', { versaoAtual: molde.version })
      if (p.competencias.length > 12) return falha('limiteOperacional', 'Materialize até12 competências por comando.')
      if (p.excecoes && (new Set(p.excecoes.map(e => e.competencia)).size !== p.excecoes.length || p.excecoes.some(e => !p.competencias.includes(e.competencia)))) return falha('referenciaInvalida', 'Exceção fora das competências selecionadas.')
      const projection = projetarOcorrencias(molde, p.competencias, [...occurrences.values()])
      if (!projection.ok) return projection
      for (const projected of projection.valor) {
        let occurrence = projected
        if (!occurrences.has(projected.id)) {
          const exception = p.excecoes?.find(e => e.competencia === projected.competenciaOcorrencia)
          if (exception) {
            const confirmed = confirmarValorOcorrencia({ ocorrencia: projected }, exception.valorDefinitivo, projected.version)
            if (!confirmed.ok) return confirmed
            occurrence = confirmed.valor.ocorrencia
          }
          next.set(occurrence.id, { ...occurrence, materializada: true })
          count++
        }
        results.push({ tipo: occurrence.tipo, id: occurrence.id, version: occurrence.version })
      }
    } else {
      const current = occurrences.get(command.payload.ocorrenciaId)
      if (!current || current.uid !== uid) return falha('naoEncontrado', 'Ocorrência não encontrada neste usuário.')
      if (command.expectedVersions.length !== 1 || command.expectedVersions[0].id !== current.id) return falha('conflitoVersao', 'Informe a versão da ocorrência.')
      const date = current.tipo === 'receita' ? current.dataPrevista : current.vencimento
      const snapshot: SnapshotAlvo = { uid, schemaVersion: 1, version: current.version, alvo: { tipo: current.tipo === 'receita' ? 'receita' : 'obrigacaoExternaAvulsa', id: current.id }, completo: true, revisao: { antes: current.version, depois: current.version }, estadoObrigacao: current.estadoObrigacao, vencimento: date, valorOriginalCentavos: current.valorCentavos, origemId: current.id, estimado: current.estimado, contas: [], fatos: [], creditos: [] }
      const confirmed = confirmarValorOcorrencia({ ocorrencia: current, snapshot }, command.payload.valorDefinitivo, command.expectedVersions[0].version)
      if (!confirmed.ok) return confirmed
      next.set(current.id, confirmed.valor.ocorrencia)
      results.push({ tipo: current.tipo, id: current.id, version: confirmed.valor.ocorrencia.version })
      count = 1
    }
    const writes = count + 1
    const budget = avaliarOrcamento({ parcelas: 0, ocorrencias: command.tipo === 'materializarOcorrencias' ? command.payload.competencias.length : 1, mutacoes: writes, bytesRequisicao: 65536, bytesDocumentos: Array(writes).fill(2048), acessosPorOperacao: Array(writes).fill(1), expressoes: 100, incluiMetadados: true }, { status: 'simulacao', contractVersion: 1 })
    if (!budget.ok) return budget
    const confirmation: Confirmacao = { estado: 'confirmado', operacaoId: key.valor, resultados: results }
    const nextReceipts = new Map(receipts)
    nextReceipts.set(key.valor, { canonico: canonical.valor, resultado: confirmation })
    if (failure === 'antes') { failure = undefined; return falha('indisponivel', 'Falha antes do commit.') }
    occurrences = next; receipts = nextReceipts
    if (failure === 'depois') { failure = undefined; return falha('confirmacaoIndeterminada', 'Resposta perdida; consulte a mesma chave.', { recuperacao: 'repetirMesmaChave' }) }
    return sucesso(structuredClone(confirmation))
  }
  return { materializar: execute, confirmar: execute, estado: () => structuredClone([...occurrences.values()]), consultarOcorrencias: async () => sucesso(structuredClone([...occurrences.values()])), falha(modo) { failure = modo } }
}
