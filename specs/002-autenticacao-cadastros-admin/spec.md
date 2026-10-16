# Feature Specification: Autenticação, solicitações de cadastro e administração

**Feature Branch**: `develop` (existente; nenhuma branch criada)

**Feature Directory**: `specs/002-autenticacao-cadastros-admin`

**Created**: 2026-10-16

**Status**: Draft — esclarecimentos concluídos; pronta para planejamento

**Input**: User description: "Conectar Firebase Authentication e Cloud Firestore reais com
configuração existente no .env; login, logout, cadastro, restauração de sessão, perfil por
UID e proteção de rotas. Coletar nome completo, CPF, WhatsApp e email na solicitação;
notificar luizgustavo.dev01@gmail.com e oferecer administração por UID autorizado, com
datas de início e fim de assinatura. Isolar usuários e testar o projeto real sem emuladores."

## Clarifications

### Session 2026-10-16

- Q1: A solicitação deve criar uma conta imediatamente? → A: B. Coletar somente os quatro
  dados; o responsável cria a conta manualmente no Authentication posteriormente. O envio
  público não cria conta, não autentica e não concede acesso privado.
- Q2: Qual caminho está autorizado para enviar email? → A: A. Serviço externo com cota
  gratuita e processamento seguro, sem habilitar Blaze. O planejamento deve verificar
  provedor, remetente, limites e viabilidade; esta escolha não autoriza cobrança automática.
- Q3: As datas da assinatura controlam o acesso? → A: A. São somente registro
  administrativo nesta etapa, sem liberar ou bloquear usuários novos ou já existentes.

- Requisito adicional: admin informa email e senha provisória → usuário autentica → tela
  obrigatória com Nova senha e Confirmar nova senha → troca confirmada → encerramento
  da sessão → novo login. Persistir primeiro_login como booleano em users/{uid}, inicialmente
  true, passando a false somente pela conclusão protegida da troca.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entrar e manter uma sessão privada (Priority: P1)

Como titular de uma conta, quero entrar e sair do aplicativo e restaurar minha sessão ao
recarregar, para acessar somente meu próprio perfil sem visualizar dados de outra pessoa.

**Why this priority**: Identidade, resolução de sessão e isolamento são a fundação para
qualquer funcionalidade autenticada ou administrativa.

**Independent Test**: Usar duas contas dedicadas existentes no Authentication; fazer login,
recarregar, sair e alternar contas, verificando o perfil correspondente e ausência de conteúdo
protegido enquanto o estado da sessão ainda é desconhecido.

**Acceptance Scenarios**:

1. **Given** uma conta existente e credenciais válidas, **When** faz login, **Then** a sessão
   é identificada pelo UID e somente o perfil desse UID é carregado. Antes de liberar
   a área principal, verifica a obrigação de troca de senha conforme US6.
2. **Given** uma sessão ainda em resolução, **When** uma página protegida é aberta ou
   recarregada, **Then** exibe estado neutro de carregamento, sem conteúdo privado nem
   redirecionamento prematuro baseado em usuário ainda desconhecido.
3. **Given** um usuário do Authentication sem perfil, **When** entra pela primeira vez,
   **Then** cria exatamente um perfil mínimo com UID, fuso America/Rio_Branco, versão de
   schema, timestamps e primeiro_login=true; não inventa CPF, telefone ou nome inexistentes
   na conta. A sessão fica restrita à troca obrigatória enquanto houver essa pendência.
4. **Given** um perfil existente ou duas abas fazendo o primeiro acesso, **When** a
   inicialização é repetida, **Then** não duplica perfil nem sobrescreve campos protegidos,
   createdAt ou dados previamente confirmados.
5. **Given** erro ao obter/criar perfil, **When** a autenticação já foi aceita, **Then**
   apresenta erro e opção de tentar novamente, sem tratar o usuário como completamente
   inicializado ou carregar área privada com perfil de outra sessão.
6. **Given** logout ou troca da conta A para B, **When** a mudança ocorre, **Then** bloqueia
   imediatamente a exibição anterior, encerra listeners privados, limpa memória e descarta
   respostas tardias da sessão A; B nunca recebe conteúdo ou permissões de A.
7. **Given** credenciais incorretas, rede indisponível ou conta desabilitada, **When** tenta
   entrar, **Then** recebe mensagem compreensível, sem senha/token em logs e sem revelar
   desnecessariamente se determinado email está cadastrado.
8. **Given** um visitante, **When** tenta abrir URL privada diretamente, **Then** a sessão
   é resolvida antes de encaminhá-lo ao login e o acesso direto a dados privados é negado.

---

### User Story 2 - Enviar uma solicitação de cadastro (Priority: P1)

Como pessoa interessada, quero preencher meus dados e saber se a solicitação foi recebida,
para iniciar o processo de acesso sem fornecer minha senha pessoal ao responsável.

