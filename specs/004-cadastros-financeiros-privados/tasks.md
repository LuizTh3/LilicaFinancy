# Tasks: Cadastros financeiros privados

**Input**: Documentos em `specs/004-cadastros-financeiros-privados/`: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/cadastros.md](contracts/cadastros.md), [contracts/security.md](contracts/security.md) e [quickstart.md](quickstart.md).

**Prerequisites**: Constituição 1.2.0, autenticação/primeiro acesso da feature 002 e núcleo financeiro da 003. Reutilizar stack e lockfile; não inicializar outro projeto, adicionar backend ou instalar emuladores.

**Tests**: Incluídos por exigência de FR-022, cenários de aceitação e critérios SC-001..007. Escrever os testes de cada história antes de implementar o comportamento correspondente; testes locais não comprovam Rules remotas. Preparar testes não significa executá-los com sucesso.

**Organization**: Fases por história, em ordem P1/P1/P1/P2. Segurança comum é fundação obrigatória. US1 entrega o CRUD básico completo, inclusive arquivamento; US2 aprofunda tentativas adversariais e seleção de referências; US3 valida e apresenta preservação histórica; US4 expõe a base inicial opcional. Não adiar proteção de dados para a conclusão da US2.

## Format: `[ID] [P?] [Story] Description`

Cada tarefa começa com checkbox e ID sequencial. `[P]` indica trabalho em arquivos distintos que pode ocorrer após os pré-requisitos da onda descrita em Dependencies. Etiquetas `[US1]`..`[US4]` identificam histórias; setup, fundação e acabamento não têm etiqueta. Os caminhos abaixo são relativos à raiz `C:/Projetos/LilicaFinancy`.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar execução e escopo de testes no projeto existente, sem operar no banco real nesta preparação.

- [X] T001 Registrar baseline de branch real, versões, scripts e estado prévio de `firestore.rules`/`firestore.indexes.json` em `specs/004-cadastros-financeiros-privados/validation.md`; verificar `package.json`, preservar lockfile, mudanças existentes e regras da feature 002, sem copiar segredos.
- [X] T002 [P] Acrescentar grupo `cadastros` em `vitest.integration.config.ts` e preparar validação/testes de A/B/ADMIN/PENDING em `tests/integration/support/environment.ts`, `tests/integration/support/environment.test.ts`, `tests/integration/support/preflight.ts` e `tests/integration/support/clients.ts`; exigir projeto correto, UIDs distintos, login correspondente e confirmação das Rules sem provisionar usuários/papéis automaticamente ou alterar grupos anteriores.
- [X] T003 [P] Estender `tests/integration/support/manifest.ts` e `tests/integration/support/manifest.test.ts` para os seis caminhos privados de quatro segmentos contratados, verificando owner==UID, IDs exatos previamente inventariados, vínculo cadastro/recibo/controle, duplicados, colisão preexistente e rejeição de paths arbitrários; preservar fixtures raiz válidas da 002.
- [X] T004 Adaptar `scripts/cleanup-integration.mts` e adicionar `tests/integration/support/cleanup.test.ts` para revisão de filhos inventariados antes de eventual pai, precondição updateTime e recusa de descendentes não inventariados/perfis preexistentes; manter dry-run padrão e execução explícita, sem exclusão recursiva por UID nem limpeza real nesta tarefa (depende de T003).

**Checkpoint**: Harness e inventário suportam subcoleções com escopo fechado. Credenciais/papéis ausentes bloqueiam testes remotos, não autorizam relaxamento de acesso.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Fechar contratos, schemas, persistência autorizada e fronteiras comuns antes de ligar qualquer tela cadastral.

