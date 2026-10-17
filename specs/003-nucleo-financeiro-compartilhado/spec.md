# Feature Specification: Núcleo compartilhado de dinheiro, datas e contratos financeiros

**Feature Branch**: sem criação de branch; nenhum hook configurado

**Created**: 2026-10-17

**Status**: Draft — validada para planejamento

**Input**: Especificar o núcleo antes das telas: dinheiro seguro em centavos, entrada e apresentação pt-BR, calendário e competências com fuso do perfil, distribuição exata de parcelas, modelo privado, fontes de verdade, estados independentes, pagamentos/recebimentos separados, contratos de repositórios, idempotência, conflitos e limites oficiais. Funções de domínio independentes de React e Firebase.

## Clarifications

### Session 2026-10-17

- Q: Quando uma compra de um mês anterior for estornada, em qual mês a redução deve aparecer no relatório de consumo? → A: No mês do estorno, preservando o consumo no mês da compra original e o vínculo com ela.
- Q: Para receitas e despesas fora do cartão, o mês de planejamento pode ser diferente do mês do vencimento? → A: Sim; sugerir inicialmente o mês do vencimento e permitir ajuste explícito, preservando vencimento e data efetiva de caixa.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Informar valores e dividir compromissos sem perder centavos (Priority: P1)

Como usuário, quero que valores sejam aceitos sem ambiguidade e que o total seja preservado no parcelamento.

**Why this priority**: Um erro monetário contamina todas as telas e projeções futuras.

**Independent Test**: Executar as regras de dinheiro e parcelas isoladamente, sem interface ou conexão.

**Acceptance Scenarios**:

1. **Given** `R$ 1.234,56`, **When** validado e formatado, **Then** produz 123456 centavos e `R$ 1.234,56`.
2. **Given** 10000 centavos e três parcelas, **When** distribuídos, **Then** resulta [3334, 3333, 3333], sempre nessa ordem, somando 10000.
3. **Given** negativo, centavo fracionário, agrupamento malformado ou valor acima do máximo, **When** enviado, **Then** há erro específico e nenhuma alteração financeira.
4. **Given** obrigação e crédito de 500 centavos, **When** informado como operação tipada com origem e motivo, **Then** reduz a dívida em 500 sem aceitar `-5,00` como despesa livre.

### User Story 2 - Planejar meses sem deslocar datas (Priority: P1)

Como usuário, quero que datas mantenham o dia informado e atravessem meses e anos corretamente.

**Why this priority**: Calendário incorreto altera faturas e previsão de caixa.

**Independent Test**: Comparar datas e cronogramas em fusos distintos usando as mesmas entradas.

**Acceptance Scenarios**:

1. **Given** âncora 31 em janeiro de 2027, **When** geradas três ocorrências, **Then** são 2027-01-31, 2027-02-28 e 2027-03-31, sem propagar o ajuste de fevereiro.
2. **Given** fevereiro de 2028, 2100 e 2000, **When** validado dia 29, **Then** é aceito em 2028 e 2000 e rejeitado em 2100.
3. **Given** competência 2026-12, **When** avançada um mês, **Then** resulta 2027-01.
4. **Given** instante 2026-10-18T02:00:00Z e perfil America/Rio_Branco, **When** obtido o dia atual, **Then** resulta 2026-10-17; uma data financeira armazenada como 2026-10-18 continua igual em qualquer fuso.

### User Story 3 - Consultar consumo, compromissos e caixa sem duplicações (Priority: P1)

Como usuário, quero distinguir compra, vencimentos e pagamentos, inclusive parciais e estornados.

**Why this priority**: Gerar parcelas ou pagar uma fatura não pode duplicar despesas.

**Independent Test**: Reconciliar um conjunto fechado com totais calculados manualmente nas três bases temporais.

**Acceptance Scenarios**:

1. **Given** compra de R$ 100,00 em outubro em três parcelas, primeira fatura em novembro, **When** consultadas as bases, **Then** consumo de outubro soma R$ 100,00, planejamento de novembro soma R$ 33,34 e caixa só muda com pagamento confirmado.
2. **Given** fatura fechada de R$ 100,00 e pagamento de R$ 40,00, **When** consultada, **Then** ciclo permanece fechado, pagamento é parcial e pendência é R$ 60,00; vencimento passado indica atraso sem criar pagamento.
3. **Given** receita prevista de R$ 1.000,00 e recebimento de R$ 600,00, **When** consultada, **Then** previsto continua R$ 1.000,00, recebido é R$ 600,00 e pendente R$ 400,00.
4. **Given** pagamento de R$ 40,00 revertido, **When** registrada reversão vinculada, **Then** original permanece no histórico e a pendência volta a R$ 100,00.
5. **Given** compra de R$ 100,00 em outubro e estorno integral com dataEfeito em novembro, **When** consultado o consumo mensal, **Then** outubro mantém R$ 100,00 e novembro registra redução de R$ 100,00 vinculada à compra; eventual reembolso só afeta caixa na data de recebimento efetivo, sem outra redução de consumo.
6. **Given** receita ou obrigação externa com vencimento em novembro, **When** o usuário escolhe outubro como competência de planejamento, **Then** previsão aparece em outubro, vencimento permanece em novembro e caixa só muda na data efetiva da liquidação. A mesma regra vale para cada parcela externa; parcelas de cartão permanecem na competência da fatura.
7. **Given** fatura com vencimento 2026-11-17, **When** uma parcela de cartão vinculada informa vencimento 2026-11-20, **Then** snapshot, criação ou edição são rejeitados por referência inconsistente; a fatura é a autoridade da data e não é alterada para aceitar a divergência.

