# Tasks: Receitas e despesas externas ao cartão

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/) e [quickstart.md](quickstart.md).

**Prerequisites**: Constituição 1.2.0, autenticação 002, núcleo 003 e cadastros 004. Data de ocorrência da despesa obrigatória, sugerida como hoje e corrigível antes de salvar. Preservar stack/lockfile existentes.

**Tests**: Exigidos por FR-028 e pela constituição: cálculos locais e testes dirigidos de persistência/Rules no projeto real autorizado, sem emuladores. Escrever os casos de cada história antes de sua implementação e demonstrar falha pertinente; testes remotos exigem preflight e Rules realmente publicadas sob autorização vigente. Teste não executado permanece pendente, não aprovado por inferência.

**Organization**: Nove fases: setup, fundação, seis histórias e acabamento. Caminhos relativos à raiz `C:/Projetos/LilicaFinancy`. Documentação de execução/evidências em `specs/005-receitas-despesas-externas/validation.md`, a criar na implementação. Este comando só gera tarefas; nenhum item é marcado concluído.

## Format: `[ID] [P?] [Story] Description`

Todas as tarefas usam checkbox, ID sequencial e caminho concreto. `[P]` indica trabalho em arquivos distintos na mesma janela, após os pré-requisitos indicados; não concede autorização para delegar agentes ou publicar. Labels `[US1]` a `[US6]` aparecem somente nas fases de histórias. Não executar duas tarefas simultaneamente sobre o mesmo arquivo, mesmo de histórias distintas.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Fixar a base, preparar contas/manifestos de teste e registrar os gates, sem criar aplicativo ou dependências novas.

- [X] T001 Registrar baseline de branch real/contexto lógico, versões, scripts, autorização de ambiente e corrupção local em safeId/calendarDate no arquivo `specs/005-receitas-despesas-externas/validation.md`, consultando `package.json`, `firestore.rules` e contratos 002/004; não executar integração/publicação nem expor credenciais nesta auditoria.
- [X] T002 [P] Registrar grupo literal `externos` e preflight de A/B/ADMIN/PENDING mais visitante em `vitest.integration.config.ts`, `tests/integration/support/environment.ts`, `tests/integration/support/preflight.ts` e `tests/integration/support/clients.ts`, com testes em `tests/integration/support/externosEnvironment.test.ts`; reutilizar validação projectId/runId e abortar antes de fixtures em alvo incorreto (após T001).
- [X] T003 [P] Estender allowlist fechada de origens/eventos/marcadores e cadastros schema2 em `tests/integration/support/manifest.ts`, `tests/integration/support/cleanup.ts` e `scripts/cleanup-integration.mts`, testando escopo/runId/UID/IDs em `tests/integration/support/externosManifest.test.ts`; incluir caminho de cada filho, prévia de quantidade e nenhuma exclusão automática (após T001).

**Checkpoint**: Harness reconhece o grupo e inventário, mas não há permissão financeira aberta ou fixture criada automaticamente.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Estabelecer os contratos compartilhados, restaurar a base de segurança e preparar leitura/sessão antes de qualquer história.

**CRITICAL**: Todas as histórias dependem desta fase. Os matches financeiros continuam negados até seus ramos de história estarem implementados e verificados.

