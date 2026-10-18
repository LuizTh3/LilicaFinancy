# Feature Specification: Receitas e despesas externas ao cartão

**Feature Branch**: sem criação de branch; nenhum hook configurado (branch atual: develop)

**Created**: 2026-10-17

**Status**: Draft — validada para planejamento

**Input**: Receitas e despesas externas ao cartão com descrição, categoria, titular opcional, valor, planejamento/vencimento, observação, etiquetas e conta quando aplicável; receitas previstas/recebidas e despesas pendentes/pagas; liquidações parciais separadas e totais derivados; rejeição de excesso; gasto imediato consistente; correção de pendentes, cancelamento sem liquidação e reversão explícita de erro distinta de reembolso; idempotência, concorrência, transações e verificações compatíveis nas rules; listagem mensal e formulários mínimos; competência para planejamento e data real para caixa, mantendo pagos nos compromissos do mês.

## Clarifications

### Session 2026-10-17

- Q: A despesa externa deve exigir uma data de ocorrência, separada do vencimento e da competência de planejamento? → A: Sim. Exigir data de ocorrência, sugerindo hoje no formulário e permitindo correção antes de salvar (opção A).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar e consultar previsões externas (Priority: P1)

Como usuário autenticado, quero registrar receitas e despesas avulsas fora do cartão e consultar os compromissos de cada mês sem confundir previsão com dinheiro movimentado.

**Why this priority**: Forma a fonte de verdade dos compromissos antes de qualquer pagamento.

**Independent Test**: Cadastrar receita e despesa com cadastros privados válidos, recarregar e conferir a listagem sem liquidações.

**Acceptance Scenarios**:

1. **Given** categoria de receita ativa, **When** registro salário de R$ 1.000,00, data prevista 2026-11-05 e competência 2026-10, **Then** outubro mostra previsto R$ 1.000,00, recebido zero e pendente R$ 1.000,00; a data prevista continua em novembro e nenhum mês ganha entrada de caixa.
2. **Given** categoria de despesa ativa, **When** registro internet de R$ 100,00 com vencimento 2026-11-10, **Then** a competência sugerida é 2026-11, posso escolher 2026-10 e a obrigação fica pendente com ambos os campos preservados.
3. **Given** origem sem titular, conta prevista, etiquetas ou observação, **When** salvo os campos obrigatórios válidos, **Then** a ausência desses dados é preservada; titular administrado não recebe acesso ao aplicativo.
4. **Given** cadastro inexistente, arquivado, de outro usuário ou categoria de natureza incompatível, **When** tento novo vínculo, inclusive por envio direto, **Then** nada é criado e recebo erro de referência sem informação de terceiros.
5. **Given** mês vazio ou consulta incompleta, **When** abro a listagem, **Then** vejo estado vazio ou parcialidade, respectivamente; subtotal incompleto não é apresentado como total definitivo.
6. **Given** formulário de despesa externa, **When** inicio o cadastro, **Then** a data de ocorrência é obrigatória, aparece sugerida como hoje no fuso do perfil e pode ser corrigida antes de salvar; sem uma data válida, o cadastro é recusado. Ao informar ocorrência 2026-10-17, vencimento 2026-11-10 e competência 2026-12, os três valores são preservados separadamente sem criar pagamento.

---

### User Story 2 - Receber e pagar em partes (Priority: P1)

Como usuário, quero confirmar cada recebimento ou pagamento com valor, data real e conta efetiva, mantendo a diferença em aberto até completar a previsão.

**Why this priority**: Permite caixa correto sem quitação fictícia ou alteração da previsão para imitar uma liquidação.

**Independent Test**: Confirmar fatos separados para receita de R$ 1.000,00 e obrigação de R$ 100,00 e reconciliar seus históricos.

**Acceptance Scenarios**:

