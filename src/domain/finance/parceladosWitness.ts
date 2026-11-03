import { camposPermitidos, falha, registro, sucesso } from './errors'
import { validarSerieParcelada } from './parcelados'

export function criarComprovanteParcelado(input: unknown) {
  const serie = validarSerieParcelada(input)
  if (!serie.ok) return serie
  const s = serie.valor
  if (s.version !== 1 || s.createdAt !== s.updatedAt || !/^(criarSerie|substituirSerie)__/.test(s.ultimoEventoId)) return falha('valorInvalido', 'O comprovante exige a criação de uma série nova.')
  return sucesso({ id: `${s.ultimoEventoId}__${s.id}`, dados: { schemaVersion: 1 as const, serieId: s.id, eventoId: s.ultimoEventoId, resultVersion: 1 as const, createdAt: s.createdAt } })
}
/** Candidate access graph; does not enable a remotely unproven profile. */
export function orcamentoCriacaoComprovada(input: unknown) {
  const erro = () => falha('limiteOperacional', 'A operação inteira excede o orçamento do comprovante. Nenhuma série foi alterada.', { limite: 18 })
  if (!registro(input) || !camposPermitidos(input, ['titular', 'contaPrevista', 'etiquetas', 'primeiroUsoCategoria', 'substituicao']) || !['titular', 'contaPrevista', 'primeiroUsoCategoria', 'substituicao'].every(k => typeof input[k] === 'boolean') || typeof input.etiquetas !== 'number' || !Number.isInteger(input.etiquetas) || input.etiquetas < 0 || input.etiquetas > 5) return erro()
  const h = Number(input.titular), p = Number(input.contaPrevista), k = Number(input.primeiroUsoCategoria), troca = Number(input.substituicao)
  const acessosPorEscrita = [...(troca ? [1] : []), 3 + h + p, 2 + troca + input.etiquetas, 2, ...(k ? [2] : [])]
  const leiturasTransacionais = 1 + troca + k, acessos = acessosPorEscrita.reduce((a, b) => a + b, 0) + leiturasTransacionais
  return acessos > 18 || acessosPorEscrita.some(n => n > 8) ? erro() : sucesso({ acessos, acessosPorEscrita, leiturasTransacionais, mutacoes: 3 + troca + k })
}
