# Tasks: Compras no cartão e parcelas

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [commands.md](contracts/commands.md), [security.md](contracts/security.md), [queries-ui.md](contracts/queries-ui.md) e [quickstart.md](quickstart.md).

**Prerequisites**: Constituição1.2.0 e base002–006. G0/G1 permanecem impeditivos: esta lista não declara viabilidade comprovada nem autoriza deploy/migração. Caminhos novos são alvos futuros.

**Tests**: Incluídos porque FR-028 e SC-001–008 exigem testes de domínio, persistência, concorrência e isolamento. Preparar testes antes da implementação e verificar que revelam o comportamento ausente; nenhum emulador.

**Organization**: Setup → fundação com gates → US1/US2/US3(P1) → US4(P2) → consolidação. Todas as caixas começam abertas. Prova só termina com evidência positiva/negativa exigida, nunca apenas com relatório de falha.

## Format: `[ID] [P?] [Story] Description`

`[P]` indica arquivos distintos, paralelizáveis após os pré-requisitos explícitos da fase. Não editar Rules, adaptadores, domínio ou integração compartilhados simultaneamente. Labels US1–US4 correspondem às histórias da especificação.

## Path Conventions

Caminhos relativos à raiz. Manter stack existente, sem backend financeiro, dependência nova presumida ou ampliação do CRUD004. Evidências007 em `specs/007-compras-cartao-parceladas/validation.md`; consertos006 também atualizam seu registro próprio.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar evidência e harness sem liberar compras ou reinicializar projeto.

- [X] T001 Registrar baseline, lock/checkout, disponibilidade006 e critérios G0–G3 em `specs/007-compras-cartao-parceladas/validation.md`, conferindo `src/features/cartoes/availability.ts` e `src/domain/finance/operationBudget.ts` sem promover perfis.
- [X] T002 [P] Adicionar grupo `comprasCartao` e recusas de projeto/UID/grupo incompatíveis em `tests/integration/support/environment.ts`, `tests/integration/support/environment.test.ts`, `tests/integration/support/preflight.ts` e `vitest.integration.config.ts`, reutilizando quatro contas fictícias/visitante sem expor segredos.
- [X] T003 [P] Estender fixtures e limpeza delimitada007 em `tests/integration/support/manifest.ts`, `tests/integration/support/clients.ts`, `tests/integration/support/cleanup.ts` e `tests/integration/support/comprasManifest.test.ts`, inventariando IDs antes de gravar e proibindo limpeza ampla/automática.
- [X] T004 Documentar comandos e pré-requisitos do harness em `specs/007-compras-cartao-parceladas/quickstart.md`: projeto/fonte conferidos, autorização vigente das operações remotas, sem emulador e distinção entre gerado/avaliado/publicado/testado.

**Checkpoint**: T002/T003 após T001, paralelizáveis entre si; T004 aguarda ambos. Nada financeiro liberado.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Resolver G0/G1 e construir contratos compartilhados antes das histórias. O desenho de referência não demonstra N>=2 dentro do orçamento e não pode ser promovido por copiar suas fórmulas.

**CRITICAL**: Se G0/G1 permanecerem inviáveis, registrar evidência, manter tarefas dependentes abertas e interromper histórias. Não substituir parcelamento por1/1, remover proteção ou aumentar limites silenciosamente.

