# Contract: Comandos e leitura de compromissos parcelados

Estado: desenho corrigido de agregado finito, documentalmente revalidado, com prova executável de G1/G2 pendente em T005–T007; não é API de backend. Implementar porta TypeScript específica em domain/finance/contracts/parcelados.ts quando gates forem resolvidos, usando Resultado/CodigoErro existentes. Valores de entrada são unknown na fronteira e normalizados/validados em execução.

## Envelope e identidade

contractVersion1; tipo; operationKey estável gerada antes do primeiro envio; uid obtido da sessão, nunca proprietário arbitrário no payload; expectedVersions das séries envolvidas; cada parcela tem identidade lógica estável (serieId, ordinal). A revisão do agregado serializa inclusive pagamentos de outras posições e invalida prévia antiga. Comando inclui snapshot conferido e manifesto canônico de efeitos. Ordenar etiquetas/posições, omitir opcionais ausentes, normalizar texto e dinheiro. ID série escolhido antes da tentativa; IDs das posições/eventos derivam de série, ordinal e intenção por tipo em namespace próprio. Não deduplicar intenções diferentes por descrição/valor.

## Operações

| Operação | Entrada e condições | Saída/efeito |
| --- | --- | --- |
| prepararCriacao | Tipo, descrição, categoria/referências, N/P, modo e dados do cronograma, original opcional | Prévia pura de P..N com total; sem escrita |
| criarSerie | Prévia canônica vigente, dados normalizados e identidades estáveis; versões0 para novos registros | Série com mapa fixo de N−P+1 obrigações e um evento/recibo juntos; sem pagamento/receita |
| prepararEdicao | Série, selecionada, alcance esta/estaEFuturasNaoPagas, mudanças e versão global esperada | Antes/depois, elegíveis/excluídas e razões, soma/datas/competências; sem escrita |
| editarParcelas | Mesma prévia e versões atuais; apenas ativas nunca liquidadas | Uma revisão do agregado e um recibo com mudanças por posição; preserva protegidas; não muda N/ordinais |
| cancelarParcelas | IDs explícitos da mesma série, motivo1–1000, prévia e versões; nenhum líquido válido | Retira exigibilidade apenas dos alvos, preserva fatos, recibo recuperável |
| substituirSerie | Série anterior, IDs antigos, motivo, prévia e nova entrada completa com nova identidade | Cancelamentos, nova série e obrigações juntos; não transporta fatos ou receita |
| pagarParcela | Alvo parcelaExterna, intenção, versão esperada da série, identidade da parcela e valor positivo<=pendência, conta ativa e data efetiva<=hoje | Fato e controle/versão juntos; não muda o conteúdo das obrigações, mas incrementa a revisão da série |
| reverterPagamento | Original confirmado da mesma obrigação, motivo e versão atual | Inversão integral única, conta/data herdadas e marcador único, reabre saldo |
| vincularReceita | Série empréstimo existente, receita própria existente, intenção, prévia e versão da série | Vínculo e revisão/recibo juntos; sem criar ou receber receita |
| consultarOperacao | Tipo/chave e comando canônico ou descritor UID/contrato/alvos | confirmado com IDs/versões; ausenteConfirmado; indeterminado |
| listarParcelas | Mês, filtros tipo/situação/titular, pageSize1–50, cursor opcional | Linhas e base temporal/snapshot/completo/cursor/motivos |
| detalheSerie | ID privado e paginação independente de parcelas/recibos | Metadados, parcelas e completude; não presume pagamento de posições anteriores |
| detalheParcela | ID privado e página de eventos | Origem, sequência de eventos, contas, valores e pendência conferidos |

Valor em lote é alteração explícita por posição na prévia. Ao preencher o mesmo valor para futuras, não recalcular total original nem redistribuir em protegidas. Não incluir campo alterado significa conservar cada valor atual, inclusive resto dos centavos.

Pagamento/reversão reutilizam cálculo da005/settlement, mas precisam ramo remoto parcelaExterna provado; adaptador atual não está habilitado para essas mutações. Comando de criação de receita continua005, fora do comando criarSerie. Interface só oferece confirmação do vínculo depois que receita existe; falha de vínculo não desmente receita confirmada.

