# Feature 005 — fundação (2026-10-18)

**Estado atual: incremento US1 publicado e validado; nove índices READY, oito isenções concluídas, quatro testes reais e fluxo manual aprovados.**

Após o achado abaixo, usuário autorizou explicitamente a substituição da base aberta. A primeira revisão exigiu correção do limite de expressões revelado pelos testes reais. A fonte ativa foi relida e corresponde ao arquivo corrigido (77133633eb823fd97322c7d06382a34eec5aed8e4dcc1c77fd382fd747050cee). Cinco índices criados e prontos, quatro preservados e oito isenções concluídas; nenhuma exclusão de índice ou deploy de hosting/API. Relato cronológico e evidências em ../specs/005-receitas-despesas-externas/deployment-review.md e validation.md. Os checkpoints anteriores abaixo descrevem o estado antes dessa autorização/publicação.

Atualização da comparação autorizada em 2026-10-18: o release remoto ainda é o padrão de teste com leitura/escrita gerais até11/11/2026, sem proteções002/004. Publicação interrompida conforme condição da autorização. Backup fiel preservado, mas sua reativação reabriria o acesso geral; alternativa protegida preparada em firestore-rules-005-safe-rollback.rules. Comparação completa e proposta concreta em ../specs/005-receitas-despesas-externas/deployment-review.md. Nenhum dado ou índice remoto alterado.

- Corrigidos blocos duplicados dentro de safeId/calendarDate. A cópia anterior está em docs/firestore-rules-before-005.rules e é evidência da corrupção, não rollback compilável.
- A compilação oficial projects.test foi autorizada explicitamente pelo responsável e retornou ok=true, issues=[] tanto para a restauração quanto para os helpers de schema2. A API test não criou release nem alterou documentos.
- Categorias/contas novas usam schema2. Legado1 permanece explicitamente legível; patch de primeiro uso conserva conteúdo/version/instantes, acrescentando somente schema2/usoFinanceiro, sem migração no login. Titulares/etiquetas/perfil/recibos anteriores preservam esquema.
- UsoFinanceiro é imutável; CRUD preserva o mapa e bloqueia natureza/tipo/base no antes/depois. Controles legados usoCadastros também continuam protegidos.
- Neste checkpoint, a gravação do evento financeiro ainda está negada: o patch de primeiro uso exige evento ausente antes/presente depois, mas nenhuma operação financeira está liberada. Portanto o helper não abre um caminho isolado para marcar/desmarcar cadastros.
- Antes de qualquer publicação, comparar a revisão remota efetivamente ativa e preservar uma cópia válida para rollback; a cópia corrompida não atende a essa finalidade. Coordenar o cliente schema2 e os novos ramos financeiros, com teste de A/B/ADMIN/PENDING e visitante em ambiente autorizado.
- Nenhum dado de teste real foi criado, excluído ou alterado até este checkpoint; contas/TEST_EXPECTED_PROJECT_ID ainda ausentes. Prova de compilação não equivale a prova de autorização ou publicação.

## Progresso local de US1

Após o checkpoint da fundação, o arquivo local passou a permitir somente criação de previsões de receita/despesa, com origem e recibo recíprocos e primeiro uso da categoria no mesmo commit. Outros comandos financeiros, alterações e exclusões continuam negados. O helper de primeiro uso exige o evento financeiro relacionado; uma escrita auxiliar isolada não é suficiente.

A versão atual, incluindo verificações explícitas de inteiros/booleanos e presença idêntica dos campos opcionais em origem/recibo, foi compilada novamente via projects.test: ok=true, issues=[]. Não houve publicação. Criação, retomada, listagem paginada e detalhe têm testes locais; formulários e rotas estão integrados. Validação remota/manual e demais comandos continuam pendentes. Esse arquivo não constitui entrega remota validada.

### Grafo da criação simples (sem pressupor cache)

| Escrita | Leituras de Rules | Máximo |
| --- | --- | --- |
| Origem | perfil, categoria após commit, titular opcional, conta prevista opcional, recibo após commit | 5 |
| Recibo | origem após commit, até cinco etiquetas | 6 |
| Primeiro uso da categoria | recibo antes e depois | 2 |
| Leitura transacional do recibo | perfil para autorização do get | 1 |

Total máximo desenhado:14, três escritas; máximo por escrita6. O callback não lê origem/cadastros. Após a prova real de T024, o perfil expõe validadoNoProjeto apenas para criação sem substituição; não habilita pagamentos, substituição ou séries genéricas. Limites de strings/listas fecham o tamanho dos documentos, além do teto de16 KiB do comando normalizado. O ramo máximo passou na avaliação oficial da fonte integral e em commit real sob as Rules publicadas; a compilação isolada não demonstrava essa viabilidade. A contagem14 decorre do grafo conservador, sem atribuir métricas de cache ao serviço.

### Índices e preparação de implantação

firestore.indexes.json mantém os seis índices e cinco isenções anteriores, acrescenta dois índices de lancamentosExternos (natureza, competenciaPlanejamento, dataPrevista/vencimento) e um de operacoesExternas (origemId, resultVersion), todos COLLECTION/ASCENDING. __name__ recebe a mesma direção automaticamente. Os mapas comando/antes/depois são isentos de indexação, inclusive subcampos; fato não é isento, pois servirá ao caixa mensal. Não há índice de caixa entregue neste checkpoint.

Antes de publicar: obter e preservar a revisão efetivamente ativa das Rules e o inventário de índices; comparar diferenças remotas e interromper se aparecerem permissões/coleções não contempladas; aguardar índices prontos; coordenar o cliente atualizado, pois clientes antigos que criam categorias/contas schema1 deixam de criar esses cadastros. Publicar somente os arquivos revisados neste checkpoint sob autorização explícita. Não implantar hosting ou trusted-api por inferência.

Rollback de Rules usa a revisão remota válida preservada, nunca docs/firestore-rules-before-005.rules. Após primeiros usos schema2, qualquer rollback também precisa conservar leitura desses documentos e a imutabilidade das travas; a revisão antiga só é suficiente se essa compatibilidade estiver comprovada. Não remover campos de uso financeiro como tentativa de rollback. Índices novos podem permanecer durante a reversão; sua remoção requer verificar consultas ainda em uso e escopo autorizado.

Referências técnicas: [índices e isenções](https://firebase.google.com/docs/firestore/query-data/index-overview), [operadores de strings das Rules](https://firebase.google.com/docs/reference/rules/rules.String). Nenhuma dessas referências substitui os testes remotos do ramo máximo.

---
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
