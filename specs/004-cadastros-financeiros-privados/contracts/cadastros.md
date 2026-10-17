# Contracts: Casos de uso e interface de cadastros

## Fronteira e tipos

Contratos TypeScript puros, específicos de titulares/categorias/contas/etiquetas. Resultado<T> e códigos de erro da 003. Repositório é construído para sessão pronta e UID capturado; métodos não recebem UID/path arbitrário. União discriminada fecha campos de cada coleção; helper interno não concede CRUD de qualquer path.

Entrada comum de comando: contractVersion=1, operationKey estável, colecao, cadastroId, expectedVersion, tipo e dados completos normalizados. Criar usa version esperada 0, estado ativo e ID previamente alocado. Editar usa versão lida e estado ativo. Arquivar não recebe dados financeiros editados: lê conteúdo atual e altera somente estado. Chave nova somente para intenção nova após confirmação/conflito resolvido.

Saída de mutação: confirmado {cadastroId, version, reciboId}, semAlteracao {cadastroId, version}, ou erro discriminado. Confirmação original por repetição não afirma que a versão ainda é a atual.

| Capacidade | Entrada | Saída/garantia |
| --- | --- | --- |
| listarCadastros | coleção fixa, filtro ativo/arquivado/todos, pageSize 1..50, cursor opcional | Itens decodificados, próximo cursor ou fim; leitura remota. Página de 50 pode exigir consulta adicional para provar fim. |
| obterCadastro | coleção fixa e ID válido | DTO atual ou naoEncontrado; sem expor existência de outro UID. |
| criarCadastro | intenção e conteúdo válido, expectedVersion=0 | Cadastro+recibo atômicos; repetir chave/conteúdo retorna original. |
| editarCadastro | intenção, ID, versão lida e conteúdo completo | Conflito em versão diferente, sem rebase automático. Campos opcionais removidos explicitamente por ausência no conteúdo completo. |
| arquivarCadastro | intenção, ID e versão lida | Confirmação após alteração atômica; conteúdo preservado; repetir não altera novamente. |
| consultarOperacaoCadastro | União discriminada: modo comandoCompleto com comando original, ou modo descritor com operationKey/colecao/cadastroId/tipo/expectedVersion/reciboId | confirmado com versão original e modo de verificação, ausenteConfirmado ou indeterminado; comparar conteúdo somente em comandoCompleto. UID sempre vinculado à sessão. |
| consultarBloqueioDeUso | categoria/conta e ID | Sem uso conhecido, bloqueado ou integridade inválida; somente leitura, nunca setter público. |

### Modos de consulta da operação

- **comandoCompleto**: derivar o recibo do comando original; comparar operationKey, coleção, cadastroId, tipo, expectedVersion e conteúdo normalizado. Confirmação informa verificação por comandoCompleto. Chave igual com conteúdo diferente é conflitoIdempotencia; outra chave na versão pretendida é conflitoVersao.
- **descritor**: sem conteúdo do formulário, validar o descritor e derivar/conferir o recibo determinístico no UID da sessão; comparar operationKey, coleção, cadastroId, tipo e expectedVersion. Confirmação informa verificação por descritor e apresenta os dados do recibo para conferência. Não afirmar igualdade com formulário perdido; não autorizar reenvio automático ou escrita por esse modo.
- Ambos consultam remotamente e retornam indeterminado se a confirmação não puder ser obtida. Ausência confirmada em uma leitura não prova que tentativa anterior em trânsito não confirmará depois. Ao reconfirmar uma criação, preservar cadastroId conforme o passo 6; só um novo comando completo explicitamente confirmado pode iniciar escrita.

## Algoritmo transacional contratado