- [X] T004 Definir uniões fechadas de origem/evento/fato/marcador, nove comandos, confirmação, descritor, cursor e portas em `src/domain/finance/contracts/externos.ts`; ampliar `src/domain/finance/errors.ts` apenas para excesso/integridade se necessário, usando tipos comuns e limites da 003, sem SDK, UID editável ou caminho livre (após T002–T003).
- [X] T005 [P] Escrever testes de contrato do mapeador em `src/infrastructure/firebase/externosMapper.test.ts` para esquema desconhecido, campos extras, opcionais, datas completas, evento/fato único e projeção não editável; demonstrar falha sem o mapeador concreto (após T004).
- [X] T006 [P] Escrever testes do leitor snapshot em `src/infrastructure/firebase/externosSnapshotReader.test.ts` para T comum, primeira página explícita em T, host/prefixo fixos, batchGet até oito IDs, páginas até50, expiração50min, token ausente/trocado e resposta tardia descartada; não usar credencial administrativa (após T004).
- [X] T007 Restaurar `firestore.rules` integralmente, removendo duplicações que interrompem safeId/calendarDate e preservando permissões 002/004 e deny financeiro; guardar cópia local anterior em `docs/firestore-rules-before-005.rules`, documentar reconstrução em `docs/firestore-rules-changes.md` e obter validação de compilação oficial sem emulador quando houver acesso autorizado; registrar resultado real em `specs/005-receitas-despesas-externas/validation.md`.
- [X] T008 Evoluir categorias/contas para schema2 e mapa usoFinanceiro protegido em `src/domain/finance/contracts/cadastros.ts` e `src/domain/finance/cadastros.ts`, com regressões em `src/domain/finance/cadastros.test.ts`: aceitar legado1/novo2 explicitamente, preservar trava permanente e controles legados, não congelar conta apenas prevista nem migrar no login.
- [X] T009 Adaptar `src/infrastructure/firebase/cadastrosMapper.ts` e `src/infrastructure/firebase/cadastrosRepository.ts`, com seus testes adjacentes, para preservar usoFinanceiro/schema no CRUD e recibos antigos sem expor metadados ao formulário; manter versão/conteúdo/instantes cadastrais intactos no patch de primeiro uso (após T008).
- [X] T010 Incorporar esquema2 e helpers restritos de primeiro uso em `firestore.rules`, mantendo escrita financeira ainda negada: proibir remoção/substituição da trava, mudança sensível no antes/depois e bypass por recibo cadastral; conservar proteção usoCadastros legado e negar metadado extra/malformado (após T007–T009).
- [X] T011 Expor timezone validado do perfil e geração atual em `src/app/session/SessionProvider.tsx` e `src/app/session/useSession.ts`; testar compatibilidade/logout em `src/app/session/externosSession.test.ts`, sem duplicar autenticação ou alterar cutoff/schema do perfil.
- [X] T012 Implementar mapeamento fechado em `src/infrastructure/firebase/externosMapper.ts`, satisfazendo T005: datas YYYY-MM-DD distintas da competência, evento como único documento do fato/recibo, projeção protegida e tradução explícita para DTOs puros da 003; nenhum segundo pagamento em coleção genérica.
- [X] T013 Implementar `src/infrastructure/firebase/externosSnapshotReader.ts`, satisfazendo T006, com fetch de leitura runQuery/batchGet autorizado por ID token em memória, consulta sentinela limit1 para T, AbortController e verificação de geração; não adicionar escrita REST, contador global ou fallback que afirme total completo sem snapshot.
- [X] T014 Executar regressões locais de cadastros/sessão/mapeadores/leitor com scripts de `package.json` e registrar evidências em `specs/005-receitas-despesas-externas/validation.md`; consolidar plano de migração/rollback e baseline compilável em `docs/firestore-rules-changes.md`, bloqueando histórias se a base de Rules ou compatibilidade schema1/2 falhar.

**Checkpoint**: Fundação validada localmente e base de Rules restaurada; domínios e adaptadores de leitura prontos, sem habilitar antecipadamente todos os comandos financeiros.

## Phase 3: User Story 1 — Registrar e consultar previsões externas (Priority: P1) — MVP

**Goal**: Criar receitas/despesas avulsas privadas e consultar o planejamento mensal sem inventar caixa.

**Independent Test**: Criar receita1000 e despesa100 com competência diferente das datas, recarregar e conferir previsto/pendente e caixa zero; recusar ausência de ocorrência, cada referência inválida e UID alheio.

### Tests for User Story 1

- [X] T015 [P] [US1] Escrever casos de entrada/origem em `src/domain/finance/externos.test.ts`: campos mínimos/opcionais, natureza da categoria, cinco etiquetas, dinheiro, estimativa, competência independente, dataConsumo obrigatória e calendário/fuso, incluindo máximo e centavo residual; demonstrar falha antes de T017.
- [X] T016 [P] [US1] Escrever o bloco de integração de previsões em `tests/integration/externos.integration.test.ts`, com fixtures inventariadas, A/B/ADMIN/PENDING/visitante, get/list diretos, cinco etiquetas e criação repetida; incluir rejeição de referência arquivada, extra field e ausência de ocorrência, sem depender de pagamentos.

### Implementation for User Story 1