### User Story 4 - Repetir operações e resolver conflitos com segurança (Priority: P1)

Como usuário em duas abas ou rede instável, quero reenviar sem duplicações e identificar edições desatualizadas.

**Why this priority**: Duplo clique e concorrência não podem modificar o total silenciosamente.

**Independent Test**: Exercitar contratos com substituto de repositório controlável, simulando conflitos e confirmação perdida.

**Acceptance Scenarios**:

1. **Given** mesma chave e conteúdo enviados duas vezes, **When** processados, **Then** retornam os mesmos IDs e existe uma origem com série completa.
2. **Given** mesma chave com conteúdo diferente, **When** reenviada, **Then** há conflito de idempotência sem sobrescrita.
3. **Given** duas edições esperam versão 3, **When** a primeira confirma versão 4, **Then** a segunda recebe conflito e precisa reler a versão atual.
4. **Given** 13 parcelas ou orçamento operacional excedido, **When** solicitada criação, **Then** ocorre rejeição antes da escrita; falha na confirmação atômica não deixa série parcial.
5. **Given** confirmação perdida, **When** consultada a mesma operação, **Then** retorna o resultado confirmado ou mantém confirmação indeterminada até consulta confiável; não cria outra chave automaticamente.

### User Story 5 - Reutilizar contratos sem antecipar telas e cadastros (Priority: P2)

Como responsável pelo produto, quero contratos privados e coerentes para funcionalidades futuras, sem persistência sem caso de uso.

**Why this priority**: Permite evoluir sem reescrever regras nem abrir acesso antecipadamente.

**Independent Test**: Revisar exemplos de dados e executar contratos sem dependências externas.

**Acceptance Scenarios**:

1. **Given** dois usuários com titulares de mesmo nome, **When** resolvidas referências, **Then** identidades são distintas e referências de outro UID são rejeitadas.
2. **Given** recorrência já materializada em dezembro, **When** consultado novamente o período, **Then** há uma ocorrência, mantendo exceções e sem duplicação virtual.
3. **Given** migração com próxima parcela 5/10 e saldo restante conhecido, **When** formado cronograma, **Then** cria seis compromissos numerados 5 a 10, sem inventar total original ou pagamentos passados.
4. **Given** entidades apenas documentadas, **When** entregue o núcleo, **Then** seus contratos não criam telas, cadastros, coleções abertas ou gravações automáticas.
5. **Given** recorrência de energia estimada em R$ 150,00 com ocorrências em novembro e dezembro, **When** novembro é confirmado em R$ 163,27, **Then** apenas novembro passa a valor definitivo com estimado=false; dezembro e o molde continuam em R$ 150,00 com estimado=true, sem criar pagamento ou mudar a identidade da ocorrência.

### Edge Cases

- Vazio, espaços internos, sinais, notação exponencial, NaN, infinito, booleanos, objetos, formato estrangeiro e agrupamentos incorretos.
- Um centavo dividido em duas parcelas: parcela zero proibida, rejeitar quantidade maior que total em centavos.
- Máximo monetário e estouro em somas intermediárias, multiplicação ou subtração insuficiente.
- Datas não canônicas, 1900-02-29, 2000-02-29, 2100-02-29 e avanço fora de 1900–9999.
- Compra no fechamento, cartão arquivado, primeira fatura explícita diferente da sugestão e mudança de calendário com histórico existente.
- Cancelamento com pagamento, crédito maior que pendência, reversão repetida e dois pagamentos concorrentes sobre o mesmo saldo.
- Pagamento parcial de fatura sem atribuição automática às compras; cartões de mesmo banco com faturas independentes.
- Edição de futuras com itens pagos/fechados ou versões desatualizadas; nenhuma atualização parcial pode aparentar conclusão integral.
- Rede, permissão, cota, esquema desconhecido e encerramento antes da confirmação.

## Requirements *(mandatory)*

### Functional Requirements

#### Escopo e fronteira do domínio

- **FR-001**: Regras de dinheiro, calendário, parcelas e pendências DEVEM ser determinísticas, sem importar React, Firebase, componentes visuais, tipos do provedor ou estado global da interface. Relógio, fuso, identificadores e dados são entradas explícitas. Mesmas entradas produzem mesmas saídas.
- **FR-002**: A entrega prepara regras e contratos antes das telas; não autoriza CRUD financeiro completo, publicação de Rules, migração real, cadastros no login ou persistência de todas as entidades. Adaptadores posteriores devem atender apenas casos de uso entregues. Contratos ainda sem funcionalidade são verificados por exemplos e substitutos de teste, sem repositório genérico de entidades.

