# Modelo de dados e invariantes

Base normativa: [spec.md](spec.md), incluindo as duas decisões de 2026-10-17. Este documento define o formato lógico; não cria coleções, migra dados ou libera permissões. Contratos consumíveis: [domínio](contracts/domain.md) e [repositórios](contracts/repositories.md).

## 1. Valores e envelope

| Tipo | Forma/validação |
| --- | --- |
| Centavos | Número inteiro seguro 0..9007199254740991; `ValorPositivo` refina >0. Sem BigInt no DTO. |
| DataCalendario | String canônica YYYY-MM-DD gregoriana válida, ano 1900..9999. |
| Competencia | String YYYY-MM válida, ano 1900..9999. |
| FusoPerfil | Nome/alias IANA reconhecido, UTC permitido; offset explícito proibido. Inicial America/Rio_Branco. |
| Instante | Epoch em milissegundos, finito/integral, dentro da faixa de Date; não representa vencimento. Conversão para timestamp do provedor só em adaptador futuro. |
| ID avulso | String imutável, 1..64 caracteres `[A-Za-z0-9_-]`, sem dados pessoais; novos IDs UUID gerados fora do domínio. |
| ID natural | `k1_` + base64url(UTF-8(JSON compacto da tupla tipada)); até 512 bytes, sem slash. |
| Version/SchemaVersion | Inteiros positivos seguros. Entidades novas começam com ambos em 1; versão desconhecida não permite escrita. |
| Nome/descricao | Texto não vazio após trim externo, até 120 caracteres Unicode. |
| Observacao/motivo | Até 1000 caracteres Unicode; motivo obrigatório e não vazio em cancelamento/inversão/ajuste. |
| EtiquetaIds | Conjunto sem repetição, até 5 IDs, representação canônica ordenada. |

Todos os documentos financeiros têm `schemaVersion`, `version`, `createdAt`, `updatedAt`. ID vem do caminho; o objeto de domínio inclui `id`, mas não precisa persistir outra cópia. Propriedade vem de `users/{uid}`, não de campo editável. Referências usam pares tipados ou campo de ID específico. Campos desconhecidos são rejeitados; opcionais ausentes são omitidos, não convertidos em null/zero. Os campos de dinheiro nesta descrição têm sufixo `Centavos`.

Perfil existente não recebe versionamento financeiro. `users/{uid}` conserva schemaVersion=1, timezone, primeiro_login, cutoff e contrato protegido da feature 002. Não criar faturas ou cadastros ao criar perfil.

## 2. Cadastros e referências

| Caminho relativo a users/{uid} | Campos específicos |
| --- | --- |
| titulares/{id} | nome; estadoCadastro ativo/arquivado. |
| categorias/{id} | nome; natureza receita/despesa; estadoCadastro. |
| contas/{id} | nome; tipo dinheiro/contaPagamento; titularId opcional; estadoCadastro. |
| etiquetas/{id} | nome; estadoCadastro. |
| cartoes/{id} | nome; banco (texto 1..120); titularId obrigatório; diaFechamento e diaVencimento inteiros 1..31; estadoCadastro. |

Categoria deve ter natureza compatível com a origem. Referências de criação devem existir e estar ativas; referência arquivada continua legível no histórico. Nome não é identidade; duplicidade de nome não une registros. Alterar titular de um cartão com histórico é bloqueado no contrato inicial para não reclassificar compras antigas implicitamente. Sem número completo, CVV, senha, saldo editável ou credenciais.

Cardinalidades: um cartão tem um titular e muitas faturas; fatura pertence a um cartão; origem tem uma categoria e até cinco etiquetas. Cadastros referenciados só podem ser arquivados. Transição de cadastro: ativo → arquivado, sem exclusão em cascata.

## 3. Origens de receita e despesa

### Receita — receitas/{id}

