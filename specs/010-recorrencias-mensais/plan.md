# Implementation Plan: Recorrências mensais e assinaturas

**Branch**: `develop` (checkout real); feature lógica `010-recorrencias-mensais` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Especificação010, decisãoA de clarify (nova revisão termina na próxima já agendada) e constituição1.2.0. setup-plan resolveu a feature lógica010; não criou/trocou branch.

## Summary

Representar receitas, despesas externas e assinaturas mensais por série, revisões com vigência e ocorrências de identidade série+mês. Projeção pura combina persistidas, virtuais e tombstones; geração limitada ocorre ao abrir período ou por ação explícita, nunca com aplicativo fechado. O010 é fonte física única de seu lançamento externo ou compra/item1/1 de assinatura; fatos ficam separados em eventos. Integração explícita com read models existentes evita duplicidade e não usa criação005 seguida de vínculo em outra confirmação.

Revisões dividem somente o segmento vigente e preservam os seguintes. Edição de futuras confere todos os meses do intervalo derivado do watermark protegido, incluindo ausentes, para impedir omissão maliciosa. Limites rejeitam comando inteiro, sem atualização parcial do padrão. Sem teto total de vida da série ou lista histórica crescente em documento.

**Estado após retomada: erro aritmético do layout anterior corrigido; T001–T006 concluídas localmente, T007 PENDENTE de avaliação.** As fases0/1 foram documentais; a conferência de implementação constatou controlesG/J obrigatórios omitidos. Não foi proposta exceção constitucional. Gate de viabilidade executável PENDENTE antes das histórias mutantes: grafos completos de Rules, mínimos de todos os comandos, expressões e bytes ainda precisam prova. Não anunciar18/8 comprovados por desenho ou prontidão de assinatura por006. Se caso mínimo reprovar com todos os controles, marcar ERROR e redesenhar antes de seguir.

## Technical Context

**Language/Version**: TypeScript~6.0.2; Node>=24.12.0; npm11.18.0 existentes.

**Primary Dependencies**: React^19.2.8, Router7.18.4, Firebase13.0.0, Vite^8.3.0. Sem dependência nova, backend financeiro, Cloud Functions, serviço pago ou emulador.

**Storage**: Firestore privado users/{uid}: seriesRecorrentes, revisoesRecorrentes, ocorrenciasRecorrentes, operacoesRecorrentes, reversoesRecorrentes. Faturas006 e controle008 são referências privadas compartilhadas; documentos avulsos005/parcelados009 não recebem cópias010. Firebase Auth identifica usuário, titular não é login.

**Testing**: Vitest4.1.12: domínio/calendário/projeção/contratos/mappers/estado locais, typecheck/lint/build; candidato completo e avaliação oficial de Rules conforme autorização, depois SDK cliente real autenticado no projeto esperado. Sem emuladores nem Admin para provar isolamento.

**Target Platform**: Web celular/desktop, pt-BR/BRL, calendário1900–9999, fuso do perfil inicialmente America/Rio_Branco.

**Project Type**: Web com domínio puro, portas TypeScript e adaptadores Firebase; leitor REST fechado autenticado por ID token e snapshot fixo.

**Performance Goals**: Janela de até12 meses, até50 linhas por página e no máximo100 documentos físicos por ação. Pode retornar parcial/vazia com cursor se reconciliação não terminou; não varrer todo histórico para preencher página. Snapshot TTL50min. SC-007: quatro de cinco participantes em até3min. Sem SLA de rede ou capacidade gratuita ilimitada inventados.

**Constraints**: Até12 ocorrências por comando,32 mutações,32KiB/documento,1MiB/comando,18 acessos totais/8 por escrita e1000 expressões. Perfil inicial de materialização tem uma ocorrência; quantidades maiores somente após prova. Revisão futura exige intervalo ocupado<=12 meses e orçamento real, que pode ser menor. Sem cache presumido, fragmentação automática, passado virtual recalculado ou alteração silenciosa de liquidação.

**Scale/Scope**: Série é fronteira de concorrência para O/V/tombstone/fatos externos. Fatura/controle tem versão adicional para assinatura. Séries sem fim não são materializadas infinitamente. Filtros raros podem exigir continuação; completude nunca presumida de uma página.

## Constitution Check

