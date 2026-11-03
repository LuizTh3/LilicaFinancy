# Tasks: Painel mensal e projeção de 12 meses

**Input**: `specs/011-painel-mensal-projecao/spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/` e `quickstart.md`.

**Prerequisites**: Constituição1.2.0, contratos003–010 e decisão A: todas as fontes/páginas/detalhes de um total completo refletem o mesmo momento de consulta. Repositório inicializado; preservar stack, sem backend financeiro/emulador. Caminhos relativos à raiz. Arquivos novos são entregas futuras.

**Tests**: Exigidos por FR-027/SC-001–008 e plano. Escrever/executar testes específicos antes da implementação e registrar falha inicial. Testes locais não comprovam Rules. Integração usa cliente autenticado real, dados sintéticos e A/B/admin/pendente/visitante no projeto autorizado.

**Organization**: Setup → Fundação → US1/US2/US3(P1) → US4/US5(P2) → Fechamento. [P] somente para arquivos distintos e pré-requisitos satisfeitos; não autoriza subagentes ou concorrência remota. Estado atual:17 tarefas concluídas;51 pendentes. T016 possui cobertura local parcial e T019 está bloqueada pelas fontes de origem ausentes. Geração não autoriza publicação,seed,limpeza ou envio de fonte; autorização de avaliação010 não se transfere à011.

**Gates**: G0-local transporte/snapshot/orçamento e limpeza comprovados localmente; G0-remoto snapshot e concorrência reais antes de habilitação; G1 capacidade real por fonte; G2 autoridades007/008/010 e índice de consumo008 harmonizados; G3 Rules/índices ativos,testes reais e aceitação. Ausência de fonte mantém PENDENTE; divergência/inviabilidade é ERROR. Registrar pendência não conclui tarefa que exige PASS. Fixtures permitem domínio isolado, nunca habilitação de total integral dependente.

## Phase 1: Setup — inventário e evidências

**Purpose**: Preparar rastreabilidade sem instalar stack ou criar dados.

- [X] T001 Conferir fontes reais e atualizar `specs/011-painel-mensal-projecao/research.md`, inspecionando `src/infrastructure/firebase/externosQueries.ts`, `faturasQueries.ts` e `src/domain/finance/projections.ts`: lista005 só planejamento,006 calendário sem valores e007–010 sem produto comprovado; listar gates de origem a concluir antes dos adapters dependentes.
- [X] T002 [P] Criar `specs/011-painel-mensal-projecao/validation.md` com versões,comandos,estado por gate/fonte,hashes,projeto esperado,manifesto sintético,métricas e distinção local/remoto/gerado/publicado, sem ler/imprimir credenciais ou presumir autorização010.
- [X] T003 [P] Criar matriz27FR/oitoSC/cinco histórias em `specs/011-painel-mensal-projecao/coverage.md`, associando tarefas/testes aos12 cenários do quickstart, incluindo filtros incompatíveis,snapshot comum,fontes ausentes e consumo sem data; não anunciar testes executados.

**Checkpoint**: T001 precede T002/T003; estes podem ocorrer em paralelo.

## Phase 2: Foundational — infraestrutura compartilhada

**Purpose**: Provar contratos e leitura consistente antes das histórias, sem implementar silenciosamente fontes anteriores.

