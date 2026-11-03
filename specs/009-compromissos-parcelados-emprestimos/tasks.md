# Tasks: Compromissos parcelados externos e empréstimos manuais

**Atualização autorizada 26/10/2026:** o comprovante imutável S/R/V foi implementado como candidato local; ver [estado e evidências](witness-status-2026-10-26.md). A criação máxima passa a 18 acessos; substituição máxima de 21 deve ser rejeitada inteira. As contagens anteriores 15/18 são históricas e ficam substituídas por esse protocolo para novas séries. T007 permanece aberto: candidatas anteriores excederam 1000 expressões; a mais recente retornou HTTP 503. Nenhum gate remoto foi concluído.

**Exceção autorizada21/10/2026**: [decisão do responsável](../011-painel-mensal-projecao/local-checkpoint-exception.md) permite implementar/testar contratos, domínio, repositórios e telas localmente antes do PASS de T007. Os checkpoints impeditivos abaixo continuam válidos para habilitação de produção; não impedem mais desenvolvimento local. T007 permanece pendente após HTTP503. Gravações financeiras/produção permanecem bloqueadas.

**Input**: Documentos em `specs/009-compromissos-parcelados-emprestimos/`: spec.md, plan.md, research.md, data-model.md, contracts/ e quickstart.md.

**Prerequisites**: Constituição 1.2.0, contratos 002–005, compatibilidade com cartões 006–008 e decisão A de FR-014a. TypeScript/React/Firebase já configurados; não reinicializar o projeto ou atualizar dependências sem necessidade.

**Tests**: Incluídos por exigência explícita de FR-024 e dos cenários de aceitação. Testes puros locais e integração com SDK autenticado no projeto real autorizado; sem emuladores. Testes específicos devem evidenciar a falha antes da implementação correspondente, sem deixar testes de regressão existentes falhando ao encerrar um incremento.

**Organization**: Tarefas por história, preservando seus identificadores: US1(P1), US2(P1), US4(P1), US3(P2). Caminhos relativos à raiz do repositório; cada tarefa tem destino exato. `[P]` identifica somente tarefas em arquivos distintos que podem ocorrer juntas após os pré-requisitos da fase.

**Estado após correção: G1/G2 PENDENTES DE PROVA.** O desenho finito em data-model.md e contracts/security.md substitui o grafo inviável. T001–T004 conferem decisões e orçamento corrigidos; T005–T007 produzem a evidência executável restante; a conclusão documental do replanejamento não conclui esses gates de implementação. T008–T050 continuam condicionais a T007 com prova positiva. Não fracionar commits, alterar limites ou retirar validações; indisponibilidade de avaliação mantém pendência, reprovação concreta mantém ERROR. Esta correção documental não conclui tarefas de implementação.

## Phase 1: Setup — inventário e escopo da prova

**Purpose**: Preparar rastreabilidade e evidência reproduzível sem modificar dados reais.

- [x] T001 Inventariar contratos, código realmente habilitado e versões em `specs/009-compromissos-parcelados-emprestimos/research.md`, verificando `src/domain/finance/operationBudget.ts`, `src/infrastructure/firebase/externosRepository.ts` e `firestore.rules`; distinguir cálculo reutilizável de pagamento remoto ainda não habilitado.
- [x] T002 [P] Criar matriz FR-001–FR-024, incluindo FR-014a e SC-001–SC-007, em `specs/009-compromissos-parcelados-emprestimos/coverage.md`, associando requisitos a histórias, tarefas e roteiros, sem afirmar execução de teste.
- [x] T003 [P] Inventariar ambiente e protocolo de evidências em `specs/009-compromissos-parcelados-emprestimos/validation.md`: Node/npm, comandos locais, projeto esperado, fixtures A/B/admin/pendente/visitante, manifesto, ausência de credenciais e separação entre avaliar, publicar e testar Rules.

**Checkpoint**: Após T001, T002/T003 podem ocorrer em paralelo. Nenhuma mudança remota ou atualização de dependências está implícita.

## Phase 2: Foundational — resolver os gates antes das histórias

**Purpose**: Traduzir o agregado finito corrigido em contrato executável comprovado dentro dos limites vigentes.

