# Validation 009 — T005–T007

## Estado vigente — 26/10/2026

Comprovante S/R/V aprovado e implementado como candidato local. [Registro completo](witness-status-2026-10-26.md): 488 testes/122 arquivos, tipos, lint e build passaram (aviso preexistente de chunk maior que 500 KiB). Aritmética documental passou 48 combinações por comando estrutural: criação máxima 18, edição 16, substituição 21 com oito combinações rejeitadas acima de 18.

API oficial: candidata aa486c76 compilou, mas apenas 4/9 casos do smoke passaram sem diagnóstico de limite; os três ramos de 5/10 e dois recibos ultrapassaram 1000 expressões. A variante 0f00ba6c recebeu HTTP 503 em duas tentativas; compilação e avaliação dessa variante não concluídas. Matriz atual contém 172 casos e ainda não passou integralmente. T007 permanece ERROR/pendente; não houve publicação, migração ou gravação financeira remota. A autorização de avaliação foi concedida; registros anteriores de ausência dessa autorização são históricos.

## Retomada autorizada em21/10/2026

O responsável autorizou expressamente enviar a candidata completa009 (69857bytes, SHA2564cf19f875b0963d82721a52a818d7e52c597ec2280af7de8744a8976d192fe0d) e suas134 fixtures sintéticas para firebaserules.googleapis.com, endpoint projects/lilicafinancy:test, usando a sessão operacional local existente, apenas para compilação/avaliação. Publicação e gravação financeira continuam fora dessa autorização.

O runner agora exige --authorized-source-disclosure antes de importar o provedor ou fazer rede, confere projeto/destino/hash e registra apenas status/código enumerado em erros. A execução sem autorização selecionou4 casos, fez zero requisições e retornou AWAITING_EXPLICIT_SOURCE_DISCLOSURE_AUTHORIZATION. A execução autorizada do smoke retornou HTTP503/UNAVAILABLE: zero respostas válidas, compiler NOT_RUN, state EVALUATION_UNAVAILABLE, deployment NOT_RUN. Não é reprovação semântica nem aprovação. Relatório em rules-evaluation-summary.json. A validação lexical local permanece aprovada e não fixa mais um estado remoto estático; o relatório oficial é independente.

Foi solicitada autorização específica para implementar/testar localmente antes do PASS de T007, mantendo produto e escritas bloqueados; essa solicitação não equivale a aprovação. Os registros anteriores abaixo são históricos, incluindo a antiga recusa de divulgação, agora suprida pela autorização explícita deste envio009. A indisponibilidade atual é do endpoint.

## Resultado desta execução

- T005: candidato completo gerado em firestore-parcelados.candidate.rules por scripts/build-parcelados-rules.mjs; inclui a fonte existente e ramos009, sem alterar firestore.rules. Fonte com69857 bytes; compilação/expressões oficiais e limite de payload de todas as combinações continuam não comprovados. T005 conclui apenas construção/verificações locais; toda essa comprovação permanece obrigatória em T007, conforme correção I1.
- T006: concluída a construção de rules-evaluation-cases.json por scripts/build-parcelados-rules-cases.mjs:134 casos sintéticos,53 ALLOW e81 DENY. Construção da suíte não equivale a aprovação dos casos.
- T007: avaliação oficial bloqueada pela revisão automática por ausência de autorização explícita de envio da fonte interna completa ao destino firebaserules.googleapis.com com a sessão operacional existente. Primeira tentativa no sandbox falhou em rede, sem resultado oficial. Nenhuma chamada de avaliação completada ou resultado de compilador disponível.
- Nenhuma publicação, release, fixture financeira real, migração ou alteração do perfil de produção foi realizada.

## Artefatos reproduzíveis

```powershell
node scripts/build-parcelados-rules.mjs
node scripts/build-parcelados-rules-cases.mjs
node scripts/validate-parcelados-candidate.mjs
```

Esses três comandos são locais, sem credenciais ou rede. candidate-manifest.json registra hash da fonte-base e candidata; local-validation.json registra hash da suíte, estrutura e limites verificáveis localmente. O gerador usa a fonte atual completa e falha a validação se o hash-base tiver mudado após a geração.

O comando abaixo somente poderá ser retomado após autorização explícita do usuário para enviar a fonte candidata completa e as fixtures sintéticas à API oficial indicada, usando a sessão operacional existente. Não é autorização de publicação:

```powershell
node scripts/evaluate-parcelados-rules.mjs --smoke
node scripts/evaluate-parcelados-rules.mjs
```

O avaliador chama apenas projects/lilicafinancy:test, em lotes de até12 testes, sem criar ruleset/release ou escrever dados financeiros. Reutiliza .integration/firebase005-ops.mjs como provedor operacional local; RULES_EVALUATION_PROVIDER permite indicar outro módulo de avaliação compatível e autorizado, não substituir o destino negado. Credenciais não entram no candidato, nas fixtures, nos resultados ou nos logs. Não reexecutar por outro transporte como contorno da rejeição.

## Evidência local