| Gate | Pré-pesquisa | Pós-desenho | Critério de implementação |
| --- | --- | --- | --- |
| G0 domínio puro/stack gratuita | PASS | PASS documental | Reutilizar money/calendar/settlement; novo modelo010 sem serviço pago |
| G1 fonte única/rastreabilidade | A revisar | PASS de desenho; prova pendente | O financeiro único, R imutável, watermark protegido e revisões por segmento; testar reconciliação |
| G2 isolamento/invariantes | A revisar | PASS de desenho; prova pendente | own/ready, conjunto completo, auxiliares recíprocas; candidato oficial e cinco perfis |
| G3 orçamento/viabilidade | A pesquisar | Aritmética corrigida; PENDENTE executável | Provar mínimos e máximos aceitos de todos os comandos; não habilitar ramo sem perfil |
| G4 Rules/índices completos e testes reais | PASS de planejamento | PASS de planejamento | Fonte completa, índices, nota/rollback, publicação autorizada e SDK real |
| G5 calendário/escopo/clarificaçãoA | PASS | PASS documental | Âncora compartilhada, projeção sem escrita, preservação de reajustes posteriores e confirmadas |

PASS documental avalia escolhas, não o compilador nem estado remoto. Nenhum gate executável foi aprovado nesta fase. Não existe dispensa constitucional para custo excessivo: rejeitar conjuntos excedentes conformeFR-021; se nem caso mínimo funcionar, ERROR exige redesenho. Nenhuma operação do plan publica ou envia fonte/fixtures externamente.

## Project Structure

### Documentation (this feature)

```text
specs/010-recorrencias-mensais/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
└── contracts/
    ├── commands.md
    ├── security.md
    └── ui.md
```

tasks.md será gerado por speckit-tasks; não foi criado nesta fase.

### Source Code (repository root)

```text
src/domain/finance/
  money.ts, calendar.ts, recurrence.ts, settlement.ts, projections.ts # existentes
  recorrencias.ts, recorrenciasValidation.ts, recorrenciasProjection.ts # propostos
  recorrenciasEdit.ts, recorrenciasAudit.ts                             # propostos
  contracts/recorrencias.ts                                           # proposto
  operationBudget.ts, cadastros.ts                                    # ampliar perfis/prefixos
src/infrastructure/firebase/
  recorrenciasRepository.ts, recorrenciasMapper.ts                     # propostos
  recorrenciasQueries.ts, recorrenciasSnapshotReader.ts                # propostos
  externosQueries.ts, faturasQueries.ts                                # integrar fluxo010
src/features/recorrencias/                                            # proposto
  RecorrenciasPage.tsx, RecorrenciaForm.tsx, RecorrenciaDetailPage.tsx
  OcorrenciaPreview.tsx, OcorrenciaEditForm.tsx, RecorrenciaEncerrarForm.tsx
  recorrenciasState.ts, useRecorrenciaIntent.ts
src/app/router.tsx, src/app/AppShell.tsx, src/app/session/financeSession.ts
firestore.rules
firestore.indexes.json
docs/firestore-rules-changes.md
tests/integration/recorrencias*.integration.test.ts                    # propostos
tests/integration/support/recorrenciasFixtures.ts                     # proposto
tests/integration/support/environment.ts
vitest.integration.config.ts
```

**Structure Decision**: Preservar recurrence.ts schema1 da003 e mappers005, criar domínio/mapper/reader010 fechados e integrar projeções financeiras por fontes. Cobrança010 representa compra/item mensal própria, que leitores/controles007/008 deverão compreender antes da habilitação. Não implementar camada HTTP genérica nem misturar com recorrência de parcelas009.

## Phase 0 — Research

Concluída em [research.md](research.md): inventário real, integração financeira sem cópias, identidade curta verificável, revisões em segmentos, watermark para integralidade, preparação explícita de F006, snapshot/reconciliação, documentação atual via Context7 e pesquisa delegada pela skill. Nenhuma dúvida funcional ou de escolha arquitetural permanece; viabilidade executável é gate obrigatório de implementação.

Decisões centrais: não compor cegamente adaptadores005/007; não assumir compras/pagamentos prontos pela aprovação006; não confiar em query do cliente para provar futuras completas; não aplicar revisão só na leitura de O persistidas. Limites esparsos são documentados e acionáveis.

## Phase 1 — Design & Contracts