- [X] T017 [US1] Implementar criação/normalização/estados iniciais e identidades tipadas em `src/domain/finance/externos.ts`: nove comandos declarados, mas somente criarReceita/criarDespesa habilitados nesta história; preservar valor/competência/datas e validar referência por contexto explícito sem SDK (após T015).
- [X] T018 [US1] Habilitar apenas criação de previsão, evento/recibo recíproco e primeiro uso de categoria em `firestore.rules`, validando perfil, O↔R por versão/ultimoEventoId, C/H/P e cinco etiquetas por ramo; negar exclusão/alteração de evento e escrita auxiliar isolada, sem confiar só em timestamp (após T010, T016–T017).
- [X] T019 [US1] Criar `src/infrastructure/firebase/externosRepository.ts` com criarReceita/criarDespesa e consultarOperacao: chave estável, conteúdo completo versus descritor, preflight não fatal antes da consulta do recibo, callback sem tx.get(origem) nem cadastros em criação, patches protegidos e retorno original mesmo após arquivamento/versão posterior; definir somente o perfil desses ramos em `src/domain/finance/operationBudget.ts` com orçamento14 para criação sem substituição comprovado no desenho e validação final em T024; ramo com substituiOrigemId permanece bloqueado até perfil15 em T041/T045, sem liberar outros comandos (após T012, T017–T018).
- [X] T020 [US1] Implementar consulta de planejamento/detalhe em `src/infrastructure/firebase/externosRepository.ts` usando `src/infrastructure/firebase/externosSnapshotReader.ts`: duas fontes receita/despesa em T, merge data+ID, cursor por fonte, período/UID/geração fixos, cancelados consultáveis e total apenas com todas as páginas/dependências (após T019).
- [X] T021 [P] [US1] Criar `src/features/externos/ExternoForm.tsx` com rótulos, entrada BRL, categoria por natureza, ocorrência obrigatória sugerida hoje no fuso validado, competência e vencimento/data prevista independentes, titular/conta prevista/observação/até cinco etiquetas opcionais; não oferecer ação ainda não implementada (após T017 e T011; pode ocorrer junto a T019–T020).
- [X] T022 [US1] Integrar lista mensal, detalhe inicialmente consultivo e estados de envio/erro/vazio/parcial em `src/features/externos/ExternosPage.tsx` e `src/features/externos/ExternoDetailPage.tsx`, com rotas protegidas em `src/app/router.tsx` e navegação em `src/app/AppShell.tsx`, usando T020–T021 e descartando respostas de geração anterior.
- [X] T023 [US1] Entregar `firestore.indexes.json` completo com índices natureza+competenciaPlanejamento+dataPrevista/vencimento e origemId+resultVersion para eventos, preservando índices anteriores e isenções; isentar comando/antes/depois não consultados e documentar publicação/rollback em `docs/firestore-rules-changes.md` (após T020).
- [X] T024 [US1] Executar os casos T015/T016 e fluxo manual de previsão em `tests/integration/externos.integration.test.ts` e `specs/005-receitas-despesas-externas/quickstart.md`, comprovando grafo de criação sem substituição até14 acessos, ausência de caixa e isolamento; registrar compilação/publicação efetivas e limitações em `specs/005-receitas-despesas-externas/validation.md`, sem declarar MVP remotamente validado se faltar ambiente autorizado.

**Checkpoint**: MVP de previsões demonstrável após fundação + US1 e seus gates. Sem expor botões financeiros futuros ou tratar subtotal como total final.

## Phase 4: User Story 2 — Receber e pagar em partes (Priority: P1)

**Goal**: Confirmar fatos separados limitados à pendência, com data real/conta e situação derivada.

**Independent Test**: Receita1000 recebida600+400 e despesa100 paga40 em outubro +60 em novembro por contas diferentes; previsto original permanece, pendência chega a zero e60,01 sobre pendência60 é recusado.

### Tests for User Story 2

- [ ] T025 [P] [US2] Escrever testes puros de pagamento/recebimento em `src/domain/finance/externosLiquidacao.test.ts` para parcial/integral, data futura, centavo residual, conta inválida/arquivada, estimativa sem quitação e excesso, mantendo casos genéricos da 003 intactos.
- [ ] T026 [P] [US2] Acrescentar casos de parciais e primeiro uso da conta em `tests/integration/externos.integration.test.ts`, cobrindo conta efetiva distinta da prevista arquivada, tentativa direta acima do pendente e alteração simultânea de base/tipo; preparar expectativas negativas antes da habilitação.

### Implementation for User Story 2

- [ ] T027 [US2] Implementar pagar/receber e derivação exata em `src/domain/finance/externos.ts`, usando centavos/calendário da 003 e validando 0<valor<=pendente, data real não futura, conta efetiva e natureza; nenhuma previsão, crédito ou renegociação implícita (após T025 e US1).
- [ ] T028 [US2] Habilitar apenas pagar/receber e primeiro uso de conta em `firestore.rules`: origem+evento/fato único, delta exato, jaLiquidada monotônico, conta efetiva ativa no pós-estado, base congelada e sem revalidação de etiquetas históricas como novos vínculos; manter orçamento máximo8 por comando conforme contrato (após T026–T027).
- [ ] T029 [US2] Implementar transação de liquidação em `src/infrastructure/firebase/externosRepository.ts`: ler recibo e origem antes das escritas, usar expectedVersion fixa, conta em preflight separado, patch sem sobrescrever cadastro e resolução de confirmação perdida com mesma chave; não somar todo histórico na transação (após T028).
- [ ] T030 [US2] Criar `src/features/externos/LiquidacaoForm.tsx` e integrar `src/features/externos/ExternoDetailPage.tsx` com valor sugerido do pendente, data real, conta ativa, origem/saldo visíveis, atraso derivado e situação prevista/parcial/integral; mostrar sucesso apenas após confirmação remota (após T029).
- [ ] T031 [US2] Executar casos T025/T026 e reconstruir resultado40/60 e600/400 com o cliente autenticado em `tests/integration/externos.integration.test.ts`; registrar origem/fatos/contas, proteção de base e ausência de excesso em `specs/005-receitas-despesas-externas/validation.md`, mantendo testes remotos pendentes quando não executáveis.

