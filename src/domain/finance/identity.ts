import { competencia } from './calendar'
import { camposPermitidos, falha, registro, sucesso, versaoValida } from './errors'
import type { Resultado } from './errors'

export const tiposComando = ['criarCompra', 'criarObrigacaoParcelada', 'registrarLiquidacao', 'aplicarCorrecao', 'corrigirSerie', 'materializarOcorrencias', 'confirmarValorOcorrencia'] as const
export type TipoComando = typeof tiposComando[number]
export const idAvulsoValido = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id)
export function identidadeNatural(tupla: unknown): Resultado<string> {
  if (!Array.isArray(tupla)) return falha('valorInvalido', 'Informe uma tupla de identidade tipada.')
  const [tag, a, b, c] = tupla
  const valid = tag === 'parcela' ? tupla.length === 4 && ['compra', 'obrigacaoExterna'].includes(a) && idAvulsoValido(b) && Number.isInteger(c) && c >= 1 && c <= 12
    : tag === 'fatura' || tag === 'ocorrencia' ? tupla.length === 3 && idAvulsoValido(a) && competencia(b).ok
    : tag === 'operacao' ? tupla.length === 3 && tiposComando.includes(a) && idAvulsoValido(b) : false
  if (!valid) return falha('valorInvalido', 'A identidade contém tipo, referência ou ordinal inválido.')
  const bytes = new TextEncoder().encode(JSON.stringify(tupla))
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  let encoded = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1] ?? 0, c = bytes[i + 2] ?? 0
    encoded += alphabet[a >> 2] + alphabet[((a & 3) << 4) | (b >> 4)]
    if (i + 1 < bytes.length) encoded += alphabet[((b & 15) << 2) | (c >> 6)]
    if (i + 2 < bytes.length) encoded += alphabet[c & 63]
  }
  const id = `k1_${encoded}`
  return id.length <= 512 ? sucesso(id) : falha('limiteOperacional', 'A identidade excede 512 bytes.', { limite: 512 })
}
const camposPayload = ['origemId', 'origemTipo', 'origem', 'cartaoId', 'categoriaId', 'titularId', 'etiquetaIds', 'entradaCronograma', 'parcelas', 'faturas', 'alvo', 'comando', 'tipo', 'id', 'valorCentavos', 'dataEfetiva', 'contaId', 'originalId', 'motivo', 'dataEfeito', 'creditos', 'reembolsos', 'recorrenciaId', 'competencias', 'ocorrenciaId', 'valorDefinitivo', 'excecoes', 'escopo', 'alteracoes']
export function canonicalizarComando(input: unknown): Resultado<string> {
  if (!registro(input) || !camposPermitidos(input, ['contractVersion', 'tipo', 'operationKey', 'payload', 'expectedVersions']) || input.contractVersion !== 1 || !tiposComando.includes(input.tipo as TipoComando) || !idAvulsoValido(input.operationKey) || !registro(input.payload) || !camposPermitidos(input.payload, camposPayload) || !Array.isArray(input.expectedVersions)) return falha('valorInvalido', 'O comando não corresponde ao contrato suportado.')
  const ids = new Set<string>()
  for (const expected of input.expectedVersions) {
    if (!registro(expected) || !camposPermitidos(expected, ['id', 'version']) || typeof expected.id !== 'string' || !/^[A-Za-z0-9_-]{1,512}$/.test(expected.id) || !versaoValida(expected.version) || ids.has(expected.id)) return falha('valorInvalido', 'Informe versões esperadas distintas e válidas.')
    ids.add(expected.id)
  }
  const seen = new Set<object>()
  function canonical(value: unknown, key = '', depth = 0): Resultado<unknown> {
    if (depth > 20) return falha('limiteOperacional', 'O comando excede a profundidade permitida.')
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return sucesso(value)
    if (typeof value === 'number') return Number.isSafeInteger(value) && (!key.endsWith('Centavos') || value >= 0) ? sucesso(value === 0 ? 0 : value) : falha('valorInvalido', 'Use somente números inteiros seguros no comando.')
    if (!Array.isArray(value) && !registro(value)) return falha('valorInvalido', 'O comando contém um valor não serializável.')
    if (seen.has(value)) return falha('valorInvalido', 'Referências cíclicas não são permitidas.')
    seen.add(value)
    let result: unknown
    if (Array.isArray(value)) {
      const list: unknown[] = []
      for (const item of value) { const next = canonical(item, key, depth + 1); if (!next.ok) return next; list.push(next.valor) }
      if (key === 'etiquetaIds' || key === 'competencias') {
        if (list.some(item => typeof item !== 'string') || new Set(list).size !== list.length) return falha('valorInvalido', 'O conjunto contém entradas inválidas ou repetidas.')
        list.sort()
      }
      if (key === 'expectedVersions') list.sort((a, b) => (a as { id: string }).id < (b as { id: string }).id ? -1 : (a as { id: string }).id > (b as { id: string }).id ? 1 : 0)
      result = list
    } else {
      const out: Record<string, unknown> = Object.create(null)
      for (const field of Object.keys(value).sort()) {
        const next = canonical(value[field], field, depth + 1)
        if (!next.ok) return next
        out[field] = next.valor
      }
      result = out
    }
    seen.delete(value)
    return sucesso(result)
  }
  const normalized = canonical(input)
  if (!normalized.ok) return normalized
  const json = JSON.stringify(normalized.valor)
  return new TextEncoder().encode(json).length <= 16384 ? sucesso(json) : falha('limiteOperacional', 'O conteúdo da operação excede 16 KiB.', { limite: 16384 })
}