- [X] T005 Definir tipos discriminados de entradas/DTOs, recibo, controle protegido, resultados e portas específicas em `src/domain/finance/contracts/cadastros.ts`, conforme `data-model.md`; tipar consultarOperacaoCadastro como união comandoCompleto/descritor, com modo de verificação explícito na confirmação e descritor sem capacidade de escrita; fechar as quatro coleções, gramática de IDs, versões esperadas, ausência de opcionais e UID vinculado à sessão, sem tipos Firebase/React ou CRUD de path genérico.
- [X] T006 Implementar schemas e autorização explícita das quatro coleções em `firestore.rules`: own antes de ready, campos/tipos/faixas, nomes, natureza/tipo, trio de base e calendário/dia remoto no fuso fixo, versões/timestamps, referência conta→titular via getAfter e lifecycle sem delete/reativação; preservar perfil/cutoff/admin/default deny e não liberar consumidores financeiros.
- [X] T007 Completar `firestore.rules` com recibos recíprocos create-only em `operacoesCadastros` e controles `usoCadastros` com get próprio e escrita/list negados; exigir cadastro+recibo compatíveis na mesma operação e `!existsAfter(controle)` para mudança sensível, sem flag editável, varredura ou replay de recibo antigo (depende de T006).
- [X] T008 [P] Atualizar `firestore.indexes.json` completo com os quatro índices COLLECTION estado ASC/nome ASC e desempate de ID; preservar índices/fieldOverrides existentes e não criar consultas collectionGroup globais, documentando isenções de payload de recibos quando aplicáveis.
- [X] T009 [P] Criar testes de decodificação e implementar `src/infrastructure/firebase/cadastrosMapper.test.ts` e `src/infrastructure/firebase/cadastrosMapper.ts`, validando snapshots desconhecidos/extra/null/versões/timestamps e referências, com conversão explícita `estado`→`estadoCadastro` no DTO compatível da 003 e sem serializar UID no documento (depende de T005).
- [X] T010 Documentar em `docs/firestore-rules-changes.md` e `specs/004-cadastros-financeiros-privados/validation.md` schemas/permissões, preservação da 002, contagem por branch sem cache, orçamento de duas escritas (até oito acessos, reserva ampliada até doze com leituras), expressões/limites e rollback; registrar desvios encontrados no arquivo concreto antes de habilitar o CRUD (depende de T007/T008).
- [X] T011 Criar preparação operacional restrita de controles de teste em `scripts/prepare-cadastros-fixtures.mts` e seus testes em `tests/integration/support/cadastrosFixtures.test.ts`, exigindo projeto/UID/path exatos, manifesto prévio, alvo ausente e credencial operacional separada para escrita explícita; modo padrão só prepara/revisa inventário, nunca altera Rules, permissões cliente ou dados reais automaticamente (depende de T003/T005/T007).
- [X] T012 Revisar e registrar o gate da fundação em `specs/004-cadastros-financeiros-privados/validation.md`: nenhuma regra aberta, schema sem placeholders, orçamento concreto dentro das margens, fixtures/limpeza delimitadas e nenhum novo serviço; distinguir arquivos gerados de regras compiladas/publicadas/testadas, mantendo publicação sob autorização vigente (depende de T004..T011).

**Checkpoint**: Contratos e autorização completos para todo o CRUD, mesmo onde a UI será entregue depois. Se a contagem concreta ou schema não sustentar um caso, corrigir/bloquear esse caso antes da integração; não remover validações. Não considerar a fundação prova de implantação remota.

## Phase 3: User Story 1 - Administrar cadastros privados (Priority: P1) — MVP

**Goal**: Listar, criar, editar e arquivar as quatro entidades, com feedback e persistência segura, usando inicialmente contas sem base opcional.

**Independent Test**: Em cada coleção, criar → listar → editar → recarregar → arquivar preserva ID/versões; nome de titular pode diferir do usuário sem criar acesso; nomes duplicados são distintos; vazio, loading, erro e confirmação são distinguíveis. Teste remoto depende das condições do quickstart.

### Tests for User Story 1

- [X] T013 [P] [US1] Escrever `src/domain/finance/cadastros.test.ts` com nomes vazios/trim/Unicode/120 caracteres, naturezas, tipos de conta, IDs/versões, conteúdo extra e duplicados permitidos; entradas de base terão cobertura específica em US4, sem tornar o schema remoto permissivo.
- [X] T014 [P] [US1] Escrever `src/domain/finance/contracts/cadastros.contract.test.ts` com exemplos finitos de contrato somente de teste para criar/editar/arquivar, recibo imutável, atomicidade, chave repetida/conteúdo diferente, versão obsoleta, no-op e consulta de confirmação original após edição posterior.
- [X] T015 [P] [US1] Escrever `src/features/cadastros/cadastroState.test.ts` para loading/vazio/lista/erro, envio único, preservação de entrada, conflito, confirmação indeterminada e reinício de cursor após mutação/filtro; não depender de bibliotecas visuais novas.