#### Dinheiro e entrada pt-BR

- **FR-003**: Moeda inicial BRL. `Centavos` é inteiro de 0 a 9.007.199.254.740.991, inclusive, faixa máxima exata adotada pelo domínio. Lançamentos, liquidações, créditos e parcelas exigem valor positivo; zero é válido em resultados derivados e acumuladores. Resultado ou intermediário fora da faixa deve ser rejeitado, sem arredondamento, saturação ou coerção silenciosa.
- **FR-004**: Entrada textual permite remover apenas espaços externos e prefixo opcional `R$` com espaço comum/inseparável opcional. Aceitar dígitos sem agrupamento ou milhares corretamente agrupados por ponto, com vírgula opcional seguida de um ou dois dígitos. Aceitar `1234`, `1.234`, `1234,5`, `1.234,56`, `R$ 0,01` → 123400, 123400, 123450, 123456 e 1 centavos. Rejeitar `1.23`, `1,234`, `1,234.56`, `1e3`, sinais, espaços entre dígitos e caracteres restantes. Vazio é ausência, não zero; leitura parcial de texto inválido é proibida.
- **FR-005**: Converter por dígitos sem usar valor decimal aproximado como autoridade. Validar contratos em execução: centavo fracionário, inteiro inseguro, string onde se espera inteiro, booleano, ausência, NaN e infinito são inválidos. Formatação canônica usa `R$ `, milhares por ponto, vírgula e duas casas: máximo `R$ 90.071.992.547.409,91`. Interpretar a apresentação canônica deve recuperar cada centavo, inclusive no máximo.
- **FR-006**: Oferecer soma, comparação, subtração não negativa, multiplicação por quantidade inteira e distribuição exata. Subtração negativa falha. Diferenças de relatório usam resultado tipado superávit/déficit/equilíbrio e magnitude não negativa; não reutilizar dinheiro negativo como lançamento comum.
- **FR-007**: Reduções e inversões exigem operações discriminadas `creditoObrigacao`, `estornoConsumo`, `reversaoPagamento`, `reversaoRecebimento` ou `reembolso`, com magnitude positiva, motivo, data e origem. Crédito reduz dívida sem caixa; estorno reduz consumo e explicita efeitos na obrigação; reversão desfaz liquidação sem cancelar a origem. Reembolso é uma modalidade de inversão do pagamento por devolução efetiva: reduz liquidado líquido e registra entrada uma única vez, sem reduzir consumo novamente. Reembolso e reversão compartilham o limite do pagamento original e não podem desfazer o mesmo valor duas vezes. Redução da dívida acima da pendência é rejeitada; uma devolução com estorno deve primeiro desfazer a liquidação correspondente e aplicar a redução na mesma operação atômica, validando o estado final. Saldo credor/compensação entre faturas depende de funcionalidade futura.

#### Calendário, competências e parcelas

- **FR-008**: `DataCalendario` é texto canônico `YYYY-MM-DD`, válido no calendário gregoriano de 1900-01-01 a 9999-12-31; `Competencia` é `YYYY-MM`, nos mesmos anos. Validar existência do dia/mês além do formato. Não converter esses valores em instantes UTC como autoridade, nem aceitar data/hora no lugar de data financeira. Ordem canônica equivale à cronológica.
- **FR-009**: Fuso do perfil é identificador IANA válido, inicialmente `America/Rio_Branco`. Transformação de instante em “hoje” usa explicitamente esse fuso e relógio informado. Trocar fuso não reinterpreta datas já salvas. Instantes técnicos de criação/atualização são separados de datas de negócio. Fuso inválido gera erro sem fallback silencioso ao navegador.
- **FR-010**: Avanço de competência recebe deslocamento inteiro positivo, zero ou negativo, atravessa anos e rejeita resultado fora da faixa. Avanço mensal de data recebe data-base, deslocamento e dia âncora de 1 a 31; se inexistente, usa último dia do mês, preservando âncora original nos meses seguintes. Ano bissexto é divisível por 4, exceto séculos não divisíveis por 400. Exceção manual de ocorrência não muda a âncora.
- **FR-011**: Parcelamento novo recebe total positivo T, quantidade inteira N de 1 a 12 e primeira competência/data com âncora. Cada parcela recebe quociente inteiro T/N; as primeiras T mod N recebem um centavo adicional, na ordem crescente do número. Exemplo: 10001/3 → [3334, 3334, 3333]. Rejeitar T<N, quantidade inválida, estouro ou calendário fora da faixa. Ordem de consulta/gravação não altera distribuição; não arredondar cada parcela separadamente.
- **FR-012**: Migração informa próxima parcela K e quantidade original N, com 1 ≤ K ≤ N ≤ 12, e saldo restante positivo. Gerar N−K+1 compromissos com numeração original e soma exata ao saldo restante, sem tratar esse saldo como total original. Total original pode ficar ausente. Valores individuais conhecidos podem substituir divisão uniforme se positivos e com soma igual ao saldo. Não gerar pagamentos anteriores ou inferir quitação do passado.
- **FR-013**: Sugestão inicial de fatura: compra antes do fechamento ajustado pertence ao ciclo que fecha naquele mês; no dia ou depois, ao seguinte. Competência da fatura é mês do vencimento. Vencimento ajustado posterior ao fechamento pertence ao mesmo mês; caso contrário, ao seguinte. Primeira fatura pode ser explicitamente corrigida. Datas confirmadas são snapshots de negócio; alterações no cartão não movem histórico automaticamente.