## Prévia e concorrência

Prévia não é credencial de segurança. Confirmar exige reconstrução do plano a partir dos estados lidos e igualdade com manifesto conferido. Todas as leituras antes de escritas. Callback transacional não gera IDs novos, não limpa formulário e não mostra toast. Se versão divergir, abortar com conflitoVersao mesmo que nova tentativa automática do SDK tenha relido saldo mais recente; pedir nova conferência.

Data mensal em lote: novo vencimento selecionado + diferença em meses pelo ordinal, preservando dia-base e protegidas. Explícito: datas individuais. Competência só muda por escolha explícita. Se ordem não decrescente ficar impossível diante de protegida, rejeitar com posições conflitantes, sem alterar a protegida.

## Respostas e erros

Confirmado: operacaoId, identidades estáveis, versões resultantes e alvos; retorno repetido preserva resultado original. Comparar comando canônico completo antes de devolver recibo; mesma chave com conteúdo diferente retorna conflitoIdempotencia. Consultar pelo descritor identifica intenção/IDs/versões, sem afirmar igualdade de conteúdo não fornecido.

Sem alteração: se manifesto normalizado é vazio, retornar semAlteracao antes de reservar intenção, sem escrita/revisão/recibo, alinhado005. Encerrar intenção local e não reutilizar sua chave para outra intenção. Repetir esse comando reavalia versões; não prometê-lo como efeito persistido recuperável.

Usar códigos existentes: valorInvalido, limiteMonetario, dataInvalida, referenciaInvalida, naoEncontrado, conflitoVersao, conflitoIdempotencia, limiteOperacional, semPermissao, cotaExcedida, indisponivel, esquemaIncompativel, confirmacaoIndeterminada e configuracaoPendente quando configuração faltar. Incluir campo/limite/recuperação sem expor dados de terceiros. Excesso nunca divide comando.

Após erro de envio consultar a mesma intenção no servidor; encontrado confirmado devolve sucesso original; impossível confirmar mantém indeterminado, não cria chave nova. Ausência pontual não cancela tentativa ainda em voo: antes de outra intenção, concluir/abandonar explicitamente a anterior e reler estado; preferir repetir mesma chave. Logout encerra contexto local, dados e respostas tardias não atravessam sessão. Não prometer retomada persistida de rascunho após fechar navegador.

## Agregado finito e leitura

Obrigações são entradas fixas P..N de seriesParceladas, não documentos em lancamentosExternos. Um evento por comando guarda patches limitados e fatos; serialização por série exige nova prévia diante de qualquer revisão concorrente. Paginação física de séries por competencias array-contains expande até50 linhas lógicas, com cursor série/ordinal/snapshot; não perder posições ao cortar página. Vínculo de receita segue FR-011: zero ou uma por série e por receita, sem troca silenciosa. Ver data-model.md para campos e contracts/security.md para orçamento máximo.



## Leitor e limites por ação

A porta recebe consultas tipadas de mês, detalhe, caixa e recuperação, nunca caminho livre. Leitor próprio009 suporta readTime fixo e array-contains; não supor que o leitor005 já entende coleções novas. Snapshot expira localmente em50min, conforme data-model.md; recusar mistura de snapshots e cursors de outra sessão/consulta.

Página mensal percorre no máximo duas páginas físicas de até50 séries por ação e emite até50 linhas lógicas em ordem serieId/ordinal. Se o teto de busca for atingido antes de preencher página, pode devolver zero linhas com cursor/completo=false e motivo leituraLimitada; não declarar mês vazio nem iniciar loop de busca ilimitada. Cursor conserva a posição parcialmente consumida; próxima ação retoma sem omissões. Detalhe e caixa mantêm cursores por fluxo, base temporal e completude próprios.

Criar exige referências comuns entre posições. A prévia explícita individualiza valores, vencimentos e competências, não até12 conjuntos de novas referências no mesmo comando. Histórico é exibido por data/ID; auditoria financeira valida versões contíguas por série no mesmo snapshot antes de reconstruir resultados definitivos.
