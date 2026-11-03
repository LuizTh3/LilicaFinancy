# Data Model: Séries externas e empréstimos manuais

## Protocolo de criação aprovado em 26/10/2026 — candidato não habilitado

Além de S/R, cada nova série exige `users/{uid}/validacoesParceladas/{eventoId}__{serieId}` (V), com campos fechados `schemaVersion:1`, `serieId`, `eventoId`, `resultVersion:1`, `createdAt`. A identidade é determinística e V não guarda valores nem cronograma. S/R/V devem ser confirmados atomicamente com o mesmo timestamp de servidor; V é imutável, sem list/update/delete. S exige V; V exige a série nova e o recibo de criação/substituição recíprocos. Comprovante antigo, órfão ou divergente não autoriza uma criação. Séries antigas não recebem comprovantes presumidos nas leituras.

O repositório candidato de criação implementa o protocolo, ainda desabilitado para produção. Substituição ainda depende de seu escritor completo. O orçamento candidato de criação máxima é 18 acessos e de substituição máxima é 21, exigindo rejeição integral acima de 18. Esse adendo substitui as contagens históricas para novas séries abaixo. A prova oficial ainda não passou: ver [estado atual](witness-status-2026-10-26.md).

## Decisão de persistência

Uma série é um agregado finito em `users/{uid}/seriesParceladas/{serieId}`, com um mapa de no máximo 12 obrigações. Não há documentos-filho obrigatórios por parcela ou alterações nos schemas de `lancamentosExternos`/`operacoesExternas`. Pagamentos, reversões e revisões são eventos imutáveis separados em `operacoesParceladas`. Reutilizar cálculo de `settlement.ts`, dinheiro e calendário; não reutilizar o armazenamento avulso como se empréstimo fosse despesa avulsa com data de consumo obrigatória.

A constituição proíbe guardar toda a vida financeira ou histórico crescente em um documento. Aqui o mapa é fixado em P..N na criação e não cresce: uma série de até 12 obrigações, sem lista de pagamentos. Renegociação cria outro agregado. Limites de 32 KiB/documento e 1 MiB/comando continuam obrigatórios; metadados longos que excederem o tamanho são rejeitados, não truncados.

## Tipos e limites

BRL em centavos inteiros seguros até 9.007.199.254.740.991. Valor de obrigação/pagamento positivo; zero apenas em controles/resultados. Datas YYYY-MM-DD gregorianas de 1900 a 9999, competência YYYY-MM; datas financeiras independentes de timestamps técnicos. Categoria, titular, conta e etiquetas sempre privados do UID; novos vínculos ativos; arquivados só conservados exatamente no papel já existente conforme 004. Descrição 1–120, observação/motivo até 1000, até cinco etiquetas por obrigação. Campos opcionais desconhecidos omitidos, nunca inventados.

## seriesParceladas/{serieId}

| Campo | Contrato |
| --- | --- |
| schemaVersion, version | 1; revisão do agregado incrementa exatamente uma vez por comando com efeito |
| tipo | compromissoExterno ou emprestimo, imutável |
| origemDados, quantidadeOriginal, numeroInicial | nova/migrada; N inteiro 1–12; P inteiro 1–N; nova implica P=1; imutáveis |
| descricao, modo, diaAncora? | Identificação; mensal/explicito; dia-base mensal 1–31 |
| valorOriginalCentavos?, dataContratacao?, dataConsumo? | Somente se conhecidos; não inferir de soma ou hoje |
| parcelas | Mapa de chaves canônicas p01..p12, exatamente P..N; sem entradas anteriores a P |
| competencias | Lista derivada, distinta e ordenada das competências de todas as parcelas cadastradas, inclusive canceladas; até 12; não é autoridade financeira |
| ultimoEventoId | Recibo/evento confirmado que corresponde à revisão atual |
| receitaVinculadaId? | Até uma receita explicitamente vinculada ao empréstimo nesta entrega |
| substituiSerieId?, substituicaoEventoId? | Vínculos imutáveis da substituição; nova série aponta anterior preexistente |
| createdAt, updatedAt | Timestamps remotos |

Na criação, categoria, titular, conta prevista e etiquetas são comuns a todas as posições, inclusive cronograma explícito; só valores/datas/competências são individualizados nessa entrada inicial. Edição posterior permite diferenças por ocorrência ou patch comum das elegíveis. Essa restrição de forma do comando corresponde às referências contadas em contracts/security.md.

Cada entrada de `parcelas` contém: numero, quantidadeOriginal, descricao, categoriaId, valorCentavos, competenciaPlanejamento, vencimento, titularId?/contaPrevistaId?/etiquetaIds?/observacao?, estadoObrigacao ativa/cancelada, liquidadoLiquidoCentavos, jaLiquidada, ultimoEventoParcelaId e dados de cancelamento quando aplicável. Identidade lógica estável é o par (serieId, numero), sem reutilização; a porta expõe o ID lógico serieId__pNN, com NN de01 a12. serieId usa o validador existente de1–64 caracteres alfanuméricos/hífen, sem underscores; a separação é reversível e sem colisão. O ID composto usa validador próprio, sem passar pelo safeId de cadastro. Guardar ordinal nos dados permite comprovar correspondência à chave.

