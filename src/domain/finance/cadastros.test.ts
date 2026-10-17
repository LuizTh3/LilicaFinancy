import { expect, it } from 'vitest'
import { validarDadosCadastro, validarComandoCadastro, planejarCadastro } from './cadastros'
const hoje='2026-10-17'
it('normaliza nomes livres sem usar nome como chave',()=>{
 expect(validarDadosCadastro('titulares',{nome:'  Nome livre  ',estado:'ativo'},hoje)).toEqual({ok:true,valor:{nome:'Nome livre',estado:'ativo'}})
 for(const nome of ['', '   ', 'x'.repeat(121), 42]) expect(validarDadosCadastro('etiquetas',{nome,estado:'ativo'},hoje).ok).toBe(false)
 expect(validarDadosCadastro('etiquetas',{nome:'😀'.repeat(120),estado:'ativo'},hoje).ok).toBe(true)
 expect(validarDadosCadastro('titulares',{nome:'Nome',estado:'ativo',uid:'B'},hoje).ok).toBe(false)
})
it('base é completa, datada, segura e distinta de ausência',()=>{
 const d={nome:'Conta',estado:'ativo',tipo:'banco'}
 expect(validarDadosCadastro('contas',d,hoje).ok).toBe(true)
 const base={...d,saldoInicialCentavos:0,saldoInicialPosicao:'credora',saldoInicialDataBase:hoje}
 expect(validarDadosCadastro('contas',base,hoje).ok).toBe(true)
 for(const patch of [{saldoInicialPosicao:'devedora'},{saldoInicialCentavos:1.5},{saldoInicialCentavos:Number.MAX_SAFE_INTEGER+1},{saldoInicialDataBase:'2026-10-18'},{saldoInicialDataBase:'2100-02-29'}]) expect(validarDadosCadastro('contas',{...base,...patch},hoje).ok).toBe(false)
 expect(validarDadosCadastro('contas',{...d,saldoInicialCentavos:0},hoje).ok).toBe(false)
 expect(validarDadosCadastro('contas',{...base,saldoInicialCentavos:Number.MAX_SAFE_INTEGER,saldoInicialPosicao:'devedora'},hoje).ok).toBe(true)
})
it('rejeita comandos livres e congela natureza após uso',()=>{
 expect(validarComandoCadastro({modo:'descritor'},hoje).ok).toBe(false)
 expect(planejarCadastro('categorias',{nome:'A',estado:'ativo',natureza:'receita'},{nome:'A',estado:'ativo',natureza:'despesa'},'editar',true).ok).toBe(false)
 expect(planejarCadastro('categorias',{nome:'A',estado:'ativo',natureza:'receita'},{nome:'B',estado:'ativo',natureza:'receita'},'editar',true).ok).toBe(true)
})
it('fecha tipos, identidades e versões dos comandos sem coerção',()=>{
 const c={contractVersion:1,operationKey:'op',cadastroId:'id',colecao:'titulares',expectedVersion:0,tipo:'criar',dados:{nome:'Nome',estado:'ativo'}}
 expect(validarComandoCadastro(c,hoje).ok).toBe(true)
 for(const patch of [{operationKey:'../id'},{cadastroId:'id_indevido'},{expectedVersion:'0'},{expectedVersion:1.5},{expectedVersion:-1},{expectedVersion:Number.MAX_SAFE_INTEGER},{tipo:['editar'],expectedVersion:1},{ownerUid:'B'}])expect(validarComandoCadastro({...c,...patch},hoje).ok).toBe(false)
 expect(validarDadosCadastro('categorias',{nome:'Nome',estado:'ativo',natureza:['receita']},hoje).ok).toBe(false)
 expect(validarDadosCadastro('contas',{nome:'Nome',estado:'ativo',tipo:['banco']},hoje).ok).toBe(false)
})
it('valida bissextos sem converter a data-base em instante',()=>{
 const c={nome:'Conta',estado:'ativo',tipo:'banco',saldoInicialCentavos:100,saldoInicialPosicao:'devedora'}
 expect(validarDadosCadastro('contas',{...c,saldoInicialDataBase:'2000-02-29'},hoje).ok).toBe(true)
 expect(validarDadosCadastro('contas',{...c,saldoInicialDataBase:'1900-02-29'},hoje).ok).toBe(false)
 expect(validarDadosCadastro('contas',{...c,saldoInicialDataBase:null},hoje).ok).toBe(false)
})
