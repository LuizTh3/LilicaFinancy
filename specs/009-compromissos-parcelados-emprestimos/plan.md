# Implementation Plan: Compromissos parcelados externos e empréstimos manuais

**Branch**: `develop` (checkout real); feature lógica `009-compromissos-parcelados-emprestimos` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)

**Input**: Especificação009 com decisão A de FR-014a e correções explícitas de FR-011/018; constituição1.2.0. Replanejamento preserva os artefatos existentes e não reinicializa a feature.

## Summary

**Atualização 26/10/2026:** aprovado e implementado localmente o protocolo S/R/V de [validation-witness-proposal.md](contracts/validation-witness-proposal.md). Substitui as contagens históricas de criação/substituição abaixo: criação máxima 18; substituição máxima 21, rejeitada integralmente. A candidata não foi aprovada na avaliação oficial; produção continua desabilitada. Ver [evidências atuais](witness-status-2026-10-26.md).

**Validação real25/10/2026:** candidata compilada, mas smoke central falhou na criação1/1 e5/10 por exceder1000 expressões; recibos isolados passaram. T007 está ERROR, substituindo a anterior indisponibilidadeHTTP503. Não habilitar produção. Detalhes em validation.md e rules-evaluation-summary.json.

Cadastrar séries externas finitas, completas ou em andamento, incluindo empréstimos com cronograma manual. Cada série guarda um mapa fixo de até12 obrigações; pagamentos, reversões e revisões ficam em eventos imutáveis separados. A identidade (serieId,ordinal) preserva pagamentos individuais sem exigir um documento-filho por parcela. Reutilizar dinheiro, calendário, divisão e liquidações do domínio; não alterar schema de receitas/despesas avulsas005 nem domínio de cartões006–008.

**Resultado: planejamento documental concluído, sem violação constitucional identificada no desenho corrigido.** A inspeção e a contagem local sustentam criação15, edição16 e substituição18 acessos máximos no grafo descrito, sem cache. Isso remove a inviabilidade aritmética do grafo anterior; não comprova Rules compiladas, limite de expressões, bytes reais ou persistência remota. T005–T007 continuam gates de implementação antes das tarefas dependentes; perfil remoto009 continua não habilitado. Não confundir conclusão da fase de desenho com aprovação das verificações futuras.

## Technical Context

**Language/Version**: TypeScript~6.0.2; Node>=24.12.0; npm11.18.0, conforme package.json existente.

**Primary Dependencies**: React^19.2.8, React Router7.18.4, Firebase13.0.0, Vite^8.3.0. Sem nova biblioteca, backend financeiro, Cloud Functions ou uso da exceção restrita002 para finanças.

**Storage**: Firestore privado sob users/{uid}: seriesParceladas (agregado finito), operacoesParceladas (evento/recibo), reversoesParceladas e vinculosReceitasEmprestimos. Firebase Authentication identifica proprietário; titular financeiro não é login. Receita vinculada continua na005.

**Testing**: Vitest4.1.12, testes puros/contratos/mappers/estado, typecheck/lint/build; avaliação oficial de Rules e depois SDK autenticado no projeto real autorizado, sem emuladores. Nesta fase foram executadas apenas verificações documentais e o script de orçamento, não testes financeiros/remotos.

**Target Platform**: Web desktop/celular, pt-BR/BRL; datas gregorianas1900–9999, fuso do perfil inicialmente America/Rio_Branco. Reversão de erro mantém conta/data originais e não é devolução econômica.

**Project Type**: Aplicação web com domínio puro, portas específicas, adaptadores Firebase e leitor REST autenticado por ID token do usuário; sem token administrativo.

**Performance Goals**: Páginas de apresentação com1–50 parcelas, consultas físicas com até50 séries e no máximo duas páginas físicas por ação de listagem mensal. Não varrer todo o mês para preencher uma página quando filtro local for raro: devolver parcial/vazia com cursor e motivo. SC-007 continua sendo quatro de cinco participantes em até três minutos. Sem SLA de rede inventado ou capacidade gratuita ilimitada.

**Constraints**: N original1–12; P1–N; até12 novas obrigações; até32 mutações,32KiB/documento,1MiB/comando,18 acessos internos por conjunto/8 por escrita e até1000 expressões. Sem cache presumido, truncamento, geração multietapas ou retirada de validações. Tamanho e expressões ainda devem ser comprovados no candidato executável. Original desconhecido permanece ausente.

**Scale/Scope**: Uma série é a fronteira de concorrência: qualquer revisão, mesmo pagamento de outra posição, invalida prévia obsoleta. Referências de categoria/titular/conta/etiquetas são comuns na criação, inclusive no modo explícito; valores/datas/competências podem variar por posição. Edição em lote usa patch comum de referências; obrigações não alvo preservam referências históricas. Cardinalidade de receita0..1 por ponta conformeFR-011; sem inferência de dinheiro ou renegociação de parcial real.

## Constitution Check

| Gate | Pré-pesquisa | Pós-desenho | Evidência e critério futuro |
| --- | --- | --- | --- |
| G0: domínio independente e stack gratuita | PASS | PASS de desenho | Funções puras reutilizadas, nenhuma dependência paga ou backend financeiro novo. |
| G1: consistência, história e orçamento | Grafo antigo descartado | PASS documental; prova executável pendente | Série finita + recibo recíproco, cálculos declarados até18; T005–T007 devem comprovar todos os ramos, expressões e tamanhos. |
| G2: isolamento e enforcement | A revisar | PASS documental; prova executável pendente | own por caminho, perfil nas leituras e no recibo novo obrigatório; teste oficial e SDK por cinco perfis antes de habilitar. |
| G3: dinheiro/calendário e sem dupla contagem | PASS | PASS de desenho | Divisão exacta, modo explícito, pagamento separado, ausência preservada e read models por parcela. |
| G4: Rules/índices completos e testes sem emuladores | PASS | PASS de planejamento | Entrega completa, rollback e publicação segundo autorização vigente; nenhum deploy desta fase. |
| G5: escopo/clarificações | PASS | PASS | FR-014a, cardinalidadeFR-011 e exceçãoFR-018 respeitados; schemas005 preservados. |

