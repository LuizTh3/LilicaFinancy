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
