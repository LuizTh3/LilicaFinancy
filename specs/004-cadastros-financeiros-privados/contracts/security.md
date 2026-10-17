# Contracts: Autorização, invariantes e orçamento

## Escopo da entrega

Este é contrato de desenho, não arquivo executável/publicado. Implementação entrega firestore.rules completo, firestore.indexes.json completo quando alterado e docs/firestore-rules-changes.md com matriz de validação/publicação/reversão. Preservar match de perfil, admins, solicitações, assinaturas e outbox da feature 002 e default deny. Não ampliar trusted-api ou usar Admin SDK no app.

## Matriz por coleção

Todas sob users/{uid}. own(uid) deve ser verificado antes de ready(); ready preserva uid/schema do perfil, primeiro_login=false, passwordChangeCompletedAt e auth_time posterior ao cutoff. Admin de outro UID não é proprietário. Campo uid/ownerUid e path livre são proibidos nos documentos.

| Coleção | get | list | create | update | delete |
| --- | --- | --- | --- | --- | --- |
| titulares | own+ready | own+ready, limit 1..50 | schema+recibo | schema+versão+recibo, ativo | negar |
| categorias | own+ready | idem | schema+recibo | idem; natureza só sem controle de uso | negar |
| contas | own+ready | idem | schema+recibo+titular | idem; tipo/base só sem controle de uso; titular validado | negar |
| etiquetas | own+ready | idem | schema+recibo | schema+versão+recibo, ativo | negar |
| operacoesCadastros | own+ready, inclusive ausência para retomada | negar | schema+transição recíproca do cadastro | negar | negar |
| usoCadastros | own+ready, inclusive ausência | negar | negar nesta feature | negar | negar |

