# Implementation Plan: Compras no cartão e parcelas

**Branch**: `develop` (checkout real; setup-plan identificou a feature lógica `007-compras-cartao-parceladas`, sem criar branch) | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: `specs/007-compras-cartao-parceladas/spec.md`, incluindo decisão A de bloquear cadastro retroativo em fatura fechada sem pagamento.

## Summary

Preparar cadastro, prévia obrigatória, edição/cancelamento integral e consulta de compras de cartão. Domínio puro calcula centavos e calendário; portas específicas isolam Firestore; compra, cronograma e recibo compartilham confirmação atômica. Parcelas não têm vencimento autoritativo duplicado nem pagamento individual. Revisões de cronograma preservam histórico e impedem reciclagem de identidades.

**Resultado da pesquisa: desenho documentado, com ERROR no gate de viabilidade para habilitação integral.** A implementação atual de faturas006 está bloqueada por avaliação oficial acima de 1000 expressões. Além disso, o grafo de referência007 não demonstra um comando de múltiplas parcelas dentro do orçamento18/8 sem cache. Não classificar este plano como pronto para implementar/habilitar a funcionalidade completa. O primeiro trabalho necessário é resolver os gates G0/G1 abaixo, mantendo todas as garantias; não substituir múltiplas parcelas por MVP1/1 silenciosamente. FR-015 permite rejeitar combinações acima do orçamento, mas não transforma rejeitar todos os parcelamentos em entrega do requisito principal.

## Technical Context

**Language/Version**: TypeScript ~6.0.2; Node>=24.12.0; npm11.18.0, conforme package.json.

**Primary Dependencies**: React ^19.2.8, React Router7.18.4, Firebase13.0.0 e Vite ^8.3.0 existentes. Não acrescentar dependência, backend financeiro ou serviços pagos.

**Storage**: Cloud Firestore Standard privado em users/{uid}; Authentication existente. Compra, parcelas, recibos e controles por fatura separados; histórico em documentos imutáveis, sem array crescente.

**Testing**: Vitest4.1.12 para domínio/contratos/adaptadores; typecheck/lint/build; avaliação oficial das Rules e pequena suíte de SDK cliente real quando autorizadas e implementadas. Sem emuladores.

**Target Platform**: Web responsiva desktop/celular, pt-BR/BRL, datas gregorianas1900–9999, perfil inicialmente America/Rio_Branco.

**Project Type**: Aplicação web existente com domínio independente de React/SDK.

**Performance Goals**: Consultas por cartão/período, página1–50 e cronograma corrente de até12 posições. Dois cliques do item até qualquer fatura posterior. SC-001/008 medidos com cinco participantes; não criar SLA de rede não solicitado.

**Constraints**: 12 parcelas nominais;32 mutações;18 acessos documentais de Rules totais e8 por operação, sem presumir cache;1000 expressões;32KiB/documento e1MiB/comando; comando canônico16KiB. Todos os limites devem ser satisfeitos simultaneamente. Offline não confirma escrita. Rejeição integral se exceder orçamento.

**Scale/Scope**: Novas compras completas1/1–12/12; cinco etiquetas; correção de compra inteira antes do fechamento e sem histórico de pagamento. Sem migração, juros, pagamentos, simulador autônomo, correção de histórico protegido ou protocolo multietapas. Não há requisito de usuário concorrente em massa nem teste de carga neste plano.

## Constitution Check

Avaliação inicial e reavaliação após desenho:

| Gate | Inicial | Pós-desenho |
| --- | --- | --- |
| I — domínio independente | PASS | Funções puras, portas compras específicas e relógio/fuso explícitos. |
| II — fonte de verdade | PASS | Compra=consumo; parcelas=planejamento; pagamentos=caixa; vencimento da fatura; exigibilidade depende da revisão vigente. |
| III — isolamento | PASS documental | UID, perfil/cutoff e referências privadas; sem bypass administrativo. Prova remota007 ainda inexistente. |
| IV — simplicidade/cotas | Pesquisa necessária | ERROR G1: não há orçamento comprovado para parcelamento no desenho de referência; proibido habilitar por hipótese. |
| V — segurança | Pesquisa necessária | ERROR G0/G1: faturas006 já falharam avaliação; novos grafos só podem ser habilitados após controles positivos e negativos reais. |
| §4 — regras financeiras | PASS | Resto determinístico, meses consecutivos, sem caixa implícito, bloqueio de fechadas/com pagamento. |
| §5 — atomicidade/histórico | PASS documental | Revisões, recibo recíproco, controles comuns e rejeição de excesso; sem séries parciais. |
| §6 — Rules/índices | PASS | Exigir arquivos completos, nota e reversão na implementação; não publicar nesta fase. |
| §7 — testes | PASS | Locais e cliente real autorizado, sem emuladores; não alegar avaliação oficial executada. |
| §8–10 — UI/governança | PASS | Fluxos acessíveis; harmonizações003/006 explícitas; nenhuma exceção constitucional nova. |

### Gates impeditivos e critérios de saída