1. **Given** receita de R$ 1.000,00, **When** confirmo R$ 600,00 e depois R$ 400,00, **Then** existem dois recebimentos vinculados; a receita passa de parcial para recebida e o previsto permanece R$ 1.000,00.
2. **Given** despesa de R$ 100,00, **When** pago R$ 40,00 em 2026-10-31 pela conta A e R$ 60,00 em 2026-11-02 pela conta B, **Then** existem dois pagamentos, pago líquido R$ 100,00 e pendente zero; caixa registra R$ 40,00 em outubro e R$ 60,00 em novembro, independentemente da competência.
3. **Given** pendência de R$ 60,00, **When** tento liquidar R$ 60,01, zero, negativo ou centavo fracionário, **Then** a operação inteira é recusada sem fato, crédito ou ajuste de previsão. A mesma proteção vale para receita.
4. **Given** conta prevista arquivada depois da criação da origem, **When** confirmo liquidação, **Then** preciso selecionar conta efetiva ativa; a conta prevista antiga permanece no histórico sem substituição automática.
5. **Given** compromisso vencido ainda pendente, **When** o calendário avança, **Then** aparece indicação de atraso sem criação de pagamento ou quitação automática.

---

### User Story 3 - Registrar gasto imediato de forma consistente (Priority: P1)

Como usuário, quero informar despesa já paga em um único fluxo e ter obrigação e pagamento relacionados sem dupla contagem.

**Why this priority**: É um fluxo cotidiano e precisa das mesmas garantias de uma obrigação futura liquidada depois.

**Independent Test**: Registrar gasto imediato de R$ 35,90 e simular falha antes da confirmação e confirmação perdida.

**Acceptance Scenarios**:

1. **Given** despesa válida, data real e conta ativa, **When** confirmo gasto imediato, **Then** uma obrigação de R$ 35,90 e um pagamento integral vinculado são confirmados juntos; planejamento conta R$ 35,90 uma vez e caixa conta a saída uma vez.
2. **Given** falha de validação, permissão, rede ou cota antes da confirmação, **When** a operação não conclui, **Then** nenhum novo par incompleto fica confirmado nem a tela anuncia sucesso.
3. **Given** confirmação perdida, **When** retomo a mesma intenção, **Then** recupero o mesmo par ou confirmação indeterminada, sem criar outra obrigação ou pagamento.

---

### User Story 4 - Corrigir, cancelar e reverter erros (Priority: P1)

Como usuário, quero corrigir previsões ainda não movimentadas e desfazer explicitamente liquidações equivocadas, entendendo o impacto no histórico e nos totais.

**Why this priority**: Erros precisam ser recuperáveis sem apagar fatos ou fabricar devoluções.

**Independent Test**: Exercitar edição de pendente sem histórico, cancelamento, tentativa de alterar parcialmente pago e reversão entre meses.

**Acceptance Scenarios**:

1. **Given** origem ativa nunca liquidada, **When** corrijo descrição, classificação, valor ou datas com versão atual, **Then** só essa origem muda e nenhum caixa é criado; alterar vencimento preserva competência confirmada até ajuste explícito.
2. **Given** origem sem liquidação válida, **When** confirmo cancelamento com motivo e impacto, **Then** permanece consultável como cancelada, sai dos totais ativos de planejamento e não aparece como paga/recebida.
3. **Given** origem com qualquer liquidação válida, mesmo parcial, **When** tento editar, cancelar ou excluir origem/pagamento, **Then** a ação é bloqueada e sou orientado a revisar o histórico e, se houve erro, reverter explicitamente.
4. **Given** pagamento equivocado de R$ 40,00 em 2026-10-31, **When** registro reversão integral por erro em novembro com motivo, **Then** o original permanece imutável, uma reversão o referencia, sua contribuição líquida ao caixa de outubro passa a zero e R$ 40,00 retornam à pendência; novembro não ganha recebimento fictício.
5. **Given** pagamento realmente realizado e dinheiro devolvido depois, **When** acesso reversão por erro, **Then** o formulário explica que devolução real é evento distinto e não oferece registrar reembolso como reversão; este incremento não possui fluxo de reembolso.
6. **Given** liquidação revertida, **When** tento revertê-la com nova intenção, **Then** recebo conflito sem novo efeito; repetir a intenção original retorna a reversão confirmada.
7. **Given** origem com todos os fatos revertidos, **When** preciso corrigir valor ou classificação, **Then** a origem histórica não é reescrita: posso cancelá-la e cadastrar outra com vínculo explícito de substituição; fatos e reversões antigos continuam consultáveis.
8. **Given** origem na versão 2 e edição sem diferença normalizada, **When** confirmo com versão esperada 2, **Then** recebo semAlteracao, sem recibo ou nova revisão, e a intenção local é encerrada. Se outra edição confirmar versão 3, repetir o comando antigo exige releitura por conflito de versão, sem promessa de recuperar o resultado sem efeito anterior.