Regras de listagem não filtram dados por si: o cliente constrói a coleção sob o UID autenticado. Nenhum match recursivo concede acesso geral a users/{uid}/**. Proteções usam schema e relações do data-model.md, não somente identificador da coleção.

## Validação cadastral

1. hasAll/hasOnly por coleção com conjunto comum e campos específicos. Opcionais ausentes, nunca null. Todos os enums, inteiros, faixas, trim/comprimento, referências e timestamps são verificados remotamente.
2. create: estado ativo, schemaVersion=1, version=1, createdAt=updatedAt=request.time, archivedAt ausente.
3. editar: resource ativo, estado ativo, createdAt/schema imutáveis, version anterior+1 e updatedAt=request.time. Mudança efetiva de conteúdo; não usar versão/timestamp como única alteração para simular novo comando.
4. arquivar: resource ativo, novo estado arquivado e archivedAt=updatedAt=request.time, version+1; todos os campos de conteúdo preservados. Não editar arquivado, reativar ou deletar. Repetição tratada sem escrita no adaptador.
5. categoria: se natureza mudar, exigir ausência no pós-estado com !existsAfter de usoCadastros/categorias__{id}. Conta: se tipo ou qualquer elemento/presença do trio de base mudar, exigir ausência no pós-estado com !existsAfter de usoCadastros/contas__{id}. Controle existente, mesmo inválido, nunca desbloqueia.
6. titularId novo/substituído deve ser ID válido e resolver getAfter em titulares do próprio UID, existente e ativo. Igual ao resource anterior pode estar arquivado, mas deve continuar existindo. Ausência é opcional válida. Na transição arquivar a conta, conteúdo igual é preservado e não obriga titular ativo.
7. Base valida calendário e valor/posição/trio completo. Derivar limite do dia local de request.time menos duration.value(5,'h'), exigindo perfil America/Rio_Branco; comparar ano*10000+mes*100+dia. Não usar browser ou campo hoje como autoridade. Guardar tipo/formato antes de int/slices; datas inválidas retornam negação, sem exceção permissiva.

## Reciprocidade do recibo

Recibo R tem path determinístico por coleção, ID e version resultante; operationKey aleatória identifica a intenção, não escolhe caminho de terceiro. Payload dados é map fechado dos campos de conteúdo finais (inclui estado, exclui metadados), comparado campo a campo com os do documento. Opcionais usam ausência consistente, sem aceitar null como atalho.

- Regra do cadastro lê getAfter(R), exige mesmo tipo de comando/transição, coleção, cadastroId, expectedVersion anterior, version atual pretendida e dados iguais ao conteúdo persistido; createdAt do recibo é request.time. Criar exige expectedVersion=0; editar/arquivar exigem versão resource e metadados válidos. Sem recibo correspondente, mutação é negada.
- Regra create de R valida chave/campos/tipos, path canônico e timestamps. Na criação, cadastro estava ausente e getAfter existe com version=1/ativo e timestamps corretos. Em editar/arquivar, get do cadastro anterior tem expectedVersion, getAfter tem version+1 e transição/conteúdo permitidos. Exigir updatedAt=request.time e comparar dados ao resultado.
- Não aceitar recibo para cadastro inalterado, entidade errada ou outro UID. Recibo é create-only; não há reutilização para versão posterior, nem alteração de payload. Estado final de uma só escrita nunca é suficiente: documento exige recibo e recibo exige transição de documento.
- Gravar apenas recibo, apenas cadastro, recibo incompatível, reaproveitar recibo antigo, mudar chave/payload e gravar timestamps do cliente são testes negativos obrigatórios. Leitura de R confirmado permite retomar intenção mesmo se o cadastro já mudou depois.
- Cliente que tenta várias alterações na mesma requisição não ganha permissão extra; cada par precisa satisfazer todas as regras e limites. App oferece um par por comando.

## Orçamento conservador atual

Contagem de chamadas documentais, sem pressupor cache. Reutilizar resultados em let evita duplicação sintática; não chamar ready ou helper de referência várias vezes na mesma branch.

| Escrita | Consultas máximas de autorização | Total por escrita |
| --- | --- | --- |
| Cadastro simples | perfil (1), getAfter recibo (1) | 2 |
| Categoria com natureza alterada | anteriores + existsAfter controle (1) | 3 |
| Conta com base/tipo e titular alterados | perfil (1), recibo (1), existsAfter controle (1), getAfter titular (1) | 4 |
| Recibo | perfil (1), exists anterior (1), get anterior se necessário (1), getAfter cadastro (1) | 4 |

Pior comando atual: 4+4=8 chamadas, duas escritas. Reserva de até cinco por escrita acomoda uma chamada adicional local somente se total continuar <=18. Projetar branches create/update para evitar get anterior ausente e validação duplicada. Regra do recibo não repete leitura do controle/titular: a escrita obrigatória do próprio cadastro valida essas relações. Nenhuma exceção permite recibo sem o cadastro correspondente.

Leituras de dados na transação são distintas das consultas das Rules e também precisam de orçamento: até recibo, cadastro, controle e titular, cada get sujeito ao perfil; contabilizar conservadoramente até quatro acessos adicionais de autorização se cobrados no conjunto. Pior total ampliado <=12, ainda abaixo de 18 interno/20 oficial. Limite por leitura <=1 e por escrita <=4 estimados. Registrar contagem final no arquivo implementado, inclusive expressões <=1000 e limites de função; helpers não podem esconder chamadas duplicadas. Compilação/publicação e teste efetivo continuam gates de implementação.

Consultas list precisam de uma leitura de perfil por avaliação lógica; não projetar regra que exige lookup por item. Não multiplicar allowlist de toda coleção por perfil sem necessidade. Não tratar leitura de 50 registros como se fossem 50 escritas atômicas.

Referência oficial: [limites](https://firebase.google.com/docs/firestore/quotas), [getAfter](https://firebase.google.com/docs/firestore/security/rules-conditions). Os 10/20 oficiais não autorizam exceder a margem interna 8/18 da 003.

## Primeiro uso: contrato de evolução com gate fechado

Atualmente controles são somente lidos e consumidores financeiros são negados. Não existe caminho cliente capaz de criar movimentação sem controle enquanto editar base/tipo é permitido. Isso torna o CRUD atual viável sem implementar finanças antecipadamente.

A primeira feature consumidora que abrir categoria/conta deve implementar simultaneamente:

1. Enum fechado de consumidorTipo e papel; path da testemunha construído no próprio UID, não recebido livremente. Categoria congela na primeira referência; conta congela na primeira movimentação efetiva, sem confundir conta prevista com conta movimentada.
2. Regra do consumidor exige getAfter do controle correspondente, identidade/papel corretos, além de existência/estado/natureza do cadastro. Controle já existente é preservado, não atualizado para cada uso.
3. Regra de criar controle exige cadastro válido e consumidor testemunha antes/depois comprovando criação ou adição real daquela relação na mesma operação. Não basta consumidor inalterado que já referenciava este cadastro, timestamp escolhido ou booleano. Controle posterior nunca pode ser removido/atualizado pelo cliente, nem quando consumidor for cancelado.
4. Atomicidade também impede mudar natureza/base enquanto seu primeiro uso é confirmado: mudança sensível do cadastro exige !existsAfter(controle). Essa verificação única basta porque controle nunca pode ser removido; inclui tanto controle preexistente quanto criado junto do primeiro uso. O cliente não pode preparar atalho que se torne inseguro quando controles forem habilitados.
5. Recibos financeiros e de cadastros têm coleções/contratos distintos. A regra de controle não exige versão cadastral nova porque documento cadastral não precisa mudar no primeiro uso. Não contornar recibos financeiros nem gerar soma duplicada.
6. Reorçar por comando: oito referências+perfil já somam nove; dois controles separados chegam a onze e excedem dez por escrita, além da margem interna oito. Esse consumidor irrestrito permanece bloqueado; reduzir combinações/lote aceito ou revisar esquema para metadado protegido embutido com migração e testes. Nunca retirar validações ou ampliar backend como atalho.

A ausência do controle é verificada apenas no pós-estado por existsAfter (uma chamada), não por dois lookups. Orçamento definitivo: até quatro acessos por escrita, oito no par e doze incluindo a reserva de leituras transacionais. A semântica de existsAfter está na [referência oficial](https://firebase.google.com/docs/reference/rules/rules.firestore).

## Matriz mínima de aceitação

- Positivos em todas as coleções: criar/listar/get/editar/arquivar, recarga e nome duplicado.
- A/B/visitante/admin de outro UID/primeiro acesso pendente: negações get/list/create/update/archive/delete nas quatro coleções e get de auxiliares indevido.
- Schema: extra/null/tipo errado, ID inválido, versões/metadados alterados, credenciais como campos, conteúdo arquivado editado e reativação.
- Referências: titular inexistente, outro UID, path livre, coleção errada, arquivado, ID igual nos dois UIDs; titular arquivado preservado em conta antiga; criar vínculo e arquivar alvo no mesmo lote negado.
- Recibo: escrita isolada/forjada/repetida, concorrência entre duas abas, chave mesma com dados diferentes, perda de resposta e confirmação depois de edição posterior.
- Primeiro uso: controle preparado em UID de teste impede natureza/tipo/base; escrita/deleção cliente do controle sempre negada. Não abrir consumidores só para testar o protocolo futuro.
- Datas/base: ausência, zero, devedor, incompleto, bissextos, futura por relógio cliente manipulado, fronteira de dia local; não há confirmação bancária.
- Consumidores financeiros futuros: testes de conta ativa na liquidação, conta prevista preservada e categoria/etiquetas do mesmo UID são gates daquela implementação, não testes end-to-end declarados nesta entrega.
