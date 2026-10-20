# Tasks: Pagamentos e ajustes de faturas

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), contratos em `contracts/` e [quickstart.md](quickstart.md).

**Prerequisites**: Constituição1.2.0 e features002–007. G0 passa avaliação oficial/publicação/SDK; G1/G2 permanecem ERROR. Esta lista não resolve gates, autoriza deploy/migração ou habilita pagamentos. Caminhos novos são alvos futuros.

**Tests**: Incluídos por FR-024, SC-001–007 e constituição. Preparar testes antes do comportamento correspondente e verificar que detectam sua ausência; sem emuladores. Execução remota exige projeto/fonte/autorização conferidos. Todas as caixas começam abertas, mesmo quando reutilizam trabalho anterior até verificar sua evidência.

**Organization**: Setup → fundação/gates → cinco histórias P1 → consolidação. US5 amplia falhas e recuperação; proteção contra repetição/concorrência e autorização são obrigatórias desde US1.

## Format: `[ID] [P?] [Story] Description`

`[P]` indica arquivos distintos paralelizáveis após pré-requisitos da fase; não instrui criar agentes. Mudanças em domínio, Rules, adaptador ou integração compartilhados são serializadas. Labels US1–US5 correspondem à spec.

## Path Conventions

Caminhos relativos à raiz `C:/Projetos/LilicaFinancy`. Evidência008 em `specs/008-pagamentos-ajustes-faturas/validation.md`; consertos006/007 atualizam seus registros próprios. Não reinicializar stack nem acrescentar backend financeiro.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar baseline e harness sem alterar finanças reais.

- [X] T001 Registrar checkout/lock, availability/perfis e G0–G3 em `specs/008-pagamentos-ajustes-faturas/validation.md`, conferindo `src/features/cartoes/availability.ts`, `src/domain/finance/operationBudget.ts` e evidências006/007 sem promover perfis.
- [X] T002 [P] Após T001, adicionar grupo fechado liquidacoesFaturas, papéis A/B/ADMIN/PENDING/visitante e recusa de projeto/grupo incorreto em `tests/integration/support/environment.ts`, `tests/integration/support/preflight.ts`, `tests/integration/support/liquidacoesFaturasEnvironment.test.ts` e `vitest.integration.config.ts`, sem conexão nos testes de configuração.
- [X] T003 [P] Após T001, estender inventário008 e limpeza delimitada em `tests/integration/support/manifest.ts`, `tests/integration/support/cleanup.ts` e `tests/integration/support/liquidacoesFaturasManifest.test.ts`, incluindo eventos/controles e negando exclusão automática/global ou remoção de travas compartilhadas.
- [X] T004 Após T002/T003, criar construtores fictícios em `tests/integration/support/liquidacoesFaturasFixtures.ts` e atualizar `specs/008-pagamentos-ajustes-faturas/quickstart.md` com grupo, autorização, fonte/projeto e manifesto antes de enviar.

**Checkpoint**: Harness preparado; nenhuma escrita real ou release promovido.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Resolver viabilidade, contrato executável e fundação comum antes das histórias.

**CRITICAL**: T005–T011 são prova/refatoração com release bloqueado. Se não houver solução dentro dos limites, registrar ERROR, manter dependentes abertas e interromper avanço funcional. Não substituir parcelamento por1/1, presumir cache, remover proteção ou usar backend. A base funcional007 (compra/cronograma e leitura persistidos) é dependência externa de T015/T019 e histórias: acompanhar `specs/007-compras-cartao-parceladas/tasks.md`, sem recriá-la parcialmente ou marcar seus itens por inferência.