**Why this priority**: O formulário solicitado precisa de identidade e resultado claros,
sem confundir solicitação salva, conta criada e acesso liberado.

**Independent Test**: Enviar dados fictícios válidos e inválidos, repetir o envio e simular
falha de rede, verificando confirmação de persistência sem criar solicitações duplicadas.
O visitante pode enviar os quatro dados sem conta; a criação da conta Authentication
é manual e posterior, feita pelo responsável fora do formulário público.

**Acceptance Scenarios**:

1. **Given** o formulário de cadastro, **When** qualquer campo obrigatório está ausente ou
   inválido, **Then** impede envio e identifica o campo; nome completo, CPF, WhatsApp e
   email são obrigatórios.
2. **Given** dados válidos, **When** envia, **Then** confirma recebimento somente após a
   gravação aceita, com identificação estável e aviso de que o responsável criará a conta
   manualmente depois; não inicia sessão nem apresenta acesso privado como liberado.
3. **Given** duplo clique ou nova tentativa da mesma operação após perda de resposta,
   **When** reenvia, **Then** recupera ou confirma a mesma solicitação em vez de duplicá-la.
4. **Given** nome, CPF ou WhatsApp formatados, **When** são validados, **Then** o CPF usa
   verificação de dígitos e rejeita sequências repetidas; WhatsApp brasileiro é apresentado
   como +55 (xx) xxxxx-xxxx e preserva DDI/DDD; não se afirma verificar titularidade ou
   existência de CPF/WhatsApp por meio da validação local.
5. **Given** falha ou resposta perdida ao persistir a solicitação, **When** a pessoa repete,
   **Then** retoma a mesma operação, sem criar conta, apagar identidade ou declarar sucesso
   inexistente. O formulário contém somente nome completo, CPF, WhatsApp e email, sem senha.
6. **Given** uma conta antiga sem solicitação, **When** entra pela primeira vez, **Then**
   cria o perfil mínimo sem inventar os quatro dados; ausência de solicitação ou datas de
   assinatura não bloqueia o acesso que sua identidade e permissões autorizam, desde que
   a troca obrigatória do primeiro acesso esteja concluída.
7. **Given** uma solicitação já enviada e nenhuma conta criada manualmente, **When** a
   pessoa tenta entrar, **Then** o pedido não funciona como credencial nem como conta;
   a confirmação informa que o cadastro de acesso depende do responsável.
8. **Given** um visitante com referência de uma solicitação, **When** tenta recuperar seus
   dados ou consultar solicitações de terceiros, **Then** a referência não concede leitura
   de CPF, WhatsApp, email ou outros dados pessoais.

---

### User Story 3 - Consultar solicitações e registrar assinatura (Priority: P2)

Como administrador designado manualmente, quero consultar as solicitações e salvar datas
de assinatura, para registrar o atendimento sem obter acesso à vida financeira dos usuários.

**Why this priority**: O fluxo operacional solicitado depende de uma área restrita que
não possa ser obtida apenas manipulando a interface ou o próprio perfil.

**Independent Test**: Designar manualmente o UID de uma conta de teste como administrador;
comparar seu acesso com o de uma conta comum e um visitante, inclusive por operações diretas.

**Acceptance Scenarios**:

1. **Given** um UID presente no registro administrativo autorizado, **When** acessa a área
   admin, **Then** pode consultar solicitações com nome, CPF, WhatsApp e email e abrir seus detalhes.
2. **Given** uma conta sem papel administrativo, **When** acessa a URL ou tenta consultar
   as solicitações de terceiros diretamente, **Then** ambas as tentativas são negadas.
3. **Given** uma solicitação, **When** o admin salva início/fim da assinatura, **Then**
   valida datas de calendário, rejeita fim anterior ao início e confirma somente após a
   gravação aceita, preservando identidade e dados originais do solicitante.
4. **Given** um usuário comum, **When** tenta escrever papel admin, datas de assinatura,
   autor da alteração ou identidade de terceiro, **Then** a operação é negada fora da interface.
5. **Given** o admin removido manualmente do registro de administradores, **When** tenta
   nova leitura ou alteração, **Then** a operação é negada; ao detectar perda de permissão,
   a interface limpa o conteúdo administrativo e informa a mudança.
6. **Given** mais solicitações que uma página comporta, **When** navega na lista, **Then**
   carrega páginas delimitadas, sem listener sobre todo o histórico nem download de dados financeiros.
7. **Given** edição concorrente ou rede interrompida, **When** tenta salvar, **Then** não
   apresenta gravação como confirmada antes da resposta e identifica conflito/erro sem
   sobrescrever silenciosamente a edição confirmada de outro administrador.
8. **Given** datas ausentes, futuras ou encerradas, **When** um usuário comum com conta
   válida entra ou o admin altera essas datas, **Then** o registro não modifica direitos
   de login ou acesso nesta etapa; autorização continua baseada em identidade, papel e
   cumprimento da troca obrigatória, independentemente das datas de assinatura.

