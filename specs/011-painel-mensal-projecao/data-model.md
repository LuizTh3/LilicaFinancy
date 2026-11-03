# Data Model: Painel mensal e projeção

Modelos011 são derivados em memória. Não criar coleção de resumo, cópia de parcelas, novos pagamentos ou saldo de conta. Todas as referências persistidas permanecem sob users/{uid} e nas autoridades das etapas de origem.

## Tipos compartilhados

BRL em centavos inteiros seguros; soma/intermediário fora da faixa003 falha. Resultados usam Diferenca com natureza superavit/deficit/equilibrio e magnitude não negativa. Datas1900–9999 e competências YYYY-MM; nenhum Date/UTC substitui data financeira. Negativos econômicos são efeitos discriminados, não lançamentos de magnitude negativa. Ausente é diferente de zero.

## ConsultaPainel e SnapshotPainel

| Campo | Regra |
| --- | --- |
| contractVersion |1 |
| base | planejamento,caixa,consumo |
| inicio,fim | Competências inclusivas,1..12 meses válidos |
| filtros | titulares/cartoes/categorias/etiquetas: listas canônicas de IDs próprios; união intradimensão/interseção entre dimensões |
| modo | mensal ou12meses; mensal exige1 e12meses exige12 |
| uid,generation | Somente da sessão autenticada |
| readTime | RFC3339 canônico do servidor, precisão preservada e compatível com readTime REST |
| expiresAt | readTime+50min; nunca renova ao paginar |
| contractRevision | Versão do normalizador e das capacidades de fontes, invalida cache incompatível |
| hojeFinanceiro | Hoje calculado para o instante da consulta no fuso do perfil; fixo para estados derivados |

Token Firebase não faz parte dos dados serializados do snapshot/cursor; é obtido em memória por requisição. Snapshot é contexto de leitura de curta duração, não reconstituição contábil de fechamento passado.

## ContribuicaoPainel

Campos: chave tipada estável, autoridade, origemRef, alvoRef quando aplicável, base, competência de contribuição, data financeira, valor/sinal econômico, estimado, virtualOuPersistido, classificação, titular/cartão, etiquetas, revisão da fonte e evidências de cobertura. UID e snapshot herdados do envelope e validados no mapeamento. Descrição não define identidade.

| Autoridade | Chave lógica | Planejamento | Consumo | Caixa |
| --- | --- | --- | --- | --- |
|005 receita/despesa | externo:id | Origem ativa pelo valor integral e competência | Despesa uma vez em dataConsumo | Evento:fato na dataEfetiva |
|006–008 fatura | fatura:cartaoId:competencia | Uma fatura líquida com conteúdo reconciliado | Não contribui | Não contribui; fatos008 contribuem |
|007 compra | compra:id | Somente por item na explicação da fatura | Compra integral em dataCompra e correções | Não contribui |
|007 parcela | parcelaCartao:id:revisao | Explica fatura, sem segunda soma | Não contribui | Não contribui |
|008 efeito | evento008:id:ordinal:tipo | Ajuste no líquido da fatura, não segunda linha somável | Erro no mês original; estorno no efeito; encargo na sua data | Fato por data e conta reais; inversões sem receita categorizada |
|009 slot | parcelaExterna:serieId:pNN | Entrada ativa do mapa finito, não a série toda | Não contribui como parcela | Fato de operacoesParceladas |
|009 origem | serieExterna:serieId | Não soma capital/soma contratual | Somente compromissoExterno com valor original/data de consumo conhecidos e semanticamente válidos; emprestimo não é consumo inferido | Receita vinculada é005 explicitamente registrada |
|010 externa | ocorrenciaExterna:O.id | Projeção oficial por competência, persistida prevalece | Despesa da ocorrência em dataConsumo | FatoR explícito |
|010 assinatura | assinatura:O.id | Item da fatura, sem segunda soma | Uma compra lógica1/1 por O.id/dataCompra | Pela fatura008, nunca pagamento externo010 |
| Transferência própria | origem compatível | Fora de receita/despesa | Fora | Movimento interno fora do resultado consolidado |

Chave de deduplicação de evento com vários efeitos inclui ordinal/ID de efeito; deduplicar documento retornado em vários índices não remove efeitos distintos legítimos. Mesma ID em coleções diferentes não é colisão.

## IndicadorPainel

União discriminada de estado:

- completo: valor exato ou Diferenca, readTime comum, cobertura integral e IDs das contribuições explicativas; inclui temEstimativa e componenteEstimado.
- parcial: subtotal conhecido, motivos/fontes faltantes, continuação e readTime; não expõe campo totalDefinitivo.
- indisponivel: motivo tipado, como filtroIncompativel,fonteNaoHabilitada,prerequisitosSaldoAusentes; sem valor numérico fictício.
- erro: código de domínio, mensagem/recuperação e eventual último snapshot coerente identificado como anterior.