- [x] T004 Conferir o agregado finito corrigido em `specs/009-compromissos-parcelados-emprestimos/contracts/security.md` e `specs/009-compromissos-parcelados-emprestimos/data-model.md`, executando `specs/009-compromissos-parcelados-emprestimos/validate-design-budget.ps1`; confirmar pré/pós-estado e orçamento de criação15/edição16/substituição18 no máximo, sem cache, incluindo primeiro uso, perfil no recibo recíproco, até12 posições, pagamentos e vínculos. Corrigir divergência antes de T005; não reimplementar o grafo por documento-filho descartado.
- [x] T005 Traduzir o desenho T004 em candidato completo `specs/009-compromissos-parcelados-emprestimos/firestore-parcelados.candidate.rules`, incluindo a fonte anterior e realizando verificações locais reproduzíveis de integridade e estrutura; comprovação de preservação semântica, 18/8 acessos, 32 mutações, tamanhos e até1000 expressões pertence a T007; não habilitar gravações de produção nem usar hash ou booleano do cliente como prova.
- [x] T006 Construir casos de avaliação oficial reproduzíveis em `specs/009-compromissos-parcelados-emprestimos/rules-evaluation-cases.json` para comandos válidos, dependência omitida/extra, saldo/versão/recibo forjados, cardinalidade de receita, fronteiras monetárias/calendário, proteção do histórico e cinco perfis de acesso; incluir o caso 5/10 e substituição mínima, sem aceitar rejeição desses dois como sucesso da feature.
- [ ] T007 Comprovar preservação das regras anteriores, 18/8 acessos, até32 mutações, 32KiB/documento, 1MiB/comando e até1000 expressões, incluindo metadados máximos e rejeição integral dos excessos; avaliar o candidato e documentar evidências/gates em `specs/009-compromissos-parcelados-emprestimos/validation.md` e `specs/009-compromissos-parcelados-emprestimos/plan.md`; harmonizar `data-model.md`, `contracts/commands.md`, `contracts/ui.md`, `quickstart.md` e este `tasks.md` com o desenho aprovado antes de seguir. Somente marcar PASS de desenho após orçamento e enforcement comprovados; sem avaliação disponível manter PENDENTE; com reprovação concreta ou desenho inviável manter ERROR e parar tarefas dependentes, sem publicar automaticamente.
- [ ] T008 Definir tipos do agregado finito, identidade lógica (serieId,ordinal), envelope, prévias e porta em `src/domain/finance/contracts/parcelados.ts`, reutilizando alvos e resultados de `src/domain/finance/contracts/commands.ts`; eventos próprios em operacoesParceladas, sem mudar schema avulso005. Revisão por série invalida prévias inclusive após pagamento de outra posição; preservar origem desconhecida sem data fictícia.
- [ ] T009 Implementar decoder/encoder fechado do agregado e eventos em `src/infrastructure/firebase/parceladosMapper.ts` com testes em `src/infrastructure/firebase/parceladosMapper.test.ts`: mapa exato P..N até12, identidades imutáveis, campos opcionais ausentes, competencias derivadas exatas e schema desconhecido negado. Mapear read models comuns sem alterar `src/infrastructure/firebase/externosMapper.ts` ou migrar documentos005; estender padrões de marcadores009 em `src/domain/finance/cadastros.ts` e testes de `src/infrastructure/firebase/cadastrosMapper.test.ts` antes de habilitar primeiro uso novo; comprovar rollback sem apagar fatos.
- [ ] T010 Preparar grupo parcelados e matriz de cinco clientes em `tests/integration/support/environment.ts`, seleção em `vitest.integration.config.ts`, fixtures/manifesto em `tests/integration/support/parceladosFixtures.ts` e validação local em `tests/integration/support/parceladosEnvironment.test.ts`; abortar projectId divergente, UID repetido ou escopo inválido, sem criar seed ou publicar Rules.

**Checkpoint impeditivo**: T004→T005→T006→T007. T008–T010 e todas as histórias só começam após PASS documentado em T007. T007 não significa publicação ou integração real concluída. Se os caminhos/esquema mudarem no redesenho, atualizar primeiro as tarefas futuras e suas contagens/mapeamento; não implementar o grafo descartado.

