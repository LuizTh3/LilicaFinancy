---
description: "Tarefas executáveis da fundação do aplicativo financeiro"
---

# Tasks: Inicialização do aplicativo financeiro

**Input**: Design documents from `/specs/001-inicializar-aplicativo/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)
e constituição em `.specify/memory/constitution.md`.

**Tests**: Preparar o runner unitário e executar as verificações e cenários de aceitação
explicitados na spec. Não criar testes de existência de arquivos, testes financeiros,
suítes de integração ou emuladores. Saída sem testes não significa domínio testado.

**Organization**: Tarefas por história, com fundação comum antes das quatro histórias.
Todas começam pendentes; este documento não registra implementação ou validações já feitas.

## Format: `[ID] [P?] [Story] Description`

- `[P]` permite paralelismo somente após os pré-requisitos indicados; arquivos diferentes.
- `[US1]` a `[US4]` correspondem às histórias da spec; setup, fundação e acabamento não têm rótulo.
- Caminhos abaixo são relativos à raiz `C:/Projetos/LilicaFinancy`.
- Toda tarefa concluída deve ser marcada somente após seu resultado efetivo; bloqueios
  ficam registrados sem marcar aprovação fictícia.

## Path Conventions

Projeto único na raiz, código em `src/`, contratos e evidências em
`specs/001-inicializar-aplicativo/`. Não criar backend, API, banco ou entidades financeiras.
O arquivo `specs/001-inicializar-aplicativo/validation.md` será criado pela primeira tarefa
para inventário e resultados reais, sem segredos. As tarefas que escrevem nele são sequenciais.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirmar o estado real e selecionar um conjunto estável compatível antes de gerar arquivos.

- [X] T001 Inspecionar a raiz, `.agents/`, `.specify/`, `specs/`, `package.json`, lockfiles, `.gitignore`, arquivos de ambiente e Git, sem imprimir credenciais; registrar inventário, runtime/npm, branch real e conteúdo a preservar em `specs/001-inicializar-aplicativo/validation.md`, lendo a constituição antes de alterações.
- [X] T002 Consultar documentação oficial via Context7 e metadados oficiais de releases/engines/peers para o gerador `react-ts`, React, Vite, TypeScript, plugin React, linter e Vitest 4; registrar versões publicadas exatas e interseção de runtime em `specs/001-inicializar-aplicativo/validation.md`, revalidando decisões de `specs/001-inicializar-aplicativo/research.md` sem assumir que `main` ou `latest` sejam compatíveis com Node 25.8.1 e sem atualizar runtime automaticamente.
- [X] T003 Se continuar sem aplicativo, gerar o template `react-ts` com a versão verificada de create-vite em diretório temporário novo dentro do workspace e integrar somente os arquivos revisados na raiz, incluindo `package.json`, `index.html`, `src/main.tsx`, `vite.config.ts` e configurações TypeScript; preservar `.agents/`, `.git/`, `.specify/` e `specs/`; se houver app, ajustar apenas o necessário e registrar a alternativa em `specs/001-inicializar-aplicativo/validation.md`.

**Checkpoint**: Template integrado sem sobrescrever conteúdo anterior; versões selecionadas e
compatibilidade documentadas. Não instalar dependências no projeto temporário.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Preparar instalação, tipagem e ambiente necessários às histórias.

**CRITICAL**: Concluir T004–T007 antes do trabalho de histórias. A proteção básica do
ambiente é fundação compartilhada; a US4 completará documentação e auditoria de rastreamento.

- [X] T004 Criar ou complementar `.gitignore`, preservando seu conteúdo, para ignorar `node_modules/`, `dist/`, `coverage/`, logs, `.env` e variantes e manter `!.env.example` após as regras de ambiente; aplicar essa proteção antes de gerar arquivos locais.
- [X] T005 Definir `name`, `private`, `engines.node` e `packageManager` concretos e scripts `dev`, `build`, `preview` e `typecheck` em `package.json` conforme `specs/001-inicializar-aplicativo/contracts/commands.md`; instalar apenas o conjunto selecionado e gerar `package-lock.json` com npm, sem `--force`, `--legacy-peer-deps` ou múltiplos lockfiles.
- [X] T006 Ativar explicitamente `strict: true` e `noEmit` nos projetos `tsconfig.app.json` e `tsconfig.node.json`, revisar referências em `tsconfig.json` e tipos de cliente em `src/vite-env.d.ts`; incluir configurações de ferramentas existentes e preparar inclusão de `vitest.config.ts`, mantendo metadados incrementais sob diretório ignorado e variáveis opcionais se forem tipadas.
- [X] T007 Criar `.env` local e `.env.example` com apenas `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` e `VITE_FIREBASE_APP_ID`, todos vazios; se houver arquivo preexistente, preservá-lo e registrar conflito sem expor valores; não instalar SDK nem criar inicializador ou validador obrigatório de Firebase em `src/infrastructure/`.

**Checkpoint**: Base instalável, tipos estritos, ambiente opcional e proteção de arquivos locais.
Não há requisito de dados Firebase para seguir.

## Phase 3: User Story 1 - Executar a base sem serviços externos (Priority: P1) MVP

**Goal**: Abrir e recarregar a home em dev e preview sem configurar serviço externo.

**Independent Test**: Em instalação reproduzível, seguir instruções iniciais do README;
abrir dev e preview e verificar os quatro estados de ambiente sem chamadas Firebase.

### Implementation for User Story 1

- [X] T008 [P] [US1] Criar `src/features/home/HomePage.tsx` com identificação da fundação disponível e aviso de que a configuração Firebase ocorrerá na próxima etapa, sem formulário de login, valores financeiros ou recursos simulados.
- [X] T009 [US1] Compor a home em `src/app/App.tsx`, conectar `src/main.tsx` e ajustar `index.html` para pt-BR e título LilicaFinancy; retirar a demonstração de contador/assets do template somente quando não usada, mantendo uma página `/` sem SDK, persistência ou biblioteca de rotas.
- [X] T010 [P] [US1] Criar as instruções iniciais de pré-requisitos, `npm ci`, preparação local a partir de `.env.example`, desenvolvimento, build e preview em `README.md`, documentando versões e requisito Node reais, ausência de integração nesta etapa e uso da URL impressa pelo servidor.
- [X] T011 [US1] Executar instalação reproduzível, desenvolvimento, build e preview seguindo `README.md` e a matriz de quatro estados de `specs/001-inicializar-aplicativo/quickstart.md`, usando somente marcadores fictícios, reiniciando dev e reconstruindo antes de preview quando mudar ambiente; conferir refresh, console e rede, restaurar o ambiente local e registrar resultados e limitações em `specs/001-inicializar-aplicativo/validation.md`.

**Checkpoint**: US1 demonstrável por si só. Conteúdo pode usar os estilos básicos do template
até US2. A matriz de T011 será aproveitada nas verificações finais se nada relevante mudar.

## Phase 4: User Story 2 - Entender e navegar pela entrega inicial (Priority: P1)

**Goal**: Disponibilizar shell responsivo, navegação simples e operação por teclado.

**Independent Test**: Abrir em 360 e 1280 pixels; usar Tab, Shift+Tab e Enter nos dois links;
conferir salto, página atual, refresh e ausência de destinos quebrados.

### Implementation for User Story 2

- [X] T012 [P] [US2] Criar `src/shared/components/SkipLink.tsx` com link “Ir para o conteúdo” apontando para `#conteudo-principal`, com comportamento que permita continuar a navegação no conteúdo principal.
- [X] T013 [P] [US2] Criar `src/shared/styles/global.css` com layout responsivo simples, contraste legível, foco visível e estilo do link de salto ao receber foco, sem assets remotos, animações ornamentais, sobreposição ou rolagem horizontal nas larguras de aceitação.
- [X] T014 [US2] Criar `src/app/AppShell.tsx` com header, identificação do app, nav com nome acessível, link Início `/` marcado como página atual, SkipLink e main com `id="conteudo-principal"`; omitir destinos futuros em vez de criar páginas financeiras vazias.
- [X] T015 [US2] Integrar shell e home em `src/app/App.tsx`, importar estilos compartilhados em `src/main.tsx` e consolidar o título principal em `src/features/home/HomePage.tsx`; remover somente CSS/assets gerados que ficaram sem uso e conferir a estrutura de `index.html`.
- [X] T016 [US2] Validar os critérios de `specs/001-inicializar-aplicativo/contracts/ui.md` em dev e preview nas larguras 360 e 1280, com teclado, foco, salto funcional, landmarks, português e recarga de `/`; registrar navegador, resultados e eventual bloqueio em `specs/001-inicializar-aplicativo/validation.md`.