Validador local de scripts executado com node --check para os quatro arquivos. Validação lexical do candidato e das fixtures passou: delimitadores/comentários/strings, nomes de helpers únicos, até7 parâmetros/10 bindings por função e profundidade conservadora de helpers9. Source abaixo do teto textual oficial256KiB. Sem duplicação de caminhos de mocks ou nomes de casos.

As chamadas declaradas no desenho continuam orçadas separadamente em validate-design-budget.ps1; o checker lexical não conta expressões executadas nem substitui compilador/Rules. Maior documento positivo representativo da suíte:5815 bytes no JSON da fixture. Isso não comprova bytes reais ou todos os metadados máximos e não autoriza ampliar limites. Os resultados oficiais ainda são vazios e nenhum teste foi anunciado como aprovado remotamente.

## Cobertura da suíte

Positivos: cadastro1/1,5/10,12 posições e opcionais; cronograma desigual;100/3 e máximo monetário; original informado diferente do total; edição isolada/futuras; cancelamento e histórico revertido; parcial/integral; reversão e marcador; substituição mínima/máxima e primeiro uso de categoria; primeiro uso de conta; vínculo explícito; leituras e listas próprias nos limites.

Negativos: posição ausente/extra, ordinal, passado pago inventado, zero/overflow/fracionário, datas e competências, campo desconhecido, recibo/contraparte ausentes, versão/replay, protegido pago, saldo/excesso/data futura, alteração fora de escopo, marcador/vínculo repetidos, natureza/conta/UID indevidos, referências arquivadas, categoria/conta alteradas junto do primeiro uso, lista51 e acesso B/visitante/admin sem propriedade/primeiro acesso/cutoff. Mutações de criação inválida também ajustam o payload correspondente para evitar que mera divergência de cópia seja a causa acidental da negação.

Os mocks são fixtures para avaliação individual das regras, não prova de transação SDK no projeto real. Cada caminho escrito de um grupo legítimo tem caso próprio. Erros de compilação, função não mockada, estouro de orçamento ou1000 expressões nunca serão contados como prova semântica de uma negação. Paginação, cursor e snapshot do leitor são testes futuros de adaptador, não algo validado por mocks das Rules.

## Contrato concreto do candidato

Comando de criação usa {serieId,criacao:{dados,referencias,calculo}}; dados são os campos de negócio da série, sem schema/version/timestamps/ponteiro. calculo discrimina total(q/resto),porParcela(valorCentavos),explicito, sempre com totalCentavos; tipo de cálculo explícito corresponde a modo explícito. Recibo contém seriesIds, expectedVersions/resultVersions por ID, comando canônico e fato/contexto quando financeiro.

Edição usa {serieId,selecionada,alcance,parcelas,referencias,novoVencimento?}; parcelas contém estado novo das posições elegíveis, sem copiar as não alvo. referencias é patch comum, podendo ser vazio para conservar referências arquivadas históricas. Remover titular/conta prevista usa null apenas no patch, omitindo o campo no slot final. Cancelamento usa alvos/motivo; substituição acrescenta novaSerieId e nova(criação); pagar/reverter/vincular têm comandos fechados específicos no gerador.

O candidato compartilha validação atual de calendário/dinheiro/cadastros, mas não grava parcelas em coleções avulsas. Expande apenas os padrões de marcadores financeiros e acrescenta ramo de primeiro uso recíproco009 na candidata. Isso requer, antes de qualquer habilitação, atualizar usoFinanceiroValido e seus testes em src/domain/finance/cadastros.ts e validar cadastrosMapper.ts: hoje os leitores só aceitam prefixes005. Esse ajuste faz parte da compatibilidade de T009; sem ele, primeiro uso009 faria clientes antigos rejeitarem cadastros. Não há esse efeito em produção porque o candidato não foi publicado.

## Gates e decisão

G1/G2 executáveis permanecem PENDENTES por autorização/avaliação, não PASS nem ERROR técnico inventado. T008–T050 continuam condicionadas à prova positiva de T007 e às dependências existentes. Caso avaliação identifique falha legítima, registrar ERROR e corrigir antes de seguir. Publicação e testes SDK reais exigem a autorização vigente própria e não são feitos pelo endpoint de teste.



## Protocolo T003 e retomada local

Ambiente observado: Windows/PowerShell, Node v25.8.1 e npm11.18.0, compatível com engines>=24.12.0. Repositório Git existente; .gitignore cobre node_modules, dist, build, coverage, logs, arquivos temporários, .env e credenciais/.integration. Projeto private:true; publicação npm não prevista. Não há eslint.config; lint usa oxlint. Sem nova configuração Docker/Terraform/Helm exigida por esta feature.

Projeto esperado: lilicafinancy. Para integração futura, confirmar TEST_EXPECTED_PROJECT_ID igual a VITE_FIREBASE_PROJECT_ID; usar A/B/admin/pendente com UIDs de teste distintos e visitante sem login. Configuração inválida deve abortar antes de escrita. Não ler nem registrar senhas/tokens nesta preparação.