#### Estados, liquidações e bases temporais

- **FR-014**: Separar estado de obrigação `ativa`/`cancelada`, estado derivado de liquidação `pendente`/`parcial`/`liquidada`/`semExigibilidade` e ciclo de fatura `aberta`/`fechada`. Cancelada sem saldo é semExigibilidade; ativa com pendente zero é liquidada; com pendente positivo e liquidado líquido zero é pendente; com ambos positivos é parcial. Estimativa é atributo do valor, não quitação. Fechar fatura não cria pagamento. Atraso é indicador derivado de pendência positiva e vencimento anterior ao dia atual do perfil. Crédito pode liquidar obrigação sem saída de caixa.
- **FR-015**: Pagamentos/recebimentos são fatos independentes da previsão, com conta, magnitude, data efetiva e operação. Cada liquidação inicial tem exatamente um alvo: receita, obrigação externa avulsa, parcela externa ou fatura. Permitir parcial até a pendência verificada de forma concorrente; rejeitar excedentes. Vários alvos exigem operações separadas. Parcela de cartão é liquidada via fatura, nunca por pagamento direto duplicado.
- **FR-016**: Exigível = valor original menos reduções válidas; cancelamento sem liquidação zera exigibilidade. Liquidado líquido = liquidações menos reversões vinculadas; pendente = exigível menos liquidado líquido. Nenhum componente fica negativo. Reversões acumuladas não ultrapassam original. Reversão reabre pendência. Cancelamento de origem com liquidações exige primeiro revertê-las explicitamente, sem apagar fatos. Total da fatura soma itens ativos e ajustes, sem total editável. Receita aplica regra equivalente com recebimentos.
- **FR-017**: Totais, pendências e estados de liquidação são derivados, nunca campos editáveis duplicados. Projeção persistida futura exige origem, versão, atualização e reconstrução documentadas; não faz parte do contrato inicial. Consulta paginada incompleta não apresenta total como completo. Pagamentos/recebimentos e inversões são imutáveis; correção usa inversão e novo fato.
- **FR-018**: Toda consulta declara base: consumo na data da compra/ocorrência externa, contando origem uma vez, com redução por estorno no mês de sua dataEfeito, sem recalcular o mês da compra original; planejamento na competência do compromisso, mantendo pagos no total planejado; caixa nas datas efetivas de liquidações/inversões. Para receitas, obrigações externas avulsas e cada parcela externa, sugerir competência de planejamento igual ao mês do vencimento (dataPrevista na receita), permitindo ajuste explícito independente. Alterar planejamento não altera vencimento, consumo ou caixa; alterar vencimento não sobrescreve competência já confirmada. Parcela de cartão usa sempre a competência de sua fatura, sem ajuste independente de planejamento. Estorno permanece vinculado à origem e pode resultar em reduções superiores aos novos gastos do período, representadas por magnitude e natureza explícitas, sem lançamento monetário negativo livre. Não somar fatura sobre parcelas, pagamento de fatura como novo consumo ou receita prevista como caixa. Diferença mensal não é saldo bancário; conta exige abertura e movimentos completos para oferecer saldo. Transferência própria não é receita/despesa e fica fora desta entrega.
- **FR-019**: Compra é origem e autoridade do total original; parcelas são seu cronograma, não consumo adicional. Compra em uma parcela gera um compromisso. Identidade da parcela inclui origem e ordinal; parcela de cartão pertence a exatamente uma fatura. Consumo/categoria soma compra; planejamento soma parcelas; caixa soma pagamentos. Pagamento parcial da fatura não identifica compras individuais quitadas: não inventar rateio nem gravar `pago` em cada parcela de cartão. A fatura é a única autoridade do vencimento de suas parcelas de cartão. O campo vencimento da parcela, quando presente no contrato, é uma cópia validada e deve ser exatamente igual a fatura.vencimento; não é editável de forma independente. Rejeitar divergência em criação, snapshot e prévia de edição, sem corrigir silenciosamente a fatura. Parcelas externas mantêm vencimento próprio.
- **FR-020**: Edição de série exige escopo `estaOcorrencia` ou `estaEFuturasNaoLiquidadas`, prévia do impacto e versões esperadas. Itens liquidados e faturas fechadas não são reescritos silenciosamente. Mudança no total/cronograma de compra com liquidação é bloqueada inicialmente; exige correção tipada em caso de uso próprio. Ajustes em fatura fechada são explícitos, sem reabrir/mover itens automaticamente. Cancelamento/arquivamento preserva relações e histórico.
- **FR-021**: Recorrência mensal origina receita ou obrigação externa, com início, âncora, fim opcional e valor fixo/estimado. Ocorrência tem identidade recorrência+competência. Exceções de valor/data e cancelamento prevalecem sobre projeção virtual. Materializada substitui virtual, mesmo cancelada. Encerrar molde afeta futuras ainda não confirmadas. Não há geração agendada com app fechado; consultar doze meses não implica gravá-los. Receita e obrigação externa avulsa possuem estimado booleano próprio. Ocorrência virtual recebe o valor e a indicação de estimativa do molde; materialização preserva ambos como dados da ocorrência e sua versão de molde. Confirmação explícita recebe o valor positivo definitivo, mantém ID/competenciaOcorrencia e marca apenas essa ocorrência com estimado=false, respeitando versões e bloqueios de liquidação existentes. Não altera molde, outras ocorrências, datas ou estado de pagamento, nem cria caixa; editar o molde não reverte ocorrências confirmadas para estimativa.