**Checkpoint**: Liquidações parciais corretas, imutáveis e rastreáveis sem quitação falsa ou ajuste automático do previsto.

## Phase 5: User Story 3 — Registrar gasto imediato consistente (Priority: P1)

**Goal**: Criar obrigação e pagamento integral relacionados em uma confirmação atômica.

**Independent Test**: Registrar35,90 com conta ativa; verificar um compromisso e um fato; injetar falha antes do commit e perda da resposta após commit sem par parcial/duplicado.

### Tests for User Story 3

- [ ] T032 [P] [US3] Escrever testes de contrato do gasto imediato em `src/domain/finance/externosImediato.test.ts` e casos de falha antes/depois do commit em `src/infrastructure/firebase/externosImediato.test.ts`, cobrindo cinco etiquetas e conta prevista distinta, sem inventar segundo pagamento em outra coleção.

### Implementation for User Story 3

- [ ] T033 [US3] Implementar proposta pura de gasto imediato em `src/domain/finance/externos.ts` e variantes estritas em `src/infrastructure/firebase/externosMapper.ts`: origem ativa com liquidado=valor, jaLiquidada=true e exatamente um fato integral no recibo, com contas prevista/efetiva independentes (após T032).
- [ ] T034 [US3] Habilitar ramo gastoImediato em `firestore.rules`, conferindo origem/fato/controles juntos, proibição de sobrescrever origem existente e teto de cinco etiquetas com primeiros usos de categoria/conta; documentar O5+R7+C2+A2+leituraR1=17 sem cache em `docs/firestore-rules-changes.md` (após T033).
- [ ] T035 [US3] Implementar gastoImediato em `src/infrastructure/firebase/externosRepository.ts` e modo correspondente em `src/features/externos/ExternoForm.tsx` e `src/features/externos/ExternosPage.tsx`, sem leitura redundante de origem/cadastros no callback, com uma confirmação e recuperação do mesmo par (após T034).
- [ ] T036 [US3] Validar atomicidade e pior caso sem substituição em `tests/integration/externos.integration.test.ts`, incluindo conta/categoria inéditas, titular, conta prevista distinta, cinco etiquetas, falha/recibo repetido e versão0 sobre origem existente; registrar resultado em `specs/005-receitas-despesas-externas/validation.md` e reservar o caso18 com substituição para T045.

**Checkpoint**: Gasto imediato funciona com as mesmas garantias das liquidações posteriores; origem e pagamento nunca aparentam confirmação parcial.

## Phase 6: User Story 4 — Corrigir, cancelar e reverter erros (Priority: P1)

**Goal**: Corrigir previsões nunca movimentadas e recuperar erros preservando fatos e distinguindo reembolso real.

**Independent Test**: Editar pendente sem histórico, cancelar sem liquidação válida e reverter integralmente pagamento de outubro em novembro; original permanece, pendência reabre e caixa original é neutralizado, sem entrada fictícia em novembro.

### Tests for User Story 4

- [ ] T037 [P] [US4] Escrever transições e casos negativos em `src/domain/finance/externosCorrecao.test.ts`: edição só nunca liquidada, cancelamento com motivo e liquidado0, reversão integral única, inversão de inversão proibida, conta/data herdadas e origem histórica somente substituível explicitamente; incluir semAlteracao na versão atual sem recibo/revisão e repetição após mudança de versão retornando conflito conforme FR-016.
- [ ] T038 [P] [US4] Escrever regressões de neutralização de erro em `src/domain/finance/externosProjection.test.ts`, preservando o comportamento econômico genérico de `src/domain/finance/projections.test.ts`; testar totais brutos zero para original+erro e nenhuma devolução real presumida.

### Implementation for User Story 4

