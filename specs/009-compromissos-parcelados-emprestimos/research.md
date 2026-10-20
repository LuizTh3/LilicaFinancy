# Research: Correção do desenho 009

## Decisão — agregado finito por série

Persistir no máximo12 obrigações como mapa fixo em seriesParceladas e fatos/revisões como documentos imutáveis separados em operacoesParceladas. A identidade de cada obrigação é (serieId,ordinal), independente de sua disposição física. Não guardar histórico crescente ou vida financeira inteira em S. A constituição exige consistência, rastreabilidade e isolamento, não um documento por obrigação.

**Razão**: O desenho antigo repetia referências e recibos por parcela: 5/10 custava40 acessos e substituição mínima20. O novo grafo valida posições localmente, sem getAfter por parcela; mantém limites e semântica. Máximos documentais: criar15, editar16, substituir18. A validação executável de Rules, expressões e tamanhos ainda depende de T005–T007. Não declarar PASS remoto por contagem aritmética.

**Alternativas avaliadas**: Manter documentos-filho com cache presumido (rejeitado); elevar tetos/reduzir validações (rejeitado); gerar em etapas (rejeitado); backend financeiro002 (não autorizado). O mapa fixo foi escolhido porque é limitado a uma série e não acumula pagamentos; preservar contas/valores individuais é possível sem fanout físico.

## Reutilização e compatibilidade

Reutilizar money/calendar/installments para cálculo uniforme e settlement para liquidação por alvo parcelaExterna. Acrescentar modo explícito sem forçar datas mensais. Usar porta/adaptador próprios e read models comuns; não ampliar dados avulsos005, não inventar dataConsumo e não duplicar fato em operacoesExternas. Receita explicitamente criada continua005; vínculo é ação separada.

## Concorrência e leitura

Uma revisão global por série serializa criação, edição, cancelamento, pagamento e vínculo. Qualquer mudança concorrente invalida prévia; reler e conferir, sem compensação silenciosa. É um tradeoff explícito para séries finitas, não promessa de escrita simultânea em parcelas independentes.

Consultar competencias derivadas via array-contains por mês, com snapshot/readTime e expansão do mapa. Paginação física de séries e lógica de até50 parcelas precisa cursor de série/ordinal para não omitir linhas. Fatos de caixa são consultados por data efetiva nos eventos, sem varrer histórico completo. Competências derivadas são reconstruíveis e protegidas, nunca segunda autoridade financeira.

## Validação de referências e primeiro uso

S consulta categoria/titular/conta prevista por patch comum; R consulta perfil e até5 etiquetas novas, e exige pós-S. S exige novo R ligado à revisão; ready não é removido, fica na criação obrigatória do recibo e nas leituras. Regra de primeiro uso segue financialUsePatch004/005: categoria ao classificar; conta ao pagar/receber, não por ser conta prevista. Essas consultas e os marcadores entram no orçamento.

Na substituição, R liga antiga e nova; cancelamentos e criação são uma confirmação. R pode validar no máximo duas séries e5 etiquetas além do perfil:8 acessos. Demais referências são verificadas pela escrita da nova S, sem duplicar. Não ler S_nova antes da criação se o perfil máximo já ocupa18; a regra create e chave estável impõem exclusividade.

## Correções funcionais associadas

- FR-018 explicita semAlteracao sem recibo, com encerramento da intenção e repetição sujeita à versão atual, conforme005. Testes deixam de exigir recuperação persistida para esse caso sem efeito.
- FR-011 explicita cardinalidade mínima0..1 de receita por empréstimo e0..1 empréstimo por receita, sem troca silenciosa ou transporte para renegociação. Essa escolha já estava no modelo; agora é visível ao negócio e tem cenário de aceitação.
- Estado documental corrigido: tasks.md existe; 50 tarefas mantêm dependências e os gates de prova.

## Fontes e limites da evidência

Conferidos código real de installments/settlement/operationBudget e financialUsePatch em firestore.rules, constituição1.2.0 e artefatos009. Context7 resolve Firebase → /websites/firebase_google; query sobre getAfter, diff/affectedKeys e operações atômicas confirmou as primitivas. Resultados de páginas Enterprise não são usados para prometer quota específica diferente de Standard; limites internos18/8 permanecem herdados e inalterados.

