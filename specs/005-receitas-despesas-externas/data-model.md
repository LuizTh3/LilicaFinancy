# Data Model: Receitas e despesas externas

## Convenções

Caminhos privados sob users/{uid}. UID só vem da sessão/caminho; não serializar ownerUid/uid nos documentos. IDs avulsos e chaves usam `[A-Za-z0-9-]{1,64}`; UUID gerado antes da primeira tentativa. IDs compostos são montados de partes tipadas, nunca caminhos livres. Enumerações e mapas têm campos fechados. Ausência opcional não é null. Calendário canônico da 003; timestamps técnicos separados.

Esquema financeiro inicial 1; versão de contrato externo 1. version positiva segura da origem inicia em 1 e avança exatamente uma unidade por operação efetiva. Evento e marcador são imutáveis. Decodificar unknown com validação completa; esquema desconhecido bloqueia escrita. Limites 32 KiB/documento e 16 KiB/comando normalizado incluem metadados/Unicode, sem truncamento.

## lancamentosExternos/{id}

Uma origem é receita ou obrigação externa avulsa. Unificar armazenamento não unifica naturezas ou autoriza alteração entre elas.

| Campo | Tipo e regra |
| --- | --- |
| schemaVersion | int 1, imutável |
| natureza | receita/despesa, imutável |
| descricao | string trim 1–120 caracteres |
| categoriaId | ID obrigatório, natureza compatível |
| valorCentavos | inteiro positivo seguro, autoridade do previsto/original |
| estimado | boolean, inicial false se não escolhido |
| competenciaPlanejamento | YYYY-MM obrigatório, independente das datas |
| dataPrevista | YYYY-MM-DD obrigatório apenas na receita |
| vencimento | YYYY-MM-DD obrigatório apenas na despesa |
| dataConsumo | YYYY-MM-DD obrigatório apenas na despesa; rótulo Data de ocorrência |
| titularId, contaPrevistaId | IDs opcionais |
| etiquetaIds | lista ordenada de 0–5 IDs distintos; usar ausência se vazia |
| observacao | string opcional trim, até 1000 caracteres; vazio normaliza para ausência |
| estadoObrigacao | ativa/cancelada, sem reativação |
| version | int >=1, +1 por evento efetivo |
| liquidadoLiquidoCentavos | projeção int 0..valorCentavos; só delta provado por evento |
| jaLiquidada | boolean monotônico false→true no primeiro pagamento/recebimento; nunca volta a false |
| ultimoEventoId | ID do recibo/evento da versão atual, obrigatório |
| substituiOrigemId | ID opcional imutável; origem anterior cancelada da mesma natureza/UID, nunca self |
| createdAt, updatedAt | timestamps; criação preservada, atualização igual request.time |
| canceledAt, cancelamentoMotivo | somente cancelada; instante e motivo trim 1–1000 |

Não persistir pendente, estadoPago ou totais mensais adicionais. Derivar exigível = ativa ? valor : 0; pendente = exigível − liquidado; estado parcial/integral conforme spec. Cancelada implica liquidado=0. jaLiquidada é memória permanente do histórico, não sinalizador editável de quitação. Referências e conteúdo não mudam depois de jaLiquidada=true; apenas projeção/revisão/último evento, ou cancelamento sem fatos válidos, podem mudar.

Uma despesa avulsa gera no adaptador dois DTOs lógicos da 003 (origem de consumo e compromisso com o mesmo ID), sem duplicar documentos ou somar ambos no planejamento. Receita mapeia ReceitaPlanejamento. dataConsumo não deriva do vencimento, competência ou pagamento.

## operacoesExternas/{tipo}__{operationKey}

Tipos fixos: criarReceita, criarDespesa, gastoImediato, editarOrigem, cancelarOrigem, receber, pagar, reverterRecebimento, reverterPagamento. O delimitador não ocorre nas chaves. Identidade do evento é também identidade do fato quando presente; tipo+chave determina caminho antes do envio.

