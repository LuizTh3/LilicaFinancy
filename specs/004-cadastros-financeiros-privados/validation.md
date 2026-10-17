# Validação da feature 004

Baseline em 2026-10-17: Git develop; Node 25.8.1; npm 11.18.0. Lockfile e alterações preexistentes preservados. Projeto privado: .npmignore não aplicável. .gitignore cobre dependências, builds, ambientes, credenciais, artefatos de integração e arquivos temporários; sem Docker/ESLint/Prettier/Terraform/Helm detectados.

Rules anteriores SHA256 C982AA957318EE50C363B53C24DBB38893A096F7D7A8CEC3C74EF935B658844F; índices anteriores 1C8050B7404EB17B5BDE8F91EFF83F33A80A9E2D397D0B340025D6742D475CEF. Cópias preservadas em docs/rules-backups/004-before.rules e 004-before.indexes.json.

Checklist de especificação: 16/16. Nenhum hook configurado. Arquivos locais gerados não equivalem a Rules publicadas. Não realizar publicação ou limpeza como efeito colateral.

## Implementação e evidências locais

CRUD das quatro coleções, paginação nome/ID, filtros de estado, nomes livres, arquivamento e base manual implementados. Repositório concreto usa transação cadastro+recibo, identidade por intenção, versão esperada fixa e retomada com comandoCompleto ou descritor somente de leitura. Conta→titular é validada no UID atual na UI, repositório e Rules. Arquivado preserva leitura/vínculo antigo, mas não novo vínculo; conta prevista arquivada não autoriza novas liquidações futuras.

Setup T001–T004 concluído: harness com quatro papéis/visitante, manifesto restrito e limpeza por inventário; testes locais de ambiente/manifesto/ordenação executados. Fundação T005–T012 concluída localmente: schemas completos, recibos recíprocos, controles read-only, índices completos e backup. Ver docs/firestore-rules-changes.md para orçamento de até sete acessos no par de escritas (reserva oito), até onze incluindo leituras da transação (reserva doze); os limites de expressão/compilação efetiva não foram comprovados remotamente.

T013–T024/T026–T031/T033–T037/T039–T044 e documentação/evidências aplicáveis foram implementados. As transições finitas de contrato complementam testes do repositório concreto, sem criar CRUD simulado de produção. Fronteira SDK controlada em unitários testa resposta descartada após commit, consulta do recibo após edição posterior, replay sem duplicação, chave/conteúdo incompatíveis, retry com versão original, controle de uso e referência histórica. Isso não é teste de Security Rules nem emulação de Firebase.

## Verificações e execução remota

- Testes começaram com falha esperada de módulos ainda ausentes, depois passaram com a implementação.
- O Vitest inicialmente falhou com EPERM ao renomear cache no TEMP do sandbox. TEMP/TMP foram direcionados ao caminho local node_modules/.tmp/cadastros apenas no processo de validação. Não foi feita alteração permanente do ambiente.
- npm run typecheck: aprovado, incluindo testes de integração e scripts operacionais.
- npm run lint: aprovado, sem avisos; callbacks não leem refs durante render e respostas assíncronas obsoletas são descartadas.
- npm run build: aprovado; Vite 8.3.4 gerou bundle de 861,58 kB (gzip 261,99 kB), com aviso de tamanho de chunk acima de 500 kB. Nenhuma alteração de dependências ou publicação.
- A suíte completa passou com 163 testes em 42 arquivos antes dos dois últimos casos de fronteira monetária/identidade; resultado final será registrado abaixo após nova execução.
- TEST_INTEGRATION_GROUP=cadastros / npm run test:integration: bloqueado no preflight por TEST_EXPECTED_PROJECT_ID, TEST_RUN_ID e identidades/credenciais A/B ausentes. ADMIN/PENDING e fixtures operacionais também exigem configuração própria. A falha ocorreu antes de qualquer conexão ou criação de fixtures. Nenhum teste remoto foi executado; não usar Admin SDK ou mocks como prova substituta.
- Nenhuma Rule/índice foi publicado ou compilado remotamente. firebase.json aponta para os arquivos completos locais. Os anteriores da feature 002 foram preservados em docs/rules-backups para revisão/reversão, sem presumir equivalência com a versão remota.
- Não foi realizada limpeza ou preparação remota; .integration/local-dry-run.json é preexistente e não pertence à execução desta feature. Não foi reutilizado/apagado.