## Phase 3: User Story 1 — Cadastrar compromissos conhecidos (Priority: P1) — MVP

**Goal**: Cadastrar séries completas ou em andamento, uniformes/explicitamente irregulares, com prévia e nenhum passado ou caixa inferido.

**Independent Test**: Registrar 100/3, 5/10 de 200,00 e o cronograma desigual de soma285,50; recarregar e conferir posições, valores, vencimentos e original ausente. Não exige pagamento, edição ou receita vinculada.

### Tests

- [X] T011 [P] [US1] Criar testes de dinheiro/calendário e entrada em `src/domain/finance/parcelados.test.ts`: divisão residual, 1/1, P=N, 5/10, N12/N13, parcela zero, máximo/overflow, fevereiro/virada de ano, datas irregulares, posições únicas/completas e original ausente.
- [ ] T012 [P] [US1] Criar testes da porta criarSerie/prepararCriacao em `src/domain/finance/contracts/parcelados.contract.test.ts`, cobrindo prévia sem escrita, confirmação completa, repetição estável, referências próprias e rejeição integral de entrada/orçamento inválidos.

### Implementation

- [X] T013 [US1] Implementar normalização e planejamento puro em `src/domain/finance/parceladosValidation.ts` e `src/domain/finance/parcelados.ts`, reutilizando `money.ts`, `calendar.ts` e divisão de `installments.ts`; separar total a gerar/valor por parcela/original opcional, exigir referências comuns na criação e validar modo explícito com valores/datas/competências individuais sem juros ou datas mensais inferidas.
- [ ] T014 [US1] Implementar criarSerie e consultarOperacao em `src/infrastructure/firebase/parceladosRepository.ts` conforme o grafo T007: IDs estáveis, recibo canônico, leituras antes de escritas, comparação de versões, confirmação do conjunto e resolução de resposta perdida sem chave nova automática.
- [ ] T015 [US1] Integrar somente criação/consulta permitidas em `firestore.rules`, acrescentar consultas necessárias a `firestore.indexes.json` e registrar mudanças/rollback em `docs/firestore-rules-changes.md`; preservar regras válidas e manter comandos posteriores negados até sua entrega.
- [ ] T016 [US1] Implementar formulário, intenção de cadastro e invalidação de prévia em `src/features/parcelados/ParceladoForm.tsx`, `src/features/parcelados/CronogramaPreview.tsx` e `src/features/parcelados/parceladosState.ts`, incluindo referências opcionais e rótulos distintos para original desconhecido/soma cadastrada; abandono não grava e sucesso depende de confirmação remota.
- [ ] T017 [US1] Implementar leitura do cronograma, leitor fechado com ID token/readTime fixo em `src/infrastructure/firebase/parceladosSnapshotReader.ts` e base de detalhe em `src/infrastructure/firebase/parceladosQueries.ts`, `src/features/parcelados/ParceladoDetailPage.tsx` e `src/features/parcelados/useParceladosRepository.ts`, mostrando somente P..N e posições anteriores não cadastradas, sem anunciar quitação presumida.
- [ ] T018 [US1] Registrar rotas e navegação protegida em `src/app/router.tsx` e `src/app/AppShell.tsx`; conectar contexto do repositório e limpeza ao fluxo existente em `src/app/session/financeSession.ts`, respeitando UID/geração de sessão.
- [ ] T019 [US1] Implementar e executar testes de formulário e abandono em `src/features/parcelados/ParceladoForm.test.tsx` e `src/features/parcelados/parceladosState.test.ts`, cobrindo mudança após conferência, ausência de entrada/pagamentos inferidos, mensagens de limite e navegação por teclado.
- [ ] T020 [US1] Implementar matriz de criação/consulta e escrita direta em `tests/integration/parcelados.integration.test.ts`; após Rules avaliadas e publicação separadamente autorizada, executar no projeto-alvo e registrar resultados/limitações em `specs/009-compromissos-parcelados-emprestimos/validation.md`, sem declarar integração aprovada se faltar autorização/acesso.

