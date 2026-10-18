# Validação da implementação 005

## Baseline — 2026-10-18 (T001)

- Git real: develop; contexto lógico: 005-receitas-despesas-externas. Documentos da feature e .specify/feature.json já estavam alterados/não rastreados antes da implementação; preservados.
- Node v25.8.1, npm 11.18.0. package.json: Firebase13.0.0, React19.2.8, TypeScript6.0.2, Vite8.3.0 e Vitest4.1.12. Dependências já instaladas; nenhuma atualização planejada.
- Checklist requirements.md:16/16, sem pendências. Nenhum extensions.yml. Ignore existente cobre dependências, build, ambiente e credenciais; projeto private, sem necessidade de .npmignore de publicação, Docker, Terraform, ESLint ou Prettier.
- Corrupção confirmada em firestore.rules: blocos duplicados interrompem regex de safeId/calendarDate. Arquivo local não é evidência do estado publicado. Restauração/compilação são gates anteriores à habilitação financeira.
- Configuração pública Firebase presente em .env; nenhuma credencial foi impressa. Sessão operacional Firebase CLI existente; isso não comprova permissão de compilação/publicação nem disponibiliza contas de teste.
- TEST_EXPECTED_PROJECT_ID, TEST_RUN_ID e contas A/B/ADMIN/PENDING não estão configurados no ambiente de integração inspecionado. Nenhuma fixture, exclusão, publicação ou alteração remota executada nesta auditoria.

## Execução

Tarefas só serão marcadas após a evidência correspondente. Testes vermelhos de contrato são resultado esperado anterior à implementação, não testes aprovados. Verificações remotas e avaliação assistida serão registradas separadamente das verificações locais.

### T002–T003 — setup

- Testes escritos antes dos adaptadores: externosEnvironment ausente e manifesto sem caminhos financeiros produziram três falhas esperadas.
- Após implementação: cinco arquivos, seis testes aprovados (ambiente externo, manifesto externo, regressões cadastrais e ordenação de limpeza). Nenhuma exclusão executada.
- O runner encontrou EPERM no diretório temporário do sandbox; TEMP/TMP apontados para .integration/tmp, já ignorado, resolveram sem escalada nem alteração de dependências.

### T004–T013 — fundação

- Nove comandos, DTOs e portas privados tipados; erros de excesso/integridade explícitos. Mapeador e leitor tiveram falha vermelha esperada por módulo ausente antes da implementação.
- Rules restauradas e schema2 compilados oficialmente: duas chamadas projects.test, ok=true e issues=[]; autorização explícita recebida após bloqueio de auto-review, sem publicação ou bypass.
- Cadastros schema1/2 com trava embutida e controles legados:21 testes de regressão aprovados, incluindo preservação após renomear/arquivar. Nenhuma trava criada no login.
- Sessão expõe fuso/geração, limpa os dois descritores privados e descarta dados após invalidação. Mapeador valida esquema/caminho/calendário/limites e traduz DTOs sem duplicar fatos.
- Leitor REST fixa T em páginas/dependências e recusa batch>8, página>50, UID incorreto, token ausente, snapshot expirado e resposta tardia. Onze testes de mapeador/leitor/sessão/guards aprovados.
- Regressão local total:47 arquivos,184 testes aprovados. Lint sem avisos. Typecheck exigiu explicitar timezone no retorno do perfil; correção em validação.

### T014 e progresso local de US1