- [X] T004 Escrever `src/domain/finance/contracts/painel.contract.test.ts` para ConsultaPainel/SnapshotPainel,modos1/12meses,indicadores discriminados,chaves por autoridade,filtros canônicos,dinheiro/calendário seguros e ausência distinta de zero; registrar falha inicial.
- [X] T005 Implementar `src/domain/finance/contracts/painel.ts` com tipos/validação,porta somente leitura,snapshot/TTL,cobertura,capacidade,concessão de orçamento e cursor opaco; reutilizar Resultado/Diferenca003 sem SDK no domínio.
- [X] T006 [P] Escrever `src/infrastructure/firebase/financeiroSnapshotReader.test.ts` para sondagem vazia/releitura,readTime preciso,runQuery/batchGet,found/missing fora de ordem,tempo divergente,allowlist,UID/generation,token em memória,timeout20s e limites50/8; testar invalidação antes/depois de cada await.
- [X] T007 Extrair `src/infrastructure/firebase/financeiroSnapshotReader.ts` e adaptar `externosSnapshotReader.ts` preservando porta/allowlist005; usar ID token,readTime comum,TTL50min,no-store,redirect:error e abort,sem StructuredQuery/caminho livre nem escrita financeira.
- [X] T008 [P] Escrever `src/infrastructure/firebase/painelQueries.test.ts` e `painelSources.test.ts` para orçamento global100docs/8HTTP,reserva antes de concorrência,query50,batch8 condicionado,sondagem/releituras/refs/candidatos/missing contados,fila justa,página cheia sem fim presumido e fonte ausente sem zero.
- [X] T009 Implementar `src/infrastructure/firebase/painelQueries.ts` e `painelSources.ts` com snapshot caller-owned,iniciar/continuar/atualizar/detalhar,concessões globais,cursor por fonte/mês/fase e adapters fechados; não reiniciar100 por fonte nem combinar repos com snapshots independentes.
- [X] T010 Escrever testes e implementar estado mínimo em `src/features/painel/painelState.test.ts` e `painelState.ts`, separando consulta/snapshot visível e visão em construção; respostas divergentes/tardias não promovem total completo e buffers obedecem8MiB sem truncar contribuições silenciosamente.
- [X] T011 Escrever primeiro `src/app/session/painelSession.test.ts` e integrar limpeza/aborto em `src/app/session/SessionProvider.tsx`, `financeSession.ts`, `src/features/painel/painelState.ts` e `src/infrastructure/firebase/painelQueries.ts`: logout,trocaUID/generation,revogação/perfil/fuso eliminam estado,handles,cursores,filtros,referências e caches privados e abortam controladores. Testar respostas tardias em cada await e preservar005/006. É pré-requisitoG0-local e de qualquer MVP; US5 somente amplia regressões.
- [X] T012 Preparar grupo painel em `tests/integration/support/environment.ts`, `vitest.integration.config.ts` e `tests/integration/support/painelFixtures.ts`, com preflight em `tests/integration/support/painelEnvironment.test.ts`; exigir projeto/runId/quatroUIDs distintos/visitante e manifesto sem segredos/seed/limpeza. Criar provaG0 em `tests/integration/painel-snapshot.integration.test.ts` sem execução remota implícita.
- [X] T013 Validar G0-local em `specs/011-painel-mensal-projecao/validation.md`: executar testesT004/T006/T008/T010 e de limpeza/abortoT011, mais regressões `externosSnapshotReader.test.ts`, `externosQueries.test.ts` e `faturasQueries.test.ts`. Registrar prova local separada da remota; falta de projeto/credenciais/autorização mantém G0-remoto pendente, mas não bloqueia domínio/interface com fixtures após PASS local. Esta tarefa não habilita consultas de produto nem substitui a prova remotaT025.
- [X] T014 Registrar capacidades/schema/índices/evidência por fonte/base e G0-local/G0-remoto em `specs/011-painel-mensal-projecao/coverage.md`; implementar negação por padrão em `src/features/painel/availability.ts`, com `availability.test.ts`. Fonte ausente não significa usuário sem registros. G0-local libera somente trabalho isolado; consultas reais de produto e MVP exigem G0-remotoT025 e gates das fontes, sem impedir testes autenticados autorizados que produzam essa prova.

**Checkpoint impeditivo local**: Setup→T004→T005; T006/T008 podem ser escritos juntos; T007 sucedeT006,T009 sucedeT007/T008; depois T010→T011(limpeza)→T012(preflight)→T013(G0-local)→T014(capacidades). PASS local libera domínio/interface com fixtures e implementação de adapters mantidos desabilitados. G0-remoto é provado emT025 antes de habilitar consultas de produto/aprovar MVP emT026. G1/G2 impedem integração e aceitação das fontes pertinentes; sua pendência não bloqueia trabalho puro ou demonstração isolada.

## Phase 3: User Story 1 — Conferir mês e explicar totais (Priority: P1) — MVP

**Goal**: Planejamento mensal rastreável, uma fatura por cartão/competência e planejado preservado após pagamento.

**Independent Test**: Receita5000/recebida3000;fatura1000/paga400;externa200 quitada;parcela300 não paga → compromissos1500,liquidado600,pendente900,aReceber2000,resultado3500. Pagar100 mantém compromisso/resultado; detalhe reconcilia centavos.

### Tests

- [X] T015 [P] [US1] Escrever `src/domain/finance/painel.test.ts` para fixtureUS1,fatura versus itens,série versus slots,capital original ausente/conhecido,quitação,créditos/cancelamentos/reversões,entrada de empréstimo só explícita,overflow e zero apenas após cobertura.
- [ ] T016 [P] [US1] Escrever `src/infrastructure/firebase/painelMapper.test.ts` e `painelSourcesPlanning.test.ts` para identidades,compra/revisão007 vigente,expansão009 sem cópia005,G008 reconciliado,item010 no próprioO e fonte/schema ausente sem total definitivo. Incluir descoberta virtual010 por vigência sobreposta,criação/encerramento,legado sem metadado,limites1900/9999 e persistidas após encerramento ou com competência alterada; nenhum fallback de catálogo histórico.

### Implementation