**Checkpoint**: Cadastro completo e recarregado coincide com prévia; seis obrigações 5..10 sem pagamentos/receita/valor original inventados. Habilitação remota exige evidência real em T020, não apenas testes locais ou PASS de desenho.

## Phase 4: User Story 2 — Consultar e pagar parcelas (Priority: P1)

**Goal**: Consultar planejamento e caixa, pagar/reverter por parcela e vincular receita explicitamente sem duplicação.

**Independent Test**: Com série fixture válida, pagar60 e140 de parcela200, reverter um erro e conferir pendência, caixa e planejamento; cadastrar série sozinha não produz entrada. Vincular receita existente não a duplica.

### Tests

- [ ] T021 [P] [US2] Criar testes de liquidação e projeção de parcelaExterna em `src/domain/finance/parceladosSettlement.test.ts`, incluindo parcial/integral/excesso, conta/data, reversão integral única e preservação de jaLiquidada após reversão, sem tratar pagamento como nova parcela.
- [ ] T022 [P] [US2] Criar testes de contrato de receita vinculada e pagamentos em `src/domain/finance/contracts/parceladosSettlement.contract.test.ts`: ação explícita, cardinalidade do desenho aprovado, vincular receita própria sem novo recebimento e falha de vínculo após criação de receita.

### Implementation

- [ ] T023 [US2] Integrar alvo parcelaExterna ao cálculo compartilhado em `src/domain/finance/settlement.ts` e `src/domain/finance/parcelados.ts`, preservando validadores avulsos005 e mapeando alvo lógico conforme T008; preservar limite da pendência e semântica005 de reversão na conta/data originais.
- [ ] T024 [US2] Implementar pagarParcela, reverterPagamento e vincularReceita em `src/infrastructure/firebase/parceladosRepository.ts`, com controle/fato/recibo e marcador de reversão únicos no mesmo commit, primeiro uso de conta e versões atuais; receita é criada explicitamente pela porta005 antes do vínculo, nunca dentro da criação da série.
- [ ] T025 [US2] Adicionar os ramos específicos de pagamento/reversão/vínculo em `firestore.rules` e perfis comprovados em `src/domain/finance/operationBudget.ts`, atualizando `docs/firestore-rules-changes.md`; provar reciprocidade/exatidão e negar recebimento inferido, excesso e associação de terceiros sem ampliar permissões avulsas.
- [ ] T026 [US2] Estender o leitor `src/infrastructure/firebase/parceladosSnapshotReader.ts` para ARRAY_CONTAINS/caixa e implementar listas mensais, filtros/paginação, detalhe de fatos e projeções em `src/infrastructure/firebase/parceladosQueries.ts` e `src/domain/finance/projections.ts`; consultar competencias array-contains, expandir mapa finito e continuar cursor por série/ordinal até50 linhas, limitar busca mensal a duas páginas físicas por ação e devolver parcial/vazia com cursor ao atingir teto, sem perder posições; usar snapshot fixo com TTL50min e nunca somar série sobre parcelas ou pagamento como novo compromisso.
- [ ] T027 [US2] Implementar lista e ações de pagamento, reversão e receita em `src/features/parcelados/ParceladosPage.tsx`, `src/features/parcelados/ParceladoDetailPage.tsx` e `src/features/parcelados/ParcelaPagamentoForm.tsx`; mostrar base temporal, valores/contas/datas por fato, original ausente e estado “Receita registrada; vínculo pendente” com retomada sem recriar receita.
- [ ] T028 [US2] Testar leitor fechado/readTime/expiração em `src/infrastructure/firebase/parceladosSnapshotReader.test.ts`, leitura/paginação física e lógica/caixa em `src/infrastructure/firebase/parceladosQueries.test.ts` e fluxos de pagamento/vínculo em `src/features/parcelados/ParcelaPagamentoForm.test.tsx`, incluindo receita prevista versus recebida e consulta após cancelamento/substituição sem compensação automática.
- [ ] T029 [US2] Acrescentar e executar aceitação de pagamentos, reversões, vínculo/isolamento, consulta e escrita direta em `tests/integration/parcelados.integration.test.ts`, atualizando índices completos em `firestore.indexes.json` e evidências em `specs/009-compromissos-parcelados-emprestimos/validation.md`; não anunciar ramos remotos prontos sem teste autorizado real.

