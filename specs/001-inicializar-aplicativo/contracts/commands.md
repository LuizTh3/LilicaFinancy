# Contract: Comandos e ambiente de ferramentas

## Gerenciador e versões

Usar npm, `package-lock.json` e campo `packageManager` com a versão efetivamente usada.
Revalidar runtime e engines/peers antes do primeiro scaffold/install. Piso de projeto
inicial Node 22.12.0; restringir o intervalo conforme todas as dependências selecionadas.
O runtime observado 25.8.1 não autoriza instalar pacotes que o excluam.
Versões exatas publicadas, lockfile e requisito final devem constar do registro de entrega.

## Interface de comandos

| Comando público | Script planejado | Resultado esperado |
| --- | --- | --- |
| `npm ci` | Instalação pelo lockfile | Dependências reproduzidas; manifesto e lockfile coerentes |
| `npm run dev` | `vite` | Servidor local, URL informada; processo permanece ativo até Ctrl+C |
| `npm run build` | `tsc -b && vite build` | Tipos válidos e distribuição em `dist/`; código 0 |
| `npm run preview` | `vite preview` | Serve `dist/` existente; permanece ativo até Ctrl+C |
| `npm run typecheck` | `tsc -b` | Valida projetos da aplicação e ferramentas sem emitir JS; código 0 |
| `npm run lint` | `oxlint --deny-warnings` no conjunto de referência | Sem erros/warnings; código 0 |
| `npm test` | `vitest run --passWithNoTests` | Execução única; informa ausência de testes; código 0 |

`npm ci` é instalação, além dos seis fluxos da especificação. O primeiro `npm install`
será usado somente na implementação para criar/atualizar o lockfile das dependências
selecionadas; cópias limpas usam `npm ci`. Não criar lockfiles de outros gerenciadores.

Caso o template estável publicado use ESLint, manter seu script com política de falha em
warnings equivalente e registrar a diferença de forma consistente em README e artefatos.
Não manter dois linters nem trocar o linter de um app já existente sem necessidade.

## Tipos e testes

Ativar explicitamente `strict: true` e `noEmit` nos projetos TypeScript da aplicação e
ferramentas. Incluir `vite.config.ts` e `vitest.config.ts` na checagem de ferramentas e
armazenar metadados incrementais em diretório ignorado. Não tratar transpilar como typecheck.

Vitest 4, ambiente Node; configuração dedicada mínima sem plugin React, DOM ou cobertura.
Sem testes financeiros nesta feature. Não criar teste de existência, teste vazio ou teste
que espelhe implementação só para produzir saída verde.

A saída de nenhum teste não representa testes de domínio aprovados. Quando futuros testes
forem adicionados, falhas reais devem retornar código não zero normalmente.

## Documentação e erros

README deve explicar pré-requisitos, instalação, todos os comandos, estrutura, ambiente,
limites da entrega e recuperação para runtime incompatível ou dependências não instaladas.
Dev e preview são serviços de execução local, não publicação nem servidor de produção.
Não prometer número fixo de porta; usar a URL impressa pelo processo.

Registrar erros e bloqueios reais, sem sugerir `--force`, desativação de tipos, liberação de
regras ou credenciais administrativas para destravar esta base.