PASS documental significa decisões e obrigações de validação definidas, não teste já aprovado. Não existe dispensa de G1/G2 executáveis: as condições de tasks.md permanecem. Falha concreta do candidato torna o gate ERROR e exige revisão; ausência de execução é PENDENTE, nunca prova de erro ou sucesso. Não há justificativa para alterar a constituição, elevar limites ou reduzir os fluxos obrigatórios5/10 e substituição mínima.

## Project Structure

### Documentation (this feature)

```text
specs/009-compromissos-parcelados-emprestimos/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── tasks.md                        # existente; não recriado pelo plan
├── remediation.md
├── validate-design-budget.ps1
├── checklists/requirements.md
└── contracts/
    ├── commands.md
    ├── security.md
    └── ui.md
```

Execução posterior: candidato completo e134 casos gerados; verificações locais em local-validation.json. Avaliação oficialT007 bloqueada por auto-review até autorização explícita de envio de fonte/fixtures ao destino. Detalhes em validation.md; sem compilação, resultado remoto ou publicação.

### Source Code (repository root)

```text
src/domain/finance/
  money.ts, calendar.ts, installments.ts, settlement.ts, projections.ts
  parcelados.ts, parceladosValidation.ts, parceladosEdit.ts, parceladosAudit.ts # propostos
  contracts/commands.ts, contracts/parcelados.ts                              # último proposto
src/infrastructure/firebase/
  externosRepository.ts                         # receita via porta005 existente
  parceladosMapper.ts, parceladosRepository.ts   # propostos
  parceladosQueries.ts                          # proposto
  parceladosSnapshotReader.ts                   # proposto, sem ampliar leitor005
src/features/parcelados/                         # proposto
  ParceladosPage.tsx, ParceladoForm.tsx, ParceladoDetailPage.tsx
  CronogramaPreview.tsx, ParcelaPagamentoForm.tsx, ParcelaEditForm.tsx
  parceladosState.ts, useParcelaIntent.ts, useParceladosRepository.ts
src/app/router.tsx
src/app/AppShell.tsx
src/app/session/financeSession.ts
src/domain/finance/operationBudget.ts
firestore.rules
firestore.indexes.json
docs/firestore-rules-changes.md
tests/integration/parcelados*.integration.test.ts # propostos
tests/integration/support/parceladosFixtures.ts  # proposto
tests/integration/support/environment.ts
vitest.integration.config.ts
```

**Structure Decision**: Adaptador próprio para série/agregado e leitor fechado próprio para as novas coleções. O leitor005 existente restringe coleções/filtros e não pode ser usado como se já suportasse array-contains. Reaproveitar padrões e helpers neutros somente se não ampliar a superfície005. Nenhum fato duplicado em operacoesExternas.

## Phase 0 — Research

Concluída em [research.md](research.md). Decisões: agregado finito, fonte única por obrigação, evento/recibo imutável, referências comuns na criação, leitor autenticado com snapshot fixo, paginação limitada e auditoria por continuidade de revisões. Auditoria independente de leitura e documentação atual via Context7 sustentam as escolhas. Nenhum NEEDS CLARIFICATION funcional permanece; evidência executável é trabalho explícito da implementação.

## Phase 1 — Design & Contracts

[Modelo](data-model.md) define entidades, transições, consultas, reconstrução e rollout. [Comandos](contracts/commands.md), [segurança](contracts/security.md) e [interface](contracts/ui.md) definem entrada/resultado, intenção, propriedades e leitura. [Quickstart](quickstart.md) define pré-requisitos, comandos reais e cenários verificáveis sem código de implementação.

Sequência futura: conferir desenhoT004; candidato/casos/provaT005–T007; contratos e adaptadores; testes locais; Rules completas e avaliação; publicação somente autorizada; SDK real; interface e aceitação. MVP é cadastroUS1 com prévia/recarga e proteção básica, nunca apenas1/1 em substituição ao requisito5/10. Atualizar tasks.md somente para harmonização dos caminhos e critérios descobertos, preservando50 IDs e checkboxes pendentes.

## Complexity Tracking

Sem exceção constitucional. Tradeoffs aceitos: mapa fixo até12 serializa gravações da mesma série; expansão local exige cursor de posição e leitura limitada; eventos ordenados por timestamp servem navegação, mas reconstrução financeira exige cadeia de revisões completa no mesmo snapshot. Referências novas comuns por comando mantêm orçamento; valor e calendário individuais continuam disponíveis. Grafo por documento-filho, cache presumido, eventos duplicados, aumento de cotas e backend financeiro foram rejeitados.

## Estado após execução solicitada de T005–T007

T005 concluída no escopo de construção/verificações locais; prova executável concentrada em T007 para remover dependência circular; T006 concluída com134 casos; T007 aguardando autorização de envio à API oficial após rejeição automática. Não habilitar perfil009 ou tarefas dependentes. A rejeição é de autorização de divulgação da fonte, não evidência de falha técnica do candidato. A compatibilidade de novos marcadores de primeiro uso nos leitores de cadastros é requisito adicional explícito em T009. Ver validation.md.


Implementação local: T001–T006 concluídas; T007 mantém G1/G2 pendentes e impede T008–T050. Matriz detalhada em coverage.md. Nenhuma mudança remota autorizada por esta atualização.

