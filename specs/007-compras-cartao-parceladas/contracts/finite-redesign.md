# Redesenho finito autorizado — 21/10/2026

O responsável autorizou implementar as dependências007–010 necessárias ao painel011 e, em seguida, autorizou guardar o cronograma finito de até12 parcelas no agregado da compra, com histórico em eventos separados. A autorização não publica Rules, não migra dados e não aprova o orçamento remoto. Este documento prevalece sobre a exigência anterior de documentos-filho obrigatórios para cada parcela. As demais garantias financeiras permanecem.

## Contrato local implementado

`src/domain/finance/contracts/compras.ts` define dados de entrada, contexto, prévia e `CompraFinita`. O agregado usa schemaVersion2 para distinguir o novo layout do schema1 documental anterior. Em `compras/{compraId}`, o cronograma corrente é um mapa fechado `parcelas` com chaves p01..pNN, exatamente1..quantidadeParcelas. Cada posição contém numero, quantidadeOriginal, valorCentavos, competenciaFatura e faturaId. Nenhuma posição contém vencimento, liquidação ou classificação duplicados. A competência da primeira fatura, as demais competências e a divisão com resto determinam integralmente o mapa.

O índice `competenciasFaturas` é ordenado, distinto e exatamente igual às competências das posições. Não contém dinheiro. O agregado conserva descrição, dataCompra, cartão, categoria, etiquetas canônicas, total, quantidade, escolha da primeira fatura, versão de conteúdo, revisão do cronograma, estado, ponteiro de evento e timestamps. O cancelamento acrescenta motivo e instante, preservando valores e posições. Não há histórico crescente, lista de pagamentos, parcela infinita ou criação implícita de caixa.

A identidade lógica permanece `compraId__rREV__nORDINAL`. Uma revisão nova usa novos IDs, mesmo que a quantidade volte de3 para2 para3. Leitura de parcela exige agregado próprio, ativo e revisão corrente. Eventos imutáveis separados deverão conservar os snapshots das revisões antigas. Não foram implementadas gravações desses eventos neste incremento.

`compras.ts` calcula a prévia com dinheiro e calendário compartilhados. A prévia mantém vencimentos nos calendários, conserva snapshots existentes e exige controle conhecido sem histórico de pagamento para cada fatura existente. Fechamento e cartão arquivado bloqueiam nova compra. O conteúdo de conferência inclui UID, entrada normalizada, cartão, calendários e versões de fatura/controle; é apenas comparação local, nunca prova de autorização.

`comprasAggregate.ts` constrói/valida o agregado e resolve posições correntes. `comprasMapper.ts` decodifica timestamps Firestore e o formato fechado. Nenhum desses módulos está conectado a uma rota ou habilita consultas/gravações em produção.

## Harmonização ainda necessária

- 007: redesenhar e avaliar o grafo de autorização/controles para o agregado; contratos de comandos, eventos, edição, cancelamento, consultas e Rules ainda não foram aprovados. Eliminar documentos-filho reduz escritas, mas não prova que todos os acessos aos controles/calendários cabem em18/8.
- 008: resolver itens pelo agregado/revisão, preservar barreira de pagamento e compensações; atualizar escritores e controles juntos. Não interpretar posição histórica como item exigível.
- 010: manter assinatura como ocorrência mensal com item único; ela não se torna uma série parcelada porque007 usa mapa finito.
- 011: consultar compras por competências indexadas, contar compra uma vez no consumo e posições somente dentro da fatura líquida no planejamento; não habilitar adaptador por existir decoder local.

Os limites permanecem12 posições nominais,32KiB/documento,16KiB/comando canônico,1MiB/conjunto,32 mutações e18/8 acessos sem cache presumido. O máximo nominal não é um perfil remoto validado. Schema1 ou desconhecido falha fechado; qualquer migração exige inventário e autorização próprios. A fonte de produção e seus índices permanecem inalterados.

## Complemento autorizado: controle embutido e transição corrente

A autorização de21/10/2026 em invoice-control-proposal.md substitui também o G separado e a capacidade J física por item de compra. Cada posição passa a conter `capacidade` fechada schema1: valorOriginalCentavos, correcaoAcrescimosCentavos, correcaoReducoesCentavos, devolvidoCentavos e categoriaEfetivaId. Esta última é classificação efetiva para correções, não uma segunda autoridade de categoria original. Ausência não significa zero. O valor da posição continua sendo o original do cronograma; o líquido/corrigido deriva da capacidade.

`comprasFinanceiras.ts` prepara localmente a criação inteira em faturas existentes compatíveis: compra com comandoAtual, recibo imutável e faturas com conteudo alterado; calendário/version/timestamps006 permanecem iguais. comandoAtual contém tipo/evento/versões, antes=null, imagem financeira depois sem comandos recursivos e mapa exato por fatura de versão do calendário, versão financeira esperada/resultante e delta. Validação canônica compara a imagem com o agregado e deriva todos os deltas das posições. O recibo conserva a mesma transição finita, ligada à compra. A candidata de criação100/3 custa16 acessos conservadores/5 mutações; primeiro uso de categoria/etiquetas podem tornar o caso inelegível. A contagem não é prova de Rules.

`faturaFinanceira.ts` define versaoConteudo4 com `conteudo` schema2. UID/faturaId/cartaoId/competencia do controle são derivados do caminho/envelope ao decodificar, não aceitos duplicados no mapa persistido. O ponteiro `ultimoEventoOrigemId` é obrigatório para eventos de compra/materialização, permitindo à futura Rule da fatura encontrar o agregado autoritativo sem lookup adicional; demais variantes removem esse ponteiro. Cada variante ainda requer reciprocidade real no commit e prova dos limites.

`comprasFinanceirasMapper.ts` é o decoder explícito do registro financeiro com comando corrente obrigatório. `comprasMapper.ts` e `CompraFinita` permanecem modelos preliminares locais para cálculo/validação do cronograma; sua existência não habilita fonte de produção. O novo decoder por enquanto aceita somente criação version1; edição/cancelamento e suas transições completas ainda devem ser implementados, sem fallback para esconder controle desconhecido. Faturas novas e migração de faturas006 antigas não são abrangidas pelo perfil candidato de faturas existentes.
