# Contract: Comandos e portas de cartões/faturas

Sem endpoints HTTP novos. Portas TypeScript do domínio retornam `Resultado<T>`, sem importar Firebase/React. Adaptador privado recebe UID, geração de sessão, verificador de geração atual e relógio/fuso explícitos. Nomes abaixo são contratos planejados, ainda não implementados.

## Envelope e comandos

Comando mutante tem exatamente `contractVersion:1`, `tipo`, `operationKey`, `alvoId`, `expectedVersion` e `payload` da variante. IDs/versionamento/esquemas em [data-model.md](../data-model.md). Remover espaços externos antes da confirmação e comparar conteúdo canônico completo, inclusive tipo/alvo/revisões. Não aceitar campos desconhecidos, null no lugar de ausência, coerção de tipos ou chave gerada dentro de callback transacional.

| tipo | alvo / versão | payload fechado |
| --- | --- | --- |
| criarCartao | novo cartaoId; expectedVersion0 | banco,nome,titularId,diaFechamento,diaVencimento; estado ativo definido pela operação. |
| editarCartao | cartão ativo; revisão atual | Os mesmos cinco campos de negócio. |
| arquivarCartao | cartão; revisão atual | Mapa vazio; conteúdo anterior obrigatoriamente preservado. |
| confirmarFatura | ID derivado; expectedVersion0 | cartaoId,competencia,cartaoVersion e calendário proposto completo: inicio,fechamento,vencimento,calendarioOrigem. |
| ajustarVencimento | fatura existente; revisão atual | vencimento,motivo. |

expectedVersion exige inteiro seguro≥0; resultVersion seguro=expectedVersion+1. Sem tipo para compra, parcela, pagamento, cancelamento, reativação ou exclusão. Escolher primeira fatura é ação de prévia, não uma compra oculta.

## Portas

- `PortaCartoes.executar(comando)`, `obter(cartaoId)`, `listar(filtro,pagina,cursor)` e `consultarOperacao(consulta)`.
- `PortaFaturas.executar(comando)`, `obter(cartaoId,competencia)`, `listar(consulta)` e `consultarOperacao(consulta)`.
- `PortaPreviaFatura.prever(cartaoId,dataCompra,escolhaExplicita?)`: resultado com contexto das revisões e candidatos, sem escrita.
- `consultarOperacao` aceita comando completo para comparar conteúdo ou descritor mínimo `{tipo,operationKey,alvoId,expectedVersion}`. Descritor permite recuperar resultado após recarga, mas não comprova igualdade de payload ausente; indicar modo de verificação no retorno. Sem recibo e sem payload original, não reconstruir/reexecutar intenção presumida.

Retornos mutantes:

| Resultado | Significado |
| --- | --- |
| confirmado | Efeito com recibo, alvoId, resultVersion e eventoId; revisão do resultado é histórica, mesmo se o alvo já mudou. |
| existente | Confirmação da mesma competência encontrou calendário idêntico já persistido; retorna identidade/revisão atual, sem criar recibo para esta chave. |
| semAlteracao | Edição normalizada sem diferença, mesmo vencimento ou arquivamento já realizado, somente com revisão atual; sem escrita/recibo/reserva da chave. |

`existente` e `semAlteracao` encerram a intenção local. Não são confirmações persistidas recuperáveis por sua chave; nova intenção posterior usa nova chave. Repetição do comando antigo reavalia versão/estado e pode conflitar. Mesma chave já confirmada com outro conteúdo gera conflitoIdempotencia, nunca sucesso semAlteracao.

Consulta de operação retorna confirmado, ausenteConfirmado ou indeterminado; ausência deve vir de leitura remota confiável. Falha de conexão nunca equivale a ausência.

## Execução e concorrência

1. Validar forma/canonicalização e contexto da sessão. Callback lê recibo primeiro; se existe, comparar comando/descritor e recuperar resultado antes de revalidar atividade atual do cartão/titular.
2. Sem recibo, ler primário e referências necessárias, todas antes das escritas. Confirmar fatura lê também cartão e quatro competências vizinhas, incluindo ausências; comparar revisão do cartão com a exibida na prévia. Herança de limite usa somente vizinho com snapshot válido já existente no pré-estado; ausente antes significa cálculo pelo padrão validado, nunca por outro documento novo no mesmo lote. Repetição interna não altera expectedVersion/cartaoVersion silenciosamente.
3. Calcular transição pura, validar calendário e fronteiras, gravar primário/evento com IDs estáveis e timestamps de servidor. Nenhum toast, navegação ou atualização de estado dentro do callback.
4. Conferir geração após await. Somente confirmação remota apresenta sucesso. Em resposta perdida, consultar a mesma intenção; persistir descritor mínimo no sessionStorage e manter conteúdo só em memória da sessão. Nova chave automática é proibida.

Ao confirmar fatura que já existe: calendário apresentado idêntico ao atual → existente, sem escrita; divergência → conflitoVersao com convite a revisar o calendário confirmado. Duas intenções concorrentes para a mesma competência disputam ID único; perdedora não sobrescreve nem registra evento fictício. Se cartão foi arquivado depois de uma confirmação, recuperar recibo ainda é permitido; confirmar período novo continua negado.

Ajuste usa somente fatura+evento, inclusive com cartão arquivado; datas e âncoras históricas não mudam. Variante com itens não é suportada. Não transportar liquidações ou reatribuir primeira fatura.

## Erros e recuperação

Reutilizar CodigoErro existente: valorInvalido/dataInvalida/referenciaInvalida, naoEncontrado, conflitoVersao, conflitoIdempotencia, limiteOperacional, semPermissao, indisponivel, cotaExcedida, esquemaIncompativel, confirmacaoIndeterminada, configuracaoPendente e integridadeIndeterminada.

- Datas/campos → corrigir entrada específica, sem truncar.
- Revisão ou calendário incompatível → reler e apresentar diferenças; não mudar vencimento/sugestão em silêncio.
- Permissão → verificar sessão, sem revelar se documento alheio existe.
- Índice/configuração → instrução acionável, sem imprimir URL de console ou detalhes privados do erro SDK.
- Indisponibilidade/cota → preservar entrada e chave na mesma sessão; repetir/consultar a mesma intenção.
- Esquema desconhecido ou calendário inconsistente → falha fechada, sem regravação corretiva automática.

Logout/troca de UID/invalidação limpa descritores006 e resultados; resposta tardia é descartada. Não reenviar chave de sessão anterior sob outro UID.