- [X] T005 Criar casos oficiais positivos/negativos006 em `specs/006-cartoes-ciclos-faturas/rules-evaluation-cases.json`, reproduzindo falha1000 expressões para confirmação/ajuste e cobrindo fronteira circular/sobreposição distância2; negação por orçamento não prova rejeição semântica.
- [X] T006 Refatorar calendário/recibo em `firestore.rules` para reduzir expressões sem remover identidade, snapshots, quatro vizinhos, reciprocidade ou cutoff; entregar fonte completa e atualizar `specs/006-cartoes-ciclos-faturas/deployment-review.md`, mantendo mutações bloqueadas até prova.
- [X] T007 Compilar/avaliar oficialmente fonte006 integral conforme autorização vigente e registrar contagens em `specs/006-cartoes-ciclos-faturas/validation.md`; após publicação autorizada executar matriz SDK006 e somente então atualizar `src/features/cartoes/availability.ts` e perfis006 em `src/domain/finance/operationBudget.ts` (G0).
- [ ] T008 Projetar grafo007 viável em `specs/007-compras-cartao-parceladas/contracts/security.md` e `specs/007-compras-cartao-parceladas/research.md`, contando leituras/escritas/referências sem cache para aceitar N>=2 com criação/edição/cancelamento seguros, sem escolher backend, multietapas ou escopo não autorizado.
- [ ] T009 Criar harness de avaliação de candidatos em `scripts/evaluate-compras-rules.mts` e `specs/007-compras-cartao-parceladas/rules-evaluation-cases.json`, incluindo positivos parcelados, máximos aceitos/rejeitados, primeiro uso/cinco etiquetas e ataques do grafo; sem publicação automática.
- [ ] T010 Reconciliar candidato viável com `specs/007-compras-cartao-parceladas/plan.md`, `specs/007-compras-cartao-parceladas/data-model.md`, `specs/007-compras-cartao-parceladas/contracts/commands.md`, `specs/007-compras-cartao-parceladas/contracts/queries-ui.md` e `specs/007-compras-cartao-parceladas/tasks.md`, preservando requisitos e corrigindo caminhos/contagens antes de avançar; sem candidato, registrar ERROR e manter esta tarefa aberta.
- [ ] T011 Materializar grafo candidato completo em `firestore.rules`, incluindo compras/parcelas/recibos/controles, primeiro uso004, faturas novas e ajuste006; comprovar formas fechadas, reciprocidade, request.time e marcador monotônico, negando controle ausente/desconhecido e mantendo release007 bloqueado.
- [ ] T012 Compilar/avaliar oficialmente candidato007 com T009 e registrar contagens reais em `specs/007-compras-cartao-parceladas/validation.md`; exigir18/8/32/bytes/1000 simultaneamente, sem cache presumido; rejeitar todos N>=2 não aprova G1.
- [ ] T013 Preparar fonte/índices integrais e rollback em `firestore.rules`, `firestore.indexes.json`, `docs/firestore-rules-changes.md` e `specs/007-compras-cartao-parceladas/deployment-review.md`; coordenar compatibilidade006 e publicar candidato apenas com autorização vigente, backup e fonte/índices conferidos, sem liberar UI.
- [ ] T014 Após T012/T013 e ambiente autorizado, provar via SDK cliente N>=2, edição/cancelamento elegíveis, fechamento local e isolamento em `tests/integration/compras-gates.integration.test.ts`; registrar fonte/runId em `specs/007-compras-cartao-parceladas/validation.md`, sem abrir pagamentos para fabricar fixture; encerrar G1/G2 apenas com prova própria.
- [ ] T015 Definir portas/DTOs fechados, comandos/resultados/no-ops/erros e contexto UID/generation em `src/domain/finance/contracts/compras.ts`, separando revisão de conteúdo/cronograma/calendário segundo T010.
- [ ] T016 Harmonizar identidade de parcela por compra/revisão/ordinal e helper de fatura006 em `src/domain/finance/identity.ts`, `src/domain/finance/identity.test.ts` e `src/domain/finance/contracts/seriesDouble.testSupport.ts`, preservando externas e provando3→2→3 sem reciclagem.
- [ ] T017 Consolidar perfis específicos por criar/editar/cancelar em `src/domain/finance/operationBudget.ts` e `src/domain/finance/operationBudget.test.ts`, e evidência G0/G1/G2 em `specs/007-compras-cartao-parceladas/validation.md`; não habilitar produção007 antes da respectiva história integrada nem herdar validade de cartões/externos.

**Checkpoint**: G0/G1/G2 resolvidos com contratos coerentes. Mudança de layout que mude requisito exige voltar à especificação. T008/T009 podem preparar pesquisa durante G0, mas compartilhamento de documentos/Rules exige coordenação e não recebe `[P]`.