---

### User Story 5 - Confirmar em duas abas e sob falhas (Priority: P1)

Como usuário, quero repetir uma ação sem duplicar lançamentos e receber conflito claro quando outra aba consumir a pendência ou alterar a origem.

**Why this priority**: Saldo correto precisa sobreviver à concorrência e a envios fora dos controles visuais.

**Independent Test**: Disparar confirmações concorrentes sobre a mesma origem e escritas diretas inválidas, com intenções independentes.

**Acceptance Scenarios**:

1. **Given** obrigação de R$ 100,00 e duas abas lendo a mesma versão, **When** ambas tentam pagar R$ 70,00 com intenções diferentes, **Then** no máximo uma confirma; a outra exige releitura e o total nunca alcança R$ 140,00.
2. **Given** duas tentativas com mesma chave/conteúdo, **When** chegam juntas ou após reconexão, **Then** há um único efeito com os mesmos IDs; mesma chave com conteúdo diferente é rejeitada.
3. **Given** tentativa de inserir pagamento isolado, forjar pendência, associar vários fatos à mesma confirmação ou alterar somente o controle de liquidação, **When** enviada diretamente, **Then** é negada sem efeitos parciais.
4. **Given** edição/cancelamento concorrente com liquidação ou duas reversões do mesmo fato, **When** disputam confirmação, **Then** só transições compatíveis com o estado confirmado são aceitas; nenhuma cria origem cancelada com liquidação válida ou reversão duplicada.
5. **Given** confirmação remota indeterminada ou troca de usuário, **When** chega resposta tardia, **Then** não há sucesso indevido, reaplicação da intenção sob outro usuário ou exposição de dados da sessão anterior.

---

### User Story 6 - Conferir planejamento e caixa mensal (Priority: P2)

Como usuário, quero navegar pelos meses e distinguir previstos, liquidados e pendentes de receitas/despesas, inclusive quando o pagamento ocorreu em outro mês.

**Why this priority**: Dá visibilidade aos fatos registrados e evita interpretar quitação como sobra adicional.

**Independent Test**: Reconciliar outubro/novembro com os fatos da história 2, antes e depois de uma reversão.

**Acceptance Scenarios**:

1. **Given** despesa de competência outubro quitada em novembro, **When** consulto outubro, **Then** os compromissos continuam incluindo seu valor integral, com pendência atual zero; novembro mostra a saída no caixa sem criar outro compromisso.
2. **Given** receita prevista em outubro recebida em novembro, **When** alterno planejamento/caixa, **Then** previsão permanece em outubro e entrada aparece em novembro.
3. **Given** filtros por natureza, situação, categoria ou titular, **When** aplicados, **Then** lista e totais identificam recorte e base temporal; o detalhe oferece todas as liquidações e reversões da origem.

### Edge Cases

- R$ 0,01 de última pendência, soma exata e valores inválidos/fora da faixa do núcleo.
- Competência diferente de vencimento/data prevista; dezembro/janeiro; data inexistente e mudança de fuso sem deslocamento do dia financeiro.
- Data real futura recusada como realizado; passada permitida; vencimento futuro não impede pagamento antecipado limitado à obrigação existente, sem criar adiantamento/crédito sem origem.
- Conta efetiva diferente da prevista, carteira/dinheiro e conta arquivada após uso; reversão de erro conserva a conta histórica.
- Referências arquivadas continuam legíveis no vínculo antigo; novos vínculos/substituições exigem cadastros ativos.
- Estimativa corrigível antes da primeira liquidação; diferença após liquidação não gera juros, descontos ou renegociação presumidos.
- Cancelamento repetido, cancelamento após reversões e tentativa de reativação/exclusão: preservar histórico sem efeitos adicionais.
- Revisão alterada durante paginação, mês vazio, mudança de competência de origem sem histórico e total incompleto.
- Falta de rede/cota/permissão, confirmação perdida, chave com conteúdo divergente e esquema desconhecido.

## Requirements *(mandatory)*

### Functional Requirements

#### Escopo, dados e situação

