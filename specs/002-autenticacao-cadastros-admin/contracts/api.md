# Contract: API externa restrita

Base URL HTTPS configurada, versão `/v1`. Worker Free proposto; não é uma API genérica de
Firestore/Auth. CORS restrito às origens configuradas; autorização real conforme abaixo.
`Cache-Control: no-store` em respostas. Nunca aceitar projectId, UID, caminhos de documento,
destinatário, remetente ou template arbitrários do navegador.

## Regras comuns

- JSON UTF-8 e corpo máximo 8 KiB (limite do aplicativo, inferior ao limite de plataforma).
- Chaves não previstas rejeitadas; mensagens de erro sem PII/token/senha/provider body.
- operationId: 32 bytes aleatórios, base64url, reutilizado somente para retry da mesma operação.
- Token Firebase no header Authorization: Bearer, validado criptograficamente: RS256,
  kid/certificado Google válido, exp/iat/auth_time, aud/iss do projeto fixo, sub/UID não vazio.
- Certificados e token OAuth de serviço cacheados só pelo prazo permitido e com margem;
  não aceitar algoritmo, emissor, chave ou URL de certificado escolhidos pelo cliente.
- Para endpoints autenticados, consultar Auth real para conta ativa/projeto e tratar revogação
  pertinente. Verificação JWT isolada não comprova que a conta continua habilitada.
- Erros: 400 INVALID_INPUT; 401 AUTH_REQUIRED/REAUTH_REQUIRED; 403 FORBIDDEN;
  409 OPERATION_CONFLICT/OPERATION_BUSY; 413 BODY_TOO_LARGE; 429 RATE_LIMITED;
  503 DEPENDENCY_UNAVAILABLE. Resposta traz code e requestId não sensível, sem stack remoto.
- Timeout externo de 10 segundos é política inicial do app, sem afirmar SLA do provedor.
- Sem captura de corpos/Authorization em logs, tracing, analytics ou ferramentas de erro.
- Configuração de execução ausente retorna 503 CONFIG_INCOMPLETE e missingConfiguration
  com somente nomes das entradas ausentes, além de requestId. Não incluir valores de
  configuração, credenciais ou dados pessoais. O frontend distingue esse caso de falha de
  rede e resposta inválida, preservando uma referência técnica sanitizada.

## POST /v1/registration-requests

**Ator**: visitante, sem sessão obrigatória. Não cria conta nem devolve token.
**Headers**: Idempotency-Key = operationId. **Body**: fullName, cpf, whatsapp, email,
turnstileToken. Os quatro primeiros são os únicos campos visíveis do formulário.

Validar domínio/hostname e action registration no Siteverify. Token de desafio é transitório,
sem persistência. Mesmo pedido após timeout obtém novo desafio e mantém Idempotency-Key.
Validar e normalizar campos como em [data-model.md](../data-model.md); fingerprint HMAC
serve apenas a deduplicação, nunca a autenticação por CPF/email.

Orçamentos iniciais próprios: 20 novas operações por rede pseudonimizada/hora e 100 novas
operações globais/dia UTC, com contador transacional. Não são cotas dos provedores;
429 não convida a pagamento. Retry de operação já criada não cria outra nem consome novo
orçamento de cadastro, mas continua sujeito ao limite de tráfego/antiabuso.

Transação cria pedido, submissionOperations e outbox. Responder somente após confirmação:
201 {requestId, status: received, notificationStatus: pending}; retry idêntico retorna 200
com o mesmo recibo. Se payload distinto com mesma operação: 409, sem retornar valores antigos.
Se commit ocorreu mas resposta se perdeu, replay recupera recibo. Se commit falhou, não há
confirmação. Não há endpoint público de listagem, detalhe ou busca por email/CPF.

O endpoint pode tentar a primeira notificação após persistir, mas a conclusão não depende
desse processo permanecer vivo: cron retoma outbox. Nenhuma resposta diz que a conta foi criada.

## POST /v1/first-login/change-password

**Ator**: usuário autenticado com perfil pendente, inclusive admin pendente.
**Headers**: Authorization e Idempotency-Key. **Body**: newPassword, confirmPassword.
Duas strings coincidentes e não vazias; política real do projeto aplicada pelo Auth.
Não aceitar oldPassword, UID, flag, email ou campos de perfil no corpo.

O serviço recebe essas senhas apenas durante a chamada para validar/encaminhar ao
Authentication; proibir armazenamento e qualquer logging de corpo, inclusive em exceções.
Não há API administrativa genérica de mudar senha de terceiros.

Orçamento: até 5 novas tentativas por UID/15 minutos; respostas de uma operação já concluída
são idempotentes. auth_time deve estar nos últimos 5 minutos (política do app, não descrição
do timeout interno do SDK). Exigir novo login se o provedor solicitar sessão recente.

Protocolo:

1. Validar identidade e perfil. Operação concluída do próprio UID retorna o recibo sem outra
   mutação. Flag false sem recibo/cutoff coerente resulta em erro de integridade.
2. Obter email real e estado password ativo via Auth, nunca do corpo. Rejeitar conta inválida.
3. Trava por UID em firstLoginOperations, com lease de 30 segundos e attemptVersion.
   Outra operação ativa retorna 409. Certificar que trabalho não continue após perder lease.
4. Verificar candidata contra accounts:signInWithPassword usando email real. Sucesso indica
   senha atual e retorna SAME_PASSWORD. Só INVALID_LOGIN_CREDENTIALS, com conta ativa e
   atributos ainda coerentes, permite seguir; qualquer outra falha bloqueia a alteração.
   Descartar todos os tokens retornados nesse teste, sem iniciar sessão no navegador.
5. Chamar accounts:update com ID token autenticado e candidata. Sucesso deve corresponder
   ao UID esperado. Não devolver idToken/refreshToken dessa chamada ao frontend.
6. Transação com versão/lease grava recibo completed, perfil false, cutoff confirmado e
   updatedAt. Sem esse commit não há conclusão. Nunca aceitar timestamp enviado pelo cliente
   ou um simples avanço de passwordUpdatedAt como substituto do recibo da operação controlada.
7. Responder 200 {status: completed, reloginRequired: true, loginAvailableAt}. A UI limpa
   campos, encerra sessão e volta ao login, sem autenticar automaticamente com nova senha.

loginAvailableAt corresponde ao segundo posterior ao cutoff confirmado. Sessão anterior,
inclusive outra aba com token ainda não expirado, não satisfaz o guard normal das Rules.
Se signOut falhar, manter tela bloqueada e repetir, sem navegar para app.

**Falha parcial**: Auth pode aceitar a senha e o commit do recibo falhar. Retornar ou
registrar PASSWORD_CHANGE_UNCERTAIN, sem false; usuário faz login com a senha efetiva
(recém escolhida) e repete a troca com outra nova. A instrução deve explicar que a primeira
pode já ter mudado, sem pedir senha antiga inválida. Após lease expirada, nova operação
controlada é permitida; nenhuma recuperação baseada só em metadata Auth libera o perfil.

## POST /v1/first-login/normalize-profile

Somente próprio UID autenticado; sem parâmetros mutáveis. Normaliza perfil legado conhecido
que não tem flag, adicionando true e preservando criação. Não transforma false em true nem
rebaixa schema; versão desconhecida retorna UNSUPPORTED_PROFILE. Perfil novo continua
podendo ser criado via SDK cliente com true conforme Rules; corrida é idempotente.

## Cron: entrega da outbox

Um agendamento a cada 5 minutos, no máximo 5 itens por invocação. Consulta estados due com
índices previstos; trava cada item por transação e limita subrequests abaixo do teto do Free.
Retry máximo 5 tentativas por política de operação, sem loops ilimitados ou carga em massa.

- API HTTPS Brevo com destinatário servidor fixo luizgustavo.dev01@gmail.com.
- Remetente autorizado/verificado em configuração; sem domínio inventado.
- Assunto/corpo fixos: aviso resumido, referência, data original e URL admin por ID. Sem CPF,
  WhatsApp, senhas ou tokens. Não aceitar conteúdo arbitrário do visitante.
- Chave UUID estável em headers.idempotencyKey do payload Brevo, conforme contrato do provedor.
  Mesmo payload/template para todos os retries da operação. Campo do payload não é segredo.
- Registrar accepted/providerMessageId em resposta positiva. duplicate_parameter documentado
  indica deduplicação da mesma chave; registrar accepted_deduplicated sem inventar messageId.
- Timeout/queda deixa resultado incerto; retry com mesma chave apenas dentro de 25 minutos
  do primeiro dispatch (margem para janela documentada de 30 minutos). Depois: uncertain,
  sem reenvio automático; reconciliação manual com provedor é necessária.
- Cota excedida/erro conhecido indica retry_wait ou failed com código sanitizado, sem
  perder a solicitação, abrir plano pago ou afirmar entrega na caixa de entrada.

Não depender de waitUntil para confiabilidade. Não expor cron ou reenvio privilegiado como
endpoint público. Administração nesta feature exibe estado; reconciliação/recuperação de
resultado incerto é procedimento do responsável, não edição livre do status pelo cliente.

## Segurança operacional e testes

Conta de serviço Google exclusiva, menor papel IAM viável às operações necessárias, sem
Owner/Editor; validar permissões reais antes do deploy. Seu OAuth ignora Rules: handler
aceita somente caminhos fixos e tipos permitidos. Nenhuma rota de delete global ou de
escrita de papel admin. Nenhum secret em VITE_, no Git, em endpoints de diagnóstico ou logs.
Testar identidade de projeto diferente, token expirado, UID injetado, campo extra, replay
com payload diferente, quota e tentativa de editar flags por cliente.