- [X] T016 [P] [US1] Escrever casos positivos e de recibo/paginação em `tests/integration/cadastros.integration.test.ts` com IDs inventariados: quatro CRUDs, persistência após releitura, nomes iguais, duas páginas, conflito e escrita isolada de cadastro/recibo negada; acrescentar testes do repositório concreto em `src/infrastructure/firebase/cadastrosRepository.test.ts` e cenários remotos usando esse mesmo repositório: resposta descartada após commit, repetição com mesmo ID/chave, recibo original após edição posterior, mesma chave com conteúdo diferente e disputa de versão sem rebase. No local, injetar falha na fronteira do adaptador; no remoto, comprovar os efeitos persistidos e negações reais das Rules. Double de contrato não substitui essa cobertura; não executar fixture massiva para testar paginação.

### Implementation for User Story 1

- [X] T017 [US1] Implementar validadores/transições puras em `src/domain/finance/cadastros.ts`, reutilizando Resultado, dinheiro/calendário quando aplicáveis, sem relógio/ID implícitos; preservar IDs, rejeitar campos extras, versões inválidas e edição de arquivado, diferenciando no-op de alteração efetiva (depende de T013/T014).
- [X] T018 [US1] Implementar comandos específicos em `src/infrastructure/firebase/cadastrosRepository.ts`: UID capturado, intenção/ID estáveis, leitura do recibo antes da versão, todas as leituras antes das duas escritas, timestamps de servidor, versão esperada imutável em retries e nenhuma mudança de UI no callback; retorno repetido não recria cadastro nem sobrescreve recibo (depende de T009/T014/T017).
- [X] T019 [US1] Implementar listagem, get e consulta remota de recibo em `src/infrastructure/firebase/cadastrosRepository.ts`, com uma coleção própria, filtro de estado, ordem nome+ID, cursor contextual, limit<=50, mapeamento validado e distinção ausenteConfirmado/indeterminado; implementar modos comandoCompleto (comparação integral) e descritor (identificação por chave/entidade/tipo/versão, resultado para conferência e nenhuma escrita/reenvio automático); não inferir fim de página cheia ou confirmação por cache (depende de T018).
- [X] T020 [US1] Implementar máquina de estado em `src/features/cadastros/cadastroState.ts`, normalização/validação antes de I/O, envio único, erros acionáveis, preservação de formulário na mesma sessão e conflito sem rebase automático; não anunciar sucesso antes da confirmação (depende de T015/T018/T019).
- [X] T021 [US1] Implementar `src/features/cadastros/CadastroForm.tsx` com nome/natureza/tipo, criação/edição e arquivamento básico confirmado; rótulos, foco no primeiro erro, feedback acessível e campos por entidade, sem login de titular, orçamento, credenciais ou nomes reais fixos; opção de base entra na US4 (depende de T017/T020).
- [X] T022 [US1] Implementar `src/features/cadastros/CadastrosPage.tsx` e integrar `src/app/router.tsx` para hub e quatro rotas dentro de SessionGate, enum de rota fechado, filtros ativos/arquivados/todos, paginação/recarregar e formulário; rota inválida não escolhe coleção arbitrária (depende de T019/T021).
- [X] T023 [US1] Adicionar navegação em `src/app/AppShell.tsx` e estilos funcionais responsivos em `src/shared/styles/global.css`, com ação Cadastros para usuário/admin prontos, preservando guards/fluxos públicos/admin e navegação por teclado (depende de T022).
- [X] T024 [US1] Executar testes locais desta história e registrar resultados de contratos/estado/mapper e não regressão de imports do domínio em `specs/004-cadastros-financeiros-privados/validation.md`, corrigindo falhas antes de considerar o incremento local pronto (depende de T013..T023).
- [ ] T025 [US1] Validar o roteiro remoto positivo do CRUD definido em `tests/integration/cadastros.integration.test.ts` e registrar evidências em `specs/004-cadastros-financeiros-privados/validation.md` somente com projeto, contas, índices e Rules ativas confirmadas; se faltar condição, manter esta tarefa pendente com motivo e continuar apenas trabalho local independente.

