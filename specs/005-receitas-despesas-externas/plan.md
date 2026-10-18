# Implementation Plan: Receitas e despesas externas ao cartão

**Branch**: Git real `develop`; contexto lógico Spec Kit `005-receitas-despesas-externas` | **Date**: 2026-10-17 | **Spec**: [spec.md](spec.md)

**Input**: Especificação 005 e clarificação A: data de ocorrência da despesa obrigatória, sugerida como hoje, independente de competência/vencimento. Setup executado; seu BRANCH identifica a feature, sem criar checkout Git.

## Summary

Entregar receitas e despesas avulsas privadas, liquidações parciais, gasto imediato atômico, edição de previsão nunca movimentada, cancelamento e reversão integral de erro. Competência governa planejamento; data efetiva governa caixa. Pagos continuam no total de compromissos; reversão de erro neutraliza o fato original sem fabricar reembolso.

Persistir origens em lancamentosExternos e eventos/recibos imutáveis em operacoesExternas. Cada operação financeira carrega no próprio recibo seu fato de pagamento/recebimento, separado da origem; não duplicar em outra coleção. A origem mantém projeção derivada protegida, revisão e último evento, validados reciprocamente nas Rules. Marcador determinístico por original impede duas reversões. Primeiro uso fica em metadado imutável da categoria/conta, com adaptação versionada dos cadastros. Criação simples usa perfil14; criação de receita/despesa substituta usa perfil15; gasto imediato substituto usa perfil18, sem depender de cache; ver [contrato de segurança](contracts/security.md).

Resultado semAlteracao é exceção explícita de FR-016: leitura do estado/versão atuais, sem escrita, recibo ou reserva da chave. Cliente encerra a intenção e descarta descritor; repetição pode conflitar após mudança de versão, enquanto toda mutação com efeito confirmado mantém recuperação idempotente pelo recibo.

Consultas mensais usam adaptador REST de leitura restrito com Firebase ID token e readTime comum para páginas/dependências, sem backend ou credencial administrativa. Mutações continuam no SDK modular via runTransaction. Restabelecer primeiro a integridade do arquivo local firestore.rules, encontrado com blocos duplicados dentro de regex, antes de acrescentar permissões financeiras. Nenhuma publicação faz parte deste comando.

## Technical Context

**Language/Version**: TypeScript ~6.0.2 strict, Node >=24.12.0, npm 11.18.0; preservar package-lock.

**Primary Dependencies**: Firebase 13.0.0 modular, React/ReactDOM ^19.2.8, react-router 7.18.4, Vite ^8.3.0, Vitest 4.1.12; fetch nativo para snapshot REST de leitura. Nenhuma nova dependência, servidor ou serviço. Documentação atual consultada com Context7 e referências oficiais.

**Storage**: Firestore Standard sob users/{uid}. Novas coleções lancamentosExternos, operacoesExternas e reversoesExternas; metadado usoFinanceiro em categorias/contas schemaVersion=2. Cache financeiro só em memória; descritor mínimo de intenção em sessionStorage, sem conteúdo financeiro ou token.

**Testing**: Vitest para domínio/mapeadores/contratos/estados; cliente Auth real no grupo externos (nome literal do grupo: `externos`), A/B/ADMIN/PENDING e visitante; manifesto de fixtures por execução, sem emuladores. Provas executáveis e testes remotos são entregas da implementação, não resultados deste plano.

**Target Platform**: Web responsiva desktop/celular, pt-BR; fuso validado do perfil, atualmente America/Rio_Branco. Não generalizar offsets fixos a outros fusos sem nova estratégia nas Rules.

**Project Type**: Aplicação web existente, módulos por caso de uso; trusted-api não recebe finanças.

**Performance Goals**: Páginas de até 50, no máximo 8 dependências por batchGet (até 8 autorizações de leitura, sem cache); interface indica carregamento/envio antes de aguardar rede. Criação assistida <=2 minutos conforme SC-001. Sem SLA remoto inventado; registrar tempo/rede nas verificações.

**Constraints**: Centavos inteiros seguros; datas 1900–9999; descrição <=120, observação/motivo <=1000, até 5 etiquetas. Documento <=32 KiB, comando <=1 MiB, conteúdo canônico <=16 KiB; até 4 escritas no pior caso, 8 acessos de Rules por escrita e 18 por comando incluindo reserva de autorização das leituras transacionais; <=1000 expressões a conferir no artefato final. Rejeição integral antes do envio se exceder tetos. Snapshot expira no máximo em 50 minutos e nunca tenta PITR pago.

**Scale/Scope**: Seis histórias, 28 FR, oito SC. Avulsos, três coleções financeiras e evolução restrita de dois cadastros. Sem recorrência/séries, cartão, adiantamento, crédito, renegociação, reembolso real, saldo bancário ou compartilhamento. Paginação por mês, nunca listener de histórico inteiro.

## Constitution Check

Constituição 1.2.0 lida. Gates avaliados antes da pesquisa e reavaliados após o desenho.

