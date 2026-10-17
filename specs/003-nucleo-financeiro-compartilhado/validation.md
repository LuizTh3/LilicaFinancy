# Validação da implementação — feature 003

## Baseline

Data: 2026-10-17. Branch: develop
Node: v25.8.1. npm: 11.18.0.

Estado inicial: documentos da feature e feature.json já estavam staged; preservar esse estado, sem commit/deploy. Nenhum código financeiro existente. Checklist requirements.md 16/16.

Ignore verificado: node_modules, dist/build, logs, ambientes e credenciais protegidos; pacote privado, sem publicação npm. Sem Docker/ESLint/Prettier/Terraform/Helm detectados; não criar ignores sem ferramenta. Acrescentados somente padrões universais ausentes em .gitignore.

Comandos planejados: testes por história, teste de TZ, contratos, npm run typecheck, npm run lint, npm test, npm run build. Nenhuma integração remota ou emulador.

## Hashes de preservação (SHA-256)

| Caminho | SHA-256 |
| --- | --- |
| firestore.indexes.json | 1C8050B7404EB17B5BDE8F91EFF83F33A80A9E2D397D0B340025D6742D475CEF |
| firestore.rules | C982AA957318EE50C363B53C24DBB38893A096F7D7A8CEC3C74EF935B658844F |
| package-lock.json | 0CA16B42133419CDA6AB045767A8221878F0FBD4313DB06CD4DF1B267B438215 |
| package.json | 1F12EAB8000FED7186232D6B3CD2CF9C508D029625A355F37ECAB0A67E50394B |
| services/trusted-api/.dev.vars.example | A950C21EBA1695CF110CA047E2D6494ED6A6E92A3AAAA28A32132F0BABC8D870 |
| services/trusted-api/package.json | 52842F23B21E379EF5232CFA8E1A2E4C56F25575E1580A18D0A4785996DEE8D8 |
| services/trusted-api/src/contracts.ts | 59EBE616B5D3001919124AB72922DD31ED98F356AB7D3FAA8157D4898262297C |
| services/trusted-api/src/environment.ts | A66913C4DF5F890FED8CCF1BD6F9E0432994B6B2FCF2DEF7EA3F5F80A3603852 |
| services/trusted-api/src/firestoreRest.ts | 37C77D6DC5312459A863AD78D0DEA52675F792BCED7E53C1B4CC31ACF234FC77 |
| services/trusted-api/src/firstLogin.protocol.test.ts | 6C651E2D9A53A627957415817D08B1136326D4ECE66A6047A6144E5D3FF08593 |
| services/trusted-api/src/firstLogin.test.ts | 83FB94A5C6A276D8D503599471AE99550671E20C74A12CD323A7BE79C27A2EFE |
| services/trusted-api/src/firstLogin.ts | D06AADDA12E9327A15BBF37E06A05C34CF480065EC7FD95ED11DAFB55A2F96F2 |
| services/trusted-api/src/googleAuth.test.ts | 75045AB9A05BFF1B88E02849FD65B50C68E1CBC1CA65387D4FC261F650DD3D75 |
| services/trusted-api/src/googleAuth.ts | C3EB1AE933801420372DB837104B4378A85EBA4855741A4C657697CF0031462E |
| services/trusted-api/src/index.test.ts | 000759C724E95DA47852C5AC2B9C8E8FD611209668ED95B224C5703DCA1DFC6B |
| services/trusted-api/src/index.ts | E04C9E35A43B1E1A29B9E9DA1670B56ED74EB74E4BB2370D430D42D27930EB26 |
| services/trusted-api/src/notifications.test.ts | 6E00C00F45B62F94E5E1F6D8935D2E507DA85D653A26E77365D0739B088B5167 |
| services/trusted-api/src/notifications.ts | D85E524D453BB8FBD53284A5EDF1EFEDD2C9D3F81BA524B2D71FE046BE122C02 |
| services/trusted-api/src/registration.protocol.test.ts | B06BEA84E5CB33AADF334B2E4C9D3B9EE18B5B8E492FD40B44E8D305B0DB48C3 |
| services/trusted-api/src/registration.test.ts | 5AAB7BC4DB912EFFEB99316B4B3BDC56B1B9B83A98C65BB01B3BD541E37A29D7 |
| services/trusted-api/src/registration.ts | E649143F39348AF17900D1585B74933C18F19EC86728305D1B5EFD83C1E5E3FE |
| services/trusted-api/tsconfig.json | 02634FE0ACF733AA135FA40CE34423A4676468D27605126ADBC34ACDBBBFC4B9 |
| services/trusted-api/wrangler.jsonc | D8197D87D56DA9C254825FCD2A790D60B319B0BD6667DD7EA24B384F2F6A9869 |

