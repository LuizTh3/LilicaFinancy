# Contract: Interface010

Rotas /recorrencias e /recorrencias/:serieId sob guards de sessão/primeiro acesso; detalhe da ocorrência por mês estável. Lista mensal e janela até12 meses, navegável entre anos; filtros natureza,titular,cartão,categoria,situação, retorno com contexto. Layout simples celular/desktop, rótulos associados, teclado, foco no erro e feedback anunciado.

Cadastro distingue receita externa,despesa externa,assinatura; fixo/estimado; início, dia nominal, término opcional, valor positivo, categoria e referências próprias. Assinatura exige cartão e mostra titular derivado; não entra no formulário de parcelamento. Prévia mostra primeiro mês possível, ajuste dia31/fevereiro, valor estimado, fim e ausência de pagamentos automáticos. Sem ocorrência válida, explicar intervalo vazio.

Projeção é consulta sem escrita. Ao abrir período, tela pode propor/iniciar geração limitada com estado visível e resultado confirmado, conforme preferências do fluxo; nunca anunciar criação ilimitada/segundo plano. Botão Gerar permite seleção e prévia explícita. Perfil inicial uma ocorrência por comando; caso seleção exceda capacidade, rejeitar e pedir nova seleção explícita, sem fracionamento automático. Linhas virtuais,materializadas,estimadas,definitivas,puladas e canceladas são identificadas. Parcial/vazio com cursor não significa período sem compromissos.

Assinatura mostra data de cobrança, mês identificador e fatura de destino separadamente. Sugestão006, opção de escolha válida e prévia antes da compra. Fatura inexistente oferece preparar calendário pela006, depois nova conferência; não anunciar item criado ao preparar fatura vazia. Fatura protegida/cartão arquivado mostra bloqueio sem trocar destino. Compra mensal é1/1 ligada à série; não apresenta1/N infinito nem registra Pix/caixa imediato.

Confirmar valor mostra estimativa anterior e valor definitivo somente desta; ação pagar/receber é distinta e só habilitada com adaptador/proteções aprovados. Assinatura é paga pela fatura. Histórico conserva fatos, revisões, conta/data e reversões; confirmação de valor não é quitação.

Editar oferece Esta ou Esta e futuras não liquidadas. Futuras pede vigência>=mês atual e exibe até próxima revisão agendada, protegidas e exceções conservadas. Maio antes de julho altera somente maio/junho. Prévia inclui intervalo completo a conferir, impacto financeiro e motivo. Watermark distante ou custo excedido informa limite e oferece editar individualmente ou escolher outra vigência; usuário decide nova intenção, sem afirmar que o pedido anterior foi cumprido.

Pular virtual/cancelar persistida exige motivo, prévia e aviso de supressão permanente nesta versão. Não oferece apagar para tentar recriar nem desfazer supressão. Encerrar pede primeiro mês sem novas ocorrências e lista confirmadas posteriores que continuarão exigíveis; cancelamento delas é ação separada. Sem reabrir série encerrada.

Estados: carregando,vazio,parcial,geração pendente,bloqueado,prévia,prévia desatualizada,enviando,confirmado,conflito,limite,permissão,cota,indisponível e confirmação indeterminada. Erro conserva entrada/intenção na sessão; Consultar tentativa usa a mesma chave. Logout/troca limpa cache/intenções e descarta callbacks antigos. Nenhuma mensagem promete execução com aplicativo fechado.
