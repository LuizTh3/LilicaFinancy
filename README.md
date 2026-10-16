# LilicaFinancy

Base inicial do aplicativo de controle financeiro, com React, Vite e TypeScript estrito.
A configuração Firebase ocorrerá na próxima etapa. Nenhum dado de acesso é necessário
para instalar, desenvolver ou visualizar esta entrega.

## Pré-requisitos

- Node.js `^22.12.0 || >=24.0.0` (mínimo 22.12.0; Node 23 não é suportado).
- npm 11.18.0, gerenciador usado para gerar `package-lock.json`.
- Ambiente de validação: Node 25.8.1 em Windows/PowerShell.

O gerador foi `create-vite@9.2.1`, template oficial `react-ts`, integrado após inspeção
do diretório. TypeScript permanece na família 6 do template, sem migração para major 7.
As versões exatas instaladas estão no lockfile e no relatório de validação.

## Preparação e execução

Na raiz do repositório:

```powershell
npm ci
if (-not (Test-Path -LiteralPath '.env')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env'
}
npm run dev
```

Abra a URL local impressa no terminal. Encerre o servidor com Ctrl+C.
O aplicativo também inicia sem `.env` ou com os campos vazios.

Para gerar e visualizar a distribuição local:

```powershell
npm run build
npm run preview
```

Abra a URL informada por preview; encerre com Ctrl+C. Preview é uma visualização local
da distribuição, não um servidor de produção nem publicação.

Se houver erro de versão do Node, use uma versão que satisfaça `engines.node` antes de
instalar. Se faltarem dependências, execute `npm ci`. Não ignore conflitos com `--force`.

## Limites desta entrega

Uma página inicial, sem autenticação, regras financeiras ou persistência. Nenhum SDK Firebase
é instalado ou inicializado, mesmo que as variáveis de ambiente sejam preenchidas.

## Comandos de qualidade

```powershell
npm run typecheck
npm run lint
npm test
```

`typecheck` verifica a aplicação e as configurações de ferramentas com TypeScript estrito,
sem emitir JavaScript na árvore fonte. `build` também inclui essa checagem.
O lint usa Oxlint com regras React, TypeScript e acessibilidade; warnings causam falha.

O runner Vitest executa uma vez, em ambiente Node, com `--passWithNoTests`. Ainda não há
casos unitários nesta fundação: a mensagem “No test files found” é esperada e informa
runner preparado, não testes financeiros aprovados. Futuros testes de domínio devem
verificar comportamento de funções puras, sem Firebase ou emuladores.

## Ambiente local

`.env` é local e ignorado. `.env.example` é versionável e contém apenas:

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

Deixe os quatro valores vazios nesta etapa. Não acrescente campos até que uma funcionalidade
os use. Ausência, preenchimento parcial ou completo não habilitam integração automaticamente.

Variáveis com prefixo `VITE_` consumidas pelo frontend são incorporadas ao bundle do navegador.
São públicas e não constituem cofre de segredos, mesmo quando o arquivo `.env` é ignorado.
Nunca inclua senhas, chaves administrativas ou arquivos de service account nessas variáveis.
Credenciais locais devem ficar fora do repositório, por exemplo em `.credentials/`.

Se `.env` já tiver sido rastreado em outra cópia, ignorá-lo não remove o histórico: informe a
possível exposição anterior e trate a remoção do índice separadamente, sem apagar o arquivo
local. Esta implementação encontrou o repositório sem arquivos de ambiente rastreados.

## Organização

| Área | Responsabilidade |
| --- | --- |
| `src/app/` | Composição da aplicação, shell e navegação |
| `src/features/` | Funcionalidades; nesta etapa, somente a página inicial |
| `src/domain/` | Futuras funções financeiras puras, independentes de React e SDK |
| `src/infrastructure/` | Futuras integrações e repositórios; nenhuma conexão atual |
| `src/shared/` | Componentes compartilhados necessários e estilos comuns |

Não existem router, backend, dados simulados, SDK Firebase ou esquema financeiro.
A navegação mostra apenas Início; o link de salto permite chegar ao conteúdo por teclado.
Autenticação, persistência, isolamento e rules serão tratados na próxima etapa especificada.
Não há necessidade de Firebase Emulator Suite nem de configurar um projeto real agora.

## Versões resolvidas e validação

Conjunto registrado no lockfile desta entrega:

| Ferramenta | Versão |
| --- | --- |
| React / React DOM | 19.3.1 |
| Vite | 8.3.4 |
| Plugin React | 6.1.2 |
| TypeScript | 6.0.3 |
| Oxlint | 1.88.0 |
| Vitest | 4.1.12 |

Gerenciador npm 11.18.0; tipos Node 24.19.2 e tipos React/React DOM 19.3.0.
Vitest recebeu patch direcionado na mesma família para corrigir o aviso GHSA-82fw-gwwq-j7x9.
Não foram adotadas atualizações de major desnecessárias nem mudanças de runtime.

Consulte o [guia de validação](specs/001-inicializar-aplicativo/quickstart.md) e o
[registro de resultados e limitações](specs/001-inicializar-aplicativo/validation.md).
Esta fundação não valida cálculos financeiros, persistência ou isolamento entre usuários.