## Phase 3: User Story 1 - Cadastrar e conferir uma compra (Priority: P1)

**Goal**: Compra1/1 ou parcelada, prévia/primeira fatura alterável e confirmação integral com replay básico. FR-001–012/015/017/021/026–028.

**Independent Test**: Conferir100/3 em dez/jan/fev, mudar primeira fatura, salvar/recarregar; provar1/1 sem caixa e cadastro retroativo em fechada negado. O exemplo100/3 deve funcionar antes de completar US1; o gate mínimo N2 não o substitui.

### Tests for User Story 1

- [ ] T018 [P] [US1] Escrever testes de entrada,100/3, centavo mínimo/máximo,1–12/13, parcela zero, primeira fatura explícita, fechamento e virada do ano em `src/domain/finance/compras.test.ts`, com resultados conferidos e conferência invalidada ao mudar dados.
- [ ] T019 [P] [US1] Escrever testes de criação integral, recibo obrigatório, replay, chave divergente e excesso sem escrita em `src/domain/finance/contracts/compras.contract.test.ts`, sem presumir adaptador genérico habilitado.
- [ ] T020 [P] [US1] Preparar testes reais1/1/parcelada, ausência de caixa, referências inválidas, destino fechado e grafo adulterado em `tests/integration/compras.integration.test.ts`, com fixtures exatas; executar após código/fonte autorizados.

### Implementation for User Story 1

- [ ] T021 [US1] Implementar validação e planejamento puro em `src/domain/finance/compras.ts`, reutilizando dinheiro/calendário, exigindo cartão ativo para compra nova e sem gerar pagamento/fatura na prévia.
- [ ] T022 [US1] Integrar prévia ao calendário006 em `src/domain/finance/installments.ts` e `src/domain/finance/faturas.ts`, preservando snapshots/âncoras/escolha explícita e negando criação em fechada mesmo sem pagamento, sem mover destino automaticamente.
- [ ] T023 [US1] Implementar mapeadores fechados de compra/parcela/controle/recibo e testes em `src/infrastructure/firebase/comprasMapper.ts` e `src/infrastructure/firebase/comprasMapper.test.ts`, rejeitando schema, ID, revisão, soma e vínculos incompatíveis.
- [ ] T024 [US1] Implementar criação atômica/replay básico em `src/infrastructure/firebase/comprasRepository.ts`: recibo primeiro, leituras antes das escritas, contexto/custo revalidados, origem/parcelas/faturas/controles/primeiro uso/recibo consistentes e nenhuma UI no callback.
- [ ] T025 [US1] Integrar primeiro uso e compatibilidade de fatura/controle em `src/infrastructure/firebase/cadastrosRepository.ts`, `src/infrastructure/firebase/faturasRepository.ts` e `src/infrastructure/firebase/faturasMapper.ts`, negando inicialização false de histórico desconhecido e preservando cadeia de calendário.
- [ ] T026 [US1] Testar falha antes do commit, versão obsoleta, arquivamento concorrente e perfil excedido em `src/infrastructure/firebase/comprasRepository.test.ts`, comprovando ausência de efeitos parciais/sobrescrita silenciosa.
- [ ] T027 [US1] Implementar formulário/prévia acessíveis em `src/features/compras/CompraForm.tsx` e `src/features/compras/CompraPreview.tsx`, com campos, etiquetas, total/cronograma/vencimentos e primeira fatura alterável invalidando conferência anterior.
- [ ] T028 [US1] Implementar estado de cadastro e testes de envio único/conferência/erro em `src/features/compras/comprasState.ts` e `src/features/compras/comprasState.test.ts`, distinguindo prévia/envio/confirmação/falha e preservando entrada na mesma sessão.
- [ ] T029 [US1] Integrar hooks, cadastro e detalhe mínimo em `src/features/compras/useCompras.ts`, `src/features/compras/CompraDetailPage.tsx`, `src/app/router.tsx` e `src/app/AppShell.tsx`, lendo cronograma persistido sem geração e respeitando perfis indisponíveis.
- [ ] T030 [US1] Executar T020 e aceitação após fonte/índices/autorização conferidos, provar100/3 e1/1 após recarga e registrar em `specs/007-compras-cartao-parceladas/validation.md`; promover somente criação comprovada em `src/domain/finance/operationBudget.ts`, sem afirmar release completo/recuperação avançada.

