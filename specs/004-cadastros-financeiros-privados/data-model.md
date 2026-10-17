# Data Model: Cadastros financeiros privados

## Convenções

Documentos sob users/{uid}; proprietário só no caminho, nunca em campo editável. Coleções e tipos são allowlists fixas. ID cadastral novo é UUID sem sublinhados, válido também no idAvulsoValido da 003; aceitar somente `[A-Za-z0-9-]{1,64}` neste adaptador, inclusive nas referências. Não usar nome como identidade. Chave de intenção segue a mesma gramática e é criada fora do domínio antes da tentativa.

schemaVersion=1 em todos os documentos desta feature. version cadastral é inteiro seguro positivo. Esquema desconhecido/campo extra causa erro de integridade, sem cast presumindo compatibilidade ou sobrescrita corretiva. Campos opcionais ausentes, não null. Um documento por entidade/recibo/controle; sem arrays históricos.

## Documentos cadastrais

| Campo comum | Tipo | Obrigatoriedade/invariantes |
| --- | --- | --- |
| nome | string | Obrigatório, normalizado com trim, 1–120 caracteres; duplicados permitidos. |
| estado | ativo ou arquivado | Obrigatório; criar ativo, sem reativação. |
| schemaVersion | int | Obrigatório e igual a 1; imutável no CRUD. |
| version | int seguro >=1 | Criar 1, alterar +1; versão esperada obrigatória. |
| createdAt | timestamp | Obrigatório, request.time na criação; imutável depois. |
| updatedAt | timestamp | Obrigatório, request.time na alteração efetiva. |
| archivedAt | timestamp | Somente em arquivado; request.time na transição; sem alteração posterior. |

| Coleção | Campos específicos permitidos | Semântica |
| --- | --- | --- |
| titulares | Nenhum | Pessoa administrada, sem identidade de acesso. |
| categorias | natureza: receita ou despesa, obrigatório | Classificação sem orçamento; natureza editável apenas sem controle de primeiro uso. |
| contas | tipo: banco/carteira/contaPagamento, obrigatório; titularId opcional; trio de base opcional | Conta de caixa; tipo e base editáveis apenas sem controle de primeiro uso. |
| etiquetas | Nenhum | Agrupamento livre, também chamado projeto na interface explicativa. |

Campos da base: saldoInicialCentavos inteiro 0..9.007.199.254.740.991; saldoInicialPosicao enum credora/devedora; saldoInicialDataBase string YYYY-MM-DD gregoriana 1900–9999, não futura. Ausentes em conjunto ou todos presentes; zero somente credor. Origem manual é fixa neste esquema e não é campo livre. Posição no início da data-base. Sem saldo atual, confirmação bancária ou sinalizador de completude.

Apenas conta aceita titularId textual; inclusão/troca exige getAfter de titular ativo em users/{uid}/titulares. ID igual ao persistido pode permanecer arquivado, mas ainda deve resolver documento existente do mesmo UID. Remover titularId não altera fatos financeiros anteriores. Cadastro arquivado não recebe edição de conteúdo.

Nomes são contados por caracteres conforme o validador compartilhado, não apenas limite UTF-16 do input. Validar paridade com Rules em nomes acentuados, emoji, espaços comuns e Unicode; não truncar em silêncio ou relaxar a validação remota.

## Recibo de operação cadastral

Caminho: users/{uid}/operacoesCadastros/{colecao}__{cadastroId}__{versaoResultante}. As quatro coleções são valores fixos; ID não contém sublinhado, versão é decimal canônica sem zeros à esquerda. Chave determinística sem ambiguidade; string(version) é suportado nas Rules.

| Campo permitido | Tipo/invariante |
| --- | --- |
| schemaVersion | int, 1 |
| operationKey | ID de intenção, estável entre tentativas |
| colecao | titulares/categorias/contas/etiquetas |
| cadastroId | ID conforme gramática cadastral |
| tipo | criar/editar/arquivar |
| expectedVersion | int seguro >=0; 0 só na criação |
| version | expectedVersion+1 |
| dados | map fechado com campos cadastrais de conteúdo completos após o comando, incluindo estado e opcionais; exclui timestamps/schemaVersion/version |
| createdAt | timestamp igual a request.time |

Schema de dados é o da coleção correspondente: nome/estado e campos específicos. Recibo de criar exige estado ativo; editar preserva ativo; arquivar exige arquivado e mesmo conteúdo do cadastro anterior, exceto estado. No modo comandoCompleto, chave e corpo normalizado são comparados na retomada, não somente ID ou hash. No modo descritor após recarga, identificar a operação pela chave/entidade/tipo/versão e apresentar o conteúdo do recibo, sem alegar comparação com formulário perdido ou autorizar escrita/reenvio automático; a confirmação indica explicitamente o modo de verificação. Não guardar UID, credenciais, logs ou snapshots financeiros no recibo.