#### Repositórios, idempotência e versões

- **FR-022**: Contratos específicos por caso de uso seguem a tabela abaixo: UID vinculado à sessão autorizada, dados validados, chave e versões esperadas; resultado em dados comuns, IDs e versões, sem tipos do provedor. Não permitir UID ou caminho arbitrário para acessar outra conta. Evitar repositório CRUD genérico e adaptadores de entidades sem funcionalidade.
- **FR-023**: Mutação tem chave estável por UID e tipo de comando, criada antes da primeira tentativa e reaproveitada em repetição/retomada. Recibo em `operacoes` vincula chave, tipo, conteúdo canônico identificado, IDs resultantes e versão de contrato. Mesma chave/conteúdo retorna resultado original; conteúdo diferente retorna conflito. Recibo e efeitos são atômicos. Sem confirmação, consultar a mesma operação; não gerar nova chave para tentar novamente. Não remover recibo enquanto efeitos existirem. Chaves diferentes em lançamentos avulsos representam intenções distintas; não prometer deduplicação por descrição/valor.
- **FR-024**: Identidades naturais adicionais: parcela origem+ordinal, fatura cartão+competência e ocorrência recorrência+competência, impedindo duplicação mesmo com comandos de chaves diferentes. Codificação canônica não ambígua será definida no plano. Materialização repetida preserva exceções/cancelamentos.
- **FR-025**: Entidades financeiras têm `schemaVersion` de formato e `version` inteira crescente de edição, inicialmente 1. Atualizar exige versão esperada igual à atual e incremento único; repetição idempotente não incrementa. Não usar última escrita vencedora: conflito retorna ID/versão atual para releitura, nova prévia e nova intenção. Série e liquidação exigem fronteira comum de conflito por agregado, impedindo dois pagamentos sobre o mesmo saldo ou edição concorrente do cronograma. Mecanismo concreto não pode introduzir total financeiro duplicado.
- **FR-026**: Esquema desconhecido gera incompatibilidade e bloqueia escrita, sem conversão presumida. Migrações são explícitas, versionadas e retomáveis, preservando IDs e fatos. Mudança incompatível coordena contratos, autorização e dados. Versão de entidades financeiras não altera a versão do perfil de autenticação.
- **FR-027**: Erros discriminados: `valorInvalido`, `limiteMonetario`, `dataInvalida`, `referenciaInvalida`, `naoEncontrado`, `conflitoVersao`, `conflitoIdempotencia`, `limiteOperacional`, `semPermissao`, `indisponivel`, `cotaExcedida`, `esquemaIncompativel` e `confirmacaoIndeterminada`. Informar mensagem acionável, campo/limite e se cabe corrigir, reler ou repetir mesma chave. Escrita local/offline pendente não equivale a confirmação remota.

#### Limites, isolamento e entrega incremental

