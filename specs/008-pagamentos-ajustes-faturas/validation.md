# Validation: Pagamentos e ajustes de faturas

## Baseline — 2026-10-19 — T001

- Checkout develop; documentos008 e .specify/feature.json preexistentes preservados. Node25.8.1/npm11.18.0; lock e stack mantidos.
- Checklist requirements.md:16/16 completo. Git confirmado; .gitignore já cobre dependências, build, ambientes, credenciais e .integration. Projeto privado sem publicação npm; nenhum Docker/ESLint/Prettier/Terraform/Helm aplicável detectado, sem ignoradores desnecessários.
- Faturas indisponíveis em availability.ts; perfis de faturas pendentes, sem perfil remoto008. Nenhuma promoção executada.
- G0 permanece falha oficial de expressões006; G1/007 e G2/008 sem prova completa. validation007 registra rejeição automática anterior do upload de fonte privada à API oficial; não houve nova tentativa neste baseline. Retomar avaliação exige autorização específica reconhecida para payload/destino.
- Nenhum login, envio remoto, publicação, fixture financeira ou limpeza nesta etapa. Hooks before_implement ausentes.

## Setup — T002–T004

- Testes novos foram executados antes do suporte: três falhas esperadas demonstraram grupo desconhecido, caminhos008 não aceitos e ordem de limpeza inadequada.
- Grupo liquidacoesFaturas agora exige A/B/ADMIN/PENDING e visitante pelo preflight comum e seleciona somente suítes008. Nenhuma suíte financeira foi implementada ou acionada por este preparo.
- Manifesto aceita somente tipos/IDs008 fechados; controles exigem origens explicitamente inventariadas. Cleanup somente ordena caminhos já declarados, sem descobrir/apagar dados. Fonte de pagamento e ajuste são verificadas por tipo e proprietário no inventário.
- Construtor de fixtures gera13 caminhos determinísticos e valida o plano sem SDK/escrita, incluindo compra esquecida, item de encargo e controles. Teste cobre repetição, separação por runId e escopo inválido. Payload de protocolo futuro não foi inventado.
- Suporte local:15 arquivos/22 testes aprovados; typecheck de app/integração e lint aprovados. TEMP/TMP restritos a.integration. T001–T004 marcadas; tarefas restantes abertas.

## T005 preparada localmente; T006 bloqueada

- invoicePreviousDue em firestore.rules reutiliza aliases dos campos repetidos e conserva as mesmas validações. Fonte completa e notas006/gerais atualizadas; criação/alteração/recibos de faturas continuam negados, availability false e perfis não promovidos.
- Gerador existente006 reproduziu18 casos sintéticos localmente, sem rede. Não houve mudança semântica dos vetores. A redução de expressões não foi medida; T005 permanece aberta porque G0 não está comprovado.
- A avaliação oficial requer envio de fonte privada e fixtures sintéticas à API firebaserules.googleapis.com usando sessão operacional. validation007 documenta rejeição automática anterior por falta de autorização específica para payload/destino. Nenhum novo envio, tentativa de contorno, publicação, login ou alteração de dados reais foi feito.
- Execução interrompida na dependência G0; T007–T076 não iniciadas. Autorizar avaliação não autoriza publicação/migração/limpeza; somente depois da prova positiva/negativa é possível encerrar G0 e seguir o plano.
- extensions.yml ausente; hooks after_implement não aplicáveis. Esta é entrega parcial de preparação, não pagamento008 implementado/habilitado.

## Verificação final local

- Regressão:71 arquivos/262 testes aprovados. Typecheck de app/integração, lint e build aprovados. Build mantém aviso já existente de chunk acima de500KiB (aprox.967KiB), sem erro.
- git diff --check sem erros de whitespace. T001–T004 concluídas; T005 preparada, mas aberta até medir o efeito; T006 e dependentes bloqueadas. Nenhuma regra publicada ou mutação financeira real.

## Continuação autorizada — avaliação oficial G0 — 2026-10-19