**Checkpoint**: US2 oferece navegação acessível sobre a execução da US1, sem funções futuras
apresentadas como implementadas.

## Phase 5: User Story 3 - Verificar e evoluir a base (Priority: P2)

**Goal**: Preparar verificações locais previsíveis e documentar responsabilidades da estrutura.

**Independent Test**: Executar tipos, lint, build e runner sem Firebase; revisar separação de
responsabilidades sem exigir implementação de lógica financeira ou testes artificiais.

### Implementation for User Story 3

- [X] T017 [P] [US3] Acrescentar Vitest 4 estável compatível em `package.json` e `package-lock.json`, configurar ambiente Node em `vitest.config.ts`, incluir esse arquivo em `tsconfig.node.json` e definir `test` como `vitest run --passWithNoTests`, sem DOM, cobertura, emulador ou arquivos de teste vazios/de existência.
- [X] T018 [US3] Configurar lint de correção para React/TypeScript em `.oxlintrc.json` e script `lint` de `package.json` com `oxlint --deny-warnings`, atualizando `package-lock.json` somente se necessário; se o template publicado selecionado usar ESLint, preservar sua configuração real e política equivalente de warnings, documentando a diferença sem manter dois linters.
- [X] T019 [P] [US3] Criar `src/domain/README.md` e `src/infrastructure/README.md` explicando domínio puro independente de React/SDK e integrações futuras encapsuladas, sem gerar entidades, repositories, serviços fictícios, barrels ou camada genérica sem consumidor.
- [X] T020 [US3] Completar `README.md` com comandos de tipos, lint e testes, runner sem testes versus testes efetivamente aprovados, cinco áreas de responsabilidade e limites desta fundação; registrar ferramenta de lint e versões realmente adotadas de forma consistente com `package.json` e `package-lock.json`.
- [X] T021 [US3] Executar `npm run typecheck`, `npm run lint`, `npm run build` e `npm test` conforme `specs/001-inicializar-aplicativo/contracts/commands.md`, conferir código de saída, ausência de emissão JS na fonte, imports sem Firebase e saída sem testes; registrar resultados reais em `specs/001-inicializar-aplicativo/validation.md` sem alegar validação de domínio, persistência ou isolamento.