## Execução

Implementação iniciada; resultados serão acrescentados após cada checkpoint.

### Fundação e US1 (T001–T013)
TDD: errors/calendar e money falharam por módulo ausente antes da implementação. Fundação: 3 arquivos/19 testes aprovados. Dinheiro inclui MAX roundtrip, overflow, distribuição1..12 e crédito tipado. EPERM de cache temporário resolvido com TEMP/TMP restritos a node_modules/.tmp/finance por processo; nenhuma alteração global. Context7 consultado para TypeScript6 AST e Vitest4. Ignore universal complementado sem alterar dependências.

### US2 (T014–T021)
TDD: novas funções de calendário falharam antes da implementação, assim como os módulos de cronograma/fatura ausentes. Após implementação: 8 arquivos/54 testes aprovados (núcleo + assinatura). Inclui migração5/10, séculos, âncora31, fechamento, MAX e igualdade de vencimento da fatura. Execução de calendário também em processo TZ=Asia/Tokyo, sem alterar TZ global. Wrapper legado preservado.

### US3 (T022–T030)
TDD: settlement/projections falharam por ausência antes do código. Núcleo+assinatura: 10 arquivos/65 testes aprovados. Reconciliação: 10000 original, pagamento4000, pendente6000; reversão reabre10000; receita100000 recebida60000 mantém40000; estorno posterior preserva consumo original; reembolso e crédito conjunto chegam a exigível/líquido/pendente0 sem duplicação. Inclui crédito da parcela de cartão agregado na fatura e dados congelados sem mutação. Erros de tipos detectados no checkpoint foram corrigidos antes de avançar.

### US4 (T031–T041)
TDD: identidade/orçamento/doubles/leitura falharam antes de existirem. Checkpoint específico: 5 arquivos/13 testes aprovados. Doubles finitos mostram recibo antes de versão, conteúdo divergente rejeitado, duas intenções com versão3 resultando em uma versão4, limites de inversão, falha antes sem efeitos e resposta perdida recuperada sem duplicação. Cursores por contexto/base/filtro/revisão e sem total parcial. Catálogo remoto permanece naoHabilitado; perfis aceitos retornam finalidade testeDeContrato, não autorização de produção.

### US5 e revisão transversal (T042–T050)
TDD: recurrence e double falharam antes da implementação; modelo teve testes sobre validadores já existentes. Checkpoint inicial conjunto núcleo+assinatura: 18 arquivos/88 testes. Confirmação novembro15000→16327/false preserva dezembro15000/true e molde; versionamento e resposta perdida não duplicam alteração. Receitas também suportadas; conta arquivada preserva fatos, bloqueia novo pagamento. Sem cadastro automático ou persistência financeira.
Revisão adicional T050: testes demonstraram e corrigiram coerção indevida de lista em discriminante, crédito órfão, metadados de erro extras, seleção de futuras não pagas e necessidade de manifesto completo no cancelamento de origem. Casos foram observados falhando antes dos ajustes e passando depois. Tipagem de confirmação virtual/existente explicitada; sem deps novas.
### Desempenho informativo (T052)
Node v25.8.1, 50 aquecimentos, 1000 gerações+validações de12 parcelas: p95=0,13670000000001892 ms, alvo informativo<50ms. Sem assert de latência instável ou inferência de SLA de rede. Capturado por npm test -- src/domain/finance/installments.test.ts --reporter=verbose.