---

### User Story 4 - Receber aviso de nova solicitação (Priority: P2)

Como responsável, quero ser notificado por email de uma solicitação persistida, para
consultar os detalhes na área administrativa sem depender de manter o aplicativo aberto.

**Why this priority**: É um canal operacional adicional expressamente solicitado; não pode
ser apresentado como funcional sem serviço real, remetente autorizado e confirmação de envio.

**Independent Test**: Em uma execução pequena e identificada, enviar uma solicitação
fictícia e verificar registro administrativo, destino fixo e aceite real do serviço de email;
simular falha/limite do provedor sem perder a solicitação persistida.

**Acceptance Scenarios**:

1. **Given** solicitação persistida, **When** o serviço de email a processa, **Then** envia
   aviso para luizgustavo.dev01@gmail.com, por remetente no-reply autorizado pelo provedor,
   com referência para consultar a solicitação na área restrita.
2. **Given** formulário repetido ou entrega do mesmo evento, **When** o processamento se
   repete, **Then** usa a mesma identidade de envio e não inicia deliberadamente outro aviso
   para a mesma solicitação; ambiguidades de resposta do provedor são registradas.
3. **Given** email indisponível, cota excedida ou configuração faltante, **When** o aviso
   falha, **Then** a solicitação continua visível no admin, o estado de notificação indica
   pendência/falha e a interface não afirma que o email foi enviado.
4. **Given** entrada manipulada pelo solicitante, **When** tenta mudar destinatário,
   remetente ou template, **Then** não consegue transformar o fluxo em envio arbitrário.
5. **Given** nenhuma infraestrutura de email configurada, **When** a entrega é revisada,
   **Then** o canal não é declarado validado só por ter sido gravado um documento ou aberto mailto.

---

### User Story 5 - Verificar regras e isolamento no projeto real (Priority: P1)

Como responsável técnico, quero uma suíte pequena com contas dedicadas que verifique os
limites de acesso reais, para revisar as regras completas antes de declarar a integração validada.

**Why this priority**: Proteção de rotas não impede consultas diretas; a autorização precisa
ser demonstrada no ambiente efetivamente utilizado.

**Independent Test**: Executar sob projectId esperado declarado, com usuários A e B e
visitante; designar manualmente A como admin apenas para a etapa específica da suíte.
Não criar autoridade administrativa a partir do cliente testado.

**Acceptance Scenarios**:

1. **Given** projectId efetivo diferente do alvo explicitamente declarado, **When** a suíte
   inicia, **Then** aborta antes de operações ou criação de fixtures.
2. **Given** A/B/visitante, **When** tentam obter, listar, criar, alterar e excluir perfis
   indevidos, **Then** todas as operações fora da matriz de permissão são negadas.
3. **Given** usuário comum ou admin, **When** acessa coleções financeiras ainda não
   implementadas, **Then** leitura/escrita/listagem são negadas, inclusive sob subcoleções.
4. **Given** A temporariamente designado admin, **When** a etapa administrativa é testada,
   **Then** A acessa somente o escopo administrativo permitido e B/visitante não podem
   obter dados de terceiros nem escrever papéis ou datas protegidas.
5. **Given** fixtures com identificador de execução, **When** a suíte termina ou falha,
   **Then** registra resultados e permite limpeza somente de seus registros explicitamente
   identificados, incluindo subcoleções; não há exclusão global.
6. **Given** rules locais sem publicação verificada, falta de credenciais dedicadas ou
   serviço de email indisponível, **When** os resultados são registrados, **Then** esses
   testes aparecem como bloqueados/não executados, sem aprovação inventada.

---

### User Story 6 - Atualizar a senha no primeiro acesso (Priority: P1)

Como usuário de uma conta criada manualmente pelo admin, quero substituir a senha provisória
antes de iniciar o uso do aplicativo, com nova autenticação após concluir a alteração.

**Why this priority**: Conhecer a credencial provisória não deve conceder acesso normal
antes da troca obrigatória; primeiro_login precisa refletir a conclusão efetiva.

**Independent Test**: Usar conta dedicada com primeiro_login=true, testar acesso direto e
recarga, concluir troca com dois campos, verificar a flag persistida e autenticar novamente.

**Acceptance Scenarios**:

1. **Given** email e senha provisória fornecidos pelo admin e primeiro_login=true, **When**
   o usuário autentica, **Then** abre somente a tela com Nova senha e Confirmar nova senha,
   sem acesso à área principal ou administrativa.
2. **Given** campos vazios, divergentes, senha igual à provisória ou fora da política do
   projeto, **When** confirma, **Then** indica os erros, não conclui a troca e mantém a pendência.
3. **Given** os dois campos válidos, **When** o Authentication confirma a alteração e a
   conclusão protegida é persistida, **Then** primeiro_login passa a false, encerra a sessão,
   limpa campos e memória e retorna ao login; não entra automaticamente no aplicativo.
