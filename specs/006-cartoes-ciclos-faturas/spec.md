# Feature Specification: Cartões e ciclos de faturas

**Feature Branch**: sem criação de branch; nenhum hook configurado (branch atual: develop)

**Created**: 2026-10-18

**Status**: Draft — validada para planejamento

**Input**: Cadastrar cartões por banco, nome e titular, fechamento e vencimento, com arquivamento, sem número completo, CVV ou acesso bancário. Identificar faturas por cartão e mês/ano de vencimento, com datas próprias e snapshots históricos. Sugerir primeira fatura comparando compra e ciclos, considerando compra no fechamento na seguinte e permitindo correção pelo usuário. Tratar fechamento no mês anterior, dias inexistentes, virada de ano e vencimento manual, sem deslocamento por dias úteis. Exibir faturas por cartão/período, inicialmente vazias, com ciclo independente de pagamento. Arquivar impede compras novas e preserva obrigações.

## Clarifications

### Session 2026-10-18

- Q: Num cartão com fechamento dia 30 e vencimento dia 31, como deve funcionar fevereiro, quando ambas as datas caem no último dia do mês? → A: Manter fechamento e vencimento no mesmo mês, aceitando a coincidência causada pelo ajuste ao último dia: ambos em 28/02/2027; em março, 30/03 e 31/03 (opção A).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar e identificar meus cartões (Priority: P1)

Como usuário autenticado com primeiro acesso concluído, quero cadastrar cartões de diferentes bancos e titulares para consultar separadamente seus calendários.

**Why this priority**: Identidade inequívoca e calendário válido são a base de cada fatura.

**Independent Test**: Criar dois cartões fictícios do mesmo banco, consultar, editar e recarregar sem compras ou pagamentos.

**Acceptance Scenarios**:

1. **Given** um titular ativo do próprio usuário, **When** informa banco, nome, titular e dias 10/17, **Then** salva cartão ativo e recupera os mesmos dados após recarregar.
2. **Given** cartões com nomes e bancos iguais, **When** possuem titulares distintos ou são cadastros separados, **Then** mantêm identidades e faturas distintas; renomear não altera identidades.
3. **Given** banco/nome vazio, dia 0/32/fracionário ou titular ausente, inexistente, arquivado ou de outro usuário, **When** tenta salvar, **Then** recebe erro específico sem cadastro parcial.
4. **Given** qualquer formulário ou tentativa de gravação direta, **When** envia número completo, CVV, senha ou token bancário, **Then** os dados não são aceitos nem armazenados; a interface não solicita essas informações.
5. **Given** titular posteriormente arquivado, **When** consulta ou edita nome do cartão existente, **Then** preserva exatamente o vínculo histórico; substituir titular exige outro ativo do mesmo usuário.

### User Story 2 - Consultar faturas vazias e seus próprios calendários (Priority: P1)

Como usuário, quero abrir um mês/ano de um cartão e enxergar sua fatura, mesmo sem compras, sabendo quando o ciclo está aberto ou fechado.

**Why this priority**: Permite conferir o calendário antes de cadastrar obrigações e separa encerramento de quitação.

**Independent Test**: Consultar e confirmar faturas vazias de meses escolhidos, comparando datas e estado antes/no dia/depois do fechamento.

**Acceptance Scenarios**:

1. **Given** fechamento 10 e vencimento 17, **When** abre outubro/2026, **Then** vê identidade cartão + 2026-10, início 2026-09-10 inclusivo, fechamento 2026-10-10 exclusivo e vencimento 2026-10-17, sem itens e total R$ 0,00.
2. **Given** fechamento 25 e vencimento 5, **When** abre janeiro/2027, **Then** o ciclo vai de 2026-11-25 inclusivo até 2026-12-25 exclusivo e vence em 2027-01-05.
3. **Given** fechamento/vencimento 31/5, **When** abre março/2027 e março/2028, **Then** os fechamentos são respectivamente 2027-02-28 e 2028-02-29, com vencimento em 5 de março; abril volta a fechamento em 31 de março.
4. **Given** hoje antes do fechamento, **When** consulta, **Then** ciclo é aberto; no dia do fechamento ou depois é fechado. Nenhuma passagem de data gera pagamento ou saída de caixa.
5. **Given** fatura sem itens e sem pagamento, **When** consulta, **Then** vê “sem lançamentos”, total zero e “sem pagamento registrado”; não vê indicação de que houve pagamento nem atraso.
6. **Given** mesmo cartão/período aberto em duas abas ou após confirmação perdida, **When** ambas confirmam a fatura vazia, **Then** existe somente uma fatura e ambas recuperam a mesma identidade e calendário.
7. **Given** fechamento/vencimento 31/31, **When** abre fevereiro/2027, **Then** vencimento é 2027-02-28, fechamento é 2027-01-31 e início é 2026-12-31; dias iguais não produzem fechamento e vencimento na mesma data.
8. **Given** fechamento/vencimento 30/31, **When** abre fevereiro, março e abril/2027, **Then** fechamento/vencimento são 28/02 e 28/02, 30/03 e 31/03, 30/04 e 30/04, respectivamente; os ciclos são consecutivos, sem pular ou duplicar competências. Em fevereiro/2028, ambos são 29/02.

### User Story 3 - Sugerir e corrigir a primeira fatura (Priority: P1)

Como usuário, quero conferir uma sugestão de primeira fatura baseada na data da compra e poder escolher outra, pois o emissor pode processar em momento diferente.

**Why this priority**: A sugestão deve ser explicável e corrigível antes de gerar compromissos.

**Independent Test**: Informar uma data numa prévia de sugestão, sem registrar compra, parcela ou pagamento, e selecionar explicitamente outro período.

**Acceptance Scenarios**:

1. **Given** fechamento 10/vencimento 17 e ciclos de outubro/novembro de 2026, **When** informa compras em 09/10, 10/10 e 11/10, **Then** sugere respectivamente outubro, novembro e novembro, mostrando cartão, mês/ano, limites e vencimento.
2. **Given** fechamento 25/vencimento 5, **When** informa 24/12/2026 e 25/12/2026, **Then** sugere janeiro/2027 e fevereiro/2027, respectivamente.
3. **Given** fechamento 31/vencimento 5, **When** informa 27/02/2027 e 28/02/2027, **Then** sugere março e abril; em 2028, 28/02 ainda pertence a março e 29/02 pertence a abril.
4. **Given** sugestão novembro, **When** escolhe outubro como primeira fatura para refletir o emissor, **Then** a prévia conserva outubro como escolha explícita e não a substitui ao recalcular; não move outros registros nem altera calendário.
5. **Given** uma fatura com calendário histórico diferente do cadastro atual, **When** a data pertence ao ciclo histórico, **Then** a sugestão usa esse ciclo preservado, sem recalculá-lo pelo cartão atual.
6. **Given** cartão arquivado ou data inválida, **When** pede sugestão para compra nova, **Then** bloqueia e explica o motivo. Se calendários inconsistentes não permitem sugestão única, não escolhe silenciosamente: informa conflito e permite seleção explícita válida.
7. **Given** fechamento/vencimento 30/31, **When** informa compra em 27/02/2027 e em 28/02/2027, **Then** sugere fevereiro e março, respectivamente, mesmo com fechamento e vencimento de fevereiro coincidindo em 28/02.

### User Story 4 - Alterar calendário sem reescrever o passado (Priority: P1)

Como usuário, quero alterar os dias padrão do cartão e corrigir o vencimento de uma fatura específica, preservando registros anteriores.

**Why this priority**: Alteração de cadastro não pode mudar obrigações confirmadas.

**Independent Test**: Confirmar outubro/novembro, mudar os dias padrão e abrir um período ainda não confirmado; ajustar somente o vencimento de uma fatura.

**Acceptance Scenarios**:

1. **Given** outubro confirmado com fechamento 10 e vencimento 17, **When** altera cartão para 12/20, **Then** outubro conserva identidade e todas as datas; novos períodos ainda não confirmados usam 12/20, com continuidade pelo último limite já confirmado.
2. **Given** outubro com vencimento em 17/10, **When** ajusta explicitamente para 19/10 com motivo, **Then** conserva cartão + outubro/2026, fechamento e vínculos; registra data anterior/nova e não altera novembro nem o padrão do cartão.
3. **Given** outubro com fechamento em 10/10, **When** informa vencimento em novembro, data inexistente ou igual/anterior ao fechamento, **Then** rejeita e explica a restrição, sem criar outra fatura ou reatribuir compromissos.
4. **Given** vencimento que cai em fim de semana ou feriado, **When** consulta ou avança o calendário, **Then** mantém exatamente a data prevista, salvo ajuste manual confirmado.
5. **Given** outra aba alterou o cartão/fatura, **When** confirma edição sobre versão antiga, **Then** recebe conflito e deve revisar dados atuais; nenhuma data é sobrescrita silenciosamente.

### User Story 5 - Arquivar sem perder obrigações (Priority: P2)

Como usuário, quero retirar um cartão de uso mantendo faturas, parcelas pendentes e histórico acessíveis.

**Why this priority**: Encerrar uso não equivale a quitar ou cancelar dívidas.

**Independent Test**: Arquivar cartão com faturas vazias e obrigações fictícias preexistentes, verificar consulta e rejeição de compra nova.

**Acceptance Scenarios**:

1. **Given** cartão ativo com obrigações, **When** confirma arquivamento após ver o impacto, **Then** deixa de aceitar novas compras e mantém integralmente faturas, parcelas, datas, valores e vínculos existentes, inclusive futuros.
2. **Given** cartão arquivado, **When** filtra arquivados e escolhe período existente, **Then** consulta suas faturas; períodos sem registro exibem ausência, sem materializar novas faturas vazias.
3. **Given** formulário de compra aberto antes do arquivamento, **When** tenta confirmar depois, **Then** a compra nova é rejeitada também na persistência. Parcela de obrigação já confirmada não é compra nova nem pode ser descartada pelo arquivamento.
4. **Given** cartão arquivado, **When** tenta excluir, reativar ou editar seu cadastro, **Then** a operação é negada neste incremento; consultar e ajustar explicitamente vencimento de obrigação preservada continua permitido.
5. **Given** usuário B, visitante, administrador sem propriedade ou primeiro acesso pendente, **When** tenta consultar ou alterar cartão/fatura de A diretamente, **Then** acesso é negado sem revelar dados.

### Edge Cases

- Mesmos banco/nome/titular em cartões diferentes; renomear não mistura faturas.
- Fechamento anterior ao vencimento no mesmo mês, fechamento no mês anterior e dias configurados iguais: igualdade significa vencimento no mês seguinte ao fechamento.
- Dias configurados distintos que coincidem após ajuste ao último dia mantêm a relação original entre os meses: 30/31 permanece no mesmo mês em fevereiro e abril. Essa coincidência não equivale a dias configurados iguais, como 31/31.
- Dias 29/30/31 em fevereiro, ano bissexto, séculos 2000/2100 e retorno ao dia âncora no mês seguinte.
- Compra exatamente no fechamento ajustado; data atual no fechamento; dezembro/janeiro; operações fora do intervalo de anos suportado são rejeitadas.
- Mudança de calendário com faturas futuras já confirmadas, consulta retroativa e intervalos sem cobertura ou sobrepostos: preservar snapshots e não inventar sugestão única.
- Repetir consulta/confirmação, duas abas, perda de confirmação e alteração/arquivamento concorrente.
- Vencimento manual no próprio mês, antes do fechamento, fora do mês ou sem motivo; ajuste não equivale a troca de identidade.
- Fatura vazia encerrada não é comprovante de pagamento; obrigação vencida nunca é quitada por passagem do tempo.
- Titular arquivado depois do cadastro; falha de rede/permissão/cota e saída/troca de sessão sem exposição residual.