- [X] T017 [US1] Implementar planejamento em `src/domain/finance/painel.ts`: previsto/recebido/aReceber/compromissos/liquidado/pendente/resultado e contribuições explicativas; reutilizar primitivas003,sem somar fatura+parcelas ou retirar quitadas do planejado.
- [X] T018 [US1] Implementar mapper/adapters mensais005/calendário006 em `src/infrastructure/firebase/painelMapper.ts` e `painelSources.ts`, aceitando snapshot/orçamento externos e competência independente do vencimento; preservar comandos/prévias de `externosQueries.ts`/`faturasQueries.ts` sem fabricar cursores.
- [ ] T019 [US1] Integrar fontes reais007/008/009 e projeção mensal010 em `src/infrastructure/firebase/painelSources.ts`, `painelMapper.ts` e `src/features/painel/availability.ts` após gates dos respectivos `specs/007-compras-cartao-parceladas/tasks.md`, `specs/008-pagamentos-ajustes-faturas/tasks.md`, `specs/009-compromissos-parcelados-emprestimos/tasks.md` e `specs/010-recorrencias-mensais/tasks.md`. Para010, harmonizar descoberta mensal por vigência em `specs/010-recorrencias-mensais/data-model.md` e `specs/010-recorrencias-mensais/contracts/security.md`, evoluir schemas/Rules/readers e provar metadados derivados/índice/legados conforme modelo011; ler O persistidas independentemente. Exigir compra/revisão,mapas009,G008/G010.calendarioVersion e O010.capacidadeItem no mesmo snapshot. Fonte ausente mantém tarefa/G1/G2 pendentes; produto continua desabilitado até G0-remotoT025,sem impedir teste autenticado autorizado.
- [ ] T020 [US1] Entregar consultas mensais em `firestore.indexes.json` completo e,quando permissões exigirem composição,`firestore.rules` completo e `docs/firestore-rules-changes.md`,preservando005/006 e protocolos007–010,get/list próprios/limit50 e nenhuma escrita011; comprovar custo transitivo de batch sem cache e reduzir lote se necessário. Não publicar implicitamente.
- [ ] T021 [US1] Escrever `src/infrastructure/firebase/painelDetail.test.ts` e implementar detalhe por indicador/alvo em `painelQueries.ts` e `src/features/painel/painelState.ts`, mantendo snapshot e páginas de contribuições; expiração pede atualização conjunta,sem detalhe atual explicando resumo antigo.
- [ ] T022 [US1] Escrever `src/features/painel/PainelPage.test.tsx` e `PainelDetalhe.test.tsx` para totais,cartão/titular,estimativa/parcialidade,teclado,detalhe em uma ação,retorno com contexto e fonte ausente sem link quebrado/zero.
- [ ] T023 [US1] Implementar `src/features/painel/PainelPage.tsx`, `PainelIndicadores.tsx` e `PainelDetalhe.tsx` com base/competência/vencimento/atualização,liquidação como posição atual,mês anterior/próximo/hoje e resultado sem rótulo de saldo disponível.
- [ ] T024 [US1] Substituir placeholder `/app` em `src/app/router.tsx` e integrar `src/app/AppShell.tsx`, com regressões em `src/app/router.test.tsx`; preservar Home/guards/telas anteriores. URL só base/mês válidos,sem dados/snapshot/cursor/token; links de origem usam rota real e avisam mudança para dados atuais.
- [ ] T025 [US1] Criar/executar matriz mensal real em `tests/integration/painel-planning.integration.test.ts` e provaG0-remoto em `tests/integration/painel-snapshot.integration.test.ts` após configuração/autorização/fontes/Rules/índices compatíveis: totaisUS1,vazio,continuação,detalhe,get/list diretos,cartões/titulares distintos,A/B/admin/pendente/visitante e limites0/51/ausente. Usar segundo cliente autenticado e comandos habilitados para alterar pagamento/lançamento durante carga,entre páginas e antes do detalhe; provar snapshot antigo coerente e atualização conjunta para novo momento. Registrar evidências/hashes em `specs/011-painel-mensal-projecao/validation.md`; sem essa prova manter G0-remoto e habilitação do MVP pendentes.
- [ ] T026 [US1] Conferir checkpointUS1 em `specs/011-painel-mensal-projecao/coverage.md` e `validation.md`, executando testes mensais/regressões005/006. MVP integral e consultas reais de produto exigem limpeza/abortoT011 integrada na fundação,G0-local,G0-remotoT025 e G1/G2 pertinentes. Demo com fixtures ou fonte parcial é identificada e não conclui aceitação remota; não adiar logout ou prova concorrente mínima paraUS5.

**Checkpoint**: T015/T016 após fundação; T017–T021 antesUI;T022 antesT023/T024;T025/T026 concluem. Dependência ausente permanece bloqueio explícito,sem ampliar T019 à implementação integral não planejada de features anteriores.

## Phase 4: User Story 2 — Comparar as três bases (Priority: P1)

**Goal**: Separar competência,consumo na origem e data real da liquidação.

**Independent Test**: Compra1200 outubro,parcelas400 novembro–janeiro,pagamentos150 outubro/250 dezembro;externa competência novembro/vencimento dezembro/pagamento janeiro. Cada contribuição aparece uma vez na base/data correta.

### Tests

