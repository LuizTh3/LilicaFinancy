# Implementation Plan: Núcleo financeiro compartilhado

**Branch**: Git real `develop`; contexto lógico Spec Kit `003-nucleo-financeiro-compartilhado` | **Date**: 2026-10-17 | **Spec**: [spec.md](spec.md)

**Input**: `specs/003-nucleo-financeiro-compartilhado/spec.md`, com as duas clarificações de 2026-10-17. Setup executado com `.specify/scripts/powershell/setup-plan.ps1 -Json`; nenhum hook cria branch. O campo BRANCH retornado pelo script é contexto da feature, não comprovação de checkout Git.

## Summary

Entregar base financeira reutilizável em funções TypeScript puras, antes das telas: valores BRL em centavos seguros, entrada/formatação pt-BR exata até o máximo, calendário civil/fuso explícito, parcelas e migração, sugestão de fatura, pendências e projeções sem duplicação. Documentar o modelo privado e portas por caso de uso, com testes locais de idempotência, conflito e atomicidade usando doubles finitos.

As decisões confirmadas são preservadas: estorno reduz consumo no mês de dataEfeito; receitas/compromissos externos podem planejar mês diferente do vencimento. Cartão permanece na competência da fatura. Compra é a origem; parcelas e pagamentos não são consumo adicional.

Persistência financeira não é habilitada nesta feature. Pesquisa provou que um desenho ingênuo de12 parcelas/12 faturas novas excede o orçamento de acesso das Rules; outros comandos também precisam de prova remota de agregação e integridade. Núcleo e contratos têm entrega local verificável; futuros adaptadores precisam de feature consumidora e gates próprios, conforme FR-002/031/033. Não criar backend financeiro nem ampliar a exceção da feature002.

## Technical Context

**Language/Version**: TypeScript ~6.0.2, strict, target ES2023; Node declarado >=24.12.0, inspecionado25.8.1; npm11.18.0. Preservar lockfile.

**Primary Dependencies**: Nenhuma dependência de runtime nova para domínio. Primitivos ECMAScript, BigInt somente interno e Intl apenas na conversão instante→data local. Vitest4.1.12 existente para testes; React/ReactDOM19.2.8, Vite8.3.0 e Firebase13.0.0 são contexto do app, vedados nos imports do núcleo.

**Storage**: Sem novas gravações/coleções nesta feature. Modelo lógico futuro sob users/{uid}, com instantes convertidos por adaptador. Rules/índices e serviço trusted-api existentes preservados. Doubles exclusivamente em testes, sem store de produção.

**Testing**: Vitest em Node, casos tabulados e invariantes determinísticas; testes adjacentes e gate de imports transitivos. Scripts existentes typecheck/lint/test/build. Sem emuladores ou integração real nesta entrega. Guia em [quickstart.md](quickstart.md).

**Target Platform**: Aplicação web existente em navegadores com ES2023/BigInt/Intl e testes locais Node; domínio sem APIs de DOM, Node-only ou SDK. Sem novo aplicativo.

**Project Type**: Aplicação web com núcleo de domínio interno, no projeto único existente.

**Performance Goals**: Geração/validação pura de cronograma12 em alvo informativo p95<50ms após aquecimento/1000 execuções no Node local; complexidade O(N) para cronograma e O(registros fornecidos) para reconciliação, sem I/O. Registrar ambiente e resultado; não prometer SLA remoto.

**Constraints**: Centavos 0..MAX_SAFE_INTEGER, fatos positivos; datas1900..9999; N<=12, ocorrências por comando<=12, mutações candidatas<=32, páginas<=50, até5 etiquetas. Tetos candidatos: 1MiB/comando,32KiB/documento,8 acessos por operação e18 por atomicidade nas Rules,1000 expressões. Qualquer violação/ausência de perfil operacional gera rejeição integral; sem séries multietapas. Segurança real continua nas Rules, não no double.

**Scale/Scope**: Cinco histórias e33 requisitos. Tipos/contratos de15 entidades lógicas documentadas; apenas módulos e contratos consumidos pelos cenários têm implementação nesta feature. Sem telas financeiras, CRUD completo, novos endpoints, jobs, listeners históricos ou cadastros sem funcionalidade. Dados de migração incompletos permanecem identificados.

## Constitution Check

Gates avaliados antes da pesquisa e novamente após o desenho, conforme constituição1.2.0.