- [X] T005 Retomar conserto G0 das tarefas T006/T007 da007 em `firestore.rules`, reutilizando `specs/006-cartoes-ciclos-faturas/rules-evaluation-cases.json` e `scripts/build-invoice-rules-cases.mjs`; reduzir expressões preservando calendário/vizinhança/reciprocidade/perfil e fonte completa, com release negado até prova.
- [X] T006 Avaliar oficialmente fonte G0 conforme autorização reconhecida para ação/destino e registrar positivos/negativos/contagens em `specs/006-cartoes-ciclos-faturas/validation.md` e `specs/008-pagamentos-ajustes-faturas/validation.md`; compilação ou negação por estouro não encerra G0, e avaliação não autoriza publicação.
- [ ] T007 Resolver grafo G1 com N>=2 e criar/editar/cancelar007 em `specs/007-compras-cartao-parceladas/contracts/security.md` e `specs/008-pagamentos-ajustes-faturas/contracts/security.md`, incluindo controles008, primeiro uso e cinco etiquetas sem cache; reutilizar trabalho007 sem desenho incompatível.
- [ ] T008 Criar vetores de inicialização/transição em `specs/008-pagamentos-ajustes-faturas/rules-evaluation-cases.json`, provando zero só na criação válida, delta integral do cronograma, histórico monotônico e negação de legado sem controle/caminho antigo007.
- [ ] T009 Fechar orçamento G2 por comando em `specs/008-pagamentos-ajustes-faturas/contracts/security.md`, incluindo K/compensação desde criação dos ajustes, categoria/conta/travas, leituras transacionais e múltiplos itens/pagamentos/inclusão tardia parcelada; provar18/8/32/bytes/1000 ou manter ERROR, sem promover a tabela mínima.
- [ ] T010 Reconciliar candidato viável com `specs/008-pagamentos-ajustes-faturas/plan.md`, `specs/008-pagamentos-ajustes-faturas/data-model.md`, `specs/008-pagamentos-ajustes-faturas/contracts/commands.md` e `specs/008-pagamentos-ajustes-faturas/tasks.md`, preservando decisões A/A, requisitos e IDs; mudança funcional exige decisão explícita.
- [ ] T011 Criar `scripts/evaluate-liquidacoes-faturas-rules.mts` e avaliar candidato integral006/007/008 com T008, registrando hash/contagens/positivos/negativos em `specs/008-pagamentos-ajustes-faturas/validation.md`; sem deploy automático e sem fechar G1/G2 se nenhum caso central composto aceita.
- [ ] T012 Definir DTOs/variantes fechadas, revisões, IDs/descritores canônicos, resultados/no-ops e erros em `src/domain/finance/contracts/liquidacoesFaturas.ts`, `src/domain/finance/contracts/commands.ts` e `src/domain/finance/errors.ts`, preservando005 e alvo de pagamento exclusivo da fatura.
- [ ] T013 Implementar modelos/validadores comuns e testes em `src/infrastructure/firebase/liquidacoesFaturasMapper.ts` e `src/infrastructure/firebase/liquidacoesFaturasMapper.test.ts`, verificando schema/IDs/limites/índices derivados exatos e recusando campos extras/controle desconhecido.
- [ ] T014 Implementar snapshot e consultas básicas em `src/infrastructure/firebase/liquidacoesFaturasSnapshotReader.ts` e `src/infrastructure/firebase/liquidacoesFaturasQueries.ts`, reutilizando readTime autenticado005, UID/generation, página1–50 e total incompleto não definitivo, sem varredura ilimitada.
- [ ] T015 Após comprovar base007 requerida, adaptar escritores e inicialização008 em `src/infrastructure/firebase/comprasRepository.ts`, `src/infrastructure/firebase/faturasRepository.ts`, `src/infrastructure/firebase/faturasMapper.ts` e `src/infrastructure/firebase/cadastrosRepository.ts`, exigindo schema2 e deltas/versões recíprocos em criação/edição/cancelamento/vencimento, sem caminho antigo que ignore controles.
- [ ] T016 Criar auditoria somente leitura e teste de reconstrução inicial em `scripts/audit-liquidacoes-faturas.mts` e `src/domain/finance/liquidacoesFaturasAudit.test.ts`, gerando manifesto/divergências de legado e bloqueando escrita sem integridade; sem reparo ou backfill automático.
- [ ] T017 Consolidar fonte completa `firestore.rules` com ramos comprovados e vetores G0–G2, preservando002/004/005/cartões006, leitura ausente, reciprocidade, primeiro uso e dia remoto; manter release008 indisponível até implantação verificada.
- [ ] T018 Entregar `firestore.indexes.json` completo, `docs/firestore-rules-changes.md` e `specs/008-pagamentos-ajustes-faturas/deployment-review.md`, preservando índices/isenções e documentando consultas, versão, backup/rollback compatível e migração separada.
- [ ] T019 Confirmar G0–G2 e base007 integrados em `specs/008-pagamentos-ajustes-faturas/validation.md`; sob autorização vigente, implantar/verificar candidato aprovado com backups/índices READY e smoke em `tests/integration/liquidacoesFaturasGates.integration.test.ts`, mantendo UI/perfis de uso008 bloqueados até história validada; sem prova/autorização manter tarefa aberta.