**Checkpoint**: US1 demonstra CRUD mínimo. Segurança da fundação é obrigatória; MVP remoto não é validado se T025 estiver pendente. Base inicial permanece opcional/ausente até US4.

## Phase 4: User Story 2 - Impedir acesso e referências indevidas (Priority: P1)

**Goal**: Provar isolamento contra chamadas diretas e tornar seleção/recuperação de referência e sessão consistentes com as Rules já implementadas.

**Independent Test**: A/B/visitante/admin alheio/primeiro acesso pendente tentam todas as operações nos cadastros de A; criar conta só aceita titular próprio ativo, inclusive após manipulação direta. Troca de UID não recebe estado/intenções antigos.

### Tests for User Story 2

- [X] T026 [US2] Acrescentar matriz adversarial das seis coleções em `tests/integration/cadastros.integration.test.ts`: quatro cadastros com get/list/create/update/archive/delete entre papéis, auxiliares indevidos, campo owner/extra/null/tipo/schema/metadado, path livre e IDs iguais entre A/B; comparar negação sem revelar existência de dados alheios.
- [X] T027 [P] [US2] Ampliar `src/features/cadastros/cadastroState.test.ts` com geração/UID alterados durante leitura/escrita, resposta tardia, retomada por descritor após recarga e ausência de comando original; testar os dois modos de consulta, conferência do recibo sem alegar comparação com formulário perdido e descritor incapaz de reenviar automaticamente; exigir descarte seguro e nenhuma nova identidade automática de cadastro pendente.

### Implementation for User Story 2

- [X] T028 [US2] Implementar seleção paginada de titular ativo e leitura pontual do vínculo atual em `src/features/cadastros/CadastroForm.tsx` e `src/features/cadastros/CadastrosPage.tsx`, tratando primeira página como parcial e titular inválido como erro acionável sem inferir propriedade pela seleção.
- [X] T029 [US2] Integrar proteção de UID/SessionGeneration e descritor mínimo de intenção em `src/features/cadastros/cadastroState.ts` e `src/features/cadastros/CadastrosPage.tsx`, apagando estado/sessionStorage na saída ou troca, bloqueando reenvio em outra sessão e preservando cadastroId na retomada; retomada usa modo descritor para identificar recibo e apresentar dados para conferência, sem provar igualdade com formulário perdido nem reenviar automaticamente; nova escrita exige comandoCompleto explicitamente confirmado (depende de T027/T028).
- [X] T030 [US2] Verificar e ajustar consultas/erros de referência e sessão em `src/infrastructure/firebase/cadastrosRepository.ts`, rejeitando UID/path do input e tentativa iniciada com sessão antiga; mapear indisponibilidade/cota/permissão/esquema sem erro genérico que oculte confirmação pendente, mantendo dados anteriores fora da sessão seguinte (depende de T029).
- [X] T031 [US2] Conferir invariantes adversariais contra `firestore.rules` e completar testes de titular inexistente/de B/coleção errada/arquivado, lote vínculo+arquivamento e recibo adulterado em `tests/integration/cadastros.integration.test.ts`; corrigir regras se necessário e atualizar orçamento em `docs/firestore-rules-changes.md`, sem ampliar permissões para viabilizar testes (depende de T026/T030).
- [ ] T032 [US2] Executar testes locais de sessão e, com preflight satisfeito, matriz remota A/B/visitante/admin/pending, registrando resultado por papel/coleção e limitações em `specs/004-cadastros-financeiros-privados/validation.md`; falta de papel/projeto/rules mantém a parte remota pendente, sem alegar cobertura completa.

**Checkpoint**: Nenhuma referência indevida é aceita pela persistência. A matriz remota não pode ser substituída por mock/SDK administrativo. CRUD sem essa prova continua com validação remota pendente.

## Phase 5: User Story 3 - Arquivar sem quebrar o histórico (Priority: P1)

**Goal**: Confirmar preservação de vínculos históricos, bloqueio de novos usos e explicação do impacto ao usuário.

**Independent Test**: Conta ativa referencia titular próprio; arquivar titular mantém o vínculo legível e permite renomear a conta sem substituí-lo; novo vínculo ao arquivado é negado; qualquer exclusão/reativação/edição de conteúdo arquivado é negada. Não criar lançamentos financeiros futuros para demonstrar histórico.

### Tests for User Story 3

