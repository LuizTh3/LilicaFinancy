# Operação de autenticação e solicitações

## Estado e configuração

Código local da feature 002. Não foram provisionados Worker, Brevo, Turnstile, contas A/B,
papel admin ou Rules remotas. O responsável confirmou que esses recursos ainda não estão
preparados e solicitou concluir código e verificações locais. Não executar integração agora.

Node mínimo do projeto: >=24.12.0, exigido pelo Firestore SDK atual; npm 11.18.0 e package-lock.json único.
React/Vite existentes preservados. Novos pacotes fixados: Firebase 13.0.0, React Router
7.18.4, jose 6.2.12, Wrangler 4.151.1 e workers-types 5.20261016.1. Revalidar engines
do lockfile antes de trocar runtime. Wrangler requer Node >=22; Router >=20/React >=18.
Override de segurança @grpc/grpc-js 1.13.6 substitui a dependência ~1.9.0 do Firestore,
mantendo major 1; validar também o caminho Node do SDK na integração real antes de ativar.
Avisos oficiais: GHSA-m9gg-hp2v-232j e GHSA-f596-whhp-79r4. A aplicação não cria servidor
gRPC. Não executar audit fix --force ou downgrade do Firebase para resolver esses avisos.

`.env` mantém os quatro campos Firebase existentes. Acrescentar quando configurados
VITE_TRUSTED_API_BASE_URL (HTTPS) e VITE_TURNSTILE_SITE_KEY. Não exigir estes campos
para abrir a home/login; sua ausência bloqueia somente os fluxos que os usam. Configuração
Firebase incompleta impede inicialização parcial e informa nomes sem valores.

Todo VITE_ integra o bundle público; não é cofre. Nunca usar senha, chave privada, API key
Brevo ou credencial administrativa em VITE_. `.env.example` e `.dev.vars.example` contêm
somente nomes e valores vazios. Não imprimir variáveis nem incluir corpos em logs/tracing.

## Serviço restrito

Variáveis do `.env` do frontend não configuram automaticamente o Worker. Cadastre suas
variáveis e secrets de execução em Workers & Pages → lilica-trusted-api → Settings →
Variables and Secrets (não somente nas variáveis de build). A configuração Wrangler mantém
keep_vars=true para preservar as variáveis do painel nas próximas publicações.

Diagnóstico: CONFIG_INCOMPLETE/503 inclui missingConfiguration com somente os nomes
ausentes, nunca valores. Corrigir as entradas indicadas no painel e aplicar a configuração.
DEPENDENCY_UNAVAILABLE indica falha posterior/dependência indisponível; NETWORK_UNAVAILABLE
indica falha de conexão do navegador. A interface exibe referência técnica quando recebida.
Para falhas classificadas no cadastro, a resposta inclui `dependency` (`TURNSTILE`,
`GOOGLE_PRIVATE_KEY`, `GOOGLE_OAUTH` ou `FIRESTORE`) e, quando houve resposta HTTP,
`upstreamStatus`. Não retorna corpo externo, tokens, credenciais ou dados pessoais.
`FIRESTORE`/403 indica rejeição de acesso; 404 ao iniciar transação exige conferir
projeto e banco `(default)`. `GOOGLE_PRIVATE_KEY` indica falha ao importar a chave PEM.
Esses campos exigem a publicação da versão atualizada do Worker.
O campo missingConfiguration deve ser consultado em Network/Response, sem copiar payload
do cadastro ou credenciais. Chaves privadas permanecem exclusivamente em Secrets.

Uma atualização local desse diagnóstico exige publicar a nova versão do código para que a
API remota passe a retorná-lo: `npx wrangler deploy --config services/trusted-api/wrangler.jsonc --keep-vars`.
Executar somente conforme autorização vigente e após revisar o código; build:trusted-api
continua dry-run, sem publicação automática.

O workspace services/trusted-api usa APIs Auth/Firestore REST, sem Admin SDK no navegador.
Configure bindings/secrets conforme services/trusted-api/.dev.vars.example. ALLOWED_ORIGINS
é lista separada por vírgula de origens exatas; APP_BASE_URL é HTTPS; TURNSTILE_HOSTNAME
é hostname exato com action registration. Siteverify é obrigatório. CORS não é autenticação.

GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, BREVO_API_KEY, TURNSTILE_SECRET_KEY,
SUBMISSION_HMAC_SECRET e NETWORK_HASH_SECRET são secrets do Worker, ou `.dev.vars` local
ignorado. FIREBASE_AUTH_API_KEY identifica o mesmo projeto e precisa permitir chamadas do
serviço; não remover restrições da chave web globalmente para contornar incompatibilidade.
Não registrar conta, comprar domínio ou ativar Blaze/Paid automaticamente.