- Usuário autorizou explicitamente envio da fonte completa e18 casos sintéticos à API firebaserules.googleapis.com usando sessão operacional, somente para avaliação. A chamada no sandbox falhou por rede; execução ampliada autorizada foi aceita, sem nova rejeição automática. Não houve publicação, migração, fixture real ou limpeza.
- Três avaliações oficiais realizadas: candidata anterior; candidata que evita comparar mês duas vezes quando a data já é ancorada pelo padrão; candidata que trata dias1–28 sem necessidade de clamp. Todas conservaram os mesmos18 casos. Mutações locais continuam false e nenhum perfil foi promovido.
- Resultado final:18 casos,6 FAILURE em operações legítimas(invoiceEmpty, invoiceMaximum, batchControlOctober, batchControlNovember, februaryCoincidence, adjust). Onze casos contêm diagnóstico de1000 expressões, incluindo cinco negativos que não podem ser considerados prova de rejeição semântica. Os seis recibos e a negação adjustChangesBoundary não demonstram sucesso dos comandos completos.
- Fonte aceita para avaliação sem erro de compilação; três avisos de helpers não utilizados. Não confundir aceitação da fonte com viabilidade de execução. Resumo sanitizado com hash local/fixures e resultados em g0-evaluation-summary.json; relatórios detalhados sintéticos ficam em.integration/007-g0-evaluation.json. O runner habilita apenas a cópia em memória para testes; a fonte local permanece bloqueada.
- T005/T006 ficam abertas: a refatoração candidata ainda não resolve o orçamento. As tarefas sequenciais dependentes não começaram, conforme instrução de interromper em falha de tarefa não paralela. O bloqueio atual é técnico, não nova autorização de envio. Essa autorização persiste para avaliação e não inclui publicação.
- G0 exige reduzir custo do comando inteiro, inclusive validação de cartão e calendários vizinhos, com os mesmos positivos/negativos; não remover invariantes para obter resultado verde. Nenhum pagamento008 foi anunciado como pronto.

## G0 — limite de expressões corrigido na candidata — 2026-10-19

- Redistribuída a prova entre F e seu R obrigatório: forma/dias nominais/transição/fronteiras no primário; origem histórica/calendário na criação e data de vencimento no ajuste no recibo. Igualdades/versões recíprocas impedem compromisso parcial. Não foram retiradas as invariantes de datas, propriedade, snapshots, quatro vizinhos, limite mensal ou ciclo; mudou o local onde cada condição é exigida.
- Documentos preexistentes têm identidade/limites protegidos pela própria gravação. Validar novamente todo calendário/descrição do cartão em cada consulta era redundante. A candidata verifica schema/cartão e usa lookup exato e limites imutáveis; detalhes de prova e requisito de auditoria de legado em contracts/security006.
- Matriz ampliada para68 casos: todos SUCCESS, zero diagnóstico de1000 expressões e zero erro de compilação. Inclui os18 originais, séculos2000/2100, bissexto, dias iguais, fim de mês, virada do ano, quatro vizinhos em calendários extremos, datas inválidas, recibo ausente/órfão, schema, propriedade e campos/versões/instantes forjados. Negativos são avaliados na escrita responsável pela condição; a escrita recíproca continua obrigatória no mesmo commit.
- Resumo oficial sanitizado/hashes em g0-evaluation-summary.json. Fonte candidata integral em specs/006-cartoes-ciclos-faturas/firestore-faturas.candidate.rules, reproduzível por node scripts/build-invoice-rules-candidate.mjs; nenhuma rede/deploy no gerador. Hash candidato d305c3b7a39c8690a5022f04b297c95229178a97da0f1c8667522a9a699b87c8.
- Regressão local71 arquivos/262 testes, typecheck/lint/build aprovados. Build mantém aviso anterior de chunk>500KiB. Novos geradores passam lint e sintaxe; diff sem whitespace indevido.
- T005/T006 da008 concluídas quanto à refatoração e avaliação oficial. T006 da007 concluída; T007 da007 conserva publicação/matriz SDK pendentes. G0 de expressões resolvido; fechamento operacional ainda exige preflight de legado, fonte ativa, publicação separadamente autorizada e SDK real. G1/G2 não foram promovidos por essa prova006.
- Fonte raiz mantém allow false de faturas e UI/perfis indisponíveis. Nenhuma publicação, fixture financeira real ou alteração em dados ocorreu. Autorização de avaliação persiste; não equivale a publicar.

