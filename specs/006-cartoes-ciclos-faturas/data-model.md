# Data Model: Cartões e ciclos de faturas

Desenho sem criação de coleções/migração nesta fase. Referências são IDs locais do mesmo UID; caminhos livres e owner no formulário são proibidos. Documentos novos têm esquema fechado, inteiros seguros e timestamps de servidor. Campo desconhecido é recusado.

## Identidades

| Entidade | Caminho | Regra |
| --- | --- | --- |
| Cartão | users/{uid}/cartoes/{cartaoId} | ID estável `[A-Za-z0-9-]{1,64}` gerado antes do envio. |
| Fatura | users/{uid}/faturas/{cartaoId}__{competencia} | YYYY-MM; ID exatamente reconstruível pela concatenação. |
| Evento do cartão | users/{uid}/operacoesCartoes/{tipo}__{operationKey} | criarCartao/editarCartao/arquivarCartao; chave1–64 no alfabeto do cartão. |
| Evento da fatura | users/{uid}/operacoesFaturas/{tipo}__{operationKey} | confirmarFatura/ajustarVencimento; mesmo limite da chave. |

UID é autoridade no caminho/sessão. DTOs acrescentam UID/ID na decodificação. Identidade lógica003 é `['fatura',cartaoId,competencia]`; adaptador traduz sua codificação para o formato remoto. Rules comprovam concatenação; não confiam no base64 de identidadeNatural. Delimitador `__` é excluído do cartaoId, evitando colisão.

## Cartão — schemaVersion1

| Campos | Validação | Mutabilidade |
| --- | --- | --- |
| banco, nome | texto trim1–120 cada | Editável somente ativo; duplicados permitidos. |
| titularId | titular obrigatório, mesmo UID | Novo/substituído ativo; idêntico pode conservar arquivado. |
| diaFechamento, diaVencimento | inteiros1–31 | Padrões para períodos não confirmados. |
| estado | ativo/arquivado | Nasce ativo; só ativo→arquivado. |
| schemaVersion | inteiro1 | Imutável. |
| version | inteiro seguro positivo | +1 por efeito, sem overflow. |
| ultimoEventoId | evento do mesmo UID | Corresponde à nova revisão. |
| createdAt, updatedAt | timestamps | Criação preservada; atualização=request.time. |
| archivedAt | só quando arquivado | Criado no arquivamento, igual a updatedAt. |

Não existem campos de número completo, CVV, credenciais, limite, saldo, conta bancária automática, observação livre adicional ou proprietário alternativo. Banco é texto livre. Arquivar conserva conteúdo e altera só estado/metadados; sem exclusão, reativação ou edição de conteúdo arquivado.

## Fatura — schemaVersion1, versaoConteudo1

| Campo | Tipo/validação | Autoridade |
| --- | --- | --- |
| cartaoId, competencia | ID e YYYY-MM1900–9999 | Imutáveis, compõem ID remoto. |
| inicio | DataCalendario | Inclusivo e imutável. |
| fechamento | DataCalendario | Exclusivo e imutável. |
| vencimento | DataCalendario do mês competencia | Só muda por ajuste explícito. |
| calendarioOrigem | mapa fechado abaixo | Snapshot imutável. |
| schemaVersion, versaoConteudo | inteiros1 | Variante não admite itens ou fatos financeiros. |
| version, ultimoEventoId | revisão/evento | +1 por efeito. |
| createdAt, updatedAt | timestamps | Mesma regra do cartão. |

`calendarioOrigem` contém exatamente: `calendarVersion=2`, `cartaoVersion` inteiro positivo, `diaFechamento` e `diaVencimento`1–31, `vencimentoOriginal` DataCalendario, `origemInicio` e `origemFechamento` (`padrao`/`vizinhoConfirmado`). Revisão documental e versão do calendário são diferentes. Não persistir nomes históricos, total, pago/pendente, estado de pagamento, array de itens ou estado de ciclo. Resolver nomes atuais do cartão/titular.

### Construção verificável por competência M

1. Fechamento-base em M se diaFechamento < diaVencimento; senão em M−1. Ajustar dia inexistente depois. Vencimento-base é diaVencimento ajustado em M.
2. Início-base é fechamento-base de M−1 com as mesmas âncoras. Consultar os quatro vizinhos no pré-estado da operação. Se F(M−1) já existia com snapshot válido, usar seu fechamento; se F(M+1) já existia com snapshot válido, usar seu início como fechamento. Origem vizinhoConfirmado significa exclusivamente existência anterior; vizinho criado no mesmo lote não pode fornecer limite. Na ausência anterior, usar padrao do cartão pós-estado validado. Origens no mapa refletem essas escolhas, sem referência circular entre novos documentos.
3. Exigir anterior2.fechamento ≤ início e fechamento ≤ seguinte2.início quando F(M±2) já existem no pré-estado. Igualdade de fronteira com vizinho preexistente F(M±1) é obrigatória. Dois novos adjacentes calculam a fronteira-base pelo mesmo cartão pós-estado, em vez de herdarem um do outro.
4. Mês(início)∈{M−2,M−1}; mês(fechamento)∈{M−1,M}; início < fechamento ≤ vencimento. Igualdade fechamento=vencimento somente se âncoras históricas distintas têm diaFechamento < diaVencimento e ambas as datas ajustadas coincidem no último dia de M. Fechamento concreto deve ser esse ajuste, inclusive se veio de vizinho; flag livre não serve como prova.
5. Criação exige cartão pós-estado existente/ativo, dias/cartaoVersion exatos e vencimento=vencimentoOriginal. Datas confirmadas não mudam com edição do cartão.