- [ ] T039 [US4] Implementar editarOrigem/cancelarOrigem/reverterPagamento/reverterRecebimento em `src/domain/finance/externos.ts`, incluindo semAlteracao, limites de motivo, jaLiquidada permanente e vínculo substituiOrigemId somente para antiga cancelada da mesma natureza/UID; não transferir fatos entre origens (após T037).
- [ ] T040 [US4] Habilitar ramos de edição/cancelamento/inversão e marcador create-only em `firestore.rules`, validando recibo antes/depois, preservação de referências arquivadas nos mesmos papéis, original/conta/data/valor e reversoesExternas/{eventoOriginalId}; negar delete, reativação e toda reescrita de origem movimentada (após T039).
- [ ] T041 [US4] Implementar transações de correção em `src/infrastructure/firebase/externosRepository.ts`, com recibo primeiro, leitura adicional de original/marcador só na reversão, saldo atual e expectedVersion fixa, além de cancelamento/substituição em etapas recuperáveis pela intenção própria; estender perfis em `src/domain/finance/operationBudget.ts` e testes em `src/domain/finance/operationBudget.test.ts` para criarReceita/criarDespesa com substituiOrigemId, custo15 distinto da criação simples14 e imediato substituto18; semAlteracao não grava recibo e exige versão atual (após T040).
- [ ] T042 [US4] Implementar neutralização em `src/domain/finance/externosProjection.ts`, usando fatos/dependências validados para retirar original e reversão dos totais econômicos na data original sem apagá-los do histórico; integrar os DTOs da 003 explicitamente sem habilitar reembolso/crédito (após T038–T041).
- [ ] T043 [US4] Criar reconstrução verificável em `src/domain/finance/externosAudit.ts` e `src/domain/finance/externosAudit.test.ts`, usando eventos em T, sequência1..version, último evento, marcadores e soma líquida; integrar diagnóstico no repositório, bloqueando integridade divergente sem oferecer reparo cliente ou migração no login (após T041).
- [ ] T044 [US4] Criar `src/features/externos/CorrecaoDialog.tsx` e integrar `src/features/externos/ExternoDetailPage.tsx`/`src/features/externos/ExternoForm.tsx` com motivo/impacto, campos herdados somente leitura, bloqueio de edição histórica e roteiro reverter→cancelar→substituir, exibindo substituição incompleta sem reativar a antiga (após T041–T043).
- [ ] T045 [US4] Executar cenários de edição/cancelamento/duas reversões, conta histórica arquivada, substituição interrompida, criarReceita/criarDespesa substitutas com cinco etiquetas e primeiros usos e gasto imediato com substituiOrigemId em `tests/integration/externos.integration.test.ts`; comprovar perfis14/15/18 sem cache, recusar substituição de antiga ativa/de outra natureza ou UID e conferir caixa original neutralizado, registrando evidências em `specs/005-receitas-despesas-externas/validation.md` (após T044 e US3).

**Checkpoint**: Erro é reversão explícita com histórico intacto; reembolso posterior não é representado por esse fluxo, e cancelamento não quita obrigação.

## Phase 7: User Story 5 — Confirmar em duas abas e sob falhas (Priority: P1)

**Goal**: Comprovar e completar a recuperação de falhas/concorrência sobre os fluxos já seguros desde sua primeira entrega; não adiar segurança das histórias anteriores para esta fase.

**Independent Test**: Duas intenções70 sobre obrigação100 confirmam no máximo uma; repetição da mesma intenção devolve IDs originais, conteúdo diferente conflita e troca de usuário descarta todos os resultados antigos.

### Tests for User Story 5

- [ ] T046 [P] [US5] Escrever testes de contrato de concorrência/retomada em `src/infrastructure/firebase/externosRepository.test.ts`: SDK retry sem novos IDs, recibo antes de validar referências atuais, intenção confirmada após arquivamento, preflight com falha, corrida no primeiro uso e sem retry cego de permission-denied; validar que semAlteracao não reserva chave, não promete recuperação de resposta anterior e exige nova intenção após encerrar.
- [ ] T047 [P] [US5] Escrever testes do estado em `src/features/externos/externoState.test.ts` para descriptor versus comandoCompleto, recarga sem formulário, confirmação indeterminada, duplo clique, geração/UID trocados e respostas atrasadas, sem persistir valor/conta/motivo/token no descritor; confirmar remoção do descritor após semAlteracao e geração de nova chave para intenção posterior.

### Implementation for User Story 5