## Requirements *(mandatory)*

### Functional Requirements

#### Cadastro e privacidade

- **FR-001**: Oferecer criar, listar, detalhar, editar e arquivar cartões privados do usuário com primeiro acesso concluído. Exigir banco e nome com 1–120 caracteres após remoção de espaços externos, titular e dias inteiros de fechamento/vencimento de 1 a 31. Rejeitar vazio/tipo incorreto/excesso sem truncar; permitir nomes duplicados. Banco é texto livre, sem catálogo ou conexão bancária obrigatórios.
- **FR-002**: Identidade do cartão é estável, independente de nomes/banco/titular. Titular administrado não recebe login ou acesso. Novo cartão ou substituição de titular exige referência existente, ativa e do mesmo usuário; edição pode conservar exatamente titular arquivado já vinculado, conforme feature 004.
- **FR-003**: Não coletar nem armazenar número completo, CVV, senhas, tokens ou credenciais de acesso bancário. Não incluir campos para esses dados, nem campos livres adicionais além dos descritos; rejeitar campos desconhecidos em gravação direta. Não incluir integração bancária, limite de crédito ou conta bancária automática.

#### Identidade e calendário próprio da fatura

- **FR-004**: Cada fatura é única por usuário, identidade do cartão e mês/ano de vencimento. Exibir competência sempre com ano. Repetir confirmação, inclusive concorrente, recupera a mesma fatura; proibir troca de cartão/competência ou exclusão física. Cartões distintos nunca compartilham fatura, ainda que tenham nomes iguais.
- **FR-005**: A fatura confirmada possui datas concretas próprias: início inclusivo do ciclo, fechamento exclusivo e vencimento, além dos dias padrão e revisão do cartão usados em sua definição. Estas informações são snapshots históricos de negócio, não referências a valores mutáveis do cadastro. Exigir início < fechamento ≤ vencimento e vencimento pertencente à competência identificadora. Igualdade entre fechamento e vencimento só é válida quando os dias configurados satisfazem dia de fechamento < dia de vencimento e, após ajuste ao último dia do mesmo mês, produzem a mesma data; nos demais casos exigir fechamento < vencimento.
- **FR-006**: Para uma competência nova, definir primeiro a relação entre os meses pelos dias configurados, antes de ajustá-los: dia de fechamento < dia de vencimento significa fechamento no mês do vencimento; caso contrário, fechamento no mês anterior. Depois ajustar separadamente cada dia inexistente ao último dia de seu mês, sem alterar o dia âncora ou a relação entre os meses nos períodos seguintes. Não comparar datas já ajustadas para decidir essa relação. O início é o fechamento da competência anterior, usando snapshot confirmado quando disponível, ou calendário sugerido desse período. Tratar virada de ano e calendário gregoriano da feature 003; rejeitar resultado fora de 1900–9999.
- **FR-007**: Confirmar uma fatura fixa seus limites. Datas de faturas existentes prevalecem sobre padrões atuais. Ao formar período adjacente, reutilizar o limite compartilhado confirmado como início/fechamento, sem alterar o vizinho. Se limites fixados e novos padrões violam as condições de FR-005 ou produzem cobertura ambígua, bloquear confirmação automática e informar conflito; não mover registros para resolver. A correção explícita da primeira fatura permanece disponível sem alterar snapshots.
- **FR-008**: Alterar banco/nome/titular ou dias padrão do cartão não modifica faturas já confirmadas, mesmo vazias ou futuras, nem compras/parcelas vinculadas. Apresentar antes de confirmar que o novo padrão vale somente para períodos ainda não confirmados e que limites históricos têm precedência. Não recalcular histórico por consulta ou atualização em lote.
- **FR-009**: Permitir ajuste manual do vencimento de uma fatura, inclusive arquivada no contexto do cartão, exigindo data válida no mesmo mês/ano, posterior ao fechamento ou igual somente na exceção de ajuste ao último dia definida em FR-005, motivo de 1–1000 caracteres e revisão atual. A exceção é verificada pelos dias padrão preservados na própria fatura, sem usar o cadastro atual. Mostrar impacto e conservar data anterior/nova, motivo e instante da alteração; preservar identidade, ciclo, padrão do cartão e demais períodos. Não corrigir fechamento histórico neste incremento. Não deslocar datas automaticamente por feriados/fins de semana.
- **FR-010**: A fatura é autoridade do vencimento de seus itens. Ajuste não pode deixar parcela com data divergente, reatribuir primeira fatura ou mover competência. Antes de integrar itens futuros, o plano deve definir atualização consistente de eventuais cópias da data; se não puder garantir consistência integral, bloquear ajuste sem efeito parcial. Histórico de pagamentos futuros permanece preservado; ajuste não cria ou desfaz liquidação.