**Checkpoint**: T019 completo permite histórias e integração no ambiente validado; não é release008 nem autorização de migração. Recibo, versões, limites e isolamento não são melhorias adiadas à US5.

## Phase 3: User Story 1 - Pagar a fatura e conferir o caixa (Priority: P1) — MVP

**Goal**: Integral/parcial com conta/data, pendência e caixa sem dupla despesa. FR-001–003/018–023; SC-001–003/007.

**Independent Test**: Fatura1000, pagar400 e600 em contas/datas distintas; pendente600→0, caixa400/600, consumo/compromisso sem duplicação e nenhuma parcela marcada como paga. Excesso600,01 sobre600 falha integralmente.

### Tests for User Story 1

- [ ] T020 [P] [US1] Escrever casos de parcial/integral/centavo/excesso, contas/datas e pagamento antecipado em `src/domain/finance/liquidacoesFaturas.test.ts`, incluindo cartão arquivado e ausência de quitação individual.
- [ ] T021 [P] [US1] Escrever contratos de IDs/recibo/replay e 400+400 concorrentes sobre600 em `src/domain/finance/contracts/liquidacoesFaturas.contract.test.ts`, recusando chave divergente e efeitos parciais.

### Implementation for User Story 1

- [ ] T022 [US1] Implementar resumo/validação pura008 em `src/domain/finance/liquidacoesFaturas.ts` e integração com `src/domain/finance/settlement.ts`, exigindo revisão normal, pendência atual e controle íntegro, sem SDK/relógio implícito.
- [ ] T023 [US1] Implementar pagarFatura/replay básico em `src/infrastructure/firebase/liquidacoesFaturasRepository.ts`, criando G/R/B e primeiro uso de conta juntos, IDs prévios, leituras antes de escritas e versão esperada fixa nos retries.
- [ ] T024 [US1] Integrar fatos008 em `src/domain/finance/projections.ts` e `src/domain/finance/projections.test.ts`, contando pagamento só no caixa e mantendo compromisso/consumo originais e pendência na fatura.
- [ ] T025 [US1] Criar formulário acessível em `src/features/cartoes/PagamentoFaturaForm.tsx` e testes em `src/features/cartoes/PagamentoFaturaForm.test.tsx`, com conta/data/valor/prévia e sem recalcular integral silenciosamente após conflito.
- [ ] T026 [US1] Integrar estado/hook e detalhe em `src/features/cartoes/liquidacoesFaturasState.ts`, `src/features/cartoes/useLiquidacoesFaturas.ts`, `src/features/cartoes/FaturaDetailPage.tsx` e `src/features/cartoes/FaturaSummary.tsx`, distinguindo envio/confirmação/erro e pagamentos dos itens.
- [ ] T027 [US1] Adicionar testes reais de parcial/integral, conta inválida, revisão ativa e pagamento direto de parcela negado em `tests/integration/liquidacoesFaturasPagamentos.integration.test.ts`, inventariando fixtures e reconstruindo controles.
- [ ] T028 [US1] Executar T027/regressão local contra fonte ativa autorizada, registrar em `specs/008-pagamentos-ajustes-faturas/validation.md` e promover só pagarFatura comprovado em `src/domain/finance/operationBudget.ts`, sem liberar outras variantes ou declarar008 completa.

**Checkpoint**: US1 testável com fixtures; replay/concorrência básicos comprovados. Incremento demonstrável sujeito à publicação/aceitação.

## Phase 4: User Story 2 - Entender atraso e encargos (Priority: P1)

**Goal**: Separar ciclo/liquidação/atraso e registrar encargos conhecidos manualmente. FR-004–005/022–023; SC-001/005.

**Independent Test**: Vencimento17/10 consultado em17/18, fatura zerada por ajuste/sem itens; encargo25 em fatura paga cria pendência25 sem caixa ou cálculo automático.

### Tests for User Story 2