**Checkpoint**: US1 demonstrável com múltiplas parcelas reais e sem caixa. Replay básico é obrigatório aqui. MVP de uso contínuo recomendado aguarda US2.

## Phase 4: User Story 2 - Recuperar sem duplicar (Priority: P1)

**Goal**: Recuperar confirmação perdida/recarga sem duplicação e conciliar abas/intenções concorrentes. FR-011–016/026–028.

**Independent Test**: Perder resposta após commit real, recarregar e recuperar mesma intenção; repetir em duas abas e confirmar compras distintas na mesma fatura, sem perda de itens ou geração por consulta.

### Tests for User Story 2

- [ ] T031 [P] [US2] Escrever testes de retry, perda de resposta pós-commit, duas intenções na mesma fatura, conflito de conteúdo e fechamento entre prévia/commit em `src/infrastructure/firebase/comprasRecovery.test.ts`, sem confundir cache offline com ausência remota.
- [ ] T032 [P] [US2] Escrever testes de descritor fechado, recarga, troca de UID/generation e resposta tardia em `src/app/session/comprasSession.test.ts` e `src/features/compras/useCompraIntent.test.ts`, sem payload/credenciais no armazenamento local.

### Implementation for User Story 2

- [ ] T033 [US2] Implementar consultarOperacao por descritor/comando e retomada remota em `src/infrastructure/firebase/comprasRepository.ts`, recuperando recibo confirmado, preservando intenção indeterminada e exigindo reconstrução/conferência se payload perdido não puder ser retomado com segurança.
- [ ] T034 [US2] Acrescentar descritor privado007 e limpeza de sessão em `src/app/session/financeSession.ts` e `src/features/compras/useCompraIntent.ts`, guardando somente UID/tipo/chave/compra/revisões e impedindo reenvio sob outro UID.
- [ ] T035 [US2] Integrar bloqueio de intenção incompatível e estados de retomada em `src/features/compras/comprasState.ts`, `src/features/compras/CompraForm.tsx` e `src/features/compras/CompraDetailPage.tsx`, distinguindo confirmado/ausente/indeterminado/conflito de conteúdo.
- [ ] T036 [US2] Implementar reconstrução do cronograma sem escrita e recusa de lacuna/revisão divergente em `src/infrastructure/firebase/comprasQueries.ts`, incluindo consulta de cancelada sem ressuscitar parcelas.
- [ ] T037 [US2] Integrar conflito por compra/fatura, erros sanitizados e revalidação no retry em `src/infrastructure/firebase/comprasRepository.ts`, exigindo releitura/nova prévia diante de alteração concorrente e preservando compras distintas.
- [ ] T038 [US2] Acrescentar e executar recuperação pós-commit realmente confirmado, duas abas e compras distintas na mesma fatura em `tests/integration/compras.integration.test.ts`; falha antes da escrita não substitui perda de resposta após commit.
- [ ] T039 [US2] Registrar SC-003/007 e evidências de sessão/recarga/concorrência em `specs/007-compras-cartao-parceladas/validation.md`, comprovando zero duplicatas e zero geração ao consultar.

**Checkpoint**: US2 usa compra criada naUS1 ou fixture da suíte, sem depender da UI de edição/agrupamento. Cancelamento preexistente pode usar double/fixture autorizada atéUS3, sem alegar cenário remoto ainda não executado.

## Phase 5: User Story 3 - Corrigir ou cancelar com segurança (Priority: P1)

**Goal**: Editar/cancelar compra inteira e dependências elegíveis, preservando histórico e bloqueando toda fatura protegida. FR-014–022/026–028.