- [ ] T027 [P] [US2] Ampliar `src/domain/finance/painel.test.ts` com consumo integral,parcelas sem novo consumo,encargos,crédito sem caixa,erro no mês original,estorno no efeito,reembolso real,reversão original,transferência própria excluída e consumo009 desconhecido não presumido.
- [ ] T028 [P] [US2] Escrever `src/infrastructure/firebase/painelSourcesBases.test.ts` para datas efetivas005/009/010,eventos008 multidatas/multiefeitos,deduplicação por documento/efeito,contexto histórico e competenciasConsumo, incluindo legados sem cobertura.

### Implementation

- [ ] T029 [US2] Implementar caixa/consumo em `src/domain/finance/painel.ts` e `src/infrastructure/firebase/painelMapper.ts`, com caixa versus consumo líquido tipados,devolução distinta de receita,compra integral uma vez e sem data como não atribuível apenas no recorte conhecido.
- [ ] T030 [US2] Integrar caixa005/009/010 em `src/infrastructure/firebase/painelSources.ts` e consultas fechadas em `financeiroSnapshotReader.ts` pelos formatos de `specs/011-painel-mensal-projecao/contracts/queries.md`; não presumir listar005 caixa,ler séries de todos anos para descobrir fatos ou reclassificar história por categoria atual silenciosamente.
- [ ] T031 [US2] Harmonizar competenciasConsumo em `specs/008-pagamentos-ajustes-faturas/data-model.md`, `specs/008-pagamentos-ajustes-faturas/contracts/queries-ui.md` e implementação real `src/infrastructure/firebase/liquidacoesFaturasMapper.ts`/`liquidacoesFaturasRepository.ts`, escrevendo testes antes. Aplicar tabela0/1 por variante do modelo011: campo obrigatório,canônico,conjunto exato; [] só sem efeito e ausência como legado; negar cardinalidade2,duplicata,ordem/mês incorreto,omissão/extra e metadado forjado. Testar classificação,compensação e estorno com datas de caixa distintas; comando com dois meses de consumo é recusado integralmente pelo perfil. Entregar `firestore.rules` completo e `docs/firestore-rules-changes.md`,reavaliar schema/bytes/acessos/expressões/compatibilidade antesG2; depende008 real,sem backfill/publicação automática.
- [ ] T032 [US2] Integrar consumo005/007/008/009/010 e caixa008 em `src/infrastructure/firebase/painelSources.ts`/`painelMapper.ts`, por dataCompra/dataConsumo,datasCaixa/competenciasConsumo e efeitos deduplicados; exigir T031 e fontes habilitadas. Não usar createdAt como data econômica ou repetir O010/compra1/1.
- [ ] T033 [US2] Incorporar índices caixa/consumo em `firestore.indexes.json` completo e regressões em `firestore.rules`/`docs/firestore-rules-changes.md`, conforme matriz de `specs/011-painel-mensal-projecao/contracts/queries.md`; legado sem metadado fica indisponível para total integral,migração é operação separada autorizada.
- [ ] T034 [US2] Escrever `src/features/painel/PainelBases.test.tsx` para rótulos/datas,posição atual no planejamento,movimentos de outros meses,consumo na origem,não atribuíveis e ausência de saldo bancário/receita nova por reembolso.
- [ ] T035 [US2] Integrar bases/colunas em `src/features/painel/PainelPage.tsx`, `PainelIndicadores.tsx`, `PainelDetalhe.tsx` e `painelState.ts`, preservando contexto válido e explicando incompatibilidade,sem zero para fonte não habilitada/inaplicável.
- [ ] T036 [US2] Exercitar três bases reais em `tests/integration/painel-bases.integration.test.ts`, após autorização/gates,com correção retroativa/estorno/reembolso em meses distintos e eventos008 multi-efeito/multidata; registrar manifesto/fontes em `specs/011-painel-mensal-projecao/validation.md`. Legados sem cobertura mantêm teste integral pendente.
- [ ] T037 [US2] Reconciliar US2/SC001–002 em `specs/011-painel-mensal-projecao/coverage.md`/`validation.md`, executar regressões de domínio/liquidações e registrar G2 da extensão008 e matrizes remotas efetivamente aprovadas,sem nova autoridade de saldo/consumo.

**Checkpoint**: Integração usaUS1;T027/T028 podem ser escritos juntos;T031 precedeT032/T033 e G2 de consumo. US2 não depende da interface anual/filtrosUS4.

## Phase 5: User Story 3 — Navegar doze meses com recorrências (Priority: P1)

**Goal**: Comparar12 meses além do ano civil,sem repetir identidades ou gerar dados pela soma.

**Independent Test**: Novembro2026–outubro2027;energia150 virtual versus173,42 confirmada,mês pulado e fatura200+assinatura50;materializar pelo fluxo010 mantém250 uma vez e vigências preservam passado.

### Tests