- [ ] T029 [P] [US2] Escrever casos de vencimento hoje/ontem, saldo zero, sem lançamentos e fechamento/vencimento coincidentes em `src/domain/finance/faturaSituacao.test.ts`, com data/fuso explícitos e nenhuma inferência de pagamento.
- [ ] T030 [P] [US2] Escrever contrato de encargo manual/categoria/data/motivo e controle para compensação futura em `src/domain/finance/contracts/encargosFatura.contract.test.ts`, recusando cálculo automático e duplicação por replay.

### Implementation for User Story 2

- [ ] T031 [US2] Implementar situação derivada/encargo em `src/domain/finance/faturaSituacao.ts` e `src/domain/finance/liquidacoesFaturas.ts`, distinguindo zero sem pagamento, parcial, pago e atraso sem alterar ciclo.
- [ ] T032 [US2] Implementar registrarEncargo em `src/infrastructure/firebase/liquidacoesFaturasRepository.ts`, criando item/J/K/evento e delta da fatura conforme perfil comprovado, com categoria ativa/trava e nenhum caixa.
- [ ] T033 [US2] Integrar consumo/planejamento de encargo uma vez em `src/domain/finance/projections.ts` e testes em `src/domain/finance/encargosProjection.test.ts`, sem somar item e registro documental duas vezes.
- [ ] T034 [US2] Criar `src/features/cartoes/EncargoFaturaForm.tsx` e integrar `src/features/cartoes/FaturaSummary.tsx` e `src/features/cartoes/FaturaDetailPage.tsx`, com encargos separados, campos obrigatórios e estados distintos de saldo/ciclo/atraso.
- [ ] T035 [US2] Executar casos reais/de interface em `tests/integration/liquidacoesFaturasEncargos.integration.test.ts` e registrar em `specs/008-pagamentos-ajustes-faturas/validation.md`, provando encargo pós-pagamento, zero caixa imediato, categoria inválida e ausência de juros automáticos antes de promover seu perfil.

**Checkpoint**: Encargos/atraso demonstráveis com fixtures, sem depender da interface de correção/reembolso.

## Phase 5: User Story 3 - Corrigir preservando os fatos (Priority: P1)

**Goal**: Revisão explícita sem histórico, reversão integral de erro, ajustes/classificação/compensação e inclusão tardia preservando originais. FR-006–011/025 e018–023; SC-001–004.

**Independent Test**: Reabrir/encerrar fechada nunca paga; reverter erro400 na conta/data originais; corrigir100→80 no mês original; incluir compra200 em fechada1000 paga resulta exigível1200/pendente200 sem caixa novo.

### Tests for User Story 3

- [ ] T036 [P] [US3] Escrever contratos de revisão persistente, histórico revertido, pagamento durante revisão e reversão integral na conta/data originais em `src/domain/finance/contracts/correcaoFaturas.contract.test.ts`, incluindo negação após reembolso parcial.
- [ ] T037 [P] [US3] Escrever casos de erro monetário/classificação no mês original e compensação cumulativa em `src/domain/finance/correcaoFaturas.test.ts`, sem tratar erro como devolução ou criar caixa.
- [ ] T038 [P] [US3] Escrever casos de inclusão tardia1/1/N>=2, destinos protegidos, cartão arquivado e aumento não duplicado em `src/domain/finance/compraEsquecida.test.ts`, preservando pagamentos anteriores.

### Implementation for User Story 3

