# Contract: Consolidação011

## Superfície de domínio

ConsolidarPainel recebe ConsultaPainel,SnapshotPainel,contribuições normalizadas e cobertura de todas as fontes aplicáveis. Retorna Resultado<JanelaPainel> discriminando completo/parcial/indisponível por indicador. Função pura: não faz rede, gravação, geração, obtenção de relógio ou acesso a componente. Mesmas entradas produzem mesmas linhas/valores na ordem canônica definida.

ResolverAplicabilidade recebe base,filtros e indicadores pretendidos e devolve aplicavel/subtotal/indisponivel com motivo. DetalharIndicador usa snapshot e chaves explicativas; dados adicionais são obtidos pela porta de leitura, nunca pela soma duplicada de grupos e filhos.

## Fórmulas e invariantes

Planejamento sem filtros incompatíveis:

- receitasPrevistas = soma de receitas ativas líquidas do recorte, inclusive recebidas e virtuais.
- recebidoDasReceitas = soma do recebido líquido atual dessas receitas; virtuais contribuem0; aReceber = soma de exigível−recebido por receita.
- compromissos = soma de faturas líquidas projetadas + obrigações externas ativas, inclusive quitadas.
- liquidadoDosCompromissos = soma de controles válidos por obrigação externa e por fatura, uma vez.
- pendente = soma de exigível−liquidado por alvo, incluindo componente virtual identificado separadamente.
- resultadoPrevisto = diferencaMonetaria(receitasPrevistas,compromissos).

Crédito de obrigação reduz exigível, não cria receita; quitação não reduz planejado. Capital de empréstimo e compra original nunca entram por cima das parcelas. Reembolso real não é receita nova: segue inversão de caixa e redução da obrigação/consumo segundo008. Reversão de erro neutraliza o fato na data original, sem entrada de hoje fictícia. Não compensar dívida de um alvo por recebível de outro.

Caixa: somar efeitos financeiros confirmados no intervalo real. Documentos008 podem ter mais de uma data/efeito; contar uma vez cada efeito após deduplicar o documento. Classificação histórica vem do contexto do fato suportado pela origem; não reler categoria atual e reescrever sem aviso a história. Fatos sem contexto necessário mantêm caixa geral, mas indicador filtrado fica parcial/indisponível, sem presunção. Transferência própria não contribui ao resultado consolidado.

Consumo: compras inteiras, despesas externas com data e encargos próprios; ajustes por tipo/data. Parcela e pagamento não são consumo. Receita não é redução de consumo. Preservar evento de correção e origem, sem duplicar diferença nos controles e no evento. Valores migrados sem informação são não atribuíveis e não viram consumo zero confirmado. Informar somente não atribuíveis encontrados no recorte reconciliado; não prometer inventário global desconhecido sem leitura delimitada que o prove.

## Filtros e estados

| Recorte | Planejamento | Caixa | Consumo |
| --- | --- | --- | --- |
| Sem filtro ou titular compatível | Totais integrais se fontes completas | Fatos do contexto compatível | Origens/itens do titular |
| Cartão | Faturas do cartão, receitas/resultado global não aplicáveis | Fatos da fatura, sem receita global | Compras/itens do cartão |
| Categoria/etiqueta externas | Alvos externos atribuíveis | Fatos externos atribuíveis quando contexto conhecido | Origens e efeitos classificados |
| Categoria/etiqueta com cartão | Subtotal de itens por competência da fatura; totais integrais apenas contexto; sem pendência/liquidação/resultado consolidado atribuídos | Sem distribuir pagamentos de fatura; subconjunto externo explicitamente identificado | Itens/origens selecionados, sem repetir pagamento |

Não remover incompatibilidade só porque uma página não trouxe cartão ou todos os itens carregados parecem corresponder ao filtro. Matriz é política estável; qualquer exceção exige prova de cobertura e revisão explícita da política. IDs de etiquetas se unem, dimensões se intersectam e linha não duplica.

## Reconciliação mínima de aceitação

1. FixtureUS1:5000 previstos,3000 recebidos,1500 compromissos,600 liquidados,900 pendentes,2000 a receber,3500 resultado. Pagamento adicional100 altera apenas liquidação/pendência/caixa.
2. Compra1200 em outubro: consumo1200 outubro, planejamento400 novembro/dezembro/janeiro; pagamentos150 outubro e250 dezembro.
3. Energia150 virtual substituída por173,42 persistida, uma vez; pulo/cancelamento bloqueia previsão.
4. Fatura200+virtual50=250 antes/depois de materializar; se G já inclui50, não acrescentar novamente.
5. Fatura1000, alimentação600, pagamento300: subtotal600, contexto integral1000/300/700, sem pendente420 ou pagamento180 atribuído.
6. Erro corrigido no mês original; estorno econômico no mês de efeito e reembolso na data real, cada efeito uma vez; correção de classificação move contribuição sem criar novo gasto.
7. Série009 próxima5/10 mostra somente seis parcelas conhecidas; sem capital adicional, recebimentos inferidos ou consumo presumido.
8. Snapshot divergente, ausência não reconciliada, revisão de compra obsoleta ou controle incompatível impedem total definitivo dependente.

## Rastreabilidade de requisitos

FR001/002 → contracts/ui; FR003–015 → data-model e este contrato; FR016–020 → matriz de filtros e fatos; FR021 → saldo indisponível condicionado; FR022–024 → contracts/queries; FR025 → contracts/security; FR026 → UI; FR027 → quickstart e gates. SC001–004 verificam valores/filtros; SC005/006 verificam navegação/compreensão; SC007/008 verificam coerência/limites/isolamento.