4. **Given** a troca concluída, **When** tenta entrar, **Then** a senha provisória é rejeitada
   e a nova permite acesso normal sem repetir a atualização obrigatória.
5. **Given** primeiro_login=true, campo ausente ou estado ainda não resolvido, **When** usa
   recarga, restauração de sessão, Voltar ou URL privada, **Then** não pula a troca. O papel
   admin não concede dispensa automática dessa obrigação.
6. **Given** sessão pendente, **When** tenta criar perfil com false, editar livremente a
   flag ou falsificar a conclusão, **Then** a operação é negada, inclusive fora da interface.
7. **Given** falha de rede, exigência de login recente ou falha de gravação da conclusão,
   **When** tenta trocar a senha, **Then** recebe recuperação segura, sem false prematuro
   ou acesso liberado. Se a senha já mudou, a recuperação não depende da provisória inválida.
8. **Given** duas abas no primeiro acesso, **When** uma conclui a troca, **Then** a outra
   não abre conteúdo protegido usando a sessão provisória nem reverte false para true;
   a continuação exige novo login conforme o fluxo obrigatório.

### Edge Cases

- Configuração Firebase ausente/incompleta: erro claro dos nomes ausentes, sem divulgar valores.
- Configuração completa não comprova projeto acessível, provedor habilitado ou rules publicadas.
- Perfil ausente, corrompido ou de versão não suportada: erro recuperável; não apagar ou
  migrar silenciosamente dados existentes nem carregar perfil anterior.
- Cadastro/email são efeitos distintos: não prometer transação única entre serviços.
- Conta já existente não deve gerar duplicação nem enumeração pública de emails/CPFs.
- Validação de CPF não comprova identidade; WhatsApp não envolve SMS, API WhatsApp ou verificação paga.
- Usuário fecha o navegador após solicitar: persistência e notificação não podem depender
  exclusivamente de uma promessa de trabalho em segundo plano no frontend.
- Resposta antiga após logout ou troca de usuário: ignorar resultados e cancelar assinaturas.
- Papel admin removido: próximas operações protegidas negadas; remover dados da interface
  ao observar a mudança ou receber negação, sem prometer apagar dados já vistos pelo usuário.
- Fuso, meia-noite e fim de mês: usar datas de calendário; a passagem do tempo não bloqueia
  acesso por assinatura nesta etapa.
- Envio público deve ter recepção protegida contra abuso sem liberar leitura, listagem ou
  escrita pública arbitrária no Firestore; os controles efetivos serão definidos no plano.
- Serviço externo fora da cota gratuita: indicar indisponibilidade/pendência recuperável,
  sem ativar plano pago, Blaze ou cobrança automaticamente.
- Edição admin concorrente: detectar versão desatualizada e pedir recarga antes de substituir dados.

- Campo primeiro_login ausente em perfil antigo: tratar como pendente, sem presumir troca
  anterior; normalizar com segurança sem reativar true sobre false já confirmado.
- Alteração de senha e gravação Firestore não são uma transação única: uma falha intermediária
  deve permitir retomar a confirmação com a identidade válida, sem liberar conteúdo nem
  pedir a senha provisória como se ainda funcionasse após a alteração.
- Duas abas, recarga ou logout durante a troca: não persistir senhas em armazenamento local.
  Um booleano editável pelo cliente ou login recente não comprova alteração de senha.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Utilizar configuração Firebase real já existente no `.env`, sem reproduzir
  valores no chat/documentação/logs; preservar `.gitignore` e `.env.example` sem dados reais.
- **FR-002**: Centralizar inicialização dos SDKs em módulo único, validar os quatro campos
  necessários e expor erro recuperável se incompletos, sem inicializações duplicadas.
- **FR-003**: Oferecer login, logout, restauração de sessão e proteção de rotas; distinguir
  sessão em resolução, visitante, inicialização de perfil, troca obrigatória pendente,
  confirmação da troca, retorno obrigatório ao login, usuário pronto e erro.
- **FR-004**: Não renderizar conteúdo privado/financeiro ou administrativo antes de resolver
  sessão, perfil, permissão aplicável e cumprimento do primeiro acesso. A tela de troca usa
  uma sessão restrita, sem abrir os demais dados. Redirecionar visitante após resolver sessão.
- **FR-005**: No primeiro login de conta Authentication existente sem perfil, criar
  idempotentemente `users/{uid}` com fuso, schemaVersion, timestamps técnicos e
  primeiro_login=true, preservando
  a identidade e o histórico de criação em acessos posteriores.
- **FR-006**: Restringir o perfil ao próprio UID; impedir troca de proprietário, alteração
  de createdAt, escalação de schema ou inclusão arbitrária de campos administrativos.
  primeiro_login é protegido, não uma preferência editável pelo usuário.
- **FR-007**: Limpar estado privado/listeners em logout ou troca de conta e descartar
  operações tardias da sessão anterior; não habilitar cache Firestore persistente compartilhado.
