# Contract: Consultas, snapshot e índices011

## Porta de leitura

PortaPainel expõe iniciar(consulta),continuar(cursor),atualizar(consulta),detalhar(indicador/chave,snapshot,cursorDetalhe?) e invalidarSessao(). UID/generation vêm do contexto pronto; nenhuma função aceita UID arbitrário, caminho livre ou StructuredQuery do chamador. Resultados usam Resultado do domínio e IndicadorPainel discriminado. Não há executarComandoFinanceiro nesta porta.

Adapters typed recebem snapshot e concessão de orçamento do coordenador, nunca iniciam snapshot próprio ou teto100 independente. Produtos005/006 públicos preservam comportamento; novo consumo de leitura não passa cursores fabricados para listar005. Leituras de007–010 são condicionadas às capacidades reais registradas.

## Aquisição e consistência

1. Validar1..12 meses, modo,filtros,contexto atual e capacidades das fontes antes de rede. Resolver sessão/token pelo caminho existente, sem persistir token.
2. Sondar runQuery permitida de lancamentosExternos limit1 sob users/{uid}; contar documento eventualmente retornado e requisição. Ler readTime inclusive quando vazio; ausência de readTime, esquema inesperado ou instante incompatível impede início.
3. Escolher readTime de servidor com precisão REST suportada; guardar expiresAt=readTime+50min. Reexecutar a consulta de origem no readTime fixo; sondagem não entra diretamente no resumo.
4. Todas as queries/batchGets e referências de todas as fontes usam o mesmo readTime. Normalizar timestamp sem perder precisão; rejeitar resposta com tempo divergente ou caminho fora da allowlist. Não usar Date.now para fabricar readTime.
5. Fixar hojeFinanceiro/fuso na consulta para estados derivados; virtual usa S/V/O/F desse instante. ReadTime não muda entre páginas, meses, filtros da mesma visão e detalhe; nova consulta sem snapshot compartilhável abre nova visão explícita.
6. TTL vencido, erro de snapshot ou schema desconhecido: não continuar nem migrar cursor para novo readTime. Atualizar integralmente. Mudança de filtro pode reaproveitar dados só se sua cobertura e snapshot forem suficientes; senão iniciar nova consulta.
7. Server-side regras de autorização são avaliadas no pedido atual, mesmo lendo dados antigos. Falha de permissão invalida cache e acesso; não apresentar dados privados retidos após revogação.

Transporte: Firebase ID token, HTTPS/firestore.googleapis.com/v1, no-store, redirect:error, allowlist exata de projeto/db/uid/coleções/IDs, AbortController20s e checagem ctx.atual antes/depois de token/rede/decode. Decoder fechado de tipos seguros e timestamps; sem caminhos livres e sem chave administrativa.

## Agendamento, cursores e cache

Máximo global por rodada:100 documentos físicos retornados,8HTTP,50 documentos por query,8 referências por batch exato sujeito à prova Rules. Reservar antes de chamar e descontar efetivo; concorrência não multiplica orçamento. Incluir sondagem/releitura, controles, referências/cadastros, duplicatas, candidatos descartados por filtro e missing nas cotas pertinentes. Sem retry silencioso em loop. Mesmo100 documentos sem linhas visíveis retorna parcial e continuação.

Scheduler determinístico por fonte,mês/fase, com retomada justa: continuar trabalho pendente sem reiniciar fluxos concluídos e sem deixar fonte faminta. Para queries de datas008, guardar data atual/cursor de evento; não executar365 queries vazias numa ação. Página cheia exige próxima consulta para provar fim; página curta encerra só o fluxo correspondente. Reservar capacidade para lote de referências e reconciliar antes de emitir linha virtual.

Cursor de memória vincula consulta canônica,UID/generation,readTime/expiração,versão do adapter,fonte/mês/fase,posições,ordinais009 e filas pendentes. Armazenar no cache limitado, não na URL. Um documento retornado em duas queries conta nas leituras reais, mas normaliza uma vez por identidade; efeitos diferentes conservam IDs próprios. Limite de cache2janelas/8MiB impede crescimento ilimitado: mostrar limite/recorte menor sem truncar para total completo.