Obrigatórios: descricao, valorPrevistoCentavos positivo, estimado booleano, competenciaPlanejamento, dataPrevista, categoriaId, estadoObrigacao ativa/cancelada. Opcionais: titularId, contaPrevistaId, etiquetaIds, observacao e vínculo recorrente descrito adiante.

Fonte de verdade da previsão; não contém recebidoCentavos, pendenteCentavos ou pago. Conta prevista não prova a conta de recebimento. Competência sugerida de dataPrevista, mas confirmada independentemente dela. Alterar dataPrevista não sobrescreve competência confirmada.

### Obrigação externa — obrigacoesExternas/{id}

Campos comuns: descricao, categoriaId, estadoObrigacao, titularId/contaPrevistaId/etiquetaIds/observacao opcionais. dataConsumo é obrigatória em lançamento novo; ausente apenas na migração incompleta identificada.

União discriminada:

- `modalidade=avulsa`: valorTotalCentavos positivo, estimado booleano obrigatório, competenciaPlanejamento e vencimento. Pode ter vínculo de recorrência. Alvo de pagamento é a própria obrigação. O atributo estimado pertence a este registro, não é consultado dinamicamente no molde; false significa valor explicitamente confirmado, não pagamento realizado.
- `modalidade=parcelada` ou `emprestimoManual`, `origemDados=nova`: valorTotalCentavos positivo, quantidadeOriginal 1..12, numeroInicial=1, primeiraCompetenciaPlanejamento, primeiroVencimento e diaAncora. Compromissos em parcelas; pagamento da origem proibido.
- Série com `origemDados=migrada`: quantidadeOriginal 1..12, numeroInicial K, saldoMigradoCentavos positivo, primeiroVencimento, primeiraCompetenciaPlanejamento e diaAncora. valorTotalCentavos e dataConsumo opcionais quando desconhecidos. numeroInicial é ordinal, não quantidade restante. Se valor original conhecido, saldo restante não pode superá-lo; não inferir diferença como pagamento.

Empréstimo é cronograma manual, sem cálculo de juros/amortização nem registro presumido de entrada do principal. Não há recorrência sobre uma série parcelada inicial; recorrências originam apenas avulsos, evitando duas identidades de geração.

### Compra — compras/{id}

Campos comuns: descricao, cartaoId, categoriaId, estadoObrigacao, primeiraCompetenciaFatura; etiquetaIds/observacao opcionais. titular é resolvido pelo cartão. dataConsumo é obrigatória em compra nova.

- `origemDados=nova`: valorTotalCentavos positivo, quantidadeOriginal 1..12, numeroInicial=1.
- `origemDados=migrada`: quantidadeOriginal 1..12, numeroInicial K, saldoMigradoCentavos positivo; valorTotalCentavos e dataConsumo opcionais. Total desconhecido continua ausente.

Valor original é a autoridade do consumo; não somar parcelas ao consumo. Em migração com total conhecido e data ausente, valor fica sem atribuição mensal. Total/data desconhecidos impedem afirmar consumo histórico completo. Geração de parcelas não cria consumo adicional.

## 4. Compromissos e faturas

### Parcela — parcelas/{idNatural}

Identidade: tupla `["parcela", origemTipo, origemId, numero]`. Campos: origemTipo compra/obrigacaoExterna; origemId; numero; quantidadeOriginal; valorCentavos positivo; competenciaPlanejamento; vencimento; estadoObrigacao; faturaId somente para compra. MotivoCancelamento obrigatório quando cancelada. Fonte do valor original continua na origem; o valor da parcela é a distribuição confirmada do cronograma.

Invariantes:

