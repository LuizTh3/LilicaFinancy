# Research: Inicialização do aplicativo financeiro

Data: 2026-10-16. Pesquisa de planejamento; nenhuma dependência foi instalada.

## 1. Bootstrap seguro e compatibilidade

**Decision**: Usar o template oficial `react-ts` do create-vite em uma pasta temporária
nova dentro do workspace, revisar a lista de arquivos e transferir somente os artefatos
necessários para a raiz. Não executar scaffold destrutivo sobre a raiz já ocupada.
Repetir a inspeção antes da implementação; se houver aplicativo, ajustar o existente.

**Rationale**: O repositório já contém `.agents/`, `.git/`, `.specify/` e agora `specs/`.
Gerar diretamente na raiz pode conflitar com conteúdo existente. A aplicação final terá
raiz única, sem manter um segundo projeto temporário ou instalar suas dependências.

**Alternatives considered**: Scaffold diretamente em `.` com sobrescrita; escrever um
starter inteiro à mão; criar frontend/backend separados. Acrescentam risco ou trabalho
sem atender melhor ao escopo.

**Evidence**: [Guia oficial Vite](https://vite.dev/guide/) e
[create-vite](https://github.com/vitejs/vite/tree/main/packages/create-vite).
Context7 confirmou o template `react-ts` e a sintaxe npm com `-- --template`.
O guia informa Node 20.19+ ou 22.12+, com possível exigência maior pelo template.

## 2. Política de versões e gerenciador

**Decision**: Usar npm e `package-lock.json`. Runtime observado: Node 25.8.1 e npm 11.18.0.
Adotar como piso de projeto Node 22.12.0 e intervalo inicial `^22.12.0 || >=24.0.0`,
sujeitos à interseção dos `engines` e peers de TODAS as versões realmente selecionadas.
O piso é uma escolha do projeto, não o mínimo universal do Vite.
Registrar em `package.json` e README o intervalo final e `packageManager: npm@<versão
realmente utilizada>` com valor concreto, nunca com esse marcador literal.

O conjunto de referência do template oficial consultado em `main` é React/React DOM 19,
Vite 8, plugin React 6, TypeScript 6 e Oxlint 1. Isso orienta a seleção, mas NÃO comprova
que cada versão de `main` foi publicada. Na implementação, verificar releases estáveis,
`engines` e `peerDependencies`; registrar versões exatas, fontes e data. Fixar o gerador
na versão verificada antes do scaffold e registrar sua versão. Não usar prereleases,
`--force`, `--legacy-peer-deps` ou ignorar incompatibilidades de runtime.

**Rationale**: O template evolui; o registro local e o lockfile tornam a entrega auditável.
Não é necessário escolher patches desatualizados agora nem modificar o runtime do usuário.
Se um componente novo não aceitar Node 25, selecionar uma versão estável compatível e
registrar o motivo, preservando as famílias compatíveis do conjunto. Se não houver um
conjunto viável, registrar bloqueio antes de instalar ou atualizar o runtime.

**Alternatives considered**: Introduzir pnpm/Yarn; instalar tudo como `latest`; atualizar
Node automaticamente; assumir que qualquer major superior ao piso é suportado.

**Evidence**: [Template oficial](https://github.com/vitejs/vite/blob/main/packages/create-vite/template-react-ts/package.json)
e [requisito do gerador](https://github.com/vitejs/vite/blob/main/packages/create-vite/package.json).
Não foi confirmada a versão mais recente publicada no registry nesta pesquisa.

## 3. Runner unitário

**Decision**: Usar Vitest 4.x, com patch estável e peers revalidados na implementação.
Comando `test`: `vitest run --passWithNoTests`. Ambiente padrão `node`; nenhum pacote
DOM, cobertura ou suíte de browser instalado para esta fundação.

**Rationale**: A versão oficial 4.1.6 comprova Node `^20.0.0 || ^22.0.0 || >=24.0.0`
e peers Vite `^6 || ^7 || ^8`, incluindo o runtime local e a família Vite 8.
O Vitest 5 consultado em `main` declara Node `^22.12.0 || ^24.0.0 || >=26.0.0`, que
exclui Node 25. Portanto `latest` não é seleção segura para este ambiente.
O runner precisa estar preparado, sem inventar comportamento financeiro ou testes de arquivos.

**Alternatives considered**: Vitest 5 com troca de runtime; Jest; testes de existência
para produzir uma aprovação artificial. Não se justificam nesta etapa.

**Evidence**: Pesquisa delegada e conferida via Context7 e fontes oficiais:
[manifesto Vitest 4.1.6](https://raw.githubusercontent.com/vitest-dev/vitest/v4.1.6/packages/vitest/package.json),
[manifesto atual](https://github.com/vitest-dev/vitest/blob/main/packages/vitest/package.json),
[CLI](https://vitest.dev/guide/) e
[passWithNoTests](https://github.com/vitest-dev/vitest/blob/main/docs/config/passwithnotests.md).
`4.1.6` é uma combinação conhecida, não uma afirmação de patch mais recente.

## 4. Tipos e lint

**Decision**: Preservar a configuração do template estável escolhido e ativar explicitamente
`strict: true` nos projetos de aplicação e configuração de ferramentas. Manter `noEmit`.
`typecheck` usará `tsc -b`; `build` usará `tsc -b && vite build`. Os metadados incrementais
ficam sob `node_modules/.tmp`, conforme o template, sem JavaScript emitido na árvore fonte.

Usar Oxlint 1 se confirmado no template estável selecionado, com configuração JSON e
`oxlint --deny-warnings` no script lint. Ativar regras de correção e plugins pertinentes
React/TypeScript suportados pela versão escolhida. Se o template publicado ainda usar
ESLint, preservar esse linter e registrar a diferença; não trocar apenas para coincidir
com `main` nem instalar os dois linters. O contrato é lint verificado e documentado.

**Rationale**: O template de `main` consultado já usa Oxlint e TypeScript 6; não presumir
ESLint ou TypeScript 5. A configuração JSON evita elevar o piso de runtime só para ler
configuração TypeScript de lint. A checagem de tipos continua independente do linter.

**Alternatives considered**: Dois linters; lint como substituto da checagem de tipos;
configuração TS de Oxlint, que exige Node 22.18+ ou 24+ conforme a documentação.

**Evidence**: [Template de tipos](https://github.com/vitejs/vite/blob/main/packages/create-vite/template-react-ts/tsconfig.app.json),
[Oxlint configuração](https://oxc.rs/docs/guide/usage/linter/config.html),
[Oxlint CLI](https://oxc.rs/docs/guide/usage/linter/cli.html).

## 5. Arquitetura e navegação mínima

**Decision**: SPA na raiz, CSS simples e componentes React. Uma única página `/`, com
link Início e link de salto para o conteúdo. Omitir destinos futuros. Sem biblioteca de
rotas, estado global, UI kit ou APIs fictícias. Reservar diretórios de domínio e
infraestrutura com README de responsabilidades, sem serviços ou interfaces especulativas.

**Rationale**: Uma tela satisfaz a especificação e reduz dependências; a separação protege
as futuras regras financeiras de acoplamento à interface e ao SDK.

**Alternatives considered**: Router para uma única página; dashboard com números fictícios;
camadas genéricas e repositórios sem dados. Não há necessidade funcional atual.

## 6. Ambiente e ausência de integração

**Decision**: `.env` e `.env.example` com exatamente quatro campos vazios; sem importar
Firebase nem ler configuração para habilitar conexões. Manter os valores opcionais se
forem tipados. O estado funcional desta entrega é sempre “configuração na próxima etapa”.
Não implementar validador ou tela de configuração antecipada.

**Rationale**: Ausência, preenchimento parcial ou completo não podem alterar o comportamento.
Variáveis `VITE_` usadas pelo cliente ficam públicas no bundle; ignorar `.env` não transforma
seus valores em segredos. Não incluir senhas nem chaves administrativas.

**Alternatives considered**: Inicializar SDK com placeholders; exigir campos para executar;
habilitar automaticamente integração quando campos estiverem preenchidos. Violam o escopo.

**Evidence**: [Vite env e modos](https://vite.dev/guide/env-and-mode), consultado via Context7.
O contrato completo está em `contracts/environment.md`.

## 7. Verificação e entrega

**Decision**: Verificar instalação reproduzível, tipos, lint, build, runner, dev e preview;
validar interface manualmente em navegador nos dois tamanhos e quatro estados de ambiente.
Usar somente valores fictícios nos ensaios e restaurar os quatro valores vazios ao final.
Registrar resultados em `validation.md` na implementação; não gerar resultados fictícios
neste planejamento. Não instalar emuladores, publicar, fazer commit ou alterar rules.

**Rationale**: A base não contém operações financeiras, usuários nem banco para validar.
O runner sem testes deve ser descrito como preparado; navegação e acessibilidade merecem
inspeção funcional, sem uma suíte artificial.

**Alternatives considered**: Criar E2E completo antes de existir fluxo de negócio;
validar rules sem esquema; declarar testes aprovados quando nenhum foi executado.

## Conclusão da pesquisa

As decisões de desenho estão resolvidas. A verificação de patches publicados e da interseção
de requisitos na implementação é um passo obrigatório definido, não uma decisão de produto
pendente. Falhas nessa verificação devem ser registradas como bloqueios de execução.

## Atualização verificada na implementação (2026-10-16)

O registry confirmou create-vite 9.2.1 e o template React/TypeScript. As versões resolvidas
estão no lockfile e em validation.md. Preservado TypeScript 6 do template, mesmo com major
7 publicado. O Vitest de referência 4.1.6 apresentou o aviso GHSA-82fw-gwwq-j7x9; foi
substituído pelo patch estável 4.1.12, com os mesmos engines/peers pertinentes, corrigindo
os avisos sem trocar de major ou runtime. A decisão de usar família 4 permanece válida.