[Modelo](data-model.md): entidades, estado, identidade, consultas/índices, reconstrução e compatibilidade. [Comandos](contracts/commands.md): envelope/portas, confirmações/erros, idempotência e efeito por operação. [Segurança](contracts/security.md): grafo e orçamento preliminar, todos os casos mínimos e gate executável. [Interface](contracts/ui.md): jornada/estados. [Quickstart](quickstart.md): comandos existentes e cenários de validação futura.

Ordem de implementação a refletir em tasks.md:

1. Inventário/rastreabilidade e testes de domínio/contrato; completar grafos de todos os comandos e gerar candidato/casos locais completos.
2. Provar candidato no gate executivo sem publicação: orçamento, expressões, bytes, conjunto de futuras, rejeições e compatibilidade005/006/007/008. Geração da fonte e construção da suíte podem concluir antes da avaliação; comprovação pertence à tarefa de avaliação, evitando dependência circular.
3. Só após PASS executável, fundação tipada, mappers/readers, fixtures/grupo e recuperação; implementar US1/US2 com projeção e geração externa.
4. Entregar assinaturaUS3 com F confirmada e integração de itens/controles; pagamentos/correções de fatura precisam do contrato008 implementado/validado, não da disponibilidade006. Extender integrações/regressões antes de habilitar.
5. US4/US5: correções/valores/encerramento com prévia, revisões históricas e todas as corridas/limites; proteção de versão/idempotência existe desde primeiro fluxo, não fica para final.
6. Rules/índices completos, nota e rollback; publicação somente autorizada; SDK por fase; aceitação assistida, typecheck/lint/test/build e evidências finais.

Fase1 termina no desenho; não cria código financeiro nem executa SDK/testes remotos. Preparar fatura vazia é ação006 separada quando necessária, não materialização parcial de assinatura. Falta de controles008 ou perfil não comprovado mantém ramo fechado e rastreado como pendente, nunca anunciado pronto.

## Complexity Tracking

Sem exceção constitucional. Tradeoffs: serialização por S; revisões em segmentos; leitura de slots determinísticos antes de virtual; watermark pode rejeitar alteração de intervalo esparso; O de assinatura mapeia compra/item1/1 e exige integração com leitores/fatura; fatura ausente precisa preparo explícito006. Cada complexidade protege história, unicidade ou orçamento. Rejeitadas listas crescentes, cópia financeira, backend adicional, cache como prova e fragmentação automática.

## Estado final da fase documental

Plano e seis artefatos de pesquisa/desenho gerados, mantendo spec/clarificaçãoA. Hooks before_plan/after_plan ausentes. Não houve implementação, avaliação oficial, publicação, fixtures financeiras ou testes de aceitação. Próximo comando speckit-tasks. Gates executáveis permanecem PENDENTES e devem ser tarefas iniciais impeditivas, com ERROR se prova concreta reprovar caso mínimo.


## Conferência da implementação — 2026-10-20

T001–T003 concluídas. T004 parcial: modelo008 exige controlesFaturas(G) e controlesItensFaturas(J), incluindo escritas/deltas/capacidade, não só consulta opcional de F. Composição direta mínima soma21 acessos contra18 (primeiro uso24), reproduzida por scripts/validate-recorrencias-budget.mjs. Isso reprova o desenho composto atual, sem avaliação oficial; nenhuma impossibilidade de redesenho foi presumida. Os demais perfis/candidatos continuam não comprovados. Ver validation.md e a seção ERROR de contracts/security.md. T005–T060 permanecem não iniciadas até correção e recontagem.



## Retomada autorizada — estado prevalente

Layout corrigido em remediation.md: capacidadeJ incorporada em O, G separado obrigatório, ready delegado ao R novo, calendário006 com atualização recíproca de calendarioVersion. Materialização mínima16 e revisão de uma futura18, conferidas aritmeticamente. T004–T006 concluídas na construção local, sem prova remota. Fonte candidata completa e327 casos gerados; T007 tem autorização específica de envio à API oficial; as tentativas retornaram HTTP503 UNAVAILABLE, sem resultado de compilação. Gate PENDENTE conforme validation.md. T008–T060 seguem condicionadas ao PASS. O ERROR21 registrado acima é histórico do layout descartado; não se aplica como reprovação automática do desenho novo e tampouco é aprovação executável dele.

