# Tasks: Recorrências mensais e assinaturas

**Input**: spec.md, plan.md, research.md, data-model.md, contracts/ e quickstart.md em `specs/010-recorrencias-mensais/`.

**Prerequisites**: Constituição1.2.0, contratos003–008 e decisãoA: revisão de maio termina antes do reajuste já agendado em julho. Repositório já inicializado; não reinstalar stack ou criar backend/emulador. Caminhos abaixo são relativos à raiz do projeto.

**Tests**: Exigidos por FR-026, cenários de aceitação e constituição. Escrever/executar testes específicos antes da implementação correspondente e registrar falha inicial; manter regressões anteriores aprovadas ao concluir incremento. Testes de domínio locais; integração usa SDK cliente autenticado no projeto real autorizado com dados sintéticos, sem Admin/emulador como prova de Rules.

**Organization**: Setup, fundação impeditiva, US1/US2/US3(P1), US4/US5(P2), fechamento. [P] indica apenas arquivos distintos com pré-requisitos satisfeitos; exemplos de paralelismo não autorizam subagentes ou execução remota concorrente.

**Estado atual**: T001–T006 concluídas no escopo local; envio de T007 autorizado, mas avaliação retorna HTTP503 UNAVAILABLE; prova executável e demais tarefas pendentes. Desenho documental não aprova Rules, orçamento ou adaptador. T007 é o gate executável; PENDENTE mantém dependentes paradas, ERROR técnico exige correção/redesenho. A autorização de avaliação não autoriza publicação ou integração remota.

## Phase 1: Setup — inventário e evidências

**Purpose**: Confirmar dependências reais e preparar rastreabilidade sem criar dados financeiros.

- [X] T001 Conferir inventário e contratos reais em `specs/010-recorrencias-mensais/research.md`, inspecionando `src/domain/finance/recurrence.ts`, `src/domain/finance/operationBudget.ts`, `src/infrastructure/firebase/externosRepository.ts` e `src/features/cartoes/availability.ts`; registrar separadamente006 habilitada,007/008 ainda não comprovadas e ausência de dependência de009.
- [X] T002 [P] Criar matriz dos26 FR e sete SC em `specs/010-recorrencias-mensais/coverage.md`, associando histórias, tarefas e roteiros, incluindo reajusteA, tombstone, conjunto completo de futuras e representação única compra/item010; não anunciar testes executados.
- [X] T003 [P] Criar protocolo em `specs/010-recorrencias-mensais/validation.md` com versões, comandos locais, projeto esperado, cinco perfis, manifesto de fixtures e registro de hashes/resultados; separar avaliação, publicação e SDK, sem ler/imprimir credenciais ou presumir autorização de009.

**Checkpoint**: T001 precede T002/T003; concluir os três antes da fundação.

## Phase 2: Foundational — prova executável e infraestrutura comum

**Purpose**: Provar todos os comandos mínimos antes das histórias mutantes; contagens preliminares não são aprovação.