- [X] T033 [P] [US3] Ampliar `src/domain/finance/contracts/cadastros.contract.test.ts` com arquivamento preservando todos os campos, reenvio/no-op sem versão extra e manutenção de vínculo arquivado idêntico; adicionar teste de rejeição de nova referência ao copiar o mesmo ID para outra conta.
- [X] T034 [P] [US3] Acrescentar casos históricos/concorrentes em `tests/integration/cadastros.integration.test.ts`: titular arquivado legível na conta existente, troca para outro titular arquivado negada, formulário obsoleto e deletes de cadastro com/sem referência negados; inventariar apenas documentos autorizados desta feature.

### Implementation for User Story 3

- [X] T035 [US3] Completar apresentação de arquivado por get do ID em `src/features/cadastros/CadastrosPage.tsx` e `src/features/cadastros/CadastroForm.tsx`, mostrando nome atual/estado e vínculo preservado mesmo fora da página de ativos; não reativar nem substituir silenciosamente o cadastro antigo (depende de T033/T034).
- [X] T036 [US3] Completar confirmação de impacto e ações de histórico em `src/features/cadastros/CadastroForm.tsx`: preservar fatos/pendências, impedir novos vínculos, informar ausência de reativação e exigir conta ativa em futuras liquidações; manter confirmação navegável por teclado e ocultar ações de edição em arquivados (depende de T035).
- [X] T037 [US3] Verificar e corrigir arquivamento/atualização de vínculo idêntico em `src/infrastructure/firebase/cadastrosRepository.ts` e `firestore.rules`, garantindo apenas a exceção histórica do mesmo registro/papel, conteúdo imutável no arquivamento e ausência de cascata; atualizar contagem em `docs/firestore-rules-changes.md` se a regra mudar (depende de T033/T034/T036).
- [ ] T038 [US3] Executar contratos locais e roteiro histórico remoto quando habilitado, registrando em `specs/004-cadastros-financeiros-privados/validation.md` referência antiga legível e novo vínculo negado; documentar em `specs/004-cadastros-financeiros-privados/contracts/security.md` que cenários de pagamentos/recorrências futuros conservam gate fechado e não foram executados como finanças nesta entrega.

**Checkpoint**: Arquivamento retira uso corrente sem apagar histórico. A clarificação A permanece: pagamento/recebimento novo exigirá conta efetiva ativa e preservará conta prevista arquivada.

## Phase 6: User Story 4 - Informar base da conta sem falsa confirmação de saldo (Priority: P2)

**Goal**: Expor base inicial opcional, manual e datada, com bloqueio após uso e apresentação explícita de incerteza.

**Independent Test**: Contas sem base, com zero, credor/devedor, data inválida/futura e controle de primeiro uso produzem validação/apresentação corretas; nenhuma ação cria movimentação ou afirma saldo bancário confirmado.

### Tests for User Story 4

- [X] T039 [P] [US4] Ampliar `src/domain/finance/cadastros.test.ts` com magnitude/posição/trio completo, ausência versus zero, máximo seguro e excesso, centavo fracionário, datas bissextas/futuras e relógio/fuso explícitos; controle presente bloqueia natureza/tipo/base, inclusive se malformado, sem alterar dinheiro de lançamentos da 003.
- [X] T040 [P] [US4] Acrescentar casos de base e primeiro uso em `tests/integration/cadastros.integration.test.ts`, incluindo tentativa direta com campo de confirmação/credencial, datas hoje/amanhã, alteração/remoção após controle e escrita/deleção cliente do controle negadas; usar apenas fixture operacional exata de T011, sem liberar consumidor financeiro.

### Implementation for User Story 4