- [ ] T039 [US3] Implementar overlay/reabrir/encerrar em `src/domain/finance/faturas.ts` e `src/domain/finance/liquidacoesFaturas.ts`, conservando snapshots, revisão após recarga e bloqueio por qualquer histórico.
- [ ] T040 [US3] Implementar reversão integral tipada008 em `src/domain/finance/settlement.ts` e `src/domain/finance/liquidacoesFaturas.ts`, exigindo capacidade intocada e conta/data herdadas, com regressão005 e sem reversão parcial/de reversão.
- [ ] T041 [US3] Implementar ajustes de valor/classificação/compensação em `src/domain/finance/correcaoFaturas.ts`, coordenando J/K/exigível, devoluções anteriores e competência original; compensação não desfaz pagamento/reembolso nem libera edição comum.
- [ ] T042 [US3] Integrar erro/reclassificação no consumo original em `src/domain/finance/projections.ts` e testes em `src/domain/finance/correcaoFaturasProjection.test.ts`, preservando estorno real na data econômica e reversão de erro no caixa original.
- [ ] T043 [US3] Implementar reabrir/encerrar/reverter/corrigir/compensar em `src/infrastructure/firebase/liquidacoesFaturasRepository.ts`, exigindo evento/controles/versões recíprocos, referências válidas, antes/depois e commit integral.
- [ ] T044 [US3] Implementar inclusão tardia e edição elegível durante revisão em `src/domain/finance/compras.ts`, `src/domain/finance/contracts/compras.ts` e `src/infrastructure/firebase/comprasRepository.ts`, com cronograma completo/motivo/destinos e sem alterar passado ou criar segundo delta pelo recibo.
- [ ] T045 [US3] Criar revisão/reversão/ajuste em `src/features/cartoes/CorrecaoFaturaForm.tsx` e `src/features/cartoes/FaturaDetailPage.tsx`, mostrando original/corrigido, motivo/impacto, bloqueios, encerramento explícito e navegação ao pagamento/item.
- [ ] T046 [US3] Integrar inclusão tardia em `src/features/compras/CompraForm.tsx` e `src/features/compras/CompraPreview.tsx`, reaproveitando007 e exigindo conferência de todos os destinos, sem contornar arquivamento ou validar só primeira fatura.
- [ ] T047 [US3] Executar matriz real de revisão/reversão/ajuste/classificação/compensação/inclusão em `tests/integration/liquidacoesFaturasCorrecoes.integration.test.ts`, incluindo concorrência com pagamento e escrita direta tentando sobrescrever/excluir originais.
- [ ] T048 [US3] Registrar decisões A/A/evidências em `specs/008-pagamentos-ajustes-faturas/validation.md` e promover só perfis de correção comprovados em `src/domain/finance/operationBudget.ts`, mantendo variantes não demonstradas negadas e histórico consultável.

**Checkpoint**: Correções são imutáveis; reversão não limpa histórico e inclusão tardia não libera edição livre.

## Phase 6: User Story 4 - Registrar devolução sem inventar crédito (Priority: P1)

**Goal**: Distinguir cancelamento/erro/estorno/devolução real com distribuição explícita e capacidade protegida. FR-012–017/022–023; SC-001–004.

**Independent Test**: Estorno200 em pendente500 resulta300 sem caixa; reembolso200 de fatura1000 paga resulta exigível/liquidado800, pendente0, entrada200 e uma redução de consumo. Crédito não suportado bloqueia tudo.

### Tests for User Story 4

- [ ] T049 [P] [US4] Escrever contratos de destinos/datas/capacidades/somas por fatura em `src/domain/finance/contracts/devolucaoFaturas.contract.test.ts`, recusando item cancelado, distribuição inválida e saldo credor.
- [ ] T050 [P] [US4] Escrever casos de devolução parcial/sucessiva/parcelada e conta distinta em `src/domain/finance/devolucaoFaturas.test.ts`, incluindo capacidade compartilhada com reversão, valor corrigido do item e estado final não negativo.

### Implementation for User Story 4