- [X] T004 Completar grafos e perfis de todos os comandos em `specs/010-recorrencias-mensais/contracts/security.md` e criar verificador aritmético local em `scripts/validate-recorrencias-budget.mjs`; incluir correção individual, confirmação virtual/materializada, cancelamento, revisão no mesmo limite, pagamentos/reversões, primeiro uso e controle008, além dos ramos já descritos; demonstrar conjunto A..U com slots ausentes/protegidos e rejeição integral dos excessos sem cache ou retirada de validações.
- [X] T005 Construir gerador `scripts/build-recorrencias-rules.mjs`, fonte completa `specs/010-recorrencias-mensais/firestore-recorrencias.candidate.rules` e manifesto de hashes em `specs/010-recorrencias-mensais/candidate-manifest.json`; traduzir S/V/O/R/M e integração F/controle, preservar fonte anterior necessária e realizar verificações locais de estrutura, sem publicar; prova de enforcement, bytes, acessos e expressões pertence a T007.
- [X] T006 Construir gerador `scripts/build-recorrencias-rules-cases.mjs` e suíte reproduzível `specs/010-recorrencias-mensais/rules-evaluation-cases.json`: positivos mínimos de cada comando/natureza, leitura/lista e cinco perfis; negativos de R/V/O órfãos, revisão sobreposta, omissão de slots/ausência, watermark reduzido, tombstone recriado, F/controle protegido, duplicidade, Unicode/metadados máximos, calendário/dinheiro e limites; incluir regressões das permissões005/006 e integração007/008 na fonte candidata completa.
- [ ] T007 Implementar runner local em `scripts/evaluate-recorrencias-rules.mjs` e, somente com autorização vigente para envio de fonte/fixtures, avaliar candidato; registrar resultados em `specs/010-recorrencias-mensais/validation.md` e gates em `specs/010-recorrencias-mensais/plan.md`; comprovar mínimos de todos os comandos,18/8,32 mutações,32KiB/1MiB e1000 expressões, harmonizando modelo/contratos se necessário; indisponibilidade mantém PENDENTE, mínimo inviável é ERROR, nenhuma publicação implícita.
- [ ] T008 Após PASS de T007, escrever testes de contrato e implementar tipos/porta em `src/domain/finance/contracts/recorrencias.contract.test.ts` e `src/domain/finance/contracts/recorrencias.ts`: identidades curtas, S/V/O/R/M, revisões segmentadas, tombstone, conteúdo financeiro único, versõesS/O/V/F e resultados/erros compartilhados; preservar schema1 de `src/domain/finance/recurrence.ts` e contratos avulsos005.
- [ ] T009 Escrever testes e implementar decoder/encoder/read models fechados em `src/infrastructure/firebase/recorrenciasMapper.test.ts` e `src/infrastructure/firebase/recorrenciasMapper.ts`; validar estados/campos/IDs/versões/ausências e mapear O externa ou compra/item1/1 sem cópia financeira; ampliar prefixos010 em `src/domain/finance/cadastros.ts` com regressões em `src/infrastructure/firebase/cadastrosMapper.test.ts` antes de qualquer primeiro uso010.
- [ ] T010 Preparar grupo recorrencias, cinco clientes, fixtures/manifesto e seleção de arquivos em `tests/integration/support/environment.ts`, `tests/integration/support/recorrenciasFixtures.ts` e `vitest.integration.config.ts`, com testes locais em `tests/integration/support/recorrenciasEnvironment.test.ts`; abortar projeto divergente/UID repetido/escopo inválido e não criar seed, publicar ou limpar dados.

**Checkpoint impeditivo**: T004→T005→T006→T007(PASS)→T008→T009→T010. T005/T006 concluem construção local; T007 concentra comprovação, sem ciclo de conclusão. Nenhuma história começa com T007 pendente/ERROR. A disponibilidade de controle008 precisa ser conferida já na prova de cartão; não substituir por flag falsa ou negar todo caso mínimo para declarar gate aprovado.

## Phase 3: User Story 1 — Cadastro e geração mensal externa (Priority: P1)

**Goal**: Cadastrar receita/despesa fixa/estimada e materializar período limitado sem duplicidade ou caixa inferido.

**Independent Test**: Salário dia10 desde20/10 gera primeira em10/11; energia150 dia31 de outubro a março mostra seis datas ajustadas. Repetir geração em abas/intencões distintas produz uma O por mês.

### Tests

- [ ] T011 [P] [US1] Criar testes de calendário, entrada e identidade em `src/domain/finance/recorrencias.test.ts`: início/término inclusivos, intervalo vazio,1900/2000/9999,29/30/31, BRL seguro, mesmo mês após mudança de dia e distinção entre série e parcelamento; preservar testes003.
- [ ] T012 [P] [US1] Criar testes de criação/materialização/recuperação em `src/domain/finance/contracts/recorrenciasCreation.contract.test.ts`, cobrindo S+V+R, O financeira única, primeiro uso, conteúdo divergente, mesma intenção e intenções distintas, resposta perdida e nenhum pagamento/recebimento inferido.

### Implementation