- [ ] T038 [P] [US3] Escrever `src/domain/finance/painelWindow.test.ts` para1/12meses,virada/bissexto/1900/9999,persistida prioritária,tombstone,encerramento com obrigação confirmada preservada,competência ajustada fora da identidade e estimado/confirmado distinto de virtual/persistido.
- [ ] T039 [P] [US3] Escrever `src/infrastructure/firebase/painelRecorrencias.test.ts` para serviço010 recebendo snapshot/orçamento011,sem reiniciar concessão,descoberta virtual por vigência sobreposta e índice composto,revisões/slots/ciclos006 e exceções de destino. Incluir séries antigas vigentes,séries encerradas fora do recorte e O persistidas posteriores/ajustadas; sem catálogo histórico geral ou virtual antes das dependências.

### Implementation

- [ ] T040 [US3] Implementar janela/componentes estimados e virtuais em `src/domain/finance/painel.ts`, sem segundo calendário/recorrência ou O010 somada fora da fatura; janela completa exige todos meses/fontes no mesmo readTime e soma obedece à cobertura integral.
- [ ] T041 [US3] Ampliar integração mensalT019 nas portas reais010 `src/infrastructure/firebase/recorrenciasQueries.ts` e `src/infrastructure/firebase/recorrenciasSnapshotReader.ts` para janela multimensal, preservando vigência indexada,snapshot/concessão externos e serviço `src/domain/finance/recorrenciasProjection.ts`; escrever regressões nos respectivos `.test.ts` antes. Faixa de cobrança vem do resolvedor010/ciclos006 e persistidas usam consultas próprias,sem filtro pelo padrão atual que oculte história. Não adiar para esta tarefa a descoberta mensal exigidaT019,nem substituir010 por recurrence.ts legado; fonte ausente mantém gate pendente.
- [ ] T042 [US3] Ampliar `src/infrastructure/firebase/painelQueries.ts` e `painelSources.ts` para cursor por fonte/mês/fase,retomada justa,descoberta paginada010,slots009 expandidos,queries vazias008 e limites globais; testar primeiro em `painelWindowQueries.test.ts` que dez janelas não disparam carga histórica ou100 por fonte.
- [ ] T043 [US3] Escrever `src/features/painel/PainelAnualPage.test.tsx` para12meses exatos,avanços1/12,início selecionável,abrir mês/detalhe em até duas ações,contexto preservado,parcialidade por mês e nenhuma escrita pela soma.
- [ ] T044 [US3] Implementar `src/features/painel/PainelAnualPage.tsx`, rota `/app/projecao` em `src/app/router.tsx` e navegação em `AppShell.tsx`, usando indicadores/estados existentes,tabelas simples,virada de ano e identificação de previsão/estimativa sem promessa com app fechado.
- [ ] T045 [US3] Executar cenários reais limitados em `tests/integration/painel-projection.integration.test.ts` após fontes010/cartão habilitadas e autorização: snapshot comum,persistida/virtual/pulo,assinatura semF persistida mas destino resolvido e total antes/depois de materializar pelo comando010 autorizado; registrar manifesto/cobertura em `specs/011-painel-mensal-projecao/validation.md`.
- [ ] T046 [US3] Validar SC003/005/008 em `specs/011-painel-mensal-projecao/coverage.md`/`validation.md`, incluindo100docs/8HTTP,fim do calendário,nenhum total integral com projeção não reconciliada e regressões010 sem escrita011.

**Checkpoint**: Fundação eUS1 antes de integrar. T038/T039 independem da UIUS4;T041/T045 exigem010 real. Alterações nos módulos compartilhados comUS2 são serializadas.

## Phase 6: User Story 4 — Filtrar sem ratear dívida (Priority: P2)

**Goal**: Filtros compatíveis com subtotal de itens separado da dívida/pagamento integral.

**Independent Test**: Fatura1000,alimentação600,transporte400,pagamento300 → subtotal600 e contexto1000/300/700,sem rateio180/420/resultado global fictício;etiquetas sobrepostas não duplicam.

### Tests

- [ ] T047 [P] [US4] Escrever `src/domain/finance/painelFilters.test.ts` para período/titular/cartão/categoria/etiqueta,união/interseção,deduplicação,sem vínculo,receita incompatível com cartão,subtotal versus integral e proibição de rateio por item/categoria/etiqueta em planejamento/caixa.
- [ ] T048 [P] [US4] Escrever `src/infrastructure/firebase/painelFiltersQueries.test.ts` para filtro após orçamento,página vazia com continuação,cursor com consulta/snapshot idênticos,classificação histórica e parcialidade que não desaparece por uma página não conter cartão.

### Implementation