- [ ] T048 [US5] Completar recuperação dirigida em `src/infrastructure/firebase/externosRepository.ts`, satisfazendo T046: consultar recibo antes de rejeitar por preflight, no máximo uma repetição após mudança concreta de primeiro uso, manter chave/payload/expectedVersion, mapear erros acionáveis e nunca confirmar sobra com valor ajustado silenciosamente.
- [ ] T049 [US5] Implementar `src/features/externos/externoState.ts` e integrar `src/app/session/SessionProvider.tsx`, `src/features/externos/ExternosPage.tsx` e `src/features/externos/ExternoDetailPage.tsx`, satisfazendo T047: descritor mínimo em sessionStorage, conteúdo só em memória, limpeza na invalidação/logout, encerramento/remoção de descritor após semAlteracao e confirmação sem reenvio automático após recarga.
- [ ] T050 [US5] Completar ataques de escrita direta em `tests/integration/externos.integration.test.ts` conforme contracts/security.md: O/R isolados, evento reutilizado, múltiplos fatos por delta, campos/projeção adulterados, travas removidas/substituídas, data/conta/original cruzados e cadastro arquivado/alterado no mesmo lote.
- [ ] T051 [US5] Consolidar perfis remotos progressivamente entregues nos comandos005 em `src/domain/finance/operationBudget.ts` e `src/domain/finance/operationBudget.test.ts`, condicionados às provas dos ramos e limites de bytes/expressões; atualizar inventário de chamadas em `docs/firestore-rules-changes.md`, mantendo simulacao/séries003 sem autorização remota implícita e qualquer ramo inviável desabilitado.
- [ ] T052 [US5] Executar disputas70+70, pagar versus editar/cancelar, duplo estorno, repetição simultânea, perda real de resposta após commit e negações A/B/ADMIN/PENDING/visitante em `tests/integration/externos.integration.test.ts`; registrar grafo final <=8 por escrita/<=18 por comando e testes efetivos em `specs/005-receitas-despesas-externas/validation.md`, sem substituir prova remota por double.

**Checkpoint**: Operações resistem a duas abas, escrita direta e confirmação perdida; todos os casos de sucesso apontam fatos/recibos originais e nenhum dado atravessa sessão.

## Phase 8: User Story 6 — Conferir planejamento e caixa mensal (Priority: P2)

**Goal**: Consolidar bases, filtros e caixa mensal sem duplicação ou mistura de snapshots.

**Independent Test**: Despesa de competência outubro paga em novembro continua no compromisso de outubro e só sai no caixa de novembro; receita espelhada tem o mesmo comportamento. Paginação com alteração concorrente permanece em T e só Atualizar apresenta o novo estado.

### Tests for User Story 6

- [ ] T053 [P] [US6] Acrescentar casos mensais em `src/domain/finance/externosProjection.test.ts`: previsto integral mesmo pago, posição atual rotulada, filtros, cancelados, mês vazio, dezembro/janeiro, último mês9999-12 e dependências que não somam como itens.
- [ ] T054 [P] [US6] Escrever testes de consultas combinadas em `src/infrastructure/firebase/externosQueries.test.ts`, cobrindo duas fontes/cursors,51 itens, marcadores/originais hidratados, token/índice indisponível e T expirado; provar que toda página/dependência usa o mesmo snapshot e total incompleto nunca é definitivo.

### Implementation for User Story 6

- [ ] T055 [US6] Completar funções de planejamento/caixa e filtros em `src/domain/finance/externosProjection.ts`, satisfazendo T053, com somas exatas e resultado superávit/déficit sem chamar resultado de saldo disponível, sem duplicar origem/compromisso ou original/dependência.
- [ ] T056 [US6] Implementar caixa mensal e hidratação pontual em `src/infrastructure/firebase/externosRepository.ts`/`src/infrastructure/firebase/externosSnapshotReader.ts`, usando fato.dataEfetiva, intervalos canônicos, T comum, até oito gets por batch e marcadores/originais, além de índice correspondente em `firestore.indexes.json`; manter filtros locais sobre recorte completo e sem listener histórico (após T054–T055).
- [ ] T057 [US6] Completar seleção de base/mês/natureza/situação/categoria/titular, totais/instante de consulta/Atualizar e histórico parcial em `src/features/externos/ExternosPage.tsx` e `src/features/externos/ExternoDetailPage.tsx`, invalidando snapshots na escrita/foco/expiração e preservando compromisso pago nos totais (após T056).
- [ ] T058 [US6] Executar snapshot paginado com51 origens fictícias inventariadas, inserção/mudança entre páginas e reversão concorrente em `tests/integration/externos.integration.test.ts`; validar autorização REST e estabilidade de T contra estado atualizado, registrando custo/limitações em `specs/005-receitas-despesas-externas/validation.md` sem teste de carga massiva.
- [ ] T059 [US6] Validar navegação mensal entre anos, campos temporais independentes, filtros/totais, carregamento/vazio/erro, teclado/foco/live region e layout celular/desktop conforme `specs/005-receitas-despesas-externas/quickstart.md`; corrigir falhas nas telas de `src/features/externos/` e registrar matriz manual em `specs/005-receitas-despesas-externas/validation.md`.