Manifesto de cada execução futura deve conter runId, projeto, UIDs dedicados e caminhos/IDs exatos de todas as fixtures sintéticas e seus dependentes; não criar seed automático nem limpar registros nesta fase. Limpeza exige inventário do manifesto e autorização própria. Resultados devem registrar comando, hash, instante, caso/perfil, esperado/observado e limitação sem credenciais.

Avaliação da fonte candidata, publicação de Rules e teste SDK real são etapas distintas. Nenhuma aprovação de uma delas autoriza implicitamente as demais. A rejeição de divulgação continua válida: não repetir avaliação por outro transporte.

Retomada local: validate-design-budget.ps1 passou144 combinações estruturais; validate-parcelados-candidate.mjs passou integridade/estrutura dos134 casos e confirmou fonte de produção inalterada. Não são resultados do compilador ou de integração. Correção I1: T005 cobre construção local; T007 concentra toda a comprovação executável e permanece pendente. T001–T006 concluídas, T008–T050 não iniciadas.

## Implementação local parcial autorizada — 21/10/2026

Após autorização expressa de envio, o smoke oficial009 retornou HTTP503 UNAVAILABLE, sem resultado de avaliação nem compilação válida. O responsável autorizou continuar contratos/domínio/repositórios/telas localmente antes do PASS remoto. Isso substitui o checkpoint de ordem, não a validação para produção. T007 continua pendente por indisponibilidade do serviço, não por falta da autorização já concedida.

Foram implementados domínio de série finita e cronograma explícito; validação fechada e identidades; pagamentos/reversões por parcela; prévias de edição, cancelamento e substituição; vínculo explícito de receita existente; comando/recibo de criação; criação SDK idempotente com perfil de produção negado; decoder e consultas limitadas por snapshot; adaptador de planejamento011 ainda não composto em produção; estado de criação e formulário/prévia ainda sem rota. Alterações, liquidação e vínculo além da criação ainda precisam dos respectivos eventos/repositórios completos, consultas de histórico e telas. Os mocks SDK não comprovam Rules.

Os testes cobrem próxima5/10 criando seis obrigações, ausência do capital original, nenhum pagamento anterior fictício, cronograma desigual sem taxa, conta/titular próprios, preservação de parcelas já liquidadas, mesma intenção após resposta perdida, leituras limitadas e cursor concorrente. Regressão global registrada na008:407 testes/100 arquivos PASS. Desenvolvimento local não equivale à conclusão integral das tarefas com dependências remotas.

## Bloco2 — resumo do cronograma

Em21/10/2026, `parceladosSummary.ts` e `ParceladoResumo.tsx` passaram a expor posições cadastradas, planejado ativo, liquidado líquido, pendência e atraso por parcela. Posições anteriores permanecem não cadastradas; valor original desconhecido é omitido no domínio e exibido como não informado. Parcela paga conserva o valor no planejamento; cancelada não é quitada e perde exigibilidade. Referência a receita vinculada não apresenta recebimento presumido. Histórico de liquidação revertido permanece indicado.

Os totais são do controle corrente da série validada, não reconstrução de fatos por uma página parcial ou fluxo de caixa mensal. O componente ainda não está conectado à rota de detalhe. Regressão global deste incremento do bloco2:473 testes/118 arquivos PASS; tipos e lint PASS. Persistência dos demais comandos, histórico completo, interação e gates reais permanecem pendentes.

## Reavaliação oficial real —25/10/2026

Mesmo envio autorizado, fonte4cf19f875b0963d82721a52a818d7e52c597ec2280af7de8744a8976d192fe0d, quatro casos,1 requisição, compilaçãoCOMPILED. create5of10Series e createOneSeries retornaramFAILURE por1000 expressões; createOneReceipt e replaceReceipt retornaramSUCCESS. ResultadoERROR_EVALUATION. T007 está ERROR; a falha reproduzida substituiHTTP503 e requer correção de viabilidade sem remover invariantes.

Resposta completa em `.integration/parcelados-final-20261025/rules-evaluation-00.json`, ignorada pelo Git; resumo em rules-evaluation-summary.json. O runner grava futuras respostas em `.integration/parcelados-rules/`. Sem publicação, migração, mudança da candidata ou gravação financeira. Relatório global: ../011-painel-mensal-projecao/final-validation-2026-10-25.md.

## Tentativa de correção solicitada —25/10/2026

Ver refactor-status-2026-10-25.md. Candidata experimental929a551e7f8985c6225f74406a740ffeb23df26123189fa1853b53b9a76eec44 compilou e passou criação1/1, mas não5/10. Matriz134 interrompida por503 após6 lotes:72 resultados,40 aprovações sem diagnóstico de limite,17 falhas e15 negativas mascaradas por limite;62 não avaliados. T007 continuaERROR. Regressão local485/121 PASS; fonte ativa não alterada. Proposta adicionalV pronta para decisão em contracts/validation-witness-proposal.md, sem implementação ou publicação desse protocolo novo.