## Pedido de testes — 2026-10-19

Regressão local executada novamente:262 testes/71 arquivos, tipos, lint e build aprovados. Preflight remoto somente leitura conferiu fonte ativa8469f7b4bcef603f26ec75180611ee3d56eae437e208b40d2ccb49dff28fb952, índices/isenções prontos e zero faturas/eventos preexistentes. Backup salvo em.integration/faturas-test-backup-2026-10-20T00-06-38-711Z (timestamp UTC;19/10 no fuso do usuário). Candidata confere com hash avaliado e escopo externo a faturas idêntico à fonte ativa.

Publicador restrito preparado localmente: valida projeto, backup/release atual e hash exato; publica somente fonte integral006 já avaliada, sem alterar índices, habilitar compras/pagamentos, migrar ou excluir. Não foi executado neste registro. Publicação depende de resposta ao pedido explícito de autorização; teste SDK de gravação não é marcado aprovado antes disso. Nenhuma nova fixture real criada nesta preparação.

## Publicação e testes reais aprovados — 2026-10-19

- Autorização explícita recebida para publicar a candidata e testar com dados fictícios. Backup de revisão ativa/índices em.integration/faturas-test-backup-2026-10-20T00-06-38-711Z. Conferência prévia:zero faturas/eventos, índices e isenções prontos e nenhuma alteração fora do escopo006 de faturas.
- Publicada fonte SHA256 d305c3b7a39c8690a5022f04b297c95229178a97da0f1c8667522a9a699b87c8. Fonte ativa relida após publicação e novamente ao final; arquivo raiz firestore.rules sincronizado. Nenhum índice foi modificado. Rollback completo atualizado para a fonte anterior exata, preservando cartões e base002/004/005; não executado.
- Primeira matriz real:12/13 aprovados; concorrência de ajuste devolveu semPermissao para a operação perdedora em vez de conflitoVersao. Reprodução isolada confirmou o comportamento. Novo teste unitário falhou antes da correção; adaptador agora consulta recibo/versão confirmados após recusa, devolvendo conflito somente quando leitura autorizada comprova revisão diferente. Mesmo estado ou leitura recusada preserva erro de permissão, sem retry de escrita ou relaxar Rules.
- Cenário corrigido isolado:1 aprovado/12 ignorados, runId faturas006-racefix-20261019-03. Execução final completa:13/13 aprovados em89,22s, runId faturas006-final-20261019-04, suítes cartoes.integration.test.ts e faturas.integration.test.ts.
- Cobertura real:criação/consulta/replay, dois cartões iguais independentes, snapshots, quatro vizinhos, lote circular negado/padrão aceito, sobreposição distância2 nas duas ordens, datas/fevereiro, ajuste/concorrência/arquivo, campos/identidade/calendário imutáveis e A/B/ADMIN/PENDING/visitante com acesso direto negado.
- Regressão263 testes/71 arquivos aprovada; tipos/lint/build aprovados. Após promover flags/perfis006,13 testes locais direcionados aprovados e tipos/lint/build aprovados novamente. Avisos existentes:chunk>500KiB e aviso do futuro carregador nativo do Vite; sem falha.
- UI local de confirmar/ajustar fatura liberada e perfis específicos006 promovidos. Não há compra, item ou pagamento de fatura implementado/habilitado. G0 encerrado na publicação/SDK; G1/G2 e tarefas008 de funcionalidade permanecem pendentes.
- Fixtures fictícias de cada execução permanecem nos manifestos.integrations próprios; não houve limpeza, migração ou uso de finanças pessoais. Relatório operacional em.integration/faturas-final-readiness.json. Código frontend atualizado/construído localmente, sem hospedagem frontend publicada nesta ação. Conferência visual/teclado/celular e medição assistida com cinco participantes permanecem pendentes, sem marcar esses critérios como concluídos.