#### Sugestão e escolha explícita

- **FR-011**: Oferecer prévia de primeira fatura a partir de cartão ativo e data da compra válida, comparando a data com os ciclos concretos: início ≤ compra < fechamento. Priorizar snapshots existentes e usar padrões apenas para períodos não confirmados. Compra no fechamento pertence ao próximo ciclo; exibir essa convenção como previsão sujeita ao processamento do emissor.
- **FR-012**: Exibir sugestão com cartão, competência, início, fechamento e vencimento; permitir selecionar outra primeira fatura do mesmo cartão/usuário antes da confirmação. Escolha explícita prevalece mesmo fora do ciclo sugerido e é identificada como correção do usuário; não reescrever escolha confirmada por alteração posterior do cartão. Sem ciclo único, informar ausência/conflito e solicitar seleção explícita, sem sugestão arbitrária.
- **FR-013**: A prévia não cria compra, parcelas, pagamentos ou saída de caixa, nem confirma automaticamente faturas de todos os períodos percorridos. A seleção de período novo exige calendário válido conforme FR-005–007 antes de eventual confirmação. Integração futura de compra confirma sua primeira fatura explicitamente, sem presumir que a sugestão é decisão definitiva.

#### Consulta, estados e arquivamento

- **FR-014**: Oferecer lista de cartões ativos por padrão, filtros ativos/arquivados/todos e consulta de faturas por cartão e intervalo mensal, navegável entre anos. Ao abrir mês de cartão ativo sem fatura, apresentar calendário proposto vazio e permitir confirmar a fatura vazia; distinguir prévia de registro confirmado. Não gerar histórico inteiro no cadastro. Arquivado permite consultar existentes, sem confirmar novos períodos vazios.
- **FR-015**: Exibir banco, cartão, titular atual, competência baseada no vencimento, limites do ciclo, vencimento próprio, indicação de ajuste manual e estado aberto/fechado. Lista/detalhe vazios mostram ausência de itens e total derivado zero; não oferecem edição manual do total. Até compras serem entregues, todas as novas faturas nascem sem itens e sem pagamentos.
- **FR-016**: Estado do ciclo é derivado das datas confirmadas e do dia atual no fuso do perfil: aberto se hoje < fechamento; fechado se hoje ≥ fechamento. Encerramento não depende de pagamento, saldo ou vencimento e não exige processamento com aplicativo fechado. Não oferecer reabertura/fechamento manual neste incremento. Trocar fuso não reinterpreta datas financeiras.
- **FR-017**: Preservar separação entre ciclo e liquidação. Sem itens, mostrar sem lançamentos/sem pagamento registrado, sem alegar pagamento efetuado. Não criar pagamentos, atraso ou consumo fictício. Em integrações futuras, atraso exige saldo pendente positivo e vencimento anterior a hoje; total deriva dos itens/ajustes, sem somar novamente fatura e itens ou tratar pagamento como nova despesa.
- **FR-018**: Arquivamento exige confirmação do impacto, preserva identidade e todas as obrigações/histórico, incluindo parcelas futuras já confirmadas, sem cancelamento/quitação/cascata. Bloquear novas compras no momento da confirmação, inclusive formulário obsoleto e envio direto; permitir consulta e futura liquidação das obrigações existentes. Proibir exclusão física de cartão, reativação e edição de conteúdo arquivado neste incremento. Arquivar novamente não produz novo efeito.

