# Validation: Painel011

## Continuidade autorizada em21/10/2026

O responsável autorizou ampliar o escopo para implementar007–010 antes de concluir011 e autorizou o cronograma finito no agregado da compra007. Foram implementados prévia/cálculo, identidade revisionada, validação/construção do agregado e decoder de compra. Isso reduz a ausência inicial de código007, mas ainda não fornece repositório, histórico transacional, fonte de fatura008 ou capacidade real para011. T019 continua pendente; não habilitar fonte pela mera presença de módulo.

A avaliação009, separadamente autorizada com fonte/fixtures/destino explícitos, retornou HTTP503/UNAVAILABLE, sem resultado do compilador. Nenhuma publicação ou escrita financeira. Foi solicitada exceção à ordem dos checkpoints009/010 para avançar no código local mantendo produção bloqueada; a resposta ainda é necessária para trabalho condicionado a essa exceção.

Regressão ampliada:85 arquivos/345 testes passaram; typecheck, lint e build passaram (mesmo aviso de chunk>500kB). São verificações locais do repositório, não integração remota011. Estado das68 tarefas011 permanece17 concluídas/51 pendentes.

## Ambiente e escopo

2026-10-20, Windows/PowerShell; Node25.8.1/npm11.18.0, TypeScript6.0.2/Vitest4.1.12/Firebase13 conforme package.json. Ignore existente cobre node_modules,dist,build,coverage,logs,.env,credenciais e temporários; package private, sem Docker/ESLint/Prettier/Terraform/Helm que exijam novo ignore. Sem instalação.

Checklist requirements16/16 PASS; hooks ausentes. Projeto futuro esperado lilicafinancy, ainda sem conexão nesta implementação. Manifesto remoto deverá incluir runId,quatroUIDs distintos,visitante,caminhos exatos e hashes,sem senhas/tokens. Sem seed/publicação/limpeza automática.

## Gates

G0-local PENDENTE de implementação/testes; G0-remoto PENDENTE e não autorizado implicitamente para publicação/fixtures. G1/G2 das fontes007–010 PENDENTES por ausência dos módulos de produto. G3 PENDENTE. Nenhum dado ausente equivale a zero.

## Registro de execução

T001 inventário atualizado; T002 protocolo criado; T003 matriz de rastreabilidade criada. Esses documentos não são teste de produto. Testes e falhas iniciais serão registrados incrementalmente.

## Fundação implementada — T004–T014

Contratos, leitor compartilhado, coordenador de orçamento global, registro de fontes, estado coerente, limpeza/aborto de sessão, preflight/grupo de integração e negação de disponibilidade implementados. TDD: testes de contratos/leitor/coordenador/estado inicialmente falharam por módulos ausentes; sessão falhou pelos hooks de limpeza ausentes; preflight e availability falharam pelos módulos ausentes. Erro de sintaxe do teste de orçamento foi corrigido antes de confirmar a falha por módulos ausentes.

Primeira execução Vitest no sandbox falhou EPERM em rename do cache temporário; execução local fora do sandbox, sem rede, confirmou as falhas iniciais esperadas. Corrida de três aberturas de janela foi reproduzida por teste que excedeu timeout; reservar janelas antes do await corrigiu o caso.

Rodada local:14 arquivos/61 testes PASS, com novos contratos/reader/queries/sources/state/session/preflight/availability e regressões005/006. Typecheck e lint PASS após corrigir import não usado e narrowing de cobertura. Sem execução de grupo remoto. G0-local PASS neste incremento; G0-remoto/G1/G2/G3 permanecem PENDENTES. Todas as seis capacidades de produto011 continuam naoHabilitada/painelDisponivel=false. T001–T014 concluídas localmente; nenhuma publicação,fixture remota ou mudança de Rules/índices.

## Incremento mensal e verificação final

