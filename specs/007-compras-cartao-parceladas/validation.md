# Validation: Compras no cartão e parcelas

## Incremento local autorizado em21/10/2026

Escopo ampliado pelo responsável para implementar as dependências007–010 do painel011. Redesenho finito da compra autorizado explicitamente: até12 posições no agregado, histórico em eventos separados. Contrato e harmonizações pendentes em contracts/finite-redesign.md. Não houve dispensa de prova remota ou autorização de publicação/migração.

Implementados contratos locais de entrada/prévia/agregado, normalização e cálculo puro em compras.ts, identidade lógica revisionada em identity.ts, construção/validação/resolução em comprasAggregate.ts e decoder fechado em comprasMapper.ts. O layout novo usa schemaVersion2; não lê schema1 como se fosse agregado finito. Uma compra cancelada conserva valores, mas não oferece parcelas exigíveis. Categoria, total e vencimento não são copiados para cada documento-filho; vencimento continua resolvido pela fatura.

Testes escritos antes do comportamento: compras.test.ts, comprasAggregate.test.ts e comprasMapper.test.ts falharam inicialmente por módulo ausente. Primeira tentativa no sandbox falhou em EPERM no cache temporário; execuções locais autorizadas fora do sandbox resolveram esse impedimento. Depois passaram20 testes novos e a regressão completa85 arquivos/345 testes. Typecheck, lint e build passaram; build conserva aviso anterior de chunk>500kB. Sem novas dependências, deploy ou escrita financeira.

G1 continua pendente: cronograma embutido elimina documentos-filho obrigatórios, mas ainda exige redesenho/prova concreta dos controles, Rules, comandos e histórico. T008–T017 permanecem abertas. T018 tem cobertura local dos cenários principais; T021/T023 estão parcialmente construídas, sem declarar história concluída ou liberar disponibilidade. A validação local não aprova reciprocidade/atomicidade no servidor.

## Baseline — 2026-10-18

- Checkout real develop, alterações documentais007 já existentes preservadas. Node25.8.1/npm11.18.0; package.json/lock mantidos, Firebase13/TypeScript6/React19/Vitest4. Nenhuma atualização de dependências.
- Checklist de requisitos:16/16 concluídos. Ignoradores existentes cobrem node_modules, dist/build, ambientes/credenciais, artefatos.integration e temporários. Projeto privado sem publicação npm, Docker, ESLint, Prettier, Terraform ou Helm detectados; nenhum ignorador sem aplicação criado.
- Faturas006 continuam indisponíveis: availability.ts=false e perfis confirmarFatura/ajustarVencimento=validacaoRemotaPendente. Cartões têm evidência própria006. Nenhum perfil foi promovido nesta preparação.
- G0 exige fonte integral006 com positivos/negativos dentro do orçamento e matriz real após publicação autorizada. G1 exige grafo007 comprovado para múltiplas parcelas e rejeição integral de excessos. G2 exige relógio remoto/controle monotônico protegido. G3 exige fonte/índices ativos, rollback e evidência integrada antes de release.
- Nenhum login, envio de fonte privada, publicação, fixture ou limpeza remota executados no baseline.

## T001 — baseline registrado

Conferidos arquivos atuais, runtime e configuração. Testes novos de preparação007 serão executados antes de alterar harness; resultados registrados abaixo. O baseline não representa teste de compras ou prova de Rules.

## T002–T004 — preparação concluída

- Testes novos executaram primeiro: quatro falhas esperadas (papéis faltantes, grupo desconhecido aceito, manifesto sem caminhos007 e ordem de limpeza), duas verificações negativas já aprovadas. Primeira tentativa nem carregou testes por EPERM no temporário do sandbox; TEMP/TMP em.integration/tmp resolveu sem ampliar permissão.
- Grupo comprasCartao agora seleciona explicitamente suítes compras/compras-gates e exige A/B/ADMIN/PENDING mais visitante. Grupo desconhecido falha antes de conexão; não cai na suíte antiga. Clientes usam a mesma seleção centralizada do preflight/runner.
- Manifesto aceita apenas IDs fechados007, ordinal1–12, revisão segura, parcela com compra inventariada e controle com fatura inventariada. Limpeza apenas ordena alvos existentes, sem descobrir/apagar documentos. Identidade de fixture pode ser harmonizada naT010 antes de gerar dados remotos.
- Suporte local:12 arquivos/18 testes aprovados. Typecheck aprovado após corrigir união de tuplas na seleção de papéis; lint aprovado. Quickstart atualizado. Nenhuma conexão Firebase ou fixture real criada.