Filtros locais só valem sobre cobertura já buscada; não comandam busca automática ilimitada até preencher50 resultados. Rótulo parcial deve continuar mesmo se página filtrada estiver vazia. Cache chaveia snapshot+consulta+UID/generation+revisão de contrato. Atualização é shadow view; promoção integral após cobertura coerente. Detalhe usa mesmo handle/snapshot; expiração ou capacidade ausente requer atualização conjunta.

## Matriz concreta de consultas

Todas as coleções são filhas diretas de users/{uid}. Ordem inclui __name__ como desempate. Índices são propostas para implementação, não índices ativos. Preservar single-field quando suficiente, evitar duplicar __name__ implícito. Consultas com índice ausente retornam configuracaoPendente sem escanear coleção como alternativa.

| Fonte/fluxo | Filtro e ordem | Índice/cobertura |
| --- | --- | --- |
|005 planejamento | lancamentosExternos natureza EQ,competenciaPlanejamento EQ; dataPrevista ou vencimento ASC,ID ASC | Preservar compostos005 de natureza/competência/data |
|005 consumo | lancamentosExternos natureza=despesa,dataConsumo dentro das datas da janela; dataConsumo ASC,ID ASC | Novo composto natureza,dataConsumo; origem cancelada/estimada tratada pelo mapper |
|005 caixa | operacoesExternas fato.dataEfetiva dentro da janela; data ASC,ID ASC | Campo de data e desempate; eventos sem fato não contribuem; reversão conserva data original |
|006 calendários | faturas competencia entre início/fim; competencia ASC,ID ASC; variante cartaoId EQ | Campo simples ou composto cartaoId,competencia existente. Não consultar todos cartões antes de buscar período |
|007 itens de fatura | parcelasCartao faturaId EQ; ID ASC; obter compras por IDs com snapshot | Índice faturaId existente/proposto007; conferir revisão e lista corrente, ignorar parcelas obsoletas |
|007 consumo | compras dataCompra no intervalo; dataCompra ASC,ID ASC | Single-field e variante cartaoId,dataCompra se cartão remoto; valor total só uma vez |
|008 posição | controlesFaturas get por F.id; controlesItensFaturas por ID tipado, quando item007/encargo; O010 para item recorrente | Exatos, sem lista global. Estado de controle não é reconstrução completa |
|008 ajustes/encargos por fatura | operacoesLiquidacoesFaturas faturaIds array-contains F.id;createdAt,ID | Composto faturaIds ARRAY,createdAt/ID conforme direção publicada008; filtrar efeitos do alvo |
|008 caixa | operacoesLiquidacoesFaturas datasCaixa array-contains cada data da janela;createdAt,ID | Composto datasCaixa ARRAY,createdAt/ID; deduplicar documento, filtrar cada efeito por data real |
|008 consumo | operacoesLiquidacoesFaturas competenciasConsumo array-contains cada mês;createdAt,ID | Novo composto competenciasConsumo ARRAY,createdAt/ID, sujeito à evolução fechada008 e provaG2 |
|009 planejamento | seriesParceladas competencias array-contains mês;ID ASC | Índice array009; expandir mapa, selecionar só slots do mês e deduplicar série já vista em meses distintos |
|009 consumo conhecido | seriesParceladas tipo=compromissoExterno,dataConsumo na janela;dataConsumo,ID | Composto tipo,dataConsumo; ausência não vira data inventada. Empréstimo excluído do consumo presumido |
|009 caixa | operacoesParceladas fato.tipo EQ,fato.dataEfetiva no intervalo;data,ID | Composto fato.tipo,fato.dataEfetiva; converter contextoParcela do evento, sem buscar toda série histórica |
|010 descoberta virtual | S versaoIndiceVirtual=1,virtualElegivel=true,inicioVirtual<=fim da faixa,fimVirtualInclusivo>=início da faixa;order fimVirtualInclusivo ASC,inicioVirtual ASC,ID ASC;limit<=50 | Novo composto versaoIndiceVirtual,virtualElegivel,fimVirtualInclusivo,inicioVirtual e desempateID. Vigência derivada e cobertura de legados conforme data-model; não filtrar pelo cartão/categoria/padrão atual |
|010 revisão/slots | revisoesRecorrentes serieId EQ,inicioMes<=mês;inicioMes DESC,ID DESC,limit1; IDs exatosO | Composto serieId,inicioMes DESC; validar fim; batch slots ausentes no mesmo snapshot |
|010 persistidas externas | O natureza EQ,financeiro.competenciaPlanejamento EQ;ID ASC | Composto natureza,financeiro.competenciaPlanejamento; captura competência ajustada fora do mesReferencia |
|010 itens de fatura | O natureza=assinaturaCartao,financeiro.faturaId EQ;ID ASC | Composto natureza,financeiro.faturaId; combinar com meses de cobrança/ciclos010 e exceções de destino |
|010 consumo externo/cartão | O natureza EQ,financeiro.dataConsumo ou financeiro.dataCompra no intervalo;data,ID | Compostos separados natureza,data adequada; unir com virtuais do projetor010 e deduplicar O.id |
|010 caixa | R fato.tipo EQ,fato.dataEfetiva no intervalo;data,ID | Composto fato.tipo,fato.dataEfetiva conforme010 |
|Referências/detalhe | IDs fechados de origem,calendário,controle,categoria,titular,etiqueta e evento pertinente | batchGet no mesmo readTime, sem buscar lista inteira de cadastros/histórico para nomear uma linha |