- [ ] T013 [US1] Implementar normalização, identidade e planejadores puros de cadastro/geração em `src/domain/finance/recorrencias.ts` e `src/domain/finance/recorrenciasValidation.ts`, reutilizando dinheiro/calendário003 e respeitando início/fim, revisão vigente, modalidade e perfis aceitos sem materialização infinita.
- [ ] T014 [US1] Implementar criarSerie, materializar externa e consultarOperacao em `src/infrastructure/firebase/recorrenciasRepository.ts` com testes em `src/infrastructure/firebase/recorrenciasRepository.test.ts`: versões globais, watermark monotônico, R create-only, ausência/O existente, igualdade canônica, callback puro e recuperação desde primeiro fluxo; não chamar criação005 seguida de vínculo010.
- [ ] T015 [US1] Integrar somente ramos de cadastro/geração efetivamente implementados em `firestore.rules` e perfis aprovados em `src/domain/finance/operationBudget.ts`, com regressões em `src/domain/finance/operationBudget.test.ts` e nota em `docs/firestore-rules-changes.md`; entregar fonte completa, manter demais comandos negados e recusar conjunto excedente antes de escrever.
- [ ] T016 [US1] Criar cadastro e prévia em `src/features/recorrencias/RecorrenciaForm.tsx` e `src/features/recorrencias/OcorrenciaPreview.tsx`, distinguindo fixa/estimada, intervalo vazio, data ajustada e previsto/pago; geração ao abrir ou explícita usa intenção estável e seleção limitada, sem fracionamento automático.
- [ ] T017 [US1] Implementar leitura básica de série/revisão/slots e detalhe recarregável em `src/infrastructure/firebase/recorrenciasSnapshotReader.ts` e `src/infrastructure/firebase/recorrenciasQueries.ts`, com testes básicos em `src/infrastructure/firebase/recorrenciasSnapshotReader.test.ts`; leitor010 fechado por ID token, snapshot servidor inclusive vazio, TTL50min e leitor005 preservado.
- [ ] T018 [US1] Integrar rotas/lista/detalhe e contexto de sessão em `src/features/recorrencias/RecorrenciasPage.tsx`, `src/features/recorrencias/RecorrenciaDetailPage.tsx`, `src/features/recorrencias/recorrenciasState.ts`, `src/features/recorrencias/useRecorrenciaIntent.ts`, `src/app/router.tsx`, `src/app/AppShell.tsx` e `src/app/session/financeSession.ts`; limpar estado e descartar respostas tardias ao trocar usuário.
- [ ] T019 [US1] Testar cadastro/prévia/geração e recuperação da interface em `src/features/recorrencias/RecorrenciaForm.test.tsx`, incluindo duplo clique, alteração após conferência, limite, falha, estado indeterminado, rótulos/teclado e nenhuma promessa com app fechado.
- [ ] T020 [US1] Implementar matriz de criação/consulta/duas abas e acesso direto em `tests/integration/recorrencias.integration.test.ts`; após publicação separadamente autorizada, executar SDK real dos cinco perfis e registrar hashes, fixtures e limitações em `specs/010-recorrencias-mensais/validation.md`, sem marcar integração aprovada quando indisponível.

**Checkpoint**: US1 demonstrável com recarga e gerações repetidas; fluxo externo é fonte única e não faz pagamento. MVP de cadastro não anuncia assinaturas/correções ainda não entregues.

## Phase 4: User Story 2 — Projeção persistida e virtual (Priority: P1)

**Goal**: Projetar janela navegável sem gravação, com precedência e totais rastreáveis.

**Independent Test**: Fixture com um mês persistido173,42, outro virtual150 e um pulado; projetar e paginar sem duplicação nem recriação de suprimida.

### Tests

- [ ] T021 [P] [US2] Criar testes puros em `src/domain/finance/recorrenciasProjection.test.ts` para persistida antes de virtual, tombstone, inconsistência de estados, original da revisão histórica, exceção individual, pós-encerramento e separação entre planejamento/caixa, sem somar série ou item novamente.
- [ ] T022 [P] [US2] Criar testes de contrato de leitura em `src/domain/finance/contracts/recorrenciasQueries.contract.test.ts`: janela12 meses, página50, teto100 documentos, fonte/estimado/mês/base, ausência reconciliada, cursor/TTL/sessão e filtros locais parciais.

### Implementation

- [ ] T023 [US2] Implementar projeção pura em `src/domain/finance/recorrenciasProjection.ts` e composição de fontes em `src/domain/finance/projections.ts`, exigindo subrecorte reconciliado antes de virtual e preservando dados persistidos mesmo após término/encerramento; não executar escrita ou busca dentro do projetor.
- [ ] T024 [US2] Completar paginação e snapshot no leitor/query em `src/infrastructure/firebase/recorrenciasSnapshotReader.ts` e `src/infrastructure/firebase/recorrenciasQueries.ts`, guardando série/mês/fase e pendências no cursor, refazendo consulta inicial no readTime fixo e retornando parcial/vazio com continuação ao teto100, sem varrer histórico.
- [ ] T025 [US2] Integrar fonte010 às listas externas/planejamento e fluxos de fatos/caixa em `src/infrastructure/firebase/externosQueries.ts` e `src/infrastructure/firebase/recorrenciasQueries.ts`, com índices completos em `firestore.indexes.json`; deduplicar por identidade/namespace, não alterar schema005 e manter completude por fluxo, inclusive competência corrigida fora do mês identificador.
- [ ] T026 [US2] Implementar janela mensal/multimês, filtros, indicação de origem/estimado e totais parciais em `src/features/recorrencias/RecorrenciasPage.tsx` e `src/features/recorrencias/RecorrenciaDetailPage.tsx`, preservando contexto e impedindo mês vazio falso quando continuação estiver pendente.
- [ ] T027 [US2] Testar reconciliação/paginação/snapshot e interface em `src/infrastructure/firebase/recorrenciasQueries.test.ts`, `src/infrastructure/firebase/recorrenciasSnapshotReader.test.ts` e `src/features/recorrencias/RecorrenciasPage.test.tsx`, incluindo vazios, corte intermediário, fim da janela, cursor expirado/de outra sessão e recebida versus prevista.
- [ ] T028 [US2] Exercitar projeção e índices reais com fixtures de persistidas/virtuais/suprimidas em `tests/integration/recorrencias-projection.integration.test.ts`, comparando totais com consultas externas005 e registrando evidências em `specs/010-recorrencias-mensais/validation.md`; fixture não depende da interfaceUS5 ainda ausente.