Um filtro incompatível é indisponibilidade semântica, não paginação pendente. Completo significa cobertura e consistência, não certeza de estimativa. Valor0 só é completo após esgotar todas as fontes aplicáveis no mesmo instante.

## ResumoMensal / JanelaPainel

Resumo contém competência, base, indicadores discriminados, grupos por natureza/cartão, readTime e Cobertura. Planejamento: receitasPrevistas,recebidoDasReceitas,aReceber,compromissos,liquidadoDosCompromissos,pendente,resultadoPrevisto. Caixa: recebimentosDeReceitas,pagamentos,entradasPorDevolucao,inversoes,entradas/saidasLiquidas e resultadoCaixa. Consumo: gastos, reduções e consumoLiquido, sem chamar redução de receita. Janela é sequência imutável de1 ou12 resumos; marca completo global só se todos e fontes compartilham readTime. Não misturar meses de snapshots diferentes ao navegar.

Recebido/liquidado no planejamento são posição atual no readTime dos alvos selecionados, não soma dos eventos do mês. Invariante de cada alvo:0<=liquidadoLiquido<=exigivel; canceladas/suprimidas exigível0 conforme origem. Dados incompatíveis produzem erro de integridade, não clamp para zero.

## FaturaProjetada e detalhe

Campos: faturaId/cartaoId/competencia,calendario,conteudoPersistidoReconciliado,virtualAdicional,exigivelProjetado,liquidadoConfirmado,pendenteProjetado,parteEstimada,partesVirtuais,estadoReconstrucao. PendenteProjetado=exigivelProjetado−liquidadoConfirmado quando estado válido; separar pendência de compromissos confirmados da previsão virtual na apresentação. Ausência de calendário/controle não implica zero: se só existe previsão virtual com destino resolvido, oferecer fatura projetada identificada; se há persistidos sem prova, indicador parcial/erro.

Itens/deltas se reconciliam com G008 antes de somar virtuais que ainda não estão representados. Não somar G e itens. O010.capacidadeItem é a autoridade do seu item; não buscar J duplicado. G010.calendarioVersion exige contrato harmonizado006/008/010. Item007 exige compra ativa e cronogramaRevision atual.

Detalhe do indicador guarda snapshot e conjunto de chaves que o explica; páginas adicionais usam o mesmo readTime. Links para telas de edição atuais avisam que são dados atuais, distintos do detalhe histórico da consulta. Snapshot expirado exige atualizar resumo/detalhe conjuntamente.

## Cobertura, cursor e orçamento

Cobertura por fonte/subrecorte/fase: naoIniciada,emAndamento,completa,indisponivel,erro. Registra posições e end comprovado; página cheia não prova fim. Ausência exata de O é evidência de reconciliação somente com S/V/calendário do mesmo instante. Datas/mês de identidade não substituem competência ajustada.

Cursor é handle opaco de memória para UID/generation,consulta normalizada,snapshot,versões de adapter,posições por fluxo,subperíodo/fase,filas de referências e buffers pendentes. Não confiar em cursor recebido de URL ou de usuário diferente. Cursor não é lista crescente de todo histórico. Respeitar8MiB/duas janelas; quando necessário, parar com limite e explicar recorte menor, sem descartar contribuições para completar total falso.

OrcamentoRodada reserva documentos e HTTP antes de disparar; máximo100 documentos retornados,8HTTP,query<=50,batch<=8 e custoRules permitido. Missing ocupa cota de referência e requisição; documentos repetidos/releituras/candidatos descartados também contam. No orçamento100, contar conservadoramente todos os documentos retornados, inclusive cadastros. Até50 linhas visíveis; expansão009 pode produzir mais slots que linhas e retoma ordinal sem perder posições.

## Ciclo da visão e cache

inicial → carregando → parcial com continuação → completa. Atualizar inicia snapshot novo separado; visão anterior permanece identificada e nunca recebe partes da nova. Ao reconciliar, trocar a visão inteira. TTL/permissão/integridade/geração inválida impedem continuação; logout apaga cache/handles/controladores. Conservar últimas visões somente na sessão atual. Nenhum modelo011 é persistido como autoridade.

## Extensão indexável necessária para consumo008

