# Data Model: Pagamentos e ajustes de faturas

Desenho de referência, condicionado aos gates do [plano](plan.md). Caminhos relativos a `users/{uid}`. UID vem da sessão; schema desconhecido, controle ausente ou reconstrução divergente bloqueiam mutação.

## Convenções e autoridades

- BRL em centavos inteiros seguros; resultados intermediários também dentro da faixa003. Magnitudes positivas; zero somente em acumuladores/resultados. Datas de calendário1900–9999, instantes técnicos de servidor. Data real e data econômica não futuras quando requeridas pela spec; estorno não precede compra e recebimento não precede pagamentos que desfaz, conforme núcleo003.
- `schemaVersion` identifica formato, `contractVersion` comando e `version` revisão. Todos os controles incrementam uma unidade por comando confirmado. IDs e proprietário imutáveis; delete financeiro negado.
- Calendário fatura006 é autoridade de competência/vencimento; compra é autoridade de consumo original; parcelas vigentes007 determinam compromisso; evento008 determina pagamentos/inversões/ajustes. Controle não é entrada editável.
- IDs de eventos: `tipo__operationKey` com codificação restrita existente. IDs de efeitos: evento+ordinal limitado. Controle de item usa ID tipado de parcela/encargo; controle de pagamento usa ID do fato original. Nenhum caminho recebido livremente.

## Calendário — faturas/{faturaId}

Manter identidade `cartaoId__YYYY-MM`, snapshots e eventos006. Evoluir `versaoConteudo` para3 ao adotar protocolo008; `schemaVersion` de calendário só muda se seu formato realmente mudar. Não misturar versão de calendário com versão financeira. Reabertura não altera datas. Ajuste de vencimento continua explícito006 e disputa o controle financeiro; não reescreve caixa anterior.

## Coordenação — controlesFaturas/{faturaId}, schemaVersion2

| Campo | Regra |
| --- | --- |
| faturaId, cartaoId, competencia | Identidade imutável e coerente com calendário |
| version | Revisão de toda mutação de conteúdo, pagamento, ajuste e revisão |
| exigivelCentavos | Projeção protegida da soma de parcelas vigentes, encargos e ajustes |
| liquidadoLiquidoCentavos | Pagamentos menos reversões/reembolsos confirmados |
| possuiHistoricoPagamento | Começa false comprovadamente; primeiro pagamento torna true; nunca retorna false |
| revisaoEstado | normal ou reaberta; não é estado da dívida |
| revisaoEventoId | Evento que abriu a revisão vigente; ausente em normal |
| ultimoEventoTipo, ultimoEventoId | Identifica testemunha recíproca exata, incluindo eventos006/007 compatíveis |
| createdAt, updatedAt | Servidor; criação preservada |

Invariante `0 ≤ liquidado ≤ exigivel`; pendente é calculado, não terceiro acumulador. Exigível muda apenas pelo delta exato comprovado de itens/eventos; liquidado muda apenas por fatos. Possuir histórico não é sinônimo de liquidado positivo. Todas as mutações007 e vencimento006 precisam adotar esta versão, sem permitir caminho antigo que conserve saldo desatualizado.

Estado do ciclo visível: se reaberta, aberta em revisão; senão, derivação por datas006. Reabrir exige ciclo fechado, histórico=false e estado normal; encerrar exige reaberta e restaura normal/fechada. Pagamento requer normal; ajustes documentados não dependem de reabrir. Atraso usa vencimento e pendente atuais, independentemente do ciclo.

## Eventos/recibos — operacoesLiquidacoesFaturas/{eventoId}

Documento create-only: schemaVersion1, contractVersion1, tipo, operationKey, comando canônico, contexto de versões, resultados/IDs e `createdAt`. Projeções indexáveis limitadas ao comando: faturaIds, itemIds, pagamentoOriginalIds, datasCaixa e, quando houver exatamente uma data, dataCaixa. Cada lista tem IDs/datas distintos, canônicos e correspondentes exatamente aos efeitos; Rules verificam completude e proíbem entradas extras ou omissões. Limite adicional de comando canônico16KiB, documento32KiB. Corpo contém somente variantes e efeitos previstos para aquele tipo; não aceita mapas extras genéricos.

Variantes: pagarFatura, reverterPagamentoErro, reabrirFatura, encerrarRevisao, registrarEncargo, corrigirItem, compensarAjuste, estornarCompra. Inclusão tardia usa evento007 tipado `incluirCompraEsquecida`, ligado à mesma intenção de compra, sem segundo efeito008 de aumento. Efeitos limitados por comando não são array histórico crescente; nenhum documento acumula operações anteriores.

### Pagamento e capacidade — controlesPagamentosFaturas/{pagamentoId}

O evento de pagamento contém fato com valor, dataEfetiva, contaId e alvo fatura. Controle criado no mesmo commit com pagamentoId, eventoOriginalId, faturaId, valorOriginalCentavos, invertidoCentavos=0, version1 e último evento. Valor original é snapshot imutável validado contra evento original.

- Reembolso incrementa invertido por magnitude até valor original; reversão integral só aceita invertido=0 e passa a original integral. Nenhuma inversão de inversão.
- Reversão herda conta e data do original, não a data técnica. Reembolso guarda `contaDestinoId`/dataRecebida no comando e produz fato com essa conta/data; vínculo original conserva conta pagadora.
- Capacidade livre = original − invertido. Controle não pode ser criado depois com capacidade reiniciada, excluído ou alterado sem evento recíproco. Criar pagamento sem controle também é negado.

