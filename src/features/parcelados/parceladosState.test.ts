import { expect, it, vi } from 'vitest'
import { createParceladosState } from './parceladosState'
import { entradaParceladaTeste } from '../../domain/finance/parcelados.testSupport'
import type { PortaParcelados } from '../../domain/finance/contracts/parcelados'
import { clearPrivateFinanceResources } from '../../domain/finance/sessionResources'
const descritor = { contractVersion: 1 as const, tipo: 'criarSerie' as const, operationKey: 'intent', serieId: 'serie', expectedVersion: 0 }
const confirmado = { estado: 'confirmado' as const, operacaoId: 'criarSerie__intent', seriesIds: ['serie'], resultVersions: { serie: 1 } }
function fixture() {
  const criarSerie = vi.fn<PortaParcelados['criarSerie']>(async () => ({ ok: true, valor: confirmado }))
  const consultarOperacao = vi.fn<PortaParcelados['consultarOperacao']>(async () => ({ ok: true, valor: { estado: 'ausenteConfirmado' } }))
  return { criarSerie, consultarOperacao, state: createParceladosState({ uid: 'A', generation: 1, atual: () => true }, { criarSerie, consultarOperacao }) }
}
it('só envia prévia conferida; alteração a invalida; abandono não chama repositório', async () => {
  const f = fixture()
  expect(await f.state.enviar()).toBe(false)
  expect(f.state.preparar(entradaParceladaTeste, descritor).ok).toBe(true)
  f.state.alterar()
  expect(await f.state.enviar()).toBe(false)
  expect(f.state.preparar(entradaParceladaTeste, descritor).ok).toBe(true)
  f.state.abandonar()
  expect(f.criarSerie).not.toHaveBeenCalled()
  expect(f.state.estado().estado).toBe('entrada')
})
it('duplo envio usa uma única intenção e confirmação vem da porta', async () => {
  const f = fixture()
  f.state.preparar(entradaParceladaTeste, descritor)
  const envio = f.state.enviar(), segundo = f.state.enviar()
  expect(await segundo).toBe(false)
  expect(await envio).toBe(true)
  expect(f.criarSerie).toHaveBeenCalledTimes(1)
  expect(f.state.estado().estado).toBe('confirmada')
})
it('falha indeterminada preserva intenção e consultar confirmado não reenvia', async () => {
  const f = fixture()
  f.criarSerie.mockResolvedValueOnce({ ok: false, erro: { codigo: 'confirmacaoIndeterminada', mensagem: 'Consulte a tentativa.' } })
  f.state.preparar(entradaParceladaTeste, descritor)
  await f.state.enviar()
  expect(f.state.estado()).toMatchObject({ estado: 'indeterminada', descritor })
  expect(f.state.abandonar()).toBe(false)
  f.consultarOperacao.mockResolvedValueOnce({ ok: true, valor: confirmado })
  await f.state.consultar()
  expect(f.state.estado().estado).toBe('confirmada')
  expect(f.criarSerie).toHaveBeenCalledTimes(1)
})
it('limpeza de sessão elimina dados privados e descarta resposta tardia', async () => {
  const f = fixture()
  let resolver: (v: Awaited<ReturnType<PortaParcelados['criarSerie']>>) => void = () => {}
  f.criarSerie.mockImplementation(() => new Promise(resolve => { resolver = resolve }))
  f.state.preparar(entradaParceladaTeste, descritor)
  const p = f.state.enviar()
  clearPrivateFinanceResources()
  resolver({ ok: true, valor: confirmado })
  expect(await p).toBe(false)
  expect(f.state.estado()).toEqual({ estado: 'invalidada' })
})
it('notifica a interface para remover a prévia na limpeza mesmo sem resposta de rede', () => {
  const f = fixture(), observados: string[] = []
  const sair = f.state.assinar(() => observados.push(f.state.estado().estado))
  f.state.preparar(entradaParceladaTeste, descritor)
  clearPrivateFinanceResources()
  expect(observados).toEqual(['previa', 'invalidada'])
  expect(f.state.estado().previa).toBeUndefined()
  sair()
})
