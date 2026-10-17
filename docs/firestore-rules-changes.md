# Rules e índices — feature 002

**Estado: gerados localmente; não publicados, compilados remotamente nem verificados no projeto real.**
Não existe cópia local anterior a esta primeira entrega. As versões remotas ainda são
desconhecidas; não afirmar que o arquivo novo preserva regras remotas não inventariadas.

## Motivo e permissões

firestore.rules completo protege perfil próprio, primeiro acesso e administração restrita.
Coleções explícitas: users, admins, registrationRequests, subscriptions, notificationOutbox,
firstLoginOperations, submissionOperations e operationBudgets. Todo outro caminho, inclusive
subcoleções financeiras e futuras, é negado por wildcard final exclusivamente de negação.

| Recurso | Permissão cliente |
| --- | --- |
| Perfil | get próprio e create mínimo com true/timestamps servidor; sem list/update/delete |
| Papel | get próprio somente após ready; nenhuma escrita/listagem |
| Solicitações | get admin pronto ou solicitante com vínculo confiável; list admin limit <=25; sem escrita |
| Assinaturas | get/create/update admin pronto, campos exatos e referência existente; sem list/delete |
| Outbox | get admin pronto por ID; demais operações negadas |
| Operações internas/orçamentos | Tudo negado ao cliente |

ready exige schema 1, flag false, cutoff timestamp e auth_time estritamente posterior.
Admin não lê users de terceiros nem finanças. Papel vem de documento manual atual, nunca
nome/email ou campo editável. Datas informativas não liberam/bloqueiam acesso.
Assinaturas validam calendário/bissexto/intervalo, timestamps, autor, versão +1 e diff permitido;
perfil novo rejeita campos extras e cutoff fornecido pelo cliente. Primeiro_login só muda
por serviço confiável após Auth confirmado; Rules isoladas não comprovam mudança de senha.

Índices completos: status/nextAttemptAt e status/leaseUntil de notificationOutbox. Desativados
índices de cpf, whatsapp, email e fullName não consultados. Paginação createdAt/documentId
usa índice automático. Inventariar e incorporar índices existentes necessários antes do deploy.

## Publicação com autorização vigente

1. Confirmar projectId declarado independentemente, projeto conectado e acesso operacional.
2. Exportar/copiar conteúdo integral das Rules e índices ativos para backup local ignorado
   em `.credentials/firestore-backups/`, com data/versão; preservar regras necessárias e
   revisar incompatibilidades com o esquema 002. Não usar o arquivo novo como backup fictício.
3. Revisar firestore.rules, firestore.indexes.json e firebase.json. Verificar compile/test
   remoto das Rules no projeto correto sem abrir permissões, e aguardar índices prontos.
4. Somente com autorização de publicação: usar Firebase CLI oficial autenticada e alvo
   explícito: `firebase deploy --only firestore:rules,firestore:indexes --project PROJETO`.
   CLI não é instalada nem chamada automaticamente pelo build; verificar versão oficial.
5. Confirmar Rules/índices efetivamente ativos no console/CLI; registrar versão e hora no
   validation.md. Só então rodar grupos reais A/B/visitante do guia operacional.

OAuth da conta de serviço ignora Rules: revisar IAM separado, com mínimo necessário e sem
Owner/Editor/delete. Não usar esse acesso como evidência de que usuários estão isolados.

## Rollback coordenado

Manter backup remoto anterior e versão local nova. Reverter apenas para revisão auditada
compatível com o código, sem reabrir finanças ou permitir contornar primeiro_login/cutoff.
Se a antiga for incompatível, bloquear o fluxo afetado e preparar regra restrita corrigida;
não restaurar permissões amplas como atalho. Não apagar dados para resolver incompatibilidade.
Registrar incompatibilidades, revisão aplicada e resultado dos testes após a reversão.

## Evidência

Testes locais de domínio e contratos estão em src/domain e services/trusted-api/src.
Matriz real SDK em tests/integration; sem emuladores. Compilation/types/unitários não
comprovam execução das Rules. Contas dedicadas e infraestrutura ainda não preparadas pelo
responsável: publicação, aceitação real e isolamento remoto permanecem bloqueados.
# Complemento da feature 004 — cadastros privados

Estado: arquivos completos gerados localmente; nenhuma publicação, compilação remota ou validação de Rules no projeto real foi realizada nesta implementação. As informações da feature 002 acima são histórico daquela entrega; este complemento define o escopo atual.

## Coleções e proteção

users/{uid}/titulares, categorias, contas e etiquetas: get/list/create/update apenas para próprio UID, primeiro_login concluído e auth_time posterior ao cutoff. Perfil cadastral exige America/Rio_Branco, sem alterar as permissões já existentes de perfil/admin. Admin não acessa finanças de terceiros. List exige limit 1..50; delete é negado, mesmo sem referências. Arquivados não são editados/reativados e seguem legíveis.

Schemas fechados, tipos/enums e inteiros seguros; nomes normalizados 1..120 caracteres; timestamps de servidor; schemaVersion=1, version+1 e criação imutável. Base é trio completo em centavos/posição/data civil, opcional sem null, zero somente credor, data não futura pelo dia de request.time em UTC−05. Nenhuma credencial ou campo de saldo bancário confirmado é permitido.

Referência conta→titular é construída no próprio UID e usa getAfter: nova/substituída exige titular ativo, histórica idêntica pode permanecer arquivada. Mesmo lote não permite novo vínculo com alvo arquivado. Não há validação baseada somente no dropdown.