- [Condições e getAfter](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Validação de campos](https://firebase.google.com/docs/firestore/security/rules-fields)
- [Transações](https://firebase.google.com/docs/firestore/manage-data/transactions)

A documentação sustenta mecanismos, não prova este desenho. Script local valida aritmética; compilação, expressões, bytes reais, avaliação oficial e SDK seguem pendentes. Nenhuma publicação ou operação financeira real foi feita nesta correção.

## Phase 0 — Consolidação do replanejamento

### Leitura com snapshot próprio

**Decision**: Criar parceladosSnapshotReader.ts com consultas tipadas009, Firebase ID token e readTime fixo; TTL local50min, preservando o leitor005.

**Rationale**: Inspeção do leitor005 mostrou allowlist restrita de coleções e filtros, sem array-contains para séries. A documentação atual confirma que REST com ID token Firebase é autorizado pelas Rules e que RunQuery aceita read_time na última hora sem PITR. Todas as páginas e gets do mesmo recorte devem compartilhar esse instante, inclusive resultado vazio.

**Alternatives considered**: Usar leitor005 sem extensão explícita (inviável); ampliar genericamente suas coleções (rejeitado por risco de regressão); usar token administrativo ou backend novo (rejeitado).

### Paginação com trabalho limitado

**Decision**: Até duas páginas físicas de50 séries por ação mensal, saída de até50 linhas, ordem serieId/ordinal e cursor que retém posição no mapa. Ao atingir teto, retornar incompleto com continuação, mesmo com zero linhas após filtro.

**Rationale**: Situação e titular de cada parcela exigem filtro após expansão. Sem teto, buscar50 coincidências poderia ler todo o mês; o novo contrato limita esse trabalho e mantém ausência de garantia de total até completude.

**Alternatives considered**: Varrer todo recorte para preencher página (rejeitado); criar documento materializado por parcela sem orçamento de consistência (rejeitado); ordenar globalmente por vencimento sem índice compatível (não prometido).

### Referências comuns e eventos reconstruíveis

**Decision**: Categoria/titular/conta/etiquetas comuns na criação e patch comum de novas referências em edição; cronograma explícito preserva valores/datas/competências individuais. Eventos usam versão por série para reconstrução e timestamps somente para navegação.

**Rationale**: Essa forma corresponde às consultas externas contadas no orçamento. Chaves fixas e diff preservam posições não alvo; cadeia de revisões garante auditabilidade mesmo com timestamps empatados ou evento de substituição em duas séries.

**Alternatives considered**: Consultar toda referência repetidamente por slot (reintroduz fanout); confiar somente em createdAt para reconstrução (não comprova sequência); duplicar evento financeiro em005 (rejeitado).

### Gates e conclusão da fase

**Decision**: Concluir o planejamento documental após definir entidades, invariantes, consultas, contratos e provas exigidas. Conservar prova executável T005–T007 como gate de implementação, sem habilitar gravações.

**Rationale**: A skill plan encerra na fase1 de design; testes não executados são pendências de implementação, não aprovação remota nem motivo para inventar falha do desenho. Uma reprovação concreta continua ERROR e exige revisão; não flexibilizar constituição ou orçamento.

**Alternatives considered**: Declarar Rules aprovadas por aritmética (rejeitado); repetir indefinidamente a fase de desenho porque a implementação ainda não existe (rejeitado); começar caminhos dependentes sem cumprir gates (rejeitado).

### Documentação consultada nesta execução

Context7 novamente resolveu Firebase para /websites/firebase_google, consultando separadamente paginação/índices, validação atômica/limites e snapshot/autenticação. Resultados oficiais relevantes:

- [Cursores](https://firebase.google.com/docs/firestore/query-data/query-cursors): limite e startAfter com desempate da consulta.
- [Índices](https://firebase.google.com/docs/firestore/query-data/index-overview): array-contains e combinação com filtros de igualdade. Campos __name__ seguem a ordenação da consulta; índices finais devem corresponder às consultas concretas, sem assumir todo padrão como composto obrigatório.
- [Autenticação REST](https://firebase.google.com/docs/firestore/use-rest-api): ID token Firebase usa Rules; token de serviço usa IAM e não é o mecanismo cliente adotado.
- [RunQuery](https://firebase.google.com/docs/firestore/reference/rpc/google.firestore.v1): read_time com precisão de microssegundos na última hora, inclusive resposta vazia com read_time.

Auditoria de pesquisa delegada pela skill revisou o agregado, o leitor real e a paginação; recomendações integradas aos modelos/contratos. Não houve edição de código ou teste remoto pelo agente de pesquisa. A contagem local continua evidência documental do grafo declarado, não validação executável de Rules.

## Inventário T001 — implementação existente conferida

- package.json: TypeScript~6.0.2, Firebase13.0.0, React^19.2.8, Vitest4.1.12; nenhuma dependência adicionada.
- operationBudget.ts: limites12/32/32768/1048576/18/8/1000/50; perfilFinanceiroRemoto habilita apenas criarReceita/criarDespesa. Não há perfil remoto parcelados aprovado.
- externosRepository.ts: executar rejeita qualquer tipo além de criarReceita/criarDespesa e bloqueia substituição. Reutilizar a porta005 apenas para criação explícita de receita; pagamentos009 exigem adaptador próprio.
- firestore.rules atual não contém seriesParceladas/operacoesParceladas. Fonte candidata completa é isolada e seu hash-base foi reconferido pelo validador local; não está ativa.
- Reutilização prevista de money/calendar/installments/settlement não equivale a habilitação de liquidações remotas. Schemas avulsos e domínio de cartões permanecem preservados nesta execução local.
- T004: script de orçamento passou48 combinações por comando estrutural, máximos15/16/18; cancelar5, pagar9, reverter11, vincular10. Resultado é aritmética documental, sem compilação/expressões/bytes oficiais.