- **FR-008**: Coletar nome completo, CPF, WhatsApp e email obrigatórios, validando formato,
  limites e normalização também no limite confiável de escrita, além da interface.
- **FR-009**: Apresentar WhatsApp brasileiro no formato `+55 (xx) xxxxx-xxxx`; normalizar
  representação para comparação, sem usar serviço de WhatsApp ou SMS nesta etapa.
- **FR-010**: Oferecer solicitação pública sem conta com somente os quatro dados
  obrigatórios, sem senha, criação automática de identidade ou login automático. O responsável
  cria posteriormente a conta manualmente no Authentication; a confirmação deve distinguir
  pedido recebido de conta disponível. A criação manual não é uma ação do formulário/admin.
- **FR-011**: Persistir solicitação com identidade estável, estado de processamento e
  timestamps; resistir a duplo clique e repetição após falha de rede sem duplicar a operação.
- **FR-012**: Identificar administradores por UID (o “UUI” do pedido corresponde ao UID
  do Authentication) cadastrado manualmente em coleção específica; clientes não podem
  conceder, alterar ou excluir esse papel, inclusive o próprio administrador pelo app.
- **FR-013**: Permitir ao admin consultar solicitações com os quatro dados e salvar início
  e fim da assinatura como datas de calendário; impedir fim anterior ao início, preservar
  dados originais e registrar autor/timestamp da alteração. Antes do primeiro salvamento,
  ambas as datas podem estar ausentes; para registrar período, informar ambas.
- **FR-014**: Limitar acesso admin a solicitações e metadados de assinatura, sem abrir
  perfis privados ou coleções financeiras. Paginar a lista e validar permissão nas rules,
  não apenas na tela; impedir perda silenciosa de edição concorrente.
- **FR-015**: Usar as datas de assinatura somente como registro administrativo nesta etapa.
  Datas ausentes, futuras ou vencidas não concedem nem revogam login ou acesso de contas
  novas ou existentes; regras de identidade e papel continuam obrigatórias. Não implementar
  expiração automática ou bloqueio por assinatura.
- **FR-016**: Notificar a nova solicitação persistida ao endereço fixo
  `luizgustavo.dev01@gmail.com`, com remetente no-reply autorizado e mecanismo de envio real;
  não solicitar senha pessoal do responsável nem incluir segredos no bundle.
- **FR-017**: Usar serviço externo com cota gratuita e processamento seguro para o email,
  sem habilitar Blaze, implantar Cloud Functions ou ativar cobrança. Verificar no planejamento
  as condições reais do provedor, remetente autorizado, limites e recepção pública protegida.
  Credenciais privadas ficam no ambiente confiável do serviço, nunca em variáveis VITE_.
  Se não houver solução viável dentro dessas condições, registrar bloqueio técnico sem
  substituir silenciosamente por serviço pago ou envio inseguro pelo navegador.
- **FR-018**: Separar confirmação de cadastro persistido do estado de email; registrar
  pendência/falha/aceite do serviço, permitir recuperação controlada e não depender do
  navegador aberto. Evitar reenvio deliberado da mesma operação, sem prometer entrega
  exatamente uma vez ou chegada à caixa de entrada quando o provedor só confirmou aceite.
- **FR-019**: Fixar destinatário e conteúdo permitido; não permitir relay arbitrário.
  Notificação deve ter referência à solicitação e evitar incluir CPF/WhatsApp no assunto,
  URLs ou logs. Por padrão os dados completos ficam na área administrativa restrita.
- **FR-020**: Entregar `firestore.rules` completo na implementação, com nota Markdown de
  motivos, coleções, permissões, validações, testes, publicação e reversão; preservar
  regras existentes necessárias e negar por padrão coleções financeiras e caminhos futuros.
- **FR-021**: Validar nas rules tipos, campos permitidos, faixas, imutáveis e relações de
  propriedade. Reservar operações administrativas estritas sem wildcard permissivo;
  validações de negócio que excedam as rules devem ser explicitadas no desenho seguro.
- **FR-022**: Entregar `firestore.indexes.json` completo se houver índices novos, com
  instruções; manter versão anterior das rules para rollback antes de substituir ambiente
  real. Não afirmar que arquivo local já está ativo nem publicar automaticamente.
- **FR-023**: Preparar testes pequenos no projeto real com dois usuários dedicados e
  visitante, credenciais fora do repositório/logs, projectId esperado independente da
  configuração efetiva e fixtures por execução; usar SDK cliente para validar rules.
- **FR-024**: Verificar operações get/list/create/update/delete permitidas e negadas,
  incluindo acesso cruzado, promoção a admin, adulteração de assinatura e coleções
  financeiras negadas. Um UID de teste será designado admin manualmente na etapa específica.
- **FR-025**: Não usar emuladores, exclusão global, seed na inicialização nem Admin SDK
  como evidência de autorização do cliente; limpar apenas escopo identificado da execução.
