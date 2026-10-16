# Data Model: Fundação sem dados financeiros

Esta feature não cria entidades de negócio, coleções, documentos, migrações ou armazenamento
local de dados financeiros. Não define antecipadamente o esquema Firebase.

## Configuração de ambiente local

Artefato de desenvolvimento, não entidade persistida da aplicação. Seu contrato público
está em [contracts/environment.md](contracts/environment.md).

| Campo | Tipo quando presente | Valor inicial | Obrigatório para abrir esta entrega |
| --- | --- | --- | --- |
| VITE_FIREBASE_API_KEY | string | vazio | Não |
| VITE_FIREBASE_AUTH_DOMAIN | string | vazio | Não |
| VITE_FIREBASE_PROJECT_ID | string | vazio | Não |
| VITE_FIREBASE_APP_ID | string | vazio | Não |

Ausência não é string vazia; ambas são toleradas. Se forem declarados tipos de ambiente,
os quatro campos devem aceitar ausência, sem conversão que os torne obrigatórios.
Não criar validador, objeto de configuração ou parser sem consumidor nesta etapa.

## Estado da interface

A interface permanece no estado estático “base disponível; configuração Firebase na próxima
etapa”. Não há transição para “conectado”, mesmo com os quatro campos preenchidos.
Não há estado de sessão, login, pagamento, carregamento de banco ou erro de integração.

## Identidade, relações e ciclo de vida

Não há identificadores, referências entre usuários, relações ou operações CRUD nesta feature.
A navegação tem somente o destino Início `/` e âncora de conteúdo `#conteudo-principal`.
Nenhum dado de configuração será armazenado em localStorage, enviado ou exibido na tela.

## Versão de esquema e regras

Não se aplica esquema de dados nesta etapa. Não gerar `firestore.rules` nem
`firestore.indexes.json`; o primeiro acesso real exigirá especificação própria e o contrato
constitucional de segurança, testes e entrega textual completa das regras.