- **FR-001**: Entregar cadastro, consulta mensal, detalhe, edição restrita, cancelamento e liquidação de receitas e despesas externas avulsas. Cartões/faturas, transferências próprias, geração de recorrências, parcelamentos e empréstimos não integram os formulários deste incremento; seus contratos anteriores são preservados.
- **FR-002**: Origem exige descrição de 1–120 caracteres após trim, categoria da natureza correta, valor positivo, competência com ano/mês e data prevista de recebimento ou vencimento. Despesa externa exige também data de ocorrência válida, independente do vencimento, competência e data real de pagamento; sugerir hoje no fuso do perfil, permitindo correção antes de salvar, e rejeitar ausência/data inválida. Aceitar titular/conta prevista opcionais, observação até 1000 caracteres e até cinco etiquetas distintas. Ausência não vira zero ou referência fictícia. Estimativa é atributo explícito independente da liquidação, inicialmente falsa quando não escolhida.
- **FR-003**: Usar BRL e dinheiro/calendário da feature 003. Sugerir competência pelo mês da data prevista/vencimento, permitindo escolha diferente. Alterar um campo não sobrescreve os demais. Data real deve ser válida e não posterior a hoje no fuso do perfil; previsão pode ser futura.
- **FR-004**: Separar origem ativa/cancelada da situação derivada: ativa sem liquidação válida é receita prevista/despesa pendente; liquidado entre zero e valor original indica parcialmente recebida/paga; pendência zero indica recebida/paga integralmente. Cancelada tem exigibilidade zero e nunca é quitada. Atraso decorre de pendência positiva e data prevista/vencimento anterior a hoje, sem alterar fatos.
- **FR-005**: Novos vínculos exigem na confirmação mesmo usuário, coleção correta, existência, estado ativo e natureza compatível de categoria. Conservar arquivado histórico só no mesmo registro/papel, conforme feature 004. Nova liquidação exige conta efetiva ativa, inclusive carteira/dinheiro; conta prevista é opcional. Proteger primeiro uso de categoria/conta na mesma fronteira de consistência do novo vínculo, conforme feature 004.

#### Liquidações e derivação

- **FR-006**: Cada pagamento/recebimento é fato separado, imutável, com valor positivo, data real, conta efetiva, intenção e exatamente uma origem da natureza correspondente. Uma origem admite vários fatos em contas/datas distintas. Não criar pago/recebido editável como fonte de verdade.
- **FR-007**: Liquidado líquido = soma de liquidações confirmadas menos reversões de erro válidas. Pendente = valor original ativo menos liquidado líquido. Cancelada tem exigível/pendente zero e nenhuma liquidação válida. Resultados são exatos e não negativos; fatos sem confirmação remota não compõem totais confirmados.
- **FR-008**: Rejeitar liquidação superior ao pendente confirmado, tanto para despesa quanto receita. Não ajustar previsão, truncar valor ou gerar crédito, adiantamento, desconto, juros ou renegociação. Pagamento antes do vencimento exige origem existente e limite da pendência.
- **FR-009**: Gasto imediato cria origem e pagamento integral vinculados numa única operação atômica, com recibo e controles: tudo confirma ou nada confirma. Aplicar a validação do pagamento posterior sem duplicar consumo/compromisso.

#### Correção e histórico

- **FR-010**: Corrigir origem ativa somente enquanto nunca houve liquidação e com versão esperada. Mudança de natureza receita/despesa exige cancelar/criar outra origem. Referência substituída passa novamente pela validação; confirmar estimativa/valor definitivo não cria liquidação.
- **FR-011**: Bloquear edição do conteúdo de origem com histórico de liquidação parcial/integral, mesmo após reversão. Correção exige reverter explicitamente fatos válidos, cancelar origem e cadastrar outra vinculada por substituição informada. Não transportar pagamentos automaticamente. Negar exclusão física de origens, fatos, reversões e recibos.
- **FR-012**: Cancelamento explícito exige confirmação do impacto, motivo, versão atual e ausência de liquidações válidas. Preservar origem, valores, datas e fatos revertidos; retirar apenas contribuição ativa ao planejamento. Não oferecer reativação neste incremento.
- **FR-013**: Reversão de erro exige liquidação original válida do mesmo usuário/origem, motivo de 1–1000 caracteres e confirmação do impacto. Nesta versão reverte integralmente um fato individual; sem reversão parcial ou de reversão. Criar inversão imutável sem alterar original; cada fato pode ser revertido uma única vez. Corrigir valor/conta/data exige reversão e novo fato com nova intenção.
- **FR-014**: Reversão de erro herda conta e data financeira originais, inclusive conta arquivada; instante técnico registra quando foi feita. Corrigir caixa do período original e reabrir pendência sem alterar competência. Exceção de conta histórica só vale para reversão vinculada, nunca para nova liquidação.
- **FR-015**: Distinguir visualmente erro de registro de reembolso/devolução real posterior. Não implementar reembolso ou estorno econômico de consumo neste incremento nem converter reversão em caixa ocorrido no dia da correção. Preservar tipo próprio para integração futura com eventos distintos da feature 003.

