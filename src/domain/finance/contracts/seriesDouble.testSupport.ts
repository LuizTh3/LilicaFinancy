import { falha, sucesso } from '../errors'
import type { Resultado } from '../errors'
import { canonicalizarComando, identidadeNatural } from '../identity'
import { montarCronograma } from '../installments'
import { avancarCompetencia, dataNaCompetencia } from '../calendar'
import { avaliarOrcamento } from '../operationBudget'
import { ler } from '../testing.testSupport'
import type { ComandoSerie, Confirmacao, ConsultaOperacao, PortaCriarSerie } from './commands'

export function comandoSerie(operationKey = 'op1', origemId = 'compra1'): ComandoSerie {
  const faturas = [0, 1, 2].map(i => {
    const competencia = ler(avancarCompetencia('2026-11', i))
    return { id: ler(identidadeNatural(['fatura', 'card', competencia])), calendario: { competencia, fechamento: ler(dataNaCompetencia(competencia, 10)), vencimento: ler(dataNaCompetencia(competencia, 17)) } }
  })
  const entradaCronograma = { origemDados: 'nova', totalCentavos: 10000, quantidadeOriginal: 3, primeiraCompetencia: '2026-11', primeiroVencimento: '2026-11-17', diaAncora: 17, faturas: faturas.map(f => f.calendario) }
  return { contractVersion: 1, tipo: 'criarCompra', operationKey, expectedVersions: [], payload: { origemId, origemTipo: 'compra', cartaoId: 'card', categoriaId: 'cat', entradaCronograma, parcelas: ler(montarCronograma(entradaCronograma)), faturas } }
}