Valor/estado de cada obrigação tem fonte única nesta entrada protegida e seu histórico de eventos. Não manter cópia em documentos avulsos ou em um índice financeiro editável. Saldos são controles reconstruíveis; não somar o agregado por cima das parcelas. “Uma obrigação por parcela” é identidade de negócio, não exigência de um documento físico por obrigação.

## Transições e concorrência

- Criar gera mapa completo P..N, líquido zero e jaLiquidada=false, sem fatos de caixa.
- Editar só entradas ativas sem histórico de pagamento; cancelar só alvos com líquido zero, inclusive após reversões. jaLiquidada é monotônico e não volta a false.
- Pagar altera controle e ponteiro da entrada selecionada; preserva conteúdo e todas as demais entradas. Reversão integral do erro conserva a conta/data originais e cria marcador único.
- Mesmo pagamento de outra parcela incrementa a revisão do agregado e invalida prévia antiga. Esse conflito conservador é explícito: reler e conferir, sem aplicar silenciosamente sobre outra revisão. Limite de 12 torna a serialização por série aceitável; não há promessa de gravações paralelas independentes dentro de uma série.
- Edição/cancelamento compara mapa inteiro pré/pós em helpers finitos por posição, preservando não alvos e protegidas, sem chamadas externas por posição. Um patch de referências novo é comum às posições elegíveis do comando; valores/datas continuam individuais. Se entradas exigirem diferentes patches, executar intenções de edição separadas e conferidas pelo usuário, nunca fracionar automaticamente o mesmo comando.
- Substituição atualiza o agregado antigo, cria um novo e um único recibo com ambos os resultados, na mesma confirmação. Preserva entradas antigas canceladas e fatos antigos; nova identidade, sem transporte de pagamentos/receita. Sem ciclo: anterior deve existir antes, nova deve ser criação e referência imutável.

## operacoesParceladas/{tipo__operationKey}

Um evento imutável é também o recibo de uma intenção. Campos: schemaVersion/contractVersion=1, tipo, operationKey, seriesIds (um ou dois), versões esperadas/resultantes, comando canônico, mudanças por posição, fato opcional, createdAt. Mapas de antes/depois guardam somente campos alterados e os controles necessários à prova/reconstrução; não copiar dois snapshots completos por série quando isso exceder o limite de documento. Na criação, registrar todos os dados iniciais. Máximo 24 posições por substituição, sujeito ao tamanho total; sem arrays históricos crescentes.

Tipos: criarSerie, editarParcelas, cancelarParcelas, substituirSerie, pagarParcela, reverterPagamento e vincularReceita. Eventos de pagamento/reversão referenciam exatamente serieId/numero; projeção em `FatoLiquidacao` usa alvo `parcelaExterna`. Não criar evento duplicado em operacoesExternas.

R exige estado final das séries e versões/ultimoEventoId exatos; cada série exige R correspondente. Transição estrita de revisão e R create-only impedem usar evento antigo em mutação nova. O histórico de uma parcela é consultado pelos eventos da série e suas mudanças por posição; após pagamento de outra posição a revisão global avança, sem exigir evento próprio fictício na parcela não alterada.

## reversoesParceladas/{originalEventoId}

Marcador imutável de reversão integral única: serieId, numero, originalEventoId, reversaoEventoId e createdAt. Original e reversão permanecem eventos separados. Recriação do marcador é negada; reverter uma reversão e reversão parcial ficam fora. Conta/data herdadas mesmo arquivada para esse papel histórico; novo pagamento exige conta efetiva ativa.

## vinculosReceitasEmprestimos/{receitaId}

Vínculo imutável serieId/receitaId/operacaoId/createdAt, único por receita. Campo receitaVinculadaId protegido na série impede segunda receita para a mesma série. Cardinalidade 0..1 receita por série e 0..1 série por receita, explicitada em FR-011. Sem transporte automático para renegociação; a cadeia permite consultar receita da série anterior. Correção do vínculo não é oferecida silenciosamente.

Receita permanece no schema avulso 005, prevista ou recebida. Criar receita é ação explicitamente confirmada e separada de vincular; recebimento exige o fluxo próprio. Falha no vínculo mantém receita acessível com mensagem de vínculo pendente; não recriar receita. Cancelamento da receita mantém vínculo histórico e não cancela parcelas.

## Calendário e prévia

Mensal: N−P+1 parcelas, divisão exata com resto nas primeiras posições geradas e âncora mensal. Explícito: todas as posições, valores e datas informados, competências próprias, vencimentos não decrescentes e datas repetidas permitidas. Não inferir taxa da diferença para valor original.