**Checkpoint**: Nenhuma virtual nasce de ausência ainda não confirmada. Fatos futuros de pagamento serão incorporados ao mesmo fluxo sem alterar a regra de projeção.

## Phase 5: User Story 3 — Assinatura no cartão (Priority: P1)

**Goal**: Criar compra mensal/item1/1 únicos e integrá-los à fatura, com as proteções de cartão.

**Independent Test**: Cartão fechamento10/vencimento17 e F confirmadas abertas; cobranças09/10 e10/10 sugerem outubro/novembro, respeitam escolha explícita e repetição não duplica item.

### Tests

- [ ] T029 [P] [US3] Criar testes puros de assinatura em `src/domain/finance/recorrenciasCard.test.ts`: fechamento exclusivo ajustado, fatura em outro mês, snapshots006, cartão arquivado, destino ambíguo, opção explícita e item1/1 sem caixa ou parcelas infinitas.
- [ ] T030 [P] [US3] Criar testes de contrato em `src/domain/finance/contracts/recorrenciasCard.contract.test.ts` para O=compra/item únicos, F ausente/protegida, primeiro uso, conteúdo divergente e versõesF/controle008, sem aceitar006 habilitada como prova de prontidão de compra/pagamento.

### Implementation

- [ ] T031 [US3] Implementar planejador de assinatura e validações de destino em `src/domain/finance/recorrencias.ts` e `src/domain/finance/recorrenciasValidation.ts`, reutilizando ciclos/snapshots006; manter identidade mensal independente de F, e F ausente exige preparar calendário006 antes de nova conferência, sem O parcial.
- [ ] T032 [US3] Implementar materialização de assinatura em `src/infrastructure/firebase/recorrenciasRepository.ts`, lendo S/V/O, cartão e F/controle atuais com versões esperadas; confirmar fonte única compra/item junto de S/R/primeiro uso conforme perfil comprovado, sem espelho em coleções007 ou remapeamento automático de F bloqueada.
- [ ] T033 [US3] Integrar ramos de assinatura em `firestore.rules`, orçamento em `src/domain/finance/operationBudget.ts` e índices em `firestore.indexes.json`, atualizando `docs/firestore-rules-changes.md` e reavaliando candidato completo; negar item órfão, vínculo alheio e proteção de F/controle, contabilizando todos os acessos adicionais de008.
- [ ] T034 [US3] Integrar item010 aos read models/totais de fatura em `src/infrastructure/firebase/faturasQueries.ts`, `src/infrastructure/firebase/faturasRepository.ts`, `src/infrastructure/firebase/recorrenciasQueries.ts` e `src/domain/finance/projections.ts`, com regressões em `src/infrastructure/firebase/faturasQueries.test.ts`; verificar integração com o contrato007/008 em `specs/010-recorrencias-mensais/validation.md` e manter US3 bloqueada se controle/pagamento008 necessário ainda não existir, sem implementar sua ausência por flag fictícia ou declarar assinatura paga.
- [ ] T035 [US3] Acrescentar cartão/titular derivado, escolha de fatura e ação de preparar calendário em `src/features/recorrencias/RecorrenciaForm.tsx`, `src/features/recorrencias/OcorrenciaPreview.tsx` e `src/features/recorrencias/RecorrenciaDetailPage.tsx`; distinguir mês de cobrança/fatura e pagamento da fatura, conservar bloqueios e intenção.
- [ ] T036 [US3] Testar interface e consulta de assinatura em `src/features/recorrencias/RecorrenciaCardForm.test.tsx` e `src/infrastructure/firebase/recorrenciasCardQueries.test.ts`, incluindo ciclo que busca mês anterior, escolha manual, mudança de cartão histórica, estimativa, recarga e deduplicação entre item010/projeção virtual/fluxo007.
- [ ] T037 [US3] Implementar/executar cenários SDK em `tests/integration/recorrencias-card.integration.test.ts`: item único, duas abas, F inexistente/protegida, primeiro uso, isolamento e pagamento de F sem duplicar despesa; registrar dependências007/008 efetivamente disponíveis e resultado em `specs/010-recorrencias-mensais/validation.md`, sem marcar conclusão se o fluxo obrigatório estiver ausente.

