# LilicaFinancy

Aplicativo de controle financeiro com React, Vite e TypeScript estrito. Esta etapa adiciona
Firebase Authentication/Firestore, solicitações de acesso e administração cadastral.
Os recursos financeiros ainda não foram implementados. Compilação e testes locais não
exigem credenciais; login e fluxos remotos exigem configuração e Rules publicadas.

## Pré-requisitos

- Node.js `>=24.12.0`, mínimo exigido pelas dependências Firebase atuais.
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
A home inicia sem `.env`; login mostra erro claro quando a configuração Firebase está incompleta.

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

Login/logout, restauração por aba, perfil privado e troca obrigatória da senha no primeiro
acesso. Cadastro público coleta quatro dados e não cria conta; o responsável cria a conta
manualmente. Admin por UID manual consulta solicitações e salva período informativo.
O serviço externo restrito recebe pedidos, protege a troca de senha e processa outbox/email.
**Infraestrutura real ainda não preparada nem publicada.** Consultar os gates operacionais.

## Comandos de qualidade

```powershell
npm run typecheck
npm run typecheck:trusted-api
npm run lint
npm test
npm run build:trusted-api
```

`typecheck` verifica a aplicação e as configurações de ferramentas com TypeScript estrito,
sem emitir JavaScript na árvore fonte. `build` também inclui essa checagem.
O lint usa Oxlint com regras React, TypeScript e acessibilidade; warnings causam falha.

Vitest executa os testes locais de domínio e contratos do serviço; nunca descobre testes
reais pelo comando padrão. `typecheck` inclui fontes e harness de integração.
`build:trusted-api` faz bundle/dry-run do Worker sem publicar. Integração real é opt-in:
`npm run test:integration`, com alvo/contas dedicadas configurados conforme guia operacional.
Não há Firebase Emulator Suite. Nenhum teste local comprova Rules remotas ou envio real.

## Ambiente local

`.env` é local e ignorado. `.env.example` é versionável e contém apenas:

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_TRUSTED_API_BASE_URL=
VITE_TURNSTILE_SITE_KEY=
```

Preserve os valores locais existentes. API externa e site key são necessários somente nos
fluxos correspondentes; sua ausência indica indisponibilidade, sem simulação de sucesso.
Vite publica somente esses seis campos por allowlist explícita, sem exportar campos legados.

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
| `src/features/` | Home, autenticação, solicitação e administração |
| `src/domain/` | Validações/transições puras, independentes de React e SDK |
| `src/infrastructure/` | Firebase singleton, repositórios e cliente da API restrita |
| `src/shared/` | Componentes compartilhados necessários e estilos comuns |
| `services/trusted-api/` | Worker restrito, sem secrets no bundle do navegador |
| `tests/integration/` | Suítes opt-in pequenas para Firebase real |

Rotas: /, /login, /cadastro, /cadastro/recebido, /primeiro-acesso, /app e
/admin/solicitacoes (lista/detalhe). O hosting estático deve servir index.html como fallback
dessas rotas; a API externa mantém seus próprios erros JSON, sem fallback HTML.
Sessão/primeiro acesso/papel são resolvidos antes da área protegida. Datas de assinatura não
controlam acesso; admin não consulta finanças/perfis de terceiros. Sem cache persistente
Firestore; logout descarta a página e dados em memória.

Antes de usar o ambiente real, seguir [operações Firebase](docs/firebase-operations.md) e
[Rules/publicação/rollback](docs/firestore-rules-changes.md). Arquivos de Rules/índices locais
não estão automaticamente ativos; publicação e envio real exigem autorização vigente.

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

Novos pacotes fixados: Firebase 13.0.0, React Router 7.18.4, jose 6.2.12,
Wrangler 4.151.1 e tipos Worker 5.20261016.1; dependências existentes preservadas.
Override pontual de @grpc/grpc-js 1.13.6 corrige GHSA-m9gg-hp2v-232j e
GHSA-f596-whhp-79r4; não foi usado audit fix --force nem downgrade do Firebase.
Consulte o [guia da integração](specs/002-autenticacao-cadastros-admin/quickstart.md) e o
[registro atual de resultados e bloqueios](specs/002-autenticacao-cadastros-admin/validation.md).