- Typecheck completo aprovado após correção do retorno do perfil. Fundação schema1/2 mantém o plano de migração e rollback documentado em docs/firestore-rules-changes.md; cópia corrompida nunca deve ser publicada como rollback.
- Casos vermelhos de domínio e adaptador inicial foram executados antes de criar os módulos; após implementação, os testes aprovam previsão sem fato de caixa, identidade estável, somente leitura de recibo na transação, confirmação após perda de resposta e retorno original apesar de referência arquivada/preflight indisponível.
- Regressão atual:49 arquivos,191 testes aprovados; typecheck e lint aprovados. Compilação oficial da versão atual de firestore.rules: ok=true, issues=[], sem release/publicação ou escrita de dados.
- US1 permanece incompleta: integração ainda não cobre todos os cenários de T016, perfil de orçamento de T019 e tarefas de consulta/UI/índices ainda pendentes. Testes reais não executados; não há evidência de orçamento remoto ou fluxo manual.
- Usuário informou que o ambiente não está pronto. Criados docs/externos-test-setup.md e .env.integration.example com instruções de quatro contas, primeiro acesso, papel ADMIN e campos locais. Não foi criado arquivo com senhas nem publicada configuração. Autorização recebida cobre somente compilação oficial.

### Conferência do ambiente após configuração informada pelo usuário

- Arquivo local existe e está ignorado pelo Git. Campos obrigatórios preenchidos, projectId independente confere, runId e grupo externos válidos.
- Preflight local bloqueou INVALID_TEST_SCOPE: TEST_USER_A_UID e TEST_USER_PENDING_UID contêm o mesmo UID. Nenhum valor de credencial foi exibido. Solicitada correção dos dois campos a partir de Authentication; nenhuma conexão, fixture ou publicação foi executada nesta conferência.
- Criado scripts/check-externos-environment.mts: verificação local por padrão, autenticação/leitura apenas com --remote, saída sanitizada, sem gravação de perfil ou configuração. Guia atualizado com o comando.
- npm run build aprovado; aviso de bundle maior que 500 kB permanece como limitação de empacotamento, sem falha de build.

### Nova conferência após correção dos UIDs

- UIDs distintos, configuração obrigatória e projectId conferidos. A primeira execução remota restrita falhou por rede; repetição autorizada fora do sandbox fez autenticação e leituras próprias, sem fixtures ou publicação.
- A/B/ADMIN/PENDING autenticaram com UID correspondente. ADMIN tem perfil pronto e admins/{uid}.enabled=true. Os documentos users/{uid} de A, B e PENDING não existem; portanto esses três papéis ainda não satisfazem o preflight. Não foram criados perfis manualmente nem contornado primeiro acesso.
- TEST_RULES_CONFIRMED está yes no arquivo configurado pelo usuário. Isso não comprova publicação efetiva das Rules/índices desta feature e não foi usado para executar integração; a autorização recebida permanece somente compilação. Integração financeira continua pendente.

### Conferência após conclusão dos acessos

- A e B agora possuem perfil pronto, UID correspondente e autenticação posterior ao cutoff. ADMIN permanece pronto com papel habilitado. As quatro credenciais autenticam.
- PENDING ainda não tem documento users/{uid}; a leitura própria retornou documento inexistente. Nenhum perfil foi criado ou modificado pelo script de conferência. É necessário concluir apenas a inicialização normal de sessão dessa conta no aplicativo, mantendo primeiro_login=true.
- Não foram executadas fixtures financeiras, publicação de Rules ou exclusões. TEST_RULES_CONFIRMED=yes continua sem comprovação de publicação da implementação e não libera o gate remoto.

### Contas prontas e incremento local US1

