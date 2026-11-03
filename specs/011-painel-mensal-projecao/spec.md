# Feature Specification: Painel mensal e projeção de 12 meses

**Feature Branch**: `develop` (checkout existente); feature lógica `011-painel-mensal-projecao`

**Created**: 2026-10-20

**Status**: Draft validado para planejamento

**Input**: Substituir o resumo da planilha por tela principal mensal e visão navegável de 12 meses. Consolidar receitas, faturas por cartão, obrigações externas, empréstimos e recorrências com detalhamento. Mostrar previstos, recebidos, compromissos, pagamentos, pendências e resultado, distinguindo planejamento, caixa e consumo. Evitar dupla contagem, combinar projeção da etapa 10, identificar estimativas, excluir transferências próprias de receitas/despesas, distinguir resultado de saldo bancário e aplicar filtros compatíveis, consultas limitadas, índices e cache de sessão. Tabelas e totais simples são suficientes.

## Clarifications

### Session 2026-10-20

- Q: Se um pagamento ou lançamento mudar enquanto o painel carrega, como os totais devem ser apresentados? → A: Mostrar como completo somente quando todas as fontes refletirem o mesmo momento de consulta; durante a atualização, manter a visão anterior identificada ou mostrar carregamento/parcialidade (opção A).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conferir o mês e explicar os totais (Priority: P1)

Como usuário autenticado, quero entender quanto espero receber, quanto comprometi e quanto permanece pendente, chegando aos lançamentos que explicam cada indicador.

**Why this priority**: Substitui a conferência principal da planilha sem tratar pagamento como redução artificial dos compromissos.

**Independent Test**: Mês com receita prevista de R$5.000,00, recebimento de R$3.000,00, fatura líquida de R$1.000,00 com R$400,00 pagos, obrigação avulsa de R$200,00 quitada e parcela de empréstimo de R$300,00 não paga.

**Acceptance Scenarios**:

1. **Given** esse conjunto, **When** consulta planejamento, **Then** vê previsto R$5.000,00, recebido dessas receitas R$3.000,00, a receber R$2.000,00, compromissos R$1.500,00, liquidado desses compromissos R$600,00, pendente R$900,00 e resultado previsto R$3.500,00, com base e recorte identificados.
2. **Given** itens formando a fatura e capital original informado do empréstimo, **When** soma compromissos, **Then** conta somente a fatura líquida e obrigações externas do mês; itens da fatura e capital não são acréscimos.
3. **Given** pagamento adicional de R$100,00 da fatura, **When** atualiza, **Then** compromissos e resultado previsto permanecem iguais; liquidado passa a R$700,00 e pendente a R$800,00.
4. **Given** indicador completo, **When** abre o detalhamento, **Then** contribuições e ajustes reconciliam exatamente o total e permitem abrir os registros de origem, preservando período e filtros no retorno.

### User Story 2 - Comparar as três bases (Priority: P1)

Como usuário, quero compreender por que compra, fatura e pagamento aparecem em datas e valores diferentes.

**Why this priority**: Evita decisões baseadas na mistura de consumo, obrigação e movimentação efetiva.

**Independent Test**: Compra de R$1.200,00 em outubro, em três parcelas de R$400,00 nas faturas de novembro a janeiro; pagamentos da fatura de novembro de R$150,00 em outubro e R$250,00 em dezembro.

**Acceptance Scenarios**:

1. **Given** essa compra, **When** compara bases, **Then** consumo reconhece R$1.200,00 em outubro, planejamento R$400,00 em cada fatura de novembro a janeiro e caixa saídas de R$150,00 em outubro e R$250,00 em dezembro; pagamento não cria novo consumo.
2. **Given** obrigação com competência novembro, vencimento dezembro e pagamento janeiro, **When** compara meses, **Then** planejamento a inclui em novembro e caixa em janeiro; vencimento permanece visível sem criar outra contribuição em dezembro.
3. **Given** pagamento em dezembro de compromisso de novembro, **When** consulta planejamento de novembro, **Then** a liquidação atual desse compromisso aparece identificada como posição atual, enquanto caixa inclui o fato somente em dezembro.
4. **Given** transferência entre contas próprias e reembolso vinculado, **When** consulta indicadores, **Then** transferência não vira receita/despesa e reembolso aparece como devolução de saída, não como nova receita prevista ou recebimento de receita.