| Gate | Antes da pesquisa | Após desenho |
| --- | --- | --- |
| I — domínio sem React/Firebase | Passa: escopo de funções puras | Passa: contratos comuns e gate de imports; sem I/O no núcleo. |
| II — fonte de verdade/rastreabilidade | Passa: origem, parcelas e fatos separados | Passa: sem total editável; estorno raiz e créditos filhos têm papéis distintos; snapshots completos. |
| III — isolamento por UID | Passa: nenhum acesso novo | Passa: referências tipadas privadas; portas vinculadas a UID; finanças continuam negadas. Double não é evidência de Rules. |
| IV — simplicidade/cotas gratuitas | Passa: sem novos serviços | Passa: dependências existentes; prova de inviabilidade do desenho ingênuo registrada; nenhuma habilitação implícita. |
| V — segurança e Rules | Passa: Rules preservadas | Passa no escopo local: nenhum adaptador remoto; gates documentados para liberação futura, sem afirmar validação remota inexistente. |
| Dinheiro/calendário/reconciliação | Passa: requisitos definidos | Passa: algoritmos inteiros, âncora e fuso explícitos; matriz de testes; wrapper legado de assinatura. |
| Incrementalidade e escopo | Passa: FR-002 | Passa: sem CRUD/entidades persistidas sem caso de uso, sem framework genérico. |
| Testes/entrega honesta | Passa: unitários permitidos | Passa: guia distingue testes planejados de executados; sem emuladores, publicação ou dados reais. |

Nenhuma violação constitucional foi aceita. A habilitação de adaptadores financeiros tem gate fechado até prova própria; não é uma dispensa de segurança ou pendência que autoriza implementação remota neste plano. Se uma tarefa futura tentar habilitá-los sem prova, deve falhar, não expandir este escopo.

## Project Structure

### Documentation (this feature)

```text
specs/003-nucleo-financeiro-compartilhado/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── domain.md
│   └── repositories.md
└── checklists/
    └── requirements.md
```

`tasks.md` será produzido apenas por `$speckit-tasks`, não por este comando.

### Source Code (repository root)

Layout proposto para implementação; os arquivos novos abaixo ainda não foram criados:

```text
src/domain/
├── subscription.ts                 # wrapper compatível do calendário compartilhado
├── subscription.test.ts            # não regressão existente
├── README.md                       # atualizar fronteiras e módulos reais
└── finance/
    ├── errors.ts                   # Resultado e falhas discriminadas
    ├── money.ts / money.test.ts
    ├── calendar.ts / calendar.test.ts
    ├── installments.ts / installments.test.ts
    ├── invoiceCalendar.ts / invoiceCalendar.test.ts
    ├── settlement.ts / settlement.test.ts
    ├── projections.ts / projections.test.ts
    ├── recurrence.ts / recurrence.test.ts
    ├── identity.ts / identity.test.ts
    ├── operationBudget.ts / operationBudget.test.ts
    ├── contracts/
    │   ├── commands.ts             # somente portas/tipos usados nos cenários
    │   ├── series.contract.test.ts
    │   ├── settlement.contract.test.ts
    │   └── recurrence.contract.test.ts
    └── architecture.test.ts        # importações transitivas, excluindo arquivos de teste
```

**Structure Decision**: estender `src/domain` existente. Testes de contrato mantêm doubles específicos em arquivos/auxiliares de teste, sem camada de banco em memória reutilizável. Entidades apenas futuras permanecem documentadas até ter consumidor; não gerar um arquivo/repositório por linha da tabela do modelo. Sem alterar serviços, rotas ou infraestrutura Firebase nesta feature.

## Phase 0 — Pesquisa concluída

[research.md](research.md) registra oito decisões com justificativa, alternativas e fontes: contexto existente; precisão; calendário; reconciliação; limites; integridade/concorrência; IDs/idempotência/schema; testes e observabilidade. Context7 usado para Firebase/Vitest, confrontado com fontes oficiais Standard; algoritmos nativos consultados em referências ECMAScript/Intl.

Achado central: criação de12 parcelas com12 novas faturas tem26 escritas. Sem presumir cache, só uma verificação de perfil por escrita gera26 acessos e excede18 internos/20 oficiais. N<=8 nessa fórmula ainda não prova viabilidade. Recontar histórico ilimitado de pagamentos também não é solução remota dentro dos limites. Decisão: nenhum perfil operacional financeiro habilitado nesta feature; contratos e regras locais continuam úteis e testáveis.

