# Data Model: Recorrências010

## Fronteiras e armazenamento

Coleções privadas em users/{uid}: seriesRecorrentes(S), revisoesRecorrentes(V), ocorrenciasRecorrentes(O), operacoesRecorrentes(R) e reversoesRecorrentes(M). Nenhuma gravação espelhada em lancamentosExternos/operacoesExternas005. O é fonte financeira única da ocorrência: lançamento externo ou compra mensal/item1/1. O adaptador010 expõe os read models comuns e deve integrar explicitamente listas externas, projeções e itens de fatura. Sem essa integração não habilitar assinaturas/pagamentos.

Todos os documentos schemaVersion1, campos fechados, timestamps técnicos, centavos seguros e calendário003. Fatos ficam em R imutáveis, nunca em array de S/O. IDs e versão de schema desconhecida falham fechados. Registros005/006–009 e fixtures003 não são migrados por este plano.

## S — seriesRecorrentes/{serieId}

| Campo | Validação |
| --- | --- |
| schemaVersion, version | 1; revisão positiva incrementada em toda mutação010 da série/slots |
| natureza | receitaExterna, despesaExterna ou assinaturaCartao; imutável |
| inicio, terminoOriginal? | Datas inclusivas; término>=início; não substituir ao encerrar |
| primeiraRevisaoId | Limite inicial no mês de inicio, imutável |
| estado, encerradaDesdeMes? | ativa/encerrada; primeiro mês excluído>=mês atual na ação de encerrar; sem reabrir |
| ultimoMesOcupado? | Máximo monotônico do mês de identidade de qualquer O já criado, inclusive tombstone; ausente se nenhum |
| ultimoEventoId, createdAt, updatedAt | R da transição atual; timestamps remotos |

serieId1–40 caracteres alfanuméricos/hífen. S não guarda todas revisões nem todas ocorrências. Qualquer O novo atualiza watermark=max(anterior,mesReferencia). Alteração de O já existente mantém watermark; cancelamento não o reduz. Pagamentos externos010 também incrementam S. Pagamento de fatura pode mudar F sem S: leituras corretivas devem incluir versão/controle de F.

S também guarda comandoAtual, imagem finita normalizada da última transição, igual à de R e substituída a cada versão. Ela permite às auxiliares validar S sem consultar outro recibo; não é array histórico. O candidato usa nomes de comando recCriarSerie/recMaterializar/recConfirmarValor/recEditarEsta/recRevisarFuturas/recPular/recCancelar/recEncerrar/recPagar/recReceber/recReverter, além de recInicializarFatura para a ponte de calendário. O envelope inclui versoesFaturas por ID e antes/depois fechados de O/V.

## V — revisoesRecorrentes/{serieId}-{YYYYMM}

Campos: schemaVersion,serieId,inicioMes,fimExclusivo? (ausente=sem próxima),version,descricao,categoriaId,valorCentavos,estimado,diaAncora,titularId?/contaPrevistaId?/cartaoId?/etiquetaIds?/observacao?,ultimoEventoId,createdAt,updatedAt. Natureza é a de S; assinatura exige cartão, sem titular explícito distinto. Todos os campos de negócio seguem FR-002/003/023. Classe de categoria compatível; referências novas ativas/próprias.

Cada revisão é segmento [inicioMes,fimExclusivo). A inicial cobre desde mês de início. Inserção dentro de segmento preexistente divide somente esse segmento: alterar seu fim para o novo início e criar V nova com o fim anterior. Identidade nova deve estar ausente; R guarda antes/depois do segmento anterior e conteúdo novo. Revisão já existente no mesmo início recebe nova versão/conteúdo sem mudar limites; R conserva conteúdo anterior. Atualização não cria sobreposição/lacuna. Nenhum V pode ser criado/alterado fora da transição exata em S/R.

Consulta do predecessor identifica candidato, mas autorização usa segmento existente contendo a vigência e a transição por indução a partir da revisão inicial. Não confiar em fim/precedente livre do comando. Materializar mês exige V existente cujo intervalo contém esse mês; V desatualizada após divisão deixa de autorizar mês fora do intervalo. Histórico de revisão de mês anterior à vigência permanece imutável.

## O — ocorrenciasRecorrentes/{ocorrenciaId}

ID=`r10-<serieId>-<YYYYMM>`, até51 caracteres. Campos imutáveis: schemaVersion,serieId,mesReferencia,natureza,createdAt. Outros: version,revisaoId/revisaoVersion,estado(persistida|pulada|cancelada),excecaoIndividual:boolean,motivoSupressao?,financeiro?,ultimoEventoId,updatedAt.

- Ausência: virtual quando revisão/datas/vigência permitem e ausência foi confirmada no snapshot.
- pulada: tombstone sem financeiro; exige motivo, nunca materializa depois.
- persistida: financeiro obrigatório; gera lançamento/compra e item lógicos na mesma confirmação porque são projeções do próprio O.
- cancelada: conserva financeiro e histórico; exigibilidade zero, sem apagar ou reativar.