### User Story 3 - Navegar por doze meses com recorrências (Priority: P1)

Como usuário, quero comparar doze meses consecutivos e navegar para outros períodos sem perder compromissos ou repetir previsões.

**Why this priority**: Permite antecipação sem colunas fixas por ano na planilha.

**Independent Test**: Abrir novembro de 2026 a outubro de 2027 com parcelas, assinaturas, energia estimada e uma ocorrência cancelada; avançar e retroceder o início da janela.

**Acceptance Scenarios**:

1. **Given** início novembro de 2026, **When** abre doze meses, **Then** vê exatamente novembro a outubro de 2027 e pode abrir cada mês, conservando filtros compatíveis.
2. **Given** energia virtual de R$150,00 e persistida confirmada em R$173,42 na mesma identidade, **When** projeta, **Then** conta somente R$173,42; pulo/cancelamento impede reaparecimento e revisões respeitam vigências.
3. **Given** assinatura virtual de R$50,00 destinada a fatura persistida de R$200,00 que ainda não a contém, **When** projeta, **Then** o compromisso da fatura é R$250,00, com R$50,00 identificado como previsão; materializar sem mudança de valor mantém R$250,00 uma vez.
4. **Given** janela projetada, **When** navega, **Then** a soma não registra recebimentos, pagamentos ou compromissos; eventual geração segue exclusivamente o fluxo autorizado da etapa 10.

### User Story 4 - Filtrar sem atribuir pagamentos indevidos (Priority: P2)

Como usuário, quero recortar por titular, cartão, categoria ou etiqueta sabendo quais indicadores são completos e quais representam somente itens selecionados.

**Why this priority**: O filtro deve explicar despesas sem inventar distribuição da dívida.

**Independent Test**: Fatura de R$1.000,00 com R$600,00 em alimentação, R$400,00 em transporte e pagamento de R$300,00; incluir etiquetas sobrepostas.

**Acceptance Scenarios**:

1. **Given** filtro alimentação, **When** consulta a fatura, **Then** vê R$600,00 de itens selecionados, explicitamente parte da fatura; total integral R$1.000,00, liquidado R$300,00 e pendente R$700,00 são apenas contexto integral, sem atribuição à categoria.
2. **Given** filtro por cartão, **When** aplicado, **Then** seleciona faturas/itens desse cartão; receitas e externas incompatíveis não viram zero e resultado mensal global é indisponível nesse recorte.
3. **Given** item com duas etiquetas selecionadas, **When** filtra por qualquer uma delas, **Then** conta o item uma vez; dimensões distintas se combinam por interseção.
4. **Given** filtro que recorta parte dos itens de fatura, **When** vê resumo, **Then** subtotal selecionado não substitui compromissos integrais nem produz resultado previsto ou pendência consolidada artificialmente atribuídos ao filtro.

### User Story 5 - Reconhecer limites e distinguir saldo de resultado (Priority: P2)

Como usuário, quero saber quando faltam dados ou estão desatualizados e distinguir resultado mensal de saldo calculado de conta.

**Why this priority**: Falta de leitura não deve parecer ausência de dívida ou dinheiro disponível.

**Independent Test**: Consultar período com continuação pendente, falha em uma fonte, conta sem saldo inicial e troca de usuário.

**Acceptance Scenarios**:

1. **Given** período incompleto, **When** vê totais, **Then** são parciais com fontes pendentes e continuação; nenhuma lacuna vira zero confirmado.
2. **Given** resultado positivo sem saldo inicial e movimentos completos, **When** abre o mês, **Then** vê resultado previsto sem rótulo de saldo bancário ou disponível.
3. **Given** saldo inicial de R$1.000,00 datado e movimentos completos posteriores de entrada R$500,00 e saída R$200,00, **When** saldo calculado é oferecido, **Then** mostra R$1.300,00, conta, data-base, intervalo, atualização e limitações.
4. **Given** usuário A com cache, **When** sai e entra como B, **Then** dados, filtros com referências privadas e respostas tardias de A não aparecem para B.
5. **Given** pagamento ou lançamento alterado em outra aba durante a carga ou continuação, **When** conclui o resumo, **Then** todas as fontes do total completo refletem o mesmo momento de consulta; a atualização não mistura valores anteriores e posteriores. Até obter visão coerente, mantém a anterior identificada ou mostra carregamento/parcialidade. O detalhamento deve explicar o mesmo momento do total; se precisar atualizar, comunica a atualização e reconcilia total e detalhe juntos.

### Edge Cases

- Dezembro/janeiro, fevereiro bissexto e limites de calendário; não criar mês inválido ou deslocar data por fuso.
- Vazio completo versus falha, cota, permissão, esquema desconhecido e leitura parcial.
- Cartões do mesmo banco e titulares distintos, arquivamento e referências históricas indisponíveis.
- Liquidação parcial, antecipada, tardia, reversão de erro, crédito sem caixa e reembolso real em outro mês.
- Correção de erro altera consumo original; estorno econômico reduz consumo na data de efeito sem duplicação pelo reembolso.
- Empréstimo em andamento sem valor original ou consumo conhecido; parcelas anteriores não cadastradas não viram pagas.
- Cancelamento/substituição e encerramento de recorrência com obrigações confirmadas posteriores preservadas.
- Assinatura virtual destinada a fatura ainda não persistida; projetar destino/valor sem gravar fatura por leitura.
- Página ainda não reconciliada com persistida: não fabricar virtual duplicada.
- Dados alterados em outra aba, cache antigo e respostas de sessões anteriores.
- Item sem categoria, etiqueta ou data de consumo; não atribuir mês por presunção.
- Soma fora da faixa monetária: sinalizar erro, nunca arredondar ou truncar silenciosamente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Oferecer tela principal mensal, inicialmente no mês atual do fuso do usuário, seleção de mês/ano, anterior/próximo e retorno ao mês atual. Usar datas de calendário e período com ano.
- **FR-002**: Oferecer tabela de exatamente 12 meses consecutivos com início selecionável, navegação anterior/posterior e abertura de cada mês, preservando filtros compatíveis. Não limitar ao ano civil ou intervalo da planilha.
- **FR-003**: Consolidar receitas avulsas/recorrentes, faturas por cartão, externas avulsas/parceladas, empréstimos manuais e recorrências. Identificar natureza, origem, titular, estimativa e estado; dependência indisponível não equivale a ausência de registros.
- **FR-004**: Cada indicador e detalhe deve identificar base, período, filtros, completude e atualização. As bases são planejamento por competência confirmada, inicialmente sugerida pelo vencimento/data prevista; caixa por data efetiva; consumo por data de consumo/efeito aplicável. Não substituir competência por vencimento silenciosamente.
- **FR-005**: Planejamento completo mostra receitas previstas totais, recebido líquido dessas receitas, a receber, compromissos líquidos totais, liquidado líquido desses compromissos, pendente e resultado previsto. Liquidações vinculadas são posição atual dos alvos do recorte com atualização indicada, independentemente do mês do fato; não são fluxo de caixa daquele mês.
- **FR-006**: Receitas previstas incluem receitas ativas integralmente, mesmo recebidas; a receber soma remanescentes por receita. Compromissos incluem faturas líquidas e obrigações externas ativas, mesmo quitadas; pendente soma remanescentes por alvo sem compensar alvos distintos. Aplicar ajustes, cancelamentos, créditos, reversões e reembolsos pelos contratos de origem. Não somar a receber e a pagar em pendência indiferenciada.
- **FR-007**: Resultado previsto é receitas previstas menos compromissos planejados, indicando superávit/déficit/equilíbrio e magnitude exata. Não subtrair pagamentos novamente nem substituir compromissos por pendências.
- **FR-008**: No planejamento, cada cartão/mês contribui uma única fatura líquida projetada: total persistido com ajustes e acréscimo somente de assinaturas virtuais ainda não representadas. Itens/parcelas explicam esse valor sem segunda contribuição. Pagamento não reduz o valor planejado; liquidado/pendente são medidas separadas.
- **FR-009**: Externas contribuem uma vez por obrigação/ocorrência/parcela ativa e competência. Séries, compras originais, valor original de empréstimo e soma contratual não são adicionais. Preservar valor original ausente e posições não cadastradas. Entrada de empréstimo só entra se explicitamente registrada como receita vinculada.
- **FR-010**: Caixa mostra recebimentos de receitas, pagamentos externos/de faturas e inversões pelas datas efetivas, distinguindo entradas, saídas e resultado de caixa. Reversão de erro corrige fato na data original conforme origem; reembolso real é devolução na data recebida. Previsão, cadastro, vencimento e crédito sem movimentação não geram caixa.
- **FR-011**: Consumo usa itens/origens de despesa conforme etapa 003: compra integral uma vez na origem, inclusive parcelada; parcelas e pagamentos não criam consumo. Correção de erro ajusta mês original conforme etapa 008; devolução econômica reduz na data de efeito. Valores sem data/base confiável ficam explicitamente não atribuídos, fora do subtotal mensal; não inferir consumo ou encargos do empréstimo.
- **FR-012**: Reutilizar serviço de projeção da etapa 010, combinando persistidas, virtuais e exceções pela identidade estável, com persistida prioritária, tombstones, vigências e encerramentos respeitados. Não manter segundo calendário/regra paralela. Ausência em página ainda não reconciliada não permite criar previsão virtual duplicada.
- **FR-013**: Distinguir estimado/confirmado em linhas e totais, inclusive componente estimado de fatura projetada; todo total com estimativas deve indicar isso e seu valor estimado. Virtual/persistido é dimensão diferente. Materialização sem mudança financeira preserva o total.
- **FR-014**: Não escrever dados financeiros para calcular, navegar ou filtrar. Eventual geração ao abrir período ou por ação oferecida segue somente fluxo limitado/idempotente da etapa 010 com resultado comunicado. Janela de 12 meses não autoriza materialização ilimitada nem promete execução com app fechado.
- **FR-015**: Permitir detalhar indicador até contribuições, origens, itens, ajustes e fatos, preservando identidade. Fatura abre itens/liquidações; parcela abre série e pagamentos por parcela; ocorrência abre origem/revisão. Total completo reconcilia centavo a centavo; agrupamento e filhos não são somados juntos.
- **FR-016**: Permitir período, titular, cartão, categoria e etiqueta onde compatíveis com base/indicador; exibir ativos, limpar e explicar incompatibilidade. Não ignorar filtro ou tornar indicador inaplicável em zero. Titular de cartão vem do cartão; demais vínculos vêm da origem. Sem vínculo é identificado como não informado.
- **FR-017**: Dimensões distintas combinam por interseção; múltiplos valores da mesma dimensão por união com deduplicação. Cartão seleciona somente dimensão de cartão, sem atribuir receitas/externas incompatíveis a esse cartão para produzir resultado global.
- **FR-018**: Categoria/etiqueta em fatura produz subtotal dos itens selecionados, distinto do total integral. Não ratear liquidado/pendente por categoria, etiqueta ou item. Totais integrais podem aparecer como contexto sem se tornarem valores atribuídos ao filtro. Sem política de alocação, tornar indisponíveis compromissos, liquidação/pendência consolidados e resultado previsto desse recorte parcial, preservando subtotais explicáveis e indicadores compatíveis.
- **FR-019**: Em caixa, categoria/etiqueta não atribui pagamento de fatura a itens por presunção. Se exige essa atribuição, indicar indisponibilidade do indicador completo; fatos externos atribuíveis eventualmente exibidos são identificados como subconjunto. Cartão pode selecionar fatos da própria fatura. Sem filtro, valores não classificados continuam nos totais.
- **FR-020**: Excluir transferências próprias de receitas/despesas e seus resultados consolidados. Quando movimentos de conta forem exibidos, identificar transferência interna e contrapartida, sem receita/despesa nova nem dupla contagem; afetar apenas saldos das contas envolvidas.
- **FR-021**: Resultado previsto/resultado de caixa não são saldo bancário nem garantia de dinheiro disponível. Saldo calculado de conta é opcional, somente com saldo inicial válido datado, conta identificada e movimentos completos até a data final; mostrar data-base, intervalo, atualização e limitações. Sem requisitos, mostrar indisponibilidade em vez de estimar saldo pelo resultado mensal. Não alegar conciliação bancária automática.
- **FR-022**: Consultar somente usuário e período necessários, com paginação e continuação explícitas: janela de até12 meses, páginas de até50 registros e até100 documentos financeiros retornados por rodada de continuação somados entre fontes. Atingido teto, continuar mediante avanço explícito. Não carregar histórico ilimitado para mês, pendência ou saldo. Planejamento deve definir consultas/índices por base, inclusive liquidações fora do mês de competência.
- **FR-023**: Manter completude por fonte, mês e indicador. Falha, limite, permissão, incompatibilidade ou continuação impedem apresentar total dependente como completo; identificar subtotal parcial. Só mostrar zero confirmado após reconciliação completa. Um resumo mensal ou janela de12 meses só pode ser apresentado como completo quando todas as fontes e páginas necessárias refletirem o mesmo momento de consulta, incluindo dados usados nas projeções virtuais. Detalhes devem reconciliar com esse momento; se ele não puder ser conservado, comunicar atualização e reconciliar novamente resumo e detalhe antes de apresentá-los como completos. Não misturar momentos distintos nem ocultar alterações concorrentes. Isso é consistência da consulta, não reconstrução de fechamento histórico.
- **FR-024**: Cache de sessão deve separar usuário, base, período, filtros, momento de consulta e revisão compatível, mostrando atualização/desatualização. Oferecer atualizar e invalidar recortes afetados após mudanças confirmadas; não somar versões divergentes. Durante atualização, manter visão anterior coerente identificada ou mostrar carregamento/parcialidade até concluir a nova visão coerente, sem substituir fontes isoladas dentro de total anunciado completo. Falha pode conservar última visão desatualizada identificada. Descartar dados privados e respostas tardias ao sair/trocar usuário.
- **FR-025**: Consultas e detalhes obedecem isolamento dos registros de origem, inclusive acesso direto. Nomes iguais de titulares, bancos ou etiquetas não compartilham dados. Administração não concede acesso a finanças de outro usuário.
- **FR-026**: Tabelas/totais devem ser legíveis em desktop/celular, com bases, estimativas e parcialidade identificadas sem depender apenas de cor, teclado, rótulos e estados de carregamento/vazio/erro com recuperação. Retorno de detalhe conserva contexto válido da sessão atual.
- **FR-027**: Usar precisão monetária/calendário compartilhados e rejeitar extrapolação sem arredondamento/compensação implícita. Aceitação exige reconciliação das três bases, comparação com conjunto revisado da planilha e leitura/isolamento no ambiente real autorizado, registrando resultados/limitações. Esta especificação não autoriza publicação, envio remoto de fontes ou criação de dados financeiros.