| Gate | Antes da pesquisa | Após desenho |
| --- | --- | --- |
| I — domínio independente | Passa: reutilizar 003 | Passa: comandos e projeções puros; SDK/REST só em infrastructure. |
| II — fonte de verdade | Passa: fatos separados | Passa: fatos são autoridade; projeção protegida na origem tem indução e reconstrução; recibo/fato único evita duplicação. |
| III — isolamento | Passa: sessão privada | Passa: UID fixo em portas e URLs, Rules próprias; REST usa ID token sujeito às Rules, sem OAuth de serviço. |
| IV — simplicidade/cota gratuita | Passa: stack existente | Passa no desenho: 18 acessos no máximo, sem cache presumido; readTime recente, sem PITR/Blaze/backend. |
| V — segurança | Atenção: arquivo local de Rules corrompido | Correção integral é primeira etapa obrigatória, antes da habilitação; contrato de segurança e negações definidos. Não há prova de publicação atual. |
| Dinheiro/datas e dupla contagem | Passa | Passa: centavos, quatro campos temporais distintos e neutralização de erro no período original. |
| Versionamento/cadastros | Passa com evolução coordenada | Passa: schema 2 explícito, controle de uso permanente, legado preservado; nenhuma alteração financeira no login. |
| Testes reais sem emulador | Passa | Passa: guia exige preflight, quatro papéis, projeto declarado e regras publicadas sob autorização vigente. |

Nenhuma exceção constitucional solicitada. O desenho resolve os bloqueios conceituais; compilar/verificar as Rules completas, confirmar orçamento e demonstrar negações no ambiente autorizado são gates da implementação. Falha em qualquer gate mantém o consumidor desabilitado; não permite afrouxar regras.

## Project Structure

### Documentation (this feature)

```text
specs/005-receitas-despesas-externas/
  spec.md
  plan.md
  research.md
  data-model.md
  quickstart.md
  contracts/
    commands.md
    security.md
    queries-ui.md
  checklists/requirements.md
```

tasks.md será gerado somente por speckit-tasks.

### Source Code (repository root)

```text
src/domain/finance/
  externos.ts, externos.test.ts                    # comandos/transições puros novos
  externosProjection.ts, externosProjection.test.ts # projeção específica sem reembolso implícito
  contracts/externos.ts                            # portas e uniões novas
  settlement.ts, projections.ts                    # integração explícita, preservar casos genéricos
  cadastros.ts, contracts/cadastros.ts              # schema 2 e metadados protegidos
  operationBudget.ts                              # perfil remoto específico, sem liberar séries
src/infrastructure/firebase/
  externosRepository.ts, externosMapper.ts         # transações e mapeamento fechado
  externosSnapshotReader.ts                       # REST runQuery/batchGet limitado e readTime
  cadastrosMapper.ts, cadastrosRepository.ts        # preservar usoFinanceiro no CRUD
src/features/externos/
  ExternosPage.tsx, ExternoDetailPage.tsx
  ExternoForm.tsx, LiquidacaoForm.tsx
  CorrecaoDialog.tsx, externoState.ts
src/app/router.tsx, src/app/AppShell.tsx
src/app/session/SessionProvider.tsx, useSession.ts
firestore.rules, firestore.indexes.json
docs/firestore-rules-changes.md
tests/integration/externos.integration.test.ts
tests/integration/support/{environment,preflight,clients,manifest,cleanup}.ts
scripts/cleanup-integration.mts
vitest.integration.config.ts
```

**Structure Decision**: Adaptadores específicos ligados à sessão, não CRUD financeiro genérico. Traduzir origens/fatos físicos para os DTOs puros da 003 sem expor SDK. Leitor REST é exclusivo de consultas com snapshot, não um mecanismo de escrita ou API pública nova.

## Design and Delivery Sequence

1. Restaurar arquivo completo de Rules a partir dos contratos vigentes e permissões válidas; guardar versão anterior, registrar corrupção e provar compilação sem emulador. Não publicar nesta etapa de planejamento.
2. Implementar contratos puros, data de ocorrência obrigatória, transições, dinheiro, erro versus reembolso, canonicalização/idempotência e mapeamentos. Não alterar semântica genérica de cartões/reembolsos para acomodar avulsos.
3. Evoluir cadastros para schema 2 com usoFinanceiro e ponte dos controles legados; adaptar CRUD/recibos e testar primeiro uso simultâneo com edição/arquivamento. A migração é incremental e explícita na primeira operação financeira, não no login.
4. Entregar Rules completas e índices com prova dos comandos e budgets descritos; implementar transações sem leituras cadastrais dentro do callback para os casos de maior custo. Habilitar somente perfil remoto da 005, mantendo séries da 003 negadas.
5. Implementar snapshot de leitura, consultas, estados de intenção e rotas acessíveis; integrar timezone validado e descarte por UID/geração.
6. Estender harness externos (grupo `externos`), manifestos e matriz pequena remota; executar verificações locais e cenários manuais. Publicação segue autorização vigente e deve ser relatada separadamente.

## Post-design Validation

Pesquisa em [research.md](research.md) resolve orçamento com cinco etiquetas, simultaneidade, primeiro uso, idempotência, reversão única, completude entre páginas e migração. Modelo em [data-model.md](data-model.md), comandos em [contracts/commands.md](contracts/commands.md), proteção em [contracts/security.md](contracts/security.md), leitura/interface em [contracts/queries-ui.md](contracts/queries-ui.md), validação em [quickstart.md](quickstart.md).

Nenhuma decisão de produto pendente ou marcador de esclarecimento. A constatação de Rules locais inválidas é tratada como trabalho obrigatório da implementação; nenhum acesso remoto foi usado para inferir o estado das Rules ativas. Entrega deste comando termina no desenho da fase 1.

## Complexity Tracking

Sem violações constitucionais. Projeção protegida, evento com recibo/fato e metadado de primeiro uso têm finalidade delimitada e prova própria. Separar fisicamente recibo e fato, duplicar controles de uso e acrescentar um contador global aumentaria validações acima do teto. Snapshot REST recente evita esse contador, mantendo as mesmas Rules de autorização.