#### Idempotência, transação e segurança

- **FR-016**: Criação, gasto imediato, liquidação, reversão, edição e cancelamento usam chave estável por usuário/tipo, definida antes do envio. Para operações com efeito confirmado, mesma chave/conteúdo canônico retorna IDs/resultados originais sem novo efeito ou incremento de versão; chave com recibo e conteúdo diferente gera conflito. Recibo e efeitos confirmam juntos e são preservados. Exceção explícita: editar sem diferença normalizada ou cancelar origem já cancelada, com versão esperada atual, retorna semAlteracao sem escrita, recibo ou reserva persistente da chave. Esse resultado é uma verificação do estado atual, não confirmação persistida recuperável; o cliente encerra a intenção e descarta seu descritor, usando nova chave para qualquer intenção posterior. Repetição do comando sem efeito reavalia estado/versão e pode resultar em conflito após outra alteração. Intenções avulsas diferentes não são deduplicadas por descrição/valor.
- **FR-017**: Liquidação, reversão, edição e cancelamento compartilham fronteira de conflito por origem. A transação verifica estado/versão atuais, intenção processada, pendência e referências antes de confirmar fatos, revisão, controles de uso e recibo correspondentes. Gasto imediato valida o mesmo para o estado final da nova origem. Versão obsoleta exige releitura/nova confirmação informada; não reduzir valor ou confirmar sobre saldo diferente silenciosamente.
- **FR-018**: Operação sem confirmação remota não é sucesso. Preservar entrada e identidade da intenção na sessão; resolver confirmação perdida pela mesma intenção, sem chave nova automática. Distinguir validação, excesso, conflito, permissão, cota, indisponibilidade e confirmação indeterminada com recuperação acionável. Repetição interna da transação não gera novos IDs/fatos ou efeitos visuais duplicados.
- **FR-019**: Autorização remota deve comprovar, inclusive em escrita direta: propriedade/primeiro acesso concluído; campos permitidos, tipos, faixas e imutáveis; referências; transições; recibo e efeitos correspondentes; exatidão da mudança de liquidado; pendência não negativa e reversão única. Admin não ganha acesso financeiro alheio. Formulário ou transação do cliente isoladamente não satisfazem a proteção.
- **FR-020**: Validar estado anterior/posterior dos documentos relacionados na operação atômica. Nenhum fato sem origem/transição correspondente, nem transição/recibo com fato ausente ou de outro alvo, tipo, conta, valor ou intenção. Liquidação cria exatamente um fato; gasto imediato, uma origem e um fato; reversão, uma inversão do original. Impedir que fatos diferentes consumam o mesmo incremento de controle/recibo.
- **FR-021**: Se necessário para verificar pendência sem somar histórico nas rules, admitir somente projeção de controle protegida por origem, derivada dos fatos e sem edição independente. Inicializar em zero ou no pagamento vinculado do gasto imediato; cada transição corresponde exatamente ao único fato identificado; reversão exige prova única por original. Não há segunda autoridade financeira: reconstrução pelos fatos deve produzir o mesmo valor; divergência bloqueia mutações até reparação explícita. Não usar arrays históricos crescentes, total livre do cliente ou mero sinalizador pago. O plano especifica controles, inicialização, encadeamento, reconstrução/migração e harmoniza a projeção com a feature 003.
- **FR-022**: Antes de implementar, demonstrar estados anteriores/posteriores e orçamento verificável por comando dentro dos limites da feature 003, incluindo cinco etiquetas, perfil, referências, primeiro uso, recibo e controle. Provar validação nos dois sentidos entre fato/origem e impossibilidade de reutilizar fato. Não remover proteção nem adicionar backend pago para caber no orçamento; desenho inviável bloqueia habilitação do caso até revisão. Esta especificação define invariantes; mecanismos executáveis pertencem ao plano.
- **FR-023**: Implementação entrega rules completas, nota de alterações e índices completos quando necessários, preservando regras anteriores válidas. Planejar consultas por usuário/competência/data real; autorizar só casos entregues. Arquivo local não equivale a publicação; esta etapa não publica rules nem altera dados reais.

