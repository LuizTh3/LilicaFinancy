# Implementation Plan: Painel mensal e projeção de 12 meses

**Branch**: `develop` (Git); contexto lógico `011-painel-mensal-projecao` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: `specs/011-painel-mensal-projecao/spec.md`, incluindo decisão A: totais completos e detalhes refletem o mesmo momento de consulta.

## Summary

Substituir a área inicial autenticada por painel mensal e tabela navegável de12 meses. Consolidar autoridades por base: receitas e obrigações externas; uma contribuição de fatura líquida projetada por cartão/competência; consumo na origem; caixa somente por fatos. Reutilizar dinheiro/calendário/liquidações003 e projeção010, sem duplicação de parcelas ou criação de dados por consulta.

Um coordenador de snapshot autenticado adquire readTime de servidor e o injeta em todos os leitores tipados, inclusive referências, ausência de ocorrência, projeção e detalhes. Paginação tem orçamento global e cache somente em memória. Visão completa é substituída integralmente depois de reconciliar a nova, nunca fonte a fonte.

**Estado após incremento20/10/2026**: FundaçãoG0-local implementada e testada,mais cálculo puro mensal e adapters005/calendário006.17/68 tarefas concluídas;T016 parcial eT019 bloqueada por módulos/gates007–010 ausentes. G0-remoto/G1/G2/G3 pendentes; nenhuma interface ou consulta de produto011 habilitada. Nenhuma Rule/índice publicado ou fixture remota criada. Detalhes e provas efetivamente executadas em validation.md. Fontes não disponíveis não viram zero.

## Technical Context

**Language/Version**: TypeScript~6.0.2, Node>=24.12.0; packageManager npm11.18.0.

**Primary Dependencies**: React19.2.8 compatível, Vite8.3.0, React Router7.18.4, Firebase13.0.0; versões de package.json, sem atualização ou biblioteca visual nova. REST Firestore com Firebase ID token para leitura consistente, SDK cliente para autenticação e testes. Serviço trusted-api002 não participa de finanças.

**Storage**: Coleções existentes/planejadas sob users/{uid}; nenhuma coleção, total ou fato financeiro novo de011. Modelos derivados e cache em memória; Firebase já usa memoryLocalCache. Índices serão entregues completos na implementação quando consultas forem habilitadas.

**Testing**: Vitest4.1.12 para domínio, contratos, readers e interface; testes colocalizados; typecheck, oxlint e build existentes. Integração pequena com cliente autenticado real, A/B/admin/pendente/visitante, sem Admin/emulador como prova. Dados/creds remotos não lidos neste planejamento.

**Target Platform**: Web responsiva desktop/celular, navegação e tabelas por teclado.

**Project Type**: Aplicação web única, domínio puro e infraestrutura Firebase isolada.

**Performance Goals**: Abrir mês/detalhe em até duas ações conforme SC-005. Meta local: recomputar fixture de100 documentos em até200ms p95 e reapresentar cache válido em até100ms p95, medidos em execução de produção no ambiente documentado; metas não garantem latência de rede. Cada rodada no máximo100 documentos físicos,50 por query,8 por batch exato sujeito ao custo real de Rules,8 requisições HTTP. Timeout20s por requisição, sem repetição automática ilimitada.

**Constraints**: Janela<=12 meses, TTL de snapshot50min a partir de readTime, sem exigir PITR/Blaze. Cache de até duas janelas/8MiB serializados estimados por sessão; ao exceder, retornar limite sem descartar cobertura silenciosamente. Descartar janela menos recente inativa antes de admitir outra; sem guardar histórico ilimitado. Nenhuma promessa de processamento fechado, saldo bancário ou visão integral com dependência ausente.

**Scale/Scope**: Um UID por sessão; cinco histórias,27 FR e oito SC; três bases, mês/12 meses, filtros e drill-down. Saldo de conta não é implementado nesta entrega inicial por falta de fonte completa; retorno explícito indisponivel/prerequisitosAusentes satisfaz condição opcional de FR-021. Sem novos comandos de transferência ou liquidação.

## Constitution Check

Gates avaliados antes da pesquisa e novamente após desenho. Sem exceção constitucional.

| Gate | Antes | Após desenho | Evidência/condição |
| --- | --- | --- | --- |
| Domínio independente | PASS | PASS | Consolidação pura e adapters tipados, sem SDK em domain |
| Fonte única/rastreabilidade | PASS | PASS | Uma contribuição por autoridade; contratos de reconciliação e detalhes |
| Isolamento | PASS | PASS no desenho | UID/generation/token e allowlists; prova real de cada fonte continua necessária |
| Simplicidade/gratuito | PASS | PASS | Sem backend financeiro, Functions, PITR obrigatório ou nova biblioteca |
| Segurança/entrega completa | PASS | PASS no desenho | Contrato de Rules/índices/rollback; publicação separada |
| Três bases e datas | PASS | PASS | Competência não substituída por vencimento; consumo e caixa distintos |
| Testes sem emulador | PASS | PASS | Testes locais e matriz remota autorizada, sem anunciar resultados futuros |
| Coerência A | A pesquisar | PASS de desenho | readTime comum, paginação/detalhe fixos e troca integral de visão |

### Gates executáveis da implementação

