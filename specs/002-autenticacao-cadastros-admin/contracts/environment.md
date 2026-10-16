# Contract: Ambiente e pré-requisitos operacionais

Não reproduzir valores reais existentes. A implementação preserva .gitignore e as quatro
chaves Firebase do .env e mantém .env.example versionável somente com nomes/valores vazios.

## Frontend

Campos existentes: VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN,
VITE_FIREBASE_PROJECT_ID e VITE_FIREBASE_APP_ID.

Adicionar somente quando os consumidores forem implementados:

- VITE_TRUSTED_API_BASE_URL: URL pública HTTPS do serviço restrito; sem credenciais.
- VITE_TURNSTILE_SITE_KEY: chave pública do widget de proteção do cadastro.

Não acrescentar analytics, storage ou campos não usados. Validar nomes necessários e
formato; mensagens citam o nome ausente sem imprimir valor. Inicialização real inválida
mostra erro de configuração, não conecta parcialmente nem simula sucesso.
VITE_ vai para o bundle; não é local de segredo. Site key pública não substitui Siteverify.

## Worker, fora do frontend

Configurações não sensíveis: EXPECTED_PROJECT_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL,
ALLOWED_ORIGINS, APP_BASE_URL, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME, destinatário fixo
autorizado, parâmetros de orçamento/cron e ambiente. ProjectId deve coincidir com o alvo
explicitamente aprovado, não ser enviado pelo visitante.

Secrets: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, BREVO_API_KEY, TURNSTILE_SECRET_KEY,
SUBMISSION_HMAC_SECRET e NETWORK_HASH_SECRET. FIREBASE_AUTH_API_KEY deve identificar o mesmo projeto nas APIs Auth e ter restrições
compatíveis com chamadas do serviço. Não reutilizar uma chave limitada a referrer de
navegador se isso bloquear o Worker nem remover restrições globais para contornar o erro.
Essa API key não concede autoridade administrativa e não vai para logs.

Usar secrets do provedor; desenvolvimento eventual usa arquivo local ignorado em
services/trusted-api/.dev.vars, com .dev.vars.example vazio. Não copiar chave administrativa
para .env.example, scripts versionados, comandos com valor sensível ou docs. Ampliar ignore
apenas com padrões necessários, sem remover o que já existe.

## Provisionamento, sem execução automática

| Dependência | Evidência exigida antes da integração real |
| --- | --- |
| Firebase | Alvo declarado, Auth email/senha habilitado, Firestore real e projeto correto |
| Serviço Google | Conta dedicada e IAM mínimo revisado; chave tratada como secret |
| Worker Free | Conta/configuração e medição real de CPU/cold start abaixo dos limites |
| Turnstile | Widget/hostname/action e validação server-side; nenhum bypass em produção |
| Brevo Free | Conta transacional habilitada, API key e remetente verificável no-reply |
| Destino | Aceite real de aviso fictício para luizgustavo.dev01@gmail.com |
| Admin | UID existente com documento admins/{uid}.enabled=true provisionado manualmente |
| Primeiro acesso | Contas dedicadas com senha provisória e nenhuma flag liberada artificialmente |
| Rules/índices | Arquivos completos, snapshot anterior e publicação confirmada no alvo |
| Governança | Exceções de escopo incorporadas à constituição antes da implementação correspondente |

Os quatro campos Firebase não suprem as dependências de email/Worker. Não registrar domínio,
criar conta externa, ativar Blaze/Paid, contratar plano, publicar ou enviar email automaticamente
porque o plano foi escrito. Essas ações seguem a autorização vigente no momento apropriado.
A configuração do remetente é gate de execução, sem promessa de endereço/domínio gratuito inventado.

## Testes dedicados

Credenciais em arquivo local ignorado ou variáveis de processo, sem prefixo VITE_:
TEST_EXPECTED_PROJECT_ID, TEST_RUN_ID, TEST_USER_A_EMAIL, TEST_USER_A_PASSWORD,
TEST_USER_A_UID, TEST_USER_A_NEW_PASSWORD, equivalentes B e URL do serviço testado.
UIDs, emails e senhas reais de teste não vão para relatório/logs. O alvo esperado é informado
independentemente da configuração efetiva e conferido antes de qualquer escrita.

A/B não são contas pessoais. Um UID de teste pode ser admin na etapa explicitamente
provisionada; o cliente da suíte não escreve papel admin. Não pedir senha pessoal do responsável.
Não habilitar emuladores nem usar Admin SDK como evidência de aprovação das Rules.