| Campo | Tipo e regra |
| --- | --- |
| schemaVersion, contractVersion | int 1 |
| tipo, operationKey | enum acima e ID da intenção, coerentes com caminho |
| origemId, natureza | ID e enum coerentes com origem |
| expectedVersion, resultVersion | int >=0 e expected+1; criação/imediato expected=0 |
| comando | mapa fechado específico do tipo; conteúdo normalizado completo, sem timestamps/token |
| antes | conteúdo de negócio anterior, apenas editar/cancelar; ausência na criação; cópia conferida contra resource da origem |
| depois | conteúdo de negócio resultante, conferido contra origem após; liquidação não copia conteúdo financeiro mutável como nova autoridade |
| fato | mapa presente só em receber/pagar/gastoImediato/reverter; campos abaixo |
| createdAt | timestamp request.time, imutável |

comando é comparado por campos e valores, nunca apenas hash fornecido pelo cliente. Strings canônicas auxiliares, se usadas no adaptador, não substituem igualdade estrutural nas Rules. Campos opcionais e arrays normalizados têm representação única.

Fato: tipo pagamento/recebimento/reversaoPagamento/reversaoRecebimento, valorCentavos positivo, dataEfetiva YYYY-MM-DD, contaId, e originalId/motivo somente na reversão. origemId vem do evento e aponta exatamente um alvo. No gasto imediato fato.tipo=pagamento e valor=valor da nova origem. Receita não aceita fato pagamento. Não aceitar reembolso, crédito, parcela de cartão ou fatura nesta coleção.

Inversão: valor/conta/data iguais ao fato original integral; tipo inverso correspondente e motivo obrigatório. O ID do original aponta evento com fato inicial, não inversão. Fato recebido em consulta incompleta não pode ser considerado integralmente validado sem dependências.

## reversoesExternas/{eventoOriginalId}

Campos fechados: schemaVersion=1, origemId, originalId igual ao ID do caminho, reversaoEventoId, createdAt=request.time. Create-only; validação exige original válido e evento inverso novo na mesma operação. Reversão exige este marcador no pós-estado. Nova intenção sobre original já marcado falha; mesma intenção retorna recibo original sem escrever.

Essa coleção não contém um segundo efeito de caixa. É prova de unicidade. Get próprio permitido para retomada/validação; list e toda alteração/exclusão negados.

## Categoria e conta: evolução schema 2

Somente categorias e contas evoluem; titulares, etiquetas, perfis e recibos cadastrais anteriores preservam seu esquema. Novo cadastro de categoria/conta usa schemaVersion=2. Leitura aceita 1/2 explicitamente; legado 1 pode ser mantido até uso/migração explícita. CRUD normal conserva metadado e versão de formato conhecidos, e nunca expõe usoFinanceiro em formulário.

usoFinanceiro é mapa opcional fechado: eventoId, origemId, papel classificacao/movimentacao e createdAt. Categoria congela natureza na primeira referência, incluindo previsão; conta congela tipo/trio da base na primeira movimentação. Referência de conta prevista não cria trava. Não copiar a trava para titular da conta ou etiquetas.

Primeiro uso atualiza apenas schemaVersion 1→2 quando necessário e acrescenta usoFinanceiro; nenhum campo de conteúdo, version, updatedAt, createdAt ou archivedAt cadastral muda nesse patch. Uma vez presente, mapa é imutável para sempre, inclusive após cancelamento/reversão da origem. CRUD posterior pode renomear/arquivar como antes, mas preserva a trava; alterações sensíveis são negadas se metadado existir no antes ou depois.

Controles legados usoCadastros/{categorias|contas}__{id} permanecem imutáveis e reconhecidos em sensitiveAllowed do CRUD; sua presença também bloqueia alteração sensível. Não eliminá-los, não interpretar conteúdo malformado como ausência. Se houver controles legados incompatíveis ou consumidores desconhecidos, registrar incompatibilidade e bloquear migração afetada, sem inventar primeiro uso. Não há dados financeiros anteriores autorizados pela 004; eventual descoberta de tais documentos exige migração dedicada antes da liberação.