**Checkpoint**: Planejamento preserva valor ativo integral, caixa só conta fatos e pendência reconcilia exatamente. Série e capital não viram gasto adicional nem receita presumida.

## Phase 5: User Story 4 — Recuperar tentativas e respeitar limites (Priority: P1)

**Goal**: Consolidar proteção contra repetição, falhas, disputa, excedentes e troca de usuário sobre os fluxos entregues.

**Independent Test**: Com comando/série fixture, simular duplo clique, duas abas e resposta perdida; recuperar mesmos IDs e negar conteúdo diferente, quantidade13, orçamento excessivo e acesso de outro usuário. Reexecutar para comandos entregues por US3 posteriormente.

### Tests

- [ ] T030 [P] [US4] Criar testes de repetição, falhas antes/depois da confirmação e callbacks repetidos em `src/infrastructure/firebase/parceladosRepository.test.ts`; controlar resposta perdida e verificar IDs estáveis, ausência de efeito parcial e comparação canônica completa.
- [ ] T031 [P] [US4] Criar testes de estado de intenção, conflito, semAlteracao e troca de sessão em `src/features/parcelados/parceladosRecovery.test.ts`, incluindo ausência pontual enquanto tentativa está em voo e descarte de resposta tardia.

### Implementation

- [ ] T032 [US4] Completar consulta por comando/descritor e classificação de recuperação em `src/infrastructure/firebase/parceladosRepository.ts`, retornando confirmado/ausenteConfirmado/indeterminado, sem incrementar versões em repetição confirmada ou substituir a intenção automaticamente; semAlteracao encerra intenção local sem recibo.
- [ ] T033 [US4] Implementar cálculo/recusa do orçamento por comando aprovado em `src/domain/finance/operationBudget.ts` com fronteiras em `src/domain/finance/operationBudget.test.ts`, contando ambos os lados de substituição, referências, primeiro uso e metadados; rejeitar antes da escrita sem truncamento ou lotes independentes.
- [ ] T034 [US4] Integrar recuperação acionável à sessão em `src/features/parcelados/useParcelaIntent.ts`, `src/features/parcelados/parceladosState.ts` e `src/app/session/financeSession.ts`, preservando dados/intenção na sessão e distinguindo conflito, limite, cota, permissão, indisponibilidade e resultado incerto.
- [ ] T035 [US4] Implementar reconstrução/conferência de líquido, jaLiquidada e histórico em `src/domain/finance/parceladosAudit.ts` com testes em `src/domain/finance/parceladosAudit.test.ts`; validar sequência contígua e única de revisões por série no mesmo snapshot, mesmo com timestamps empatados e evento com duas séries; páginas pendentes deixam auditoria incompleta e divergência bloqueia mutações sem autoeditar dados; conservar fatos e cadeia de substituição.
- [ ] T036 [US4] Exercitar duplo clique, concorrência real e resposta perdida em `tests/integration/parcelados-recovery.integration.test.ts`, incluindo matriz de cinco perfis e envios diretos com recibos/eventos inválidos; verificar seleção do arquivo no grupo parcelados em `vitest.integration.config.ts` e registrar falhas/retomadas em `specs/009-compromissos-parcelados-emprestimos/validation.md`.
- [ ] T037 [US4] Revisar e executar regressões de recuperação/orçamento nos caminhos US1/US2 em `src/infrastructure/firebase/parceladosRepository.test.ts` e `tests/integration/parcelados-recovery.integration.test.ts`, mantendo comandosUS3 ainda não entregues negados e identificando cobertura condicionada à fase seguinte em `specs/009-compromissos-parcelados-emprestimos/coverage.md`.

**Checkpoint**: Nenhuma repetição duplica efeito ou transforma resposta indeterminada em sucesso; zero acesso indevido e nenhum conjunto parcial anunciado como completo. Proteção básica já existe desde US1; esta fase completa os cenários adversos e a matriz.

## Phase 6: User Story 3 — Corrigir e substituir com prévia (Priority: P2)

**Goal**: Editar apenas elegíveis e renegociar por cancelamento/substituição atomicamente, preservando história financeira.

