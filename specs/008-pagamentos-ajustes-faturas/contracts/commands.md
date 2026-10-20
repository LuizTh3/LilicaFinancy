# Contract: Comandos de liquidação e correção008

Referência para portas TypeScript independentes de SDK; nenhuma API financeira HTTP nova. Adaptador compartilha serviço de liquidações003 e padrão de eventos005. Não habilitar perfis antes dos gates em [security.md](security.md).

## Envelope e resultado

Envelope fechado: `contractVersion:1`, `tipo`, `operationKey`, `expectedVersions` e `payload` discriminado. UID/generation vêm da sessão, nunca do formulário. `expectedVersions` contém cada controle de fatura/item/pagamento/ajuste e calendário/compra que possa mudar a decisão. IDs/versões ordenados, sem duplicatas; conteúdo canônico limitado16KiB. IDs dos efeitos são definidos antes do envio e reproduzíveis pela mesma intenção.

Resultado confirmado: eventoId, IDs dos fatos/efeitos e versões resultantes por alvo. `consultarOperacao` aceita comando completo ou descritor UID/tipo/chave: retorno confirmado, ausenteConfirmado ou indeterminado. Descritor recupera efeito sem comprovar igualdade do payload perdido; modo completo confere conteúdo canônico exato. Não usar hash não verificado como autorização.

Fluxo: resolver recibo primeiro; confirmado+mesmo conteúdo devolve resultado original mesmo se conta foi arquivada depois. Ausente: preflight de referências e orçamento, releitura transacional dos alvos mutáveis e recibo, exigir versões esperadas e regras de negócio, aplicar todas as escritas juntas. Callback repetido não cria IDs ou aceita contexto diferente. Falha após commit recupera mesma intenção, sem novo pagamento.

| Tipo | Payload obrigatório | Efeito e condições |
| --- | --- | --- |
| pagarFatura | faturaId, valorCentavos, contaId, dataEfetiva | Magnitude positiva ≤pendente; conta ativa própria; data≤hoje; revisão normal. Ganha um fato e capacidade do pagamento; histórico=true. |
| reverterPagamentoErro | faturaId, pagamentoId, motivo | Infere valor/conta/data integralmente do original, exige capacidade intocada; anula caixa original e aumenta pendente. |
| reabrirFatura | faturaId, motivo | Fechada, normal e nunca paga; persiste revisão, calendário preservado. |
| encerrarRevisao | faturaId, motivo | Exige revisão ativa; restaura fechado sem alterar datas; não cancela automaticamente correções confirmadas durante a revisão. |
| registrarEncargo | faturaId, tipoJurosOuEncargo, descricao, valorCentavos, dataEfeito, categoriaId, motivo | Novo item manual separado, exigível e consumo aumentam; sem fato de caixa. |
| corrigirItem | faturaId, itemId, motivo, dataRegistroFinanceira e variante monetaria/classificacao | Monetária: sentido e magnitude positiva da diferença. Classificação: categoria anterior/nova; sem magnitude monetária ou caixa. Corrige mês original e preserva fonte. |
| compensarAjuste | ajusteOriginalId, itemId/faturaId, magnitude quando monetário, motivo, versões | Novo efeito ligado ao anterior, até capacidade remanescente; não pode inverter pagamento/reembolso ou mascarar devolução real. |
| estornarCompra | compraId, totalCentavos, dataEfeito, motivo, distribuicaoItens e destino discriminado | Cada item original elegível; soma exata. Fatura: sem caixa, redução limitada à pendência. Conta: dados abaixo e estado final conjunto válido. |
| incluirCompraEsquecida | Contrato de criarCompra007 + motivo e identificação de inclusão tardia | Variante da porta de compra; cronograma inteiro confirmado uma vez, destinos explicitamente conferidos, sem reabrir ou reescrever fatos antigos. Não criar ajuste de aumento adicional. |

`dataRegistroFinanceira` identifica a data informada da correção; o evento também registra createdAt atual. Competência corrigida vem da data original da compra, não desse campo nem de escolha livre do cliente. Encargo usa sua própria data de efeito e estorno usa data econômica real. As variantes não permitem definir livremente uma competência divergente.

Destino conta de estorno: `contaDestinoId`, `dataRecebida`, lista ordenada `pagamentoId,faturaId,valorCentavos`. Cada pagamento é do mesmo UID/fatura e tem capacidade suficiente; somas por fatura iguais à distribuição de itens. Data recebida não futura nem anterior aos pagamentos referenciados. Conta diferente da pagadora é permitida. Sem alocação do pagamento às parcelas; o vínculo de item explica consumo e o de pagamento explica caixa. Nenhuma distribuição ou seleção automática silenciosa.

Reabertura/edit comum não substitui inclusão tardia em fatura movimentada. Em cronograma com destinos abertos sem histórico, o mesmo comando tardio mantém motivo e prévia; destinos protegidos usam sua exceção específica. Cartão arquivado continua bloqueando compra nova. Operação excedente não é dividida automaticamente; nenhuma compra parcial é exibida como concluída.

## Erros e recuperação

Reutilizar `Resultado` e códigos existentes: excessoPendente, valorInvalido, limiteMonetario, dataInvalida, referenciaInvalida, conflitoVersao, conflitoIdempotencia, limiteOperacional, esquemaIncompativel, integridadeIndeterminada, semPermissao, cotaExcedida, indisponivel, confirmacaoIndeterminada e configuracaoPendente. Detalhe discriminado de UI para creditoNaoSuportado, capacidadeInsuficiente, historicoProtegido, revisaoAtiva e inversaoNaoSuportada; acrescentar à união de códigos somente se necessário, com regressão dos consumidores.

Excesso/crédito não suportado: mostrar pendente, valor pretendido e limite sem truncar ou escolher outro destino. Conflito: releitura/nova prévia; não alterar valor/intenção confirmada. Incerteza: preservar a intenção da sessão e consultar recibo. Ausente confirmado não autoriza retransmitir sob outro UID. Sem efeito (reabrir já reaberta, encerrar já encerrada ou classificação idêntica) retorna erro de elegibilidade ou semAlteracao explicitamente sem escrita/recibo e encerra intenção; nunca fabricar recibo sem transição. Retry de um comando já confirmado recupera o recibo antes dessa regra.

## Compatibilidade e critérios de contrato

- Especializar inversões008 sem alterar a semântica entregue005; testes antigos e novos cobrem conta de destino diferente, data original de reversão e recusa de reversão parcial.
- Não usar `PortaLiquidacao.corrigir` genérica com payload livre. Evoluir contratos discriminados e versionar snapshots/read models para ajustes positivos, classificação e revisão; dados desconhecidos falham fechados.
- Cada positivo tem teste de delta exato, reconstrução, replay e ausência de categoria no pagamento. Negativos: fato direto de parcela, parcial com quitação individual, excesso por outra aba, reembolso sem item, ajuste sem contraparte e combinação não orçada.