Atualizar validCatalogDoc, validContent, serializers e recibos cadastrais para preservar metadados protegidos. Recibo de CRUD continua descrevendo conteúdo editável, sem usoFinanceiro. Primeiro uso é provado pelo evento financeiro, não por recibo cadastral forjado.

## Transições e projeção

| Operação | Pré-condição | Efeito atômico |
| --- | --- | --- |
| Criar previsão | origem ausente, expected=0 | origem ativa, liquidado=0, jaLiquidada=false, evento/recibo e primeiro uso da categoria se necessário |
| Gasto imediato | origem ausente, conta ativa | origem ativa, liquidado=valor, jaLiquidada=true, evento com pagamento e travas necessárias |
| Editar | ativa, jaLiquidada=false, versão atual | conteúdo corrigido, nova versão/evento e trava de nova categoria se necessário |
| Pagar/receber | ativa, versão atual, 0<valor<=pendente | novo evento/fato, liquidado += valor, jaLiquidada=true, trava de conta se necessário |
| Reverter erro | original válido sem marcador e versão atual | evento inverso e marcador; liquidado -= valor original; jaLiquidada continua true |
| Cancelar | ativa, versão atual, liquidado=0 | cancelada com motivo, evento sem fato; histórico preservado |
| Repetir intenção | recibo existente com mesmo comando | retornar IDs/versão originais, nenhuma escrita |

Editar sem diferença normalizada/cancelar já cancelada, com expectedVersion igual à versão atual: semAlteracao sem escrita, recibo, revisão ou reserva persistente de chave. É exceção de FR-016 à recuperação de resultados confirmados: cliente encerra intenção/descritor, e nova intenção usa nova chave. Repetir o comando antigo revalida estado/versão e conflita se a versão mudou; não há resultado persistido para recuperar ou corpo anterior para comparar. Reverter nova intenção de fato já revertido é conflito, não semAlteracao. Criar outra origem com a mesma descrição/valor e outra chave é intenção distinta.

## Reconstrução e migração da projeção

Para uma origem, obter snapshot T, paginar todos os eventos ordenados por resultVersion e exigir sequência 1..version sem duplicações/lacunas. Validar IDs, tipo, conteúdo antes/depois e recibo encadeado; somar apenas fatos iniciais menos inversões únicas, conferir marcadores, valor original e ultimoEventoId. Derivar jaLiquidada pela existência de qualquer fato inicial. Comparar projeção persistida e estados com reconstrução.

Divergência, tipo desconhecido ou marcador sem correspondente torna integridadeIndeterminada e bloqueia mutação no adaptador. Indução das Rules deve impedir divergência em novas escritas normais. Reconstrução cliente não concede poder de sobrescrever controle: correção de corrupção/migração exige ferramenta restrita, manifesto, prévia e autorização explícita separada, nunca seed/reparo no login. Não inferir liquidação a partir de campos pagos de esquema desconhecido.

## Consultas e índices

Listas e hidratação usam o mesmo readTime; detalhes em contracts/queries-ui.md. Índices COLLECTION a acrescentar, com desempate __name__ ASC:

- lancamentosExternos: natureza ASC + competenciaPlanejamento ASC + dataPrevista ASC, para receitas.
- lancamentosExternos: natureza ASC + competenciaPlanejamento ASC + vencimento ASC, para despesas; juntar as duas fontes por data e ID no adaptador, sem campo adicional de ordenação.
- operacoesExternas: fato.dataEfetiva ASC + __name__ ASC, para intervalo mensal; somente eventos com fato participam.
- operacoesExternas: origemId ASC + resultVersion ASC, para histórico/reconstrução.

Situação, categoria e titular são filtrados localmente após carregar o recorte mensal; contagens parciais rotuladas. Não criar matriz combinatória de filtros remotos.

Preservar índices/fieldOverrides existentes; isentar comando/antes/depois, observacao e motivo de indexação quando não consultados, sem isentar origemId/resultVersion/fato.dataEfetiva. Nomes são atuais dos cadastros, que continuam acessíveis após arquivamento.