- [ ] T049 [US4] Implementar `src/domain/finance/painelFilters.ts` e integrar `painel.ts`, com aplicavel/subtotal/indisponivel por indicador/motivo,contexto integral separado e nenhum rateio de pendência/liquidação/resultado; não excluir não classificados do total sem filtro.
- [ ] T050 [US4] Integrar filtros em `src/infrastructure/firebase/painelQueries.ts` e `painelSources.ts`,validando IDs próprios e variantes indexadas previstas; filtro local não dispara busca ilimitada para preencher página nem reutiliza cache de outra combinação.
- [ ] T051 [US4] Escrever `src/features/painel/PainelFiltros.test.tsx` para ativos/limpar,múltiplas etiquetas,mudança de base incompatível,rótulo “parte da fatura”,contexto integral e teclado nas visões mensal/12meses,sem zero para indisponível.
- [ ] T052 [US4] Implementar `src/features/painel/PainelFiltros.tsx` e integrar `PainelPage.tsx`, `PainelAnualPage.tsx`, `PainelIndicadores.tsx`, `PainelDetalhe.tsx` e `painelState.ts`,preservando contexto no retorno e incompatibilidade explícita sem ignorar filtro ativo.
- [ ] T053 [US4] Validar filtros reais em `tests/integration/painel-filters.integration.test.ts` após gates/autorização,com titulares/cartões iguais emUIDs distintos,etiquetas sobrepostas e parcial;testar acesso direto/Rules e registrar em `specs/011-painel-mensal-projecao/validation.md` que nenhum filtro mistura usuários.
- [ ] T054 [US4] Conferir FR016–020/SC004 em `specs/011-painel-mensal-projecao/coverage.md` e `validation.md`,executando filtros nas três bases/duas visões com exemplos integral/parcial/inaplicável e nenhuma alocação implícita.

**Checkpoint**: Integração completa usaUS1/US2/US3;T047/T048 isolados usam contratos comuns. Filtros não são necessários para validar consolidadores puros anteriores.

## Phase 7: User Story 5 — Limites, atualização e distinção de saldo (Priority: P2)

**Goal**: Atualizar uma visão coerente por inteiro,com cobertura/limitações,privacidade e resultado diferente de saldo bancário.

**Independent Test**: Alteração de pagamento durante carga/continuação/detalhe nunca mistura tempos em total completo;falha não vira zero;logout limpa cache;sem saldo inicial/movimentos completos,saldo calculado indisponível.

### Tests

- [ ] T055 [P] [US5] Escrever `src/features/painel/painelCache.test.ts` para chaveUID/generation/base/período/filtros/readTime/revisão,TTL50min sem renovação,duas janelas/8MiB,expulsão de inativa,limite sem truncar e ausência de dados/tokens em storage/URL/log.
- [ ] T056 [P] [US5] Escrever `src/infrastructure/firebase/painelCoherence.test.ts` para alteração entre fontes/páginas/refs/detalhe,snapshots antigo/novo,resposta tardia,revogação de permissão,refresh conjunto e inicial vazio/fonte010 pendente sem virtual ou zero falso.

### Implementation

- [ ] T057 [US5] Implementar `src/features/painel/painelCache.ts` e integrar handles/buffers de `src/infrastructure/firebase/painelQueries.ts`,conservando só visões coerentes nos limites e métodos de invalidar/descartar e registrar o cache na limpeza/aborto de sessão já integrada emT011;sem resumos em Firestore ou dados financeiros em localStorage/snapshot de outra sessão.
- [ ] T058 [US5] Consolidar promoção integral em `src/features/painel/painelState.ts` e `src/infrastructure/firebase/painelQueries.ts`,mantendo anterior identificada ou carregamento/parcial até reconciliar;detalhe conserva readTime ou pede refresh conjunto. Escrever regressões adicionais em `painelState.test.ts` antes das transições alteradas.
- [ ] T059 [US5] Escrever `src/features/painel/PainelCoverage.test.tsx` para carregando/parcial/completo/desatualizado/indisponível/erro/vazio,Continuar/Atualizar,cota/índice/schema e saldo opcional indisponível;sem texto de dinheiro disponível garantido ou total definitivo formado por tempos distintos.
- [ ] T060 [US5] Integrar estados/limitações em `src/features/painel/PainelPage.tsx`, `PainelAnualPage.tsx`, `PainelIndicadores.tsx` e `PainelDetalhe.tsx`,com base/instante/fontes pendentes/estimativas e recuperação sem loops;saldo permanece pré-requisitos ausentes sem fonte completa,não criar livro de contas/transferências.
- [ ] T061 [US5] Ampliar a prova concorrente mínimaT025 em `tests/integration/painel-coherence.integration.test.ts` no ambiente autorizado,com segundo cliente e comandos habilitados: falhas/cota/expiração,cache/duas janelas,revogação,troca de sessão e cinco perfis,além de carga/paginação/detalhe. Registrar evidências/limitações em `specs/011-painel-mensal-projecao/validation.md`; esta não é a primeira prova real de concorrência ou a primeira integração de limpeza.
- [ ] T062 [US5] Validar FR021–026/SC007/008 e gatesG0-local/G0-remoto eG3 de coerência/sessão em `specs/011-painel-mensal-projecao/coverage.md`/`validation.md`,executar regressões005/006/fontes integradas e confirmar resultado diferente de saldo bancário;teste não realizado mantém tarefa/gate pendentes.