**Independent Test**: Corrigir compra em três faturas abertas sem pagamento; mudar total/quantidade/primeira fatura e executar3→2→3; cancelar com motivo. Uma fatura fechada/com pagamento parcial/revertido bloqueia tudo, inclusive metadados.

### Tests for User Story 3

- [ ] T040 [P] [US3] Escrever testes de escopo integral, metadados sem cronograma novo,3→2→3, cancelamento/no-op/jaCancelada, arquivado e união de destinos em `src/domain/finance/comprasEdicao.test.ts`.
- [ ] T041 [P] [US3] Preparar casos oficiais de fechada/pagamento parcial/revertido, controle ausente/resetado, dia falso, destino antigo omitido e marcador true→false em `specs/007-compras-cartao-parceladas/rules-edicao-cases.json`, incluindo positivos elegíveis sem estouro incidental.
- [ ] T042 [P] [US3] Escrever testes de adaptador para edição/cancelamento concorrentes, ajuste de vencimento simultâneo, arquivamento e excesso sem alteração parcial em `src/infrastructure/firebase/comprasEdicao.test.ts`, com entradas independentes do algoritmo.

### Implementation for User Story 3

- [ ] T043 [US3] Implementar planejamento puro de edição/cancelamento e antes/depois em `src/domain/finance/compras.ts`, mantendo compra/cartão/proprietário, revisando cronograma somente quando necessário e exigindo motivo1–1000 no cancelamento.
- [ ] T044 [US3] Implementar editarCompra/cancelarCompra e no-ops em `src/infrastructure/firebase/comprasRepository.ts`, revalidando todas faturas antigas/propostas, controles/calendário, referências e orçamento, sem reciclar posições ou apagar faturas vazias.
- [ ] T045 [US3] Completar/avaliar ramos de edição/cancelamento em `firestore.rules` com T041 e registrar contagens em `specs/007-compras-cartao-parceladas/contracts/security.md`, incluindo metadados em protegidas e escrita direta; negar correção de histórico fechado/movimentado.
- [ ] T046 [US3] Coordenar ajuste de vencimento006 com controle007 em `src/infrastructure/firebase/faturasRepository.ts` e `src/infrastructure/firebase/faturasQueries.ts`, mantendo cadeia de calendário, autoridade única do vencimento e bloqueio de compra em fechada.
- [ ] T047 [US3] Harmonizar exigibilidade por origem/revisão e exclusão de cancelada no consumo corrente em `src/domain/finance/projections.ts`, `src/domain/finance/projections.test.ts` e `src/domain/finance/contracts/commands.ts`, preservando estornos tipados/externas e sem caixa ou ajuste implícito.
- [ ] T048 [US3] Implementar ações de edição/cancelamento, escopo integral, motivo/impacto e impedimentos em `src/features/compras/CompraDetailPage.tsx`, `src/features/compras/CompraForm.tsx` e `src/features/compras/CompraPreview.tsx`, conservando arquivado só na obrigação existente elegível.
- [ ] T049 [US3] Integrar invalidação e retomada da intenção de alteração em `src/features/compras/useCompras.ts` e `src/features/compras/useCompraIntent.ts`, sem reaplicar conteúdo antigo nem apresentar cancelamento como pagamento.
- [ ] T050 [US3] Acrescentar/executar edição/replay,3→2→3, cancelamento e histórico protegido em `tests/integration/compras.integration.test.ts`, usando fixture de pagamentos/controle apenas por mecanismo autorizado; identificar cobertura local/oficial quando remoto não for possível.
- [ ] T051 [US3] Registrar SC-005, máximos de edição/cancelamento e regressões006 em `specs/007-compras-cartao-parceladas/validation.md`; promover somente perfis provados em `src/domain/finance/operationBudget.ts`, mantendo indisponíveis casos sem evidência.

**Checkpoint**: US3 testável com compra/fixture existente, sem depender da listaUS4. Revisões antigas nunca são exigíveis e pagamento revertido continua protegido.