- **FR-028**: Política inicial: máximo 12 parcelas originais por série, 12 ocorrências por comando explícito e 32 mutações documentais por comando, contando origem, parcelas, faturas novas, recibo e controles. São tetos do aplicativo, não cotas oficiais ou garantia de aceite. Consultas paginadas têm até 50 registros; nenhum listener cobre todo histórico. Nomes/descrições até 120 caracteres, observações até 1000, até 5 etiquetas distintas por origem. Proibir arrays históricos crescentes.
- **FR-029**: Orçar escritas, bytes, validações e acessos das Rules por comando, respeitando o menor teto aplicável. Tetos internos: payload estimado até 1 MiB/comando e 32 KiB/documento, com margem para metadados, referências e índices. Rules: até 18 acessos documentais por operação atômica e 8 por escrita, reservando margem para os limites oficiais de 20/10; respeitar 1000 expressões avaliadas por requisição. Não pressupor cache de chamadas repetidas para comprovar orçamento. Se primeiro acesso, propriedade, referências e invariantes excederem orçamento, reduzir lote aceito ou rejeitar, sem retirar validações.
- **FR-030**: Acima de qualquer limite, rejeitar comando inteiro antes da escrita, com mensagem indicando limite atingido e ausência de nova série. Não dividir automaticamente uma compra em lotes independentes. Esta versão adota rejeição, sem protocolo de série multietapas. Falha/cota/permissão na confirmação preserva atomicidade; confirmação indeterminada exige consulta pela mesma chave. Sucesso somente com origem, todas as parcelas, vínculos e recibo confirmados.
- **FR-031**: Planejamento deve demonstrar orçamento com Rules concretas, incluindo todas as faturas novas e máximo de etiquetas. Para N=12, `1 origem + N parcelas + até N faturas + 1 recibo = até 26 escritas` é contagem preliminar, não prova da viabilidade das Rules. Se nem o mínimo de um caso de uso preservar invariantes dentro do orçamento, registrar bloqueio do adaptador, sem backend pago ou liberação ampla. Revalidar documentação e SDK efetivos antes de implementar/aumentar limites. Não confundir 500 transformações por documento com garantia universal de 500 escritas/parcelas.
- **FR-032**: Entidades privadas exclusivamente em `users/{uid}`. IDs/propriedade/referências de origem são imutáveis e nome não é chave. Usuário acessa apenas próprio UID após primeiro acesso concluído; papel administrativo não concede finanças de terceiros. Negar entidades sem funcionalidade. Validar tipos, campos permitidos, faixas, imutáveis, versões e relações na persistência/Rules; invariantes agregadas exigem estratégia verificável no plano. Validação de domínio não substitui autorização remota.
- **FR-033**: Adaptadores posteriores exigem Rules completas, nota de alterações, índices completos quando necessários e testes pequenos com A/B/visitante no projeto real autorizado. Funções puras e contratos são testados localmente sem emuladores. Esta etapa não modifica/publica Rules ou índices; finanças permanecem negadas até a funcionalidade correspondente. Cadastros referenciados são arquivados; exclusão física com dependências é bloqueada.

### Key Entities *(include if feature involves data)*

Os caminhos são contratos iniciais, não autorização para antecipar coleções. Um documento por entidade, sem toda a vida financeira em um array.

#### Convenções comuns

- `users/{uid}` preserva `uid`, `timezone`, `schemaVersion`, instantes e campos protegidos do primeiro acesso da feature 002. Mudança de fuso dependerá de funcionalidade e autorização próprias.
- Entidades novas têm ID estável, `schemaVersion=1`, `version=1` na criação, `createdAt` e `updatedAt` técnicos. Fatos imutáveis mantêm versão inicial. IDs não são reciclados.
- Referências são IDs tipados resolvidos no mesmo UID, sem caminhos livres. Campo ausente não significa zero, pago ou valor conhecido. Fatura/ocorrência/parcela usam identidade natural codificada sem ambiguidade.
- Classificação pertence à origem: parcelas referenciam compra/obrigação, sem categoria/titular editáveis duplicados. Calendário confirmado de fatura é snapshot; seu total não é. Arquivamento preserva resolução das referências históricas.
- Cancelamento de origem parcelada exige cancelar atomicamente todos os compromissos afetados permitidos, respeitando os bloqueios de liquidação; não coexistir origem cancelada com parcela ativa exigível. Cancelamento de uma parcela mantém origem e demais compromissos, com motivo explícito. Valores originais não são reescritos para ocultar a redução.
- Data de consumo é obrigatória em novas compras e ocorrências externas. Ausência é permitida somente em migração explicitamente incompleta; relatórios de consumo identificam o valor sem data e não o atribuem a um mês presumido. Competência de planejamento e vencimento continuam obrigatórios para cada compromisso futuro.
- `competenciaPlanejamento` de receita, obrigação externa avulsa e parcela externa é informação explícita independente do vencimento, inicialmente sugerida a partir dele (dataPrevista na receita). Na parcela de cartão, coincide obrigatoriamente com a competência da fatura. Consultas de planejamento filtram pela competência, não pelo mês do vencimento ou da liquidação. Em ocorrências recorrentes, mudar planejamento preserva competenciaOcorrencia e sua identidade natural, sem gerar outra ocorrência.

