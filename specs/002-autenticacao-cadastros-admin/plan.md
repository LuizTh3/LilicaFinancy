# Implementation Plan: Autenticação, solicitações e administração

**Branch**: `develop` (Git real) | **Date**: 2026-10-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-autenticacao-cadastros-admin/spec.md`

O setup identifica a feature como 002-autenticacao-cadastros-admin; não foi criada branch.
Este plano encerra o desenho. Nenhum SDK, conta, endpoint ou regra foi implantado.

**Atualização de implementação (2026-10-16)**: código local gerado; constituição revisada
para 1.1.0. Após verificar engines, o mínimo Node passou a >=24.12.0. Firebase 13.0.0,
Router 7.18.4, jose 6.2.12 e Wrangler 4.151.1 fixados no lockfile, com override de segurança
grpc-js 1.13.6. Gates de infraestrutura/publicação/testes reais continuam pendentes por
orientação do responsável. O restante deste plano registra o desenho original;
[validation.md](validation.md) e [tasks.md](tasks.md) registram o estado efetivo.

## Summary

Complemento autorizado após implementação: encaminhar o solicitante ao WhatsApp
+55 (68) 99973-9841 com mensagem genérica, somente após commit, preservando recibo e
email/outbox. Mudança restrita ao frontend; constituição 1.2.0, FR-035 e contrato UI
atualizados. Não há alteração de schema, Rules, índices ou serviços externos.

Evoluir a SPA existente para Firebase Authentication/Firestore reais, com sessão resolvida
antes de conteúdo protegido, perfil privado por UID e administração restrita por papel manual.
O cadastro público solicita somente os quatro dados, sem criar conta; o responsável cria
contas manualmente e fornece credencial provisória. Datas de assinatura são informativas.

O primeiro acesso exige nova senha e confirmação, gravação protegida de primeiro_login=false,
logout e autenticação nova. Um serviço externo restrito é necessário para provar a operação;
flags livres no frontend ou Rules isoladas não satisfazem esse requisito.

Desenho escolhido: Cloudflare Worker Free, APIs oficiais Auth/Firestore e Brevo transacional
Free com remetente verificado, Turnstile e outbox/cron. A ativação real está condicionada aos
pré-requisitos operacionais abaixo; não é uma promessa de email no-reply já disponível nem
de capacidade gratuita ilimitada. Decisões/fonte: [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6 estrito existente; Node observado 25.8.1 e npm 11.18.0.
Preservar intervalo do projeto ^22.12.0 || >=24.0.0 até verificar todas as novas dependências.

**Primary Dependencies**: React 19/Vite 8 preservados; Firebase JS SDK modular estável,
React Router 7 declarativo (referência 7.18.4); Worker com fetch/Web Crypto e jose compatível;
Wrangler estável e tipos Worker para build/typecheck. Resolver versões/engines/peers reais
antes da instalação e registrar no lockfile, sem migrar majors existentes por rotina.
Não usar Admin SDK no frontend, frameworks SSR ou API genérica de banco.

**Storage**: Firestore Standard real: 8 coleções de perfil, papéis, solicitações, assinaturas,
operações e outbox/orçamentos. Memory cache no navegador; Auth session persistence por aba.
Nenhuma senha/token/secret em documentos ou disco do cliente.

**Testing**: Vitest 4.1.12 para validações e estados puros; integração explícita com SDK
cliente real em A/B/visitante; testes de endpoint e inspeção de navegador após provisionamento.
Sem Firebase Emulator Suite. Não usar chamadas privilegiadas como prova das Rules.

**Target Platform**: Web desktop/móvel (360/1280 pixels); Worker externo Free proposto,
sem Firebase Functions, Blaze ou plano pago. Configuração real será tratada fora do bundle.

**Project Type**: SPA com serviço confiável limitado à feature. Um workspace npm privado
services/trusted-api compartilha package-lock da raiz; não criar repositório ou backend genérico.

**Performance Goals**: Sem metas artificiais de SLA. UI não bloqueia sem feedback; requests
externos têm timeout inicial de 10 s e cron tenta lotes pequenos a cada 5 min, sem prometer
entrega garantida nesse prazo. Medir CPU/cold start antes de ativar Worker Free (10 ms CPU).

**Constraints**: Sem cobrança automática, senha pessoal solicitada ao responsável, secrets
em VITE_, wildcard permissivo, cache persistente de documentos ou exclusão global.
Nova senha transita somente em memória por HTTPS no endpoint restrito e no Auth; desabilitar
captura de body e sanitizar todos os erros. Credencial de serviço ignora Rules, exigindo
validação própria e caminhos fixos.

**Scale/Scope**: 6 histórias, 8 coleções explícitas, uma instância frontend Firebase por página,
25 solicitações por página, 1 cron e até 5 itens por invocação. Limites de tráfego e tentativas
são políticas conservadoras do aplicativo, não capacidades anunciadas de Firebase/Brevo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Antes da pesquisa | Após desenho | Evidência/limite |
| --- | --- | --- | --- |
| Domínio independente | PASS | PASS | Validações puras compartilhadas; SDK isolado |
| Fonte de verdade | PASS | PASS | Perfil e recibo protegidos; outbox é autoridade do envio |
| Isolamento financeiro | PASS | PASS | Admin restrito a cadastros; finanças negadas |
| Firebase/stack existentes | PASS | PASS | Auth/Firestore reais; sem rebootstrap |
| Segurança por Rules e serviço | PASS | PASS | Matriz exata, IAM explícito, sem flag editável |
| Rules completas/publicação distinta | PASS | PASS | Contrato exige arquivos, backup, autorização e teste real |
| Sem emuladores | PASS | PASS | Testes locais puros e SDK real direcionado |
| UX mínima | PASS | PASS | Shell reaproveitado; estados e formulários acessíveis |
| Novas funções fora do escopo original | Exceção explícita registrada | Exceção delimitada | Respostas Q1 B/Q2 A/Q3 A e primeiro acesso obrigatório |
| Serviço externo confiável | Pesquisa necessária | Desenho condicionado | Componente mínimo para FR-028/FR-032; não backend irrestrito |
| Governança/versionamento | Dependência documental | Gate de implementação | Incorporar exceções autorizadas na constituição antes do código correspondente |

A autorização já fornecida permite desenhar a exceção solicitada. Não é necessário pedir
novamente a mesma aprovação para pesquisa/documentação. Porém, a constituição 1.0.0 ainda
não registra essa ampliação: sua revisão deve incluir cadastro público, administração
informativa, notificação e serviço externo estritamente necessário, mais fixtures públicas
identificadas. Não declarar conformidade documental final até essa atualização.

Não há justificativa para dispensar isolamento ou permitir escritas livres. Se a solução
restrita não passar no gate gratuito/segurança, interromper essa parte da implementação
com erro explícito; não ativar pago ou reduzir proteção para concluir a tarefa.

## Project Structure

### Documentation (this feature)

```text
specs/002-autenticacao-cadastros-admin/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api.md
│   ├── ui-session.md
│   ├── security.md
│   └── environment.md
├── checklists/requirements.md
├── tasks.md             # Fase posterior speckit-tasks
└── validation.md        # Resultados reais durante implementação, não nesta fase
```

### Source Code (repository root)

Árvore alvo de implementação, preservando arquivos existentes:

```text
src/
├── app/
│   ├── App.tsx
│   ├── AppShell.tsx
│   ├── router.tsx
│   ├── session/SessionProvider.tsx
│   └── guards/{SessionGate,AdminGate}.tsx
├── features/
│   ├── home/HomePage.tsx
│   ├── auth/{LoginPage,FirstLoginPage}.tsx
│   ├── registration/{RegistrationPage,ReceiptPage}.tsx
│   └── admin/{RequestsPage,RequestDetailPage}.tsx
├── domain/
│   ├── registration.ts
│   ├── subscription.ts
│   ├── session.ts
│   └── *.test.ts
├── infrastructure/
│   ├── firebase/{client,auth,profileRepository,adminRepository}.ts
│   └── trusted-api/{client,contracts}.ts
└── shared/{components,styles}/
services/trusted-api/
├── package.json
├── tsconfig.json
├── wrangler.jsonc
├── .dev.vars.example
└── src/
    ├── index.ts
    ├── registration.ts
    ├── firstLogin.ts
    ├── notifications.ts
    ├── googleAuth.ts
    └── firestoreRest.ts