Datas de janela usam intervalo fechado no último dia financeiro suportado, evitando avançar além de9999-12-31. Consultas mensais por arrays009/008 são realmente uma por valor, não suposto array range. Usar cursor por subfluxo e não assumir ordenação global por vencimento de séries expandidas.

Recorrências em faturas exigem intervalo de cobranças que alimenta ciclos deF, incluindo mês anterior e exceção de primeira fatura; mesReferencia da janela não basta. Reutilizar resolver010, não reconstruir regra de fechamento011. Se calendário/destino não resolvido, parte virtual permanece pendente.

A descoberta virtual é por sobreposição de vigência, não listagem de todas as séries do UID. Adaptar contrato010 e seu esquema fechado para os metadados derivados definidos em data-model.md; provar a consulta composta e o cursor com ambos os campos de ordenação no projeto autorizado. Não usar fallback que percorra catálogo histórico sem predicado temporal. Séries longas ainda vigentes são candidatas legítimas, mesmo se criadas há anos. Persistidas são lidas pelo seu recorte financeiro independentemente da elegibilidade virtual, preservando confirmações posteriores ao encerramento e competências alteradas. O fim de todos esses fluxos e cobertura dos legados são necessários para total integral.

## Evolução de metadados e cobertura

competenciasConsumo008 é extensão deliberada ao contrato de origem, com cardinalidade exata0/1 por variante e lista obrigatória canônica conforme data-model.md. Ausência é legado; [] é declaração validada de nenhum efeito de consumo. Sem campo/versão e completude remota comprovada, total integral de consumo008 fica indisponível; não consultar por createdAt nem varrer eventos de todos os anos. Migração, se necessária, tem manifesto/autorização própria.

G0-local libera somente domínio, transporte controlado e interface com fixtures, incluindo a integração de limpeza/aborto de sessão desde a fundação. G0-remoto comprova snapshot e alteração concorrente por segundo cliente durante carga, continuação e detalhe antes de habilitar consultas de produto ou aprovar o MVP. Testes autenticados autorizados podem executar antes da habilitação de produto para produzir essa prova. US5 amplia cenários; não é o primeiro teste de logout ou concorrência.

Validação de um controle pode exigir itens e eventos da fatura-alvo além das datas do mês; é leitura por dependência do alvo do recorte, limitada/paginada. Ao atingir orçamento/cache, parar com parcialidade. Não prometer reconstruir toda cadeia financeira de qualquer tamanho. Pendência atual do planejamento vem do controle válido do alvo, não consulta por data de pagamentos daquele mês.

## Falhas e capacidades

Reutilizar códigos valorInvalido,dataInvalida,limiteOperacional,limiteMonetario,semPermissao,cotaExcedida,configuracaoPendente,esquemaIncompativel,integridadeIndeterminada,indisponivel. Snapshot expirado pode mapear para erro de consulta com recuperação reler e motivo snapshotExpirado, sem mudar enum público003 sem testes. Capacidade não habilitada é motivo do indicador, não falsa sessão inválida.

CapacidadeFonte registra contrato/schema suportados,coleções/bases,readTime aceito,índices/regras verificados e evidência real. Falta da capacidade não prova que usuário não tem registros: impede total integral do domínio dependente. Por padrão todas as dependências ausentes são indisponíveis; fixtures locais não alteram availability de produção.
