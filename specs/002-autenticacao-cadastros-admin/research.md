# Research: Autenticação, solicitações e administração

Data: 2026-10-16. Pesquisa de desenho com Context7, fontes oficiais e agentes de pesquisa
para envio de email e segurança do primeiro acesso. Nenhum serviço foi ativado ou testado.

## 1. Base e sessão do navegador

**Decision**: Preservar React 19, Vite 8, TypeScript 6, npm e o lockfile existentes.
Adicionar Firebase JS SDK modular estável e React Router 7 em modo declarativo, sem SSR.
React Router 7.18.4 é referência documental compatível; confirmar versões publicadas,
engines e peers no momento de implementar, sem instalar latest indiscriminadamente.

Centralizar Firebase em `src/infrastructure/firebase/client.ts`. Usar `getApps/getApp`
para reaproveitar a instância por ciclo de página; Auth com browserSessionPersistence;
Firestore com memoryLocalCache. Resolver Auth por observer antes de consultar perfil ou
montar conteúdo protegido. Uma geração de sessão impede respostas antigas de atualizar estado.

**Rationale**: Sessão por aba restaura após refresh sem compartilhar documentos em disco.
Desmontar listeners e limpar estado não esvazia necessariamente o cache interno do SDK:
logout bem-sucedido faz navegação completa para `/login`, descartando a instância em memória.
Troca entre UIDs também descarta a página antes de carregar dados da nova identidade.

**Alternatives considered**: Persistência Firestore em disco, currentUser como sinal de
inicialização concluída, guards que só escondem componentes e router framework/SSR.

