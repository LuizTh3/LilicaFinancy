# Contratos específicos de acesso financeiro v1

Nenhum endpoint REST, backend financeiro ou adaptador Firestore é criado nesta feature. Interfaces são portas de casos de uso com dados de domínio, não CRUD genérico. Algumas são somente contratos documentais até existir consumidor; testes desta feature usam doubles limitados aos cenários, não biblioteca de persistência.

## 1. Contexto e envelope

Repositório é vinculado a um UID autenticado e pronto conforme feature002. Comando não recebe caminho arbitrário nem UID a ser trocado. Troca/logout descarta instância/estado. Sem compartilhamento ou privilégio admin sobre outro UID.

Comando mutável: `contractVersion=1`, `operationKey`, `payload` específico e `expectedVersions` dos agregados existentes tocados. IDs avulsos são fornecidos antes da primeira tentativa. ID natural determinístico é calculado do domínio. Conteúdo canônico inclui versões esperadas, ordena conjuntos e preserva ordem dos cronogramas. Recibo tem payload exato e resultados; nenhuma deduplicação apenas por hash/nome/valor.

Saída assíncrona é `Resultado<Confirmacao>` ou falha discriminada; `Confirmacao` contém operacaoId, resultados `{tipo,id,version}`, e estado `confirmado`. Proposta local é tipo diferente e não tem esse estado. Erros de confirmação incluem a chave reutilizável sem expor dados de terceiro.

| Código | Conduta do chamador |
| --- | --- |
| valorInvalido, limiteMonetario, dataInvalida, referenciaInvalida, limiteOperacional | Corrigir intenção; nenhuma escrita aceita para o comando rejeitado. |
| naoEncontrado | Recarregar contexto; não criar referência automaticamente. |
| conflitoVersao | Releitura, nova prévia e chave nova para intenção revisada. |
| conflitoIdempotencia | Mesma chave foi usada com outro payload; não sobrescrever recibo. |
| esquemaIncompativel | Bloquear edição; requer migração aprovada. |
| semPermissao | Não repetir automaticamente; preservar proteção e rever sessão/acesso. |
| cotaExcedida, indisponivel | Se confirmação não foi estabelecida, consultar operação; repetir somente mesma chave. |
| confirmacaoIndeterminada | Não afirmar sucesso/falha definitiva nem oferecer nova chave automaticamente; consultar recibo remotamente. |

## 2. Capacidades e contratos

### ConsultarContextoCadastral

Entrada: conjuntos limitados dos IDs necessários ao comando (titular/categoria/conta/cartão/etiquetas), até32 referências no total; saída: registros/versões e referências ausentes/arquivadas. Somente caminho do UID vinculado. Não baixar todos os cadastros ou história. Não criar cadastros por fallback.

### CriarSerie

União `criarCompra`/`criarObrigacaoParcelada`: origem validada, cronograma completo, referências, versões de cartões/faturas existentes que serão usadas, IDs e chave. Saída: origem, todas as parcelas, faturas criadas/afetadas e recibo. Fatura existente usa snapshot confirmado; nova fatura recebe identidade única. Validar soma, ordinais, competência, cartão, ciclo, referências e orçamento antes de executar.

Parcela de cartão deve ter vencimento igual ao da fatura referenciada. Validar essa igualdade na criação, na leitura de snapshot e na prévia de edição; rejeitar divergência como referenciaInvalida. A data da parcela não é uma segunda autoridade nem pode alterar a fatura implicitamente.

Tudo ou nada; origem isolada, parcela extra/faltante ou recibo sem efeitos não são sucesso. IDs naturais únicos mesmo com chaves concorrentes diferentes. Tentativa com origemId já existente sob intenção diferente retorna conflito, sem duplicar série. Fatura compartilhada existente não é sobrescrita por criação concorrente.

### RegistrarPrevisaoAvulsa

União `registrarReceita`/`registrarObrigacaoAvulsa`: payload específico com competência explicitamente confirmada, datas, valor e referências. Saída: ID/versão e recibo. Não cria caixa. Ocorrência recorrente usa capacidade de materialização, não atalho que ignora identidade natural.