**Independent Test**: Usar série fixture com quitada, parcial, revertida e intocada; comparar prévia/confirmado para edição isolada/futuras e substituição, incluindo fronteira mensal31/fevereiro e cronograma irregular.

### Tests

- [ ] T038 [P] [US3] Criar testes de elegibilidade/calendário em `src/domain/finance/parceladosEdit.test.ts`: ordinais intercalados protegidos, sem compactação, datas explícitas individuais, competência preservada, valor não alterado conserva resíduo e ordem de datas conflitante é rejeitada.
- [ ] T039 [P] [US3] Criar testes de contratos de edição/cancelamento/substituição em `src/domain/finance/contracts/parceladosCorrections.contract.test.ts`, cobrindo versões obsoletas, prévia inválida, histórico revertido, motivo, semAlteracao e tudo-ou-nada dos dois lados sem transportar fatos/receita.

### Implementation

- [ ] T040 [US3] Implementar planejadores de edição/cancelamento/substituição em `src/domain/finance/parceladosEdit.ts` e normalizadores em `src/domain/finance/parceladosValidation.ts`; aplicar FR-014a por diferença de ordinal, conservar protegidas/identidades, separar elegível à edição de cancelável após reversão e bloquear renegociação de parcial real.
- [ ] T041 [US3] Implementar comandos corretivos em `src/infrastructure/firebase/parceladosRepository.ts`, lendo a revisão global e mapa de cada série que fundamenta prévia, incluindo posições excluídas; serializar pagamento concorrente, preservar cadeia sem ciclos e confirmar cancelamento+nova série juntos, sem reciclar identidade ou reativar cancelada.
- [ ] T042 [US3] Integrar enforcement das correções em `firestore.rules`, perfis específicos em `src/domain/finance/operationBudget.ts` e nota em `docs/firestore-rules-changes.md`; rejeitar cancelamento com líquido válido, mutação de histórico e substituição parcial, reavaliando casos oficiais do candidato sem reduzir proteção.
- [ ] T043 [US3] Implementar seleção de alcance, prévia antes/depois e formulários de motivo/substituição em `src/features/parcelados/ParcelaEditForm.tsx`, `src/features/parcelados/CronogramaPreview.tsx` e `src/features/parcelados/ParceladoDetailPage.tsx`, exibindo excluídas/razões, impacto total e cadeia histórica sem pagamento ou juros inferidos.
- [ ] T044 [US3] Implementar testes da interface em `src/features/parcelados/ParcelaEditForm.test.tsx`, incluindo alteração depois da conferência, nenhuma elegível, protegida intercalada, cancelamento parcial da série, origem substituída consultável e conflito que exige nova prévia.
- [ ] T045 [US3] Acrescentar e executar cenários de correção/substituição e corrida com pagamento em `tests/integration/parcelados-corrections.integration.test.ts`, com ambos os lados nos limites, data/ordem/calendário e envios diretos órfãos, preservando histórico e negando troca de proprietário.
- [ ] T046 [US3] Estender regressões de idempotência, orçamento e reconstrução para correções em `tests/integration/parcelados-recovery.integration.test.ts` e `src/domain/finance/parceladosAudit.test.ts`; atualizar `specs/009-compromissos-parcelados-emprestimos/validation.md` com evidência de substituição mínima efetivamente concluída e rejeição integral dos excessos.

**Checkpoint**: Só elegíveis mudam conforme prévia; quitadas/parciais nunca são reescritas. Substituição mínima funciona no desenho aprovado; resultados de rejeição de excedentes não mascaram ausência do fluxo.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Concluir documentação, acessibilidade, regressão e prontidão de entrega sem confundir arquivos locais com publicação.

