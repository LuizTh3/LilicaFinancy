# Contract: Ambiente local e proteção de configuração

## Arquivos e campos

Na implementação, criar `.env` local ignorado e `.env.example` versionável, com este
contrato inicial, exatamente quatro nomes e valores vazios:

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

Não acrescentar storage bucket, messaging sender ID, analytics ou outro campo não usado.
O aplicativo inicia sem `.env`; o README orienta copiar o exemplo em uma nova instalação.
Preservar arquivos locais preexistentes encontrados na reinspeção e registrar conflitos,
sem imprimir valores nem substituir conteúdo sensível automaticamente.

## Comportamento

| Configuração | Tela inicial | Inicialização de Firebase | Autenticação/leitura/escrita externa |
| --- | --- | --- | --- |
| Ausente | Disponível | Não | Não |
| Quatro valores vazios | Disponível | Não | Não |
| Parcial, somente dados fictícios | Disponível | Não | Não |
| Completa, somente dados fictícios | Disponível | Não | Não |

A mensagem de próxima etapa é constante. Não implementar botão conectar, SDK, validação
obrigatória, pedido de credenciais ou detecção automática que ative integração.
Não exibir os valores na tela, logs ou relatório. Usar dados fictícios nos ensaios.

## Exclusões e rastreamento

Adicionar regras ao `.gitignore`, preservando conteúdo existente, para cobrir:

- `node_modules/`, `dist/`, `coverage/` e logs (`*.log` e diretórios de logs locais).
- `.env`, `.env.*` e variantes locais, com exceção posterior `!.env.example`.
- Diretório local designado para credenciais, por exemplo `.credentials/`, e arquivos de
  credenciais locais, como `*.local.credentials.json`, `*service-account*.json`, `*.pem`
  e `*.key`. Conferir nomes reais encontrados sem imprimir seu conteúdo.

Não ignorar todo JSON ou toda documentação para resolver esse requisito.
Verificar `git ls-files -- .env` e outros arquivos locais identificados. Ignore não remove
arquivos já rastreados: informar possível exposição e tratar remoção do índice separadamente,
preservando arquivo local. Não apagar arquivos, reescrever histórico ou rotacionar chaves
como parte automática desta inicialização.

## Publicidade dos valores

Variáveis `VITE_` consumidas pelo frontend são incorporadas ao código cliente e devem ser
tratadas como públicas. `.env` não é cofre de segredos; ignorá-lo no Git não protege valores
incluídos no bundle. Proibido incluir senhas, service accounts ou chaves administrativas.
Uma futura configuração web Firebase não substitui Authentication e Security Rules.

## Critério de verificação

Conferir os quatro estados sem chamadas Firebase, o arquivo local final vazio para esta
nova base, a exceção do exemplo no ignore e a ausência de rastreamento de credenciais.
Não usar valores reais para provar que a integração está inativa.
