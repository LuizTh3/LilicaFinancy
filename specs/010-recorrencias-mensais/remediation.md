# Correção T004 — capacidade de item incorporada à ocorrência

## Decisão

O registroO010 já é compra mensal/item1/1. Sua capacidade financeiraJ passa a ser um componente fechado e autoritativo do próprio documento, com valor original, acréscimos/reduções/devolução, categoria efetiva, versão e ponteiro de evento. Não existe cópia correspondente em controlesItensFaturas para esse tipo novo. O controle de faturaG continua obrigatório em controlesFaturas, schema2, e é alterado junto com O/S/R. Itens007 e encargos008 existentes conservam seus caminhos; o resolvedor tipado futuro distingue ocorrenciaRecorrente de parcelaCartao/encargo e busca sua capacidade em O. Não permitir ambos os caminhos como autoridades para a mesma identidade.

## Salvaguardas

1. Capacidade não é removida: ela compartilha versão e fronteira de escrita do item. Controle original e valores de correção não podem reiniciar; capacidade e valor financeiro são reconciliados na regra de O. Cancelamento preserva capacidade/história e retira exigibilidade, sem inventar estorno econômico.
2. G aceita somente deltas exatos e recíprocos de R010 e conserva líquido/histórico; guarda atual de versão é obrigatória. ready fica no R novo obrigatório, não duplicado no ramoG. G/R/S/O não podem ser escritos isoladamente; novidade é provada pela monotonicidade das revisões e eventos create-only.
3. No caminho normal de criação do item, tx.get de cartão não participa do cálculo (cartão vem do snapshot de F); a regra de O revalida cartão ativo no commit. Também não existe tx.get de J separado: a leitura de O já verifica inexistência/versão da mesma autoridade. Não deslocar leituras para preflight escondido.
4. Data de fechamento/ciclo em O é snapshot verificado contra F na criação/transferência, imutável enquanto mantidaF.006 não altera fechamento histórico. Correção em mesmaF pode conferir fechamento por esse snapshot; pagamento/histórico sempre exige G atual, nunca o snapshot. Mudança deF revalida novo cartão/calendário e atualiza doisG atomicamente.
5. Revisão futura lê G atual para cada slot de assinatura a fim de determinar exclusões e impedir omissão. Caso mínimo com um slot soma18; dois slots excedem e são recusados integralmente. Categoria/cartão/etiquetas inalterados conservam referências no mesmo papel; patch novo inclui checagem/primeiro uso no orçamento e pode exceder.
6. Classificação de categoria já é marcada ao criar/revisar padrão. Materialização não repete o primeiro uso; exige categoria ainda ativa e marcador existente compatível. Nova referência não pode ser escondida como conservada.

## Ponte de calendário006 e inicialização

F006 existente continua autoridade de calendário. G010 é autoridade financeira separada, não substituída por versaoConteudo do calendário. Inicialização de G zero só é permitida por ramo específico de protocolo que comprove calendário006 e ausência anteriorG. A prova depende de todos os caminhos de criação de itens exigirem G preexistente e nenhuma exclusão de G ser possível; fontes007/008 futuras precisam aderir antes de publicação. Documento legado de formato/ciclo não certificado exige migração/inventário explícitos; nunca atribuir saldo zero de query vazia. O candidato precisa provar esse ramo e negar inicialização tardia/reset.

Ajuste006 em F que já possuiG deve incrementar também G e manter seus campos financeiros exatos, com testemunha operacoesFaturas006. A guarda de F exige pós-G recíproco; o ramoG exige F/recibo006 válidos. Leitor006 continua entendendo calendário schema1/versaoConteudo1; o protocolo financeiro consta de G. Essa é uma variante explícita010, que deve ser harmonizada com o protocolo008 antes de habilitar seus pagamentos. Não habilitar fluxo legado capaz de alterar conteúdo/controles à parte.

## Resultado aritmético

Materializar assinatura: S3+O4+R3+G1+cinco autorizações de leitura=16. Revisar futuras em assinatura, com um slot e referências conservadas: S7+Vantiga1+Vnova1+R3+O1+G1+quatro leituras=18. O antigo grafo21 permanece como teste de rejeição, sem ser tratado como caso mínimo do redesenho. Campos opcionais/novas referências podem reduzir o conjunto aceito; tetos não são capacidade garantida.

rules-budget-profiles.json lista mínimos de criação, materialização/confirmar virtual, confirmação/edição persistida, transferência de cartão, revisão/same-boundary, pulo, cancelamento, encerramento, liquidação/reversão, inicializaçãoG e coordenação006. O verificador/testes também conferem o intervalo canônico de futuras, incluindo meses ausentes e corte na próxima revisão.

## Limite da evidência

A correção remove o bloqueio aritmético do desenho descartado. Não compila Rules, não mede1000 expressões nem prova bytes ou integração. T005/T006 devem traduzir esta decisão inteira, sem O/J duplicados e sem controles fictícios. T007 permanece impeditiva até prova executável, inclusive compatibilidade006/008 e todos os casos mínimos. Uma divergência real exige recontar/redesenhar, não dispensar proteção.
