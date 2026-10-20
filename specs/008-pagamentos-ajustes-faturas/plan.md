# Implementation Plan: Pagamentos e ajustes de faturas

**Branch**: `develop` (checkout real; setup identifica a feature lógica `008-pagamentos-ajustes-faturas`, sem criar branch) | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)

**Input**: `specs/008-pagamentos-ajustes-faturas/spec.md`, incluindo decisões A/A: erro corrige consumo no mês original; compra esquecida pode entrar por correção documentada em fatura movimentada/fechada.

## Summary

Pagamento integral/parcial pelo serviço compartilhado de liquidações, com conta, valor e data, sem segunda despesa. Separar ciclo, atraso e posição financeira; revisão explícita sem histórico, reversão integral de erro, encargos manuais, ajustes e devolução com destino explícito. Eventos imutáveis alimentam controles reconstruíveis por fatura/item/pagamento/ajuste, coordenados por versões e intenção estável.

**Resultado atualizado em19/10: G0 resolvido com68 casos oficiais e publicação/SDK13/13 aprovados. G1/G2 continuam ERROR.** Não declarar funcionalidade integral pronta para implementar/habilitar. Parcelamento007 e operações compostas008 carecem de prova completa de orçamento e inicialização. Os contratos não dispensam proteção nem reduzem escopo silenciosamente.

## Technical Context

**Language/Version**: TypeScript~6.0.2; Node>=24.12.0; npm11.18.0, conforme package.json/lock.

**Primary Dependencies**: React^19.2.8, React Router7.18.4, Firebase13.0.0, Vite^8.3.0; sem nova biblioteca ou API financeira no backend restrito002.

**Storage**: Firestore Standard privado em users/{uid}; Firebase Authentication. Eventos/recibos separados, sem histórico crescente em arrays. Controles são projeções protegidas reconstruíveis.

**Testing**: Vitest4.1.12, typecheck/lint/build e avaliação oficial das Rules seguida de SDK cliente no projeto autorizado. Sem emuladores. Esta fase não executa testes financeiros/remotos.

**Target Platform**: Web responsiva desktop/celular, pt-BR/BRL, datas1900–9999, perfil inicialmente America/Rio_Branco.

**Project Type**: Aplicação web com domínio puro, portas específicas e adaptadores Firebase.

**Performance Goals**: Páginas1–50 por usuário/cartão/período e leitura consistente; sem listener de histórico inteiro. SC-006: quatro de cinco participantes registram parcial em até2 minutos. Sem SLA de rede inventado ou capacidade gratuita ilimitada. Caixa começa pelo mês selecionado, sem varrer toda a coleção.

**Constraints**: Até12 parcelas nominais,32 mutações,18 chamadas documentais totais/8 por operação sem cache presumido,1000 expressões,32KiB/documento,1MiB/comando e16KiB de comando canônico. Todos os tetos simultâneos; perfil não comprovado desabilitado. Sem backend financeiro, serviço pago, saldo credor, compensação entre faturas ou juros automáticos. Offline não confirma.

**Scale/Scope**: Vários pagamentos por fatura em contas/datas distintas, histórico paginado e devolução parcial distribuída explicitamente. Histórico total não tem limite artificial; cada comando é limitado. Migração de dados reais é ação separada. Sem teste massivo de carga.

## Constitution Check

Avaliação inicial e reavaliação após desenho:

| Gate constitucional | Inicial | Pós-desenho |
| --- | --- | --- |
| I — domínio independente | PASS | settlement/projections com variantes tipadas008 sem SDK/React no cálculo. |
| II — autoridade/rastreabilidade | PASS documental | Eventos/itens são autoridade; controles reconstruíveis; sem total livre ou parcela paga presumida. |
| III — isolamento | PASS documental | UID/perfil/cutoff e referências privadas; prova remota pendente. |
| IV — simplicidade/cotas | ERROR herdado | G1/G2: orçamento completo não demonstrado, sem relaxar limites ou adicionar backend. |
| V — segurança | ERROR herdado | G0 passa avaliação oficial e matriz SDK da fonte ativa publicada. G2 exige prova de todos os ramos008. |
| §4 — finanças/datas | PASS | Excesso negado, estados separados, juros manuais e bases temporais distintas. |
| §5 — atomicidade/consistência | PASS documental | Inicialização/transições propostas; G1/G2 impedem habilitar sem prova executável. |
| §6 — Rules/índices | PASS | Entrega futura completa com notas/rollback; sem deploy nesta fase. |
| §7 — testes | PASS | Locais/cliente real autorizado, sem emuladores ou alegações de execução inexistente. |
| §8–10 — UI/governança | PASS | Acessibilidade e harmonizações003/005/006/007 explícitas; nenhuma exceção constitucional. |

### Gates impeditivos e critérios de saída