T015/T017:teste de planejamento inicialmente falhou por módulo ausente,depois8/8 casos passaram. Reconciliam500000 previstos,300000 recebidos,150000 compromissos,60000 liquidados,90000 pendentes e350000 de resultado em centavos. Pagamento adicional mantém planejado. Origem/parcelas de cartão/capital não somam outra vez; canceladas são excluídas;quitação virtual,líquido excedente,conflito de identidade e estouro são rejeitados. Filtros ainda sem política implementada retornam indisponível,sem total filtrado falso. Caixa/consumo não foram implementados.

T018: mappers/adapters005 e calendários006 implementados,com7 testes de mapeamento/fontes (incluindo página física cheia). Calendário não recebe valor financeiro fictício. T016 é parcial:casos positivos007–010 não comprovados;essas fontes retornam configuração pendente. T019 bloqueada por ausência dos módulos de produto: contratos/comprasCartao.ts,liquidacoesFaturasRepository.ts,parceladosQueries.ts e recorrenciasProjection.ts,além de gates de origem pendentes. Não foi alterado qualquer match de Rules para compensar essa falta.

Suíte local completa:npm test →82 arquivos/325 testes PASS. npm run typecheck e npm run lint PASS após corrigir narrowing de cobertura. Build registrado na entrega. git diff --check sem erro;somente avisos de normalizaçãoLF/CRLF. Nenhuma execução de npm run test:integration,nem leitura de credenciais/fixtures financeiras remotas. Arquivo painel-snapshot.integration.test.ts é roteiro executável somente leitura de fixtures exatas já existentes;concorrência mínima deG0-remoto continua pendente daUS1/T025. .env.integration.example documenta flags de confirmação,sem habilitá-las.

Hashes em implementation-evidence.json. Hash do firestore.rules preservado:d305c3b7a39c8690a5022f04b297c95229178a97da0f1c8667522a9a699b87c8.17tarefas concluídas;51pendentes. Interface/rotas novas não foram criadas nem habilitadas. Nenhuma publicação,seed,limpeza ou mudança de dados financeiros.

Revisão final:quatro testes adicionais reproduziram classificação indevida de cota/índice/schema/indisponibilidade como erro de integridade; após preservar códigos tipados sem mensagem privada, a suíte completa passou82arquivos/325testes. Typecheck/lint passaram. Build de produção passou (Vite instalado8.3.4); emite aviso de chunk>500kB, sem erro. Nenhuma otimização visual ou disponibilidade de painel foi habilitada.

## Continuidade autorizada e dependências locais — 21/10/2026

O responsável autorizou continuar código/testes locais antes do PASS remoto009/010 e também controle financeiro junto da fatura com capacidade de item na compra. Ver local-checkpoint-exception.md e ../007-compras-cartao-parceladas/contracts/invoice-control-proposal.md. A autorização anterior necessária já foi recebida; não há pedido repetido pendente para esse trabalho local.

As dependências agora possuem implementações locais parciais:007 cronograma finito/capacidades/decoder;008 controle/liquidações/encargo puros e decoder explícito de fatura com revisões independentes;009 criação idempotente negada em produção, consultas limitadas, domínio de alterações/liquidações e formulário/prévia;010 projeção pura reconciliada por ocorrência/revisão. O adaptador009 de planejamento do painel não soma cabeçalhos/capital e permanece fora da composição de produção.

Regressão local407 testes/100 arquivos PASS, typecheck e lint PASS. T019 permanece parcial: faltam escritores, contratos/eventos completos, leitores e provas correspondentes007–010. Dashboard/12meses, bases caixa/consumo, filtros, cache completo e aceitação continuam pendentes. Nenhuma capacidade011 foi promovida; zero publicação/migração/gravação financeira nesta continuidade. A avaliação009 autorizada retornou503 e não prova candidata aprovada; a fonte007/008 nova ainda não está construída/avaliada.

## Prova parcial da dependência007 — 21/10/2026