- Após confirmação "Pending pronto", a conferência remota somente de leitura passou nos quatro papéis: A/B/ADMIN prontos e PENDING pendente, todos com UID correspondente; ADMIN enabled=true. Credenciais não foram exibidas. Nenhum perfil ou fixture foi escrito pelo script.
- Testes vermelhos de perfil de orçamento, paginação combinada e estado de intenção foram executados antes dos respectivos módulos. Após implementação:51 arquivos,197 testes locais aprovados; typecheck, lint e build aprovados. Build avisa bundle principal de aproximadamente907 kB antes de gzip; não é falha de compilação.
- T019: criação simples e consulta de operação implementadas; preflight não fatal, recibo primeiro, origem/cadastros fora das leituras transacionais, uso da categoria com patch protegido. Perfil de desenho14 explicitamente marcado validacaoRemotaPendente, sem habilitar substituição ou outros comandos.
- T020: leitor compartilhado de planejamento/detalhe, duas fontes em T, ordenação/cursor por fonte sem pular itens já buscados, filtros com parcialidade explícita e recusa de cursor de outra consulta/UID/geração. Testes de paginação/filtragem aprovados; uso real do REST/readTime permanece pendente.
- T021–T022: formulários e rotas protegidas de lista/detalhe integrados; BRL, estimativa, ocorrência no fuso validado, competência e previsão independentes, cadastros paginados, até cinco etiquetas. Estado mínimo da intenção no sessionStorage, conteúdo em memória, bloqueio de duplo envio e consulta após recarga; demais ações ainda não são oferecidas. Revisão visual/manual no projeto real permanece em T024.
- T023: arquivo completo de índices preserva os anteriores e acrescenta três compostos e três isenções de mapas. Nenhum índice publicado.
- T016 foi ampliada com ramo máximo de cinco etiquetas/titular/conta prevista, primeiro uso, recibo repetido e ataques diretos de campo extra, ocorrência ausente, opcional null e cada etiqueta arquivada individualmente. Esses testes estão escritos e tipados, ainda não executados remotamente.
- Versão revista das Rules compilada oficialmente: ok=true, issues=[], sem release. Grafo de acesso e implantação/rollback coordenados documentados. T024 permanece pendente de autorização de publicação, conferência da revisão remota, índices prontos e execução real/manual; histórias seguintes não iniciadas.

### Comparação remota após autorização do primeiro incremento

- Usuário autorizou backup/comparação/publicação do incremento e testes, sob condição explícita de parar antes de publicar se a comparação encontrasse mudanças remotas não contempladas.
- Backup somente de leitura concluído em .integration/005-backup-2026-10-18T15-56-12-850Z/. A consulta de índices inicialmente rejeitou pageSize100; foi refeita sem pageSize como a CLI oficial e passou. Nenhuma publicação foi tentada.
- Diferença não contemplada encontrada: release ativo ainda é a regra padrão global de teste até timestamp.date(2026,11,11); permissões002/004 locais não estão ativas. Publicação interrompida conforme condição autorizada. Quatro índices remotos READY estão contemplados; nenhuma isenção explícita ou índice desconhecido.
- Comparação e impacto da substituição registrados em deployment-review.md. Preparado arquivo completo docs/firestore-rules-005-safe-rollback.rules, com compatibilidade schema1/2 e bloqueio de novas criações financeiras, para evitar rollback automático ao modo aberto.
- Nenhuma fixture, exclusão ou escrita remota executada. T024 continua pendente da confirmação dessa substituição da base ativa e da execução real dos casos.
- Alternativa de rollback protegida compilada oficialmente após remover helpers inacessíveis: ok=true, issues=[], sem release. Arquivo principal firestore.rules não foi alterado nesta comparação.

### Substituição protegida autorizada

- Nova autorização explícita: "Autorizar a substituição protegida e os testes". Backup/release e índices conferidos antes da mutação; nenhuma mudança adicional encontrada.
- Publicado firestore.rules revisado com SHA-256 c1ae449dabdec54d3182174c05c35640804019ffb5645a9cb6dd1fbd802d8f48 e confirmado por leitura da fonte ativa. Modo de teste global encerrado. Nenhum deploy de hosting/API ou alteração de perfil.
- Cinco índices novos e oito isenções enviados; quatro índices anteriores preservados, sem exclusão. Aguardando READY/conclusão das operações antes dos testes de previsão. Operações registradas em .integration/005-deployment.json.
- Preflight de autenticação e leitura de perfis passou novamente após publicação para A/B/ADMIN/PENDING, sob as regras protegidas. Adicionados aos casos dirigidos T016 a listagem REST/readTime e o detalhe com um evento no snapshot comum; typecheck e lint aprovados após inclusão.

### T024 — validação real e manual do incremento US1

