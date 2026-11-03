# Proposta concreta: controle junto da fatura — 21/10/2026

**Autorizado expressamente pelo responsável em21/10/2026.** Complementa o cronograma finito da compra já autorizado. É um redesenho de persistência006–008, sem mudança de cálculo, aumento de cotas, backend, publicação ou migração. As contagens abaixo são aritmética candidata, não Rules aprovadas. A autorização permite construir/harmonizar os módulos e a candidata local; preserva os gates remotos antes de habilitar produto.

## Bloqueio remanescente

Embutir posições na compra elimina documentos-filho, mas os controles de fatura separados ainda exigem consultas e escritas por destino. Mesmo com perfil delegado ao recibo e referências preflight revalidadas pelas Rules, o caso central100/3 em três faturas existentes custa22 acessos conservadores, acima18. Permitir somente duas parcelas não entrega esse cenário de aceitação.

## Mudança proposta

- Guardar o controle financeiro finito008 em um campo fechado `conteudo` da própria `faturas/{cartaoId__competencia}`. Preservar todos os campos/datas/snapshots/eventos006; `version`/`ultimoEventoId` do calendário continuam independentes de `conteudo.version`/`conteudo.ultimoEventoId`. Operação financeira não altera a revisão nem o timestamp técnico do calendário.
- O controle embutido mantém exigível, liquidado líquido, histórico de pagamento monotônico, estado de revisão, ponteiro de evento e timestamps próprios. A pendência continua derivada. Não manter cópia autoritativa em `controlesFaturas`.
- Guardar a capacidade finita de cada item de compra na respectiva posição da compra, como010 já faz na própria ocorrência. Eventos de ajustes/pagamentos/reversões continuam imutáveis e separados. Não anexar pagamentos ou histórico crescente à compra/fatura.
- A compra mantém uma imagem finita da transição corrente (`comandoAtual`), recíproca ao recibo. A imagem contém conteúdo/versões necessárias, nunca o comando anterior recursivamente. Isso permite que a fatura confira sua própria contribuição/delta e a operação exata lendo a compra uma vez, sem reler recibo/controle/calendário em documentos distintos.
- Manter perfil/primeiro acesso no recibo create-only obrigatório. A compra exige esse recibo novo; cada fatura exige compra pós-estado, versão esperada exata e delta correspondente. A compra força todas as faturas da união de destinos antigos/novos. Reutilizar operação antiga falha nas versões dos destinos, além da reciprocidade. Dia de fechamento continua provado por request.time; histórico nunca volta a false.

## Orçamento candidato sem cache

U=faturas distintas afetadas, L=novas etiquetas verificadas, K=primeiro uso de categoria. Na criação/edição, compra consulta recibo+cartão+categoria+U faturas:3+U; cada fatura consulta compra:1; recibo consulta perfil+compra+L etiquetas:2+L; primeiro uso custa2K. Leituras transacionais declaradas: recibo, compra eU faturas, mais categoria quandoK:2+U+K. Referências preflight não substituem validação nas Rules. Total conservador:7+3U+L+3K, com teto8 por escrita e18 no conjunto.

Cancelamento sem novas referências: compra1+U, faturasU, recibo2, leituras2+U, total5+3U. União de destinos, não quantidade nova isolada, determina custo de edição. Nenhum cache foi descontado.

| Caso em faturas existentes compatíveis | Acessos | Resultado aritmético |
| --- | --- | --- |
| Criar100/3, sem novas etiquetas, categoria já usada | 16 | candidato aceito |
| Criar duas posições, primeiro uso categoria, sem etiquetas | 16 | candidato aceito |
| Uma posição, cinco etiquetas e primeiro uso categoria | 18 | candidato aceito |
| Editar três destinos conservados | 16 | candidato aceito |
| Editar com união de seis destinos | 25 | rejeitar integralmente |
| Cancelar três destinos | 14 | candidato aceito |
| Doze destinos nominais | 43 | rejeitar integralmente |

`scripts/validate-compras-finite-budget.mjs` confere dez cenários e escreve `finite-budget-proposal.json`. Fatura nova exige prova adicional de calendário006/vizinhos/evento e não está coberta por esses perfis de faturas existentes. Não gerar faturas em etapas ocultas para fazer a mesma compra caber. Perfis adicionais só podem ser aceitos após contagem/compilação/avaliação específicas;12 permanece teto nominal, sujeito ao orçamento real.

## Preservação e implantação futura

Esse layout requer harmonizar escritores, leitores, queries, Rules e cenários006–008/010/011. Novos controles não podem ser inicializados a zero em fatura antiga por conveniência; legado sem prova permanece consultável e bloqueado para mutação. Migração exige inventário/autorização próprios. A capacidade de item, a composição dos efeitos008 e as revisões devem ser auditadas antes de eliminar armazenamento separado; histórico e efeitos financeiros não podem ser descartados ou contados duas vezes.

Depois de autorização de desenho: implementar candidata completa e testes positivos/negativos, medir18/8/32/bytes/1000 expressões e avaliar oficialmente sob autorização específica de envio. Nenhuma flag de produto é alterada por este documento. A prova remota e SDK continuam obrigatórias mesmo com desenvolvimento local autorizado.