### Key Entities *(include if feature involves data)*

- **Recorte de análise**: Usuário, base, período, filtros e atualização que definem valores comparáveis e indicadores aplicáveis.
- **Resumo mensal**: Indicadores de receitas, compromissos, liquidação, pendência e resultado, com estimativas e cobertura; representação derivada, não total editável independente.
- **Janela de 12 meses**: Resumos consecutivos navegáveis, com significado consistente e completude por mês.
- **Contribuição rastreável**: Identidade/origem, natureza, valor, competência/data, ajustes e vínculo ao detalhe; contribui uma vez na base correspondente.
- **Fatura projetada**: Cartão/competência, valor persistido, previsões reconciliadas, total líquido projetado, liquidado e pendente; itens explicam sem duplicar.
- **Ocorrência projetada**: Resultado da etapa010 com identidade, origem virtual/persistida, vigência, estado e estimativa/confirmação; não é cópia financeira nova.
- **Fato de caixa**: Recebimento/pagamento/inversão com alvo, conta, data e origem; transferência interna é distinguida.
- **Cobertura do recorte**: Fontes/subperíodos completos ou pendentes, continuação, momento comum de consulta, atualização, falhas e valores não atribuíveis; páginas e detalhes de um total completo devem conservar esse momento.
- **Saldo calculado de conta**: Derivado opcional de saldo inicial datado e movimentos completos, com limitações e separado dos resultados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: No conjunto revisado,100% dos totais completos reconciliam centavo a centavo nas três bases, inclusive parciais, antecipações, atrasos, estorno, reversão e virada de ano; zero dupla contagem entre faturas, itens, parcelas e origens.
- **SC-002**: Em100% dos casos de quitação sem outra alteração financeira, compromissos e resultado previsto permanecem iguais; liquidado, pendente e caixa mudam somente conforme fatos aplicáveis.
- **SC-003**: Todos os casos de projeção/materialização preservam uma contribuição por identidade, zero recriação de exceções e distinção de estimativas/confirmados.
- **SC-004**: Em todos os recortes parciais de fatura, nenhum pagamento/pendência é rateado implicitamente e nenhum subtotal selecionado é anunciado integral;100% dos indicadores identificam base e aplicabilidade.
- **SC-005**: A partir de cada visão, usuário abre qualquer mês e chega ao primeiro nível explicativo de um indicador em até duas ações, preservando contexto no retorno.
- **SC-006**: Em ensaio com cinco usuários e dados fictícios, pelo menos quatro identificam corretamente planejamento, caixa e consumo e explicam por que resultado não é saldo disponível, sem ajuda, em até três minutos.
- **SC-007**: Em todos os testes de falha, continuação, cache desatualizado, alteração concorrente e troca de usuário, nenhum total incompleto ou formado por momentos diferentes é anunciado completo, nenhuma falha vira zero confirmado e nenhum dado da sessão anterior é exposto. Em100% dos casos de alteração durante carga/continuação/detalhamento, totais completos e seus detalhes refletem o mesmo momento de consulta identificado.
- **SC-008**: Navegar dez janelas consecutivas exige apenas consultas delimitadas e continuação visível, sem carga de todo histórico; nenhum saldo calculado é mostrado sem saldo inicial datado e cobertura completa do intervalo.