financeiro externo: descricao,categoriaId,valorCentavos,estimado,competenciaPlanejamento,titularId?/contaPrevistaId?/etiquetaIds?/observacao?,dataPrevista(receita) ou vencimento/dataConsumo(despesa),liquidadoLiquidoCentavos,jaLiquidada. Consumo da ocorrência externa nasce da data programada explícita, não da data em que a tela foi aberta. Confirmar estimativa muda estimado=false/valor, sem caixa.

financeiro de assinatura: descricao,categoriaId,valorCentavos,estimado,dataCompra,cartaoId,faturaId,competenciaFatura,etiquetaIds?/observacao?. Compra lógica e único item usam O.id em namespaces distintos; o item refere compraId=O.id. Sem cópia em outra coleção. Planejamento usa competência de F, não mesReferencia; consumo usa dataCompra. Quitação/vedação de correções deriva de F/controle008 e não de um flag editável no item.

Exceção individual conserva seus valores próprios frente a revisões futuras. Revisão nunca remove tombstone. Uma O inicialmente virtual alterada/confirmada passa a persistida com excecaoIndividual=true; isso já é materialização financeira e exige todos os vínculos válidos. Campos financeiros não mudam em pagamento externo, exceto controles protegidos. jaLiquidada é monotônica mesmo após reversão.

## R — operacoesRecorrentes/{tipo}-{operationKey}

schemaVersion1,contractVersion1,tipo,operationKey,serieId,expectedVersion/resultVersion,comando canônico,manifesto limitado dos efeitos,antes/depois necessários,createdAt; fato opcional para pagamento/recebimento/reversão. Chave1–64 caracteres alfanuméricos/hífen; id deriva de tipo enumerado. Máximo32KiB, sem duas cópias completas de longos documentos se excederem. Nenhum hash/booleano do cliente prova integralidade.

S exige R novo create-only e version+1; R exige S pós-estado exato. O/V auxiliares exigem S pós-estado ligado ao mesmo R/comando. S valida lista finita de mudanças correspondentes. Mesmo UID obrigatório em todos os caminhos. R publica fato financeiro somente no comando explícito; nenhum evento extra005 ou pagamento inferido. M é marcador imutável por evento original para reversão integral única, copiando conta/data originais conforme005.

## Revisão de futuras: conjunto verificável

Para vigência A e fim anterior B exclusivo, definir U=min(ultimoMesOcupado, B−1), ignorando B quando ausente. Se watermark ausente ou U<A, intervalo de slots vazio. Caso contrário, todos os meses A..U entram na verificação, mesmo ausentes, suprimidos, protegidos ou com exceção própria; tamanho do intervalo não é apenas número de alvos editáveis.

Acima12 meses, rejeitar antes de consulta/escrita; abaixo disso aplicar orçamento18/8 e expressões/bytes, que pode reduzir ainda mais o conjunto aceito. Para cada mês, confirmar existência e conferir pós-estado: elegível sem exceção individual recebe novos campos; protegida/suprimida/exceção permanece exata; ausente continua ausente. Não materializar virtual apenas para revisar padrão. Uma nova O não pode ser criada por comando de revisão de futuras, portanto ausência provada antes não pode virar item oculto no mesmo commit.

S protege watermark desde a primeira criação. Omissão do comando de qualquer mês não altera conjunto derivado. Mudança de data/competência nunca move slot nem watermark. Uma O materializada durante prévia incrementa S e causa conflito; F alterada invalida respectivas versões. Vigência anterior ao mês atual é recusada em edição de futuras, mas correção individual histórica elegível é explícita. O novo segmento termina na próxima revisão já agendada (opçãoA).

## Consultas, cursores e índices propostos

| Fluxo | Consulta | Índice composto proposto |
| --- | --- | --- |
| Séries | S orderBy __name__, limit<=50, filtro natureza opcional | natureza ASC,__name__ ASC quando combinado |
| Revisão de um mês | V serieId==S,inicioMes<=M,order inicioMes DESC,limit1; validar fim | serieId ASC,inicioMes DESC,__name__ DESC |
| História de revisões | V serieId==S,order inicioMes/__name__,limit<=50 | serieId ASC,inicioMes ASC,__name__ ASC |
| Slots da janela | Gets exatos de IDs determinísticos no mesmo snapshot | Sem índice composto |
| Planejamento externo | O natureza==tipo,financeiro.competenciaPlanejamento==M,order __name__,limit<=50 | natureza ASC,financeiro.competenciaPlanejamento ASC,__name__ ASC |
| Itens de fatura010 | O natureza==assinaturaCartao,financeiro.faturaId==F,order __name__,limit<=50 | natureza ASC,financeiro.faturaId ASC,__name__ ASC |
| História/fatos | R serieId==S,order resultVersion/__name__,limit<=50 | serieId ASC,resultVersion ASC,__name__ ASC |
| Caixa por fluxo | R fato.tipo==T e intervalo de fato.dataEfetiva,order dataEfetiva/__name__,limit<=50 | fato.tipo ASC,fato.dataEfetiva ASC,__name__ ASC |
| Recuperação | Get do R exato e S/O exatos quando necessário | Sem lista global |