**Checkpoint**: Planejamento, caixa e histórico são compreensíveis e reconciliados; cada total declara base, recorte e completude.

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Concluir regressões, documentação, demonstração e evidências, sem ampliar escopo.

- [ ] T060 Executar `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` conforme `package.json`, corrigindo regressões e registrando resultados/comandos em `specs/005-receitas-despesas-externas/validation.md`; repetir apenas verificações afetadas por novas correções antes da passagem final.
- [ ] T061 Fechar revisão do arquivo completo `firestore.rules`, `firestore.indexes.json` e `docs/firestore-rules-changes.md` com schemas, permissões anteriores preservadas, chamadas/expressões/bytes, migração/backup/rollback e situação exata gerado/publicado/verificado; coordenar cliente schema2 e qualquer publicação apenas sob autorização vigente.
- [ ] T062 [P] Executar avaliação assistida de cinco participantes conforme SC-001/SC-008 em `specs/005-receitas-despesas-externas/quickstart.md`, registrando tempo/ajuda/compreensão anonimizados em `specs/005-receitas-despesas-externas/usability-validation.md`; se participantes indisponíveis, manter critérios pendentes em vez de afirmar aprovação (após T059, em paralelo a T060–T061).
- [ ] T063 Atualizar `README.md` e `specs/005-receitas-despesas-externas/quickstart.md` com comandos efetivos, grupo externos, consultas, retomada, limites, diferença erro/reembolso e procedimento de implantação/validação realmente entregue, sem credenciais ou recursos fora do escopo.
- [ ] T064 Gerar prévia da limpeza de fixtures com `scripts/cleanup-integration.mts` e manifesto validado em `tests/integration/support/manifest.ts`, listando caminhos/quantidades em `specs/005-receitas-despesas-externas/validation.md`; limpar somente escopo já autorizado ou registrar resíduos pendentes, sem liberar deletes ao usuário, apagar dados anteriores ou remover trava de cadastro compartilhado.
- [ ] T065 Concluir matriz FR-001–FR-028/SC-001–SC-008 e gates constitucionais em `specs/005-receitas-despesas-externas/validation.md`, distinguindo local/remoto/manual/assistido, listando limitações e itens não executados e conferindo o estado real de cada checkbox deste `specs/005-receitas-despesas-externas/tasks.md`; não declarar entrega completa com validação obrigatória pendente.

## Dependencies & Execution Order

### Phase Dependencies

Setup T001 → {T002,T003} → fundação T004–T014 → US1 T015–T024 → US2 T025–T031 → US3 T032–T036 → US4 T037–T045 → US5 T046–T052 → US6 T053–T059 → acabamento T060–T065 é a ordem recomendada para um executor.

Na fundação: T004 libera testes T005/T006; T007 restaura Rules; T008→T009→T010 evolui cadastros, com T010 também dependendo de T007; T011 prepara sessão; T012 depende de T004/T005; T013 depende de T004/T006/T011; T014 exige os anteriores. Nenhum ramo financeiro é aberto pela fundação.

### User Story Dependencies

| História | Dependências de código | Critério independente com fixtures próprias |
| --- | --- | --- |
| US1 | Fundação | Criar/listar previsão, sem qualquer pagamento |
| US2 | US1 para origem/repositório | Origem100/1000 e fatos parciais, sem gasto imediato ou correção |
| US3 | US1 + primitivos US2 | Um comando cria novo par35,90; não depende da UI de pagamento posterior |
| US4 | US1 + fatos US2; T045 máximo depende também de US3 | Origem/fato conhecidos, editar/cancelar/reverter e recuperar substituição |
| US5 | US1–US4 para matriz de todos os comandos | Disputas e falhas controladas sobre fixtures, sem depender de relatório mensal completo |
| US6 | US1–US4 para fatos/erros; gates US5 antes da entrega final | Meses revisados e snapshot completo, sem depender de outro usuário ou de séries/cartões |

As histórias financeiras compartilham origem/fatos e, portanto, têm dependências reais; não afirmar independência de implementação onde há dependência de código. Seus critérios de aceitação são executáveis em isolamento com fixtures inventariadas após os pré-requisitos. Paginação básica do MVP está em US1; US6 amplia caixa/filtros/reconciliação. Idempotência e segurança já existem em US1–US4; US5 amplia evidência e recuperação, sem introduzir janela insegura anterior.

