# Validation: Compras no cartão e parcelas

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
