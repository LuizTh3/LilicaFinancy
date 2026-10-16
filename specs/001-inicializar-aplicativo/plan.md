# Implementation Plan: Inicialização do aplicativo financeiro

**Branch**: `develop` (Git real) | **Date**: 2026-10-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-inicializar-aplicativo/spec.md`

O setup do Spec Kit retorna `001-inicializar-aplicativo` como identificador de feature
no campo BRANCH. O Git permanece em `develop`; este plano não cria nem troca branches.

## Summary

Preparar uma SPA React, Vite e TypeScript estrito a partir do template oficial `react-ts`,
com instalação npm reproduzível, lint e runner unitário leve. A primeira tela terá shell
responsivo acessível, navegação Início e aviso de configuração Firebase na próxima etapa.
Não haverá autenticação, domínio financeiro, persistência ou inicialização do SDK Firebase.

A implementação começa por nova inspeção do repositório e compatibilidade de dependências.
O scaffold será gerado em pasta temporária nova e integrado por revisão de arquivos para
preservar a estrutura Spec Kit. O gerenciador escolhido é npm; o lockfile é `package-lock.json`.
As decisões e fontes estão em [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript estrito; família 6 do template oficial consultado como
referência, com versão estável publicada e compatibilidade verificadas na implementação.

**Primary Dependencies**: React/React DOM 19, Vite 8 e plugin React compatível como conjunto
de referência; Vitest 4.x; linter do template estável (Oxlint 1 no template oficial de `main`
consultado, configuração JSON). Sem Firebase SDK, router, UI kit ou estado global.
Patches e eventual diferença entre template publicado e `main` serão registrados antes
na seleção de dependências, sem atualizações indiscriminadas.

**Runtime/Package Manager**: Node observado 25.8.1; npm observado 11.18.0. Piso de projeto
22.12.0, com intervalo inicial `^22.12.0 || >=24.0.0`, a restringir se exigido pelo conjunto
selecionado. Registrar `engines.node`, `packageManager` concreto e versões no README.
Não alterar runtime automaticamente nem ignorar conflitos de engines/peers.

**Storage**: Nenhum dado de aplicação persistido. Apenas configuração local ignorada,
exemplo versionável e arquivos usuais de build/lockfile.

**Testing**: Vitest em ambiente `node`, `vitest run --passWithNoTests`; ausência de casos
informada explicitamente. Validação manual do shell, teclado, rede e estados de ambiente.
Nenhuma suíte financeira ou de integração nesta etapa.

**Target Platform**: Navegadores modernos desktop e móvel; desenvolvimento local no
Windows/PowerShell disponível. Inspeção responsiva nas larguras 360 e 1280 pixels.

**Project Type**: Aplicação web frontend única, SPA estática; sem backend e sem deploy.

**Performance Goals**: Shell utilizável sem chamadas externas nem bloqueio por configuração;
nenhuma meta de latência ou volume de produção é introduzida nesta fundação. Requisitos
mensuráveis são os SC-001–SC-007 da especificação.

**Constraints**: Quatro campos de ambiente vazios, sem integração mesmo se preenchidos;
sem serviços pagos, emuladores, regras financeiras, número fictício de saldo, publicação,
commit ou inicialização Git. Preservar conteúdo anterior.

**Scale/Scope**: Uma tela inicial, dois links funcionais (salto para conteúdo e Início),
cinco áreas de responsabilidade, seis comandos públicos e nenhum registro financeiro.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Antes da pesquisa | Após o desenho | Evidência no plano |
| --- | --- | --- | --- |
| Domínio independente de React/Firebase | PASS | PASS | `src/domain/` reservado; nenhum cálculo na interface |
| Fonte de verdade e rastreabilidade | PASS | PASS | Nenhum total ou lançamento fictício é introduzido |
| Isolamento entre usuários | PASS por escopo | PASS por escopo | Nenhum usuário, SDK ou dado; não alegar isolamento testado |
| Stack simples e recursos gratuitos | PASS | PASS | SPA, CSS, ferramentas locais; sem backend ou serviço pago |
| Segurança como parte da entrega | PASS | PASS | Ambiente ignorado, exemplo vazio, nenhuma regra permissiva |
| Contrato de rules/índices | PASS por escopo | PASS por escopo | Não há acesso ao Firestore nem mudança de esquema |
| Testes sem emuladores | PASS | PASS | Runner local puro e inspeção manual; sem Emulator Suite |
| UX mínima e acessível | PASS | PASS | Uma tela, sem ornamentos, foco e navegação por teclado |
| Especificar antes de implementar | PASS | PASS | Spec/clarify concluídos; código fica para fase posterior |
| Honestidade de validação e governança | PASS | PASS | Evidências futuras separadas da revisão documental |

Não há exceção constitucional. O recorte preparatório está explicitamente autorizado no
pedido e na especificação; a feature seguinte deverá tratar autenticação, isolamento e
primeiro esquema com rules. Não declarar esses requisitos validados por esta fundação.

## Project Structure

### Documentation (this feature)

```text
specs/001-inicializar-aplicativo/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── environment.md
│   ├── commands.md
│   └── ui.md
├── checklists/requirements.md
├── validation.md        # Criado na implementação com resultados reais
└── tasks.md             # Criado por speckit-tasks; não por este plano
```

### Source Code (repository root)

Árvore alvo, a criar somente na implementação:

```text
src/
├── main.tsx
├── vite-env.d.ts
├── app/
│   ├── App.tsx
│   └── AppShell.tsx
├── features/
│   └── home/HomePage.tsx
├── domain/README.md
├── infrastructure/README.md
└── shared/
    ├── components/SkipLink.tsx
    └── styles/global.css