- [ ] T051 [US4] Discriminar fatos de reembolso/reversão em `src/domain/finance/settlement.ts` e `src/domain/finance/contracts/commands.ts`, permitindo conta diferente só no reembolso real, preservando alvo fatura e regressão005.
- [ ] T052 [US4] Implementar planejamento puro de estorno/reembolso em `src/domain/finance/devolucaoFaturas.ts`, exigindo itens/pagamentos/distribuições e somas exatas por fatura, sem inferir parcelas pagas ou converter excesso em crédito.
- [ ] T053 [US4] Implementar abatimento/reembolso em `src/infrastructure/firebase/liquidacoesFaturasRepository.ts`, coordenando G/J/B/K/eventos, conta destino/trava e redução igual de exigível/liquidado por fatura no mesmo commit.
- [ ] T054 [US4] Integrar estorno no mês de efeito e reembolso na data real em `src/domain/finance/projections.ts` e testes em `src/domain/finance/devolucaoFaturasProjection.test.ts`, sem alterar mês original ou somar cabeçalho e distribuição duas vezes.
- [ ] T055 [US4] Implementar caixa composto e histórico em `src/infrastructure/firebase/liquidacoesFaturasQueries.ts` e `src/infrastructure/firebase/liquidacoesFaturasQueries.test.ts`, consultando datas do mês, deduplicando eventos e filtrando cada fato pela data no mesmo readTime.
- [ ] T056 [US4] Criar formulário/testes em `src/features/cartoes/DevolucaoCompraForm.tsx` e `src/features/cartoes/DevolucaoCompraForm.test.tsx`, com itens/valores/destino/datas/pagamentos, prévia e bloqueio explicado sem truncar/escolher outro destino.
- [ ] T057 [US4] Integrar intenções e navegação em `src/features/cartoes/FaturaDetailPage.tsx` e `src/features/compras/CompraDetailPage.tsx`, mantendo cancelamento elegível007 sem simular devolução/estorno ou cancelar futuras silenciosamente.
- [ ] T058 [US4] Testar primeiro uso e controles/originais conflitantes em `src/infrastructure/firebase/liquidacoesFaturasDevolucao.test.ts`, incluindo falha pós-commit e retry sem segundo abatimento/entrada.
- [ ] T059 [US4] Executar matriz real fatura/conta/parcelada/crédito bloqueado em `tests/integration/liquidacoesFaturasDevolucoes.integration.test.ts`, com inversão dupla/soma divergente pelo proprietário e positivos de conta distinta aceitos.
- [ ] T060 [US4] Registrar reconciliação/orçamento dos perfis aceitos em `specs/008-pagamentos-ajustes-faturas/validation.md` e `src/domain/finance/operationBudget.ts`, sem promover composto pelo caso simples ou declarar todos os centrais rejeitados como entrega.

**Checkpoint**: Devoluções suportadas reconciliam as três bases; crédito/inversão não suportados bloqueiam com explicação.

## Phase 7: User Story 5 - Recuperar operações e evitar disputas (Priority: P1)

**Goal**: Ampliar recuperação/ataques/reconstrução/sessão sobre tipos já protegidos desde fundação. FR-018–024; SC-002–004/007.

**Independent Test**: Perder confirmação e recuperar mesmos IDs; disputar pagamento/ajuste/revisão e reversão/reembolso com intenções distintas; nenhum excesso, inversão duplicada, órfão ou dado da sessão anterior.

### Tests for User Story 5

- [ ] T061 [P] [US5] Escrever casos de retry, perda pós-commit, payload divergente e capacidade disputada em `src/infrastructure/firebase/liquidacoesFaturasRecovery.test.ts`, incluindo referências arquivadas depois e IDs estáveis.
- [ ] T062 [P] [US5] Escrever testes de descritor/refresh/logout/UID/generation/respostas tardias em `src/app/session/liquidacoesFaturasSession.test.ts` e `src/features/cartoes/liquidacoesFaturasState.test.ts`, sem reenvio sob novo usuário ou conteúdo financeiro em logs.

### Implementation for User Story 5

- [ ] T063 [US5] Completar consulta por comando/descritor e retomada em `src/infrastructure/firebase/liquidacoesFaturasRepository.ts`, resolvendo recibo antes de referências atuais e distinguindo ausenteConfirmado/indeterminado, sem nova chave automática, retry cego de permissão ou UI no callback.
- [ ] T064 [US5] Integrar retenção mínima/limpeza de sessão em `src/app/session/financeSession.ts` e `src/features/cartoes/liquidacoesFaturasState.ts`, bloqueando intenção incompatível enquanto confirmação anterior for indeterminada e descartando resposta tardia.
- [ ] T065 [US5] Completar auditoria/reconstrução em `src/domain/finance/liquidacoesFaturasAudit.ts` e `src/domain/finance/liquidacoesFaturasAudit.test.ts`, conferindo cadeia, exigível/liquidado/histórico/capacidades J/B/K e bloqueando divergência sem autorreparo.
- [ ] T066 [US5] Implementar concorrência entre escritores006/007/008 em `tests/integration/liquidacoesFaturasConcorrencia.integration.test.ts`, incluindo pagamento durante revisão, vencimento/compra durante pagamento, duas devoluções e reversão contra reembolso.
- [ ] T067 [US5] Implementar/executar ataques diretos A/B/ADMIN/PENDING/visitante em `tests/integration/liquidacoesFaturasSeguranca.integration.test.ts`, cobrindo perfil/cutoff, controle/recibo órfão, reset, fato extra, versão/schema/campo inválido, primeiro uso e exclusões negadas.
- [ ] T068 [US5] Validar snapshot/paginação/expiração e reconstrução concorrente em `tests/integration/liquidacoesFaturasLeituras.integration.test.ts`, com quantidade mínima inventariada para ultrapassar página e nenhum total definitivo incompleto.
- [ ] T069 [US5] Consolidar T061–T068 e custos por ramo em `specs/008-pagamentos-ajustes-faturas/validation.md`, distinguindo double/local, avaliação oficial e SDK real; nenhum perfil promovido por evidência de outro tipo.