O contrato008 já possui efeitos com competência de consumo, mas não índice global suficiente para descobrir devoluções sobre compras fora da janela. Na implementação, exigir `competenciasConsumo` no evento008: conjunto canônico e limitado das competências de todos os seus efeitos de consumo, inclusive correção/classificação no mês original, estorno no efeito e compensação. Metadado derivado sem valores adicionais, no próprio evento, não nova coleção financeira. Rules devem comprovar conjunto exato na criação, schemas/bytes/orçamento devem ser reavaliados no gateG2 e readers entender versão compatível.

O campo é obrigatório nos novos eventos008, lista de competências YYYY-MM canônicas, ordenadas crescentemente e sem duplicatas, exatamente igual ao conjunto derivado dos efeitos resolvidos. Não aceitar mês adicional, omissão, campo ausente, null ou formato inválido. Campo ausente identifica evento legado não coberto, nunca lista vazia. Lista vazia só é válida para variante sem efeito de consumo. Limite global do perfil atual: uma competência distinta por evento, com cardinalidade exata por variante:

| Variante008 | Cardinalidade | Mês derivado |
| --- | --- | --- |
| pagarFatura, reverterPagamentoErro, reabrirFatura, encerrarRevisao | 0; lista obrigatória [] | Não têm efeito de consumo |
| registrarEncargo | 1 | Mês da data de efeito do encargo |
| corrigirItem, monetária ou classificação | 1 | Mês original do consumo do item; classificação continua nesse mês |
| estornarCompra | 1 | Mês da dataEfeito única do comando, mesmo com vários itens/faturas ou reembolso em outras datas |
| compensarAjuste | 1 | Mês do efeito compensatório resolvido segundo o tipo do ajuste original; não inferir pelo createdAt |

Todos os efeitos de consumo das variantes atuais devem pertencer ao mês derivado; reclassificação pode ter efeitos por duas categorias, mas no mesmo mês. Comando que exija dois meses distintos de consumo é recusado integralmente pelo perfil atual, sem truncar lista ou fracionar automaticamente; sua habilitação exige nova variante/perfil, revisão de contrato e prova de orçamento. IncluirCompraEsquecida pertence ao evento007 e não cria evento008 adicional: seu consumo vem da compra.

Testar limites0/1/2, duplicata, ordem não canônica, mês errado, omissão/extra, ausência versus [], classificação e estorno com datas de caixa distintas, além da negação direta de metadado forjado. Consultar array-contains por mês e deduplicar documento/efeitos; não atribuir consumo pelo createdAt. Legados exigem inventário/migração autorizada e prova de cobertura, ou fonte permanece indisponível para total integral. O desenho não autoriza backfill automático.

## Descoberta virtual010 por vigência

Substituir a descoberta geral de S por metadados escalares derivados no próprio S, sem valores financeiros duplicados nem lista crescente de meses: versaoIndiceVirtual=1, inicioVirtual=inicio, fimVirtualInclusivo=min(terminoOriginal ou9999-12-31, dia anterior ao primeiro mês encerradaDesdeMes ou9999-12-31), e virtualElegivel=(fimVirtualInclusivo>=inicioVirtual). Quando encerramento ocorrer em1900-01, usar virtualElegivel=false e fimVirtualInclusivo=1900-01-01 para representar intervalo vazio sem fabricar data anterior à faixa. O predicado de elegibilidade prevalece nesse caso. Para as demais datas, fim pode preceder inicio e representa intervalo vazio com virtualElegivel=false.

Esses metadados são indexação da vigência, não autoridade de valor ou existência de O. Criar/encerrar S deve gravá-los e validá-los exatamente no mesmo comando; qualquer mutação conserva sua coerência. Revisões de valor/dia/cartão/categoria não podem tornar invisível a série pela classificação atual. Nova revisão do formato de leitura e a ampliação fechada de schemas/Rules010 exigem testes e prova de orçamento antes de G1; ausência de metadado em legado impede anunciar cobertura completa até inventário/migração autorizada, sem fallback de varredura no painel.

A consulta seleciona somente S com virtualElegivel=true, versaoIndiceVirtual=1 e vigência sobreposta à faixa de datas de cobrança/consumo necessária ao recorte. Para cartão, essa faixa vem do resolvedor010 e dos ciclos do snapshot006, incluindo cobranças anteriores ao mês da fatura, sem suposição fixa de deslocamento. Se a faixa não puder ser resolvida, a projeção permanece parcial.

Ocorrências persistidas são consultadas independentemente por competência ajustada, fatura ou data de consumo; permanecem visíveis após encerramento e fora da vigência virtual. Unir esses fluxos por identidade com persistida prioritária e tombstones preservados. Isso exclui séries históricas sem impacto virtual no período sem perder obrigações já confirmadas ou exceções individuais.