tests/integration/{access,firstLogin,registration}.integration.test.ts
scripts/cleanup-integration.mts
vitest.integration.config.ts
firestore.rules
firestore.indexes.json
docs/firestore-rules-changes.md
docs/firebase-operations.md
package.json / package-lock.json
README.md / .env / .env.example / .gitignore
```

**Structure Decision**: App/guards lidam com navegação/estado; features com formulários;
domain com CPF, telefone, datas, DTOs e transições puras; infrastructure com Firebase/API.
Worker reutiliza validações puras, sem importar componentes ou SDK navegador. Usar workspace
para um lockfile; tipos/build separados impedem incluir secrets e código servidor no bundle.
Não criar repositories genéricos, camada de pagamento ou SDK visual redundante.

Scripts planejados adicionais: test:integration (opt-in), typecheck:trusted-api,
build:trusted-api (bundle dry-run, sem publicar). npm test inclui somente testes unitários;
a suíte real fica excluída do comando padrão e exige alvo/credenciais explícitos.

## Complexity Tracking

| Exceção/complexidade | Por que necessária | Alternativa simples rejeitada |
| --- | --- | --- |
| Serviço externo restrito | Receber pedido público/email e proteger primeiro_login | Frontend não prova alteração Auth nem protege segredo SMTP |
| Credencial de serviço fora do cliente | Escritas protegidas com validação por código | Permitir cliente alterar flag, outbox ou papéis |
| Outbox com cron/lease | Entrega não depende de navegador e tolera falhas | Só waitUntil ou envio simultâneo sem persistência |
| Cutoff de autenticação | Outra aba não pode usar sessão provisória após flag false | Checar só flag; refresh do token antigo |
| Duas trocas em falha estreita | Evitar liberação por metadata externa sem recibo | Liberar conta com prova falsa de alteração controlada |

A nova senha passa transitoriamente pelo Worker para satisfazer comparação confiável sem
guardar a senha provisória; isso exige transporte HTTPS, segredo operacional e ausência de
body logging. A alternativa mais privada updatePassword no cliente foi analisada, mas não
prova diferença dos valores apenas com metadata Auth; não adotar essa garantia fictícia.

## Sequência de implementação e dependências

1. Atualizar a constituição com exceções já autorizadas e impacto; preservar a base.
2. Implementar validações/contratos puros, configuração e camada Firebase, com flags protegidas.
3. Implementar serviço restrito, contrato de identidade/segredos e prova de troca; gerar
   arquivos completos de Rules/índices e documentação de operação/reversão para revisão.
4. Implementar sessão/guards/login, troca obrigatória e logout; só depois páginas admin.
5. Implementar recepção pública, outbox/Brevo e edição administrativa de datas.
6. Validar unitários/tipos/lint/build, provisionamento autorizado e SDK real A/B/visitante;
   executar navegador e email real pequeno apenas com gates operacionais satisfeitos.

US1 depende de US6 para liberar a sessão; US2 e US4 compartilham API/outbox; US3 depende
de sessão pronta e papel manual; US5 valida todas as permissões. Não dividir primeiro_login
em uma entrega que permita falso estado liberado para depois corrigir a segurança.

## Gates de execução real

| Gate | Estado nesta fase | Ação exigida na implementação |
| --- | --- | --- |
| Desenho e fontes | Resolvido | Seguir contratos e revalidar versões/cotas |
| Constituição atualizada | Pendente documental | Registrar ampliação autorizada antes do código correspondente |
| Worker/Google secrets/IAM | Não provisionados/verificados | Configuração restrita e revisão, sem secret no frontend |
| Free runtime CPU/cold start | Não medido | Medir em serviço real e falhar se exceder plano gratuito |
| Remetente no-reply/conta Brevo | Não configurados/verificados | Validar remetente e enviar aviso fictício ao destino |
| Auth/projeto/Rules ativas | Não inspecionados remotamente | Confirmar alvo, snapshot, publicação e regras reais |
| Contas dedicadas A/B/admin | Não utilizadas | Preparar fora do chat sem senha pessoal |

Nenhum gate pendente acima é tratado como aprovado por documentação. Eles não impedem
preparar tarefas de código, mas impedem declarar implantação/integração concluídas.

## Cobertura dos requisitos

| Requisitos | Artefatos/decisão |
| --- | --- |
| FR-001–FR-007 | environment, ui-session, perfil, geração de sessão e logout com descarte de cache |
| FR-008–FR-011, FR-028 | API pública, Turnstile, validações e transaction/idempotência |
| FR-012–FR-015 | admins, subscriptions, Rules explícitas e datas sem efeito no acesso |
| FR-016–FR-019 | Brevo/outbox/cron com limites e confirmação honesta |
| FR-020–FR-022 | security, índices completos, snapshot e instruções |
| FR-023–FR-026 | quickstart, testes reais direcionados e relatório de bloqueios |
| FR-027, FR-029–FR-034 | endpoint restrito de senha, recibo, cutoff e recuperação falha-fechada |

O plano não modifica a aplicação, .env, .gitignore, .env.example ou regras remotas. Não foram
executados build, teste real, publicação ou envio de email nesta fase.