**Checkpoint**: Falhas/retomadas/disputas têm prova própria; envio pendente não é sucesso.

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Consolidar acessibilidade, arquivos completos, regressão e G3 sem ocultar limitações.

- [ ] T070 Revisar `src/features/cartoes/PagamentoFaturaForm.tsx`, `src/features/cartoes/EncargoFaturaForm.tsx`, `src/features/cartoes/CorrecaoFaturaForm.tsx`, `src/features/cartoes/DevolucaoCompraForm.tsx` e `src/features/cartoes/FaturaDetailPage.tsx` em teclado/celular/desktop, conferindo foco/rótulos, vazio/parcial/erro e recuperação de excesso/conflito/permissão/cota/incerteza.
- [ ] T071 Conferir FR-001–025/SC-001–007 e executar roteiros de `specs/008-pagamentos-ajustes-faturas/quickstart.md`, registrando resultados/casos não executados em `specs/008-pagamentos-ajustes-faturas/validation.md`, sem declarar disponibilidade parcial como conclusão integral.
- [ ] T072 Medir parcial em até2 minutos e distinção de eventos com cinco participantes em `specs/008-pagamentos-ajustes-faturas/validation.md`; exigir quatro de cinco conforme SC-006 ou manter critério pendente, sem substituir pela impressão do implementador.
- [ ] T073 Revisar `firestore.rules`, `firestore.indexes.json`, `docs/firestore-rules-changes.md` e `specs/008-pagamentos-ajustes-faturas/deployment-review.md`, comparando fonte/índices ativos e provas, backups/rollback, sem publicação adicional automática.
- [ ] T074 Executar typecheck/lint/test/build e regressões002–007 aplicáveis conforme `package.json`, registrando em `specs/008-pagamentos-ajustes-faturas/validation.md`; corrigir falhas pertinentes sem atualizar dependências ou alegar testes remotos inexistentes.
- [ ] T075 Encerrar G3 e ativar só ações comprovadas em `src/features/cartoes/availability.ts` e `src/domain/finance/operationBudget.ts`, conferindo cliente/fonte/índices e smoke autorizado; critérios faltantes mantêm entrega parcial explícita e ações correspondentes desabilitadas.
- [ ] T076 Atualizar `README.md`, `specs/008-pagamentos-ajustes-faturas/quickstart.md` e `specs/008-pagamentos-ajustes-faturas/validation.md` com disponibilidade/limites/bases e gerado/publicado/verificado; relatar fixtures restantes e limpeza delimitada só se autorizada e executada, sem limpeza global/automática.

**Checkpoint**: Conclusão exige todos os critérios aplicáveis comprovados. Descrição/teste preparado não encerra tarefa de execução.

## Dependencies & Execution Order

### Phase Dependencies

1. Setup: T001 → T002/T003 paralelos → T004.
2. Provas: T005 → T006 → T007 → T008 → T009 → T010 → T011. Evidência anterior pode ser reutilizada após verificar fonte exata; não repetir upload/publicação sem necessidade/autorização.
3. Fundação executável: T012 → T013 → T014 → T015 → T016 → T017 → T018 → T019. Base007 entregue é requisito externo de T015; seu impedimento mantém dependentes abertas. T016 inicia testes de auditoria; T065 completa o avaliador de todos os fatos.
4. Histórias dependem de T019; sem G0–G2 resolvidos, parar antes de T020.
5. US1 entrega adaptador básico. US2/US3 podem usar fixtures próprias após US1, mas arquivos comuns são editados sequencialmente. US4 depende das capacidades/ajustes de US3. US5 integra disputas de US1–US4; proteção básica não espera essa fase.
6. T070–T076 após histórias; T075 depende de T071–T074 e fonte ativa correspondente às provas. Limpeza nunca é parte automática do encerramento.