index.html
package.json
package-lock.json
vite.config.ts
vitest.config.ts
.oxlintrc.json            # Ou configuração do linter presente no template publicado
tsconfig.json
tsconfig.app.json
tsconfig.node.json
.env                     # Local e ignorado
.env.example
.gitignore
README.md
```

**Structure Decision**: Projeto único na raiz. `app` compõe shell e navegação;
`features/home` apresenta o estado inicial; `shared` contém apenas o link de salto reutilizável
e estilos comuns. `domain` documenta funções puras futuras, sem importar React ou SDKs;
`infrastructure` documenta integrações futuras, sem inicializar ou simular Firebase.
Os READMEs preservam diretórios vazios sem criar código especulativo. Sem barrel files,
injeção de dependência, repositories vazios ou camada de configuração sem consumidor.

O `vitest.config.ts` será mínimo, com ambiente Node, e evita carregar plugin de React
em testes futuros de domínio; não duplicará a configuração de build nem criará suites.
A checagem de tipos deve incluir também configurações de ferramentas. Remover somente
assets e demonstrações gerados pelo template que não forem usados pelo shell.

## Complexity Tracking

Nenhuma violação constitucional ou complexidade adicional que exija exceção.

## Sequência de execução futura

1. Inspecionar diretório, Git e ambiente; verificar versões estáveis e seus engines/peers;
   registrar decisões concretas. Não atualizar dependências se um app tiver surgido.
2. Gerar template em diretório novo, revisar e integrar arquivos preservando o repositório.
3. Configurar tipos estritos, lint, Vitest e seis scripts do contrato; gerar lockfile npm.
4. Criar shell e home, estilos responsivos, landmarks e navegação; omitir destinos futuros.
5. Preparar ambiente vazio e regras de exclusão; verificar rastreamento e exceção do exemplo.
6. Documentar README; executar quickstart e registrar evidências reais em `validation.md`.

## Rastreabilidade e validação

| Requisitos | Decisão/contrato | Evidência de aceitação futura |
| --- | --- | --- |
| FR-001, FR-016 | Pesquisa 1–4 e contrato de comandos | Inventário, versões, engines, peers, lockfile e instalação limpa |
| FR-002, FR-008, FR-009 | `contracts/commands.md` | Seis comandos e runner sem testes descrito corretamente |
| FR-003–FR-006 | `contracts/ui.md` | Home, teclado, refresh, duas larguras, nenhuma chamada Firebase |
| FR-007 | Árvore e limites de responsabilidade | Revisão de imports e ausência de lógica financeira/SDK |
| FR-010–FR-013, FR-015 | `contracts/environment.md` | Quatro estados de ambiente, ignore e rastreamento |
| FR-014, FR-017 | `quickstart.md` e README futuro | Execução por instruções e resultados com limitações |
| FR-018 | Gates e limites de escopo | Sem commit, deploy, init Git ou emuladores |

A revisão de planejamento não equivale a build, testes ou validação de implementação.