1. Capturar UID/geração da sessão pronta; validar entrada e congelar intenção antes de I/O. A UI desabilita envio concorrente da mesma intenção.
2. Callback lê recibo determinístico, cadastro e dependências necessárias antes de qualquer escrita. Se recibo existe, comparar operationKey e comando normalizado: mesma intenção retorna confirmação; chave igual/conteúdo diferente gera conflitoIdempotencia; outra chave para a versão gera conflitoVersao. Nunca sobrescrever recibo.
3. Sem recibo, exigir ausência do cadastro na criação ou expectedVersion exatamente atual na edição. Não atualizar expectedVersion quando runTransaction repetir callback. Verificar estado e controle de uso, além do titular quando necessário.
4. Sem mudança efetiva ou arquivamento já concluído, retornar semAlteracao sem escrita. Caso contrário, gravar cadastro e recibo com timestamps de servidor. Nenhum efeito de UI, geração de chave ou email no callback.
5. Confirmação da transação permite indicar sucesso. Se resposta/estado permanecer indeterminado, consultar recibo remotamente pela mesma intenção; não concluir ausência com cache/offline. Recibo confirmado restaura o resultado; consulta indisponível mantém indeterminado.
6. Após recarga, retomar intenção do mesmo UID. Guardar em sessionStorage apenas descritor mínimo {uid,operationKey,colecao,cadastroId,tipo,expectedVersion,reciboId}; dados de formulário sensíveis não persistem ali. Se ainda for necessário reenviar após ausência remota, exigir reentrada/reconfirmação do conteúdo com nova intenção; nunca reaproveitar chave com conteúdo desconhecido. Na criação, manter o mesmo cadastroId mesmo ao reconfirmar conteúdo com chave nova, pois uma tentativa anterior ainda em trânsito pode confirmar depois da leitura de ausência; conflito no mesmo ID impede duplicação. Não alocar outro ID enquanto essa intenção estiver pendente. Após recarga sem o formulário, o descritor identifica a operação confirmada por chave/entidade/tipo/versão, mas não comprova igualdade com um conteúdo digitado que não foi retido; apresentar os dados do recibo para conferência e recarregar o cadastro atual. Comparação integral de payload só é afirmada quando o comando original ainda está disponível.
7. Ao sair/trocar UID, apagar descritores, entradas e resultados privados; respostas atrasadas são descartadas por SessionGeneration. Repositório verifica sessão atual antes de iniciar qualquer tentativa. Comando já aceito pelo servidor pode concluir no UID original, mas nunca migrar para o seguinte.

## Erros e confirmação

- valorInvalido/dataInvalida/limiteMonetario: apontar campo e preservar entrada na mesma sessão.
- referenciaInvalida: titular indisponível/arquivado ou ID inválido; atualizar seleção sem expor outro UID.
- conflitoVersao: informar alteração concorrente e reler; não aplicar formulário antigo à nova versão automaticamente.
- conflitoIdempotencia: bloquear tentativa com mesma chave e dados diferentes; consultar resultado antes de nova intenção.
- semPermissao: sessão/acesso não confirmado; não usar mensagem para enumerar outros usuários.
- indisponivel/cotaExcedida: orientar nova tentativa e preservar a identidade; confirmar recibo antes de repetir escrita cuja resposta se perdeu.
- esquemaIncompativel: leitura identificada como incompatível e escrita bloqueada; não converter/apagar campos extras.
- confirmacaoIndeterminada: estado explícito verificando confirmação, sem toast de sucesso ou novo cadastro automático.

## Contrato de interface

Rotas dentro de SessionGate: /app/cadastros e /app/cadastros/titulares, /categorias, /contas, /etiquetas. Validar parâmetro de rota contra enum; tipo inválido mostra página não encontrada e não acessa coleção. Mesmo acesso de usuário comum e admin aos próprios cadastros, sem AdminGate adicional.

Listas mostram nome, estado e campos relevantes (natureza/tipo); ações criar, editar ativo e arquivar ativo. Filtros ativos/arquivados/todos, próxima página e recarregar. Ordenação por nome do armazenamento, sem prometer colação regional ou busca global. Pós-mutação reinicia paginação. Formulários podem permanecer na página.

Estados: carregando → vazio/lista/erro; formulário edição → validando → enviando → confirmado/erro/confirmacaoIndeterminada. Usar rótulos, erros vinculados ao campo, foco no primeiro erro, aria-live para status e confirmação de arquivamento navegável por teclado. Impedir ação duplicada enquanto envia; não mostrar vazio durante falha. Adaptar tabela/lista à largura de celular.

Titular: somente nome. Categoria: nome e natureza. Etiqueta: nome livre, com explicação de agrupamento/projeto sem exemplos pessoais fixos. Conta: nome, tipo, titular opcional e opção informar saldo inicial; ao ativar exige valor, posição e data-base. Sem base, mostrar base não informada; com base, saldo inicial informado/data e saldo bancário não confirmado. Não calcular saldo atual nesta feature.

Seleção de titular carrega ativos em páginas de até 50, com continuar carregando; vínculo histórico arquivado aparece por leitura pontual como valor atual não selecionável para novo vínculo. Nunca presumir que lista parcial comprova ausência/propriedade. Primeiro uso bloqueia somente campos definidos no modelo, com explicação visível.

Confirmação de arquivamento informa preservação histórica, bloqueio de novos vínculos e ausência de reativação no mínimo. Em conta, informa que futuros pagamentos/recebimentos exigirão conta ativa. Não criar tela de liquidação nesta feature.

## Consumidores futuros

Conta efetiva de todo novo pagamento/recebimento deve estar ativa e pertencer ao UID; conta prevista arquivada permanece no compromisso. Cada categoria/titular/conta/etiqueta nova precisa de verificação remota individual, não apenas dropdown. Atualização preserva arquivado apenas se a mesma relação já existia no mesmo registro. A habilitação financeira deve atender security.md, sem abrir coleções antecipadamente.
