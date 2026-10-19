# Contract: Consultas, índices e interface

## Consultas privadas

Todas usam caminho users/{uid}, sessão pronta, origem remota confirmada e limite1–50. Contexto de cursor inclui UID/geração/filtros/ordenação; cursor alheio ou de consulta diferente é recusado. Nenhuma varredura de todo histórico, collectionGroup global ou lista ilimitada. Não listar recibos de outro usuário para descobrir identidades.

| Consulta | Filtros/ordenação | Paginação / resultado |
| --- | --- | --- |
| Listar cartões | estado ativo/arquivado/todos; nome asc, documentId asc | startAfter(nome,id), até50; nomes iguais não pulam registros. |
| Obter cartão | cartaoId validado | get remoto; titular atual resolvido no caminho privado. |
| Listar faturas | cartaoId==selecionado; competencia entre início/fim inclusivos; competencia asc, documentId asc | startAfter(competencia,id), até50, sem reduzir o domínio ao ano atual. |
| Obter fatura | cartaoId + competencia → ID determinístico | Existente retorna snapshot; ausente ativo permite prévia, arquivado mostra ausência. |
| Histórico de eventos | alvoId==selecionado; resultVersion asc | startAfter(resultVersion), até50; eventos imutáveis, lacunas são erro de integridade. |
| Recuperar operação | tipo + operationKey | get remoto; permitido mesmo se alvo foi arquivado depois. |
| Snapshots contendo compra | cartaoId==selecionado; inicio<=dataCompra; fechamento>dataCompra; inicio asc, fechamento asc, documentId asc | limite2; dois resultados já indicam ambiguidade. Não exigir toda coleção para decidir. |

Uma página cheia não comprova fim; manter cursor/indicação de mais resultados até próxima página vazia ou curta. Listas mostram posição atual, não fotografia contábil histórica. Não exibir agregado do intervalo como definitivo sobre páginas incompletas; nesta etapa não há agregado financeiro de intervalo, apenas total derivado0 em cada fatura da variante vazia.

Consulta/retomada preserva escolha explícita, mesmo se diferir da sugestão. Atualizar não modifica snapshots. Mudanças no cartão/versões entre prévia e confirmação exigem revisão informada; confirmar fatura valida dependências de novo. Leitura de fontes em instantes distintos é aceitável apenas para prévia rotulada, nunca prova de confirmação; descartar respostas de geração antiga.

## Algoritmo de prévia sem escrita

1. Validar data financeira, cartão ativo e sessão. Buscar snapshots contendo a compra com a consulta acima. Dois encontrados → conflito, sem escolher arbitrariamente. Esquema desconhecido/inconsistente → falha fechada.
2. Construir candidatos não confirmados pelas competências do mês da compra, +1 e +2. Para cada candidata consultar seu ID e quatro vizinhos; unir/deduplicar leituras (no máximo sete competências consecutivas), além do cartão. Padrões têm fechamento no mês da competência ou no anterior e início até dois meses antes; portanto não há outro candidato novo possível. Snapshots históricos são buscados pela consulta de contenção, não presumidos por essa janela.
3. Calcular limites respeitando vizinhos, janelas e ausência de sobreposição; candidato impossível não é apresentado como válido. Comparar inicio≤compra<fechamento. Combinar com snapshots encontrados, deduplicando por identidade: um → sugestão; zero → ausência; mais de um → conflito. Não confundir duas linhas da mesma fatura com conflito.
4. Escolha explícita válida do mesmo cartão/UID prevalece, inclusive competência distante ou ciclo fechado. Se o período não existe, construir e validar sua prévia com seus próprios vizinhos; não materializar meses intermediários. Exibir calendário e origem da escolha.
5. Prévia não grava nada, não confirma compra/fatura nem cria parcela/pagamento. Eventual confirmação usa o comando específico e releitura transacional. Solicitação de compra no fechamento pertence ao ciclo seguinte, inclusive no caso30/31 de28/02/2027.