Recibo é create-only: get próprio permitido para retomada; list/update/delete cliente negados. Não remover enquanto cadastro existir, inclusive arquivado. Ele confirma a versão daquela operação, não substitui a leitura da versão atual do cadastro.

## Controle protegido de primeiro uso

Caminho: users/{uid}/usoCadastros/{colecao}__{cadastroId}, apenas colecao categorias/contas.

| Campo permitido | Tipo/invariante |
| --- | --- |
| schemaVersion | int, 1 |
| colecao | categorias ou contas |
| cadastroId | ID cadastral |
| consumidorTipo | Enum fechado da futura feature consumidora, nunca caminho arbitrário |
| consumidorId | ID da testemunha do primeiro uso |
| papel | classificacao para categoria; movimentacao para conta |
| createdAt | timestamp de confirmação do primeiro uso |

Ausência permite edição pré-uso; presença bloqueia natureza ou tipo/base de forma permanente. Controle com esquema inválido bloqueia escrita por segurança. Referência prevista à conta sem movimento não congela sua base; recebimento/pagamento efetivo congela. Categoria é congelada pela primeira referência, incluindo previsão/molde quando tal consumidor existir.

Nesta feature: get próprio permitido para diagnóstico; list/create/update/delete cliente negados. Não há controle gravado no cadastro comum. Não criar histórico financeiro apenas para preencher testemunha. Fixtures operacionais específicas de teste podem preparar controle em UID dedicado para validar o bloqueio; devem ser inventariadas e não provam a transição futura.

Transição futura: ausente → controle imutável na mesma operação do primeiro uso. Rules do consumidor exigem controle correto em getAfter; Rules do controle validam consumidor tipado antes/depois e adição real da relação. Controle não pode ser removido/reposto ao apagar/cancelar/editar consumidor. A feature consumidora deve fechar enum, prova e orçamento antes de substituir o deny atual. Não há booleano desbloqueável.

## Transições e conflitos

- Criar: documento ausente + expectedVersion=0 → ativo/version=1 e recibo atômico.
- Editar: ativo/version=N + expectedVersion=N → ativo/version=N+1, mantendo ID/criação e observando primeiro uso; recibo atômico.
- Arquivar: ativo/version=N → arquivado/version=N+1 e archivedAt, com recibo; conteúdo preservado.
- Repetir a mesma intenção: recibo com mesma operationKey e comando normalizado → confirmação original sem nova escrita, mesmo após outra edição.
- Recibo da versão pretendida com outra chave: conflitoVersao; mesma chave e conteúdo diferente: conflitoIdempotencia. Não rebasear automaticamente.
- Arquivar cadastro já arquivado por intenção nova: retornar semAlteracao com versão atual; nenhuma nova versão ou recibo.
- Editar sem mudança normalizada: semAlteracao; não criar recibo vazio ou incrementar versão.
- Exclusão física, reativação e mutação de arquivado: negadas.

## Compatibilidade com a feature 003

Persistência desta feature usa estado e os três tipos novos. SnapshotAlvo.contas mantém estadoCadastro: traduzir explicitamente no adaptador de contexto, preservando UID e ID. Carteira representa dinheiro; banco e contaPagamento são instrumentos de pagamento. Não reutilizar um conversor que aceite livremente nomes antigos de campos. O UID pode existir em DTO do domínio para checagem, mas não é serializado como campo no documento.

Não alterar os tipos de valores de lançamentos para suportar base devedora. Não alterar schemaVersion do perfil. Migração de documento cadastral existente incompatível é separada e explícita; nenhum seed/reparo automático no login.

## Consultas e índices

Listar: coleção privada fixa, filtro opcional estado, orderBy(nome asc), orderBy(documentId asc), cursor por nome+ID, limit 1..50. Cursor contém coleção/filtro e é inválido após mudança desses parâmetros/UID. Buscar referência histórica usa get do ID conhecido, não precisa encontrá-la na primeira página.

Adicionar quatro índices COLLECTION: estado ASC + nome ASC em titulares/categorias/contas/etiquetas, com desempate __name__ ASC. Preservar notificationOutbox e fieldOverrides atuais. Não usar consulta collectionGroup global. Recibos e controles não têm listagem; isentar índices de dados do recibo e metadados não consultados quando apropriado no arquivo completo, sem remover índices de listas.