**Sources**: [Auth state](https://firebase.google.com/docs/auth/web/start),
[persistência](https://firebase.google.com/docs/auth/web/auth-state-persistence),
[cache Firestore](https://firebase.google.com/docs/firestore/manage-data/enable-offline),
[React Router 7](https://reactrouter.com/7.18.4/start/declarative/installation).

## 2. Limite confiável externo

**Decision**: Desenhar um Cloudflare Worker restrito, no plano Free, para recepção pública,
notificação transacional e confirmação protegida de primeiro acesso. Não substituir o
Firestore nem criar API genérica de dados. Credenciais Google de serviço ficam em secrets,
com OAuth para REST Firestore; chamadas Auth usam o ID token do próprio usuário.
Usar `jose` compatível com Web Crypto para validar JWT e assinar a asserção OAuth, evitando
criptografia/JWT implementados manualmente. Sem Admin SDK no frontend.

**Rationale**: Rules não consultam a senha do Authentication nem provam uma troca; uma flag
livre pelo cliente viola FR-032. O recebimento público precisa de proteção sem abrir o banco.
REST privilegiado usa IAM e ignora Security Rules: autorização, caminhos e campos fixos no
Worker são parte do perímetro, com testes próprios e credencial de serviço sem Owner/Editor.
Não alegar que Rules limitam essa credencial a coleções específicas.

**Alternatives considered**: Tudo no navegador; email/flag escritos livremente; extensão
Firebase com Blaze; backend de negócio genérico. Não satisfazem segurança ou escopo.

**Sources**: [Workers Free](https://developers.cloudflare.com/workers/platform/pricing/),
[secrets](https://developers.cloudflare.com/workers/configuration/secrets/),
[Firestore REST/IAM](https://firebase.google.com/docs/firestore/use-rest-api),
[jose e runtimes](https://github.com/panva/jose).

## 3. Primeiro acesso: prova e recuperação

**Decision**: A nova senha e sua confirmação transitam somente por HTTPS ao endpoint
restrito e ao Authentication, apenas em memória da operação; nunca em Firestore, logs,
URLs, métricas, captura de body ou ferramentas de tracing. A UI tem somente os dois campos.
O Worker valida token/UID/projeto, conta password ativa, perfil pendente e login recente.

Para rejeitar senha igual à atual sem armazenar a provisória, faz verificação Auth com o
email obtido da própria identidade e a senha candidata: se autenticar, rejeita como igual;
se retornar exatamente INVALID_LOGIN_CREDENTIALS para a conta previamente confirmada,
pode seguir; erros de rede, cota, política ou conta inválida bloqueiam. Não interpretar
qualquer falha como senha diferente. A operação usa trava por UID e limites de tentativas.

Após preparar operação persistida, chama accounts:update com ID token e nova senha.
Somente HTTP 200 para o UID esperado autoriza transação que grava recibo de sucesso,
primeiro_login=false e passwordChangeCompletedAt. A resposta descarta tokens retornados;
a UI encerra sessão e exige novo login. Nas operações normais, Rules e Worker exigem
`auth_time * 1000 > passwordChangeCompletedAt.toMillis()` além da flag false.
Como auth_time tem resolução em segundos, o login só é liberado no segundo seguinte à
conclusão; refresh de token não substitui autenticação nova.

**Recovery**: Se a transação foi gravada mas a resposta se perdeu, a mesma operação retorna
conclusão idempotente. Se Auth alterou a senha e a gravação do recibo falhou, a conta continua
pendente: entrar com a senha já alterada e escolher outra nova para repetir uma operação
controlada. Explicar essa janela, sem pedir provisória inválida. Não liberar apenas porque
passwordUpdatedAt avançou: um cliente adulterado pode provocar esse avanço externamente.

**Rationale**: Lookup/baseline comprovam atualização de metadados, não diferença entre valores.
O protocolo escolhido faz a validação no limite confiável e mantém falha fechada na janela
sem recibo. Não promete atomicidade Auth/Firestore nem histórico universal de senhas: após
a conclusão, o dono ainda pode usar APIs Auth conforme a política do próprio provedor.

**Alternatives considered**: updatePassword no navegador + false editável; conclusão baseada
só em auth_time, iat ou passwordUpdatedAt; guardar senha/hash para comparação; liberar
recuperação sem prova. Todos deixam lacuna ou armazenam segredo desnecessário.

**Sources**: [Auth REST](https://firebase.google.com/docs/reference/rest/auth),
[accounts.update](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/update),
[accounts.lookup](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/lookup),
[tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens),
[sessões](https://firebase.google.com/docs/auth/admin/manage-sessions).

## 4. Email gratuito e identidade do remetente

**Decision**: Brevo Free transacional como provedor inicial, usando HTTPS no Worker e
remetente no-reply verificável. A documentação consultada informa 300 emails/dia e marca
Brevo no plano gratuito. Configurar envio somente após verificar conta e remetente e
comprovar aceite/envio ao Gmail fixado no pedido.

Um endereço no-reply real exige controle de identidade verificável. Não inventar domínio,
registrar domínio ou contratar serviço nesta fase. Brevo documenta substituição temporária
de domínio não autenticado por brevosend.com; não tratar isso como garantia de endereço
literal no-reply nem entrega. Se o remetente pedido não puder ser validado, canal fica
bloqueado operacionalmente até configuração compatível, sem simular envio.

**Alternatives considered**: Resend Free (100/dia e 3.000/mês), adequado com domínio
verificado; seu domínio de teste só permite destino da própria conta e não é solução
geral de produção. Gmail pessoal/SMTP no frontend e mailto não atendem ao contrato.

**Sources**: [Brevo Free](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan),
[remetente](https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email),
[domínio](https://help.brevo.com/hc/en-us/articles/16045394674066-Troubleshooting-Domain-authentication),
[Resend](https://resend.com/docs/knowledge-base/account-quotas-and-limits).

## 5. Recepção pública e idempotência

**Decision**: Validar Turnstile server-side, hostname/action esperados, origem permitida,
tamanho e campos exatos. CORS sozinho não autoriza nem impede abuso. Persistir solicitação
e outbox em transação Firestore, antes de tentar email. operationId aleatório com pelo
menos 128 bits, reutilizado para retry; fingerprint HMAC do payload canônico protege
comparação sem expor CPF em chave/log. Replay retorna só recibo, nunca dados pessoais.

Aplicar cotas próprias do aplicativo por chave de rede pseudonimizada e orçamento global,
com estado persistido e expiração por procedimento limitado; não confiar só em contador
na memória de um isolate. Valores iniciais e fronteiras estão no contrato da API.
Turnstile expirado exige novo desafio, preservando operationId e sem duplicar a solicitação.

**Alternatives considered**: Escrita Firestore pública, chave secreta no frontend,
limitação por IP sem estado ou email/CPF em URL/chave de documento.

**Source**: [Turnstile Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

## 6. Outbox e execução sem navegador

**Decision**: Outbox persistida + um Cron Trigger do Worker, com lotes pequenos e lease
transacional. Nenhuma geração depende de app aberto ou promessa de waitUntil durável.
Brevo documenta idempotencyKey UUID no payload de envio e janela de 30 minutos; persistir
payload de notificação e chave estáveis e respeitar a janela.

Após timeout/queda com resultado incerto, repetir somente dentro da janela de deduplicação.
Se não houver confirmação após a janela, mover para uncertain e exigir reconciliação
administrativa; não reenviar silenciosamente. Aceite do provedor não equivale a inbox.

**Rationale**: waitUntil pode ser cancelado; tarefas duráveis ficam no banco. O limite de
idempotência do provedor não substitui o estado persistente nem garante exatamente uma vez.

**Sources**: [Cron](https://developers.cloudflare.com/workers/configuration/cron-triggers/),
[idempotência Brevo](https://developers.brevo.com/docs/heterogenous-versions-batch-emails).

## 7. Perfil, administração e regras

**Decision**: Perfil mínimo sem CPF/telefone em users/{uid}; roles em admins/{uid},
provisionados manualmente; solicitações e assinaturas em coleções explícitas separadas.
Flag e cutoff não editáveis pelo cliente. Admin só acessa solicitações/assinaturas após
concluir primeiro acesso e autenticar novamente; não lê perfis alheios ou dados financeiros.
Datas são informativas. Não gerar rules executáveis no planejamento.

**Rationale**: Escopos explícitos evitam wildcard que abra futuras coleções. Paginação e
validação de updates com versão impedem sobrescrita concorrente. Não usar atualização do
perfil para conceder papel ou assinatura. Perfil legado sem flag implica pendência; somente
serviço confiável normaliza, sem sobrescrever versão desconhecida ou false confirmado.

**Source**: [Rules: condições](https://firebase.google.com/docs/firestore/security/rules-conditions),
[campos](https://firebase.google.com/docs/firestore/security/rules-fields),
[consultas](https://firebase.google.com/docs/firestore/security/rules-query).

## 8. Capacidade gratuita e parâmetros do projeto

**Decision**: Tratar capacidade como limitada e verificar novamente antes de ativar.
Consulta oficial: Workers Free 100.000 requisições/dia, 10 ms CPU por chamada, 50 subrequests
por chamada e 5 Cron Triggers por conta. CPU/criptografia/cold start são gates de medição;
nenhuma garantia de caber no plano antes do teste real. Usar cache de certificados/OAuth,
lotes reduzidos e no máximo um Cron deste projeto. Exceder limite resulta em erro/pendência,
sem contratar Paid. Os limites próprios abaixo não são cotas anunciadas pelos provedores.

**Source**: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/).
As cotas Spark de Firestore devem ser conferidas no projeto-alvo e em
[Firestore quotas](https://firebase.google.com/docs/firestore/quotas) antes da suíte real.

## 9. Governança e gates operacionais

**Decision**: O desenho registra a exceção funcional expressamente solicitada (cadastro
público, administração informativa e notificação externa) e o componente confiável mínimo
necessário aos requisitos protegidos. Não abre autorização para backend genérico, Blaze,
serviços pagos, domínio comprado ou publicação automática.

Antes da implementação correspondente, incorporar essas exceções na constituição com
resumo de impacto, preservando isolamento e o contrato de Rules. Esta fase de plano não
altera a constituição nem ativa o serviço. Provedor/contas/secret/remetente/projeto e regras
publicadas são pré-requisitos de execução verificáveis, não escolhas de produto pendentes.
Sem eles, gerar código não permite declarar validação real concluída.

**Alternatives considered**: Ignorar a constituição, interpretar autorização de serviço
gratuito como liberação de faturamento ou declarar o primeiro acesso protegido só pela UI.

## Resultado da pesquisa

Decisões técnicas de desenho resolvidas. A solução exige o serviço confiável externo e
configuração operacional que os quatro valores Firebase do frontend não fornecem. O plano
pode orientar tarefas; implantação e validação integrada permanecem condicionadas aos gates
explicitados, com erro e bloqueio se o provedor gratuito não satisfizer os testes de runtime.