## Verificação final (T051–T054)

| Verificação executada | Resultado |
| --- | --- |
| npm run typecheck | PASS — sem erros; após os últimos ajustes e teste de cartão arquivado. |
| npm run lint | PASS — oxlint --deny-warnings sem avisos. |
| npm test | PASS — 33 arquivos, 140 testes, execução final às13:00:42 no relógio do processo; duração4,38s. Inclui regressões existentes e suporte unitário de integração, sem executar test:integration. |
| npm run build | PASS — TypeScript + Vite8.3.4; 69 módulos transformados, build Vite874ms. |
| Calendário em processo TZ=Asia/Tokyo | PASS — 18 testes. Variáveis de ambiente restritas ao processo. |
| Gate de arquitetura | PASS — imports transitivos/tipos/reexports e grafos negativos, domínio sem SDK/React/Node-only/relógio implícito. |
| Bundle sem helpers de teste | PASS — sem criarSerieDouble, criarRecorrenciaDouble, FINANCE_BENCHMARK ou testSupport em dist/assets. |
| Hashes protegidos | PASS — 23 arquivos comparados ao baseline, nenhuma divergência: Rules, índices, manifestos de dependências e arquivos rastreados do serviço confiável. |
| Estado das tarefas | 54/54 concluídas, com IDs preservados e sem tarefas pendentes. |

O build emitiu aviso informativo de chunk JavaScript maior que500kB (833,65kB minificado,253,89kB gzip). Não foi feita alteração de dependência, configuração de chunk ou UI para suprimir o aviso; o build concluiu com sucesso. Os últimos ajustes após o build foram exclusivamente de teste/documentação; typecheck/lint/suíte foram repetidos para cobri-los.

## Rastreabilidade executada

| Requisitos e critérios | Evidência entregue |
| --- | --- |
| FR-001–002 / SC-007 | Funções puras, gate de arquitetura, README e doubles apenas em testes; nenhum CRUD ou adapter antecipado. |
| FR-003–007 / SC-001–002 | money.test, moneyCredit.test e settlement.test: parser/formatador máximo, quociente/resto, limites e reduções tipadas. |
| FR-008–013 / SC-003 | calendar/installments/invoiceCalendar/subscription: gregoriano, âncora, virada, fuso, migração5/10 e fechamento. |
| FR-014–020 / SC-004 | settlement/projections: parcial, crédito, reversão, reembolso/estorno combinado, três bases, datas da fatura iguais às parcelas, futuros pagos preservados e manifesto de cancelamento. |
| FR-021 | recurrence e recurrence.contract: identidade por competência, cancelamento/exceção persistidos prevalecem, estimado próprio e confirmação isolada, idempotente e sem caixa. |
| FR-022–027 / SC-005 | identity, portas e contratos: payload canônico, guardas, schema, recibo, resposta perdida e conflitos. |
| FR-028–031 / SC-006 | operationBudget e contratos: fronteiras exatas/excedidas, atomicidade do double, 26 acessos rejeitados; todos os perfis remotos permanecem naoHabilitado. |
| FR-032–033 / SC-008 | model/read/series/settlement.contract: contextoA/B, cartão/conta arquivados, referências, paginação, origens e informação migrada incompleta. Modelo documental das15 entidades permanece disponível, sem persistência automática. |

## Limites da evidência e hooks

Nenhuma migração, alteração/publicação de Rules/índices, novo endpoint, commit, deploy, conexão financeira real ou instalação de emuladores. O estado staged inicial do responsável foi preservado; arquivos desta implementação permanecem disponíveis para revisão. Ausência de .specify/extensions.yml conferida antes e depois: nenhum pre/post-hook executável.

Testes dos doubles comprovam o contrato local e não autorização/cotas/integridade do Firestore. Portas não equivalem a adaptadores. Habilitação financeira futura continua exigindo prova remota completa conforme plan.md e contracts/repositories.md; não há afirmação de integração remota validada nesta entrega.