**Checkpoint**: Os seis scripts públicos existem, verificações locais são executáveis e o
runner está preparado. Nada exige testes financeiros para apresentar conclusão honesta.

## Phase 6: User Story 4 - Preparar configuração local sem expor credenciais (Priority: P2)

**Goal**: Completar proteção de arquivos locais e deixar claro o contrato público de ambiente.

**Independent Test**: Conferir quatro campos vazios, ignore/rastreamento, exceção do exemplo
e explicação de que variáveis de navegador não são segredos, aproveitando a matriz T011.

### Implementation for User Story 4

- [X] T022 [P] [US4] Completar `.gitignore` com logs e credenciais locais segundo `specs/001-inicializar-aplicativo/contracts/environment.md`, incluindo `.credentials/` e padrões específicos necessários encontrados na inspeção, sem ignorar todo JSON, apagar conteúdo anterior ou perder a exceção `.env.example`.
- [X] T023 [P] [US4] Acrescentar ao `README.md` o contrato dos quatro campos vazios, instruções para copiar `.env.example` somente quando `.env` não existir, exposição de `VITE_` no bundle e proibição de senhas/chaves administrativas, sem exigir coleta de valores nesta etapa.
- [X] T024 [US4] Auditar `.env`, `.env.example` e código em `src/` contra `specs/001-inicializar-aplicativo/contracts/environment.md`, confirmando somente quatro nomes, valores finais vazios desta nova base, tolerância à ausência e inexistência de import/inicialização Firebase; preservar qualquer conteúdo local preexistente e registrar desvios sem expor valores em `specs/001-inicializar-aplicativo/validation.md`.
- [X] T025 [US4] Executar verificações de `git ls-files`, `git check-ignore --no-index` e `git status` de `specs/001-inicializar-aplicativo/quickstart.md` para `.env`, variantes, dependências, dist, coverage, logs, credenciais e exceção do exemplo; registrar em `specs/001-inicializar-aplicativo/validation.md`, sinalizando possível exposição anterior e tratamento separado de remoção do índice se já houver rastreamento, sem apagar arquivo local ou reescrever histórico.

