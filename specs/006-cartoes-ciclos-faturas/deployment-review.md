# Revisão de entrega006 — implementação local consolidada

Estado em 2026-10-18: implementação local das cinco histórias preparada; somente cartões habilitados por publicação autorizada após avaliação oficial. Gravações de faturas permanecem bloqueadas pelo limite de expressões. A continuidade local após T022 foi solicitada explicitamente pelo responsável: “Então continue, mesmo assim”. Essa decisão permite desenvolver as próximas histórias, sem dispensar validação nem autorizar publicação.

## Conteúdo e impacto

- firestore.rules completo preserva002/004/005 e libera leitura privada e criar/editar/arquivar cartão com recibo recíproco e imutável. Confirmar fatura vazia e ajustar vencimento permanecem negados até resolver a avaliação de expressões. Delete/reativação/itens/compras/pagamentos006 permanecem negados.
- firestore.indexes.json preserva entradas anteriores, acrescenta cartoes(estado,nome), faturas(cartaoId,competencia), faturas(cartaoId,inicio,fechamento), eventos(alvoId,resultVersion) e isenções dos mapas usados somente como conteúdo.
- docs/firestore-rules-006-safe-rollback.rules é fonte completa: conserva leituras privadas e funcionalidades anteriores, nega todas as seis permissões de mutação006. Nenhum documento é excluído. O app mostrará falha de acesso para novos envios durante a reversão.
- Rotas /app/cartoes, /app/cartoes/:cartaoId/faturas e /app/cartoes/:cartaoId/faturas/:competencia oferecem cadastro/arquivo, períodos, prévia sem escrita, confirmação vazia e ajuste/histórico. Persistência depende das Rules/índices006 autorizados. Não há cadastro de compras ou pagamentos.
- Padrão cadastral novo não varre nem reescreve faturas. Arquivar preserva conteúdo, obrigações e ajuste das faturas existentes. Descritor de retomada no sessionStorage não contém formulário; uma intenção pendente bloqueia outra nas telas de cartões/faturas.

## Gates da entrega completa (ver atualização operacional abaixo)

1. Autorizar explicitamente o envio da fonte privada à API oficial de validação Firebase usando a sessão operacional local. A aprovação automática rejeitou essa ação na etapa anterior; a continuidade local não foi tratada como autorização para contornar a rejeição.
2. Compilar/avaliar fonte integral final e reversão; medir expressões nos ramos máximos e verificar controles positivo/negativo. Contagem textual sem cache: criar/editar7, arquivar5, confirmar15, ajustar5; duas confirmações diretas com recibos16 chamadas nas escritas. Contagem planejada não comprova limite de1000 expressões.
3. Sob autorização de acesso remoto, exportar e guardar revisão ativa e inventário de índices; comparar com conteúdo completo local. Ainda não há backup ativo006, comparação remota, inventário de colisões/schema ou estado READY conferido nesta execução.
4. Revisar divergências e impacto; publicação exige autorização própria. Não remover índices remotos por inferência. Não adotar documentos incompatíveis nem migrar snapshots silenciosamente.
5. Depois da publicação autorizada, conferir fonte ativa e índices READY; executar preflight/matriz real em tests/integration/cartoes.integration.test.ts e faturas.integration.test.ts, depois fluxo visual/teclado/celular. Inventariar fixtures por runId antes dos envios; nenhuma limpeza automática.
6. Medir SC-001/SC-008 com cinco participantes. Promover perfis para validadoNoProjeto somente após evidência específica, sem habilitar portas genéricas de séries.

## Evidência disponível

Testes locais, regressões, tipos, lint, build e limitações em validation.md. Os testes com fronteira SDK controlada não executam Rules. Nenhuma autenticação real, fixture006, avaliação oficial aprovada, publicação ou limpeza foi realizada. A tentativa remota anterior no sandbox falhou por rede; a tentativa ampliada foi rejeitada antes de executar. Não houve nova tentativa nesta continuação.

## Publicação autorizada de cartões — 2026-10-18, America/Rio_Branco

O responsável autorizou explicitamente validar e publicar para corrigir a recusa do cadastro. Backup real da revisão ativa, índices e isenções salvo em .integration/006-backup-2026-10-19T02-18-06-440Z; o nome usa UTC (dia19), ainda dia18 no fuso do usuário. Inventário por contagem retornou zero documentos em cartoes/faturas/operacoesCartoes/operacoesFaturas antes da publicação. A base002/004/005 foi comparada com a fonte ativa: diferença externa à006 era somente comentário.

A compilação da fonte integral passou. Avaliação oficial dos sete casos de cartões passou: criar/editar/arquivar, recibos correspondentes e campo proibido. Criação/edição:3 acessos na escrita principal e1 no recibo; arquivamento:2+1. A avaliação de gravações de faturas revelou limite1000 expressões, inclusive no controle positivo; rejeições negativas causadas pelo orçamento NÃO foram aceitas como prova dos invariantes. Não habilitar faturas com esse resultado.

Foi publicado somente o incremento seguro de cartões. Fonte ativa verificada SHA256 8469f7b4bcef603f26ec75180611ee3d56eae437e208b40d2ccb49dff28fb952. As três permissões de gravação de faturas/eventos continuam false em firestore.rules; criação/ajuste também foram desabilitados na interface com aviso de indisponibilidade. Consultas/prévias permanecem sem gravação. Candidato completo preservado no artefato operacional local .integration/006-full-invoices-candidate.rules, sem publicação.

Cinco índices novos foram submetidos; nenhum índice foi removido. Isenções anteriores foram preservadas e novas isenções submetidas. Fonte ativa e índices precisam ser conferidos por verify006.mjs; testes reais de cartões são executados somente após READY. A publicação não habilita compras/pagamentos, não migra snapshots e não exclui documentos. Os gates de faturas e medição assistida permanecem pendentes.
Matriz real de cartões concluída: cartoes006-full-20261018-01, cinco testes aprovados. Todos os14 índices READY; isenções configuradas, com operações assíncronas acompanhadas em006-readiness.json. Perfis de cartões promovidos; faturas não promovidas. Nenhuma limpeza executada.

Verificação final concluída:14/14 índices READY, todas as isenções e operações concluídas, fonte ativa confere; ready=true em006-readiness.json.
