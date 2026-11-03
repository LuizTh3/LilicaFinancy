import { doc, getDocFromServer, runTransaction, serverTimestamp } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import type { Cadastro, Colecao } from '../../domain/finance/contracts/cadastros'
import type { ConfirmacaoParcelada, DescritorParcelado, EventoCriacaoParcelada, PortaParcelados } from '../../domain/finance/contracts/parcelados'
import { falha, registro, sucesso } from '../../domain/finance/errors'
import type { CodigoErro, Resultado } from '../../domain/finance/errors'
import { perfilParceladosRemoto } from '../../domain/finance/operationBudget'
import { criarSerieParcelada } from '../../domain/finance/parcelados'
import { canonicoParcelado, descritorParceladoValido, normalizarCriacaoParcelada } from '../../domain/finance/parceladosCommands'
import { decodeCadastro } from './cadastrosMapper'
import { decodeCriacaoParcelada, encodeSerieParcelada } from './parceladosMapper'
import { criarComprovanteParcelado, orcamentoCriacaoComprovada } from '../../domain/finance/parceladosWitness'

export type ContextoParcelados = Readonly<{ uid: string; generation: number; atual: () => boolean; agora?: () => number }>
function abortar(codigo: CodigoErro): never { throw Object.assign(new Error(codigo), { dominio: codigo }) }
function erro(e: unknown): Resultado<never> {
  const code = (e as { dominio?: CodigoErro; code?: string })
  const codigo = code?.dominio ?? (code?.code === 'schema' ? 'esquemaIncompativel' : code?.code === 'permission-denied' || code?.code === 'unauthenticated' ? 'semPermissao' : code?.code === 'resource-exhausted' ? 'cotaExcedida' : 'indisponivel')
  return falha(codigo, 'Não foi possível confirmar a série. Preserve a intenção e consulte o resultado.', { recuperacao: codigo === 'semPermissao' ? 'verificarAcesso' : 'repetirMesmaChave' })
}
const confirmar = (r: EventoCriacaoParcelada): ConfirmacaoParcelada => ({ estado: 'confirmado', operacaoId: r.id, seriesIds: r.seriesIds, resultVersions: r.resultVersions })