**Checkpoint**: Compra/item mensal aparece uma vez na fatura e nos relatórios. Aprovação006 isolada não satisfaz integração de assinatura007/008; bloqueio real fica explícito.

## Phase 6: User Story 4 — Confirmar valores e editar com vigência (Priority: P2)

**Goal**: Confirmar estimativa, editar ocorrência/futuras e preservar passado, exceções, reajustes agendados e liquidações.

**Independent Test**: Confirmar fevereiro150→173,42; inserir maio170 antes de julho200; janeiro–abril permanece150, maio/junho170, julho200, protegidas intactas.

### Tests

- [ ] T038 [P] [US4] Criar testes de planejadores em `src/domain/finance/recorrenciasEdit.test.ts`, cobrindo vigência>=atual, split/substituição no mesmo limite, reajusteA, dia31→15, competência preservada, exceções individuais, pagas/parciais/revertidas e intervalo esparso/A..U com ausentes.
- [ ] T039 [P] [US4] Criar testes de contrato em `src/domain/finance/contracts/recorrenciasCorrections.contract.test.ts`: prévia inválida, confirmar virtual com materialização integral, valor definitivo distinto de pagamento, conjunto completo, semAlteracao, revisão obsoleta e mudança de F/controle sem mudarS.

### Implementation

- [ ] T040 [US4] Implementar confirmação e planejadores corretivos em `src/domain/finance/recorrenciasEdit.ts` e `src/domain/finance/recorrenciasValidation.ts`, derivando intervalo do watermark/segmento e incluindo ausentes/protegidas; preservar próxima revisão/exceções/identidade e rejeitar se não existir efeito elegível ou orçamento seguro.
- [ ] T041 [US4] Implementar confirmarValor, editarEsta e revisarFuturas em `src/infrastructure/firebase/recorrenciasRepository.ts`, com S/V/O/R e versõesF/controle atuais; split e atualizações de elegíveis confirmam juntos, virtuais não são materializadas por revisão, falta de confirmação não publica apenas o padrão novo.
- [ ] T042 [US4] Integrar correções em `firestore.rules` e perfis comprovados em `src/domain/finance/operationBudget.ts`, com testes em `src/domain/finance/operationBudget.test.ts`; reavaliar fontes/casos completos, negar revisão órfã/omissão/mudança de protegida e registrar prova/limites em `specs/010-recorrencias-mensais/validation.md`.
- [ ] T043 [US4] Escrever testes e integrar liquidação externa010 em `src/domain/finance/recorrenciasSettlement.test.ts`, `src/domain/finance/recorrenciasSettlement.ts` e `src/infrastructure/firebase/recorrenciasRepository.ts`, usando cálculo de `src/domain/finance/settlement.ts`; pagar/receber só definitiva com conta/data/excesso válidos, reversão integral única/M, S.version e jaLiquidada monotônica, ampliando `firestore.rules` e orçamento somente para os perfis provadosT007, sem chamada005 nem pagamento individual de assinatura.
- [ ] T044 [US4] Implementar edição/confirmar estimativa e ações explícitas de pagar/receber/reverter em `src/features/recorrencias/OcorrenciaEditForm.tsx`, `src/features/recorrencias/OcorrenciaPreview.tsx` e `src/features/recorrencias/RecorrenciaDetailPage.tsx`; mostrar alcance, vigência/fim da alteração, excluídas/razões e antes/depois, separando confirmação de valor de liquidação.
- [ ] T045 [US4] Testar formulários e regressão de intenção em `src/features/recorrencias/OcorrenciaEditForm.test.tsx`, incluindo alteração pós-prévia, nenhuma elegível, original virtual, limites, F protegida, nova conferência após conflito e confirmação em duas ações explícitas antes de pagar.
- [ ] T046 [US4] Exercitar correções/estimativa/pagamentos/reversão e disputa com geração/liquidação/F em `tests/integration/recorrencias-corrections.integration.test.ts`; testar contra escrita direta que omite slots e registrar resultados/reconciliação em `specs/010-recorrencias-mensais/validation.md`.
- [ ] T047 [US4] Executar regressões cruzadas das projeções/faturas após correções em `src/domain/finance/recorrenciasProjection.test.ts`, `src/infrastructure/firebase/recorrenciasQueries.test.ts` e `src/infrastructure/firebase/faturasQueries.test.ts`, verificando datas históricas virtuais, controles/caixa e nenhuma duplicidade ao alterar cartão/fatura elegíveis.