- **FR-026**: Exibir erros de configuração, autenticação, permissão, persistência e envio
  com mensagens distintas e recuperáveis, sem declarar conclusão antes da confirmação.
- **FR-027**: Não coletar senha pessoal no chat nem exigir conta administrativa para o
  frontend. O formulário público não coleta senha; o login posterior usa credenciais da
  conta criada manualmente, tratadas somente pelo Authentication, nunca em documentos de
  perfil/solicitação. O admin fornece email e senha provisória por canal apropriado;
  documentar criação manual e troca obrigatória, sem encaminhar senhas no email automático
  de notificação do cadastro ou pedir credenciais pessoais no chat.
- **FR-028**: Receber solicitações públicas por processamento confiável restrito, validando
  os quatro campos e identidade da operação e aplicando controles contra abuso. Visitantes
  não podem ler/listar solicitações, escolher destinatário nem escrever diretamente campos
  administrativos no Firestore. Confirmações públicas não devem revelar dados de outras
  solicitações; a referência de recebimento não equivale a autorização de leitura.

- **FR-029**: Persistir primeiro_login como booleano protegido em users/{uid}. Inicializar
  true no provisionamento ou na criação idempotente do perfil; campo ausente implica
  pendência. Não reativar true sobre false confirmado em login, recarga ou repetição.
- **FR-030**: Enquanto primeiro_login=true, permitir somente o mínimo necessário à troca
  obrigatória e logout; bloquear área principal, administrativa e dados correspondentes,
  inclusive por URL direta ou consulta indevida. O papel admin não dispensa a obrigação.
- **FR-031**: Exibir exatamente dois campos na tela obrigatória: Nova senha e Confirmar
  nova senha. Exigir preenchimento, igualdade, política do Authentication e senha diferente
  da provisória. Senhas ficam só em memória durante a operação, nunca no Firestore,
  armazenamento local, logs, URLs ou emails.
- **FR-032**: Atualizar a senha no Authentication e persistir primeiro_login=false somente
  após confirmação confiável da alteração. Não permitir criar perfil com false, editar
  livremente a flag ou aceitar alegação do próprio cliente como prova. O plano deve definir
  os controles e a confirmação confiável; Security Rules não devem ser apresentadas como
  prova de alteração da senha no Authentication.
- **FR-033**: Depois de confirmar alteração e persistência, encerrar a sessão, limpar dados
  em memória e voltar ao login; exigir autenticação explícita com a nova senha antes de
  iniciar o uso. Tratar falhas de atualização, login recente, gravação ou logout sem
  concluir o ciclo falsamente ou liberar a área principal.
- **FR-034**: Recuperar falhas parciais e concorrência entre abas de forma idempotente. Se
  a senha mudou mas a flag não foi confirmada, retomar sem depender da provisória inválida
  ou permitir marcação livre de false. Testar ciclo, recuperação e bypass no projeto real,
  somente com contas dedicadas e credenciais fora dos logs/repositório.

### Key Entities

- **Identidade autenticada**: UID e credenciais mantidas no Authentication. Não é titular
  financeiro e não carrega privilégio por email ou nome; a associação ocorre por UID.
- **Perfil privado**: único por UID em `users/{uid}`; UID/propriedade, fuso, schemaVersion,
  createdAt, updatedAt e primeiro_login (booleano protegido, inicialmente true). Campo
  ausente implica pendência; somente conclusão confiável da troca permite false. O perfil
  não contém senha provisória, nova senha ou confirmação. Dados não existentes na identidade
  não são inferidos. Nome/email
  conhecidos podem compor o esquema definido no plano; CPF não é requisito do perfil mínimo.
- **Solicitação de cadastro**: identificação estável, nome completo, CPF normalizado,
  WhatsApp normalizado, email, timestamps e situação do fluxo. A solicitação pública
  precede a conta e não exige UID. Eventual vínculo posterior a uma conta criada manualmente
  só pode ocorrer por processo confiável definido no plano, não por email/UID alegado pelo
  cliente; o comprovante público não concede leitura dos dados pessoais.
- **Papel administrativo**: registro específico por UID, provisionado e removido manualmente
  fora do aplicativo. Não usar campo admin editável no perfil ou email fixado como autoridade.
- **Registro de assinatura**: ligado à solicitação e, quando disponível, ao UID; início/fim
  de calendário, autor da alteração, versão de edição e timestamp. Usuário comum não escreve.
  Tem efeito somente informativo, sem controlar acesso; não copiar datas editáveis para
  perfil de usuário nem criar campos de bloqueio derivados de assinatura.
- **Estado da notificação**: referência estável à solicitação, destino autorizado, estado de
  processamento, tentativas controladas e aceite/erro do serviço confiável. Clientes comuns
  não podem forjar envio aceito nem destinatário. Serviço externo com cota gratuita e
  processamento seguro fará o envio, após verificação de viabilidade no planejamento.
