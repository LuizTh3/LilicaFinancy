# Contract: Interface de compromissos parcelados

Desenho condicionado à solução dos gates de segurança; telas não devem anunciar gravação habilitada por este documento.

## Navegação e cadastro

Rotas propostas: /parcelados e /parcelados/:serieId, sob os mesmos guards de sessão/primeiro acesso dos externos. Lista mensal por ano/mês, tipo, situação e titular; acesso a detalhe da parcela e retorno com filtros preservados. Não colocar empréstimo no formulário de cartão.

Formulário: tipo compromissoExterno/emprestimo, descrição, categoria de despesa, titular/conta prevista opcionais, etiquetas/observação, série completa ou em andamento. Exibir quantidade original, próxima parcela, modo mensal/cronograma explícito e valor original conhecido opcional. Rótulo “Não informado” para original ausente. Não preencher com soma estimada.

Mensal: próximo vencimento e valor por parcela ou total das parcelas a cadastrar; mostrar exatamente P..N. Explícito: linhas completas P..N com valores, vencimentos e competências próprias. Mostrar soma cadastrada, nunca taxa implícita. Data de contratação/consumo somente se conhecida; não usar hoje ocultamente para satisfazer validação.

Conferir prévia antes de salvar. Alteração invalida conferência; duplo clique bloqueado localmente e protegido remotamente pela intenção. Excesso informa limite e ausência de nova série, sem sugerir quebrar a mesma série em cadastros incompletos. Não chamar uma rejeição por orçamento de quantidade inválida quando N<=12.

## Detalhe e pagamentos

Mostrar tipo, P/N, original informado/ausente, soma cadastrada, total planejado das parcelas ativas, liquidado líquido e pendência atual. A soma inicial fica no recibo de cadastro; valores vigentes refletem edições e são rotulados separadamente. Posições anteriores aparecem como não cadastradas; não oferecer quitação presumida.

Tabela por ordinal com valor, competência, vencimento, situação e histórico. Abrir parcela mostra cada pagamento/reversão com conta/data, sem somá-los novamente ao compromisso. Formulário de pagar exige valor/data/conta efetiva e mostra limite da pendência. Reversão de erro mostra efeito na data original e exige motivo/confirmação. Não oferece renegociação de parcial real neste incremento.

## Edição e substituição

Escolha de alcance “esta parcela” ou “esta e futuras não pagas”, enumerando elegíveis e excluídas. Campo de valor não alterado conserva todos os valores atuais; preencher mesmo valor nas elegíveis é ação explícita visível por linha. Edição mensal de vencimento recalcula por ordinal/dia-base, sem compactar protegidas; cronograma explícito exige novas datas individuais. Competência existente não acompanha vencimento silenciosamente.

Cancelamento mostra alvos, motivo e redução da exigibilidade, sem chamar de pagamento. Renegociar mostra seleção antiga, novo cronograma e motivo; confirmar ambos juntos, se viável. Se qualquer parte exceder orçamento ou falhar, nenhuma parte confirma. Pagamentos anteriores e receita vinculada ficam consultáveis na cadeia, sem transporte automático.

## Receita do empréstimo

Ação opcional “Registrar ou vincular entrada”, nunca selecionada automaticamente. Escolher receita existente ou criar receita usando005. Se criar: primeiro confirmar receita, mostrar seu resultado, depois conferir vínculo ao empréstimo em ação separada. Se vínculo falhar, exibir “Receita registrada; vínculo pendente” com acesso à receita e retomada da mesma intenção de vínculo; não repetir criação nem esconder a receita existente. Confirmar recebimento é ação própria e não faz parte do cadastro de série.

O primeiro desenho permite uma receita por empréstimo e não liga a mesma receita a outro empréstimo. Mostrar impedimento para segundo vínculo; correção silenciosa ou transporte para série renegociada não são oferecidos.

## Estados, acessibilidade e segurança de sessão

Carregando, vazio, páginas pendentes, prévia desatualizada, enviando, confirmado, conflito, rejeitado por limite, falha e confirmação indeterminada têm mensagens distintas. Confirmado só após servidor; indeterminado oferece consultar mesma tentativa. Preservar entrada na sessão, sem prometer rascunho após fechar navegador. Não usar só cor; rótulos associados, teclado, foco no erro e anúncio de confirmação em celular/desktop. Logout limpa cache/intenções e respostas tardias são descartadas pela geração da sessão.

## Concorrência e completude do agregado

Qualquer pagamento ou revisão na mesma série pode invalidar a prévia, mesmo de outra parcela; informar conflito e pedir nova conferência. O armazenamento finito não muda as identidades ou pagamentos individuais exibidos. Paginar no máximo50 linhas de parcelas, continuando mapa/páginas físicas no cursor para não omitir posições. Nenhum evento financeiro é inferido pela expansão da série.


## Página parcial e referências iniciais

O formulário usa categoria/titular/conta prevista/etiquetas comuns na criação; o cronograma explícito permite valores, datas e competências por linha. Edição posterior altera apenas o escopo conferido. Na listagem mensal, filtro local pode esgotar o teto de duas páginas físicas sem encontrar linhas: mostrar “Nenhum resultado neste trecho; continuar busca” e cursor, não “mês vazio”. Exibir até50 parcelas por página, preservar corte no meio da série e deixar usuário continuar; não completar silenciosamente por leitura de todo o recorte. Ordenação de apresentação estável por série/ordinal, com vencimento visível em cada linha.
