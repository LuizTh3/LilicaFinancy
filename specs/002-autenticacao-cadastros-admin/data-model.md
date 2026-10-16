# Data Model: Autenticação, solicitações e administração

Schema inicial 1. Nomes são decisões do desenho; arquivos de Rules/índices serão gerados
completos somente na implementação. Sem dados financeiros ou credenciais nestes documentos.

## Convenções

- UID vem do token validado, nunca de identidade declarada no corpo de um pedido.
- Datas administrativas são strings ISO YYYY-MM-DD válidas no calendário; sem conversão UTC.
- Datas técnicas são timestamps confirmados pelo servidor; não aceitar relógio do navegador.
- Campos não previstos são rejeitados. Senhas, tokens, chaves privadas e API keys não são dados.
- createdAt é imutável. Campos protegidos nunca são liberados por versão de cliente.

## users/{uid} — perfil mínimo privado

| Campo | Tipo | Origem e regra |
| --- | --- | --- |
| uid | string | Igual ao ID do documento e à identidade autenticada; imutável |
| timezone | string | America/Rio_Branco nesta versão |
| schemaVersion | integer | 1; imutável pelo cliente |
| primeiro_login | boolean | true ao criar; false somente pelo serviço confiável |
| passwordChangeCompletedAt | timestamp opcional | Ausente enquanto pendente; protegido |
| createdAt | timestamp | Criação confirmada; imutável |
| updatedAt | timestamp | Atualização técnica confirmada |

Não incluir CPF, WhatsApp ou assinatura no perfil mínimo; o usuário Authentication já
fornece email em memória quando necessário. Cliente pode criar somente perfil novo com
campos exatos, flag true e timestamps de servidor; nesta feature não há edição de perfil
pelo cliente. Perfil pré-existente é lido sem recriação. get próprio continua disponível
para resolver a pendência, mas não autoriza dados administrativos.

Campo ausente primeiro_login implica pendência. Perfil legado conhecido é normalizado
pelo serviço preservando criação; versão desconhecida implica erro, não migração silenciosa.
false confirmado nunca volta a true por login/retry. Reconciliação de fixture de teste é
operação explícita fora do aplicativo, não recurso de promoção ou reset do usuário comum.

**Estado de acesso**:

```text
perfil ausente → criação idempotente true → pendente
pendente → operação Auth confirmada + commit protegido → false, cutoff confirmado
false + auth_time anterior/igual ao cutoff → novo login obrigatório
false + auth_time posterior ao cutoff → pronto
```

A condição normal usa auth_time em segundos: auth_time * 1000 > completedAt.toMillis().
Flag false sem cutoff válido não libera acesso. Um login no mesmo segundo da conclusão
pode exigir aguardar o segundo seguinte e autenticar novamente; refresh de token não basta.

## admins/{uid} — papel manual

Campos: enabled:boolean (deve ser true), createdAt:timestamp. Somente provisionamento
manual confiável fora do app. Nenhum cliente cria, altera, lista ou exclui papéis.
get do próprio papel apenas após acesso pronto. Rules usam o documento atual para cada
operação admin; remoção/disabled impede próxima operação, independentemente da UI em cache.
Ser admin não concede get de users de terceiros nem dispensa primeiro login.

## registrationRequests/{requestId} — solicitação

| Campo | Tipo/validação | Escrita |
| --- | --- | --- |
| schemaVersion | integer 1 | Serviço |
| fullName | string trim, 1–150 caracteres | Serviço; imutável pelo cliente |
| cpf | string com 11 dígitos e dígitos verificadores válidos | Serviço; imutável pelo cliente |
| whatsapp | string E.164 +55, DDD de 2 dígitos e 9 locais | Serviço; imutável pelo cliente |
| email | string trim/normalizada, até 254 caracteres | Serviço; imutável pelo cliente |
| applicantUid | null ou UID vinculado por operação confiável | Nunca por alegação do visitante |
| status | literal received | Sem aprovação automática ou criação de conta |
| createdAt | timestamp | Serviço |
| updatedAt | timestamp | Serviço |

requestId deriva de operationId aleatório, sem CPF/email na chave. CPF verifica estrutura,
não identidade civil; telefone verifica formato, não titularidade/existência. Não há
unicidade global de pessoa: duas operações deliberadamente distintas podem gerar pedidos
distintos; apenas repetição da mesma operação é deduplicada.

A associação opcional de applicantUid será feita manualmente fora da UI ao criar a conta,
por UID confirmado. Não vincular automaticamente por email alegado. Admin consulta página
de 25 solicitações ordenadas por createdAt e nome do documento, com cursor; usuário comum
pode apenas get da própria solicitação se houver vínculo confirmado e sessão pronta.
Visitante só recebe referência, sem get/list dos dados. Lista pública inexiste.

## subscriptions/{requestId} — período administrativo