- [X] T041 [US4] Implementar/completar regras puras de base/primeiro uso em `src/domain/finance/cadastros.ts`, usando money/calendar e posição própria, removendo trio inteiro quando ausente e permitindo corrigir antes do uso; não criar ajuste, lançamento ou flag de saldo confiável (depende de T039).
- [X] T042 [US4] Integrar leitura de bloqueio de uso e validação da base em `src/infrastructure/firebase/cadastrosRepository.ts` e `src/infrastructure/firebase/cadastrosMapper.ts`, mantendo confirmação por recibo, controle não editável e campos sem null; não tratar conta prevista como movimentação efetiva (depende de T041).
- [X] T043 [US4] Adicionar em `src/features/cadastros/CadastroForm.tsx` a opção informar base, valor pt-BR, posição e data-base obrigatórios juntos, com campos tipo/base bloqueados após uso e explicação acessível; nome/titular de conta ativa permanecem editáveis dentro das regras (depende de T042).
- [X] T044 [US4] Apresentar em `src/features/cadastros/CadastrosPage.tsx` base não informada ou saldo inicial informado com data/origem manual, sempre sem saldo bancário confirmado e sem cálculo de saldo atual; preservar distinção do resultado mensal e a indicação de conta arquivada (depende de T043).
- [ ] T045 [US4] Verificar paridade de validação de base/nome Unicode e controle entre domínio e `firestore.rules`, executando casos locais e remotos de `tests/integration/cadastros.integration.test.ts` quando autorizados; corrigir divergências de data local/tipo/faixa sem confiar no relógio do navegador ou em flag editável (depende de T039..T044).
- [X] T046 [US4] Registrar resultados e limites de base/primeiro uso em `specs/004-cadastros-financeiros-privados/validation.md`, distinguindo fixture privilegiada de controle da transição real de um consumidor ainda inexistente; falta de preparação/credencial remota deixa os casos afetados pendentes, nunca aprova por simulação.

**Checkpoint**: Base opcional funciona sem disponibilidade bancária fictícia. Tipo/base são bloqueados remotamente após controle; novo consumidor financeiro só poderá produzir controle por protocolo atômico próprio em sua feature.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Reconciliar as quatro histórias, validar evidências e entregar arquivos completos para revisão.

- [X] T047 Executar `npm run typecheck`, `npm run lint`, `npm test` e `npm run build` definidos em `package.json`, corrigindo falhas e registrando comandos/resultados em `specs/004-cadastros-financeiros-privados/validation.md`; rodar novamente apenas checks afetados por correções posteriores.
- [X] T048 [P] Revisar regressão de guards/primeiro acesso/imports e ausência de integração bancária/serviço novo com `src/app/guards/SessionGate.test.tsx`, `src/domain/finance/architecture.test.ts`, `src/app/session/SessionProvider.tsx` e `src/infrastructure/firebase/client.ts`, registrando o resultado em `specs/004-cadastros-financeiros-privados/architecture-review.md` sem alterar o perfil para liberar os testes.
- [ ] T049 Executar a validação assistida de cinco participantes e acessibilidade/mobile/teclado descrita em `specs/004-cadastros-financeiros-privados/quickstart.md`, registrando tempos, acertos de pelo menos quatro participantes e diferenças titular/login e base/saldo confirmado em `specs/004-cadastros-financeiros-privados/validation.md`; se participantes/ambiente faltarem, manter o critério pendente em vez de simular evidência humana.
- [X] T050 Revisar entrega textual completa de `firestore.rules`, `firestore.indexes.json` e `docs/firestore-rules-changes.md`, com versão anterior para reversão, índices preservados e orçamento final sem cache; preparar publicação revisável e registrar se só gerada, compilada, publicada ou verificada, sem tratar geração como implantação.
- [ ] T051 Executar grupo remoto `cadastros` de `tests/integration/cadastros.integration.test.ts` após confirmar autorização vigente, projectId, contas, versão ativa das Rules e índices prontos; consolidar todos os papéis/casos em `specs/004-cadastros-financeiros-privados/validation.md`; se houver bloqueio externo, informar exatamente o que falta e não marcar esta tarefa concluída.
- [ ] T052 Conferir dry-run do manifesto da execução pelo `scripts/cleanup-integration.mts`, registrar quantidade/paths em `specs/004-cadastros-financeiros-privados/validation.md` sem segredos; limpeza real só no escopo explicitamente autorizado, com filhos exatos e updateTime, nunca como exclusão automática do usuário/projeto.
- [X] T053 Atualizar `specs/004-cadastros-financeiros-privados/quickstart.md`, `src/domain/README.md` e `src/infrastructure/README.md` com comandos/caminhos implementados, recuperação após recarga, compatibilidade estado/estadoCadastro e gates futuros de uso/referências; não converter a clarificação A em permissão de nova movimentação em conta arquivada.
- [X] T054 Reconciliar tarefas e critérios FR/SC com evidências em `specs/004-cadastros-financeiros-privados/validation.md` e estado de `specs/004-cadastros-financeiros-privados/tasks.md`, marcando somente o executado; reportar testes/publicação/limpeza e limitações reais, sem declarar feature integralmente validada se T025/T032/T038/T046/T049/T051 tiverem verificações obrigatórias pendentes.