### RegistrarLiquidacao

Alvo único receita/obrigaçãoAvulsa/parcelaExterna/fatura, conta, valorPositivo, dataEfetiva, guard esperado e chave. Lê snapshot completo consistente, valida pendência e compõe fato+incremento do guard+recibo atomicamente. Excedente rejeitado; parcial permitido. Não aceitar alvo parcelaCartao nem origem de série externa.

### AplicarCorrecaoTipada

União de reversãoPagamento, reversãoRecebimento, créditoObrigação, estornoConsumo e reembolsoComEstorno. Payload tem motivo, datas, origem/fato original e mapa explícito de alvos/valores quando necessário. Coleta versões de todos os alvos e origem alterada. Sem auto-rateio; soma dos créditos do grupo é validada contra estorno.

Verificar limite compartilhado reversão/reembolso do original e propriedade de cada referência. Reembolso não gera recebimento duplicado. Crédito e inversão do já pago são parte do mesmo commit e validam saldo final. Se o grupo não cabe no orçamento ou exige saldo credor não suportado, rejeitar inteiro, sem registrar só metade do estorno.

### CorrigirSerie / CancelarCompromisso / AlterarCicloFatura

São comandos específicos, nunca update livre. Corrigir recebe escopo estaOcorrencia/estaEFuturasNaoLiquidadas, alterações, prévia com IDs e versões e chave. Mudança entre prévia e confirmação gera conflito. Cancelar exige motivo e líquido zero ou inversões explícitas no mesmo grupo; origem cancelada requer todas as parcelas permitidas canceladas. Fatura fechada não recebe edição ordinária.

Fechar fatura avança ciclo aberta→fechada e guard; não gera pagamento ou total. Esses comandos permanecem contratos documentais quando ainda não houver consumidor funcional.

### MaterializarOcorrencias

Entrada: recorrenciaId, expectedVersion do molde, até12 competências de ocorrência distintas, chave e dados de exceção confirmados quando aplicáveis. Saída: ocorrências novas/existentes e recibo; cada existente vence sobre virtual, inclusive cancelada. Todos os efeitos novos do comando são atômicos. Não grava apenas parte do período e retorna sucesso total. Mais de12 exige seleção explícita menor; uma série parcelada não pode ser dividida assim.

Valor e estimado são capturados por ocorrência de receita/obrigação avulsa. Virtual pode ser materializada explicitamente com valor definitivo e estimado=false. Para uma existente, a capacidade específica ConfirmarValorOcorrencia recebe ID, expectedVersion, valor definitivo positivo e chave; aplica a proposta pura de confirmação com incremento de versão e recibo atômicos, respeitando bloqueios de liquidação. Mesma chave/payload não incrementa de novo. Preservar molde, demais ocorrências, identidade/datas e caixa. Essa porta só terá tipo executável nos testes consumidores desta feature; nenhum adaptador remoto é habilitado.

### ConsultarPeriodo / ConsultarFatura

Entrada: baseTemporal explícita, intervalo canônico, filtros compatíveis, pageSize 1..50 e cursor opcional. Saída: registros ordenados por campo temporal+ID, versões, cursor e completude. Cursor vincula UID/base/filtro e não pode ser reaproveitado em consulta diferente. Total definitivo apenas com revisão consistente e dados completos; estado incompleto impede quitação/cálculo definitivo. Nenhum listener de histórico inteiro.

### ConsultarOperacao

Entrada: tipoComando+operationKey. Saída discriminada `confirmado` com recibo; `ausenteConfirmado` após leitura remota confiável; `indeterminado` com motivo recuperável. Cache vazio ou offline não produz ausência confirmada. Usuário não consulta chave de outro UID. Recibos não têm TTL enquanto efeitos existem.

## 3. Máquina de confirmação e idempotência

