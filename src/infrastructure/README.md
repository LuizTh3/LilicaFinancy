# Infraestrutura

Firebase modular é inicializado uma única vez em firebase/client.ts, com cache de dados em memória e autenticação de sessão. profileRepository/auth/adminRepository atendem a feature 002; trusted-api mantém somente seus endpoints de acesso/solicitações, sem finanças.

firebase/cadastrosRepository.ts implementa o CRUD privado da feature 004 com UID de sessão capturado, coleções fechadas, transações cadastro+recibo, versões esperadas e consultas remotas. firebase/cadastrosMapper.ts valida schema/campos/tipos ao decodificar, sem casts que aceitem campos futuros silenciosamente. O domínio não importa SDKs; consultas e mutações Firestore ficam neste adaptador.

consultarOperacao separa comandoCompleto (compara chave e conteúdo) de descritor (identifica recibo para conferência, sem escrever). Repetição lê recibo antes da versão atual. Falha indeterminada não cria outra identidade. A interface persiste somente descritor mínimo da mesma sessão, apagado ao sair/trocar UID; nunca armazena credenciais bancárias.

Persistência usa estado; contexto de conta para o núcleo 003 traduz explicitamente para estadoCadastro. Cliente não escreve usoCadastros. SDKs de backend/credencial operacional não provam Rules: testes remotos usam cliente Auth A/B/visitante/admin/pending e manifesto fechado. Ver specs/004-cadastros-financeiros-privados/quickstart.md e docs/firestore-rules-changes.md.