A API oficial voltou a responder à avaliação006/007 autorizada. A candidata de criação finita/fatura nova vazia passou137/137 casos, incluindo100/3 e regressões de calendário, sem publicação. Isso resolve a prova desse recorte; não comprova as fontes completas007–010 ou os gates do painel. Continuam pendentes transações/telas, edição/cancelamento, liquidações/recorrências completas e integração011. Regressão local425 testes/105 arquivos, typecheck/lint/build PASS (aviso anterior de chunk). Root Rules/índices preservados.

## Bloco3 — painel mensal e anual local,21/10/2026

`painelBases.ts` acrescenta consolidadores mensais separados de caixa/consumo. Caixa soma fatos persistidos por data efetiva, incluindo reembolso como entrada de caixa; exclui transferências, cabeçalhos de fatura e compras. Consumo soma despesa de origem e efeitos de ajuste/redução, sem parcelas ou capital de empréstimo adicionais. Mappers futuros devem entregar cada efeito exatamente uma vez pela sua base/data; o consolidador não deduz fatos de um evento documental. Data econômica de caixa/consumo deve coincidir com o mês contribuído. Fontes incompletas preservam subtotal e impedem resultado integral; filtros ainda não suportados retornam indisponível.

`consolidarJanelaPainel` compõe1/12meses das três bases no mesmo snapshot, sem somar fontes de autoridade duplicadas. Saldo bancário opcional ausente não invalida movimentos de caixa reconciliados, mas continua explicitamente indisponível. Compatibilidade da porta antiga `consolidarJanelaPlanejamento` preservada.

Rotas `/app` e `/app/projecao` conectadas às telas `PainelPage`/`PainelAnualPage`, com navegação no AppShell. Mês/base na URL, avanço/retorno de1/12meses, limites1900–9999, início anual até9999-01 e abertura de mês com contexto do início anual. Cards e tabela identificam base, parcialidade e estimativa; resultado é distinto de saldo. `PainelDetalhe` usa somente contribuições do mesmo recorte/readTime, com links aos detalhes já existentes005/006. As rotas não iniciam consultas financeiras: fontes não habilitadas continuam como indisponível, sem dados fictícios ou zero presumido. Conexão com controlador/leitores, filtros e composição010 reais permanecem pendentes.

`painelCache.ts` implementa cache independente em memória, chave normalizada porUID/generation/consulta/readTime, até duas janelas e8MiB, expiração original sem renovação, cópia profunda congelada e limpeza no registro privado de sessão. Teste de janela acima de8MiB comprova rejeição integral com preservação da anterior. Não há localStorage/sessionStorage de dados financeiros. A integração com os buffers/controlador e seu orçamento global ainda não foi concluída; limites isolados não comprovam consumo global de memória do produto.

Regressão final485 testes/121 arquivos PASS; lint e build PASS. Build:124 módulos, JS981,25kB/gzip293,07kB, aviso anterior de chunk>500KiB. Testes de bases/cache tiveram falha inicial por módulo ausente e aprovação após implementação; UI validada por renderização estática, sem alegar ensaio de interação/teclado/celular. Capacidade financeira de produção011 permanece desabilitada. Não houve envio remoto, publicação, migração ou gravação financeira neste incremento.

Checagem final `npm run typecheck` PASS, incluindo tsconfig.integration.json. `implementation-evidence.json` atualizado para485/121 e hashes dos arquivos atuais; remoteEvaluation011 continua NOT_RUN e financialQueriesEnabled=false. `git diff --check` PASS.

## Validação real solicitada —25/10/2026

Relatório completo: final-validation-2026-10-25.md. SDK/REST reais3/3 PASS em fixtures existentes; fonte ativa confirmada igual à raiz local pela API oficial; candidata007 reavaliada137/137 PASS. Smoke009 compilou, mas criação1/1 e5/10 excederam1000 expressões; recibos2/2 passaram isoladamente. Entrega integral NÃO APROVADA. Nenhuma publicação, migração, seed, limpeza ou gravação financeira. Consultas do painel seguem desabilitadas eG0-remoto continua pendente de concorrência e dependências completas.