**Checkpoint**: Confirmação coincide com prévia, preserva todas protegidas e o reajuste de julho. Revisão que excede limites não altera nem padrão nem parte das O.

## Phase 7: User Story 5 — Supressão, encerramento e recuperação (Priority: P2)

**Goal**: Pular/cancelar sem recriação, encerrar sem cancelar confirmadas e auditar/reconduzir tentativas incertas.

**Independent Test**: Pular novembro virtual, encerrar desde dezembro com janeiro já materializado; reabrir e gerar não recria novembro/dezembro, janeiro segue exigível e nenhuma resposta perdida duplica efeito.

### Tests

- [ ] T048 [P] [US5] Criar testes de supressão/encerramento em `src/domain/finance/recorrenciasLifecycle.test.ts`: tombstone sem financeiro, cancelamento preservado, sem reativação/delete, corte mensal, confirmadas posteriores conservadas e restrições de F/liquidação.
- [ ] T049 [P] [US5] Criar testes de recuperação em `src/domain/finance/contracts/recorrenciasRecovery.contract.test.ts`: ausência durante tentativa em voo, resposta perdida, semAlteracao, conteúdo divergente, pulo versus geração, encerramento/revisão concorrentes e troca de sessão.

### Implementation

- [ ] T050 [US5] Implementar planejadores de pulo/cancelamento/encerramento em `src/domain/finance/recorrencias.ts` e `src/domain/finance/recorrenciasValidation.ts`, com motivo/prévia, primeiro mês excluído e lista de confirmadas preservadas, mantendo watermark e elegibilidade sem contorno de pagamentos.
- [ ] T051 [US5] Implementar pular, cancelar, encerrar e recuperação completa em `src/infrastructure/firebase/recorrenciasRepository.ts`, com regressões em `src/infrastructure/firebase/recorrenciasRepository.test.ts`; confirmar O/R/S juntos, serializar mesmo slot e respeitar fechamento/controle008, nunca apagar tombstone ou cancelar confirmadas pelo encerramento.
- [ ] T052 [US5] Integrar ciclo de vida em `firestore.rules`, orçamento em `src/domain/finance/operationBudget.ts` e casos oficiais em `specs/010-recorrencias-mensais/rules-evaluation-cases.json`, reavaliando fonte completa; negar delete/reativação/watermark reduzido, reuso de R e geração após corte, sem rejeitar os mínimos válidos como sucesso.
- [ ] T053 [US5] Escrever testes e implementar reconstrução/auditoria em `src/domain/finance/recorrenciasAudit.test.ts` e `src/domain/finance/recorrenciasAudit.ts`, conferindo cadeia contígua de versões no mesmo snapshot, split histórico, watermark, tombstones e controles/fatos; páginas pendentes deixam auditoria incompleta, divergência bloqueia mutação sem autoeditar dados.
- [ ] T054 [US5] Implementar encerramento/pulo/cancelamento, histórico e retomada em `src/features/recorrencias/RecorrenciaEncerrarForm.tsx`, `src/features/recorrencias/RecorrenciaDetailPage.tsx`, `src/features/recorrencias/recorrenciasState.ts` e `src/features/recorrencias/useRecorrenciaIntent.ts`; mostrar confirmadas posteriores exigíveis e erro/limite/indeterminado, mantendo intenção e descartando callbacks de outra sessão.
- [ ] T055 [US5] Testar jornada e recuperação da interface em `src/features/recorrencias/RecorrenciaEncerrarForm.test.tsx` e `src/features/recorrencias/recorrenciasRecovery.test.ts`, incluindo tombstone permanente, sem promessa de execução fechada, conflito que exige nova prévia e estados acessíveis.
- [ ] T056 [US5] Implementar/executar matriz adversarial real em `tests/integration/recorrencias-recovery.integration.test.ts`: duas abas, resposta perdida, pulo/geração/encerramento/revisão/liquidação e F concorrentes, delete/reativação diretos e cinco perfis; repetir projeção após supressão/corte e registrar manifesto/resultados em `specs/010-recorrencias-mensais/validation.md`.

**Checkpoint**: Supressões não reaparecem; encerramento limita novas O e preserva confirmadas; erro indeterminado não vira sucesso inventado e auditoria reconstrói estado sem depender da ordem de timestamps.

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Fechar aceitação, documentação, regressões e entrega completa.