## Pendências externas e rastreabilidade

47 tarefas concluídas; sete abertas: T025/T032/T038/T045/T051 (aceitação remota e paridade das Rules), T049 (cinco participantes reais, incluindo tempo e distinção titular/login/base/confirmado) e T052 (dry-run do manifesto da execução remota). A falta de configuração não foi tratada como teste aprovado. SC-007 não foi validado por humanos nem substituído por teste automático. SC-001..006 têm cobertura local e matriz remota escrita, mas dependem da evidência remota aplicável para aceite integral.

SC-003 atual cobre conta→titular. Consumidores financeiros continuam negados; seu protocolo de primeiro uso, referências de categoria/etiquetas e conta efetiva ativa na liquidação são obrigações futuras, não execução alegada desta feature. Ver contracts/security.md e architecture-review.md. A implementação local está disponível para revisão; a feature não é declarada integralmente validada.

## Resultado final local — 2026-10-17

npm test: 42 arquivos e 165 testes aprovados. npm run typecheck: aprovado. npm run lint: aprovado sem avisos. npm run build: aprovado, com o aviso de tamanho de chunk registrado acima. git diff --check: sem erros de whitespace (apenas avisos de conversão LF/CRLF do ambiente Windows). Nenhum hook after_implement configurado.

A área é /app/cadastros, protegida pelo SessionGate. Código, Rules completas, índices completos, backups e guias estão disponíveis localmente. Os sete itens externos continuam pendentes; não há declaração de isolamento remoto validado ou entrega integralmente aceita.

## Correção de diagnóstico de consulta — 2026-10-17

Relato: filtros falham com mensagem de conexão, enquanto Todos carrega normalmente. O padrão é compatível com índices compostos ausentes/em construção: a consulta com estado precisa de estado ASC/nome ASC, já declarado nas quatro coleções. A causa remota não foi confirmada: a consulta somente de leitura dos índices pela Firebase CLI foi recusada por credenciais inválidas. Não houve implantação nem alteração de dados remotos.

O repositório distingue failed-precondition (configuração pendente, com mensagem específica quando o SDK menciona índice), unauthenticated/permission-denied (sessão/acesso), unavailable/deadline-exceeded (conexão) e erro genérico sem afirmar uma causa de rede. Pré-condição rejeitada não é convertida em confirmação indeterminada de escrita; preserva-se a recuperação da mesma intenção para falhas transitórias. Nenhuma URL de console ou conteúdo privado do erro do SDK é exibido. Quatro testes de regressão reproduziram a falha antes da correção e passaram depois, usando FirebaseError real na fronteira SDK controlada; isso não comprova configuração remota.

Verificação após a correção: 169 testes aprovados em 42 arquivos; typecheck e lint aprovados. Verificação remota continua pendente de autenticação operacional e revisão/publicação autorizada dos índices.

## Publicação delimitada dos índices — 2026-10-17

Após solicitação do responsável para resolver os índices pendentes, inventário remoto pela Firebase CLI com acesso de rede retornou indexes=[] e fieldOverrides=[] no projeto lilicafinancy, banco (default). Inventário anterior e configuração exata preservados em .integration/cadastros-indexes/ (ignorado no Git). Publicados somente estado ASC/nome ASC, escopo COLLECTION, para titulares/categorias/contas/etiquetas; desempate __name__ ASC implícito. CLI confirmou sucesso. Verificação remota inicial às 16:34:34 UTC−05 mostrou CREATING nas quatro coleções. Nenhuma Rule, override de campo, índice de outbox ou documento foi alterado. Isso não executa nem substitui a matriz de isolamento com SDK cliente, cujas pendências permanecem abertas.

Verificação final às 16:38:52 UTC−05: os quatro índices em READY, confirmado por firebase firestore:indexes --pretty. Evidência local em .integration/cadastros-indexes/remote-after.txt. Nenhum teste com a sessão privada do usuário foi executado; solicitar recarregar o aplicativo para confirmar o fluxo percebido na interface. Os testes locais anteriores não foram repetidos porque esta etapa alterou somente a configuração de índices remotos e a documentação.