- **G0 — base006, PASS oficial/publicação/SDK**: fonte candidata passa68 cenários sem estouro, preservando prova distribuída entre fatura/recibo e identidade/calendário/vizinhança. Preflight confirmou ausência de legado, publicação autorizada verificada e13/13 testes SDK aprovados; availability e perfis006 habilitados. Ver validation008 e g0-evaluation-summary.json. Essa prova não autoriza variantes007/008.
- **G1 — itens007 e inicialização008, ERROR**: demonstrar N>=2, criação/edição/cancelamento e inicialização/deltas dos novos controles dentro18/8 e demais tetos sem cache. Atualizar todos os escritores006/007; caminho antigo não pode alterar itens conservando saldo indevido. Legado sem controle bloqueia mutação; migração exige completude comprovada e autorização própria.
- **G2 — ramos008, ERROR**: traduzir os grafos candidatos de contracts/security.md para regras completas, contar cada helper/autorização de leitura e provar limites/expressões em pagamento, reversão, revisão, encargo, correção/classificação, compensação e estorno/reembolso. Tabela mínima não cobre K/compensação e composições. Exigir exemplos positivos de devolução suportada e inclusão tardia parcelada, além dos ataques de excesso/duplicação. Inviabilidade exige registrar impasse e decisão de escopo em etapa própria, sem remover requisitos por hipótese.
- **G3 — habilitação, pendente**: após G0–G2 resolvidos, arquivos/índices ativos verificados, publicação autorizada, matriz real por perfil e regressão002/004/005/cartões006, backup/rollback e critérios assistidos. Evidência de um comando não promove outro.

Erros impedem avançar diretamente à implementação completa. Tarefas de prova/refatoração de regras e domínio isolado podem ser detalhadas sem habilitar escrita. Não há dispensa constitucional.

## Project Structure

### Documentation (this feature)

```text
specs/008-pagamentos-ajustes-faturas/
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

tasks.md pertence à próxima fase e não foi criado.

### Source Code (repository root)

Alvos futuros; nenhum código novo nesta fase:

```text
src/domain/finance/
├── settlement.ts, projections.ts, invoiceCalendar.ts, faturas.ts
├── liquidacoesFaturas.ts, liquidacoesFaturas.test.ts
├── operationBudget.ts, errors.ts
└── contracts/commands.ts, liquidacoesFaturas.ts, compras.ts
src/infrastructure/firebase/
├── liquidacoesFaturasRepository.ts, liquidacoesFaturasMapper.ts
├── liquidacoesFaturasQueries.ts, liquidacoesFaturasSnapshotReader.ts
├── comprasRepository.ts, comprasMapper.ts        # dependência007 não entregue
└── faturasRepository.ts, faturasMapper.ts, cadastrosRepository.ts
src/features/cartoes/
├── FaturaDetailPage.tsx, FaturaSummary.tsx, availability.ts
├── PagamentoFaturaForm.tsx, CorrecaoFaturaForm.tsx, DevolucaoCompraForm.tsx
└── liquidacoesFaturasState.ts, useLiquidacoesFaturas.ts
src/app/session/financeSession.ts
tests/integration/liquidacoesFaturas.integration.test.ts
tests/integration/support/
firestore.rules, firestore.indexes.json
docs/firestore-rules-changes.md
```

**Structure Decision**: aplicação única; reutilizar serviço compartilhado e leitor snapshot. Sem CRUD genérico, backend financeiro ou armazenamento duplicado de fatos. Arquivos007 ausentes são dependências, não entrega presumida.

## Phase 0 — Research

[research.md](research.md) registra decisões, justificativas, alternativas, evidência local e documentação oficial via Context7. Pesquisa paralela somente leitura examinou a base e o grafo de segurança. Não há pergunta funcional aberta; bloqueios técnicos conhecidos não foram mascarados como capacidade comprovada.

## Phase 1 — Design & Contracts

[data-model.md](data-model.md) define entidades e migração; [commands.md](contracts/commands.md), [security.md](contracts/security.md) e [queries-ui.md](contracts/queries-ui.md) definem interfaces e provas; [quickstart.md](quickstart.md) guia validação futura. Constituição reavaliada: G0 passa avaliação oficial/publicação/SDK; G1/G2 continuam ERROR.

| Ordem condicionada | Escopo/requisitos | Evidência de saída |
| --- | --- | --- |
| 0 | G0/G1/G2; FR-018–024 | Fonte integral, orçamento, positivos/negativos; nenhuma coleção aberta só para provar formulário. |
| 1 | Domínio/contratos; FR-001–005/009–017/025 | Centavos/estados, conta distinta, erro no mês original, inclusão sem duplicação e regressão003/005. |
| 2 | Schema/controle/migração; FR-002/011/017–021 | Inicialização e deltas verificáveis, legado bloqueado e reconstrução. |
| 3 | Adaptadores; FR-001/006–021/025 | Concorrência, reembolso conjunto, replay e incerteza após commit. |
| 4 | Leitura/projeções/UI; FR-004/022–023 | Snapshot completo, navegação à origem e acessibilidade nas três bases. |
| 5 | G3; SC-001–007 | Matriz real autorizada, fonte/índices ativos, rollback e cinco participantes. |

Harmonizações: controle007 passa a permitir somente projeções008 protegidas, em vez de proibir valores; calendário006 recebe overlay de revisão; contratos003 discriminam conta/datas por inversão e ajustes; reversão005 conserva sua semântica. Inclusão tardia é exceção tipada aprovada à criação protegida007, sem liberar edição comum. Não reescrever specs anteriores silenciosamente.

## Complexity Tracking

Sem exceção constitucional. Controles adicionais limitam inversões/ajustes sem percorrer histórico nas Rules, mas aumentam custo; compensação e comandos compostos não têm orçamento fechado. G1/G2 são impeditivos. Arrays limitados do comando não acumulam histórico. Alternativa arquitetural precisa preservar o modelo financeiro e o escopo autorizado.