export function createParceladosRepository(db: Firestore, ctx: ContextoParcelados, afterCommit?: () => Promise<void>): PortaParcelados {
  const check = () => { if (!ctx.uid || !ctx.atual()) abortar('semPermissao') }
  const ref = (colecao: string, id: string) => doc(db, 'users', ctx.uid, colecao, id)
  const agora = () => ctx.agora?.() ?? Date.now()
  function conferir(r: unknown, d: DescritorParcelado, comando?: unknown): EventoCriacaoParcelada {
    const receipt = decodeCriacaoParcelada(ctx.uid, `criarSerie__${d.operationKey}`, r)
    if (receipt.comando.serieId !== d.serieId || receipt.expectedVersions[d.serieId] !== d.expectedVersion || comando && canonicoParcelado(receipt.comando) !== canonicoParcelado(comando)) abortar('conflitoIdempotencia')
    return receipt
  }
  async function consultarOperacao(d: DescritorParcelado): ReturnType<PortaParcelados['consultarOperacao']> {
    try {
      check()
      if (!descritorParceladoValido(d) || d.tipo !== 'criarSerie') return falha('valorInvalido', 'Descritor de criação inválido.')
      const receipt = await getDocFromServer(ref('operacoesParceladas', `criarSerie__${d.operationKey}`)); check()
      return receipt.exists() ? sucesso(confirmar(conferir(receipt.data(), d))) : sucesso({ estado: 'ausenteConfirmado' })
    } catch (e) { const failure = erro(e); return !failure.ok && failure.erro.codigo === 'indisponivel' ? sucesso({ estado: 'indeterminado' }) : failure }
  }
  return {
    consultarOperacao,
    async criarSerie(input) {
      let normalizado: Extract<ReturnType<typeof normalizarCriacaoParcelada>, { ok: true }>['valor'] | undefined
      try {
        check()
        const perfil = perfilParceladosRemoto('criarSerie')
        if (perfil.status !== 'validadoNoProjeto') return falha('configuracaoPendente', 'Gravação de séries aguarda validação remota.')
        if (!registro(input) || Object.keys(input).some(k => !['descritor', 'entrada', 'conferencia'].includes(k))) return falha('valorInvalido', 'Confira a intenção e a prévia.')
        const valid = normalizarCriacaoParcelada({ descritor: input.descritor, entrada: input.entrada })
        if (!valid.ok) return valid
        normalizado = valid.valor
        const { descritor: d, comando, conferencia } = normalizado
        if (conferencia !== input.conferencia) return falha('conflitoVersao', 'A entrada mudou. Confira novamente.', { recuperacao: 'reler' })
        const eventoId = `criarSerie__${d.operationKey}`
        // Recovery precedes reference preflight: later archival cannot erase confirmation.
        const known = await getDocFromServer(ref('operacoesParceladas', eventoId)); check()
        if (known.exists()) return sucesso(confirmar(conferir(known.data(), d, comando)))
        const existente = await getDocFromServer(ref('seriesParceladas', d.serieId)); check()
        if (existente.exists()) abortar('conflitoVersao')
        const referencias = comando.criacao.referencias
        const referenciasLidas = new Map<string, Cadastro>()
        const targets: { colecao: Colecao; id: string }[] = [{ colecao: 'categorias', id: referencias.categoriaId }, ...(referencias.titularId ? [{ colecao: 'titulares' as const, id: referencias.titularId }] : []), ...(referencias.contaPrevistaId ? [{ colecao: 'contas' as const, id: referencias.contaPrevistaId }] : []), ...(referencias.etiquetaIds ?? []).map(id => ({ colecao: 'etiquetas' as const, id }))]
        for (const t of targets) {
          const s = await getDocFromServer(ref(t.colecao, t.id)); check()
          if (!s.exists()) abortar('referenciaInvalida')
          const c = decodeCadastro(ctx.uid, t.colecao, t.id, s.data())
          if (c.dados.estado !== 'ativo' || t.colecao === 'categorias' && c.dados.natureza !== 'despesa') abortar('referenciaInvalida')
          referenciasLidas.set(`${t.colecao}/${t.id}`, c)
        }
        const categoria = referenciasLidas.get(`categorias/${referencias.categoriaId}`)!
        const plano = criarSerieParcelada(input.entrada, { uid: ctx.uid, id: d.serieId, operationKey: d.operationKey, instante: agora() })
        if (!plano.ok) return plano
        const docs = encodeSerieParcelada(plano.valor)
        const comprovante = criarComprovanteParcelado(plano.valor)
        if (!comprovante.ok) return comprovante
        const eventBase = { schemaVersion: 1, contractVersion: 1, tipo: 'criarSerie', operationKey: d.operationKey, seriesIds: [d.serieId], expectedVersions: { [d.serieId]: 0 }, resultVersions: { [d.serieId]: 1 }, comando }
        const custo = orcamentoCriacaoComprovada({ titular: !!referencias.titularId, contaPrevista: !!referencias.contaPrevistaId, etiquetas: referencias.etiquetaIds?.length ?? 0, primeiroUsoCategoria: !categoria.usoFinanceiro, substituicao: false })
        if (!custo.ok) return custo
        const images = [docs, { ...eventBase, createdAt: agora() }, comprovante.valor.dados]
        const tamanhos = images.map(d => new TextEncoder().encode(JSON.stringify(d)).length)
        if (custo.valor.acessos > perfil.acessosMaximos || perfil.acessosPorEscrita.some(n => n > 8) || perfil.mutacoesMaximas < custo.valor.mutacoes || tamanhos.some(n => n > 32768) || tamanhos.reduce((a, b) => a + b, 0) > 1048576) abortar('limiteOperacional')
        const result = await runTransaction(db, async tx => {
          check()
          const receipt = await tx.get(ref('operacoesParceladas', eventoId)); check()
          if (receipt.exists()) return confirmar(conferir(receipt.data(), d, comando))
          // Target absence is a preflight convenience. Rules must reject this
          // creation command against an existing S; avoid a redundant atomic read.
          let primeiroUso = !categoria.usoFinanceiro
          if (primeiroUso) {
            const c = await tx.get(ref('categorias', referencias.categoriaId)); check()
            if (!c.exists()) abortar('referenciaInvalida')
            const fresh = decodeCadastro(ctx.uid, 'categorias', referencias.categoriaId, c.data())
            if (fresh.dados.estado !== 'ativo' || fresh.dados.natureza !== 'despesa') abortar('referenciaInvalida')
            primeiroUso = !fresh.usoFinanceiro
          }
          const stamp = serverTimestamp()
          tx.set(ref('seriesParceladas', d.serieId), { ...docs, createdAt: stamp, updatedAt: stamp })
          tx.set(ref('operacoesParceladas', eventoId), { ...eventBase, createdAt: stamp })
          tx.set(ref('validacoesParceladas', comprovante.valor.id), { ...comprovante.valor.dados, createdAt: stamp })
          if (primeiroUso) tx.update(ref('categorias', referencias.categoriaId), { schemaVersion: 2, usoFinanceiro: { eventoId, origemId: d.serieId, papel: 'classificacao', createdAt: stamp } })
          return { estado: 'confirmado' as const, operacaoId: eventoId, seriesIds: [d.serieId], resultVersions: { [d.serieId]: 1 } }
        })
        check(); await afterCommit?.(); check()
        return sucesso(result)
      } catch (e) {
        if (normalizado && ctx.atual()) {
          try {
            const d = normalizado.descritor, receipt = await getDocFromServer(ref('operacoesParceladas', `criarSerie__${d.operationKey}`)); check()
            if (receipt.exists()) return sucesso(confirmar(conferir(receipt.data(), d, normalizado.comando)))
          } catch (recovery) { return erro(recovery) }
        }
        return erro(e)
      }
    },
  }
}