## Dependencies & Execution Order

### Phase Dependencies

```text
Setup T001–T004
        |
Fundação T005–T012
        |
US1 T013–T024 (implementação e prova local) ── T025 (prova remota)
        |
        +── US2 T026–T032
        +── US3 T033–T038
        +── US4 T039–T046
                  |
        Integração sequencial dos arquivos compartilhados
                  |
        Acabamento T047–T054
```

As três histórias posteriores usam o CRUD comum da US1, mas não precisam da UI uma da outra para seus testes: fixtures de repositório permitem validar referência/histórico/base isoladamente. A ordem padrão segue a especificação; não editar seus arquivos compartilhados em paralelo sem divisão adicional. US3 usa o arquivamento básico já entregue pela US1; não o implementa de novo.

- T001 precede mudanças; T002 e T003 são independentes; T004 depende de T003.
- T005 precede mapeadores/contratos consumidores. T006→T007 compartilham firestore.rules; T008 pode ocorrer independentemente; T009 requer somente T005 e não modifica Rules. T010 consolida T007/T008; T011 requer inventário/tipos/regras fechados; T012 revisa a fundação inteira.
- Testes de cada história são escritos antes de sua implementação e devem evidenciar falha do comportamento ainda ausente. Não recriar testes redundantes para regras já cobertas; ampliar casos sem apagar cobertura anterior.
- T018→T019 compartilham repositório; T021→T022→T023 integram formulários/rotas. T024 encerra verificação local da US1. T025 e a parte remota de T032/T038/T045/T046 dependem de disponibilidade/publicação autorizada, não são pré-requisito para continuar desenvolvimento local.
- Testes locais não exigem projeto real. Testes remotos que faltarem permanecem pendentes; não promover ausência de credencial a sucesso e não suspender trabalho local independente.
- T047 deve refletir o código final; T050 fecha pacote de Rules/índices; T051 exige seu estado ativo real. T052 só revisa inventário existente e depende de fixtures efetivamente criadas. T054 depende de resultados/limitações registrados para todas as fases.
- T049 requer participantes reais e não bloqueia implementar/corrigir os outros itens; permanece pendente enquanto a evidência humana não existir.

### Parallel Opportunities

`[P]` indica possibilidades de agendamento no arquivo de tarefas, não uma ordem para despachar agentes. Não há delegação solicitada por este comando.

| Onda | Tarefas que podem ocorrer juntas | Pré-requisito |
| --- | --- | --- |
| Setup | T002 e T003 | T001 concluída; arquivos distintos. |
| Fundação | T006 e T008 e T009 | T005 concluída; Rules, índices e mapper são separados. |
| US1 | T013, T014, T015 e T016 | Fundação completa; arquivos de teste distintos, sem sobreposição. |
| US2 | T026 e T027 | CRUD comum; integração e estado locais separados. |
| US3 | T033 e T034 | CRUD comum; contrato e integração separados. |
| US4 | T039 e T040 | CRUD comum; domínio e integração separados. |
| Acabamento | T047 e T048 | Código estabilizado; T047 registra validation.md e T048 architecture-review.md. |

Não executar T026/T034/T040 simultaneamente: todos alteram cadastros.integration.test.ts. Não paralelizar edições entre histórias em CadastroForm/CadastrosPage/cadastroState/cadastrosRepository/firestore.rules.

## Parallel Example: User Story 1

Após T012, escrever em paralelo os testes T013 de domínio, T014 de contrato e T015 de estado e T016 de integração, sem sobreposição entre seus arquivos. Integrar T017 antes de T018 e aguardar persistência/state para ligar formulários. Testes paralelos não autorizam gravações remotas paralelas nem relaxamento de preflight.

## Parallel Example: User Story 2

Após a US1 local, preparar T026 (matriz de acesso direto) e T027 (respostas tardias/descritor) em paralelo. Depois executar T028→T029→T030 e conferir Rules em T031 antes da validação T032.

