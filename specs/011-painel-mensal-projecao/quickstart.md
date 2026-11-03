# Quickstart: Validação futura011

Este guia inclui roteiro de execução futura e incremento local. Contratos, fundação, cálculo das três bases, janela1/12meses, adapters005/calendário006, componentes e cache independente têm provas locais. As rotas `/app` e `/app/projecao` permitem navegar mês/base e retornar da visão anual; sem composição real habilitada, mostram indisponível. Testes de UI interativa e matrizes remotas integrais ainda dependem das fontes de origem. Resultados realmente executados estão em validation.md. Não instalar emulador,criar seed ou publicar Rules implicitamente.

## Pré-requisitos

- Node>=24.12.0,npm11.18.0 e dependências existentes. Confirmar scripts em package.json; não reinstalar/atualizar stack sem necessidade.
- Ler spec.md,plan.md,data-model.md e contratos. Decisão A exige readTime comum inclusive detalhes/paginação.
- G0-local comprova reader/coordenador, limpeza de estado/filtros/handles e aborto de controladores na sessão, com regressões005/006; seu PASS libera domínio e interface com fixtures. A falta de ambiente remoto não impede esse trabalho isolado. G0-remoto comprova snapshot e concorrência reais antes de habilitar consultas de produto ou aprovar MVP. Para aceitação integral,G1/G2 exigem fontes007–010 compatíveis; hoje ausentes. Fixture local não habilita produção.
- Publicação e fixtures financeiras têm autorização própria; nenhuma decorre deste guia. Saldo calculado inicial pode permanecer indisponível por pré-requisitos ausentes.

## Verificações locais após criar os módulos

Executar na raiz do repositório:

```powershell
npm run typecheck
npm run lint
npm test -- src/domain/finance/painel.test.ts src/domain/finance/painelFilters.test.ts src/domain/finance/contracts/painel.contract.test.ts
npm test -- src/infrastructure/firebase/financeiroSnapshotReader.test.ts src/infrastructure/firebase/painelQueries.test.ts src/infrastructure/firebase/painelMapper.test.ts
npm test -- src/features/painel
npm test -- src/infrastructure/firebase/externosSnapshotReader.test.ts src/infrastructure/firebase/externosQueries.test.ts src/infrastructure/firebase/faturasQueries.test.ts
npm run build
```

Escrever testes antes das respectivas implementações e registrar falha inicial. Ao concluir incremento, executar suíte local completa com npm test; não declarar testes passados por arquivos ausentes ou seleção vazia. Testes do fetcher simulado validam parsing/agendamento, não Rules remotas.

## Cenários de domínio e interface

1. Conferência mensal: receita5000,recebido3000; fatura1000/pago400; externa200 quitada; parcela300 não paga. Esperado: compromisso1500,liquidado600,pendente900,aReceber2000,resultado3500. Pagar mais100 preserva compromisso/resultado.
2. Três bases: compra1200 em outubro,parcelas400 novembro/janeiro; pagamentos150 outubro+250 dezembro. Consumo1200 outubro,planejamento400 em cada fatura,caixa150/250 nos meses reais.
3. Competência externa diferente do vencimento e pagamento: planejamento novembro,vencimento dezembro,caixa janeiro. Posição atual do alvo no planejamento não se torna caixa de novembro.
4. Projeção010: virtual150 e confirmada173,42 na mesma identidade →173,42 uma vez. Pulo/cancelamento não reaparece. Fatura200+assinatura50=250 antes/depois da materialização. Ajuste de competência e exceção de fatura não deixam ocorrência perdida.
5. Filtros: fatura1000,alimentação600,transporte400,pagamento300. Alimentação mostra600 de itens e contexto integral1000/300/700; sem rateio420/180,sem resultado consolidado fictício. Duas etiquetas não duplicam.
6. Empréstimo: próxima5/10,original desconhecido. Apenas seis parcelas conhecidas,no capital adicional,no recebimento fictício. Origem sem consumo conhecido permanece não atribuída.
7. Ajustes008: erro corrige consumo original; estorno reduz no efeito e reembolso entra na data real sem receita categorizada; evento com duas datas/efeitos retornado em várias consultas entra uma vez por efeito.
8. Saldo/transferência: resultado positivo continua sem rótulo de disponível. Pré-requisitos ausentes impedem saldo calculado; transferência não altera receitas/despesas consolidadas.
9. Janela novembro2026–outubro2027,voltar/avançar e abrir qualquer mês/detalhe em até duas ações. Exercitar1900/9999,bissexto,fuso e total fora de faixa.
10. Alteração durante carga/página/detalhe: todos os totais completos permanecem no mesmo readTime; atualizar promove nova visão inteira. Último completo não recebe partes novas isoladas.
11. Teto100 documentos/8HTTP: incluir sondagem,releitura,refs,candidatos descartados e datas vazias008. Rodada para com cursor,sem busca automática; página filtrada vazia continua parcial. Página cheia exige esgotamento posterior.
12. Expiração50min,permissão,cota,índice ausente,schema desconhecido,fonte não habilitada e divergência de controle: sem zero confirmado ou total completo. Cache limitado2janelas/8MiB; logout/troca de geração aborta e limpa dados/respostas tardias.

