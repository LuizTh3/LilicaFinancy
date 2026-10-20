# Cobertura 009

Matriz de planejamento, não evidência de aprovação. US1=cadastrar; US2=consultar/pagar; US3=corrigir/substituir; US4=recuperar/respeitar limites. Roteiros remetem aos critérios de aceitação de spec.md. Avaliação oficial e integração permanecem pendentes.

| Requisito | História | Tarefas | Roteiro obrigatório |
| --- | --- | --- | --- |
| FR-001 | US1 | T008,T013,T016,T020 | Tipos externos distintos de cartão/recorrência |
| FR-002 | US1 | T011,T013,T016,T019,T020 | Campos, limites e referências próprias ativas |
| FR-003 | US1 | T011–T020 | 5/10 gera apenas seis posições |
| FR-004 | US1 | T011,T013,T016,T019 | Total restante versus valor por parcela |
| FR-005 | US1 | T011,T013,T020 | Resíduo100/3 e âncora31/fevereiro |
| FR-006 | US1 | T011,T013,T016,T020 | Cronograma desigual completo e ordenado |
| FR-007 | US1 | T009,T012,T016,T017,T020 | Original ausente versus informado diferente |
| FR-008 | US1 | T011,T013,T020 | Centavos seguros e calendário1900–9999 |
| FR-009 | US1,US3 | T012,T016,T019,T038–T044 | Alteração invalida prévia; confirmar antes/depois |
| FR-010 | US2 | T021,T023–T025,T029 | Parcial60+140, excesso e reversão única |
| FR-011 | US2 | T022,T024,T025,T027–T029 | Sem entrada inferida; segundo vínculo negado |
| FR-012 | US1,US2 | T017,T026–T029,T035 | Detalhe por parcela e passado não cadastrado |
| FR-013 | US2 | T021,T026,T028,T029 | Planejamento e caixa em meses diferentes |
| FR-014 | US3 | T038–T045 | Editar selecionada/futuras elegíveis |
| FR-014a | US3 | T038,T040,T043–T045 | Âncora mensal por ordinal e datas explícitas |
| FR-015 | US3,US4 | T035,T038–T046 | Preservar paga/parcial/revertida e conflito |
| FR-016 | US3 | T039–T045 | Cancelar alvos com motivo e líquido zero |
| FR-017 | US3 | T039–T046 | Substituição atômica sem transporte de fatos |
| FR-018 | US1,US4,US3 | T014,T030–T037,T041,T046 | Replay, conteúdo diferente e semAlteracao |
| FR-019 | US4 | T004–T007,T033,T036,T046 | Limites de ambos os lados e metadados |
| FR-020 | US4 | T030–T034,T036,T046 | Resposta perdida e rejeição integral |
| FR-021 | Todas | T006,T007,T009,T010,T020,T029,T036,T045 | Cinco perfis, arquivo histórico e troca de sessão |
| FR-022 | Todas | T004–T007,T015,T025,T033,T042,T049 | Orçamento/enforcement e compatibilidade |
| FR-023 | US1,US2,US4 | T016–T019,T026–T028,T034,T047 | Paginação limitada, filtros, teclado e foco |
| FR-024 | Todas | T003,T010,T020,T029,T036,T045,T049,T050 | Evidência local e SDK real autorizado |
| SC-001 | US1 | T011,T013,T020 | Todos P/N válidos até12 |
| SC-002 | US1 | T011,T013,T017,T020 | Reconciliação, explícito e ausência preservada |
| SC-003 | US2 | T021,T023,T028,T029 | Líquido/pendência/caixa exatos |
| SC-004 | US3 | T038–T046 | Prévia coincide e protegidas preservadas |
| SC-005 | US4 | T030–T037,T046 | Zero duplicação/efeito parcial |
| SC-006 | Todas | T006,T007,T010,T020,T029,T036,T045 | Zero acesso indevido nos cinco perfis |
| SC-007 | US1 | T047 | Quatro de cinco participantes em até3min |

32 requisitos associados; nenhuma aprovação remota ou aceitação de participantes realizada. T050 deve substituir o estado planejado por referências às evidências efetivas, inclusive limitações.