## Assumptions

- Constituição1.2.0 e contratos003–010 fornecem semântica. Planejamento deve verificar implementação/habilitação real de cada fonte. A avaliação da etapa010 está pendente; sua projeção não é presumida disponível nem substituída por regra paralela ou total zero.
- Fuso inicial America/Rio_Branco; datas salvas não são reinterpretadas ao mudar fuso. Tela inicial usa planejamento/mês atual e janela começa no mês selecionado.
- Liquidação no planejamento é posição atual, não reconstrução do estado conhecido no fechamento passado. Retrato histórico por data de conhecimento fica fora do escopo.
- Política inicial para filtros parciais de fatura é indisponibilizar indicadores que exigem alocação, sem rateio proporcional ou escolha arbitrária de itens.
- Não criar cadastro de transferências ou novo livro de saldo nesta etapa. Reutilizar somente movimentos compatíveis existentes; saldo calculado é opcional e condicionado. Sem cobertura comprovada, entregar os resultados definidos sem saldo bancário.
- Tetos de leitura são limites operacionais da feature, não promessa de cota/capacidade do provedor. Planejamento harmoniza leitores, índices e cache com etapas anteriores sem baixar histórico ilimitado.
- Fora: importação automática da planilha, integração bancária, disponibilidade garantida, orçamento por categoria, juros automáticos, alocação da dívida da fatura, novos comandos de liquidação e painéis ornamentais. Conferência com planilha usa conjunto revisado com anos/origens e divergências documentadas.