**Checkpoint**: Integridade básica/parcialidade já existem na fundação/US1. US5 completa cache/lifecycle/matriz de falhas,sem adiar proteção inicial. T055/T056 em paralelo;alterações de módulos compartilhados são sequenciais.

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Fechar métricas,aceitação,regressões e evidências sem promover dependências pendentes.

- [ ] T063 Medir100documentos<=200ms p95 e cache<=100ms p95 em `src/domain/finance/painel.performance.test.ts` e `src/features/painel/painelCache.performance.test.ts`,registrando ambiente/amostra em `specs/011-painel-mensal-projecao/validation.md`;exercitar dez janelas,100docs/8HTTP/8MiB com contadores semPII,sem promessa de latência de rede ou carga massiva remota.
- [ ] T064 Executar ensaio desktop/celular com cinco participantes e registrar SC005/006 em `specs/011-painel-mensal-projecao/validation.md`:quatro de cinco distinguem bases/resultado versus saldo em até3min,duas ações até detalhe,teclado/cabeçalhos/estados sem depender de cor;corrigir arquivos correspondentes de `src/features/painel/` antes de aprovar.
- [ ] T065 Criar conjunto sintético revisado em `src/domain/finance/painelReconciliation.test.ts` e relatório em `specs/011-painel-mensal-projecao/validation.md`,comparando centavo a centavo com recorte conferido da planilha e anos/origens/estimativas/ajustes/divergências documentados;sem importação automática ou inferência de pagamento/valor ausente.
- [ ] T066 Executar `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` e grupo painel de `vitest.integration.config.ts`,registrando resultados em `specs/011-painel-mensal-projecao/validation.md` e corrigindo falhas;falta de ambiente/autorização/teste não contaPASS e comandos não publicam Rules/índices implicitamente.
- [ ] T067 Atualizar `specs/011-painel-mensal-projecao/quickstart.md`, `research.md`, `plan.md` e `docs/firestore-rules-changes.md` com contratos/consultas entregues,status de arquivos completos,schema008/legado,índices,rollback e limites reais;manter três bases distintas e não declarar trabalho futuro concluído.
- [ ] T068 Auditar27FR/oitoSC e G0–G3 em `specs/011-painel-mensal-projecao/coverage.md`/`validation.md`,habilitar somente capacidades comprovadas em `src/features/painel/availability.ts` com `availability.test.ts` e conferir este `specs/011-painel-mensal-projecao/tasks.md`;conclusão integral exige dependências,Rules/índices,provas remotas e ensaio assistido aprovados,sem limpeza automática.

## Dependencies & Execution Order

### Grafo

```text
T001 → (T002 || T003)
 → Fundação T004–T014 [G0-local]
   → US1 T015–T026 [G0-remoto antes de habilitação;G1/G2;MVP mensal]
     ├→ US2 T027–T037 [competenciasConsumo008;G2 consumo]
     └→ US3 T038–T046 [010 real/orçamento compartilhado]
       US1+US2+US3 → US4 T047–T054
       US1+US2+US3+US4 → US5 T055–T062
         → Fechamento T063–T068 [G3/cobertura integral]
```

US2/US3 compartilham módulos;fluxo padrão segueIDs sequenciais. Testes isoladosT027/T028 eT038/T039 podem usar fixtures após fundação,sem depender da UI de outras histórias. O grafo é de integração,não permissão de mutação remota concorrente.

### Dependências externas

- T019 exige protocolos005financeiro/007/008/009/010 e leitores reais com snapshot externo;retomar tarefas de origem correspondentes antes de integrar.006 calendário não comprova fatura financeira.
- T031 exige008 implementada e reabre prova de schema/bytes/acessos/expressões/cobertura de legados. Não há autorização de migração/backfill.
- T041/T045 exigem010 real e suaT007 comprovada;recurrence.ts legado não substitui serviço010.
- T025/T036/T045/T053/T061/T066 exigem projeto/configuração/autorização/fontes ativas pertinentes. T013 exige somente configuração local de testes; credenciais remotas não são seu pré-requisito. Fixtures locais não aprovam integração;manifesto pendente não conclui tarefa dePASS.
- T020/T033 geram arquivos completos. Publicação requer autorização e compatibilidade;matriz remota aprova somente hashes/índices ativos efetivamente testados.

### Ordem interna

Testes antes de implementação → domínio/tipos → mapper/adapters/consultas → testesUI → UI/rotas → prova real → checkpoint. Mesmos arquivos são serializados;nenhuma tarefa[P] escreve o mesmo arquivo que seu par. Dependência pendente mantém integração bloqueada,sem substituir por simulação.

## Parallel Execution Examples

| Fase/história | Pode executar junto | Pré-requisito |
| --- | --- | --- |
| Setup | T002 evidências eT003 matriz | T001 concluída |
| Fundação | T006 testes transporte eT008 testes coordenador/fontes | T005;T007/T009 seguem dependências |
| US1 | T015 domínio eT016 mapper/fontes | FundaçãoG0-local |
| US2 | T027 domínio eT028 fontes/bases | Contratos comuns/contextoUS1 |
| US3 | T038 janela eT039 portas010 | Contratos comuns;mock não habilita010 |
| US4 | T047 filtros eT048 queries | Contratos comuns |
| US5 | T055 cache eT056 coerência | Snapshot/estado estabilizados |