Não prometer isolamento de snapshot entre a consulta e leituras auxiliares: resultados são previsões corrigíveis. Uma inserção/edição concorrente exige nova conferência na confirmação; não transformar ausência previamente lida em permissão definitiva. Não reexecutar automaticamente uma escolha explícita sobre novo calendário.

## Índices planejados

Entregar arquivo completo preservando índices anteriores. COLLECTION, não COLLECTION_GROUP:

- cartoes: estado ASC, nome ASC; ID fornece desempate asc. Todos os estados usa índice padrão de nome/ID.
- faturas: cartaoId ASC, competencia ASC.
- faturas: cartaoId ASC, inicio ASC, fechamento ASC, para busca de contenção; duas desigualdades correspondem ao índice e ordenação previstos.
- operacoesCartoes: alvoId ASC, resultVersion ASC.
- operacoesFaturas: alvoId ASC, resultVersion ASC.
- Isenções de mapas comando/resultado/antes dos eventos e calendarioOrigem das faturas; nenhum filtro depende desses mapas.

Conferir índices efetivamente exigidos com consultas reais antes de habilitar; falta de índice gera configuracaoPendente, sem fallback de baixar tudo. Não excluir índices/isencões anteriores nem afirmar READY sem conferência. Sem índice por nome/titular duplicado nas faturas: nomes são dados atuais resolvidos, não autoridade de identidade.

## Rotas e ações

Novas rotas sob SessionGate, sem AdminGate adicional: `/app/cartoes`, `/app/cartoes/:cartaoId/faturas` e `/app/cartoes/:cartaoId/faturas/:competencia`. Parâmetros/query de intervalo sempre validados; nunca compor caminho de proprietário pela URL. Navegação AppShell inclui Cartões e faturas.

- Lista cartões: ativos por padrão, filtros arquivados/todos, banco/nome/titular, criar/editar/arquivar; arquivamento exibe que obrigações permanecem e novas compras ficam impedidas.
- Formulário: banco, nome, titular ativo e dias1–31. Titular arquivado já vinculado aparece legível sem ser opção para novo vínculo. Edição dos padrões informa que faturas confirmadas conservam datas.
- Lista/detalhe de fatura: cartão/banco/titular atuais, mês/ano do vencimento, início inclusivo, fechamento exclusivo, vencimento e aberto/fechado derivado. Futura anterior ao início ainda usa aberto conforme a regra da spec; não adicionar terceiro estado nesta entrega.
- Ausência em cartão ativo: prévia claramente rotulada, sem lançamentos, botão Confirmar fatura. Em arquivado: ausência sem botão de nova confirmação. Existentes continuam acessíveis com indicador do cartão arquivado.
- Detalhe vazio: sem lançamentos, R$0,00 e sem pagamento registrado, sem botão Pagar, item fictício ou marca de pagamento. Ajustar vencimento mostra anterior/novo, motivo e impacto no período, sem mudar competência.
- Prévia primeira fatura: dataCompra, sugestão explicada, aviso de compra no fechamento na seguinte e seleção explícita de período; nenhum botão que aparente registrar compra. Data futura é previsão.
- Histórico: eventos paginados com motivo e anterior/novo de ajuste; leitura de versão atual diferente da exibida exige Atualizar. Não apresentar recorte de eventos como cadeia completa.

Reutilizar formato BRL/calendário do núcleo e estilo mínimo existente. Formulários têm rótulos, teclado/foco de erro, feedback perceptível e botões durante envio. Não depender só de cor. Estados: carregando, vazio/ausente, prévia, enviando, confirmado, confirmação indeterminada, conflito, sem permissão, configuração/cota/indisponibilidade. Preservar entrada na mesma sessão; só confirmar sucesso após resposta remota. Logout/invalidação limpa nova chave privada `lilica-cartoes-faturas-pendente` além das anteriores; não persistir conteúdo financeiro completo no sessionStorage.

Observabilidade mínima: códigos de erro, tipo de operação e identificador opaco de correlação, sem payload financeiro, nome/titular, credencial, token, descrição bancária ou mensagem bruta do SDK. Evidência de teste usa dados fictícios e manifesto.