A conta Google é exclusiva. Revisar papel customizado com operações Firestore necessárias
(leitura, criação/atualização e transações) e firebaseauth.users.get para lookup. Não conceder
Owner/Editor, gestão de papéis ou delete ao Worker. Testar o IAM real antes de ativar; esta
lista não é prova de permissões suficientes. OAuth de serviço ignora Rules: IAM pode não
isolar coleções; validação/caminhos fixos no código e testes dos endpoints são obrigatórios.
Credencial de limpeza é separada e não pertence ao Worker.

Antes de ativar Cloudflare Free, medir CPU/cold start e subrequests reais de cada operação,
incluindo verificação JWT/OAuth, transações e cron. Referência consultada: 10 ms CPU,
50 subrequests e 100.000 requests/dia. Um cron de 5 min processa até 5 itens; contas/limites
podem variar. Falhar de forma explícita se não couber, sem reduzir proteção ou ativar pago.
Observability/captura de corpos está desabilitada; não adicionar logging de request/resposta.

## Contas, primeiro acesso e administração

Habilitar email/senha no Firebase Auth do projeto confirmado. O formulário público salva
solicitação, nunca cria conta. O responsável cria a conta manualmente no console e entrega
email/senha provisória por canal adequado, sem senha no email automático de aviso.

No login, users/{uid} é criado idempotentemente com primeiro_login=true, schemaVersion=1,
timezone America/Rio_Branco e timestamps. Conta antiga sem flag fica pendente; normalização
confiável preserva createdAt. Versão desconhecida bloqueia sem migração silenciosa.

Primeiro acesso tem dois campos: nova senha e confirmação. A política efetiva é conferida
com o Auth. Serviço compara com a senha atual, exige conta ativa/login recente e realiza
a troca; somente sucesso seguido de commit protegido grava false/cutoff/recibo. Nova senha
transita apenas em memória por HTTPS; não armazenar nem capturar. Sessão provisória de
outra aba é negada pelo cutoff mesmo se a flag já for false. Login deve ocorrer no segundo
posterior ao cutoff; refresh de token não substitui novo signIn. App exige logout e login
explícito, sem guardar senha para autenticar automaticamente.

Falha entre Auth e Firestore pode já ter alterado a senha. A conta continua pendente: sair,
entrar com a senha efetiva recém escolhida e escolher outra nova. Não marcar false manualmente
para recuperar nem depender da senha provisória já inválida. Recibo completed permite retry
sem nova troca. Nunca concluir apenas por passwordUpdatedAt. Se a saída falhar, repetir sair.

Papel manual: criar admins/{UID_EXISTENTE} com enabled boolean true e createdAt timestamp.
Isso não cria conta. Admin também conclui primeiro acesso. Remover/desativar papel nega nova
operação; UI limpa dados ao detectar alteração/permission-denied. Não há escrita de papel
pela aplicação. Admin vê solicitações/assinaturas/outbox por escopos explícitos, nunca perfis
alheios ou finanças. applicantUid só é associado manualmente a UID confirmado, sem alegação
pública ou associação automática por email.

Datas administrativas são ISO de calendário, ambas obrigatórias ao salvar e fim >= início.
Não controlam acesso, cobrança ou renovação. Concorrência usa versão observada e transação;
conflito exige recarga, não sobrescrita da edição anterior.

## Email e recuperação

Após confirmar persistência do cadastro, o navegador encaminha para WhatsApp
+55 (68) 99973-9841 com texto genérico de interesse no LilicaFinancy. Não envia a mensagem
sozinho nem inclui CPF/email/dados do formulário. O recibo tem link manual de fallback.
Esse encaminhamento não substitui, aguarda ou altera a outbox/email descrita abaixo.

Brevo Free exige conta transacional e remetente no-reply verificável. Não inventar domínio
gratuito. Referência: 300 emails/dia, marca do provedor e deduplicação de 30 min; confirmar
condições oficiais na ativação. Destino fixo luizgustavo.dev01@gmail.com; aviso só traz
referência/data/URL administrativa. Não inclui CPF/WhatsApp, credenciais ou conteúdo livre.

Cadastro confirma somente commit de pedido/operação/outbox. Cron independente do navegador
usa lease, payload congelado e UUID estável em headers.idempotencyKey no JSON Brevo.
Máximo 5 tentativas. Resposta perdida pode repetir com a mesma chave apenas até 25 min do
primeiro dispatch; depois uncertain exige conferência manual no provedor. Não reenviar
automaticamente fora da janela. accepted/accepted_deduplicated indicam aceite, não inbox.
Configuração ausente mantém pedido pendente. Reconciliação é procedimento do responsável,
não endpoint de reenvio público ou edição livre de status no admin.