Não existem incógnitas técnicas sem decisão para o escopo local. Prova concreta para um adaptador remoto é trabalho de uma futura funcionalidade, não capacidade presumida.

## Phase 1 — Design e contratos concluídos

- [data-model.md](data-model.md): campos, uniões novo/migrado, referências, estados, fatos e guards. Valor original na compra/obrigação; cronograma nas parcelas; caixa nos fatos; recibo não é agregado financeiro.
- [contracts/domain.md](contracts/domain.md): construtores de valores, operações puras e cenários verificáveis, completude e orçamento sem perfil permissivo padrão.
- [contracts/repositories.md](contracts/repositories.md): capacidades específicas, envelope, erros, confirmação, deduplicação e gates remotos fechados.
- [quickstart.md](quickstart.md): preparação, filtros Vitest, reconciliação, falhas, não regressão e limites da evidência.

Correções da análise U1/U2: receita e obrigação externa avulsa têm estimado próprio por ocorrência, capturado do molde e confirmado explicitamente sem alterar outras ocorrências ou caixa. A confirmação pura é consumida pela porta específica/double da US5, sem adaptador remoto. A fatura é autoridade única do vencimento da parcela de cartão; cópia divergente é rejeitada na criação, snapshot e prévia de edição. Cobertura em T016/T020/T022/T025/T028 e T042/T044–T047, mantendo os 54 IDs de tarefas.

Sequência proposta para decomposição posterior: (1) valores/erros e fronteira; (2) calendário e wrapper legado; (3) parcelas/fatura; (4) derivação de liquidações/projeções/recorrência; (5) identidades/orçamento e contratos consumidos; (6) testes de falhas e validações gerais. Dependências são do domínio para os valores base, nunca do domínio para adaptadores. A geração detalhada de tarefas pertence à próxima fase.

### Matriz de rastreabilidade

| Requisitos | Artefatos/componentes | Evidência planejada |
| --- | --- | --- |
| FR-001–002 | Estrutura, errors/arquitetura, fronteira de contratos | Gate de imports; nenhuma gravação/entidade persistida por antecipação. |
| FR-003–007 | money, settlement; contratos de ajuste | MAX/roundtrip, soma exata, negativo bloqueado, crédito/inversão tipados. |
| FR-008–013 | calendar, installments, invoiceCalendar | Âncora31, séculos, migração5/10, igualdade no fechamento. |
| FR-014–021 | settlement, projections, recurrence | Três estados independentes; consumo/planejamento/caixa reconciliados, clarificações preservadas. |
| FR-022–027 | identity, contratos de comandos e doubles | Mesmo recibo, payload distinto, versão concorrente, resposta perdida e schema incompatível. |
| FR-028–033 | operationBudget, contratos de repositórios | Fronteiras/atomicidade; rejeição por perfil não habilitado; finanças permanecem negadas. |

### Aceite da implementação futura

Testes locais de SC-001–008, typecheck/lint/build e não regressão da assinatura/sessão devem passar. Test double deve distinguir falha antes do commit e resposta perdida depois dele. Teste de arquitetura deve examinar imports transitivos (não só buscar duas strings), sem permitir caminho indireto à infraestrutura. Não confundir aprovação de testes locais com persistência/isolamento remoto.

Observabilidade do núcleo é retorno de erro discriminado e rastreabilidade por IDs em dados internos; sem logging de payload/UID/descrição. Medição de desempenho é local/informativa. Não haverá teste de integração ou deploy nesta implementação sem mudança explícita do escopo de adaptadores.

## Complexity Tracking

Sem violações justificadas ou frameworks novos. BigInt fica interno e não altera modelo de persistência. Guards são metadados de edição em alvos existentes, não totais duplicados. Doubles finitos existem somente para validar contratos; não são implementação de persistência genérica.

## Estado desta execução

Fases0 e1 concluídas em documentação. Artefatos gerados e verificados quanto a links locais, consistência e marcadores; nenhum código financeiro, teste novo, migração, Rule, índice ou deploy foi executado. Nenhum pre/post-hook: `.specify/extensions.yml` ausente. Próximo comando: `$speckit-tasks`.