## Itens e capacidade — controlesItensFaturas/{itemIdTipado}

Campos fechados: schemaVersion1, itemTipo(parcelaCartao/encargo), itemId, compraId quando parcela, faturaId, valorOriginalCentavos, correcaoAcrescimosCentavos, correcaoReducoesCentavos, devolvidoCentavos, categoriaEfetivaId, version, último evento e timestamps. Controle nasce junto do item/cronograma ou encargo e é preservado mesmo após revisão/cancelamento.

Valor corrigido = original + acréscimos − reduções; líquido do item = corrigido − devolvido; ambos não negativos. Devolução não pode exceder o valor corrigido remanescente, nem uma correção posterior tornar devolução já existente maior que o valor corrigido. Compensação de ajuste de erro altera os acumuladores correspondentes, ligada a ajuste original e limitada ao remanescente dele; não restaura capacidade de pagamento nem movimenta caixa. Qualquer redução da obrigação também respeita pendência final da fatura.

`categoriaEfetivaId` é projeção de classificação original+correções, nunca alteração da compra. Travas cadastrais004 continuam obrigatórias; categoria nova ativa e de despesa. Ajustes monetários não se confundem com estorno econômico: tipo controla base temporal.

## Ajustes documentados

São efeitos imutáveis nos eventos, com ID, item original, tipo, sinal/magnitude, motivo1–1000, dataEfeito, competência de consumo resolvida, antes/depois e fatura. Ajuste de classificação tem anterior/nova categoria e magnitude financeira zero, sem violar a regra de magnitude positiva de ajuste monetário. Encargo tem descrição1–120, tipo juros/encargo, categoria, valor e data próprios; seu evento cria item/controle uma única vez.

- Erro de valor: diferença ajusta consumo no mês original; compromisso no período da parcela; caixa não muda. Classificação recategoriza o consumo do mês original sem segunda despesa.
- Estorno econômico: redução de consumo na dataEfeito e redução de obrigação nos itens explicitamente distribuídos. Não somar novamente o ajuste global da compra quando já contabilizados os efeitos nos itens.
- Reembolso: efeitos de obrigação e inversão financeira coexistem no mesmo evento/commit; redução de exigível e liquidado iguais por fatura. Consumo diminui só pelo estorno e caixa aumenta só pelos fatos de reembolso.
- Correção de ajuste: novo evento compensatório com `ajusteOriginalId`; controle específico `controlesAjustesFaturas/{ajusteId}` registra magnitude compensada e revisão, inicializado com o ajuste original. Mesmos limites e reciprocidade; classificação só pode ser corrigida sobre a versão atual. Reembolso errado não pode ser apagado ou disfarçado de compensação sem caixa; correção que necessite inversão de reembolso não suportada é bloqueada com explicação, sem inventar depósito.

## Entrada de devolução

`destino` é união exclusiva faturaOriginal/conta. Distribuição: lista explícita de itemId,faturaId,valor; soma exata ao total. Destino conta acrescenta contaDestinoId,dataRecebida e distribuição explícita de valores por pagamento de cada fatura. Por fatura, soma de reembolsos = soma das reduções; seleção não presume parcelas pagas. Valores, contas, datas e vínculos ficam no recibo. Não aceitar destino outraFatura/créditoFuturo ou saldo credor.

## Inicialização e migração

1. Novo calendário vazio008: controle zero + evento recíproco; não inferir zero de uma lista vazia no navegador.
2. Novo item007: compra/revisão/parcelas/controles e delta por fatura na mesma confirmação; cancelamento/edição alteram todos os controles afetados, com fontes antes/depois verificadas. Inicialização dos controles de item integra o gate007; não é escrita auxiliar opcional.
3. Controle007 schema1 ou legado: leitura histórica permitida, mutação008 bloqueada. Inventariar estado e reconstruir em snapshot consistente; produzir manifesto/relatório de divergências. A migração executável exige prova de completude e autorização específica, sem auto-backfill no login. Se vazio puder ser comprovado remotamente pelo protocolo, ramo separado; ausência de controle não é prova.
4. Não publicar cliente novo com caminho de escrita antigo capaz de alterar itens sem atualizar projeção008. Deploy coordenado, versão de conteúdo e rollback preservando novos fatos; rollback de UI nega mutações008, não elimina eventos/controles.

## Leituras e reconstrução

Leitor autenticado no padrão snapshot/readTime de `externosSnapshotReader.ts`, páginas1–50 e batch de referências limitado, sempre no mesmo UID/readTime. Reconstrução resolve compras e revisões vigentes, itens, eventos006/007/008 e respectivas inversões; compara exigível, liquidado, histórico, capacidade por item/pagamento/ajuste, versão e cadeia de eventos. Consulta comum não repara divergências.

`SnapshotAlvo` é modelo em memória; seus arrays completos não viram documento persistido. Vencimento de item, quando necessário por compatibilidade003, é resolvido da fatura ao montar snapshot, sem nova cópia autoritativa. Histórico paginado pode ser parcial; totais reconciliados só após completude no mesmo snapshot. Totais atuais de controles podem ser exibidos como posição confirmada do controle, identificados como tal, sem alegar reconstrução concluída.
