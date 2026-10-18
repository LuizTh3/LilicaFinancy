# Preparar o ambiente de testes da feature 005

Este guia prepara quatro contas fictícias e um arquivo local. Não precisa enviar senhas pelo chat. A compilação oficial já autorizada não publica Rules: os testes financeiros só serão executados depois que o código e a publicação autorizada estiverem prontos.

## 1. Confirmar o projeto

Abra o [Console Firebase](https://console.firebase.google.com/) e escolha o projeto indicado no `.env` da raiz. Em Configurações do projeto, confira o **ID do projeto** (não o nome exibido). Anote-o para `TEST_EXPECTED_PROJECT_ID`.

Não altere o banco para test mode ou libere acesso global. Os dados dos testes ficam nos UIDs fictícios e são inventariados por execução; não use contas com finanças reais.

## 2. Criar quatro usuários de Authentication

Em **Authentication → Users/Usuários → Add user/Adicionar usuário**, crie quatro contas diferentes, somente para testes, com email e senha. Se Email/Password ainda não estiver habilitado, habilite esse provedor em Sign-in method/Método de login. Use emails de teste sob seu controle e senhas exclusivas.

| Papel | Finalidade | Estado necessário |
| --- | --- | --- |
| A | Criar e consultar fixtures financeiras | Primeiro acesso concluído |
| B | Tentar acesso aos dados de A | Primeiro acesso concluído |
| ADMIN | Provar que administrador não acessa finanças de A | Primeiro acesso concluído e papel administrativo manual |
| PENDING | Provar bloqueio antes da troca obrigatória de senha | Primeiro acesso ainda pendente |

Copie o **UID** de cada usuário da lista. UID é o identificador do Authentication, não email, nome ou ID escolhido manualmente.

Referência oficial: [contas com email e senha](https://firebase.google.com/docs/auth/web/password-auth).

## 3. Preparar os estados de primeiro acesso

Suba o aplicativo com `npm run dev` e abra o endereço local informado pelo terminal. Faça login com A, B e ADMIN, uma conta por vez. Em cada uma:

1. Conclua a troca obrigatória de senha pela tela de primeiro acesso.
2. Aguarde confirmação, saia e faça **novo login**, já com a senha definitiva. Apenas atualizar a página/token não substitui novo login após a conclusão.
3. Use essa senha definitiva nos campos PASSWORD do arquivo de testes.

O app cria `users/{uid}` quando necessário. Após conclusão real, o perfil terá `schemaVersion: 1`, `timezone: America/Rio_Branco`, `primeiro_login: false` e `passwordChangeCompletedAt` do tipo timestamp. Não mude esses campos manualmente para contornar a troca de senha: eles comprovam o fluxo de acesso protegido.

Para PENDING, faça login uma vez para o app criar o perfil e **não conclua a troca**. Depois saia. Seu perfil deve continuar com `primeiro_login: true`; sua PASSWORD de testes é a senha inicial atual.

Se a tela de primeiro acesso não consegue concluir a troca porque o serviço confiável ainda não foi configurado, pare esta etapa e informe apenas a mensagem de erro, sem credenciais. O procedimento operacional existente está em [firebase-operations.md](firebase-operations.md), especialmente configuração do serviço e primeiro acesso. Não é necessário mudar a proteção para continuar escrevendo/testando código local.

## 4. Marcar somente ADMIN como administrador

No **Firestore Database → Data/Dados**, crie o documento `admins/{UID_ADMIN}` com um campo:

| Campo | Tipo | Valor |
| --- | --- | --- |
| enabled | boolean | true |

Substitua `{UID_ADMIN}` pelo UID exato da conta ADMIN de teste. Não adicione A, B ou PENDING nessa coleção e não use cadastro de titular financeiro como papel de acesso. A autorização de ADMIN continua limitada às funções administrativas; não concede acesso financeiro de outros UIDs.

## 5. Criar o arquivo local

Na raiz do projeto, copie `.env.integration.example` para `.env.integration.local` **somente se o arquivo de destino ainda não existir**. Exemplo em PowerShell:

```powershell
if (-not (Test-Path -LiteralPath '.env.integration.local')) {
  Copy-Item -LiteralPath '.env.integration.example' -Destination '.env.integration.local'
}
```

Edite `.env.integration.local`. Esse arquivo é ignorado pelo Git; não coloque as senhas no modelo `.example`.

| Campos | O que preencher |
| --- | --- |
| VITE_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID e APP_ID | Copiar os quatro campos correspondentes do `.env` do projeto escolhido, mantendo seus nomes completos do modelo |
| TEST_EXPECTED_PROJECT_ID | ID confirmado independentemente no Console; precisa ser igual a VITE_FIREBASE_PROJECT_ID |
| TEST_RUN_ID | Identificador novo por execução, de 8–80 caracteres; letras, números, hífen ou sublinhado. Ex.: externos-20261018-01 |
| TEST_USER_A_UID / EMAIL / PASSWORD | UID, email e senha definitiva de A |
| TEST_USER_B_UID / EMAIL / PASSWORD | UID, email e senha definitiva de B |
| TEST_USER_ADMIN_UID / EMAIL / PASSWORD | UID, email e senha definitiva de ADMIN |
| TEST_USER_PENDING_UID / EMAIL / PASSWORD | UID, email e senha atual de PENDING, sem concluir primeiro acesso |
| TEST_INTEGRATION_GROUP | Manter externos |
| TEST_RULES_CONFIRMED | Manter no enquanto as Rules e índices da implementação não estiverem publicados e conferidos |

Aspas fazem parte da sintaxe do arquivo, não do valor da senha. Não use placeholders do modelo como credenciais reais, não registre senhas no terminal e não envie o conteúdo completo do arquivo no chat.

## 6. Avisar que a configuração está pronta

Quando terminar, informe apenas: **“Configurei as quatro contas e o arquivo local.”** A próxima conferência valida projectId, UIDs e estados de acesso antes de qualquer fixture. Nenhum teste deve ser executado com `TEST_RULES_CONFIRMED=yes` apenas para vencer o preflight; esse valor só é usado após publicação autorizada e conferida.

A conferência local, sem conexão ou gravação, pode ser executada com `node scripts/check-externos-environment.mts`. Ela mostra somente estados de validação e nomes de campos com problema. Com a opção `--remote`, também autentica as quatro contas e lê seus próprios perfis (e o papel de ADMIN), sem criar fixtures, editar perfis ou publicar Rules. UIDs repetidos bloqueiam a conexão, pois A e PENDING precisam ter estados de primeiro acesso diferentes.

Ainda serão necessárias a conclusão do código, a autorização de publicação e a verificação das Rules/índices. Não execute limpeza de banco ou scripts administrativos para preparar essas contas.