- [ ] T047 [P] Finalizar validação responsiva/teclado/foco/estados e teste assistidoSC-007 em `src/features/parcelados/ParceladosPage.test.tsx` e `specs/009-compromissos-parcelados-emprestimos/validation.md`, registrando quatro de cinco usuários em até três minutos ou resultado real/limitação, sem inventar participantes.
- [ ] T048 [P] Atualizar instruções finais, migração compatível/rollback e consultas/índices em `specs/009-compromissos-parcelados-emprestimos/quickstart.md` e `docs/firestore-rules-changes.md`, com comandos executáveis, hashes de arquivos completos e distinção entre avaliação, publicação e integração.
- [ ] T049 Executar `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` e matriz real autorizada da feature; conferir `firestore.rules` e `firestore.indexes.json` completos e registrar comandos/resultados/autorizações de eventual publicação em `specs/009-compromissos-parcelados-emprestimos/validation.md`; se faltar autorização/configuração, declarar testes remotos não realizados e não marcar validação completa.
- [ ] T050 Fechar rastreabilidade FR/SC em `specs/009-compromissos-parcelados-emprestimos/coverage.md`, atualizar estado final dos gates em `specs/009-compromissos-parcelados-emprestimos/plan.md` e evidências em `specs/009-compromissos-parcelados-emprestimos/validation.md`; inventariar fixtures pelo manifesto antes de qualquer limpeza autorizada, sem exclusão global ou presumir remoção de dependências por apagar pai.

## Dependencies & Execution Order

### Phase Dependencies

1. Setup: T001 → T002 e T003; concluir os três antes de T004.
2. Gate de desenho: T004 → T005 → T006 → T007. T007 com ERROR interrompe tudo a partir de T008; resultado técnico negativo não deve virar checkbox de sucesso.
3. Fundação técnica: T008 → T009 → T010, somente após T007 PASS. Histórias dependem de T010.
4. US1: T011/T012 → T013 → T014 → T015 → T016 → T017 → T018 → T019 → T020.
5. US2: T021/T022 → T023 → T024 → T025 → T026 → T027 → T028 → T029; usa tipos/repositório de US1. Teste independente usa fixture de série confirmada.
6. US4: T030/T031 → T032 → T033 → T034 → T035 → T036 → T037; pode testar fixture sem depender de formulárioUS2, mas execução sequencial sugerida evita conflito em repositório/Rules/estado compartilhados.
7. US3: T038/T039 → T040 → T041 → T042 → T043 → T044 → T045 → T046; usa baseUS1 e comportamento de liquidaçõesUS2 e recuperaçãoUS4, que podem ser representados por fixtures nos testes isolados.
8. Final: concluir todas as histórias; T047/T048 → T049 → T050.

US1 → {US2,US4} → US3 → validação final. A ordem no arquivo mantém P1 antes de P2. Não há dependência circular e nenhuma história exige interface de história posterior para ser demonstrada.

### Shared files and enabling

`firestore.rules`, `operationBudget.ts`, `parceladosRepository.ts`, mappers/contratos e configuração de integração são pontos de serialização: não executá-los em paralelo entre histórias. Autorizar somente ramos efetivamente implementados/avaliados. Integração real por fase depende de Rules ativas e autorização vigente; geração de tarefas não autoriza publicação. Se a provaT007 exigir mudar arquivo/coleção/interface, harmonizar as tarefas e testes antes da implementação, preservando IDs sempre que possível.

### Parallel Opportunities and Examples

Exemplos são possibilidades de execução futura; não solicitam nem iniciam agentes nesta geração. Os pares abaixo usam arquivos distintos e dependem de fundação/pré-requisitos da respectiva fase; cada par precede sua implementação, conforme especificação exige testes.

| Escopo | Tarefas possíveis em paralelo | Pré-requisito |
| --- | --- | --- |
| Setup | T002 cobertura + T003 protocolo de validação | T001 |
| US1 | T011 testes de domínio + T012 testes de contrato | T010 |
| US2 | T021 testes de liquidação + T022 testes de contrato | BaseUS1 concluída |
| US4 | T030 testes de repositório + T031 testes de recuperação visual | BaseUS1 e contratos estáveis; ordem sugerida apósUS2 |
| US3 | T038 testes de edição + T039 testes de contratos corretivos | BaseUS1/US2/US4 |
| Final | T047 validação visual/assistida + T048 documentação operacional | Todas as histórias |

Não marcar como paralelas tarefas que modificam o mesmo arquivo, usam fixtures compartilhadas ou precisam de um contrato ainda não definido. No máximo esses pares são sugeridos, sem autorização implícita para escrita remota concorrente.

## Implementation Strategy