Acrescentar aos cenários4/7 as fronteiras das extensões de leitura:

- Descoberta010 seleciona vigência virtual sobreposta, não todo catálogo de séries: incluir série antiga ainda vigente, excluir encerrada sem impacto virtual, preservar O persistida após encerramento e com competência/data ajustada. Testar encerramento em1900-01, datas máximas e legado sem metadado. Persistida não depende de virtualElegivel; ausência de prova de cobertura impede total completo.
- competenciasConsumo008 é obrigatório e exato: variantes sem consumo têm []; encargo, correção/classificação, estorno e compensação têm um mês derivado conforme data-model.md. Testar0/1/2, duplicata, ordem/mês errado, omissão/extra e ausência versus []; datas distintas de reembolso não criam outro mês de consumo. Comando que exija dois meses de consumo é recusado integralmente pelo perfil atual.

Resultados detalhados esperados e fórmulas estão em contracts/consolidation.md; queries/índices em contracts/queries.md. Não duplicar implementações nesses roteiros.

## Integração real — somente após autorização e gates

Grupo `painel` já configurado em tests/integration/support/environment.ts e vitest.integration.config.ts, com preflight local e painel-snapshot.integration.test.ts somente leitura. Exige TEST_PAINEL_READS_AUTHORIZED=yes,TEST_PAINEL_FIXTURES_READY=yes e TEST_PAINEL_MONTH válido, além de TEST_RULES_CONFIRMED=yes; modelos em .env.integration.example ficam desativados por padrão. Fixtures exatas existentes: <runId>-externo e <runId>-cartao__<mês>, com cartão <runId>-vazio sem fatura no mês. A prova concorrente e as matrizes de produto deUS1–US5 ainda não foram implementadas/executadas. Exigir TEST_EXPECTED_PROJECT_ID igual a VITE_FIREBASE_PROJECT_ID e projeto autorizado,TEST_RUN_ID e quatro UIDs dedicados distintos A/B/ADMIN/PENDING; visitante sem token. Não imprimir senhas,tokens ou dados reais.

Fixtures sintéticas sob esses UIDs, inventariadas por runId/caminhos exatos, com criação por contratos já habilitados. Não usar gravação administrativa como prova de Rules e não contornar fonte não implementada. Inspecionar fonte/índices ativos e compatibilidade007/008/010 antes de alegar total integral. Criar/limpar fixtures somente dentro da autorização vigente.

Após implementar grupo/testes e obter configuração/autorização:

```powershell
$env:TEST_INTEGRATION_GROUP = 'painel'
npm run test:integration
```

Esperado: A lê somente seus resumos/detalhes no mesmo snapshot; B/admin não leem A; pendente/visitante negados. Validar get/list diretos,limite0/51/ausente,consultas vazias,readTime fixo entre fontes e efeito de alteração concorrente com segundo cliente autenticado. Provar consultas completas dos índices e materiais007/008/009/010; ausência de qualquer fonte mantém aceitação integral PENDENTE.

Ensaio pequeno: escrita concorrente no meio da paginação por comando habilitado; snapshot inicial mantém valores antigos coerentes e atualização mostra novos coerentes. Preservar eventos e manifesto,sem carga massiva. Falhas de rede e respostas tardias podem ser induzidas no teste do transporte local; não provocar indisponibilidade do serviço remoto.

Esse ensaio mínimo deve ocorrer na US1, antes do checkpoint do MVP: segundo cliente altera pagamento ou lançamento durante a carga entre fontes, entre páginas e antes do detalhe. Provar o mesmo readTime no resumo/detalhe e a atualização conjunta para a nova visão, inclusive vazio e continuação. Registrar G0-remoto separado de G0-local; US5 amplia as situações de falha, cache e sessão, sem ser a primeira prova concorrente. A integração de limpeza/aborto já deve estar aprovada localmente na fundação.

## Evidências e entrega

Na implementação, criar validation.md com versões,comandos,contagens reais,hashes de Rules/índices quando pertinentes,projectId/runId/perfis,limitações,medidas de leitura/memória/latência local,aceitaçãoSC005/006 e diferenças centavo a centavo versus conjunto revisado da planilha. Dados da planilha devem ter anos/origens confirmados; não importar automaticamente nem inferir pagamentos.

Distinguir PASS local,PASS remoto e bloqueado. Arquivos gerados não significam publicados. Mudanças de Rules exigem arquivo completo,nota de coleções/permissões,regressões e rollback; índices completos também. Limpeza exige inventário e autorização própria. Não marcar feature pronta enquanto G1/G2/G3 estiverem pendentes.