## T005 — casos reproduzíveis006

- Gerador local scripts/build-invoice-rules-cases.mjs produz18 casos sintéticos em specs/006-cartoes-ciclos-faturas/rules-evaluation-cases.json: confirmação/recibo, quatro vizinhos, fronteira circular, controle legítimo, distância2 nas duas ordens, coincidência fevereiro, arquivado e ajuste/recibo/limite alterado.
- Gerador não importa credenciais, não conecta nem publica. Casos extraídos das fixtures sintéticas da avaliação operacional006 para manter reprodução fiel; nenhuma saída privada de contas/configuração incorporada.
- A saída anterior guardada em.integration contém falhas de1000 expressões inclusive em positivos e negativos indevidamente recusados por orçamento. Isso é evidência histórica, não nova avaliação do conserto.

## T006 — refatoração local preparada; T007 — bloqueada

- firestore.rules completo conserva três allow false de mutação de faturas/eventos, availability=false e perfis pendentes. Aliases locais substituem releituras dos mesmos campos imutáveis; índice de competência dos vizinhos é calculado uma vez. Nenhum predicado/checagem de vizinho foi removido e não há mudança do modelo persistido.
- T006 permanece aberta: redução do custo executado e aceitação da fonte não foram comprovadas oficialmente. A inspeção local não substitui avaliação de expressões. Revisão concreta e publicação/rollback documentados em specs/006-cartoes-ciclos-faturas/deployment-review.md e docs/firestore-rules-changes.md.
- Avaliação preparada em.integration/evaluate-g0-007.mjs é test-only com fixtures sintéticas; candidata ativa os ramos de fatura apenas na cópia em memória, sem deploy ou dados reais. Tentativa no sandbox retornou fetch failed. A ampliação foi rejeitada pela aprovação automática: upload da fonte privada para API Firebase não tinha autorização específica reconhecida para o payload/destino. Não houve contorno, nova tentativa, publicação ou alteração remota.
- Necessário para continuar: autorização específica para enviar fonte/fixtures à API firebaserules.googleapis.com usando sessão operacional local; depois medir positivos/negativos e prosseguir segundo os gates. Autorização de avaliação não será tratada como autorização de publicação007.

## Verificações finais desta preparação

- Regressão local:68 arquivos/258 testes aprovados, com TEMP/TMP restritos a.integration/tmp. Typecheck de aplicação/integração, lint e build aprovados. Build conserva aviso de chunk>500KiB já presente (aprox.967KiB), sem erro; não houve ampliação de escopo para otimização de bundle.
- T001–T005 concluídas e marcadas. T006 preparada localmente mas aberta até comprovação oficial; T007 bloqueada pela recusa do envio e tarefas dependentes não iniciadas. Nenhuma história de compras foi declarada pronta.
- Arquivos completos de Rules e notas entregues para revisão; nenhuma publicação, novo índice ou fixture financeira remota. extensions.yml ausente: hooks before/after_implement não aplicáveis.

## G0 corrigido durante008 — 2026-10-19

A refatoração final passou68/68 casos oficiais sem1000 expressões; T006 concluída. T007 segue aberta na publicação/SDK, que não ocorreram; T008 e gates007 não foram promovidos. Referências: contracts/security006, candidata completa firestore-faturas.candidate.rules e resumo/hashes em specs/008-pagamentos-ajustes-faturas/g0-evaluation-summary.json. Última regressão:262 testes, tipos, lint e build aprovados.

## G0 publicado e testado durante008 — 2026-10-19