1. Validar contrato, payload, IDs e orçamento; construir conteúdo canônico.
2. Consultar recibo dentro da fronteira atômica. Se existir e conteúdo coincidir, retornar resultado original, mesmo que expectedVersion agora esteja antiga. Se divergir, conflitoIdempotencia.
3. Sem recibo, ler guardas e snapshot de negócio; comparar versões esperadas e validar referências/invariantes.
4. Preparar todos os efeitos, incrementar guards uma vez e criar recibo imutável no mesmo commit.
5. Antes do commit falhar: nenhum efeito. Após commit confirmado mas resposta perdida: estado indeterminado do chamador; consulta pela chave recupera os IDs originais.

Callbacks de transação futuros precisam ser reexecutáveis: não gerar IDs, disparar UI, enviar mensagens ou modificar estado externo dentro deles. Falha offline não vira confirmação. Repetição automática do SDK não altera a intenção ou cria novo recibo.

## 4. Budget remoto e gate de habilitação

O catálogo operacional desta feature é `naoHabilitado` para todos os comandos financeiros remotos. Testes usam perfis sintéticos explícitos e nunca os exportam como configuração de produção.

| Cenário conservador sem cache | Escritas / acessos de Rules | Resultado |
| --- | --- | --- |
| Criação N=12, todas as faturas novas, uma verificação de perfil por escrita | W=26; A>=26 | Excede18 interno e20 oficial antes de referências. Rejeitado nesse desenho. |
| Apenas guarda de perfil por escrita, fórmula 2N+2 | N<=8 pela margem18 | Limite aritmético, não prova de aceite para8. |
| Origem com perfil+cartão+categoria+5 etiquetas | A origem=8 | Sem margem para recibo, titular ou getAfter de parcelas; requer outro desenho/rejeição. |
| Candidato com validação de todas as parcelas pela origem | Origem=8+N; parcelas=3N; faturas=2N; recibo=2; total=10+6N | N=1 falha no teto8 da origem; N=2 também excede20 total. Contraexemplo, não impossibilidade universal. |
| Pagamento com fato+guard+recibo | W mínimo3 | Contagem de escritas não prova saldo nem limites de acesso. Não habilitado. |

Nenhum aceite pode depender de cache para cumprir o orçamento conservador desta especificação. Estimativa de bytes deve incluir metadados, caminhos e custos relevantes de índices/transformações; não basta contar JSON do payload. Sem estimativa validada retorna limiteOperacional. Contar também custo de validação das leituras da transação e expressões, não apenas escritas.

Para habilitar futuramente cada comando, entregar: desenho finito de integridade remota (soma/completude/pendência/inversões); Rules completas; orçamento por leitura/escrita de todos os caminhos permitidos e negados; índices necessários; nota de publicação/reversão; testes A/B/visitante reais e adversariais. Guards só de versão não comprovam soma do histórico contra cliente adulterado. Rules não agregam livremente coleções de pagamentos, e paginação do cliente não resolve essa autorização.

Se não houver prova, o adaptador continua rejeitando o comando. Não liberar primeiro para validar depois, nem ampliar o serviço confiável da feature002. Mudanças como agregado financeiro persistido, protocolo multietapas ou canal financeiro confiável exigem novo desenho e autorização de escopo compatível.

## 5. Doubles de contrato nesta feature

Somente no código de teste: stores finitos de séries e recibos para testar criação atômica; alvo com fatos para testar concorrência/liquidação; molde com ocorrências para deduplicação. Não implementar consultas/CRUD de todas as entidades por conveniência. Fixtures usam UID A/B explícitos, dados fictícios e relógio fixo. Nenhum double é importado pelo bundle da aplicação.

Evidências: repetir mesma chave duas vezes, chave reutilizada com payload distinto, duas versões esperadas concorrentes, dois pagamentos sobre mesmo saldo, duas inversões do mesmo original, falha antes do commit, resposta perdida depois, série faltando último ordinal, orçamento excedido e materialização já existente/cancelada. Estado após falha é ausência ou conjunto completo; nunca cópia parcial.

Estes testes comprovam comportamento do contrato local. Não comprovam publicação, cota, isolamento ou validade das Rules do Firestore.