## Parallel Example: User Story 3

Preparar T033 (contratos de histórico/no-op) e T034 (cenários remotos) em paralelo. Em seguida serializar T035/T036 nas telas e T037 na persistência, sem conflitar com edições dessas mesmas telas por US2/US4.

## Parallel Example: User Story 4

Preparar T039 (dinheiro/calendário/base) e T040 (Rules/controle remoto) em paralelo. T041→T042→T043→T044 liga domínio, repositório e interface; T045/T046 conferem paridade/evidências depois.

## Implementation Strategy

### MVP First

Entregar setup e fundação completos, depois US1 com contas sem base. Validar CRUD nas quatro coleções e isolamento já presente nas Rules antes de considerar demonstração remota pronta. A validação adversarial completa e a UX especializada chegam nas histórias seguintes; nenhuma entrega intermediária pode aceitar acesso cruzado, campo extra ou delete.

### Incremental Delivery

US1 habilita cadastros básicos. US2 fecha experiência de referências/retomada e comprova acesso direto. US3 demonstra histórico preservado usando relações atuais autorizadas. US4 acrescenta base opcional sem saldo confirmado. Finalmente consolidar build, matriz remota e teste assistido. Publicação depende da autorização vigente e não é efeito automático de escrever estas tarefas.

### Scope Boundaries

Pagamentos, receitas, cartões, recorrências e geração de parcelas continuam negados. Requisitos dessas relações são contratos de compatibilidade/gates da futura feature consumidora: mesmo UID, categoria compatível, até cinco etiquetas validadas e conta efetiva ativa para nova liquidação. Não criar adaptador remoto financeiro nem controles cliente de primeiro uso nesta feature apenas para demonstrar cenários futuros.

## Coverage and Completion

| Requisitos/critérios | Tarefas principais |
| --- | --- |
| FR-001..005, FR-018; SC-001 | T005/T006/T008/T013/T017/T019/T021..T025/T028/T049 |
| FR-006..009; SC-004/005 | T006/T007/T009/T011/T039..T046 |
| FR-010..011; SC-003/005 | T006/T007/T011/T018/T033..T038/T039..T046 |
| FR-012..014; SC-002/003 | T006/T007/T026/T028/T030..T032/T034/T037/T038/T053 |
| FR-015..017; SC-006 | T014/T015/T018..T020/T016/T027/T029/T030/T032 |
| FR-019..022 | T002..T012/T025/T026/T031/T032/T038/T040/T045/T046/T050..T054 |
| SC-007 e acessibilidade | T021/T023/T036/T043/T044/T049 |

SC-003 é integralmente executável nesta feature para conta→titular. As obrigações financeiras futuras de FR-012/013 e da seção Obrigações de integração futura da especificação permanecem como gates separados; sua verificação não é anunciada como integração executada nem impede avaliar o aceite atual do CRUD no escopo declarado.

## Notes

- Estado atualizado durante implementação: [X] representa trabalho concluído com evidência local ou documentação; as sete tarefas ainda abertas exigem validação remota, participantes reais ou manifesto da execução remota. Ver validation.md. Nenhuma implantação foi realizada.
- Arquivos de teste novos fora de src devem ser incluídos no runner adequado antes de afirmar que foram executados; testes do harness não devem disparar o preflight remoto para rodar localmente.
- Executar mutações dependentes e limpeza sequencialmente, preservando o inventário. Não instalar emuladores, criar permissões temporárias ou usar SDK administrativo como prova de autorização cliente.
- Não há extensions.yml/hooks configurados na geração; reavaliar hooks.after_tasks antes do relatório final se o arquivo passar a existir.

## Estado da implementação em 2026-10-17

47/54 tarefas concluídas. T025/T032/T038/T045/T051 permanecem abertas pela configuração remota ausente (projeto esperado, contas dedicadas e Rules ativas confirmadas); suas partes locais e casos de teste estão implementados. T049 exige cinco participantes reais. T052 exige manifesto das fixtures desta execução remota; não usar inventário preexistente de outro trabalho. O preflight falhou antes de conectar/criar fixtures. Não há Rules publicadas, compilação remota, limpeza real ou validação humana afirmadas. T054 registra essas limitações; não declara a feature integralmente validada.
