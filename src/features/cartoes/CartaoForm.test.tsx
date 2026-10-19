import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CartaoForm } from './CartaoForm'

it('oferece somente os cinco campos cadastrais e explica ausência de titular ativo',()=>{
 const html=renderToStaticMarkup(<CartaoForm titulares={[]} busy={false} maisTitulares={false} onMaisTitulares={()=>{}} onSalvar={async()=>{}} onCancelar={()=>{}}/>)
 expect([...html.matchAll(/name="([^"]+)"/g)].map(m=>m[1])).toEqual(['banco','nome','titularId','diaFechamento','diaVencimento'])
 expect(html).toContain('Cadastre um titular ativo')
 expect(html).toContain('Não informe número completo, CVV, senha ou acesso bancário')
 expect(html).toContain('Salvar cartão')
})