Campos: requestId:string igual ao ID e referência existente; startDate/endDate:strings
YYYY-MM-DD válidas; version:integer ≥1; createdAt/updatedAt:timestamps;
updatedBy:string igual ao UID admin autenticado. Registro é criado só ao salvar ambas as
datas; endDate ≥ startDate, inclusive período de um único dia. Atualização incrementa
version exatamente em 1 e preserva createdAt e requestId. Admin não edita dados pessoais
pelo formulário de datas. Não há delete/limpar período nesta entrega.

Sem efeito sobre acesso, pagamento ou expiração. Nenhum usuário comum escreve; leitura
administrativa somente depois da troca e novo login. Concorrência usa versão e transação.

## firstLoginOperations/{uid} — operação restrita de troca

Campos: uid, operationId aleatório, attemptVersion, state (prepared/completed/uncertain),
baselinePasswordUpdatedAt obtido do Auth, createdAt, updatedAt, leaseUntil e completedAt
quando concluída. Somente serviço; nenhum acesso direto por SDK cliente.

A mesma operação concluída retorna resultado idempotente. Antes da mutação, trava por UID
com prazo; outra aba recebe operação ocupada ou concluída. Nunca armazena senha, token,
hash de senha, confirmação ou corpo da chamada Auth.

```text
prepared → Auth responde sucesso → transação: completed + perfil false/cutoff
prepared → resultado perdido/recibo não gravado → uncertain, perfil continua true
uncertain → novo login com senha efetiva → nova tentativa com outra senha
completed → retry da mesma operação → retorno concluído, sem outra mutação Auth
```

Não concluir uncertain só por avanço de passwordUpdatedAt; isso não prova a operação
controlada nem a diferença da senha. Conta com perfil false mas recibo inconsistente é
erro de integridade, nunca gatilho para baixar o nível de autorização.

## submissionOperations/{operationKey} — deduplicação pública

operationKey = digest de operationId; campos: requestId, payloadFingerprint (HMAC do
payload normalizado), createdAt e schemaVersion. Criado junto com request/outbox em
transação. Serviço pode comparar repetição sem retornar PII. Mesmo ID com payload distinto
resulta em conflito; não sobrescreve pedido existente.

## notificationOutbox/{requestId} — notificação

Campos: requestId, schemaVersion, deliveryKey UUID estável, templateVersion, status,
attempts, createdAt, updatedAt, nextAttemptAt, leaseUntil/leaseId quando em processamento,
firstDispatchAt, providerMessageId opcional, lastErrorCode sanitizado. Texto construído
somente com referência/data do pedido e URL admin configurada; não conter CPF/telefone/senha.

Estados: pending → sending → accepted; falha conhecida → retry_wait/failed;
resultado incerto → retry dentro da janela de idempotência ou uncertain após a janela.
Não inferir inbox de accepted. Admin pode get por requestId para exibir estado; list e
escritas são exclusivos do serviço. Chave/API secret nunca fica nesse documento.

Lease impede cron/requisição duplicarem trabalho. attempts tem máximo 5 nesta política;
tratar limites externos e resultados incertos conforme contrato API.

## operationBudgets/{key} — controle de abuso

Somente serviço: chave pseudonimizada de janela/rede ou orçamento global, windowStart,
count e expiresAt. Não armazenar IP bruto. Transações impedem contagem concorrente falsa;
limites do aplicativo não são garantias de capacidade do provedor.
Expiração é consultada logicamente; remoção posterior é explícita e restrita, sem depender
de TTL pago ou limpeza global na inicialização.

## Índices e migração

- registrationRequests: paginação createdAt desc + __name__ desc usa índice automático;
  nenhum filtro de CPF/email nesta entrega.
- notificationOutbox: compostos status asc + nextAttemptAt asc, e status asc + leaseUntil asc.
- Desativar índices de campos pessoais que não são consultados (cpf, whatsapp, email,
  fullName) e metadados internos sem query, preservando o índice de paginação necessário.
- Entregar firestore.indexes.json completo se alterado; registrar índices herdados preservados.
- Sem migração automática de dados financeiros. Antes de substituir regras remotas, inventariar
  as regras existentes e salvar cópia real para reversão; negar caminho desconhecido por padrão.

## Fixtures e recuperação operacional

Fixtures do cliente ficam sob UIDs dedicados A/B, com runId e manifesto local de IDs exatos.
Solicitações públicas de teste, necessariamente anteriores ao UID, ficam ligadas ao runId e
UID de teste responsável no manifesto; não fabricar propriedade autenticada do visitante.
Essa exceção mínima de fixture pública deve constar da revisão constitucional do fluxo.
A limpeza deve listar IDs/quantidade, usar manifesto e alvo conferidos e operar somente
na execução selecionada, incluindo outbox/operações dependentes; sem delete global.