- **G0 — faturas006**: refatorar as Rules de calendário/recibo mantendo provas de vizinhança, compilar e avaliar fonte integral abaixo dos limites, com positivo legítimo e negativos por invariantes; executar matriz006 antes de liberar faturas. Evidência atual em `specs/006-cartoes-ciclos-faturas/validation.md`, trecho final; `src/features/cartoes/availability.ts` ainda false. Não remover flag como conserto.
- **G1 — parcelamento007**: apresentar grafo concreto e orçamento sem cache que aceite pelo menos um caso real com N>=2 e demonstre rejeição prévia dos máximos inviáveis; provar também criação, edição e cancelamento elegíveis e cinco etiquetas quando aceitas. Fonte oficial deve aceitar controles positivos e negar violações pelo motivo correto, sem depender de estouro incidental. Se nenhum desenho satisfizer a stack/requisitos, registrar o impasse e solicitar decisão de escopo em etapa própria; não pressupor autorização para aumentar limites, embutir toda a série ou usar backend.
- **G2 — autorização do dia e pagamento**: comprovar nas Rules o bloqueio por request.time e controle monotônico de pagamento. Flag fornecida pelo formulário, clock do navegador ou consulta vazia de pagamentos não são provas. Controle desconhecido não equivale a sem pagamento.
- **G3 — release**: perfis específicos007 só passam de naoHabilitado para validadoNoProjeto com evidência própria. Fonte/índices ativos, autorização vigente de publicação, rollback e matriz real são requisitos, não parte executada deste plano.

Sem dispensas constitucionais. G0/G1 impedem declarar o planejamento integral viável ou avançar diretamente à implementação da funcionalidade completa; domínio/contratos e experimento de orçamento podem ser trabalhados sem habilitar escrita financeira.

## Project Structure

### Documentation (this feature)

```text
specs/007-compras-cartao-parceladas/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── commands.md
│   ├── security.md
│   └── queries-ui.md
└── checklists/requirements.md
```

tasks.md não é criado por este comando.

### Source Code (repository root)

Alvos de mudança futura, sem arquivos de implementação criados nesta fase:

```text
src/domain/finance/
├── compras.ts, compras.test.ts
├── identity.ts, installments.ts, projections.ts, operationBudget.ts
└── contracts/compras.ts, compras.contract.test.ts
src/infrastructure/firebase/
├── comprasRepository.ts, comprasMapper.ts
├── comprasQueries.ts, comprasSnapshotReader.ts
├── faturasRepository.ts, faturasMapper.ts, faturasQueries.ts
└── cadastrosRepository.ts                # compatibilidade primeiro uso
src/features/compras/
├── ComprasPage.tsx, CompraForm.tsx, CompraPreview.tsx
├── CompraDetailPage.tsx, comprasState.ts, useCompras.ts
└── useCompraIntent.ts
src/features/cartoes/FaturaDetailPage.tsx
src/features/cartoes/availability.ts
src/app/router.tsx, AppShell.tsx, session/financeSession.ts
tests/integration/compras.integration.test.ts
tests/integration/support/               # grupo, manifesto, preflight, limpeza
firestore.rules
firestore.indexes.json
docs/firestore-rules-changes.md
```

**Structure Decision**: Aplicação única, preservando camadas atuais. Não estender enum CRUD004 para compra, não criar API financeira em services/trusted-api. Reutilizar leitor snapshot autenticado com readTime, sem Admin SDK ou acesso privilegiado no frontend.

## Phase 0 — Research

[research.md](research.md) resolve escolhas de calendário, identidade, revisão, semântica de consulta, recuperação e caminho de validação. Pesquisas paralelas somente leitura conforme skill; Context7 consultado para Firebase e SDK. A falha técnica de orçamento é um resultado explícito, não uma pergunta funcional pendente ou capacidade presumida.

## Phase 1 — Design & Contracts

[data-model.md](data-model.md), [commands.md](contracts/commands.md), [security.md](contracts/security.md), [queries-ui.md](contracts/queries-ui.md) e [quickstart.md](quickstart.md) documentam o desenho de referência e critérios de validação. Gates foram reavaliados e permanecem impeditivos; os contratos não autorizam o desenho remoto antes da prova.

| Ordem após pesquisa | Entrega / requisitos | Evidência necessária |
| --- | --- | --- |
| 0 | Resolver G0 e G1; FR-011–016/026–028 | Positivos válidos, negativos e orçamento verificável; nenhum fluxo aberto apenas para teste. |
| 1 | Domínio e revisão de cronograma; FR-001–010/017–022 | Exemplos100/3,1/1,12,virada,3→2→3 e bloqueios de fatura. |
| 2 | Portas, schema/Rules e inicialização de controles | Primários/recibos/parcelas recíprocos, isolamento e migração falha fechada. |
| 3 | Adaptadores atômicos e recuperação | Commit integral, replay, duas intenções, conflito e falha após commit. |
| 4 | Snapshot e itens de fatura; FR-023–025 | Páginas completas no mesmo readTime, categorias e navegação. |
| 5 | UI e aceitação; SC-001–008 | Teclado/mobile, dados fictícios reais e cinco participantes. |

## Complexity Tracking

Não há exceção constitucional aprovada. O desenho separado exige autorização entre muitos documentos e tem custo incompatível com casos centrais; G1 registra essa complexidade em vez de escondê-la em cache presumido. A alternativa de release incompleto1/1, relaxamento das Rules, aumento de limites ou backend não foi escolhida.