| Entidade e caminho relativo | Identidade e dados mínimos | Referências e fonte de verdade |
| --- | --- | --- |
| Titular — `titulares/{id}` | Nome, ativo/arquivado | Pessoa financeira gerenciada; não é login nem concede acesso. |
| Categoria — `categorias/{id}` | Nome, natureza receita/despesa, ativo/arquivado | Classificação da origem, sem orçamento ou total. |
| Conta — `contas/{id}` | Nome, tipo dinheiro/conta de pagamento, ativo/arquivado, titularId opcional | Instrumento de caixa, sem saldo editável ou credenciais. |
| Etiqueta — `etiquetas/{id}` | Nome, ativo/arquivado | Agrupamento opcional; nomes iguais não unem usuários. |
| Cartão — `cartoes/{id}` | Nome, banco, titularId, dias de fechamento/vencimento 1–31, ativo/arquivado | Calendário sugerido; sem número completo/CVV. Arquivar bloqueia novas compras, preserva pendências. |
| Receita — `receitas/{id}` | Descrição, valorPrevistoCentavos, estimado, competenciaPlanejamento, dataPrevista, categoriaId, estadoObrigacao; titularId/contaPrevistaId/etiquetaIds/observação opcionais | Previsão é autoridade. Se recorrente: recorrenciaId, competenciaOcorrencia e versão do molde. Recebimentos separados. |
| Obrigação externa — `obrigacoesExternas/{id}` | Descrição, modalidade avulsa/parcelada/emprestimoManual, valor original conhecido ou saldo migrado, categoriaId, estadoObrigacao; estimado obrigatório na avulsa; datas de consumo quando conhecidas, titularId/contaPrevistaId/etiquetaIds/observação opcionais | Avulsa tem competência/vencimento e estado de estimativa próprio; confirmar valor afeta somente a ocorrência. Série tem quantidade/numeroInicial e cronograma em parcelas. Não somar origem e parcelas no planejamento. Migração não inventa total original. |
| Compra — `compras/{id}` | Descrição, cartaoId, dataConsumo, valorTotalCentavos, quantidadeParcelas, primeiraCompetenciaFatura, categoriaId, estadoObrigacao; etiquetaIds/observação opcionais | Autoridade do consumo. Migração explícita usa numeroInicial/saldoMigradoCentavos e permite total original/data desconhecidos. Titular vem do cartão. Ajustes preservam original. |
| Parcela — `parcelas/{origemId-numero}` | origemTipo compra/obrigacaoExterna, origemId, numero, quantidadeOriginal, valorCentavos, competenciaPlanejamento, vencimento, estadoObrigacao | Compromisso, sem novo consumo. Compra exige faturaId; externa o proíbe. Origem/ordinal imutáveis. Soma coincide com total ou saldo migrado. Codificação inclui tipo para evitar colisão entre origens. |
| Fatura — `faturas/{cartaoId-competencia}` | cartaoId, competencia do vencimento, fechamento e vencimento confirmados, ciclo | Identidade única por cartão/mês; totais e pendências derivados. |
| Pagamento — `pagamentos/{id}` | Tipo pagamento/reversaoPagamento/reembolso, magnitude, dataEfetiva, contaId, alvoTipo/alvoId, operacaoId; motivo/originalId nas inversões | Fato de saída/inversão. Alvo é obrigação avulsa, parcela externa ou fatura. Reembolso vincula estorno e pagamento anterior; não reaplica redução de consumo. |
| Recebimento — `recebimentos/{id}` | Tipo recebimento/reversaoRecebimento, magnitude, dataEfetiva, contaId, receitaId, operacaoId; motivo/originalId na reversão | Fato de entrada/inversão; não altera previsão para simular recebimento. |
| Ajuste — `ajustes/{id}` | Tipo creditoObrigacao/estornoConsumo, magnitude, dataEfeito, alvoTipo/alvoId, origemId, motivo, operacaoId, vínculo opcional a ajuste de origem | Redução imutável, sem caixa automático. Estorno reduz consumo no mês de dataEfeito, preservando mês e vínculo da compra. Estorno parcelado explicita compromissos afetados; efeitos somam a redução e não são descontados duas vezes. |
| Recorrência — `recorrencias/{id}` | Tipo receita/obrigacaoExterna, descrição/classificação, valor, estimado, início/fim opcional, âncora, frequência mensal, ativa/encerrada | Molde, não lançamento adicional. Ocorrência registra recorrenciaId, competenciaOcorrencia e versão do molde; edição preserva confirmadas. |
| Operação — `operacoes/{chaveEscopada}` | Tipo, versão de contrato, identificação de conteúdo canônico, IDs/versões resultantes, confirmação técnica | Recibo imutável de idempotência, atômico com efeitos; não substitui registros de origem. |

#### Contratos de repositório por caso de uso

São capacidades observáveis, sem imposição de classes, linguagem ou framework; não existe `salvarQualquerEntidade`.

| Contrato | Entrada e saída | Garantia |
| --- | --- | --- |
| Consultar contexto cadastral | UID vinculado, IDs necessários → referências e versões | Leitura mínima, sem carregar histórico inteiro. |
| Criar compra/obrigação parcelada | Origem, cronograma completo, referências e chave → IDs, versões e recibo | Tudo ou nada; origem/ordinal únicos, sem parcela órfã. |
| Registrar previsão avulsa | Receita/obrigação validada, referências e chave → ID/versão | Uma previsão por intenção, sem caixa implícito. |
| Registrar liquidação/inversão/ajuste | Alvo, magnitude, conta quando houver caixa, data, motivo/origem quando exigidos, versão do agregado e chave → fato e versão de coordenação | Serializa concorrência por alvo; valida saldo e original; impede inversão excedente/duplicada. |
| Corrigir série | Escopo, prévia, IDs, versões e chave → conjunto confirmado | Preserva pagos/fechados e rejeita se não couber atomicamente. |
| Materializar ocorrências | Recorrência/versão, competências e chave → ocorrências novas/existentes | Identidade natural e respeito às exceções; sem duplicação virtual/persistida. |
| Consultar período/fatura | Base temporal, intervalo, filtros, limite/cursor → registros, versões e completude | Só apresentar total completo com todos os registros ou garantia equivalente. |
| Consultar operação | Chave escopada → confirmado com IDs, ausente confirmado ou indeterminado | Ausência local/offline não prova ausência remota; permite retomar. |

