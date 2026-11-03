# Validação real —25/10/2026

**Resultado integral: NÃO APROVADO.** Testes reais executados com aprovações parciais e um bloqueio reproduzido nas Rules009. Nenhuma publicação, migração, limpeza ou gravação financeira foi realizada.

| Verificação | Resultado | Alcance |
| --- | --- | --- |
| Regressão local | PASS485/485,121 arquivos | Domínio, contratos, mocks e apresentação estática |
| SDK/REST real, projeto lilicafinancy | PASS3/3 | Proprietário lê duas fixtures existentes; B/admin/pendente/visitante recebem oito negativas; snapshot comum, releitura, consulta vazia limitada e invalidação |
| Rules ativas versus arquivo local | PASS | SHA256d305c3b7a39c8690a5022f04b297c95229178a97da0f1c8667522a9a699b87c8; conferido pela API oficial de release/ruleset, somente leitura |
| Candidata006/007 | PASS137/137 em12 requisições | Compilada; criação finita e fatura nova vazia. Não prova publicação ou SDK de gravação007 |
| Candidata009, smoke central | ERROR:2/4 | create5of10Series e createOneSeries falharam pelo teto de1000 expressões. createOneReceipt e replaceReceipt passaram isoladamente |
| Tipos/lint/build | PASS | Build conserva aviso anterior de chunk maior que500KiB |
| Fluxos completos007–011 | PENDENTES | Persistência/integração parcial, assinaturas/filtros/controlador e casos reais de mutação/concorrência ausentes |

## Execução reproduzível

`npm exec -- vitest run --config vitest.final-real.config.ts` usa as contas sintéticasA/B/ADMIN/PENDING e visitante, em memória. Seleciona no máximo oito caminhos por coleção dos inventários005/006 existentes e testa documentos que o proprietário confirmou existentes. Não lista coleções arbitrárias nem cria fixtures. IDs escolhidos em `.integration/final-readonly-inventory.json`; relatório em `.integration/final-readonly-vitest.json`, ambos ignorados pelo Git. A primeira tentativa encontrou caminhos sem documentos; seu relatório foi preservado antes da seleção limitada das fixtures existentes.

Avaliação006/007 repetida sob autorização vigente: `node scripts/evaluate-compras-finite-rules.mjs --authorized-source-disclosure`. Hash da candidata33f025cb49e5c98fb814a1828b83ebe84936d410851aee836474dd27d77e60d8; resumo em `../007-compras-cartao-parceladas/finite-rules-evaluation-summary.json`.

Smoke009 autorizado repetido com a mesma fonte4cf19f875b0963d82721a52a818d7e52c597ec2280af7de8744a8976d192fe0d e quatro fixtures. Houve compilação válida; o estado anteriorHTTP503 não descreve mais o bloqueio observado. Resumo em `../009-compromissos-parcelados-emprestimos/rules-evaluation-summary.json`; resposta completa preservada em `.integration/parcelados-final-20261025/`. O runner009 foi ajustado para futuras respostas completas ficarem no diretório ignorado, sem alterar candidata ou casos.

## Pendências para aprovação

- Corrigir/reavaliar criação009 preservando validação, reciprocidade e testes negativos.
- Completar comandos/repositórios e composição007–010; harmonizar assinaturas com controle008.
- Integrar leitores, filtros, controlador e cache011 e comprovar concorrência/snapshots em fluxos reais.
- Executar transações SDK pertinentes após fonte ativa compatível e autorização específica de publicação/fixtures; concluir interface e reconciliação assistida.

Os3 testes somente leitura não encerramG0-remoto, que também exige concorrência. Nenhuma capacidade nova foi promovida. A candidata007 aprovada continua distinta da fonte ativa006. Nenhuma aprovação de deploy decorre desta validação.
