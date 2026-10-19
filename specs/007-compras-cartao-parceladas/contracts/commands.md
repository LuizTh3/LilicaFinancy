# Contract: Comandos de compras

Contratos de aplicação, não endpoints HTTP nem autorização para adaptar o repositório genérico003. Formato final tipado em src/domain/finance/contracts/compras.ts, após gates do plano.

## Operações

| Operação | Entrada | Resultado |
| --- | --- | --- |
| prepararCompra | cartão, dados de compra, primeira competência opcional, sessão atual | Prévia sem escrita, sugestão/escolha e cronograma válido ou impedimentos |
| prepararEdicao | compraId, version esperada e novo conteúdo | Antes/depois, conjunto de faturas afetadas e revisões esperadas |
| criarCompra | envelope + dados completos conferidos | Uma compra, N posições, faturas/controles necessários e recibo |
| editarCompra | envelope + compraId + conteúdo substituto | Revisão de conteúdo nova; cronograma novo somente se houver mudança financeira |
| cancelarCompra | envelope + compraId + motivo trim1–1000 | Compra e parcelas sem exigibilidade, preservando histórico |
| consultarOperacao | descritor ou comando completo | confirmado, ausenteConfirmado ou indeterminado |

Envelope: contractVersion1, tipo, operationKey, compraId, expectedVersion (0 somente criação), expectedCronogramaRevision, expectedContext (faturas e controles, referências relevantes), payload e identificação da prévia conferida. UID e generation pertencem ao contexto da porta, não ao payload. Datas/valores/etiquetas canônicos, campos desconhecidos rejeitados. Prévia não é segredo ou prova remota: Rules recalculam invariantes.

Novas parcelas são calculadas da entrada, nunca aceitas como edição livre. Mesmo conjunto informado pelo cliente deve corresponder ao cálculo por ordinal e aos IDs esperados. Hash de prévia sozinho não autoriza efeitos financeiros.

## Protocolo de confirmação

1. Validar sessão atual, schema, entrada, prévia conferida e orçamento específico. Gerar operationKey uma vez fora de callback; IDs de compra/revisão/parcelas são estáveis.
2. Transação lê recibo primeiro. Se existe e corresponde ao comando canônico, retornar o resultado original, mesmo se referência foi arquivada depois. Conteúdo diferente retorna conflitoIdempotencia.
3. Ler origem e contexto necessário, inclusive controles/faturas atuais/propostos e vizinhos concretos dos novos calendários. Todas as leituras precedem qualquer escrita. Validar revisões, integridade, referências e hoje no fuso. Retry interno que detecte contexto diferente da prévia retorna conflito, sem aceitar novo calendário silenciosamente.
4. Reavaliar orçamento do conjunto real de documentos únicos e ramos de Rules. Ausência de perfil comprovado ou excesso retorna limiteOperacional sem escrever. Não consumir chaves novas ou confirmar faturas em etapas independentes para fazer uma compra caber.
5. Gravar origem/revisão, parcelas novas, controles, novos calendários/eventos, primeiro uso e recibo num único commit. Nenhuma UI é alterada de dentro do callback.
6. Após confirmação e checagem de generation, apresentar sucesso e invalidar consultas dependentes. Após resposta perdida, consultar recibo remoto com mesma intenção; não assumir falha nem criar nova compra. Descartar resposta tardia após logout.

A intenção local persistida contém só UID, tipo, operationKey, compraId, revisão e versão de contrato, sem descrição/valores/credenciais. Após recarga, recibo recupera resultado confirmado; se ausente confirmado e payload perdido, não reaplicar comando presumido. Exigir reconstrução/conferência explícita ou encerrar tentativa ausente antes de nova intenção.

## Invariantes concorrentes

- Compra.version controla duas edições ou edição/cancelamento. Toda operação financeira do mesmo agregado compartilha controles de todas as faturas afetadas.
- Fatura nova tem ID natural006; confirmação concorrente precisa reler/reconferir snapshot que prevaleceu. Mesmo nome/banco não une cartões.
- Pagamento futuro e ajuste de vencimento devem integrar a mesma fronteira de controle. Não é suficiente atualizar controle apenas nos comandos de compra.
- Rules usam request.time para fechamento e marcador protegido para histórico de pagamento. Mesmo fatura aberta com pagamento revertido é bloqueada para compras/edições.
- Escolha manual da primeira fatura prevalece sobre sugestão, mas não sobre proteção de destino fechado/movimentado. Cadastro retroativo em fechada sem pagamento continua rejeitado pela decisão A.

## Estados/erros

Confirmado contém compraId, version, cronogramaRevision, parcelaIds e eventoId. No-op contém semAlteracao/jaCancelada e revisão atual, sem novo recibo. Recuperação confirmado inclui se conteúdo foi conferido integralmente ou apenas descritor; jamais alegar equivalência completa sem payload.

Reutilizar códigos003: valorInvalido, limiteMonetario, dataInvalida, referenciaInvalida, naoEncontrado, conflitoVersao, conflitoIdempotencia, limiteOperacional, semPermissao, indisponivel, cotaExcedida, esquemaIncompativel e confirmacaoIndeterminada. Detalhes seguros incluem campo, fatura própria e ação de recuperação; não revelar existência alheia. Fatura protegida é erro de operação com motivo discriminado faturaFechada/historicoPagamento, sem sinalizar sessão inválida.

## Fora do contrato

Não pagar parcelas/faturas, antecipar, importar migração, corrigir só uma ocorrência ou transferir cartão. Não estornar/reembolsar para contornar bloqueio. Nenhuma chamada financeira usa o trusted-api da002.