### Limites oficiais e decisão operacional

Verificados em 2026-10-17 via Context7 e páginas oficiais da edição Standard. Tetos internos são escolhas conservadoras e exigem comprovação por comando.

| Restrição oficial | Consequência |
| --- | --- |
| Requisição até 10 MiB; documento até 1 MiB | Tetos internos menores e estimativa; número de parcelas não basta. |
| Transação até 270 s, expiração com 60 s de inatividade | Expiração não é sucesso; retomar com mesma chave. |
| Até 500 transformações por documento em commit/transação | Não confundir com teto universal de documentos ou parcelas. |
| Rules: 10 acessos por operação individual, 20 no conjunto atômico; 1000 expressões por requisição | Orçar referências e invariantes sem presumir cache; margens internas de 8/18. |

Fontes: [Cotas oficiais](https://firebase.google.com/docs/firestore/quotas), [transações e lotes](https://firebase.google.com/docs/firestore/manage-data/transactions) e [condições das Rules](https://firebase.google.com/docs/firestore/security/rules-conditions). A referência Android encontrada pelo Context7 menciona 500 escritas; não é adotada como garantia do adaptador web. Cotas gratuitas e conectividade podem impedir confirmação. Os tetos de 12 parcelas/32 escritas não garantem aceite se o orçamento concreto for excedido.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos exemplos monetários válidos, incluindo máximo e um centavo, preservam valor no ciclo entrada → representação → apresentação → entrada; todos os inválidos definidos são rejeitados sem alteração.
- **SC-002**: Para cada quantidade de 1 a 12 e valores de fronteira/reconciliação, soma de parcelas coincide com total e diferença da divisão uniforme é no máximo um centavo, na mesma ordem em todas as execuções.
- **SC-003**: Todos os casos de virada de ano, âncoras 29/30/31 e anos 1900/2000/2028/2100 produzem calendário esperado; fusos distintos não alteram datas informadas.
- **SC-004**: Conjunto reconciliado apresenta zero dupla contagem e pendência exata nas três bases, inclusive após parciais, créditos e reversões; estorno em mês posterior preserva 100% do consumo original e registra sua redução somente no mês de dataEfeito, sem duplicá-la com o reembolso. Nos casos com planejamento e vencimento em meses diferentes, 100% das previsões aparecem no mês escolhido, preservando vencimento e caixa efetivo.
- **SC-005**: Toda repetição de intenção confirmada produz um resultado financeiro; toda edição concorrente incompatível gera conflito sem perda silenciosa de informação.
- **SC-006**: Em todos os casos de limite/falha injetada há série completa confirmada ou ausência de nova série; zero séries incompletas aparentam sucesso.
- **SC-007**: Regras de dinheiro/calendário e exemplos de reconciliação são verificáveis sem abrir telas ou conectar a serviços externos.
- **SC-008**: Revisão do modelo resolve identidade, referência, fonte de verdade e base temporal para todas as entidades; exemplos dos cinco fluxos permitem rastrear cada total aos registros de origem.

## Assumptions

- Constituição 1.2.0 e primeiro acesso protegido da feature 002 permanecem vigentes, sem ampliar administração, compartilhamento, integrações, serviços pagos ou permissões de autenticação.
- BRL e recorrência mensal são escopo inicial. Câmbio, juros automáticos, saldo credor, antecipação de parcelas, rateio de uma liquidação entre alvos e transferências exigem especificação futura.
- Pagamentos/recebimentos parciais são suportados pelos contratos, excedentes bloqueados; nunca inferir quitação por vencimento/fechamento.
- Limite de 12 parcelas e rejeição atômica são decisões iniciais revisáveis após orçamento das Rules. Empréstimos/migrações com quantidade original maior são rejeitados, sem truncamento.
- Crédito afeta dívida; estorno afeta consumo e explicita efeito na obrigação; reversão afeta liquidação; reembolso afeta caixa. Fluxos que demandam dívida menor que o já liquidado ficam bloqueados até correção própria, sem saldo credor implícito.
- Esta etapa não altera dados reais, não executa integração nem libera coleções. Planejamento deve demonstrar integridade do cronograma, segurança e concorrência por comando, sem alegar que os tetos já foram comprovados.
- Resolução de template: `specify preset resolve spec-template` falhou por launcher Python indisponível. Sem presets/sobrescritas locais encontrados, utilizado `.specify/templates/spec-template.md`, preservando seções e ordem. Numeração sequencial conforme `.specify/init-options.json`; nenhum hook/extensão configurado.