FR-014a: alteração em lote usa nova data da selecionada e diferença de ordinal em meses, sem compactar posições protegidas; ajuste só desta não muda demais. Cronograma explícito exige novas datas individuais. Competência confirmada permanece até escolha explícita. Ordem resultante conflitante é rejeitada com prévia, sem mover protegidas.

## Consultas e índices

Consultar somente `seriesParceladas` com `competencias array-contains mes` e desempate por __name__, usando `parceladosSnapshotReader.ts`, leitor novo com allowlist de coleções/consultas009 e readTime fixo autenticado; `externosSnapshotReader.ts` permanece restrito à005. Cada página física contém no máximo 50 séries; expandir no cliente cada mapa finito e consumir no máximo 50 linhas lógicas por página de apresentação. Cursor registra snapshot, série/ordinal e páginas físicas consumidas; nunca perder linhas não apresentadas. Não baixar todo histórico. Tipo da série pode ser filtrado remotamente; situação/titular por entrada são filtros após expansão. Por ação mensal, obter no máximo duas páginas físicas de até50 séries; ao atingir o teto, devolver as linhas encontradas (inclusive zero), cursor e completo=false, sem continuar a busca automaticamente para preencher50 resultados. Ordem lógica estável é serieId/ordinal, não promessa de ordenação global por vencimento. Continuar a partir do cursor por ação do usuário sem repetir ou perder slots. Totais são parciais até completude do recorte.

Índices planejados: seriesParceladas(competencias ARRAY_CONTAINS, __name__ ASC); variante com tipo EQ antes da competência se consulta aplicar tipo remotamente; operacoesParceladas(seriesIds ARRAY_CONTAINS, createdAt ASC, __name__ ASC); para caixa, operacoesParceladas(fato.tipo EQ, fato.dataEfetiva ASC, __name__ ASC). Vínculos e marcadores lidos por ID. Detalhe lê um agregado e eventos paginados; caixa consulta fatos no mês real, sem buscar séries de toda a história para descobrir pagamentos.

A lista competencias é reconstruída do mapa no mesmo commit e validada exatamente, inclusive após editar competência. Contém canceladas para consulta histórica; filtros de exigibilidade são locais. Não usar titularId de cabeçalho como substituto do titular de cada obrigação após edições.

## Migração e reconstrução

Coleções novas começam vazias e não convertem avulsos automaticamente. Leitores 005/006 continuam sobre seus documentos sem schema novo. Integrar resumo por portas/read models comuns, uma única vez por parcela. Cliente desconhecedor de seriesParceladas não pode alterá-la; rollback desabilita novas mutações e mantém versão leitora compatível sem apagar fatos.

Reconstruir por eventos em ordem de revisão da série, iniciando no cadastro e aplicando patches/fatos/reversões. jaLiquidada deriva de existência histórica de pagamento; líquido de fatos válidos; competências do mapa; valor original só do dado explicitamente informado. Divergência bloqueia mutação e exige reparação explícita, sem atualização automática na abertura da tela.

## Snapshot, histórico e reconstrução verificável

Leitor009 usa REST runQuery/batchGet com Firebase ID token da sessão: a autorização continua pelas Security Rules, não IAM administrativo. Iniciar snapshot por resposta do servidor (inclusive consulta vazia), preservar o readTime original com precisão suportada e passá-lo a todas as páginas/gets do mesmo recorte. TTL local50min a partir de readTime, dentro da janela oficial de uma hora sem PITR; cursor expirado exige nova consulta, sem juntar períodos de snapshots diferentes. UID/geração de sessão, filtros, base, ordenação e limite são parte do cursor. Testar resposta com readTime divergente e descartar ao logout.

O histórico navegável usa createdAt/ID apenas como ordenação de apresentação. A auditoria coleta páginas do mesmo snapshot e identifica para cada série o par expectedVersion/resultVersion de cada evento (substituição contém duas transições). Antes de concluir reconstrução, verificar sequência única0→1→...→versão da série lida, sem lacuna, duplicidade, salto ou alvo diferente; ordenar/aplicar por versão, não timestamp. Se ainda faltam páginas, resultado é auditoria incompleta, nunca saldo reconstruído definitivo. Operação de auditoria é explícita, paginada, não disparada ao abrir um mês. Não acrescentar um evento fictício a cada parcela a cada mudança global.

Pagamentos e reversões carregam no R um contextoParcela imutável (tipo da série, descrição e classificações relevantes daquele fato), comprovado pelo slot da série na mesma transição; não é segunda fonte de saldo ou consumo. Assim a página de caixa identifica o fato e sua origem sem buscar séries de todo o histórico. Mapear somente campos financeiros próprios para FatoLiquidacao; esse contexto é apresentação histórica, não redefine classificação atual da obrigação. Novos índices/consultas de caixa devem tratar pagamento e reversão em fluxos separados, com deduplicação por ID do evento e completude de ambos.