- G0-local: provar contratos, reader/coordenador com transporte controlado, consultas vazias, snapshot único, teto100/8HTTP, expiração, limpeza e aborto na troca de sessão; regressões005/006. Libera desenvolvimento puro e interface com fixtures, sem habilitar consultas de produto. Falha técnica é ERROR até correção.
- G0-remoto: provar com cliente autenticado o snapshot comum, inclusive vazio, continuação e detalhe, e alteração concorrente por segundo cliente durante carga, paginação e detalhamento. É pré-requisito de habilitação das consultas reais e aprovação do MVP mensal. Configuração/autorização ausente mantém somente essa prova e a entrega real pendentes, sem bloquear domínio ou interface isolados após G0-local.
- G1: manifestar disponibilidade por fonte, schema e versão de contrato.005 criação habilitada não comprova pagamentos/caixa;006 calendário não comprova conteúdo.007/008/009/010 devem ter readers, protocolos, Rules/índices e testes reais compatíveis. A descoberta virtual010 deve usar sobreposição de vigência indexada e prova de cobertura dos metadados, sem percorrer todas as séries históricas. Na ausência, PENDENTE; nunca sintetizar dados ou habilitar total integral.
- G2: reconciliação das autoridades007/008/010, inclusive G010.calendarioVersion e item010 cuja capacidade reside na ocorrência; não instalar candidata010 sobre protocolos008 não comprovados. Divergência de controle/item é ERROR para indicador dependente. Incluir extensão derivada competenciasConsumo no evento008, com validação exata, compatibilidade e prova de orçamento conforme data-model.md; sem isso, consumo008 completo permanece indisponível.
- G3: consultas/índices completos, segurança A/B/admin/pendente/visitante, testes de concorrência de leitura e revisão assistida da planilha. Publicar somente sob autorização própria, com backup e rollback preservando fatos. G1/G2 pendentes impedem alegar entrega integral.

## Project Structure

### Documentation (this feature)

```text
specs/011-painel-mensal-projecao/
  spec.md
  plan.md
  research.md
  data-model.md
  contracts/consolidation.md
  contracts/queries.md
  contracts/security.md
  contracts/ui.md
  quickstart.md
  checklists/requirements.md
  tasks.md                         # fase posterior, não criado por plan
```

### Source Code (repository root)

Caminhos novos são propostos, não arquivos já implementados.

```text
src/domain/finance/
  painel.ts                        # consolidadores puros por base
  painelFilters.ts                 # aplicabilidade e subtotais
  contracts/painel.ts               # portas, snapshot, cursores, indicadores
  *.test.ts                        # testes novos colocalizados
src/infrastructure/firebase/
  financeiroSnapshotReader.ts       # transporte privado reutilizável, sem query livre
  painelQueries.ts                  # scheduler e snapshot único
  painelMapper.ts                   # normalização de contribuições
  painelSources.ts                  # adapters e disponibilidade explícita
  externosSnapshotReader.ts         # compatibilidade005 preservada
  externosQueries.ts
  faturasQueries.ts                 # comandos/prévias006 preservados
src/features/painel/
  PainelPage.tsx
  PainelAnualPage.tsx
  PainelIndicadores.tsx
  PainelDetalhe.tsx
  PainelFiltros.tsx
  painelState.ts
  painelCache.ts
  availability.ts
src/app/
  router.tsx
  AppShell.tsx
  session/SessionProvider.tsx
  session/financeSession.ts
src/domain/finance/recorrenciasProjection.ts # dependência010, ainda ausente
src/infrastructure/firebase/{parcelados,recorrencias,liquidacoesFaturas}* # dependências, não criadas por este plano
tests/integration/painel*.integration.test.ts
tests/integration/support/painelFixtures.ts
tests/integration/support/environment.ts
firestore.rules
firestore.indexes.json
docs/firestore-rules-changes.md
```

**Structure Decision**: Manter aplicação única e módulos existentes. Extrair apenas transporte consistente compartilhado, preservando portas públicas005/006 e sem repositório financeiro genérico. Readers de dependências devem aceitar snapshot/orçamento externos; não fabricar cursores antigos para injetá-los.

## Phase 0 — Pesquisa concluída

[research.md](research.md) resolve snapshot, fontes reais, bases, leitura limitada, filtros e segurança. Pesquisa delegada somente leitura conforme skill; documentação atual consultada via Context7 e referência REST oficial. Nenhuma fonte privada do projeto foi enviada a serviço de documentação.

## Phase 1 — Desenho concluído

[data-model.md](data-model.md) define modelos em memória e invariantes. Contratos cobrem consolidação, consultas/índices, segurança e interface. [quickstart.md](quickstart.md) descreve provas futuras e seus pré-requisitos. Não há decisão técnica em aberto; disponibilidade de fontes é gate de execução conhecido, não hipótese aprovada.

## Sequência para decomposição posterior

1. Inventário/evidências e testes puros de três bases, filtros, precisão e rastreabilidade.
2. Testes do snapshot/coordenador, limpeza/aborto de sessão e extração compatível005; G0-local antes de desenvolvimento isolado das histórias. G0-remoto antes de habilitar consultas reais e aprovar o MVP, incluindo a prova mínima concorrente; US5 amplia as regressões.
3. Adapters por fonte após G1; serviço010 recebe o mesmo snapshot; G2 antes de faturas completas.
4. Painel mensal, janela12 meses e detalhe coerente; cache/limpeza e estados parciais.
5. Arquivos completos de Rules/índices quando necessários, revisão e publicação autorizada; G3, regressões, ensaio assistido e reconciliação da planilha.

## Complexity Tracking

Sem violação ou exceção. O coordenador é necessário à decisão A e substitui composição incorreta de leituras independentes; não adiciona agregação persistida nem backend. Plano não cria tasks, publica Rules ou declara a feature implementada. Hooks before_plan/after_plan ausentes.
