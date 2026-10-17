# Quickstart: Validação de cadastros financeiros privados

Código local da feature 004 implementado. Ver validation.md para os checks efetivamente executados. Publicação, testes remotos e limpeza não foram realizados; o preflight remoto recusou configuração de teste ausente. Contratos: [casos de uso](contracts/cadastros.md), [segurança](contracts/security.md), [modelo](data-model.md).

## Pré-requisitos locais

- Repositório e lockfile existentes; Node >=24.12.0 e npm 11.18.0.
- Configuração Firebase existente, nunca copiar .env, tokens ou senhas para artefatos/logs.
- Dependências já instaladas podem ser reutilizadas. Para instalação limpa autorizada, executar npm ci na raiz.

```powershell
Set-Location C:\Projetos\LilicaFinancy
npm run typecheck
npm run lint
npm test
npm run build
npm run dev -- --host 127.0.0.1
```

Resultados esperados depois da implementação: tipagem/lint/build aprovados, testes de domínio/contrato/estado/mapeadores aprovados; domínio financeiro continua sem imports transitivos de React/Firebase. Não usar aprovação local como prova de Rules.

## Projeto remoto e publicação

1. Confirmar projectId real indicado pelo responsável. Pré-checagem deve abortar antes de conexão se divergir de TEST_EXPECTED_PROJECT_ID; não inferir projeto do nome do ambiente.
2. Revisar firestore.rules completo e docs/firestore-rules-changes.md, orçamento por branch e testes negativos. Preservar versão anterior. Publicação depende da autorização vigente; este guia não é autorização para implantar.
3. Disponibilizar índices completos e aguardar prontidão; preservar índices existentes. Regra apenas gerada não está ativa.
4. Configurar projeto/contas de teste sem dados pessoais reais. Registrar versão/hash das Rules efetivamente ativas e índices confirmados; só então definir TEST_RULES_CONFIRMED=yes.
5. Não instalar/configurar Emulator Suite; não executar Admin SDK para afirmar aprovação de Rules.

## Ambiente de integração

Reutilizar validação de tests/integration/support/environment.ts e preflight.ts. Obrigatórios existentes:

- TEST_EXPECTED_PROJECT_ID e VITE_FIREBASE_PROJECT_ID iguais;
- VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN e VITE_FIREBASE_APP_ID;
- TEST_RUN_ID, 8–80 caracteres alfanuméricos, sublinhado ou hífen;
- TEST_USER_A_UID, TEST_USER_B_UID distintos e correspondentes aos logins, e TEST_USER_A_EMAIL/PASSWORD, TEST_USER_B_EMAIL/PASSWORD;
- TEST_RULES_CONFIRMED=yes somente após confirmação real de publicação.

A implementação acrescenta grupo cadastros à allowlist do Vitest e preflight de papéis adicionais: TEST_USER_ADMIN_UID/EMAIL/PASSWORD e TEST_USER_PENDING_UID/EMAIL/PASSWORD. ADMIN é UID de teste distinto de A/B com papel administrativo próprio; PENDING tem primeiro_login pendente. Não criar/alterar papéis automaticamente na inicialização do app. Ampliar scope.uids do manifesto somente aos UIDs de teste declarados/validados, sem registrar remoção de perfis preexistentes.

Preparação privilegiada de fixtures de primeiro uso é separada da execução cliente e exige credencial operacional restrita já autorizada, paths exatos e manifesto. Se indisponível, marcar esses casos bloqueados, sem liberar escrita cliente de controle ou substituir o teste por mock.

Depois da implementação/configuração:

```powershell
$env:TEST_INTEGRATION_GROUP = 'cadastros'
npm run test:integration
```

Sem pré-requisitos, o comando deve falhar explicitamente; não rodar uma suíte parcial afirmando cobertura completa. Não registrar valores de senhas/tokens.

## Roteiros e evidências esperadas

| Roteiro | Passos | Resultado |
| --- | --- | --- |
| CRUD quatro coleções | A cria, lista, edita, recarrega e arquiva; nomes duplicados; filtra arquivados | IDs/versões corretos, histórico legível, nenhum delete/reativação. |
| Titular privado | A cria nome diferente do seu; B cria mesmo nome | Nenhuma conta Auth/convite; registros independentes. |
| Acesso direto | Cada papel tenta get/list/create/update/archive/delete nos caminhos de A e auxiliares | Só A pronto acessa seus cadastros; visitante/B/admin alheio/pending negados. |
| Campos e versões | Extra/null/tipos errados/metadados alterados/versão velha; editar arquivado | Nenhuma escrita parcial; erro adequado e sem enumeração alheia. |
| Referências | Conta com titular próprio ativo, inexistente, de B, arquivado e coleção errada | Só vínculo próprio ativo novo é aceito. Renomear conta com vínculo arquivado idêntico funciona. |
| Concorrência de vínculo | Formulário obsoleto; lote cria conta e arquiva titular referenciado | Novo vínculo arquivado negado, inclusive diretamente; ordem de confirmação consistente. |
| Saldo inicial | Ausente, zero, credor/devedor, trio incompleto, datas inválidas/futuras | Ausência distinta de zero; sem saldo confirmado nem lançamento automático. |
| Primeiro uso | Controle operacional exato em categoria/conta de teste; tentar mudar natureza/tipo/base e deletar controle | Mudanças sensíveis negadas; nome ativo pode mudar; cliente não grava/remove controle. |
| Recibos | Usar repositório concreto: só cadastro; só recibo; payload errado; descartar resposta após commit; repetir mesmo ID/chave; consultar recibo após edição posterior; disputar versão; retomar com comandoCompleto e com descritor após recarga | Par atômico ou ausência de ambos; nenhuma duplicação ou rebase; confirmação original após edição posterior; descritor apresenta dados para conferência e não reenvia escrita. |
| Paginação | Dados mínimos suficientes para duas páginas, inclusive nomes iguais | Sem perder empate em nome; fim não presumido por página cheia; filtros e mutações reiniciam cursor. |
| Sessão/UX | Requisição lenta seguida de logout/troca, teclado e largura móvel | Nenhum dado anterior em nova sessão; rótulos, foco/feedback, envio único, loading/vazio/erro distintos. |

