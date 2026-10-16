# Contract: Rotas, sessão e interface

React Router 7 declarativo; uma única raiz Firebase por ciclo de página. Proteger UI é
complemento às Rules/serviço, nunca mecanismo único de autorização.

## Rotas

| Rota | Acesso | Conteúdo |
| --- | --- | --- |
| / | Público | Home existente e caminhos de entrada |
| /login | Público | Email e senha de conta existente |
| /cadastro | Público | Nome completo, CPF, WhatsApp e email; sem senha |
| /cadastro/recebido | Público | Recibo em memória, sem consultar PII publicamente |
| /primeiro-acesso | Sessão pendente | Somente nova senha e confirmação; ação sair |
| /app | Sessão pronta | Shell autenticado sem dados financeiros implementados |
| /admin/solicitacoes | Admin pronto | Página de solicitações com cursor |
| /admin/solicitacoes/:requestId | Admin pronto | Dados da solicitação, datas e estado de notificação |
| Demais caminhos | Sem ampliar permissões | Página não encontrada com navegação segura |

Recibo não autoriza leitura de dados. next/returnTo só admite destinos internos conhecidos,
sem open redirect. Deploy estático precisa de fallback de navegação para index.html sem
transformar erros de endpoints externos em HTML.

## Máquina de sessão

```text
config inválida → erro de configuração (nomes ausentes, sem valores)
config válida → resolvingAuth
resolvingAuth → guest OU resolvingProfile
resolvingProfile → firstLoginRequired OU reloginRequired OU resolvingRole
resolvingRole → readyUser OU readyAdmin
qualquer estado privado → logoutPending → limpeza + signOut + navegação completa /login
qualquer operação → erro recuperável com conteúdo privado removido quando autorização falha
```

Somente ready monta Outlet privado. firstLoginRequired não monta app/admin nem carrega seus
dados; lê somente o perfil mínimo necessário e usa o endpoint da troca. false sem cutoff
confirmado ou token com auth_time insuficiente não vira ready. Não confiar em perfil lido
somente de cache para liberar sessão inicial; obter confirmação do servidor.

Incrementar generationId em mudança de identidade, invalidar resultados anteriores e encerrar
listeners. Role é resolvida depois do primeiro acesso, usando documento atual do próprio UID.
Se role for removida ou operação negada, desmontar lista/detalhes e limpar seus dados.

Logout limpa estado e listeners antes da chamada assíncrona. Após signOut confirmado,
location.replace para /login descarta também o cache de SDK em memória. Em troca de UID,
reinicializar o ciclo de página antes de exibir dados de B. Não habilitar persistência de
Firestore ou cache HTTP para dados pessoais, senhas ou respostas autenticadas.

## Cadastro público

Quatro campos com labels, erros por campo e máscara de WhatsApp +55 (xx) xxxxx-xxxx;
normalização de CPF/telefone apenas no payload, sem alterar significado do nome/email.
Turnstile é proteção técnica; não é campo de dados cadastrais. Confirmação somente após
persistência. Bloquear duplo clique e reutilizar operationId em retry; não armazenar os
quatro dados em localStorage para implementar idempotência.

Recibo diz: solicitação recebida; responsável criará a conta posteriormente. Não dizer
conta criada, acesso aprovado ou email entregue sem os respectivos fatos.

## Complemento do cadastro: WhatsApp

Depois do commit confirmado, o formulário salva o recibo na navegação interna e encaminha
ao link wa.me/5568999739841 com mensagem genérica codificada. Em falha de persistência,
permanece no formulário sem encaminhar. O recibo mantém link manual para reabrir a conversa
se o navegador não abrir ou o usuário voltar. Não preencher CPF, email ou outros dados
do formulário na conversa. O cliente confirma o envio no WhatsApp; email/outbox continuam
processados independentemente. Não existe API WhatsApp nem envio automático de mensagem.

## Primeiro acesso

Admin cria conta manualmente e entrega credencial provisória por canal apropriado fora do
email automático de aviso. Nova senha e confirmação são obrigatórias, com validação no
cliente e no limite confiável. Somente dois campos visíveis; nenhuma senha antiga no
formulário e nenhuma consulta arbitrária de UID.

Após troca confirmada: limpar campos e referências, aguardar fronteira de login indicada,
encerrar sessão e mostrar login; não guardar a senha para fazer signIn automático.
Na janela incerta entre Auth e banco, informar que a senha pode ter sido atualizada e que
o usuário deve entrar com a senha efetiva e escolher outra nova para concluir com segurança.
Erros de login recente retornam ao login sem apresentar a tarefa como concluída.

## Admin e assinatura

Lista de 25 registros, próximo/anterior por cursor, estados carregando/vazio/erro e sem
listener sobre todo o histórico. Detalhe revela somente dados necessários ao cadastro;
campos originais não são editáveis nesta feature.

Formulário de datas de calendário: ambas obrigatórias para salvar período, fim ≥ início.
Salvar por transação com version; conflito mostra edição desatualizada e permite recarregar,
sem sobrescrever silenciosamente. Mostrar pendente enquanto o servidor não confirma.
Datas ausentes/futuras/vencidas não alteram acesso de conta normal. Não há checkout,
cobrança, bloqueio automático, criação de conta ou concessão de admin pela tela.

## Qualidade e observabilidade

Reutilizar shell/CSS sem UI kit redundante, com labels, foco visível e erros acessíveis.
Verificar desktop/móvel a 360 e 1280 pixels e teclado. Spinner inicial neutro não mostra
nome/dados da sessão anterior. Logs têm code/requestId sanitizados; não registrar email,
CPF, WhatsApp, senha, token ou corpo completo de formulários.