### MVP First

Resolver G1/G2 e concluir fundação, depois entregar US1: série completa/em andamento, modo uniforme/explícito, prévia, persistência e recarga confiáveis. O caso5/10 é obrigatório, não opcional. US1 já inclui idempotência/isolamento mínimos; US4 aprofunda a aceitação adversarial antes da entrega integral. Não anunciar pagamentos ou renegociação no MVP de cadastro.

### Incremental Delivery

Adicionar US2 para consulta mensal, pagamentos/reversões e vínculo explícito de receita; US4 para matriz de falhas/limites/concorrência; US3 para edição e substituição. Validar cada incremento com fixtures próprias e critérios da história. Sem habilitação de comando futuro por mero enum/flag. Finalizar evidências, Rules/índices completos e aceitaçãoFR/SC.

### Requirement Coverage

| Requisitos | Tarefas centrais |
| --- | --- |
| FR-001–008 | T008–T017,T020 |
| FR-009 | T012,T016,T019,T038–T044 |
| FR-010 | T021,T023–T025,T029 |
| FR-011 | T022,T024,T025,T027–T029 |
| FR-012–013 | T017,T026–T029,T035 |
| FR-014/014a–017 | T038–T046 |
| FR-018 | T014,T030–T037,T041,T046 |
| FR-019–020 | T004–T007,T033,T036,T046 |
| FR-021–022 | T004–T010,T015,T020,T025,T029,T036,T042,T045,T049 |
| FR-023 | T016–T019,T026–T028,T034,T047 |
| FR-024 e SC-001–007 | Testes específicos por história,T047,T049,T050 |

## Generation Validation

50 tarefas planejadas (44 pendentes e T001–T006 concluídas): Setup3, Foundation7, US1=10, US2=9, US4=8, US3=9, Polish4. Doze tarefas marcadas[P], organizadas em seis pares independentes. Todas têm checkbox, ID sequencial, descrição e caminho; tarefas de histórias têm labelUS correspondente. Hooks before_tasks/after_tasks ausentes. A correção documental substituiu o grafo inviável e explicitou FR-011/018; os gates executáveis continuam pendentes. Nenhum código de produto, publicação ou teste financeiro foi realizado.



## Execução T005–T007

T001–T004 concluídas com inventário, cobertura, protocolo e conferência aritmética. T005 concluída no escopo de construção e verificações locais; a prova executável foi concentrada em T007 para eliminar a dependência circular de conclusão. T006 concluída:134 casos sintéticos gerados, sem aprovação remota presumida. T007 bloqueada pela revisão automática: autorização explícita para enviar fonte/fixtures a firebaserules.googleapis.com com a sessão operacional existente é necessária. Ver validation.md, candidate-manifest.json, local-validation.json e rules-evaluation-summary.json. Nenhum outro checkbox foi concluído e nenhuma publicação ocorreu.




## Atualização local21/10/2026

T011/T013 concluídas sob a exceção de ordem expressamente autorizada (../011-painel-mensal-projecao/local-checkpoint-exception.md): oito testes de entrada/limites/calendário/cronograma e planejador puro validados. As demais tarefas preservam seus critérios integrais; implementação parcial não conclui gravações/eventos/UI/provas remotas. T007 recebeu autorização de envio e a avaliação retornou HTTP503; o bloqueio atual é externo, não falta de autorização. Ver validation.md para os módulos implementados localmente e ainda não habilitados.

## Validação real25/10/2026

T007 continua aberta e agora está ERROR: a mesma candidata compilou; createOneSeries e create5of10Series excederam1000 expressões, enquanto dois recibos isolados passaram. A indisponibilidade503 deixou de ser o bloqueio reproduzido. Nenhuma tarefa dependente ou perfil remoto foi promovido. Ver rules-evaluation-summary.json e validation.md.

Refatoração posterior: criação1/1 passou;5/10 e outros comandos continuam acima do teto. Avaliação experimental interrompida após72/134 resultados por503, preservando falhas já obtidas e compilação confirmada. Ver refactor-status-2026-10-25.md. T007 não concluída; protocolo com comprovanteV proposto separadamente para aprovação, sem mudança deS/R em produção.