Publicação autorizada e fonte ativa verificada; matriz final SDK cartões/faturas13/13 aprovada, runId faturas006-final-20261019-04. T007 concluída após essa evidência; nenhum gate007 de parcelamento foi promovido. Fonte raiz sincronizada e rollback anterior preservado; UI/perfis006 habilitados. G1 e dependentes007 seguem sem prova própria. Ver validation008 para correção do conflito concorrente e regressão263 testes/tipos/lint/build.

## Redesenho autorizado e avaliação oficial da criação — 21/10/2026

O responsável autorizou o controle junto da fatura/capacidade na compra e, depois, o envio da candidata completa006/007, fixtures e correções restritas à criação finita e confirmação de fatura nova vazia para projects/lilicafinancy:test. Não foi autorizada publicação, migração ou gravação de finanças reais por esta avaliação.

Candidata final de criação:55.157 bytes, SHA25633f025cb49e5c98fb814a1828b83ebe84936d410851aee836474dd27d77e60d8. Suíte SHA256d94fdf48a6bf54a362bf279e843381269921b48dd655fc141cddce568919dda3. Matriz137/137 SUCCESS em12 requisições oficiais, fonte compilada e nenhuma negativa mascarada por estouro de expressões. São66 positivos/71 negativos, incluindo68 regressões006;100/3 em três faturas, máximo monetário seguro, primeiro uso/etiquetas, histórico, versões, reciprocidade, ausência/legado e fatura nova vazia com quatro vizinhos. Resumo sanitizado em finite-rules-evaluation-summary.json; respostas completas em.integration/compras-finite-rules, ignoradas pelo Git. Tentativas anteriores com erros foram preservadas nos relatórios finite-evaluation-*.

O custo conservador100/3 é16 acessos sem desconto de cache:compra6, recibo2, três faturas1 cada, cinco leituras transacionais. Fatura nova vazia é uma confirmação explícita006, nunca uma etapa oculta da compra. Controle zero é provado apenas na criação do documento; conversão de fatura preexistente continua negada.

Para caber em1000 expressões, a compra prova corpo, referências, orçamento e todos os destinos recíprocos; o recibo create-only obrigatório prova perfil, imagem canônica e etiquetas; cada fatura obrigatória prova posição/divisão/calendário/capacidade e seu próprio delta. Igualdade da transição e versões/ponteiros fecham o compromisso inteiro. A validação de calendário foi redistribuída entre primário/recibo: vencimento coincide com original na confirmação, e sua âncora já prova a data gregoriana. Não foram removidas as condições de domínio; cenários separam a escrita responsável e incluem as duas metades positivas.

Este PASS cobre somente criação em faturas existentes compatíveis e confirmação de fatura nova vazia. Não conclui G1 completo, edição/cancelamento007, pagamentos008, publicação, SDK real, índices ou UI. Fonte raiz e índices permanecem d305c3b7a39c8690a5022f04b297c95229178a97da0f1c8667522a9a699b87c8 /7f73422e3df401c243b5d2bf7387ea94203ec8fef9f39cc61d35bb042d69964a. Perfis de produção novos seguem negados. Regressão local425 testes/105 arquivos, typecheck e lint PASS; build PASS com aviso preexistente de tamanho de chunk.

## Bloco1 — prévias de alteração local

Em21/10/2026, `comprasAlteracoes.ts` passou a propor edição e cancelamento da compra inteira. Valida união dos destinos antigos/novos, calendários e controles completos, propriedade, cartão ativo, ausência de histórico de pagamento/revisão e capacidades ainda intocadas. Fatura ausente, fechada, paga ou com ajuste bloqueia o comando; não há conversão de legado ou criação implícita de destino. Cancelamento mantém o cronograma histórico e retira seus valores das faturas. Edição cria nova revisão e aplica diferenças líquidas por destino, preservando os metadados do calendário. Edição sem alteração é recusada sem novo evento.

Trata-se de planejador puro: resultado contém antes/depois e versões dos destinos, mas não é um novo schema persistido ou perfil comprovado. Selagem do comando, histórico imutável, limites do grafo de alteração, transação e Rules de edição/cancelamento continuam pendentes. A prova oficial anterior não se estende a estes comandos. Rastreamento dos quatro blocos em `../011-painel-mensal-projecao/implementation-blocks.md`.