## Testes reais opt-in, ainda bloqueados

`npm test` nunca conecta ao Firebase. `npm run test:integration` lê `.env.integration`
(ignorado) e variáveis de processo. Configurar TEST_EXPECTED_PROJECT_ID independentemente
de VITE_FIREBASE_PROJECT_ID, TEST_RUN_ID novo (8–80 caracteres), TEST_USER_A/B_UID,
EMAIL/PASSWORD, e TEST_RULES_CONFIRMED=yes após verificar a implantação correta. Nunca usar
contas pessoais. Suíte aborta antes de fixtures se alvo divergir; UID real é confirmado
após signIn e antes de escrita. Falta de configuração é falha explícita, sem suite verde.

TEST_INTEGRATION_GROUP seleciona uma etapa: access (padrão), session, firstLogin,
registration, admin, trusted-api ou notifications. Executar etapas separadas deliberadamente:

1. session cria somente perfis ausentes sob A/B e registra manifesto. access verifica CRUD,
   listagens, flags protegidas e finanças/subcoleções negadas para A/B/visitante.
2. firstLogin exige TEST_ALLOW_PASSWORD_CHANGE=yes, TEST_USER_A_NEW_PASSWORD,
   TEST_TRUSTED_API_BASE_URL e TEST_APP_ORIGIN. Altera de verdade a senha dedicada A;
   atualizar o secret local de A para as próximas etapas, sem imprimir valores. Não resetar
   perfis/contas preexistentes automaticamente. Repetir para B pelo roteiro manual.
3. registration exige API/origem, TEST_ALLOW_EMAIL=yes e dois tokens humanos legítimos
   TEST_TURNSTILE_TOKEN/TEST_TURNSTILE_RETRY_TOKEN de desafios distintos. Não automatizar
   solução de CAPTCHA ou usar test key em produção. Produz um pedido/outbox e até um aviso.
4. admin exige TEST_REQUEST_ID da fixture desta execução e TEST_ADMIN_A_CONFIRMED=yes;
   operador provisiona o papel A manualmente. Usar pedido ainda sem assinatura. Testar
   remoção de papel manualmente e restaurar o estado anterior ao finalizar.
5. trusted-api valida negações sem causar envio. notifications confere a outbox já processada,
   sem reenviar. Manter total <=2 avisos reais por execução. Conferir inbox separadamente.

Testes SDK comprovam Rules; OAuth de serviço comprova somente endpoint. Cenários de navegador,
duas abas, recarga, falha parcial Auth/commit, remoção de papel e falha/cota do email seguem
quickstart.md; registrar explicitamente quais foram manuais/automatizados/não executados.
Não há parâmetro público para injetar falha em produção.

## Limpeza delimitada

Manifestos `.integration/{runId}.json` contêm somente IDs/UIDs técnicos locais, nunca PII
ou credenciais. Documentos públicos ficam associados à execução/UID responsável nesse
manifesto, sem fabricar proprietário autenticado. Usar apenas IDs gerados na execução;
antes de testar admin, conferir a correspondência do pedido ao manifesto.

Dry-run: `node scripts/cleanup-integration.mts --manifest .integration/EXECUCAO.json --project PROJETO --run EXECUCAO --uids UID_A,UID_B`.
Exige TEST_EXPECTED_PROJECT_ID/TEST_RUN_ID correspondentes; sem credencial só lista escopo.
Com CLEANUP_GOOGLE_ACCESS_TOKEN operacional, lê createTime/updateTime e verifica ausência
de subcoleções; grava `.reviewed.json` local. Nenhum delete nessa etapa.
Após revisão e autorização, o mesmo comando com `--execute` apaga somente IDs revisados,
com precondição de updateTime. Alteração/preexistência/subcoleção desconhecida interrompe.
Não há exclusão global, coleção por prefixo, conta Auth, papel preexistente ou contador global.
Operações internas de primeiro acesso já existentes exigem inventário manual separado;
o script não as apaga automaticamente. Não assumir que remover pai limpa subcoleções.

## Fontes oficiais consultadas

- https://firebase.google.com/docs/auth/web/custom-dependencies
- https://firebase.google.com/docs/firestore/manage-data/enable-offline
- https://firebase.google.com/docs/reference/rest/auth
- https://firebase.google.com/docs/reference/rules/rules.String
- https://firebase.google.com/docs/firestore/use-rest-api
- https://reactrouter.com/7.18.4/start/declarative/installation
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/configuration/secrets/
- https://developers.brevo.com/docs/heterogenous-versions-batch-emails

Consulta via Context7 e fontes oficiais em 2026-10-16; versões também conferidas no npm.