Omitir apenas vizinhos efetivamente fora do intervalo1900–9999. Se o próprio ciclo precisar de data fora dele, rejeitar, sem sentinela fictícia.

| Âncoras | Fatura | Início | Fechamento | Vencimento |
| --- | --- | --- | --- | --- |
| 10/17 | 2026-10 | 2026-09-10 | 2026-10-10 | 2026-10-17 |
| 25/5 | 2027-01 | 2026-11-25 | 2026-12-25 | 2027-01-05 |
| 31/5 | 2027-03 | 2027-01-31 | 2027-02-28 | 2027-03-05 |
| 31/31 | 2027-02 | 2026-12-31 | 2027-01-31 | 2027-02-28 |
| 30/31 | 2027-02 | 2027-01-30 | 2027-02-28 | 2027-02-28 |
| 30/31 | 2027-03 | 2027-02-28 | 2027-03-30 | 2027-03-31 |
| 30/31 | 2028-02 | 2028-01-30 | 2028-02-29 | 2028-02-29 |

### Ajuste e estados

Ajuste conserva cartaoId/competencia/inicio/fechamento/calendarioOrigem; altera vencimento, revisão, evento e updatedAt. Novo vencimento no mesmo mês, posterior ao fechamento ou igual somente pela exceção comprovada do snapshot. Evento registra data anterior/nova e motivo trim1–1000. Esquema/versaoConteudo desconhecido falha fechado. Sem diferença: semAlteracao sem escrita/recibo.

Ciclo derivado: aberta se hojeNoFuso < fechamento, fechada nos demais dias. Sem job nem escrita por passagem do tempo. Fatura vazia mostra total derivado0 e sem pagamento registrado; não afirma quitação ou atraso. Futura soma deriva de itens/fatos, sem dupla contagem.

## Evento-recibo — schemaVersion1

Create-only, campos exatos: schemaVersion1, contractVersion1, operationKey, tipo, createdAt=request.time, alvoId, expectedVersion≥0, resultVersion=expectedVersion+1, comando, resultado e `antes` quando aplicável. Comando contém somente a variante normalizada de contracts/commands.md; resultado contém os dados de negócio posteriores, inclusive tupla quando fatura, sem timestamps duplicados. `antes` é ausente na criação; em edição/arquivamento contém conteúdo anterior; em ajuste contém exatamente vencimento anterior. Primário compara com resource.data, sem confiar no valor alegado.

Recibo aponta primário que aponta de volta por ultimoEventoId e resultVersion. Evento consumido não autoriza outra revisão. Ajuste usa o próprio recibo como histórico, sem terceiro documento. Comando canônico até16KiB; documento até32KiB. Validar bytes antes de enviar. Campos variáveis têm limites de texto/ID; não guardar payload arbitrário.

## Objetos transitórios e transições

Prévia contém UID/geração, cartão/revisão, dataCompra, candidatos, calendário proposto, versões/ausências dos vizinhos e origem sugestao/escolhaExplicita. Não é documento financeiro; datas futuras são previsão, não compra efetivada.

| Estado | Ação | Resultado |
| --- | --- | --- |
| Cartão ausente | criar | ativo + evento v1. |
| Cartão ativo | editar/arquivar | revisão + evento; snapshots/obrigações preservados. |
| Cartão arquivado | editar/reativar/excluir | negado; arquivar novamente é semAlteracao. |
| Período ausente de cartão ativo | consultar | prévia somente leitura. |
| Prévia válida revisada | confirmar | fatura vazia + evento, identidade única. |
| Fatura existente | confirmar novamente | existente se calendário coincide; divergência conflita; nenhum evento novo. |
| Fatura vazia confirmada | ajustar | novo vencimento + evento, inclusive cartão arquivado. |
| Cartão arquivado/período ausente | consultar/confirmar | ausência; nova confirmação vazia negada. |

## Compatibilidade e evolução

Calendário será união discriminada: legado estritamente válido sem âncoras inventadas, novo v2 com metadados para comprovar coincidência. Harmonizar allowlists em settlement/commands/installments e doubles. Adaptador pode fornecer `ciclo` derivado ao contrato legado, sem persistência autoritativa. Documentação003 deve registrar a especialização autorizada006.

Rules atuais não habilitam faturas, mas isso não prova ausência de dados antigos: a005 registra histórico de modo de teste aberto. Antes de habilitar006, inventariar somente caminhos autorizados. Colisão com documento incompatível bloqueia; não sobrescrever ou adotar sem schema. Migração, se necessária, será explícita e revisada, sem recalcular snapshots automaticamente.

Futura compra deve validar cartão ativo no commit e atribuir cada parcela a exatamente uma fatura. Novos schemas/itens/fatos exigem revisão das Rules e atualização integral das cópias de vencimento. versaoConteudo1 não comporta itens; comando006 de ajuste não pode operar sobre a variante futura até comprovar consistência.