- [ ] T057 [P] Concluir testes responsivos/teclado/foco/estados em `src/features/recorrencias/RecorrenciasPage.test.tsx` e aceitação assistidaSC-007 em `specs/010-recorrencias-mensais/validation.md`; registrar quatro de cinco participantes em até3min ou resultado/limitação real, sem inventar participantes.
- [ ] T058 [P] Atualizar comandos, pré-requisitos, índices, entrega/rollback e instruções em `specs/010-recorrencias-mensais/quickstart.md` e `docs/firestore-rules-changes.md`; entregar arquivos Rules/índices completos e hashes, preservar fatos/tombstones e distinguir código local, avaliação, publicação e SDK.
- [ ] T059 Executar `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` e matriz real autorizada; conferir fontes completas `firestore.rules`/`firestore.indexes.json` e registrar comandos/resultados/limitações em `specs/010-recorrencias-mensais/validation.md`; integração sem acesso/autorização permanece não realizada, não PASS.
- [ ] T060 Fechar rastreabilidade de todos FR/SC e estado dos gates em `specs/010-recorrencias-mensais/coverage.md` e `specs/010-recorrencias-mensais/plan.md`, inventariando manifesto/escopo antes de qualquer limpeza autorizada; manter pendência de dependência007/008 se existir, sem apagar dados desconhecidos nem presumir remoção de filhos pelo pai.

## Dependencies & Execution Order

### Dependências de fases

1. Setup: T001→{T002,T003}; concluir antes de T004.
2. Prova: T004→T005→T006→T007. T005/T006 são construção; T007 recebe provas completas e harmoniza artefatos. Sem PASS, T008–T060 não iniciam. Nenhum ciclo exige prova de T007 para marcar construçãoT005 concluída.
3. Fundação: T008→T009→T010, após PASS de T007.
4. US1: {T011,T012}→T013→T014→T015→T016→T017→T018→T019→T020.
5. US2: {T021,T022}→T023→T024→T025→T026→T027→T028, sobre infraestruturaUS1; testes independentes usam fixtures, não interfaceUS5.
6. US3: {T029,T030}→T031→T032→T033→T034→T035→T036→T037, após baseUS1/US2. Fatura006 é requisito; contratos/controles007/008 necessários devem estar implementados/validados antes da conclusãoT034/T037. Se ausentes, registrar bloqueio, não expandir escopo para implementar008 inteira nem contornar proteção.
7. US4: {T038,T039}→T040→T041→T042→T043→T044→T045→T046→T047; usar fontesUS1/US2 e integraçãoUS3 para correções de cartão. Fixtures representam pagamentos/protegidas nos testes iniciais; domínio de liquidação010T043 precede aceitaçãoSDK, sem depender de UIUS5.
8. US5: {T048,T049}→T050→T051→T052→T053→T054→T055→T056; completar recuperação já básica desdeUS1 e reexecutar todas as corridas sobre comandos entregues.
9. Final: todas histórias→{T057,T058}→T059→T060.

**Ordem sugerida**: Setup→Fundação→US1→US2→US3→US4→US5→Final. Domínio, projeção e aceitação de cada história usam fixtures próprias; nenhuma exige interface de história posterior. Integração real depende de versão ativa autorizada, sem autorização implícita pelo grafo.

### Arquivos compartilhados e habilitação

`firestore.rules`, `operationBudget.ts`, `recorrenciasRepository.ts`, `recorrenciasQueries.ts`, `projections.ts`, `RecorrenciaDetailPage.tsx` e configuração de integração são pontos de serialização; não alterar em paralelo entre histórias. T007 avalia desenho completo; T015/T033/T042/T043/T052 só habilitam ramos implementados e reavaliam regressões. Capacidade da tabela preliminar não substitui prova do ramo concreto. Alteração de modelo/caminhos em T007 exige harmonizar tarefas futuras antes de prosseguir, preservando IDs quando possível.

Disponibilidade de008 é dependência externa identificada, não uma tarefa concluída ou uma dispensa. Se impedir caso mínimo já no gate, T007 permanece PENDENTE/ERROR conforme evidência; nenhum incremento pode anunciar cobertura integral omitindo assinatura/proteções.

### Exemplos de paralelismo

Exemplos para execução futura, sem iniciar agentes. Cada par começa somente após os pré-requisitos da fase e antes da implementação correspondente.