- Nove índices READY, oito isenções conferidas e oito operações concluídas; confirmação final somente de leitura em .integration/005-readiness.json. Nenhum índice existente foi excluído.
- A primeira execução real identificou o limite de 1000 expressões na criação, apesar da compilação válida. A avaliação oficial com a fonte integral e mocks tipados confirmou a causa. Corrigidos os ramos recíprocos: igualdade exata do conteúdo por Map.diff, calendário validado na origem e forma fechada no recibo, campos relevantes das referências sem repetir decodificação integral de cada etiqueta. As validações completas dos cadastros e o patch protegido de primeiro uso permanecem. Os testes anteriores falhos foram preservados como diagnóstico, sem serem contados como aprovados.
- Revisão corretiva compilada e publicada no mesmo escopo autorizado, com backup da revisão protegida anterior e conferência da fonte ativa. SHA-256 atual: 77133633eb823fd97322c7d06382a34eec5aed8e4dcc1c77fd382fd747050cee. Essa revisão substitui a primeira c1ae449d citada acima; não houve publicação de hosting/API ou alteração de perfis.
- Avaliação oficial da fonte integral no ramo máximo aprovou as três escritas. Grafo sem pressupor cache: origem5 + recibo6 + primeiro uso2 + autorização do get transacional1 =14 acessos; máximo6 por escrita. A execução real confirmou a viabilidade do ramo máximo, sem constituir medição de consumo por cache. Somente criarReceita/criarDespesa sem substituição passam a expor perfil validadoNoProjeto.
- Integração real com cliente autenticado e Rules ativas: quatro testes aprovados; runId externos-us1-20261018-160647. Cobertura: PENDING no próprio caminho, commit REST atômico, receitas/despesas e recibo idempotente, planejamento/detalhe em T, cinco etiquetas mais titular/conta prevista e primeiro uso. Ataques B/ADMIN/PENDING/visitante, campos extras, ocorrência ausente, opcional null divergente e cada etiqueta arquivada foram recusados. Conta apenas prevista não recebe trava financeira. A repetição após ajuste dos nomes também aprovou os quatro testes (40,03s de testes).
- Fluxo manual na aba de teste com A: formulário de despesa, titular, conta prevista, observação e cinco etiquetas; demais etiquetas desabilitadas no limite. Confirmada previsão de R$123,45, ocorrência2026-10-17, vencimento2026-11-10 e competência2026-12. Listagem de dezembro mostrou compromisso integral de R$123,45. Após recarga, pago zero, pendência integral, um evento de criação e nenhum fato de caixa. IDs do registro/recibo e leitura de conferência estão em .integration/005-ui-scope.json; imagem em .integration/005-ui-detail.jpg.
- Escopo da fixture manual registrado antes do envio; IDs exatos foram acrescentados ao manifesto após confirmação. As fixtures dos testes automáticos foram inventariadas antes das mutações. Não houve exclusão ou limpeza automática; registros fictícios permanecem inventariados. O guard temporal de limpeza pode exigir revisão do registro manual antes de qualquer exclusão futura autorizada.
- Detalhe agora resolve nomes da categoria/titular/conta/etiquetas por uma leitura batch de até oito referências no mesmo T. Cadastro arquivado continua legível como referência histórica; ausência tem indicação explícita. Teste vermelho antes da implementação e teste verde após, sem alterar Rules. Conferência visual após recarga aprovada.
- Checkpoint de US1 atingido. A implementação integral005 continua pendente de US2–US6 e acabamento (T025–T065): parciais, gasto imediato, correções/cancelamento/reversões, concorrência e caixa realizado ainda não estão habilitados. Nenhuma evidência desta seção valida antecipadamente esses comandos.

- Verificação final do incremento: 51 arquivos/198 testes locais aprovados; quatro testes reais aprovados; typecheck, lint e build aprovados. Build mantém aviso de bundle principal907,95 kB (275,22 kB gzip). git diff --check sem erros; nenhum extensions.yml ou hook after_implement presente. T001–T024 concluídas; parada no checkpoint MVP prevista em tasks.md, com T025–T065 abertas.
