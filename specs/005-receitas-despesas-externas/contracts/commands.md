# Contract: Comandos externos e retomada

## Porta ligada à sessão

PortaExternos nasce com uid, geração de sessão e timezone validado. Entradas não escolhem usuário/caminho. Resultado usa Resultado da 003, objetos comuns e erros discriminados; não retorna DocumentReference/Timestamp do SDK. Relógio e IDs são entradas explícitas de validadores puros. Nenhuma API HTTP pública financeira é criada.

Envelope comum: contractVersion=1, tipo, operationKey estável, origemId e expectedVersion; criar/imediato usam 0. Conteúdo normalizado antes do primeiro envio: trim, opcionais vazios ausentes, etiquetas únicas ordenadas, centavos exatos, datas canônicas; rejeitar conteúdo malformado, sem coerção. expectedVersion faz parte do conteúdo idempotente e não é atualizado por retry.

| Comando | Dados adicionais | Confirmação |
| --- | --- | --- |
| criarReceita | descrição, categoria, valor, estimado, competência, dataPrevista; opcionais da origem | origem prevista e recibo |
| criarDespesa | mesmos campos de negócio, vencimento e dataConsumo obrigatórios | obrigação pendente e recibo |
| gastoImediato | dados completos da despesa + dataEfetiva e contaId; substituiOrigemId opcional | obrigação e pagamento integral no mesmo commit |
| editarOrigem | conteúdo completo resultante e natureza original, nunca projeção | origem nova versão ou semAlteracao |
| cancelarOrigem | motivo obrigatório 1–1000 | origem cancelada ou semAlteracao |
| receber / pagar | valor positivo, dataEfetiva, contaId | um único fato correspondente e revisão da origem |
| reverterRecebimento / reverterPagamento | originalId e motivo; conta/data/valor são derivados, não editáveis | inversão integral e marcador único |

substituiOrigemId também pode ser informado em criarReceita/criarDespesa. Origem antiga deve estar cancelada e ser da mesma natureza e UID; ambas preservam seus IDs. O fluxo de recuperação apresenta etapas cancelamento → nova origem vinculada, com estados independentes recuperáveis por recibo. Não prometer atomicidade conjunta entre cancelamento antigo e nova criação; o atalho gasto imediato continua atômico para seu novo par. Após cancelamento confirmado e falha na criação, indicar substituição ainda não concluída e retomar a intenção de criação, sem reativar a antiga automaticamente.

## Algoritmo transacional contratado

1. Conferir geração, normalizar comando e determinar caminho tipo__operationKey. IDs nascem fora do callback. Coletar cadastros/primeiro uso e eventuais erros em preflight remoto separado, sem autoridade no commit e sem rejeitar a intenção antes de verificar recibo existente. Falha de rede no preflight ainda permite consultarOperacao para resolver confirmação anterior.
2. Dentro de runTransaction, ler primeiro o recibo. Existente: validar tipo/chave/origem/conteúdo completos e retornar resultado original, mesmo se origem já tiver versão posterior ou cadastros forem arquivados após a confirmação. Conteúdo divergente é conflitoIdempotencia. Somente no ramo de recibo ausente validar estados/erros do preflight e rejeitar referências atualmente inválidas ou preparação incompleta, antes de qualquer efeito.
3. Para criação/imediato, não ler origem nem cadastros no callback. Preparar set de origem version=1, evento e patches exatos de primeiro uso. Rules distinguem create de update e recusam sobrescrita de origem existente.
4. Para outros comandos, ler origem, validar schema, revisão esperada, estado e transição. Reversão lê também evento original e marcador determinístico. Todas as leituras precedem escritas. Não consultar histórico inteiro dentro da transação; a projeção protegida é verificada indutivamente pelas Rules e auditável pelo histórico.
5. Gravar origem/evento e, quando necessários, patches cadastrais ou marcador. Não gravar uma liquidação adicional em coleção genérica. Primeiro uso não altera conteúdo/version cadastral. Atualização financeira incrementa apenas revisão da origem, com delta exato do fato.
6. Confirmar somente após commit remoto e nova checagem de geração. Retry automático do SDK recalcula sobre dados lidos, mas expectedVersion permanece fixo: versão mudada exige releitura/confirmação do usuário. Não dividir comando nem ajustar valor silenciosamente.

Concorrência de primeiro uso pode invalidar o patch após preflight. Após falha, consultar recibo; se não confirmado, refazer preflight e reenviar a mesma intenção, sem alterar payload/expectedVersion. Não fazer loop infinito de permission-denied: uma repetição guiada por diferença concreta de metadado; persistindo, informar falta de permissão/configuração.

## Retorno e confirmação perdida

Confirmado: estado=confirmado, origemId, eventoId, resultVersion e fatoId quando presente; repetição de intenção com efeito confirmado retorna mesmos IDs. semAlteracao exige expectedVersion atual e significa edição sem diferença ou cancelamento já realizado: retorna versão atual, sem escrita/recibo/reserva persistente de chave. Não é confirmação persistida nem promessa de resposta idêntica em retomada; repetir reavalia a versão e pode conflitar. Sem recibo não existe corpo anterior para comparar: conflitoIdempotencia por conteúdo diferente aplica-se a chave com recibo existente. Ao receber semAlteracao, cliente encerra intenção e remove descritor; qualquer nova intenção usa nova chave. Conflitos trazem código e necessidade de reler, sem dados de outro UID.

consultarOperacao aceita comandoCompleto ou descritor. Comando completo compara conteúdo normalizado; descritor só identifica resultado e exibe conteúdo confirmado, sem alegar comparação com formulário perdido. Estados: confirmado, ausenteConfirmado (leitura remota), indeterminado. Ausência num cache offline nunca é confirmação de ausência.

Descritor mínimo de retomada em sessionStorage: uid, tipo, operationKey, origemId, expectedVersion e contractVersion. Não guardar descrição, valores, conta, motivo, token ou senha; não reenviar descritor como comando. Formulário completo fica em memória da sessão. Em recarga, consultar recibo e mostrar resultado, ou indicar que os campos precisam ser reconstituídos sem criar automaticamente nova intenção. Apagar descritores no logout/troca/invalidação; respostas tardias descartadas pela geração.

## Erros e limites

Reutilizar valorInvalido, limiteMonetario, dataInvalida, referenciaInvalida, naoEncontrado, conflitoVersao, conflitoIdempotencia, limiteOperacional, semPermissao, indisponivel, cotaExcedida, esquemaIncompativel e confirmacaoIndeterminada. Se necessário, ampliar união com excessoPendente e integridadeIndeterminada, com mensagem acionável; não usar números negativos como código de estado. Índice ausente usa configuracaoPendente existente sem expor URLs ou detalhes internos do projeto.

Rejeitar comandos >tetos antes do envio. Nunca usar uma opção de simulacao da 003 para habilitar adaptador remoto. Criar perfil operacional externo específico após prova das Rules, sem liberar séries/recorrências.