#### Listagem e formulários mínimos

- **FR-024**: Oferecer navegação mensal entre anos, listas de receitas/despesas, filtros por natureza/situação/categoria/titular e detalhe com original, liquidado líquido, pendente, datas, conta prevista, fatos/contas efetivas, reversões e motivos. Cancelados são consultáveis sem compor total ativo. Páginas até 50 registros; abrir um mês não baixa todo o histórico.
- **FR-025**: Planejamento usa competência da origem e mantém valor integral de origens ativas quitadas nos previstos/compromissos. Liquidado/pendente dessas origens representam posição atual explicitamente rotulada, sem prometer fotografia histórica do encerramento mensal. Pagamento não é novo compromisso. Resultado previsto é receitas menos despesas previstas, sem chamá-lo de saldo bancário disponível.
- **FR-026**: Caixa usa data real dos fatos válidos, inclusive de origem com competência em outro mês. Previsão não é caixa; reversão de erro anula contribuição do período original. Identificar base temporal, recorte e completude. Paginação/revisão alterada exige indicar parcialidade e concluir/recarregar antes de afirmar total definitivo.
- **FR-027**: Formulário de origem contém FR-002; liquidação contém valor, data real, conta efetiva e mostra origem/pendência; gasto imediato reúne dados em uma confirmação. Cancelamento/reversão mostram motivo/impacto. Usar rótulos, teclado, foco em erro, estados de carregamento/vazio/envio/erro e confirmação perceptível em celular/desktop. Limpar dados/intenções no logout/troca de sessão e descartar respostas tardias.
- **FR-028**: Aceitação da implementação cobre cálculos/datas localmente e persistência/rules com cliente autenticado no projeto real autorizado, dados fictícios A/B, visitante, admin sem propriedade e primeiro acesso pendente, sem emuladores. Incluir concorrência, escrita direta, falhas e reconstrução do controle; registrar execução/limitações sem anunciar testes remotos não realizados.

### Key Entities *(include if feature involves data)*

Entidades privadas do usuário autenticado; titular administrado não é login. Identidades estáveis não são recicladas ou derivadas de nomes. Versão de formato, revisão e instantes técnicos seguem o núcleo. Dados abaixo são contrato de negócio; esquema e regras executáveis serão fechados no plano.

| Entidade | Dados principais | Invariantes e vínculos |
| --- | --- | --- |
| Receita prevista | Descrição, categoria, valor, estimativa, competência, data prevista, estado; titular, conta prevista, etiquetas e observação opcionais | Autoridade da previsão; recebimentos separados, sem recebido editável. |
| Obrigação externa avulsa | Descrição, categoria, valor original, estimativa, data de ocorrência obrigatória, competência, vencimento, estado; vínculos opcionais equivalentes | Compromisso externo contado uma vez, sem cartão/fatura; ocorrência representa data de consumo e não é inferida do pagamento. |
| Recebimento | Valor, data real, conta efetiva, receita e intenção | Entrada imutável confirmada, limitada à pendência. |
| Pagamento | Valor, data real, conta efetiva, obrigação e intenção | Saída imutável confirmada; vários fatos por origem. |
| Reversão de erro | Tipo, original, origem, valor integral, conta/data herdadas, motivo, intenção e instante técnico | Uma por fato; original preservado, sem devolução real implícita. |
| Registro de correção/cancelamento | Origem, revisão anterior/nova, ação, motivo quando exigido, instante e intenção; substituição explicitamente vinculada quando aplicável | Preserva rastreabilidade; cancelamento não exclui ou quita. |
| Recibo de operação | Chave por usuário/tipo, conteúdo canônico identificado, IDs resultantes e versão do contrato | Imutável, confirmado com efeitos; protege repetição/conflito. |
| Controle derivado, se necessário | Origem, revisão, liquidado derivado e identificação verificável da transição | Protegido/reconstruível; não é cadastro editável ou autoridade alternativa. |
| Cadastros de referência | Categoria, titular, conta e etiquetas da feature 004 | Novos vínculos ativos/privados; conta efetiva obrigatória; arquivados históricos preservados. |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Pelo menos quatro de cinco participantes em teste assistido registram previsão e gasto imediato sem ajuda, cada registro em até dois minutos, desconsiderando indisponibilidade de conexão.
- **SC-002**: Em 100% dos roteiros de parcial, integral, reversão e centavo residual, original, liquidado líquido e pendente reconciliam exatamente, sem centavos perdidos ou pendência negativa.
- **SC-003**: Em todas as disputas e escritas diretas das histórias 3/5, zero excessos, pares incompletos, fatos órfãos, reversões duplicadas ou efeitos duplicados da mesma intenção.
- **SC-004**: Em 100% dos roteiros com competência, vencimento e liquidação em meses distintos, inclusive dezembro/janeiro, cada origem/fato aparece na base correta; quitados mantêm integralmente o compromisso planejado sem dupla despesa.
- **SC-005**: Todos os roteiros de correção/cancelamento/reversão preservam originais e vínculos; zero registros movimentados são editados/excluídos silenciosamente e nenhuma reversão produz reembolso fictício no mês da correção.
- **SC-006**: Zero acessos/alterações indevidos entre A/B, visitante, admin sem propriedade e primeiro acesso pendente, incluindo origens, fatos, controles e recibos por envio direto.
- **SC-007**: Em todas as falhas/retomadas exercitadas, sucesso de mutação exige confirmação e a mesma intenção com efeito confirmado recupera o mesmo resultado. Resultados semAlteracao seguem a exceção de FR-016: sem recibo ou nova revisão, intenção local encerrada e repetição sujeita à versão atual. Nenhuma tela apresenta total incompleto como definitivo ou dados da sessão anterior.
- **SC-008**: Pelo menos quatro de cinco participantes distinguem previsto, parcialmente liquidado, pendência atual e caixa do mês e identificam diferença entre reversão de erro e devolução real posterior.