**Checkpoint**: Ambiente local protegido e exemplo versionável. Se houver `.env` rastreado,
SC-006 permanece pendente até tratamento separado; não marcar T025 concluída como aprovação
integral desse critério apenas por ter registrado o problema.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Reconciliar documentação, evidências e escopo após as quatro histórias.

- [X] T026 Revisar `README.md`, `package.json`, `package-lock.json` e `specs/001-inicializar-aplicativo/contracts/commands.md` para coerência dos seis comandos, gerenciador, versões, engines e escolhas reais do template, atualizando somente diferenças justificadas e sem ampliar o escopo.
- [X] T027 Conferir a entrega contra `specs/001-inicializar-aplicativo/quickstart.md`, complementando em `specs/001-inicializar-aplicativo/validation.md` apenas evidências ausentes ou invalidadas por mudanças posteriores; repetir checks relevantes se houver correções, sem executar novamente toda a matriz por rotina.
- [X] T028 Revisar `src/`, `.gitignore`, `.env.example` e alterações de arquivos contra a constituição e FR-001–FR-018, verificando preservação do conteúdo inicial, ausência de SDK/regras financeiras, emuladores, backend, rules/índices fictícios, segredos e serviços externos; se restar pasta temporária de scaffold, confirmar seu caminho absoluto dentro do workspace e remover somente os artefatos dessa operação, registrando em `specs/001-inicializar-aplicativo/validation.md`.
- [X] T029 Consolidar SC-001–SC-007 em `specs/001-inicializar-aplicativo/validation.md` com resultados, limitações e bloqueios reais, conferir `git diff --check` e estado do Git e atualizar checkboxes deste `specs/001-inicializar-aplicativo/tasks.md` somente para tarefas efetivamente concluídas; não fazer commit, publicação ou inicialização Git.

**Checkpoint**: Entrega revisável com resultados reais e eventuais critérios bloqueados
explicitamente identificados. Sem evidência de navegador ou execução, não declarar validação completa.

## Dependencies & Execution Order

### Phase Dependencies

- Setup: T001 → T002 → T003.
- Fundação: T004 → T005 → T006 → T007; todos dependem do setup.
- US1: após a fundação, T008 e T010 independentes; T009 depende de T008; T011 depende
  de T009 e T010. Não abrir app de exemplo do template como se fosse o resultado de US1.
- US2: após US1, T012 e T013 independentes; T014 depende de T012 e do contrato CSS
  de T013; T015 depende de T013/T014; T016 depende de T015.
- US3: após a fundação, T017 e T019 podem ser iniciados; T018 depende de T017 por editar
  o mesmo manifesto/lockfile; T020 depende de T018/T019 e da base documental T010;
  T021 depende de T020 e deve usar a fonte final disponível.
- US4: após a fundação, T022 e T023 independentes (T023 deve aguardar T020 se executado
  em paralelo com US3, pois ambos editam README); T024 depende de T022/T023 e da home;
  T025 depende de T024 e das evidências de matriz T011.
- Acabamento: T026 → T027 → T028 → T029 após todas as histórias.

### User Story Dependencies