## Phase 6: User Story 4 - Conferir fatura e origem das parcelas (Priority: P2)

**Goal**: Itens/total/categorias e navegação à origem/parcelas posteriores com completude e histórico. FR-008–010/013/023–028.

**Independent Test**:80 em1/1 mais33,34 em1/3 totalizam113,34; grupos reconciliam; cruzar duas páginas pequenas e navegar item→origem→fatura posterior em duas ações. Canceladas fora do total e nenhuma quitação individual presumida.

### Tests for User Story 4

- [ ] T052 [P] [US4] Escrever testes de snapshot/páginas/referências incompletas, expiração, schema desconhecido, cursor alheio e revisão antiga em `src/infrastructure/firebase/comprasQueries.test.ts`, sem totalDefinitivo para consulta incompleta.
- [ ] T053 [P] [US4] Escrever testes de80+33,34, grupos/ajustes separados, indicação1/1 e posteriores sem quitação presumida em `src/features/compras/comprasConsulta.test.ts`, com modelos de apresentação independentes do adaptador.

### Implementation for User Story 4

- [ ] T054 [US4] Implementar leitor007 com allowlist privada/readTime comum em `src/infrastructure/firebase/comprasSnapshotReader.ts` e `src/infrastructure/firebase/comprasSnapshotReader.test.ts`, reutilizando padrão005 sem caminho arbitrário e reiniciando snapshot expirado.
- [ ] T055 [US4] Completar consultas de fatura/compra/histórico em `src/infrastructure/firebase/comprasQueries.ts`, resolvendo origem/revisão/fatura/classificações no mesmo snapshot, somando só exigíveis e distinguindo vazio/incompleto/falha/definitivo.
- [ ] T056 [US4] Acrescentar índices/isenções completos007 em `firestore.indexes.json`, preservando anteriores e documentando filtros/cursor/ordem/READY em `docs/firestore-rules-changes.md`, sem prometer filtros combinados não implementados.
- [ ] T057 [US4] Implementar lista por cartão/intervalo/situação/categoria/uma etiqueta em `src/features/compras/ComprasPage.tsx` e `src/features/compras/useCompras.ts`, com paginação limitada/cursor vinculado a sessão/filtros, sem carregar todo histórico.
- [ ] T058 [US4] Estender fatura com itens/total/grupos/histórico em `src/features/cartoes/FaturaDetailPage.tsx` e `src/features/cartoes/FaturaSummary.tsx`, distinguindo uma parcela de ordinal/quantidade e indicando base temporal do mês/ano de vencimento.
- [ ] T059 [US4] Completar cronograma corrente/histórico, links de faturas e retorno em `src/features/compras/CompraDetailPage.tsx` e `src/app/router.tsx`, garantindo item→origem→fatura posterior em duas ações e separando posições posteriores de saldo não pago.
- [ ] T060 [US4] Integrar completude/acessibilidade e invalidação das faturas em `src/features/compras/comprasState.ts`, `src/features/compras/useCompras.ts` e `src/features/cartoes/faturasState.ts`, descartando respostas tardias/totais híbridos.
- [ ] T061 [US4] Acrescentar/executar consultas reais com páginas pequenas, classificação, revisão antiga, cancelamento e A/B/ADMIN/PENDING/visitante em `tests/integration/compras.integration.test.ts`, comprovando113,34 sem somar somente página visível.
- [ ] T062 [US4] Registrar SC-004/006/007 e navegação/completude em `specs/007-compras-cartao-parceladas/validation.md`, conferindo zero consumo adicional por parcela, zero caixa no cadastro e nenhum estado pago inventado.

**Checkpoint**: US4 demonstrável com fixtures existentes, independentemente das ações de alteração na UI; implementação depende do núcleo de consultaUS2 e estados de revisãoUS3.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Consolidar proteção/experiência/evidência, sem antecipar pagamentos, migração, correção de protegidas ou simulador.