1. Ordinais únicos e contínuos de numeroInicial a quantidadeOriginal; total de registros igual a N−K+1. Não guardar lista de parcelas no pai como segunda autoridade.
2. Soma inicial coincide exatamente com valorTotalCentavos da série nova ou saldoMigradoCentavos na migração. Valores originais de parcelas canceladas continuam preservados nessa soma histórica; exigibilidade considera cancelamentos/ajustes separadamente.
3. Regra uniforme: quociente inteiro e centavo adicional nas primeiras posições do cronograma gerado. Em 5/10, a distribuição do saldo começa no ordinal 5. Valores manuais conhecidos exigem lista completa e soma exata.
4. Parcela de compra tem exatamente uma fatura do mesmo cartão/UID, competenciaPlanejamento igual à competência da fatura e vencimento exatamente igual a fatura.vencimento. A fatura é a única autoridade do vencimento; o campo na parcela é cópia validada, nunca data editável independente. Divergência em criação, snapshot ou prévia de edição é referenciaInvalida, sem normalização silenciosa. Externa proíbe faturaId, tem vencimento próprio e pode planejar mês diferente dele.
5. Origem/ordinal/quantidadeOriginal não mudam; corrigir cronograma é caso de uso explícito com prévia. Origem cancelada não pode ter parcela ativa exigível.

### Fatura — faturas/{idNatural}

Identidade: `["fatura", cartaoId, competencia]`. Campos: cartaoId, competencia do vencimento, fechamento, vencimento, ciclo aberta/fechada. Vencimento deve estar na competência e depois do fechamento. Calendário confirmado não é recalculado ao mudar cartão. Não há total editável nem estado de pagamento persistido.

Sugestão: comparar compra ao fechamento ajustado do mês; igualdade segue ciclo seguinte. Para ciclo escolhido, ajustar dias civis e determinar vencimento conforme FR-013. Seleção manual de primeira fatura substitui sugestão, sem mover histórico. Uma fatura existente fornece seu calendário confirmado; uma fechada não recebe nova compra/edição ordinária. Ajustes explícitos são fatos separados.

Estado: aberta → fechada por comando explícito de ciclo; calendário não fecha automaticamente. Reabrir fatura não faz parte deste núcleo. Receber pagamento não muda ciclo. Cada mutação que altera composição/pendência futura deve coordenar `version` da fatura, mesmo quando nenhum campo financeiro materializado existir.

## 5. Liquidações e ajustes imutáveis

### Pagamento — pagamentos/{id}

Comum: tipo, valorCentavos positivo, dataEfetiva, contaId, alvo, operacaoId.

- `tipo=pagamento`: alvo discriminado obrigacaoExternaAvulsa/parcelaExterna/fatura com ID. Sem pagamento direto de parcela de cartão.
- `tipo=reversaoPagamento`: mesmo alvo e conta do pagamento original, originalId obrigatório e motivo. Não pode apontar para outra inversão.
- `tipo=reembolso`: mesma estrutura de inversão, originalId, motivo e estornoId obrigatórios. Entrada efetivamente devolvida, não expectativa; não criar também recebimento da mesma devolução. Nesta versão, inversão usa a conta original; devolução para outra conta depende de caso próprio.

Reversão/reembolso nunca antecedem a data efetiva do pagamento original. Soma de todas as inversões do original não supera seu valor; coordenação do alvo e vinculação ao original impedem dupla inversão. Imutáveis com version=1; não editar data/valor de fato confirmado. Correção é inversão e novo fato.

### Recebimento — recebimentos/{id}

Campos: tipo recebimento/reversaoRecebimento; valorCentavos positivo; dataEfetiva; contaId; receitaId; operacaoId. Inversão exige originalId/motivo, mesmo alvo/conta e limite do original; não aponta para inversão. Não é permitido reutilizar esse recurso para entrada de reembolso de compra.

### Ajuste — ajustes/{id}

União discriminada com valorCentavos positivo, dataEfeito, motivo e operacaoId:

- `tipo=estornoConsumo`: origemTipo compra/obrigacaoExterna, origemId e magnitude do consumo estornado. É o único evento que reduz consumo; competência deriva de dataEfeito. Vínculos de dívida usam filhos abaixo. DataEfeito não pode anteceder consumo conhecido.
- `tipo=creditoObrigacao`: alvo discriminado obrigação avulsa/parcela externa/parcela de cartão/fatura/receita; origemId e, se parte de estorno, estornoId. Ajuste autônomo exige motivo próprio. Redução de parcela de cartão é agregada na sua fatura. Não aplicar crédito à fatura e à parcela para a mesma magnitude.

Estorno com efeito na dívida gera um grupo atômico: evento de consumo e créditos dos compromissos, cuja soma é igual à parcela do estorno que reduz dívida. No fluxo inicial, todo valor estornado de origem com compromissos registrados é distribuído explicitamente como crédito; não inferir consumo não registrado na migração. Créditos filhos não reduzem consumo novamente. Estorno de compra com total original desconhecido é rejeitado por falta de base verificável; créditos de compromissos conhecidos continuam possíveis.

Não há distribuição implícita de estorno entre parcelas: comando fornece mapa de créditos positivos por alvo; validar soma, vínculo à origem e limites de cada alvo. Reembolso de valor já pago e crédito correspondente são avaliados no mesmo comando atômico, sem estado intermediário exposto; sem saldo credor. Crédito autônomo não significa devolução ou consumo estornado.

## 6. Recorrências e ocorrência

`recorrencias/{id}`: tipo receita/obrigacaoExterna, descricao, categoriaId, valorCentavos positivo, estimado, inicio (data), fim opcional inclusivo, diaAncora 1..31, frequencia mensal, estado ativa/encerrada, vínculos cadastrais opcionais compatíveis com origem. Fim não antecede início.

Ocorrência é uma receita ou obrigação externa avulsa com ID natural `["ocorrencia", recorrenciaId, competenciaOcorrencia]`, recorrenciaId, competenciaOcorrencia e recorrenciaVersion. Não criar coleção de ocorrências duplicando lançamento. A data agendada é âncora ajustada na competência; só projetar quando dentro do intervalo inclusivo início/fim. Ocorrência externa tem consumo e vencimento sugeridos por essa data, permitindo exceção explícita; receita usa dataPrevista. Não projetar retroativamente uma data anterior ao início.

Competência de ocorrência é imutável e distingue identidade do mês de planejamento editável. Materializada, inclusive cancelada, substitui a virtual. Alteração do molde só afeta virtuais/futuras não confirmadas; edição em lote de ocorrências exige prévia e versões. Encerrar não exclui ocorrências confirmadas. Comando até 12 competências; consulta é pura e não grava automaticamente.

Receitas e obrigações avulsas de ocorrência guardam seu próprio estimado booleano, junto do valor e recorrenciaVersion. Virtual herda do molde informado; ao materializar, esses dados são capturados e não dependem da versão atual do molde para serem lidos. Confirmar valor de ocorrência é ação explícita: informa valor definitivo positivo e versão esperada, preserva ID/competenciaOcorrencia e altera somente o valor dessa ocorrência e estimado para false, incrementando sua versão uma vez. Se virtual, pode ser materializada já confirmada; se existente, aplicar os bloqueios de liquidação/edição vigentes. Não mudar datas, molde, outras ocorrências ou fatos de caixa. Exemplo: novembro15000→16327/false deixa dezembro15000/true e molde15000/true intactos.

## 7. Operações e coordenação

`operacoes/{idNatural}` usa tupla `["operacao", tipoComando, chave]`. Campos: tipoComando, contractVersion=1, payloadCanonico (texto, até 16 KiB), resultados `{tipo,id,version}[]` limitada pelas mutações do comando, createdAt/updatedAt, schemaVersion/version iniciais. Recibo imutável. Limite final do documento 32 KiB prevalece. Campos financeiros vêm dos registros de origem, não do recibo.

Payload canônico inclui versões esperadas e referências normalizadas, sem timestamps técnicos gerados. Mesmo recibo retorna resultado antes de reavaliar versão esperada. Nova tentativa com intenção diferente usa chave nova. Chave perdida após confirmação não autoriza deduplicar por valor/descrição.