Fronteira de dia local: testes determinísticos locais com relógio explícito e comparação do algoritmo Rules; no remoto, testar hoje/amanhã segundo hora do servidor/perfil sem depender de esperar meia-noite. Caso de instante exato de mudança de dia nas Rules só pode ser afirmado executado se observado no ambiente, não pela simulação local.

Compromissos financeiros não têm interface/persistência nesta entrega. SC-003 valida conta→titular no CRUD atual. Validar separadamente o contrato documental de conta efetiva ativa e conta prevista preservada; testes end-to-end de liquidação e transição real de primeiro uso são gates da futura feature, sem abrir collections só para fixture.

## Teste assistido de produto

Com cinco participantes e dados fictícios, ao menos quatro criam e arquivam cadastro sem ajuda e distinguem titular de login e saldo informado de confirmado. Criar válido leva até dois minutos sem falha de rede. Registrar tempos, acertos e problemas de acessibilidade; SC-007 não é comprovado apenas por teste unitário.

## Manifesto e limpeza

Antes da criação, registrar cada path exato em .integration/{runId}.json com projeto, owner de teste e createdByRun. Estender manifesto somente a users/{uid}/{titulares|categorias|contas|etiquetas|operacoesCadastros|usoCadastros}/{id}, validando owner==uid, formatos e associação exata entre recibo/controle e cadastro da execução. UUID novo não precisa conter runId: o inventário registra ID exato previamente alocado e detecta colisão preexistente. Não adotar prefixo amplo como autorização.

Adaptar limpeza para filhos explicitamente inventariados. Não recursar apagando coleção do usuário; não remover perfil/conta Auth preexistente. Recusar pais com descendentes não inventariados e manter updateTime como precondição. Como Rules negam delete, limpeza usa credencial operacional separada; isso não altera o teste negativo de exclusão cliente.

Somente dry-run depois de implementar essa extensão, usando ambiente já configurado:

```powershell
node --experimental-strip-types scripts/cleanup-integration.mts --project $env:TEST_EXPECTED_PROJECT_ID --run $env:TEST_RUN_ID --uids "$env:TEST_USER_A_UID,$env:TEST_USER_B_UID,$env:TEST_USER_ADMIN_UID,$env:TEST_USER_PENDING_UID" --manifest ".integration/$env:TEST_RUN_ID.json"
```

Revisar quantidade/paths antes de eventual execução separadamente autorizada. Sem credencial operacional, dry-run de escopo é permitido, mas não comprova estado remoto nem remove dados. Não executar limpeza como efeito colateral desta fase.

## Registro de resultado

Na implementação, anotar comandos/ambiente, testes locais, versão das Rules/índices, projectId sem segredos, runId, papéis cobertos, casos bloqueados, confirmações remotas e limpeza efetuada. Diferenciar arquivos gerados, publicados e efetivamente verificados. Este planejamento não atesta nenhum desses resultados de execução.

## Preparação de controles de primeiro uso para aceitação remota

Somente após configurar projeto/contas/Rules autorizados: alocar TEST_CADASTROS_USED_CATEGORY_ID e TEST_CADASTROS_USED_ACCOUNT_ID como UUIDs fixos desta execução, manter TEST_RUN_ID e executar o grupo cadastros com TEST_CADASTROS_PREPARE=yes e filtro --testNamePattern="prepara cadastros para controles". O caso cria pais pelo SDK cliente e inventaria os controles exatos ainda ausentes. Nenhum controle é criado pelo cliente.

Após revisão/autorização operacional, o script prepare-cadastros-fixtures.mts recebe --project, --run, --uid, --collection (categorias ou contas), --id e --manifest, todos correspondentes ao inventário. Sem --execute faz somente dry-run; com --execute exige credencial operacional separada e createDocument recusa alvo existente. Repetir para os dois controles e então remover TEST_CADASTROS_PREPARE para rodar a suíte inteira. Controle faltante falha explicitamente, sem pular sua aceitação.

Os IDs usados são de teste; não reutilizar cadastro/perfil preexistente. Os testes locais de fixtures e cleanup não criam dados remotos.

## Runner local no sandbox Windows

Se o Vitest falhar com EPERM no cache temporário, criar node_modules/.tmp/cadastros e apontar TEMP/TMP somente no processo de validação para esse diretório local. Nesta implementação essa configuração permitiu executar a suíte; não altera o ambiente permanente do usuário.