- [ ] T063 Executar regressão pertinente com lint/typecheck/test/build e registrar resultados em `specs/007-compras-cartao-parceladas/validation.md`, corrigindo falhas e preservando002–006 antes do release.
- [ ] T064 Conferir fonte/índices/reversão/legado em `firestore.rules`, `firestore.indexes.json`, `docs/firestore-rules-changes.md` e `specs/007-compras-cartao-parceladas/deployment-review.md`, incluindo bloqueio de novas mutações sem perder leitura/histórico e sem inicialização/migração automática.
- [ ] T065 [P] Validar desktop/celular/teclado/rótulos/foco e estados em `src/features/compras/CompraForm.tsx`, `src/features/compras/CompraPreview.tsx` e `src/features/cartoes/FaturaDetailPage.tsx`, registrando evidência/correções em `specs/007-compras-cartao-parceladas/validation-ui.md`.
- [ ] T066 [P] Medir SC-001/008 com cinco participantes e registrar em `specs/007-compras-cartao-parceladas/usability.md`:4/5 concluem em3min e distinguem compra/pagamento e posteriores/pendência; manter aberta se participantes indisponíveis.
- [ ] T067 Executar roteiro aplicável de `specs/007-compras-cartao-parceladas/quickstart.md` e consolidar FR-001–028/SC-001–008, casos aceitos/rejeitados e limitações em `specs/007-compras-cartao-parceladas/validation.md`, sem chamar ignorados/bloqueados de aprovados.
- [ ] T068 Após autorização vigente/provas anteriores, conferir/publicar fonte revisada/índices e validar matriz real integrada; somente então ajustar disponibilidade/perfis007 em `src/features/cartoes/availability.ts` e `src/domain/finance/operationBudget.ts`, registrando G3/hash/runId/rollback em `specs/007-compras-cartao-parceladas/deployment-review.md`.
- [ ] T069 Atualizar limites/recuperação/status comprovado em `README.md`, `specs/007-compras-cartao-parceladas/quickstart.md`, `specs/007-compras-cartao-parceladas/validation.md` e `specs/007-compras-cartao-parceladas/tasks.md`, mantendo abertas tarefas não executadas e sem alegar entrega completa com bloqueio obrigatório.

## Dependencies & Execution Order

### Phase Dependencies

1. Setup: T001 → (T002 e T003) → T004.
2. Fundação: T005 → T006 → T007 fecha G0; T008 → T009 → T010 seleciona/reconcilia candidato; ambos convergem em T011 → T012 → T013 → T014 (G1/G2) → T015 → T016 → T017. Preparar pesquisa antes de G0 terminar é possível com coordenação, mas não editar fonte compartilhada em paralelo.
3. US1: após T017, T018/T019/T020 antes do código; depois T021 → T022 → T023 → T024 → T025 → T026 → T027 → T028 → T029 → T030. Testes de estado de T028 podem ser preparados antes do formulário, preservando a integração finalT029.
4. US2: após T030, T031/T032 → T033 → T034 → T035 → T036 → T037 → T038 → T039.
5. US3: após T039, T040/T041/T042 → T043 → T044 → T045 → T046 → T047 → T048 → T049 → T050 → T051.
6. US4: após T051, T052/T053 → T054 → T055 → T056 → T057 → T058 → T059 → T060 → T061 → T062.
7. Consolidação: T063 → T064 → (T065 e T066) → T067 → T068 → T069. Correção encontrada exige reexecutar verificações afetadas e regressão relevante antes do release.

### User Story Dependencies

```text
Setup → G0 + desenho/prova G1/G2 → contratos/perfis → US1 → US2 → US3 → US4 → G3
```

A ordem reflete arquivos compartilhados e garantias financeiras. Cada história tem roteiro independente com dados preexistentes após o núcleo necessário; isso não elimina dependência de implementação. US1 já exige replay básico e compromisso integral; US2 amplia recuperação/concorrência. US4 é demonstrável com fixture sem passar pela UI de edição.

### Parallel Opportunities