operacoesCadastros: get próprio e create-only; list/update/delete negados. Cada alteração exige recibo determinístico da versão, e recibo exige transição correspondente do cadastro antes/depois, conteúdo e timestamps iguais. Não é possível escrever somente um lado do par. operationKey e conteúdo distinguem repetição de conflito; recibo continua legível após edições posteriores.

usoCadastros: get próprio, todas as escritas/list negadas ao cliente. Presença, inclusive de controle malformado, bloqueia natureza da categoria e tipo/base da conta com !existsAfter. Consumidores financeiros permanecem negados; futura liberação deve incluir protocolo de testemunha/controle atômico e novo orçamento. Fixture operacional de controle não prova transição real de primeiro uso.

## Orçamento do arquivo concreto

Sem supor cache: catalogReady faz um lookup de perfil. Escrita cadastral: perfil + recibo pós-estado + titular opcional + controle opcional = até 4. Recibo: perfil + cadastro anterior + cadastro pós-estado = até 3. Par: até 7, com reserva de 8; autorização das até quatro leituras da transação acrescenta até 4, total conservador até 11 com reserva de 12. Continua abaixo da margem interna 8 por operação/18 total e dos 10/20 oficiais.

As funções usam no máximo 5 argumentos e 5 let; profundidade planejada menor que 20, sem recursão/loop. Schemas limitam o conteúdo a poucos campos escalares: nome até 120 caracteres, ID até 64, data dez, enums fixos e timestamps, bem abaixo de 32 KiB/documento e 1 MiB/comando. O limite de 1000 expressões e compilação efetiva ainda requerem validação do ruleset no ambiente autorizado; revisão textual não é compilação nem teste de Rules.

## Índices e reversão

firestore.indexes.json completo preserva índices/fieldOverrides da 002 e acrescenta estado ASC/nome ASC por coleção com desempate __name__ ASC. Payload dados do recibo não é indexado. Consultas privadas sem collectionGroup global. Aguardar índices prontos antes de integração.

### Diagnóstico: Todos funciona, Ativos/Arquivados falham

O filtro Todos ordena por nome/ID sem igualdade de estado. Ativos e Arquivados acrescentam estado == filtro e precisam dos índices compostos estado ASC/nome ASC (escopo COLLECTION) de titulares, categorias, contas e etiquetas. A ausência ou construção desses índices pode retornar failed-precondition; isso não deve ser apresentado como falha de conexão. O aplicativo agora distingue essa condição, sem mostrar a URL interna retornada pelo SDK.

No projeto configurado localmente, lilicafinancy, a consulta somente de leitura `firebase firestore:indexes --project lilicafinancy --non-interactive` foi recusada pela CLI com credenciais inválidas em 2026-10-17. Não foi possível inventariar os índices remotos nem confirmar seu estado. Para retomar: o responsável executa `firebase login --reauth`; em seguida, inventariar e preservar índices remotos necessários antes de qualquer publicação autorizada. Para publicar apenas índices, após essa revisão, usar `firebase deploy --only firestore:indexes --project lilicafinancy`, aguardar os quatro índices ficarem prontos e repetir Ativos/Arquivados/Todos nas quatro coleções. Essa ação não publica Rules. Não aceitar remoções de índices remotos ainda não inventariados.

Atualização operacional em 2026-10-17, após retomada solicitada pelo responsável: acesso de rede à CLI permitiu inventário real do projeto lilicafinancy/(default), que retornou zero índices compostos e zero fieldOverrides. Backup do inventário em .integration/cadastros-indexes/remote-before.indexes.json. Publicados somente os quatro índices estado ASC/nome ASC de titulares, categorias, contas e etiquetas por configuração temporária delimitada em .integration/cadastros-indexes/firebase.json; Firebase CLI confirmou Deploy complete. A primeira leitura posterior, às 16:34:34 UTC−05, mostrou os quatro em CREATING. Rules, índices da outbox e fieldOverrides não foram publicados nesta operação; nenhum documento foi alterado. O arquivo completo versionável firestore.indexes.json foi preservado, e o escopo temporário evitou incluir mudanças não necessárias ao erro relatado.

Verificação final às 16:38:52 UTC−05: Firebase CLI retornou READY para os quatro índices. Evidência salva em .integration/cadastros-indexes/remote-after.txt. Construção remota concluída; o teste da interface com a sessão do usuário ainda depende de recarregar os filtros no navegador.

Backups locais da versão anterior: docs/rules-backups/004-before.rules e 004-before.indexes.json. Não presumir equivalência com a versão ativa remota: exportar/inventariar a versão ativa antes de implantação autorizada, revisar diffs completos, publicar somente esses arquivos e executar matriz cliente A/B/visitante/admin/pending. Reversão deve ser coordenada com o código: a versão 002 nega todos os novos cadastros, portanto desabilita esta feature até retomada, preservando os dados. Não apagar dados para corrigir incompatibilidade.

## Evidências e limitações

Ver specs/004-cadastros-financeiros-privados/validation.md. Unitários verificam domínio, mapper, estado e repositório concreto com fronteira SDK controlada. Eles não comprovam Rules. tests/integration/cadastros.integration.test.ts usa SDK cliente real, preflight, manifesto e contas dedicadas, sem emulador; sua execução exige credenciais/projeto/Rules confirmadas. scripts/prepare-cadastros-fixtures.mts e cleanup-integration.mts são operacionais separados, dry-run por padrão e paths exatos, nunca endpoints do app.

Fontes consultadas via Context7: [transações](https://firebase.google.com/docs/firestore/manage-data/transactions), [campos das Rules](https://firebase.google.com/docs/firestore/security/rules-fields), [limites](https://firebase.google.com/docs/firestore/quotas). Definições atuais de existsAfter foram conferidas na [referência](https://firebase.google.com/docs/reference/rules/rules.firestore).
