# Implementation Plan: Cartões e ciclos de faturas

**Branch**: Git real `develop`; contexto lógico Spec Kit `006-cartoes-ciclos-faturas` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: `specs/006-cartoes-ciclos-faturas/spec.md`, incluindo decisão A de 2026-10-18. Nenhuma branch criada ou trocada.

## Summary

Entregar cadastro privado de cartões, arquivamento, consulta/prévia e confirmação explícita de faturas vazias, sugestão corrigível de primeira fatura e ajuste manual de vencimento. Preservar identidade cartão + competência de vencimento e limites históricos. Relação entre meses definida pelos dias configurados antes do ajuste ao último dia; coincidência de fechamento/vencimento exige prova pelas âncoras históricas.

Estender domínio puro, portas específicas e adaptadores Firebase. Cada mutação real confirma primário e evento-recibo imutável juntos. Confirmar fatura consulta quatro competências vizinhas no pré-estado para provar continuidade e ausência de sobreposição; só snapshot preexistente pode fornecer limite histórico. Na ausência anterior, calcular pelo padrão validado do cartão, impedindo origem circular entre novas faturas do mesmo lote direto. Não ampliar o CRUD genérico004, o backend002 nem habilitar compras/itens/pagamentos.

## Technical Context

**Language/Version**: TypeScript~6.0.2; Node>=24.12.0; npm11.18.0. Manter versões do package-lock.

**Primary Dependencies**: React19.2.8, React DOM19.2.8, React Router7.18.4, Firebase13.0.0, Vite8.3.0. Sem nova biblioteca de datas, estado ou UI.

**Storage**: Firestore privado users/{uid}; novas coleções cartoes, faturas, operacoesCartoes e operacoesFaturas. SDK cliente autenticado; sem backend financeiro ou serviço pago.

**Testing**: Vitest4.1.12; oxlint, typecheck e build existentes. Integração dirigida no projeto real autorizado, com SDK cliente A/B/ADMIN/PENDING/visitante. Compilação/avaliação oficial de Rules, sem emulador; interface e medição assistida separadas.

**Target Platform**: Web desktop/celular; datas gregorianas YYYY-MM-DD e competência YYYY-MM, anos1900–9999, perfil inicialmente America/Rio_Branco.

**Project Type**: Aplicação web existente, domínio financeiro independente de UI/SDK.

**Performance Goals**: Páginas1–50; detalhe por ID determinístico. Confirmar uma fatura: até sete leituras transacionais e duas escritas, sem varrer histórico. Quatro de cinco participantes cadastram/localizam fatura em até dois minutos. Sem SLA novo de latência; carregamento/erro claros diante de rede/cota.

**Constraints**: Limites internos003:18 acessos de Rules totais/8 por operação,32 mutações,32KiB/documento,1MiB operacional e1000 expressões. Desenho006: pior caso15/7, duas mutações, comando canônico até16KiB. Não armazenar credenciais, total livre ou pagamento autoritativo; sem ajuste automático por dia útil. Publicação não é realizada nesta fase.

**Scale/Scope**: Múltiplos cartões/titulares privados, sem compartilhamento ou teto de12 meses de histórico. Uma intenção mutante por transação, sem geração em massa. Não depender das US2–US6 da005: somente US1 foi implementada/validada na base inspecionada.

## Constitution Check

Gates avaliados antes da pesquisa e após desenho:

| Gate | Antes | Depois / evidência |
| --- | --- | --- |
| I: lógica independente | PASS | Domínio puro e portas específicas, adaptadores isolados. |
| II: verdade/rastreabilidade | PASS | Limites próprios imutáveis; ajuste em evento; sem totais/pagamentos editáveis. |
| III: isolamento real | PASS | UID no caminho, perfil/cutoff, referências privadas e admin sem bypass. |
| IV: simplicidade/cotas | PASS | Stack existente, sem serviços novos, orçamento conservador15/7. |
| V: autorização remota | PASS | Reavaliado após C1: grafo recíproco, identidade verificável e quatro vizinhos via get no pré-estado; lote novo não pode inventar fronteira por herança circular. |
| Datas/finanças §4 | PASS | Decisão humana de coincidência, calendário gregoriano, snapshots e ciclo separado de pagamento. |
| Consistência/histórico §5 | PASS | Dois documentos atômicos, revisão esperada e recibo primeiro. |
| Rules/índices §6 | PASS | Arquivos completos, nota e rollback protegido exigidos na implementação. |
| Testes sem emulador §7 | PASS | Local + avaliação oficial + cliente real; evidência própria006. |
| Interface mínima §8 | PASS | Teclado/rótulos, vazio/erro/envio, prévia distinta de confirmação. |
| Governança §9–10 | PASS | Harmonização003 registrada; sem exceção constitucional ou ampliação financeira. |