- Setup: T002/T003 após T001, arquivos distintos.
- US1: T018/T019/T020 após fundação, testes de domínio/contrato/integração em arquivos distintos.
- US2: T031/T032 apósUS1, adaptador e sessão/hook separados.
- US3: T040/T041/T042 apósUS2, domínio/casos oficiais/adaptador separados.
- US4: T052/T053 apósUS3, consultas/apresentação separados.
- Consolidação: T065/T066 apósT064, evidências UI/medição separadas. Não medir fluxo sob alteração: correção em T065 invalida medição de fluxo afetado, que deve ser repetida.

## Parallel Example: User Story 1

Após T017, preparar T018 em `src/domain/finance/compras.test.ts`, T019 em `src/domain/finance/contracts/compras.contract.test.ts` e T020 em `tests/integration/compras.integration.test.ts` juntos; integrar antes de T021. Preparação de teste remoto não autoriza execução sem pré-requisitos.

## Parallel Example: User Story 2

Após T030, T031 em `src/infrastructure/firebase/comprasRecovery.test.ts` e T032 em `src/app/session/comprasSession.test.ts`/`src/features/compras/useCompraIntent.test.ts` não disputam arquivos. Serializar alterações posteriores de adaptador/estado.

## Parallel Example: User Story 3

Após T039, T040 em `src/domain/finance/comprasEdicao.test.ts`, T041 em `specs/007-compras-cartao-parceladas/rules-edicao-cases.json` e T042 em `src/infrastructure/firebase/comprasEdicao.test.ts` podem ser preparados juntos. Fonte integral de Rules continua com único responsável por vez.

## Parallel Example: User Story 4

Após T051, T052 em `src/infrastructure/firebase/comprasQueries.test.ts` e T053 em `src/features/compras/comprasConsulta.test.ts` são independentes. Produção de consultas/snapshot/UI segue T054–T060 para preservar completude.

## Implementation Strategy

### MVP First

Primeiro marco: fundação e US1, incluindo compra parcelada real e1/1 sem caixa. MVP recomendado para uso contínuo: **US1 + US2**, com prévia/primeira fatura e recuperação após falha/recarga. Não apresentar1/1 como MVP de parcelamento nem liberar sem isolamento/idempotência. Entrega incremental exige todos os critérios de G3 aplicáveis à fatia; T030 não substitui autorização, fonte/índices ativos e validação da fatia.

### Incremental Delivery

1. Resolver G0/G1/G2 sem ampliar escopo. Sem desenho viável, registrar impasse e manter dependentes bloqueadas.
2. US1 criação/prévia e US2 recuperação/duas abas; validar cada roteiro e o conjunto.
3. US3 alterações elegíveis/histórico/bloqueios; US4 consulta/categorias/navegação entre anos.
4. Medição assistida e consolidação. G3 libera somente capacidades comprovadas, sem antecipar fluxo futuro.

### Rastreabilidade

| Requisitos | Tarefas principais |
| --- | --- |
| FR-001–006 | T015,T018,T021–T025,T027–T030 |
| FR-007–010 | T016,T018,T021–T026,T047,T053–T059 |
| FR-011–016 | T008–T019,T024–T026,T031–T039,T052–T055 |
| FR-017–022 | T011–T014,T022,T025,T040–T051 |
| FR-023–025 | T036,T052–T062,T065–T066 |
| FR-026–028 | T002–T017,T020,T030–T032,T038–T042,T045,T050–T051,T061–T069 |
| SC-001/008 | T065–T067 |
| SC-002/003 | T018–T026,T030–T039,T040,T050,T067 |
| SC-004/005 | T040–T051,T053–T062,T067 |
| SC-006/007 | T014,T031–T039,T052–T062,T065,T067–T068 |

## Notes

Esta geração cria somente tasks.md, sem resolver G0/G1, alterar código/Rules, executar deploy/migração ou testes de implementação. Não inferir autorização de operações externas pela existência de tarefa futura. Ausência de extensions.yml: sem hooks before_tasks/after_tasks.