Conferir índices concretos ao implementar e entregar firestore.indexes.json completo; __name__ usa o desempate da consulta, sem criar índices redundantes já cobertos. Filtros de situação/titular/cartão/categoria que não tiverem índice ficam locais e explicitamente parciais, nunca disparam varredura ilimitada.

Leitor010 próprio permite somente essas consultas/get paths, Firebase ID token, snapshot fixo com TTL50min. Máximo100 documentos físicos por ação, até50 linhas de saída e janela<=12 meses. Cursor contém uid/generation,readTime,expiração,consulta normalizada,serie/mes/fase e pendências. Quando faltar slot/revisão/F no orçamento, guardar continuação sem emitir linha virtual não reconciliada. Mesmo resultado vazio deve ter readTime de servidor; refazer consulta inicial nesse readTime antes de juntar fluxos.

Para assinatura, combinar slots do mês de cobrança com itens persistidos por competência de fatura, deduplicando O.id. Séries não podem ser filtradas apenas por inicio/fim atual ou cartao atual: revisões e registros históricos podem pertencer a outro recorte. Projeção de planejamento em janela de faturas deve considerar cobranças do intervalo de ciclos dos snapshots006 que alimentam essas faturas, incluindo mês de cobrança anterior e exceções de escolha de fatura. Ler itens persistidos da fatura e manter indicação de projeção não resolvida se ciclo/destino virtual for ambíguo; não anunciar total completo baseado somente em mesReferencia da janela.

## Migração, entrega e reconstrução

Não reclassificar avulsos/parcelados em recorrência por descrição. Sem importação automática de003; eventual migração exige manifesto explícito, prova de identidade e compatibilidade. Novos readers devem compreender O010 antes de habilitar escrita; comandos010 precisam de perfis aprovados. Reversão de rollout desabilita escrita010 e preserva leitura/fatos, sem apagar tombstones ou aplicar Rules antigas que deixem escrita parcialmente protegida.

R guarda cadeia de versões contígua por S; auditoria exige snapshot completo para reconstruir revisões, watermark, origem e controles. Timestamps só ordenam exibição. Ausência de páginas deixa auditoria incompleta; divergência bloqueia mutações e não corrige dados automaticamente. Pagamentos de F são auditados no fluxo008, ligados a seus itens e controles; não se fabricam fatos individuais de caixa de assinatura.

## Bloqueio de compatibilidade identificado na implementação

T004 constatou que compra/item010 também deve inicializar/atualizar controlesItensFaturas e controlesFaturas008, com vínculos recíprocos e saldo/capacidade protegidos. A descrição acima não resolve esse grafo por ter fonteO única. Não habilitar materialização/correção/cancelamento de assinatura usando apenas F. Transição compartilhada exige redesenho antes de T005; ver contracts/security.md e validation.md.


## Modelo corrigido após retomada autorizada — prevalece sobre o bloqueio anterior

Aplicar remediation.md: O de assinatura incorpora capacidadeItem (schemaVersion1,valorOriginalCentavos,correcaoAcrescimosCentavos,correcaoReducoesCentavos,devolvidoCentavos,categoriaEfetivaId), vinculada à própria O.version/ultimoEventoId; original imutável e acumuladores exatos. Não criar J duplicado para ocorrenciaRecorrente. G permanece em controlesFaturas, schema2, e recebe delta no mesmo commit. Fonte do fechamento/ciclo é snapshot006 preservado em financeiro; G atual conserva autoridade de pagamento/histórico. Transferir cartão/F altera ambosG juntos e conserva identidade/capacidade. Nenhum fato de caixa nasce por correção.

Resolvedor de item008 deve aceitar tipo ocorrenciaRecorrente e buscar O; tipos parcelaCartao/encargo mantêm controlesItensFaturas. Rollout só após leitores/regras de todos esses tipos estarem harmonizados. Ponte006 incrementa G nas alterações de vencimento com saldo/histórico imutáveis. Inicialização de G depende da prova do protocolo descrito em remediation.md, nunca de ausência em página. Decisão completa, contagens e limites em remediation.md e rules-budget-profiles.json. A falha21 anterior se refere ao layout descartado, não aprova por si o novo layout.

G010 inclui calendarioVersion positiva, preservada em deltas de itens e incrementada exatamente com F.version em ajuste006. Inicialização exige F pré/pós idêntica e copia sua versão, impedindo inicialização no mesmo commit que muda o calendário. Esse campo é extensão explícita a harmonizar com leitores/controles008; legado sem o protocolo não recebe saldo zero automático. O primeiro candidato restringe o intervalo ocupado de revisão futura a um mês, embora a projeção permaneça de até12 meses. Comandos maiores exigem novo perfil comprovado.