Guard é versão no alvo existente, sem coleção financeira de locks nem totais duplicados. Agregados: origem da série para edição; faturas tocadas para compras/parcelas de cartão; receita, obrigação avulsa ou parcela externa para suas liquidações. Comandos multialvo recebem todas as versões ordenadas; fato e recibo são gravados junto do incremento de cada guard. Ao desfazer pagamento também verificar todas as inversões desse original dentro do snapshot completo. Não alegar que esse protocolo cooperante já foi imposto nas Rules.

## 8. Derivações e transições

Calcular apenas sobre snapshot validado/completo, sem duplicar IDs ou incluir fatos de outro alvo/UID:

- Exigível: base menos créditos efetivos; cancelamento autorizado zera exigível. Para fatura, base soma compromissos ativos, já descontados créditos de parcela; créditos de fatura entram uma vez.
- Liquidado líquido: pagamentos/recebimentos menos inversões, incluindo reembolso como inversão de pagamento. Pendência = exigível − liquidado líquido. Cada cálculo/intermediário mantém faixa segura; resultado negativo é erro de consistência, não clamp.
- Estado de liquidação: cancelada sem saldo → semExigibilidade; ativa com pendência zero → liquidada; pendência positiva e líquido zero → pendente; ambos positivos → parcial.
- Parcela de cartão informa liquidaçãoViaFatura e estado da fatura; pagamento parcial não permite afirmar sua quitação individual. Atraso de caixa do cartão é calculado pela fatura, sem gerar dívida adicional nas parcelas.
- Obrigação ativa → cancelada apenas se líquido zero; caso contrário exigir inversões explícitas. Cancelar compromisso não altera consumo sozinho; estorno deve ser evento explícito no mês de dataEfeito.
- Ciclo da fatura e estadoCadastro não participam da fórmula de pagamento. Fechar/arquivar não liquida. Cancelamento não apaga fatos e não transforma valores históricos em zero.

## 9. Consultas, completude e índices futuros

Planejamento: receitas/obrigações avulsas/parcelas por competenciaPlanejamento; cartão via parcelas da fatura, sem somar a fatura novamente. Consumo: origens por dataConsumo e estornos por dataEfeito; não filtrar origem cancelada para esconder gasto histórico. Caixa: pagamentos/recebimentos/inversões por dataEfetiva. Resultados exibem base temporal e diferenças tipadas; não são saldo disponível.

Páginas até 50, ordenação por campo temporal e ID como desempate, cursor opaco ligado a usuário/base/filtro. Se faltam páginas, revisão consistente ou metadados históricos da migração, retornar `completo=false` e motivos; não emitir total definitivo. Para fatura, resolver itens, ajustes e liquidações completos na mesma revisão lógica.

Índices candidatos só para futura implementação: competência+ID em receitas/obrigações/parcelas; faturaId+numero+ID em parcelas; alvoTipo+alvoId+dataEfetiva+ID em pagamentos; receitaId+dataEfetiva+ID em recebimentos; origem/alvo+dataEfeito+ID em ajustes. Filtros adicionais definem combinações específicas na feature consumidora. Não alterar firestore.indexes.json agora. Excluir payload de recibo e texto sensível da indexação será analisado com o adaptador correspondente.

## 10. Versionamento e fronteira de persistência

Mudar campo financeiro de registro editável exige expectedVersion e incremento de 1; não reciclar IDs. schemaVersion desconhecida bloqueia leitura operacional/escrita; erro descreve incompatibilidade sem adivinhar migração. Migração futura precisa de checkpoint explícito, compatibilidade e autorização próprias; não é protocolo permitido para criar séries parciais nesta versão.

Até nova feature provar integralmente autorização, agregação e orçamentos, todos esses caminhos permanecem negados pelas Rules existentes. Modelo e contratos não são evidência de integração remota validada.
