# Contract: Consultas mensais, detalhe e interface

## Leituras consistentes

PortaConsultarExternos recebe base planejamento/caixa, competência YYYY-MM, natureza receitas/despesas/ambas, filtros de situação/categoria/titular e pageSize 1..50. Retorna itens, cursor por fonte, completo, snapshotAt e motivos de parcialidade. Cursor carrega UID/geração, readTime, parâmetros, ordenação e posições; não contém token ou caminho arbitrário. Alterar consulta/UID invalida cursor e resultados anteriores.

Adaptador externosSnapshotReader usa somente host firestore.googleapis.com, projeto/database configurados e prefixo users/{uid} da sessão. Operações permitidas são runQuery e batchGet de leitura com schemas fixos. Authorization usa ID token atual em memória; não usar token de conta de serviço. SDK é mantido para mutações, preflight e confirmação de operação.

1. Consulta inicial pequena de referência (limit1, caminho privado fixo) obtém readTime T do servidor; seu resultado não é usado para total.
2. Toda consulta real, inclusive primeira página, repete com readTime=T explícito. Planejamento usa duas queries limitadas, natureza+competência, ordenadas por dataPrevista/vencimento e __name__. Combinar por data/ID sem perder posição de cada fonte.
3. Próximas páginas e batchGet de dependências usam T idêntico; batchGet de até oito documentos por requisição. Validar recursos retornados no mesmo prefixo e schemas, inclusive documentos ausentes; não confiar em paths de respostas.
4. T expira em até50 minutos (margem frente à janela recente suportada). Após expiração, troca de filtro, escrita confirmada na sessão ou retorno ao foco, invalidar e reiniciar a consulta; nunca juntar páginas de snapshots diferentes. Mostrar instante da consulta e botão Atualizar. Outro usuário nunca compartilha T/cursor.
5. Totais definitivos só após exaurir cada fonte, hidratar dependências e validar todos os registros do mesmo T. Falha, cota ou token expirado preserva conteúdo como parcial, sem afirmar total final. Expiração de snapshot exige reinício, não PITR pago ou consulta sem T.

readTime é revisão comum da consulta, não fechamento contábil histórico editável. Formulário de confirmação usa estado atual via transação/expectedVersion, não transforma snapshot antigo em permissão. Nenhum listener sobre todo o histórico e nenhum contador global adicional nas escritas.

## Planejamento e caixa

Planejamento seleciona origens pela competência independente das outras datas. Para ativas, total original sempre soma, mesmo liquidada. Liquidado líquido e pendente apresentados como posição na consulta. Canceladas ficam em filtro/indicador próprio, sem somar total ativo. Não chamar resultado de saldo bancário disponível.

Caixa consulta eventos por fato.dataEfetiva no intervalo [primeiro dia do mês, primeiro dia do próximo), exceto mês limite9999-12, que usa teto inclusivo9999-12-31. Cada evento tem no máximo um fato; consultas excluem naturalmente eventos sem esse campo. Ordenar dataEfetiva e __name__. Dependências pontuais: origens para rótulos/filtros, original de cada inversão e marcadores de reversão necessários. Dependências não entram novamente como itens consultados.

Neutralizar pagamento/recebimento equivocado e sua reversão na mesma data financeira original, retirando ambos dos totais brutos de entradas/saídas econômicas. Mostrar ambos no histórico com vínculo/motivo/instante da correção. Reembolso real não é tipo aceito nesta porta. Não implementar neutralização apagando documentos ou movendo o fato para mês da correção.

Situação/categoria/titular filtram o conjunto do snapshot e os totais correspondentes. Não filtrar apenas as linhas já carregadas e chamar resultado de total mensal. Durante paginação, rotular total do recorte carregado e informar páginas pendentes. Hidratação usa categoria/titular da origem naquele snapshot; nomes atuais dos cadastros podem ser exibidos como nomes atuais, sem mudar vínculo/ID.

## Detalhe e auditoria

obterDetalhe(origemId, pageSize, cursor) usa origem/eventos/marcadores em T comum e eventos ordenados por resultVersion, ID. Não precisa concluir todo o histórico para exibir cabeçalho/projeção protegida; indicar histórico parcial. Auditoria de integridade e totais reconstruídos exigem todas as páginas, conforme data-model. Após ação, recarregar detalhe e mês. Excesso/versão obsoleta não ajusta formulário automaticamente.

## Rotas e formulários

- /app/lancamentos: mês, planejamento/caixa, receitas/despesas/ambas, filtros mínimos, resumo e lista paginada, ações Nova receita, Nova despesa e Gasto imediato.
- /app/lancamentos/:origemId: conteúdo e valores, histórico paginado e ações disponíveis por estado. Proteger com SessionGate; inserir navegação no AppShell. Admin financeiro continua restrito ao próprio UID.
- Origem: descrição, categoria por natureza, valor pt-BR, estimado, competência, data prevista/vencimento, data de ocorrência obrigatória para despesa, opcionais titular/conta prevista/observação/etiquetas. Ocorrência sugerida hoje no fuso do perfil e corrigível antes de salvar; os quatro campos temporais não se sobrescrevem.
- Liquidação: valor inicialmente sugerido pelo pendente confirmado, data real inicialmente hoje, conta ativa obrigatória; origem e saldo visíveis. Conta prevista não é seleção automática oculta; se usada como sugestão deve aparecer e continuar válida na confirmação.
- Gasto imediato: mesma origem mais data real/conta efetiva e uma confirmação; valor do pagamento integral igual à obrigação. Prevista e efetiva podem ser diferentes, sem substituir histórico.
- Cancelamento: motivo obrigatório, impacto sobre planejamento e ausência de liquidação válida. Reversão: selecionar fato, motivo, conta/data/valor herdados somente leitura, impacto e texto distinguindo erro de devolução real.

Origem com jaLiquidada=true não oferece editar conteúdo. Se erro de origem, oferecer roteiro explícito reverter fatos válidos → cancelar → criar substituição ligada; etapas incompletas permanecem visíveis. A ausência de fluxo de reembolso é informada junto à reversão, sem gerar crédito manual presumido.

## Sessão, acessibilidade e feedback

SessionProvider/useSession devem expor timezone validado do perfil e geração atual. Não copiar o hoje fixo da página cadastral. Limpar lilica-externo-pendente e dados privados ao logout/UID inválido, junto ao mecanismo cadastral existente. Abortar fetch com AbortController e ainda checar geração em toda resposta.

Rótulos associados aos campos, fieldset/legend para opções, teclado, foco no erro, descrição de ajuda e live region para envio/erro/confirmação. Estado não depende só de cor. Botões de confirmação bloqueiam duplo envio da mesma intenção; isso complementa, nunca substitui, idempotência na persistência. Preservar formulário em memória após erro recuperável e oferecer retomar/verificar a mesma operação.