- **Execução de teste**: projectId esperado, runId, UIDs dedicados e registros criados pela
  execução, permitindo relatório e limpeza limitada sem tocar dados de usuários reais.

### Escopo e matriz de autorização

| Recurso | Visitante | Usuário comum | Admin |
| --- | --- | --- | --- |
| Login e formulário de solicitação | Acessíveis, sem criação automática de conta | Acessíveis | Acessíveis |
| Perfil privado | Negado | Somente próprio UID; acesso mínimo ao primeiro login enquanto pendente | Mesmos limites do próprio perfil |
| Atualização obrigatória de senha | Exige autenticação | Obrigatória enquanto primeiro_login=true ou ausente | Também obrigatória se pendente |
| Edição livre de primeiro_login | Negado | Negado; conclusão somente por fluxo confiável | Sem dispensa ou edição livre pelo papel admin |
| Solicitação própria | Envio por recepção confiável; sem leitura/listagem pública | Acesso próprio somente se houver vínculo confiável | Consulta paginada de solicitações |
| Solicitações de terceiros | Negado | Negado | Consulta restrita ao fluxo admin após concluir primeiro acesso |
| Datas de assinatura | Sem escrita | Sem escrita | Gravação validada e auditável |
| Papel admin | Sem escrita | Sem escrita | Sem escrita pelo aplicativo |
| Estado de envio aceito | Sem escrita | Sem escrita | Sem forjar confirmação do provedor |
| Dados financeiros e subcoleções futuras | Negado | Negado | Negado |

O pedido de acesso exclusivo ao perfil e o pedido de uma tela admin são atendidos por
escopos distintos: privilégio admin não autoriza consultar perfis alheios. As exceções de
acesso a solicitações devem ser explícitas e não herdar acesso a subcoleções financeiras.

Esta feature não implementa lançamentos, cartões, cálculos, compartilhamento familiar,
planos comerciais, cobrança, checkout, renovação automática, SMS ou API WhatsApp.
As datas da assinatura são somente registro manual informativo, sem mecanismo de liberação
ou bloqueio. Não abrir coleções financeiras para nenhuma conta nesta etapa.

### Governança e dependências

O pedido amplia o escopo original com administração de solicitações, dados cadastrais e
assinaturas e notificação externa. Registrar essa mudança e seu impacto na próxima revisão
constitucional antes da implementação correspondente, mantendo isolamento financeiro.
A constituição não será alterada automaticamente por este comando de especificação.

A constituição vigente exclui notificações externas e funcionalidades comerciais e proíbe
Cloud Functions, backend próprio e faturamento habilitado sem mudança expressa de escopo.
O responsável autorizou expressamente o cadastro público, administração informativa de
assinatura e serviço externo com cota gratuita e processamento seguro para email. Essa
exceção de escopo fica registrada nesta sessão e deve ser incorporada à revisão constitucional
antes da implementação correspondente. Não autoriza Blaze, Cloud Functions, contratação paga
ou backend próprio irrestrito. O planejamento pode avaliar o serviço gerenciado autorizado.
Não apresentar envio no-reply garantido apenas com os quatro campos Firebase do frontend.

O planejamento deve definir nomes finais de coleções, campos permitidos e matriz por
operação sem antecipar regras executáveis incompletas nesta especificação. Se houver
endpoint confiável, sua autorização, antiabuso, limites e recuperação fazem parte da entrega.
Sem esse caminho não liberar gravação anônima arbitrária no Firestore para viabilizar
a solicitação pública. A viabilidade dentro da cota gratuita é gate técnico do planejamento;
ausência de solução deve resultar em bloqueio explícito, sem alterar a decisão de produto.

A sessão de senha provisória é restrita: criar a conta no Authentication não conclui o
primeiro acesso. A confirmação segura da troca e a recuperação são gates técnicos do plano,
dentro das condições autorizadas para processamento confiável; inviabilidade deve ser
registrada sem liberar a flag ao cliente ou ativar automaticamente serviços pagos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Todas as rotas privadas testadas aguardam resolução de sessão; em login,
  recarga, logout e troca A/B, zero telas exibem dados de outra conta ou estado admin indevido.
- **SC-002**: Primeiro acesso repetido, inclusive em duas abas, resulta em exatamente um
  perfil por identidade, preservando criação e campos protegidos.
- **SC-003**: 100% dos formulários de solicitação com campo obrigatório inválido são
  bloqueados; reenvio da mesma operação válida mantém uma única solicitação persistida.
- **SC-004**: Administrador designado consegue consultar solicitações e salvar um período
  válido; 100% das tentativas de terceiros alterarem autoridade, identidade ou período protegido
  são negadas na suíte definida.