## Assumptions

- Dependências: constituição 1.2.0, autenticação/primeiro acesso da 002, núcleo financeiro da 003 e cadastros privados da 004. Reutilizar contratos e registrar harmonizações necessárias no plano. Esta entrega é documental, sem implementação, publicação ou alteração de dados reais.
- Materializar lançamentos avulsos; recorrências, séries, empréstimos, cartões e projeção de doze meses ficam para fluxos próprios. A lista permite navegar livremente por meses/anos. Transferências, conciliação, adiantamentos sem obrigação, créditos, juros automáticos, renegociações e reembolsos estão fora deste incremento.
- Liquidação parcial é fato financeiro, não parcela de série. Receita nasce como previsão e seu recebimento exige confirmação separada; gasto imediato tem atalho atômico explicitamente solicitado.
- Reversão integral por fato é o mínimo adotado: anular registro incorreto e criar o correto. Erro conserva data financeira original e registra instante técnico atual, podendo corrigir caixa passado. É especialização explícita da inversão tipada da 003; harmonizar contrato/testes no plano sem reinterpretar reembolso posterior como erro.
- Origem com histórico revertido pode ser cancelada, sem edição de seu conteúdo; substituição vinculada evita reescrever contexto passado. Não transferir liquidações automaticamente.
- Data de ocorrência é a data de consumo da despesa externa no contrato compartilhado e é obrigatória neste incremento, com sugestão visível de hoje corrigível antes de salvar. Não inferir da liquidação, competência ou vencimento. Relatório de consumo não é entregue aqui.
- Totais de competência mostram posição atual das origens daquele mês; caixa mostra fatos nas datas reais. Fotografia retroativa da pendência e fechamento contábil imutável não são prometidos.
- Controle derivado só é admissível como projeção protegida/reconstruível dos fatos, conforme constituição. Compatibilidade concreta com rules e orçamento é critério de entrada da implementação, não capacidade presumida neste documento.
- Numeração sequencial 005. Ausência de extensions.yml/hooks verificada. O comando specify preset resolve spec-template falhou por launcher Python indisponível; sem presets/sobrescritas locais, usou-se .specify/templates/spec-template.md, preservando seções e ordem.

### Referências para planejamento

- [Transações e validação atômica](https://firebase.google.com/docs/firestore/manage-data/transactions) e [condições e acessos documentais das rules](https://firebase.google.com/docs/firestore/security/rules-conditions), documentação oficial consultada via Context7 em 2026-10-17 para orientar o contrato solicitado. Prova concreta e orçamento continuam obrigatórios no plano.