#### Confiabilidade e proteção

- **FR-019**: Criar cartão, confirmar fatura, editar, ajustar vencimento e arquivar devem resistir a duplo clique/reenvio, preservando identidade da intenção e recuperando resultado já confirmado. Alterações exigem revisão atual; conflito requer releitura e nova confirmação informada. Não usar nomes para deduplicar cartões intencionalmente distintos. Confirmação perdida não autoriza criar outra intenção automaticamente.
- **FR-020**: Sucesso exige confirmação da persistência; distinguir prévia, envio e confirmação indeterminada. Preservar entrada na mesma sessão e oferecer recuperação para validação, conflito, permissão, cota e indisponibilidade. Limpar dados/intenções e descartar respostas tardias no logout/troca de usuário. Listas paginadas de até 50 registros e intervalo explícito não apresentam recorte incompleto como total definitivo.
- **FR-021**: Proteger propriedade, primeiro acesso concluído, campos permitidos, tipos/faixas, referências, identidades imutáveis, transições e unicidade também fora da interface. Usuário B, visitante e administrador sem propriedade não acessam dados de A. O plano define autorização de cartões, faturas e histórico de ajustes, impacto em consultas/índices e consistência de confirmação/arquivamento concorrente, sem abrir compras ou pagamentos ainda não entregues.
- **FR-022**: A implementação deve entregar arquivo completo de regras de acesso e nota de alterações, além de índices completos quando necessários, conforme constituição; geração local não significa publicação. Aceitação deve cobrir regras de calendário localmente e persistência/isolamento com usuários fictícios no projeto real autorizado, sem emuladores, registrando verificações efetivas e limitações.
- **FR-023**: Listas, prévia e formulários devem funcionar em celular/desktop, com rótulos, navegação por teclado, foco no erro e estados perceptíveis de carregamento, vazio, envio, confirmação e falha, sem depender apenas de cor.

### Key Entities *(include if feature involves data)*

| Entidade | Informações e relações de negócio | Invariantes |
| --- | --- | --- |
| Cartão | Identidade, proprietário, banco, nome, titular, dias padrão, ativo/arquivado, revisão e instantes de criação/alteração | Sem dados sensíveis bancários; titular não é login; identidade preservada ao editar. |
| Fatura | Cartão, competência de vencimento com ano, calendário próprio e origem/revisão dos padrões | Única por cartão/período; identidade imutável; total derivado, ciclo independente de liquidação. |
| Snapshot de calendário | Início inclusivo, fechamento exclusivo, vencimento concreto e dias âncora usados | Preservado após confirmação; cadastro atual não reescreve datas; ajuste manual altera só vencimento com histórico. |
| Ajuste de vencimento | Fatura, data anterior/nova, motivo, revisão e instante | Rastreável, sem mudar competência, ciclo ou registros de pagamento. |
| Prévia de primeira fatura | Cartão, data de compra, sugestão, escolha explícita e origem da escolha | Não é compra nem obrigação; escolha explícita prevalece; usa ciclos preservados. |
| Titular e perfil | Referências privadas das features 002–004, incluindo fuso do perfil | Referências do mesmo usuário; sem acesso concedido ao titular. |
| Obrigações e pagamentos existentes/futuros | Vínculos de integração pelos contratos da feature 003 | Preservar ao arquivar; não implementar criação de compras/parcelas/pagamentos neste incremento. |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Pelo menos quatro de cinco participantes cadastram cartão e localizam sua fatura vazia em até dois minutos, sem ajuda, desconsiderando indisponibilidade de conexão.
- **SC-002**: Em 100% dos casos de aceitação de calendário, os períodos/datas correspondem aos exemplos, incluindo fechamento no mês anterior, dias configurados iguais, coincidência de datas causada pelo ajuste ao último dia, fevereiro e dezembro/janeiro; nenhum dia âncora é perdido ou competência é pulada/duplicada por esse ajuste.
- **SC-003**: Em todos os cenários de edição do cartão, 100% das faturas confirmadas e vínculos mantêm identidade e calendário; ajuste manual afeta somente o vencimento escolhido e conserva rastreabilidade completa.
- **SC-004**: Em 100% dos testes de prévia, dia do fechamento sugere ciclo seguinte e escolha explícita permanece; zero compras, parcelas ou pagamentos são criados pela simulação.
- **SC-005**: Em todos os reenvios e disputas exercitados, existe no máximo uma fatura por cartão/período e nenhum conflito sobrescreve silenciosamente datas confirmadas.
- **SC-006**: Após arquivamento, zero compras novas são aceitas e 100% das obrigações/faturas preexistentes permanecem consultáveis, com valores, datas e vínculos preservados.
- **SC-007**: Zero acessos indevidos ou gravações de campos bancários proibidos nos cenários de envio direto; nenhuma confirmação pendente é apresentada como concluída.
- **SC-008**: Pelo menos quatro de cinco participantes identificam corretamente ciclo fechado sem pagamento, estado vazio e caráter corrigível da sugestão, sem confundir fechamento com quitação.