### User Story Dependencies

```text
Setup → G0/G1/G2 + fundação + base007 → US1
                                         ├→ US2 ─────────┐
                                         └→ US3 → US4 ──┼→ US5 → consolidação/G3
                                               US1 ─────┘
```

### Within Each User Story

Testes → modelos/contratos → domínio → adaptador → projeções/interface → integração/evidência. Preparação de testes reais pode anteceder executores, mas execução exige código/fonte/índices. Publicação de candidato não promove perfis genericamente. Execução bloqueada não é teste aprovado. APIs do SDK usadas na implementação devem ser verificadas via Context7 conforme AGENTS, sem alterar stack por suposição.

### Parallel Opportunities & Examples

| Escopo | Tarefas paralelas | Condição |
| --- | --- | --- |
| Setup | T002 e T003 | Após T001, arquivos separados. |
| US1 | T020 e T021 | Após fundação; testes de domínio e contrato. |
| US2 | T029 e T030 | Após US1; situação e encargo. |
| US3 | T036, T037 e T038 | Após US1; contrato, ajuste e compra esquecida. |
| US4 | T049 e T050 | Após US3; contrato e domínio de devolução. |
| US5 | T061 e T062 | Após US1–US4; recovery e sessão. |

Exemplos por história: US1 preparar parcial/excesso enquanto prepara replay/versão; US2 testar atraso enquanto define encargo; US3 testar revisão enquanto prepara ajuste monetário e cronograma tardio; US4 testar destino enquanto prepara capacidade cumulativa; US5 testar commit/retry enquanto prepara troca de sessão. Usar os arquivos distintos das tarefas acima; não executar simultaneamente edições do mesmo domínio/repositório/Rules. Marcadores são oportunidades, não autorização automática de agentes.

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar setup, G0/G1/G2, base007 e fonte verificada. Esta lista não transforma plano bloqueado em implementação viável por hipótese.
2. Entregar US1 com400/600, excesso negado, conta/data/recibo, concorrência e caixa sem segunda despesa, como incremento parcial seguro.
3. Antes de disponibilizar o incremento, aplicar ao seu recorte acessibilidade/segurança/documentação/fonte ativa/regressão da fase final; não adiar proteção básica até US5.
4. US1 é MVP demonstrável, não conclusão de correções/reembolsos ou toda008. Rejeitar todos os casos centrais inviáveis não fecha o gate.

### Incremental Delivery

US1 → US2 → US3 → US4 → US5 → consolidação. Validar cada história com fixtures próprias sem depender de outra interface para produzir pré-condição. Em impasse registrar custo/caso concreto e preservar estado seguro; mudança de escopo/modelo exige decisão explícita.

## Requirement Traceability

| Requisitos | Tarefas principais |
| --- | --- |
| FR-001–003 | T012–T019, T020–T028 |
| FR-004–005 | T029–T035 |
| FR-006–008 | T036/T039/T043/T045/T047–T048 |
| FR-009–011 | T037/T040–T043/T045/T047–T048 |
| FR-012–017 | T049–T060; T036/T040 para inversão compartilhada |
| FR-018–021 | T005–T019, proteção desde T021/T023 e consolidação T061–T069 |
| FR-022–023 | T014/T024–T026/T033–T034/T042/T045–T046/T054–T057/T064/T068/T070 |
| FR-024 | T005–T019/T067/T071/T073–T076 |
| FR-025 | T038/T044/T046–T048 |
| SC-001 | T024/T027/T033/T042/T047/T054/T059/T065/T071 |
| SC-002–003 | T021/T027/T047/T049–T050/T058–T059/T061/T066–T069 |
| SC-004 | T037–T048/T057/T065/T071 |
| SC-005 | T029/T031/T035/T071 |
| SC-006 | T025/T070/T072 |
| SC-007 | T019/T067/T069/T071 |

## Notes

Nenhuma tarefa executada por este comando. Spec/decisões preservadas. Não abrir PR, publicar Rules ou alterar dados durante geração de tarefas. Hooks somente quando configurados em .specify/extensions.yml.