- **SC-005**: Uma solicitação fictícia identificada resulta em aceite real de envio pelo
  serviço externo dentro das condições gratuitas verificadas, para o destinatário autorizado.
  No cenário de falha/cota, registra pendência explícita sem perder a solicitação. Falta de
  provedor viável deve ser registrada como bloqueio e não como entrega do canal concluída.
- **SC-006**: Todos os acessos cruzados e a coleções financeiras não implementadas da
  matriz A/B/visitante são negados; tentativas permitidas do próprio perfil e admin específico
  funcionam sob as regras publicadas verificadas.
- **SC-007**: Uma execução com alvo incorreto aborta antes de escrever; toda fixture da
  execução correta fica identificada e nenhuma limpeza alcança registros fora do seu escopo.
- **SC-008**: Os arquivos locais de ambiente continuam fora do rastreamento, o exemplo não
  contém valores reais e nenhum segredo de email ou senha aparece em código, logs ou bundle.
- **SC-009**: A entrega registra separadamente código gerado, regras publicadas, testes
  executados e bloqueados; não há afirmação de integração validada sem confirmação real.
- **SC-010**: Enviar solicitação não cria nenhuma conta nem autentica o visitante; alterar
  as datas administrativas para ausentes, futuras ou vencidas não muda o acesso de contas
  válidas, novas ou já existentes, respeitada a troca obrigatória de senha independente
  do registro informativo de assinatura.

- **SC-011**: Em todos os cenários de primeiro_login=true ou ausente, inclusive recarga,
  restauração e URL direta, a conta não acessa a área principal/admin antes de concluir a troca.
- **SC-012**: Uma conta de teste criada manualmente conclui credencial provisória → dois
  campos válidos → alteração confirmada → primeiro_login=false → logout → novo login;
  a provisória não autentica e a nova permite entrar sem repetir a atualização.
- **SC-013**: Todas as tentativas testadas de criar perfil liberado ou marcar false
  diretamente são negadas; falhas parciais não liberam acesso nem armazenam senhas.

## Assumptions

- A base implementada em `001-inicializar-aplicativo` é preservada; esta etapa não recria o
  projeto nem atualiza dependências indiscriminadamente. Não fazer commit ou deploy implícito.
- Inspeção local confirmou somente presença/preenchimento dos quatro campos do .env, sem
  imprimir valores, conectar ao projeto, testar credenciais ou afirmar validade deles.
- Login por email e senha da conta Authentication existente. O formulário público contém
  somente os quatro dados e não coleta senha. O responsável cria novas contas manualmente;
  cadastro de acesso e concessão do papel admin são operações distintas, fora do formulário.
  O admin informa email e senha provisória; o usuário altera a senha em tela própria e
  retorna ao login. A nova senha é conhecida somente pelo usuário.
- Persistência de sessão Authentication permite recarga na mesma aba; a implementação
  adotará sessão de navegador por padrão, sem cache persistente de documentos Firestore.
  Restauração não significa reabrir dados privados antes de confirmar identidade, perfil
  e ausência de pendência de primeiro acesso.
- CPF é validado por estrutura/dígitos; não há consulta a bases governamentais, upload de
  documentos ou verificação de identidade. Não presumir unicidade global de CPF sem fluxo
  confiável que não exponha registros; idempotência da operação não é unicidade de pessoas.
- O formato pedido de WhatsApp é brasileiro, com DDI 55, DDD de dois dígitos e nove dígitos
  locais. Outras regiões não fazem parte deste formulário inicial.
- Dados completos ficam restritos ao solicitante vinculado e admin; o aviso de email é
  resumido e remete à área restrita. Não encaminhar CPF/WhatsApp completos por padrão.
- Direitos administrativos são concedidos manualmente pelo responsável no banco real;
  escrever um papel admin não cria uma conta Authentication e vice-versa.
- Datas administrativas são informativas: não implicam cobrança, expiração, bloqueio ou
  criação automática de contas. Contas antigas continuam com acesso conforme sua identidade
  e regra de primeiro acesso; flag ausente não prova que a senha já foi atualizada.
- Não há autorização para instalar extensão, ativar faturamento, registrar domínio,
  contratar provedor ou enviar emails reais durante esta especificação.
- Somente contas dedicadas e dados fictícios serão usados nos testes. ProjectId esperado e
  credenciais de teste podem ser fornecidos na implementação sem senha pessoal do responsável.

### Referências de viabilidade

Consultas de especificação via Context7 e documentação oficial, sem selecionar provedor:

- [Gerenciamento de usuários e resolução de sessão](https://firebase.google.com/docs/auth/web/manage-users).
- [Condições de Security Rules](https://firebase.google.com/docs/firestore/security/rules-conditions).
- [Cache web e persistência](https://firebase.google.com/docs/firestore/manage-data/enable-offline).
- [Instalação de extensões: requisito Blaze](https://firebase.google.com/docs/extensions/install-extensions).
- [Trigger Email: serviço SMTP e proteção contra abuso](https://firebase.google.com/docs/extensions/official/firestore-send-email).
