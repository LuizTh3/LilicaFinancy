import { doc, getDocFromServer, runTransaction, serverTimestamp } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { prepararCriacaoCompraFinanceira } from '../../domain/finance/comprasFinanceiras'
import { descritorCompraFinanceiraValido, normalizarIntencaoCriacaoCompra } from '../../domain/finance/comprasFinanceirasCommands'
import type { ConfirmacaoCompraFinanceira, ConsultaOperacaoCompraFinanceira, DescritorCompraFinanceira, EventoCriacaoCompraFinanceira, IntencaoCriacaoCompraFinanceira, PortaComprasFinanceiras } from '../../domain/finance/contracts/comprasFinanceiras'
import { falha, registro, sucesso } from '../../domain/finance/errors'
import type { CodigoErro, Resultado } from '../../domain/finance/errors'
import type { FaturaFinanceira } from '../../domain/finance/faturaFinanceira'
import { perfilComprasFinitaRemoto } from '../../domain/finance/operationBudget'
import { decodeCadastro } from './cadastrosMapper'
import { decodeCartao } from './cartoesMapper'
import { decodeEventoCriacaoCompraFinanceira } from './comprasFinanceirasMapper'
import { decodeFaturaFinanceira } from './liquidacoesFaturasMapper'

type Contexto = Readonly<{ uid: string; generation: number; atual: () => boolean; hoje: string; agora?: () => number }>
function abortar(dominio: CodigoErro): never { throw Object.assign(new Error(dominio), { dominio }) }
function erro(error: unknown, tentativa: boolean): Resultado<never> {
  const e = error as { dominio?: CodigoErro; code?: string }
  const codigo: CodigoErro = e?.dominio ?? (e?.code === 'schema' ? 'esquemaIncompativel' : ['permission-denied', 'unauthenticated'].includes(e?.code ?? '') ? 'semPermissao' : e?.code === 'resource-exhausted' ? 'cotaExcedida' : e?.code === 'aborted' ? 'conflitoVersao' : tentativa ? 'confirmacaoIndeterminada' : 'indisponivel')
  return falha(codigo, 'Não foi possível confirmar a compra. Preserve a intenção e consulte o resultado.', { recuperacao: codigo === 'semPermissao' ? 'verificarAcesso' : codigo === 'conflitoVersao' ? 'reler' : 'repetirMesmaChave' })
}
function confirmacao(evento: EventoCriacaoCompraFinanceira, verificacao: ConfirmacaoCompraFinanceira['verificacao']): ConfirmacaoCompraFinanceira {
  return { estado: 'confirmado', operacaoId: evento.id, compraId: evento.compraId, resultVersion: 1, faturasVersions: Object.freeze(Object.fromEntries(Object.entries(evento.comando.faturas).map(([id, t]) => [id, t.resultVersion]))), verificacao }
}
/** Full creation protocol, deliberately disabled in production until source + real SDK gates pass. */
export function createComprasFinanceirasRepository(db: Firestore, ctx: Contexto, afterCommit?: () => Promise<void>): PortaComprasFinanceiras {
  const check = () => { if (!ctx.uid || !ctx.atual()) abortar('semPermissao') }
  const ref = (collection: 'compras' | 'operacoesCompras' | 'faturas' | 'cartoes' | 'categorias' | 'etiquetas', id: string) => doc(db, 'users', ctx.uid, collection, id)
  function conferir(raw: unknown, d: DescritorCompraFinanceira, intencao?: IntencaoCriacaoCompraFinanceira) {
    const r = decodeEventoCriacaoCompraFinanceira(ctx.uid, `criarCompra__${d.operationKey}`, raw)
    if (r.compraId !== d.compraId) abortar('conflitoIdempotencia')
    if (intencao) {
      const normal = normalizarIntencaoCriacaoCompra({ descritor: d, compra: { ...r.comando.depois, uid: ctx.uid, id: r.compraId, ultimoEventoId: r.id, createdAt: r.createdAt, updatedAt: r.createdAt, comandoAtual: r.comando } })
      if (!normal.ok || normal.valor.conferencia !== intencao.conferencia) abortar('conflitoIdempotencia')
    }
    return confirmacao(r, intencao ? 'comandoCompleto' : 'descritor')
  }
  function intencaoValida(input: unknown): IntencaoCriacaoCompraFinanceira {
    if (!registro(input) || Object.keys(input).some(k => !['descritor', 'compra', 'conferencia'].includes(k))) abortar('valorInvalido')
    const valid = normalizarIntencaoCriacaoCompra({ descritor: input.descritor, compra: input.compra })
    if (!valid.ok) abortar(valid.erro.codigo)
    if (valid.valor.compra.uid !== ctx.uid) abortar('semPermissao')
    if (valid.valor.conferencia !== input.conferencia) abortar('conflitoVersao')
    return valid.valor
  }
  async function consultarOperacao(input: ConsultaOperacaoCompraFinanceira): ReturnType<PortaComprasFinanceiras['consultarOperacao']> {
    try {
      check()
      if (!registro(input) || !['descritor', 'comandoCompleto'].includes(String(input.modo)) || Object.keys(input).some(k => !(input.modo === 'descritor' ? ['modo', 'descritor'] : ['modo', 'intencao']).includes(k))) abortar('valorInvalido')
      const intencao = input.modo === 'comandoCompleto' ? intencaoValida(input.intencao) : undefined
      const d = intencao?.descritor ?? (input.modo === 'descritor' ? input.descritor : undefined)
      if (!descritorCompraFinanceiraValido(d)) abortar('valorInvalido')
      const r = await getDocFromServer(ref('operacoesCompras', `criarCompra__${d.operationKey}`)); check()
      return r.exists() ? sucesso(conferir(r.data(), d, intencao)) : sucesso({ estado: 'ausenteConfirmado' })
    } catch (e) { const r = erro(e, false); return !r.ok && r.erro.codigo === 'indisponivel' ? sucesso({ estado: 'indeterminado' }) : r }
  }
  return {
    consultarOperacao,
    async criarCompra(input) {
      let intencao: IntencaoCriacaoCompraFinanceira | undefined, tentativa = false
      try {
        check()
        const perfil = perfilComprasFinitaRemoto('criarCompra')
        if (perfil.status !== 'validadoNoProjeto') return falha('configuracaoPendente', 'Compra finita aguarda fonte ativa e validação real do protocolo.')
        const limites = perfil
        intencao = intencaoValida(input)
        const i = intencao, d = i.descritor, c = i.compra, eventoId = `criarCompra__${d.operationKey}`
        const receiptRef = ref('operacoesCompras', eventoId)
        // Receipt recovery always precedes current reference checks.
        const known = await getDocFromServer(receiptRef); check()
        if (known.exists()) return sucesso(conferir(known.data(), d, i))
        const cardSnap = await getDocFromServer(ref('cartoes', c.cartaoId)); check()
        const catSnap = await getDocFromServer(ref('categorias', c.categoriaId)); check()
        if (!cardSnap.exists() || !catSnap.exists()) abortar('referenciaInvalida')
        const cartao = decodeCartao(ctx.uid, c.cartaoId, cardSnap.data()), categoria = decodeCadastro(ctx.uid, 'categorias', c.categoriaId, catSnap.data())
        if (categoria.dados.estado !== 'ativo' || categoria.dados.natureza !== 'despesa') abortar('referenciaInvalida')
        for (const id of c.etiquetaIds) {
          const snap = await getDocFromServer(ref('etiquetas', id)); check()
          if (!snap.exists() || decodeCadastro(ctx.uid, 'etiquetas', id, snap.data()).dados.estado !== 'ativo') abortar('referenciaInvalida')
        }
        const ids = Object.keys(c.comandoAtual.faturas).sort()
        const entrada = { cartaoId: c.cartaoId, descricao: c.descricao, dataCompra: c.dataCompra, categoriaId: c.categoriaId, etiquetaIds: c.etiquetaIds, valorTotalCentavos: c.valorTotalCentavos, quantidadeParcelas: c.quantidadeParcelas, ...(c.primeiraFaturaEscolha === 'explicita' ? { primeiraCompetenciaFatura: c.primeiraCompetenciaFatura } : {}) }
        function planejar(faturas: readonly FaturaFinanceira[], primeiroUsoCategoria: boolean) {
          const instante = Math.max(ctx.agora?.() ?? Date.now(), ...faturas.map(f => f.conteudo.updatedAt))
          const plan = prepararCriacaoCompraFinanceira(entrada, { uid: ctx.uid, hoje: ctx.hoje, cartao, faturas, primeiroUsoCategoria }, { id: c.id, eventoId, instante })
          if (!plan.ok) abortar(plan.erro.codigo)
          const normalized = normalizarIntencaoCriacaoCompra({ descritor: d, compra: plan.valor.compra })
          if (!normalized.ok || normalized.valor.conferencia !== i.conferencia) abortar('conflitoVersao')
          if (plan.valor.orcamento.acessos > limites.acessosMaximos || plan.valor.orcamento.acessosPorEscrita.some(n => n > 8) || limites.acessosPorEscrita.some(n => n > 8) || plan.valor.orcamento.mutacoes > limites.mutacoesMaximas) abortar('limiteOperacional')
          return plan.valor
        }
        const faturas: FaturaFinanceira[] = []
        for (const id of ids) {
          const snap = await getDocFromServer(ref('faturas', id)); check()
          if (!snap.exists()) abortar('integridadeIndeterminada')
          faturas.push(decodeFaturaFinanceira(ctx.uid, id, snap.data()))
        }
        planejar(faturas, !categoria.usoFinanceiro)
        tentativa = true
        const result = await runTransaction(db, async tx => {
          check()
          const receipt = await tx.get(receiptRef); check()
          if (receipt.exists()) return conferir(receipt.data(), d, i)
          const original = await tx.get(ref('compras', c.id)); check()
          if (original.exists()) abortar('conflitoVersao')
          const atuais: FaturaFinanceira[] = [], raw = new Map<string, Record<string, unknown>>()
          for (const id of ids) {
            const snap = await tx.get(ref('faturas', id)); check()
            if (!snap.exists()) abortar('integridadeIndeterminada')
            const value = snap.data()
            if (!registro(value) || !registro(value.conteudo)) abortar('esquemaIncompativel')
            atuais.push(decodeFaturaFinanceira(ctx.uid, id, value)); raw.set(id, value.conteudo)
          }
          let primeiroUso = !categoria.usoFinanceiro
          if (primeiroUso) {
            const snap = await tx.get(ref('categorias', c.categoriaId)); check()
            if (!snap.exists()) abortar('referenciaInvalida')
            const cat = decodeCadastro(ctx.uid, 'categorias', c.categoriaId, snap.data())
            if (cat.dados.estado !== 'ativo' || cat.dados.natureza !== 'despesa') abortar('referenciaInvalida')
            primeiroUso = !cat.usoFinanceiro
          }
          const plan = planejar(atuais, primeiroUso), stamp = serverTimestamp()
          const { uid: _u, id: _id, ...compra } = plan.compra
          const { uid: _eu, id: _ei, ...evento } = plan.evento
          tx.set(ref('compras', c.id), { ...compra, createdAt: stamp, updatedAt: stamp })
          tx.set(receiptRef, { ...evento, createdAt: stamp })
          for (const f of plan.faturas) {
            const { uid: _cu, faturaId: _fi, cartaoId: _ca, competencia: _co, ...conteudo } = f.conteudo
            // Preserve the exact SDK Timestamp; numeric read models can lose nanoseconds.
            tx.update(ref('faturas', f.id), { conteudo: { ...conteudo, createdAt: raw.get(f.id)!.createdAt, updatedAt: stamp } })
          }
          if (primeiroUso) tx.update(ref('categorias', c.categoriaId), { schemaVersion: 2, usoFinanceiro: { eventoId, origemId: c.id, papel: 'classificacao', createdAt: stamp } })
          return confirmacao(plan.evento, 'comandoCompleto')
        })
        check(); await afterCommit?.(); check()
        return sucesso(result)
      } catch (e) {
        if (intencao && ctx.atual()) {
          try {
            const d = intencao.descritor, r = await getDocFromServer(ref('operacoesCompras', `criarCompra__${d.operationKey}`)); check()
            if (r.exists()) return sucesso(conferir(r.data(), d, intencao))
          } catch (recovery) { return erro(recovery, tentativa) }
        }
        return erro(e, tentativa)
      }
    },
  }
}