```text
Setup → Fundação → US1 → US2 ───────────────┐
              ├──→ US3 (conclusão após US1) ├──→ Acabamento
              └──→ US4 (conclusão após US1) ┘
```

A ordem padrão é sequencial: US1 → US2 → US3 → US4. O grafo mostra possibilidades de
adiantar trabalho isolado, não autorização para sobrescrever arquivos compartilhados.
US2 evolui o shell da US1; US3 e US4 podem preparar arquivos independentes após fundação,
mas sua aceitação final usa a home. Cada história possui roteiro próprio de verificação.

### Within Each User Story

Componentes/contratos antes da composição; composição antes de inspeção do navegador.
Manifesto antes de instalação e verificação; documentação alinhada antes do roteiro independente.
Executar comandos mutáveis npm e gravações de evidências em sequência. Não há etapa TDD,
models/services/endpoints ou testes de negócio a implementar neste escopo.

### Parallel Opportunities

Quatro pares principais independentes, após os respectivos pré-requisitos: T008/T010, T012/T013,
T017/T019 e T022/T023; T019 também pode ocorrer junto de T012/T013 por usar outros arquivos.
Nunca executar T017/T018 simultaneamente nem permitir edições concorrentes em README,
manifesto, lockfile, configurações TypeScript ou `validation.md`.

## Parallel Example: User Story 1

```text
Após T007:
  T008: HomePage.tsx
  T010: README.md inicial
Depois: T009 e T011, respeitando suas dependências.
```

## Parallel Example: User Story 2

```text
Após US1:
  T012: SkipLink.tsx
  T013: global.css
Depois: T014 → T015 → T016.
```

## Parallel Example: User Story 3

```text
Após a fundação:
  T017: package.json, package-lock.json, vitest.config.ts, tsconfig.node.json
  T019: src/domain/README.md e src/infrastructure/README.md
Depois: T018, T020 e T021, com README inicial disponível.
```

## Parallel Example: User Story 4

```text
Após a fundação e sem outra tarefa editando README:
  T022: .gitignore
  T023: README.md (segurança e ambiente)
Depois: T024 → T025, com US1 disponível para aceitação completa.
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Concluir setup e fundação T001–T007.
2. Entregar US1 T008–T011: instalação, página inicial e execução sem Firebase.
3. Validar a US1 independentemente e demonstrar localmente. Não publicar.
4. Esse marco é um MVP de execução; a feature completa ainda exige US2, US3, US4 e acabamento.

### Incremental Delivery

Adicionar shell acessível da US2, ferramentas/limites da US3 e auditoria de ambiente da US4.
Consolidar evidências ao final, sem transformar resultado de nenhuma suíte em testes de
domínio aprovados. Não avançar para autenticação ou banco neste conjunto de tarefas.

## Coverage & Completion Signals

| Requisitos/critério | Tarefas principais |
| --- | --- |
| FR-001, FR-016 | T001–T006, T026 |
| FR-002, FR-003; SC-001 | T008–T011 |
| FR-004, FR-011; SC-002 | T007–T011, T024, T028 |
| FR-005, FR-006; SC-003, SC-004 | T012–T016 |
| FR-007 | T019–T020, T028 |
| FR-008, FR-009; SC-005 | T005–T006, T017–T021 |
| FR-010, FR-012, FR-013, FR-015; SC-006 | T004, T007, T022–T025 |
| FR-014 | T010, T020, T023, T026 |
| FR-017; SC-007 | T001, T011, T016, T021, T024–T029 |
| FR-018 | Restrições globais e T028–T029 |

## Notes

- São 29 tarefas: setup 3, fundação 4, US1 4, US2 5, US3 5, US4 4 e acabamento 4.
- O campo de feature do Spec Kit não exige criar uma branch: preservar a branch real.
- Não publicar rules, executar migração, coletar dados Firebase, criar commits ou apagar dados.
- Se houver bloqueio de rede, runtime, navegador ou rastreamento prévio, registrar o impacto
  e concluir trabalho independente possível; não contornar checks nem marcar aprovação fictícia.
- Nenhuma tarefa deste arquivo foi executada pelo comando de geração de tarefas.