### Within Each User Story

Testes pertinentes primeiro, com falha que evidencie comportamento ausente; modelos/transições antes de adaptadores; Rules e transação recíprocas antes de expor ação; UI depois das portas; executar gate da história antes de declarar incremento validado. Cada tarefa de novo comando no repositório estende somente seu perfil operacional específico e respectivos testes em `src/domain/finance/operationBudget.ts`/`src/domain/finance/operationBudget.test.ts`, respeitando seu orçamento e gate de história; T051 consolida essas provas, não adia a proteção. Criação com substituição usa perfil15 explicitamente entregue em T041 e validado em T045; o perfil14 do MVP não habilita esse ramo. Alterar o mesmo `firestore.rules`, repositório, domínio ou arquivo de integração exige serialização entre histórias. Publicação/testes reais respeitam autorização vigente e condições de ambiente; gerar arquivo nunca equivale a publicar.

## Parallel Opportunities and Examples

As janelas abaixo usam somente tarefas `[P]` com arquivos distintos e contratos disponíveis. São oportunidades de execução, não despacho automático de agentes.

| Janela | Exemplo | Pré-condições |
| --- | --- | --- |
| Setup | T002 harness e T003 manifesto | T001 concluída |
| Fundação | T005 mapper tests e T006 snapshot tests | T004 concluída |
| US1 | T015 domínio e T016 integração; depois T021 formulário junto a T019–T020 adaptador | Fundação; para formulário, T017/T011 concluídas |
| US2 | T025 domínio e T026 integração | US1 concluída |
| US3 | T032 testes de domínio/commit em arquivos próprios; testes de domínio e de adaptador podem ser escritos separadamente | Primitivos US2 e contratos compartilhados prontos; nenhuma edição concorrente do mesmo arquivo |
| US4 | T037 transições e T038 projeção | US1/US2; primitivos US3 para o gate máximo final |
| US5 | T046 repositório e T047 estado de tela | US1–US4 concluídas |
| US6 | T053 projeção mensal e T054 consultas | Contratos/base US1–US4; evitar sobrepor T038 já concluída |
| Acabamento | T062 observação assistida junto a T060 checks/T061 documentação técnica | T059 concluída, sem mudanças concorrentes nas telas observadas |

US3 tem uma tarefa de testes que reúne dois arquivos por coesão do caso atômico, não uma promessa de execução paralela com sua implementação dependente. Não paralelizar fases que editam os mesmos módulos. Outras tarefas sem `[P]` seguem a ordem/dependências indicadas.

## Implementation Strategy

### MVP First (User Story 1)

Concluir setup/fundação e US1. Demonstrar criar receita/despesa, recarregar e conferir competência, ocorrência e pendência sem caixa. Validar isolamento e recibos desde esse primeiro incremento. Parar para o checkpoint da história, não encerrar a feature005 como completa: o pedido integral ainda exige US2–US6.

### Incremental Delivery

Adicionar parciais → gasto imediato → correções/reversões → matriz de concorrência/retomada → caixa e conferência mensal. Manter ações ainda não implementadas inacessíveis, ramos negados por padrão e regressões anteriores verdes. Substituição de origem tem etapas explícitas recuperáveis; só o novo par de gasto imediato é indivisível. Não acrescentar cartão, série, crédito, adiantamento ou reembolso para contornar uma inconsistência.

### Traceability and Completion

| Requisitos | Tarefas principais |
| --- | --- |
| FR-001–FR-005 | T004, T008–T013, T015–T024, T027–T030 |
| FR-006–FR-009 | T025–T036 |
| FR-010–FR-015 | T037–T045 |
| FR-016–FR-018 | T019, T029, T035, T041, T046–T049, T052 |
| FR-019–FR-023 | T007–T010, T018, T023, T028, T034, T040, T045, T050–T052, T061 |
| FR-024–FR-027 | T011, T013, T020–T022, T030, T044, T049, T053–T059 |
| FR-028 | T002–T006, T014–T016, T024–T026, T031–T032, T036–T038, T045–T047, T050–T052, T058–T065 |
| SC-001 / SC-008 | T059, T062 |
| SC-002 / SC-004 / SC-005 | T031, T036, T045, T053–T059 |
| SC-003 / SC-006 / SC-007 | T024, T036, T045–T052, T054, T058 |

**Notes**: 65 tarefas, todas inicialmente abertas. US1=10, US2=7, US3=5, US4=9, US5=7, US6=7; setup=3, fundação=11, acabamento=6. Checklist de qualidade da especificação não é modificado por geração de tarefas. Nenhum extensions.yml foi encontrado antes/depois deste comando; nenhum hook executável registrado.
