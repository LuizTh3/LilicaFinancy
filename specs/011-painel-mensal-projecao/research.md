# Research: Painel mensal e projeção de 12 meses

Pesquisa em2026-10-20; escopo documental e leitura local. Não é execução de testes financeiros nem aprovação de dependências.

## 1. Inventário concreto

| Fonte | Evidência local | Decisão para011 |
| --- | --- | --- |
|003 | money.ts,calendar.ts,settlement.ts,projections.ts | Reutilizar primitivas; não alimentar projeção legada com fatura+parcelas |
|005 | externosRepository/Mapper/Queries/SnapshotReader e telas | Lista runtime só planejamento; caixa no leitor inferior, não porta de alto nível pronta |
|006 | faturasQueries/Mapper, contratos/faturas, availability=true | Disponível calendário; Fatura não contém totais monetários. Queries SDK não compartilham readTime |
|007 | Desenho/candidatas, sem módulo de produto em src | Consumo compra e itens por revisão dependem de implementação e habilitação |
|008 | Desenho/candidatas, sem módulo de produto em src | Controles financeiros, pagamentos e ajustes ainda não disponíveis |
|009 | Desenho/candidata, sem módulo de produto em src | Mapa finito de parcelas por série, não documentos avulsos; implementação pendente |
|010 | Desenho/candidata, sem serviço de produto em src | Reutilização obrigatória do futuro serviço; T007 pendente após503, sem substituir pelo recurrence.ts legado |

Disponibilidade de arquivo ou tarefa marcada não é prova remota. operationBudget.ts habilita criação005 e comandos006 específicos; demais perfis não são habilitados automaticamente. Rules/índices raiz só cobrem caminhos implementados até006.

## 2. Momento comum de consulta

**Decision**: Um SnapshotPainel de servidor, caller-owned, passado a todos os adapters. REST runQuery/batchGet com Firebase ID token e readTime fixo. Adquirir por consulta permitida limit1 e repetir consulta inicial no readTime escolhido antes de agregar; até vazio precisa retornar readTime. Manter TTL50min e não arredondar timestamp de forma que represente outro instante. Validar precisão suportada e resposta. Não incluir dados da sondagem como fonte reconciliada sem releitura.

**Rationale**: A decisão A exige consistência entre fontes, páginas e detalhes. externosSnapshotReader já estabelece padrão; faturasQueries faz leituras independentes e não serve diretamente. readTime dentro da última hora é suportado sem depender de PITR.

**Alternatives considered**: Promise.all de repos atuais não fixa momento; listener geral lê histórico ilimitado; transação longa não serve a continuação humana; comparar versões antes/depois de fontes parciais não prova ausência de nova origem. Snapshot compartilhado é a opção escolhida.

**Implication**: IDs, revisões, calendários, ajustes, classificações e slots ausentes devem vir do mesmo snapshot. Após mutação, conservar visão antiga identificada e construir outra, trocando integralmente. Detalhe antigo segue snapshot; formulário de mutação usa prévia atual dos contratos de origem e não reutiliza snapshot velho para escrever.

## 3. Fonte única por base

**Decision**: Criar normalização011 e consolidação pura tipada por autoridade. O helper003 soma parcelasCartao; por isso não recebe simultaneamente faturas completas. Reutilizar dinheiro/diferença/liquidação e seus testes, sem duplicar fórmulas na UI.

**Rationale**: Compromissos de cartão são uma contribuição de fatura; consumo é compra integral; caixa é efeito efetivo. Parcelas009 são slots do mapa e O010 de assinatura já é compra/item. O título de série ou valor original não é outra saída. Controles008 são reconstruíveis e não dispensam reconciliação.

**Alternatives considered**: Somar todas as listas e deduplicar por descrição não identifica autoridade; usar apenas controle008 pode mostrar posição do controle, mas não prova detalhe integral; criar documento de resumo traz nova obrigação de consistência sem necessidade.

## 4. Leitura, índices e escopo temporal

**Decision**: Scheduler global com100 documentos físicos retornados por rodada, páginas<=50, batch exato<=8 reduzido se custo Rules exigir,8 HTTP por rodada incluindo sondagem, consultas vazias e missing. Orçamento reserva limite antes de disparar, para concorrência não exceder teto. Referências, controles e candidatos filtrados contam. Até50 linhas por página; cursor guarda fila de fases/subrecortes e buffers limitados da sessão.

**Rationale**: Limitar retorno visível não limita leituras. Consulta008 por datasCaixa pode exigir até31 subconsultas por mês; teto de requisições impede que datas vazias contornem limite100. Não completar automaticamente doze meses em laço infinito. Usuário avança a continuação.

**Alternatives considered**:100 por fonte multiplica custo; fetch de histórico para descobrir pagamentos é proibido; filtro remoto com todo cruzamento de etiquetas cria combinatória de índices. Consultar período, filtrar localmente e marcar parcialidade mantém custo explícito.

**Implication**: Projeção010 descobre séries por sobreposição de vigência virtual indexada, com slots/revisões no mesmo snapshot. Séries antigas ainda vigentes permanecem candidatas, mas encerradas sem impacto virtual ficam fora da descoberta. Persistidas usam consultas independentes por competência/fatura/data, preservando exceções e confirmações posteriores ao encerramento. Metadados escalares e índice definidos em data-model.md/contracts/queries.md exigem evolução fechada010 e prova de cobertura de legados; não há fallback para listar todo catálogo histórico. G1 exige também orçamento externo ao leitor010 em vez de reiniciar100 por fonte.