## Assumptions

- Dependências: constituição 1.2.0, autenticação/primeiro acesso da 002, dinheiro/calendário/contratos da 003 e titular privado da 004. A 005 permanece restrita a receitas e despesas externas. Entrega atual é documental; compras, séries, pagamentos e relatórios completos terão incrementos próprios.
- A decisão de 2026-10-18 especializa o calendário da 003: relação entre meses definida pelos dias configurados e coincidência permitida somente pelo ajuste ao último dia. O planejamento deve harmonizar contratos, validações e testes do núcleo que hoje exijam fechamento estritamente anterior ao vencimento ou decidam o mês pelas datas ajustadas. Não migrar nem recalcular snapshots existentes automaticamente.
- Ajuste de vencimento dentro do mês é o padrão inicial escolhido para preservar identidade e compatibilidade com a 003. Transferir vencimento para outro mês exige futura operação de reprogramação explícita, fora deste incremento; não contornar por criação de duplicata.
- Snapshots exigidos são de calendário. Nome/banco/titular exibidos são os atuais, preservando identidades e vínculos, sem promessa de fotografia dos nomes antigos, em continuidade à 004.
- Confirmar período vazio é ação explícita: consulta pode mostrar prévia sem escrita. Faturas existentes, inclusive futuras vazias, são históricas após confirmação. Regras de continuidade têm precedência sobre novos padrões; correção de limites já confirmados demanda funcionalidade futura, sem reescrita automática.
- Prévia aceita data financeira válida, inclusive futura para planejamento, sem representá-la como compra efetivada. Não introduzir limite de períodos herdado da quantidade máxima de parcelas.
- Ciclo aberto/fechado é classificação de calendário, não fechamento contábil imutável. A correção explícita da primeira fatura pode selecionar período fechado; permissões de criação/alteração de compras nesse período serão definidas no incremento de compras, sem assumir bloqueio ou autorização implícitos aqui.
- Arquivar não apaga obrigações; criar novas parcelas para obrigação anteriormente confirmada segue seu cronograma, sem ser tratado como compra nova. Esta etapa não gera tais parcelas nem habilita liquidação de faturas.
- Numeração sequencial 006. Não há extensions.yml nem hooks antes/depois. O resolvedor `specify preset resolve spec-template` não executou por launcher Python indisponível; sem presets ou sobrescritas locais, foi utilizado `.specify/templates/spec-template.md`, preservando ordem e seções. Nenhuma branch foi criada.