// A bounded fixture, not a repository framework. One synchronous commit is its linearization point.
export function criarSerieDouble(uid: string, cadastros: readonly { id: string; uid: string; estadoCadastro: 'ativo' | 'arquivado' }[] = [{ id: 'cat', uid: 'A', estadoCadastro: 'ativo' }, { id: 'card', uid: 'A', estadoCadastro: 'ativo' }, { id: 'categoriaB', uid: 'B', estadoCadastro: 'ativo' }]): PortaCriarSerie & { falha(modo: 'antes' | 'depois'): void; estado(): { origens: number; parcelas: number; faturas: number; recibos: number } } {
  let origins = new Set<string>(), installments = new Set<string>()
  let invoices = new Map<string, { version: number; calendario: string }>()
  let receipts = new Map<string, { canonico: string; resultado: Confirmacao }>()
  let failure: 'antes' | 'depois' | undefined
  const references = new Map(cadastros.map(cadastro => [cadastro.id, { ...cadastro }]))
  const ativa = (id: string) => references.get(id)?.uid === uid && references.get(id)?.estadoCadastro === 'ativo'
  return {
    falha(modo) { failure = modo },
    estado: () => ({ origens: origins.size, parcelas: installments.size, faturas: invoices.size, recibos: receipts.size }),
    async consultarOperacao(tipo, chave): Promise<Resultado<ConsultaOperacao>> {
      const id = identidadeNatural(['operacao', tipo, chave])
      if (!id.ok) return id
      const receipt = receipts.get(id.valor)
      return sucesso(receipt ? structuredClone(receipt.resultado) : { estado: 'ausenteConfirmado' })
    },
    async criar(command) {
      await Promise.resolve()
      const canonical = canonicalizarComando(command), operation = identidadeNatural(['operacao', command.tipo, command.operationKey])
      if (!canonical.ok) return canonical
      if (!operation.ok) return operation
      const previous = receipts.get(operation.valor)
      if (previous) return previous.canonico === canonical.valor ? sucesso(structuredClone(previous.resultado)) : falha('conflitoIdempotencia', 'A chave já pertence a outra intenção.')
      const p = command.payload
      if (!ativa(p.categoriaId) || p.origemTipo === 'compra' && !ativa(p.cartaoId ?? '')) return falha('referenciaInvalida', 'Referência arquivada ou fora do contexto do usuário.')
      if (origins.has(p.origemId)) return falha('conflitoVersao', 'A origem já existe.')
      if ((command.tipo === 'criarCompra') !== (p.origemTipo === 'compra')) return falha('referenciaInvalida', 'Tipo da origem divergente.')
      const schedule = montarCronograma(p.entradaCronograma)
      if (!schedule.ok) return schedule
      if (p.parcelas.length !== schedule.valor.length || p.parcelas.some((row, i) => Object.keys(row).length !== Object.keys(schedule.valor[i]).length || Object.entries(schedule.valor[i]).some(([key, value]) => row[key as keyof typeof row] !== value))) return falha('referenciaInvalida', 'O cronograma enviado está incompleto ou diverge da origem.')
      if (p.origemTipo === 'compra' && p.faturas.length !== p.parcelas.length || p.origemTipo !== 'compra' && p.faturas.length !== 0) return falha('referenciaInvalida', 'Faltam faturas do cronograma.')
      const writes = 2 + p.parcelas.length + p.faturas.length
      const budget = avaliarOrcamento({ parcelas: p.entradaCronograma.quantidadeOriginal, ocorrencias: 0, mutacoes: writes, bytesRequisicao: 32768, bytesDocumentos: Array(writes).fill(512), acessosPorOperacao: Array(writes).fill(1), expressoes: 100, incluiMetadados: true }, { status: 'simulacao', contractVersion: 1 })
      if (!budget.ok) return budget
      const nextOrigins = new Set(origins), nextItems = new Set(installments), nextInvoices = new Map(invoices), nextReceipts = new Map(receipts)
      const result: { tipo: string; id: string; version: number }[] = [{ tipo: p.origemTipo, id: p.origemId, version: 1 }]
      for (const [i, item] of p.parcelas.entries()) {
        const id = identidadeNatural(['parcela', p.origemTipo, p.origemId, item.numero])
        if (!id.ok) return id
        if (nextItems.has(id.valor)) return falha('conflitoVersao', 'A parcela já existe.')
        nextItems.add(id.valor)
        result.push({ tipo: 'parcela', id: id.valor, version: 1 })
        if (p.origemTipo !== 'compra') continue
        const invoice = p.faturas[i], expectedID = identidadeNatural(['fatura', p.cartaoId, invoice.calendario.competencia])
        if (!expectedID.ok) return expectedID
        if (invoice.id !== expectedID.valor || invoice.calendario.competencia !== item.competenciaPlanejamento || invoice.calendario.vencimento !== item.vencimento) return falha('referenciaInvalida', 'O vínculo da parcela diverge da fatura.')
        const current = nextInvoices.get(invoice.id)
        const expected = command.expectedVersions.find(v => v.id === invoice.id)
        if (current && (expected?.version !== current.version || JSON.stringify(invoice.calendario) !== current.calendario)) return falha('conflitoVersao', 'A fatura mudou.', { versaoAtual: current.version })
        const version = (current?.version ?? 0) + 1
        nextInvoices.set(invoice.id, { version, calendario: JSON.stringify(invoice.calendario) })
        result.push({ tipo: 'fatura', id: invoice.id, version })
      }
      nextOrigins.add(p.origemId)
      const confirmation: Confirmacao = { estado: 'confirmado', operacaoId: operation.valor, resultados: result }
      nextReceipts.set(operation.valor, { canonico: canonical.valor, resultado: confirmation })
      if (failure === 'antes') { failure = undefined; return falha('indisponivel', 'Falha antes do commit.', { recuperacao: 'repetirMesmaChave' }) }
      origins = nextOrigins; installments = nextItems; invoices = nextInvoices; receipts = nextReceipts
      if (failure === 'depois') { failure = undefined; return falha('confirmacaoIndeterminada', 'Resposta perdida depois do commit.', { recuperacao: 'repetirMesmaChave' }) }
      return sucesso(structuredClone(confirmation))
    },
  }
}