## 5. Filtros e sentido de incompleto

**Decision**: Mesma dimensão usa união, dimensões distintas interseção, identidades deduplicadas. Categoria/etiqueta em fatura oferece subtotal de itens e contexto integral; pagamento/pendência não são rateados. Indicador inaplicável tem estado próprio distinto de parcial, zero e erro.

**Rationale**: Pagamento parcial é da fatura. Ausência de política impede atribuí-lo a itens. Filtro de cartão exclui compatibilidade do resultado global de receitas menos todas as despesas.

**Alternatives considered**: Rateio proporcional, primeiro item pago e desconto silencioso do total produziriam política não solicitada. Falhar tudo quando somente uma fonte falha ocultaria informações úteis; permitido mostrar subconjunto explicitamente parcial.

## 6. Cache, segurança e saldo

**Decision**: Cache em memória por UID/generation/snapshot/consulta normalizada/versão dos adapters; duas janelas e8MiB estimados; último completo visível separado de atualização em andamento. Invalidar/abortar ao logout, troca de geração, permissão ou schema. Sem URLs com tokens, dados financeiros em storage persistente ou logs de payloads. Saldo calculado inicial retorna indisponível por pré-requisitos ausentes; não criar livro de contas nesta feature.

**Rationale**: client.ts usa memoryLocalCache, SessionProvider já invalida geração, mas precisa limpar cache/controladores011. Resultado é diferente de dinheiro disponível. Sem movimentos completos e saldo datado não existe saldo confiável para exibir.

**Alternatives considered**: Persistir cache local e totais em Firestore aumenta privacidade/consistência; derivar saldo do resultado mensal é incorreto.

## 7. Prova e implantação

**Decision**: Desenvolver testes puros primeiro; G0-local libera domínio/interface com fixtures após integrar limpeza/aborto na sessão. G0-remoto exige prova autenticada de snapshot e escrita concorrente durante carga/continuação/detalhe antes da habilitação de produto/MVP; fonte ou ambiente remoto ausente não bloqueia trabalho puro já aprovado localmente. Integrar pelos demais gatesG1–G3. Sem agregados persistidos novos. Rules get/list próprias, limit<=50, sem nova escrita011. Evoluções010 de vigência indexada e008 de competenciasConsumo obrigatório0/1 exigem arquivo completo, nota, cobertura de legados e regressões; publicação/fixtures têm autorização separada. Não reutilizar autorização de avaliação010 para011.

**Rationale**: Admin/IAM não prova Rules de cliente. Plano não assume fontes remotas prontas. Um batch de8 documentos com regra custosa pode exceder20 acessos; provar grafo sem cache, reduzir lote ou usar gets individuais sob tetoHTTP, sem retirar autorização.

## Referências oficiais consultadas

Context7: resolve Firebase → `/websites/firebase_google`, seguido de query específica de snapshot/autenticação. Resultado genérico incluía Enterprise; decisões foram conferidas na referência REST Standard abaixo, não extrapoladas de Enterprise. Consultas enviaram apenas dúvidas genéricas, sem código/fonte privada.

- [runQuery](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/runQuery): seletor readTime na última hora; resposta vazia inclui instante. Fluxo inicial pode ter tempos monotônicos; repetir no instante escolhido evita mistura.
- [batchGet](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/batchGet): readTime, found/missing e resposta fora da ordem pedida; normalizar por nome completo.
- [REST e autenticação](https://firebase.google.com/docs/firestore/use-rest-api): ID token Firebase usa Security Rules; não trocar por credenciais administrativas.
- [Limites](https://firebase.google.com/docs/firestore/quotas): limites oficiais de avaliação de Rules10/20 e1000 expressões são diferentes dos tetos locais100docs/8HTTP/50min. Provar custo real sem presumir cache.

Não houve chamada ao banco financeiro, instalação, publicação ou teste de aceitação neste planejamento. Todos os desconhecidos de desenho foram resolvidos; gates de execução permanecem explícitos.

## Inventário de implementação011 — 20/10/2026

- src/infrastructure/firebase/externosQueries.ts: existe; contrato inspecionado
- src/infrastructure/firebase/faturasQueries.ts: existe; contrato inspecionado
- src/domain/finance/projections.ts: existe; contrato inspecionado
- src/infrastructure/firebase/parceladosQueries.ts: ausente; capacidade dependente permanece indisponível
- src/infrastructure/firebase/liquidacoesFaturasQueries.ts: ausente; capacidade dependente permanece indisponível
- src/domain/finance/recorrenciasProjection.ts: ausente; capacidade dependente permanece indisponível

externosQueries.validQuery aceita apenas planejamento; faturasQueries usa getDoc/getDocsFromServer independentes e Fatura006 é calendário sem totais financeiros. projections003 recebe parcelasCartao e não deve receber também fatura como saída. operationBudget habilita criação005 e comandos006 específicos; não habilita007–010. Nenhum gate externo foi promovido nesta conferência.