| Escopo | Par em arquivos distintos | Pré-requisito |
| --- | --- | --- |
| Setup | T002 cobertura e T003 protocolo | T001 |
| US1 | T011 domínio e T012 contrato de criação | T010 |
| US2 | T021 projeção e T022 contrato de leitura | BaseUS1 |
| US3 | T029 calendário/cartão e T030 contrato de assinatura | BaseUS1/US2 |
| US4 | T038 planejadores e T039 contrato corretivo | BaseUS1/US2/US3 |
| US5 | T048 ciclo de vida e T049 contrato de recuperação | Base anterior |
| Final | T057 acessibilidade/aceitação e T058 documentação | Histórias concluídas |

## Implementation Strategy

### MVP First

Concluir Setup e Fundação, depois US1: cadastrar receitas/despesas mensais, prévia, início/fim, calendário compartilhado, geração de um slot com intenção e recarga sem duplicidade. O MVP não anuncia pagamentos, assinatura ou edição ainda não entregues; projeção completa é incrementoUS2. Proteção mínima de sessão/repetição/orçamento acompanha primeiro comando, não é adiada paraUS5.

### Incremental Delivery

US2 entrega projeção sem escrita e integração externa; US3 entrega assinatura/fatura condicionada aos controles existentes; US4 entrega estimativas/correções e liquidações externas; US5 entrega supressões/encerramento e fecha recuperação/auditoria adversarial. Validar cada incremento sem quebrar anteriores. Publicação e SDK reais só segundo autorização vigente; sem bootstrap/seed automático, emulador ou promessa de execução fechada.

### Requirement Coverage

| Requisitos | Tarefas centrais |
| --- | --- |
| FR-001–005 | T008–T020,T029–T037 |
| FR-006–007 | T021–T028,T034,T047,T053,T056 |
| FR-008–009 | T013–T015,T038–T047 |
| FR-010–012 | T029–T037 |
| FR-013–015 | T038–T047 |
| FR-016–018 | T048–T056 |
| FR-019–020 | T004–T007,T014,T019,T032,T039,T041,T046,T049,T051,T054–T056 |
| FR-021 | T004–T007,T015,T024,T033,T042,T043,T052,T059 |
| FR-022 | T017,T018,T022,T024–T028,T054,T055 |
| FR-023–024 | T004–T010,T015,T020,T029–T037,T042,T043,T046,T052,T056,T059 |
| FR-025 | T016–T019,T026,T027,T035,T036,T044,T045,T054,T055,T057 |
| FR-026 | T003,T007,T010,T019,T020,T028,T037,T046,T056,T058–T060 |
| SC-001 | T011,T013,T020,T029,T031,T038,T040 |
| SC-002 | T012,T014,T019,T020,T030,T032,T037,T049,T051,T056 |
| SC-003 | T021–T028,T034,T047,T053,T056 |
| SC-004 | T038–T047 |
| SC-005 | T029–T037,T047,T050–T056 |
| SC-006 | T006,T007,T010,T020,T028,T037,T046,T056,T059 |
| SC-007 | T057 |

## Generation Validation

60 tarefas, seis concluídas e54 pendentes: Setup3, Foundation7, US1=10, US2=8, US3=9, US4=10, US5=9, Polish4. Quatorze marcadas[P] em sete pares de arquivos distintos. Cada tarefa tem checkbox, ID sequencial e caminho; todas de história têm labelUS. Cobertura planejada dos33 requisitos, sem afirmar execução. Hooks before_tasks/after_tasks ausentes. Este comando não implementou produto nem executou avaliação/publicação/integração financeira.

## Execução de implementação — 2026-10-20

T001–T003 concluídas; T004 permanece parcial. Verificador local e cinco testes criados, mas a composição mínima de assinatura com G/J008 custa21 acessos e excede18. Não há grafo completo aprovado dos demais comandos. T005–T060 não iniciadas; seguir o checkpoint exige redesenho técnico, não autorização remota. Ver validation.md, rules-budget-profiles.json e rules-budget-report.json. Nenhum perfil financeiro foi habilitado.


## Retomada autorizada e correção de T004

O layout21 foi substituído pelo controle de item incorporado em O e por G obrigatório/recíproco.26 grafos mínimos/opcionais conferidos; testes10/10, candidata82766 bytes e327 casos (189 ALLOW/138 DENY) gerados. T004–T006 concluídas na construção local. T007 tem runner preparado e nenhum envio realizado; aguarda autorização explícita para fonte/fixtures/destino e avaliação. T008–T060 não iniciadas. Prova de bytes/expressões/compilação não foi marcada como aprovada; ver validation.md e remediation.md. A ponte006 exige o adaptador de vencimento atualizarG/calendarioVersion antes do rollout em T034.