PASS é conformidade documental, não execução validada. C1 e I1 da análise foram incorporados ao desenho e aos cenários: origem no pré-estado e fixture válida30/10→31/10, respectivamente. Gates de implementação: fonte completa compilada, complexidade de expressões avaliada oficialmente e cenários máximos/ataques aprovados no ambiente autorizado antes da habilitação, incluindo lote circular negado e controle positivo aceito. Substituir quatro consultas de vizinhos por get mantém15/7 no comando individual; lote direto de duas faturas/recibos tem16 acessos das escritas no desenho e não pode depender de estouro de orçamento para rejeitar o ataque. Falha bloqueia o caso sem retirar proteção/aumentar limites.

## Project Structure

### Documentation (this feature)

```text
specs/006-cartoes-ciclos-faturas/
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

tasks.md será gerado por `$speckit-tasks`, não nesta fase.

### Source Code (repository root)

Alvos de implementação; módulos novos ainda não criados:

```text
src/domain/finance/
├── calendar.ts                         # reutilizar
├── invoiceCalendar.ts                  # calendário v2 e legado
├── cartoes.ts, faturas.ts               # novos: cadastro/ciclos
├── operationBudget.ts                  # perfis006 separados
├── installments.ts, settlement.ts      # harmonizar consumidores
└── contracts/
    ├── cartoes.ts, faturas.ts           # portas/DTOs novos
    ├── commands.ts                     # calendário discriminado
    └── *.contract.test.ts
src/infrastructure/firebase/
├── cartoesRepository.ts, cartoesMapper.ts
├── faturasRepository.ts, faturasMapper.ts
└── faturasQueries.ts
src/features/cartoes/
├── CartoesPage.tsx, CartaoForm.tsx
├── FaturasPage.tsx, FaturaDetailPage.tsx
├── PrimeiraFaturaPreview.tsx
├── cartoesState.ts, faturasState.ts
└── useCartoesRepository.ts
src/app/
├── router.tsx, AppShell.tsx
└── session/financeSession.ts            # limpar intenção006
tests/integration/
├── cartoes.integration.test.ts
├── faturas.integration.test.ts
└── support/                            # grupo cartoesFaturas e manifesto
firestore.rules                         # completo, preservando002/004/005
firestore.indexes.json                  # completo, sem remoções indevidas
docs/firestore-rules-changes.md
```

**Structure Decision**: Manter aplicação única. Não ampliar enums004 para cartões, nem criar API HTTP financeira ou abstração genérica de entidades. Reutilizar erros/sessão/componentes existentes quando compatíveis.

## Phase 0 — Pesquisa concluída

[research.md](research.md) resolve compatibilidade de calendário, identidade verificável, cobertura por quatro vizinhos, orçamento e idempotência. Pesquisa de domínio/segurança feita por agentes somente leitura, conforme a skill. Documentação Firebase via Context7, conferida em fontes oficiais Standard. Sem decisões funcionais pendentes.

## Phase 1 — Desenho concluído

- [data-model.md](data-model.md): campos fechados, identidades, transições, legado/evolução.
- [commands.md](contracts/commands.md): comandos, intenção, conflitos e atomicidade.
- [security.md](contracts/security.md): grafo, prova de vizinhança, orçamento e ataques.
- [queries-ui.md](contracts/queries-ui.md): consultas, índices, sugestão e interface.
- [quickstart.md](quickstart.md): validação após implementação, sem alegar testes já executados.

### Sequência e rastreabilidade para tarefas

| Ordem | Entrega | Requisitos / validação |
| --- | --- | --- |
| 1 | Calendário v2 e compatibilidade003 | FR-005–013; US2/3, SC-002/004; regressões parcelas/liquidações/séries. |
| 2 | Portas/mapeadores e grafo Rules | FR-001–010/019–022; schema fechado, orçamento e ataques diretos. |
| 3 | Cartões e arquivamento | FR-001–003/018–023; US1/5, titular histórico, reenvio e sessão. |
| 4 | Faturas vazias e consultas | FR-004–008/014–017; US2, unicidade, confirmação retroativa e distância2. |
| 5 | Prévia e ajuste de vencimento | FR-009–013; US3/4, escolha explícita e ajuste atômico. |
| 6 | Aceitação dirigida | Todos SC; ambiente autorizado, fonte completa, interface e participantes. |

Perfis006 começam `validacaoRemotaPendente`; não herdam `validadoNoProjeto` da005. Integrações futuras de compras devem validar cartão ativo no commit e preservar obrigações após arquivamento; não implementá-las aqui. Avaliar migração apenas se inventário autorizado revelar dados remotos incompatíveis, sem sobrescrever snapshots.

## Complexity Tracking

Nenhuma violação constitucional ou exceção nova. Quatro vizinhos e recibos são necessários para consistência verificável; prova e alternativas em research.md. Todos os gates permanecem PASS documental após o desenho.

Hooks before_plan/after_plan: `.specify/extensions.yml` ausente. setup-plan usa o nome lógico da feature; Git real permanece develop.
