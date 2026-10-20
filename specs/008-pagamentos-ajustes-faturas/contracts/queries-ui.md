# Contract: Consulta e interface008

## Superfície

Ampliar a página existente `/app/cartoes/:cartaoId/faturas/:competencia`, conferida em `src/app/router.tsx`; manter links/lista006 e navegação007. Detalhe oferece ações disponíveis por estado e motivo de indisponibilidade: pagar, reverter erro, reabrir/encerrar revisão, encargo, corrigir item, devolver compra e incluir compra esquecida. Nenhuma ação aparece como concluída apenas por otimismo local.

Cabeçalho: cartão/titular, competência, vencimento próprio, ciclo, revisão explícita, exigível, pagamentos brutos, inversões por tipo, liquidado líquido, pendente, atraso e indicação de origem dos totais. Sem lançamentos, zerada por ajuste e paga têm textos distintos. Calendário não vira pago; parcela mostra vínculo e posição, sem checkbox de quitação individual.

## Comandos visíveis

- Pagar: conta ativa, data real, valor e pendente de referência. Integral sugere pendente confirmado, mas conflito não recalcula/paga silenciosamente outro valor. Com revisão ativa, explicar encerramento necessário.
- Reverter erro: exibir pagamento, conta/data originais, motivo e impacto no caixa original; ação integral indisponível após reembolso parcial.
- Revisão: motivo/prévia e abertura persistente, botão explícito de encerrar; recarga mantém revisão. Encerrar não desfaz correções já confirmadas. Não oferecer reabertura com qualquer histórico.
- Corrigir/encargo/inclusão tardia: identificar intenção, item ou compra omitida, motivo e antes/depois das bases. Classificação mostra original/corrigida; inclusão tardia mostra cronograma completo, ressalva de destino protegido e valor novo pendente.
- Devolução: escolher itens/valores e destino fatura original ou conta; conta exige data recebida e seleção explícita de pagamentos suportadores. Mostrar data econômica separada; não insinuar quais parcelas foram pagas. Não oferecer saldo credor. Bloqueio conserva entrada e explica a restrição.

## Consultas e paginação

Porta de leitura oferece resumo atual de fatura, itens com origem/ajustes, histórico por fatura, eventos por item/original e caixa por intervalo de data real. Cursor vincula UID, generation, filtros, ordenação, ID desempate e readTime. Limite1–50; resolver dependências via leitor snapshot autenticado já usado005, sem Admin SDK, e sem baixar toda a vida financeira.

Índices candidatos, a incorporar no arquivo completo somente após fechar esquema/consultas:

| Coleção | Filtros / ordem |
| --- | --- |
| operacoesLiquidacoesFaturas | faturaIds array-contains + createdAt desc + ID; faturaIds é lista limitada do comando |
| operacoesLiquidacoesFaturas | tipo + dataCaixa + ID para fatos de caixa simples; compostos exigem leitura dos efeitos e filtro da data efetiva por efeito |
| operacoesLiquidacoesFaturas | itemIds array-contains + createdAt desc + ID |
| operacoesLiquidacoesFaturas | pagamentoOriginalIds array-contains + createdAt desc + ID |
| parcelasCartao / compras | Preservar consultas007 e resolução da revisão vigente |

Para eventos com múltiplas datas de caixa, usar campo indexável `datasCaixa` limitado por comando com todas as datas efetivas distintas, inclusive a original de reversão. O recorte inicial é um mês (até31 datas); consultar cada data do intervalo com `array-contains`, paginar por data+createdAt+ID e deduplicar evento por ID antes de converter em fatos; filtrar cada efeito pela sua data, não pela criação do evento. Não usar `dataCaixa` singular nesses ramos nem somar duas vezes evento retornado em datas distintas. O planejamento não promete uma query única de intervalo sobre arrays. Implementação pode acrescentar projeção de leitura por fato somente se provar reciprocidade e orçamento, sem segunda autoridade financeira; isso requer revisão do gateG2, não é alternativa já autorizada como viável.

Fonte e critérios: consumo original por compra mais correções de erro no mês original e devoluções econômicas no mês de efeito; planejamento por competência dos itens líquidos; caixa por datas reais de pagamento/reembolso e neutralização de erro na data original. Mesma fonte não entra nas três bases pela soma dos totais das telas. Valores de controles são posição atual confirmada, não fotografia histórica de encerramento. Totais reconstruídos só definitivos com todas as páginas/dependências no mesmo readTime; conflito/expiração reinicia explicitamente sem misturar snapshots.

## Acessibilidade e falhas

pt-BR/BRL, datas locais sem deslocamento UTC; rótulos, teclado, foco em erro e anúncios de envio/resultado, celular e desktop. Falta de perfil disponível ou gate não validado mostra indisponibilidade de configuração, não sessão inválida. Distinguir permissão, cota, conflito e confirmação indeterminada. Descritor de intenção na sessão contém mínimo para recuperar, sem dados financeiros em logs. Logout/troca de generation descarta respostas e nunca reenvia intenção sob outro usuário. Manter modelos de carregamento, vazio, parcial e erro separados.