Exemplos não autorizam subagentes ou testes remotos concorrentes. Apenas arquivos distintos com pré-requisitos satisfeitos são paralelizáveis.

## Implementation Strategy

1. MVP:Setup+fundaçãoG0-local+US1. Provar números/detalhe/parcialidade;MVP integral exige capacidadesG1/G2 eT025. G0-remotoT025 e limpeza fundacionalT011 são obrigatórios antes do MVP;sem fontes reais,apenas demo/recorte explicitamente parcial,sem anunciar resumo completo.
2. Acrescentar US2 bases,US3 janela/projeção,US4 filtros eUS5 robustez final,validando o teste independente de cada história. Snapshot,isolamento e ausência de zero falso já são obrigatórios na fundação/US1.
3. Preservar gates por fonte,versão e evidência em validation.md. Extensão008/mudança de Rules invalida provas pertinentes até regressão;flag não substitui teste.
4. FecharG3,planilha revisada,acessibilidade,métricas,verificações e arquivos completos. Rollback preserva fatos/controles/tombstones;nenhuma publicação/limpeza implícita.

## Cobertura da decomposição

| Requisitos | Tarefas principais |
| --- | --- |
| FR001–003/015 | T015–T026,T038–T046 |
| FR004–011 | T015–T021,T027–T037 |
| FR012–014 | T019,T038–T046 |
| FR016–020 | T027–T037,T047–T054 |
| FR021–024 | T004–T014,T021,T055–T062 |
| FR025–027 | T012/T013,T020/T025,T033/T036,T045/T053/T061,T063–T068 |
| SC001/002 | T015–T037,T065 |
| SC003/005/008 | T038–T046,T055–T064 |
| SC004/006/007 | T047–T062,T064 |

68tarefas:Setup3,Fundação11,US1=12,US2=11,US3=9,US4=8,US5=8,Fechamento6. IDs sequenciais,17 concluídas e51 pendentes,formato checklist e caminhos explícitos. Hooks before_tasks/after_tasks ausentes. Próximo comando sugerido:speckit-analyze.

## Correções da análise aplicadas

C1: limpeza/abortoT011 antesG0-local. I1: T013 local libera desenvolvimento isolado e T025 remoto controla habilitação. I2: concorrência mínimaT025 antesMVP,T061 amplia. U1: T016/T019/T039/T041 cobrem vigência indexada,metadados protegidos e persistidas independentes. U2: T031 fixa tabela0/1,canonicidade e negativas. IDs reordenados sequencialmente após mover antigaT058 para fundação;naquela correção documental as68tarefas estavam pendentes,com Fundação11 eUS5=8. A execução posterior está registrada abaixo e em validation.md.

## Incremento implementado em20/10/2026

T001–T015,T017,T018 concluídas:fundaçãoG0-local,teste/cálculo puro do planejamento mensal e adapters005/calendário006. T016 permanece aberta:negativas de fontes não habilitadas e mapeamento005/006 estão testados,mas os casos positivos de revisão007,mapa009,controle008 e item010 ainda dependem dos módulos reais e da provaT019. T019 bloqueada: contratos/repositórios007–010 ainda não existem emsrc e gates de origem não estão aprovados. Não gerar permissões novas ou controles financeiros substitutos para contornar essa ausência. T020–T068 não concluídas; G0-remoto/G1/G2/G3 pendentes. Sem interface de painel habilitada.

## Continuidade21/10/2026

O bloqueio de ausência absoluta dos módulos foi parcialmente resolvido sob autorização de escopo/ordem: há código local007–010, com detalhamento em validation.md. T019 e T016 continuam pendentes em seus critérios integrais; fontes/escritores/Rules/provas remotas completos ainda faltam. O consolidarJanelaPlanejamento em painelWindow.ts compõe12 meses consecutivos no mesmo SnapshotPainel; cada mês mantém cobertura/indicadores próprios e dados incompletos não viram total completo. Ainda não há composição anual real010/UI nem conclusão de US3. Não foram promovidas capacidades de produção.

## Bloco3 priorizado —21/10/2026

Partes locais de T027/T029/T034/T035/T040/T043/T044/T055/T057/T059/T060 implementadas: consolidação de caixa/consumo e janela das três bases, indicadores/detalhe, rotas mensal/anual, navegação e cache independente. As tarefas integrais continuam abertas por integração de leitores/mappers010/008, filtros, controlador/cache global, aceitação remota e interação ainda ausentes. As rotas estão visíveis, mas não habilitam consultas financeiras de produto; apresentam indisponível. Ver validation.md e implementation-blocks.md. Regressão485 testes/121 arquivos PASS; lint/build PASS, sem mudança das Rules/índices raiz ou capacidades.
