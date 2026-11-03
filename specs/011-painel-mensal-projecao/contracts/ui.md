# Contract: Interface011

## Rotas e navegação

Substituir placeholder autenticado de `/app` por PainelPage mensal. Criar `/app/projecao` para PainelAnualPage. URL permite somente base e mês inicial válidos, sem dados financeiros,snapshot,cursor ou token. Filtros com IDs privados ficam no estado da sessão; troca de usuário limpa tudo. Home pública/login/admin permanecem existentes.

Cabeçalho autenticado oferece Visão mensal/12 meses; mensal tem anterior/próximo,mês/ano e hoje. Janela tem início selecionável e ações de avançar/retroceder um mês ou12 meses identificadas. Cada coluna/linha mensal abre o mês; retorno conserva base/período/filtros válidos. Não renderizar meses fora de1900–9999: impedir navegação que não comporte a janela inteira.

## Conteúdo por base

Planejamento: receitas previstas,recebidas das receitas do recorte,a receber,compromissos,liquidado dos compromissos,pendente e resultado previsto. Agrupar compromissos em faturas por cartão/titular,externas avulsas,parcelas externas/empréstimos e recorrências externas. Recorrência de cartão aparece dentro da fatura; não criar segundo grupo somável. Totais pagos não removem o compromisso. Vencimento é coluna informativa, competência determina recorte.

Caixa: entradas/saídas efetivas,recebimentos,pagamentos,devoluções e inversões com data/conta e resultado de caixa. Rótulo explica que pagamentos de outro mês de competência pertencem aqui pela data real. Transferência interna não entra em receitas/despesas consolidadas. Mostrar resultado sem alegar saldo disponível.

Consumo: gastos na origem e reduções por categoria/etiqueta, com data de consumo/efeito e origem rastreável; compra parcelada aparece integralmente na origem. Não mostrar parcelas,pagamentos ou fatura como despesas adicionais. Não atribuíveis encontrados são explicitados, sem supor ano/data/valor original.

Todos: base e período sempre visíveis, moeda pt-BR, estado estimado/confirmado e virtual/persistido distinguíveis. No total projetado de fatura, discriminar valor confirmado e previsão virtual e mostrar componente estimado. Não rotular virtual como lançamento confirmado ou compromisso já exigível do emissor.

## Filtros e detalhamento

Controle por período,titular,cartão,categoria,etiqueta, com ativos/limpar. Rótulos explicam união dentro da dimensão e interseção entre elas. Incompatibilidade mostra motivo junto do indicador, sem valor0. Não esconder filtro aplicado ao mudar base; pedir limpeza ou marcá-lo incompatível até escolher combinação válida.

Categoria/etiqueta de fatura mostra “Itens selecionados — parte da fatura”, subtotal selecionado e contexto integral separado. Pendente integral não aparece como pendente da categoria; não calcular resultado global do recorte parcial. Caixa com categoria/etiqueta não presume quais itens foram pagos; subconjunto externo, se exibido, é explicitamente parcial quanto à comparação global.

Primeiro nível explicativo de um indicador abre em uma ação; a partir de12meses, abrir mês e detalhe exige no máximo duas. PainelDetalhe usa mesmo snapshot. Se expirar ou detalhe precisar de novo momento, avisar e atualizar resumo/detalhe juntos; detalhe atualizado isoladamente não pode continuar alegando que explica valor antigo.

Abrir registro de origem navega para telas existentes/planejadas005/006–010 somente quando disponíveis. Essas telas podem trabalhar com estado atual; avisar a transição e não confundir com detalhe do snapshot. Não criar link quebrado para fonte ainda ausente; motivo de indisponibilidade e identificação rastreável permanecem.

## Estados e atualização

- Carregando: mensagem identificada e foco preservado; valores ausentes não são placeholders monetários0.
- Parcial: subtotal conhecido, fontes/subperíodos pendentes, limite atingido e botão Continuar. Página vazia filtrada ainda pode ter continuação.
- Completo: instante comum de consulta e todos os dados aplicáveis reconciliados; estimativas continuam marcadas.
- Atualizando: visão anterior coerente identificada como anterior/desatualizada ou carregamento/parcialidade. Não atualizar partes isoladas de um total completo. Promover nova visão integralmente.
- Indisponível: motivo claro de fonte,filtro ou pré-requisito; exemplo “Saldo calculado indisponível: faltam saldo inicial datado e movimentos completos”. Saldo não é implementação obrigatória desta etapa.
- Erro/cota/permissão/integridade: ação compatível de tentar novamente/reler/verificar acesso, sem loop automático ou cálculo alternativo silencioso.
- Vazio: somente após esgotar fontes aplicáveis; distinguir vazio real de dependências ausentes.

Projeção pura não materializa. Caso futuramente interface ofereça gerar010, usar ação/estado do próprio fluxo010 e iniciar nova visão após confirmação.011 não inclui geração em lote, quitação ou transferência novas.

## Acessibilidade e aceitação

Tabelas com caption/cabeçalhos; no celular rolagem da tabela com identificação de coluna/mês e totais legíveis, sem exigir hover. Todos os filtros,links e ações acessíveis por teclado; estados anunciados sem roubar foco. Texto/símbolo acompanha cor de déficit,estimativa e parcialidade. Erros ligados ao controle relevante. Preservar SkipLink e semântica de AppShell.

Aceitação com cinco participantes: pelo menos quatro distinguem bases e resultado versus saldo sem ajuda em até3min. Verificar açõesSC005, teclado,desktop/celular e retorno de detalhe. Não exigir gráficos,animação ou biblioteca visual.
