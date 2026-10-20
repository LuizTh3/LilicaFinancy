# Contract: Comandos e projeção010

Porta TypeScript específica, não backend HTTP. Entrada unknown normalizada e validada; dinheiro/calendário003, Resultado/CodigoErro compartilhados. uid vem da sessão, nunca proprietário livre no payload.

## Envelope

contractVersion1,tipo,operationKey estável,serieId,expectedVersion da série, versões de O/V/F/controle usadas pela prévia,manifesto canônico. Intenção nasce antes do primeiro envio; callback não gera IDs, altera estado ou emite aviso. Prévia contém intervalo exato e excluídas; alteração invalida conferência. Recibo create-only registra comando completo e IDs/versões resultantes. Mesma intenção/conteúdo recupera resultado original; conteúdo distinto conflita.

## Operações

| Operação | Entrada | Resultado e condições |
| --- | --- | --- |
| prepararSerie/criarSerie | Natureza,início,término?,padrão,IDs e prévia | S+V inicial+R e primeiro uso; nenhum O ou caixa |
| projetar | Janela<=12 meses,filtros,snapshot/cursor,pageSize1–50 | Função pura une revisões,slots reconciliados e exceções; não grava |
| prepararGeracao/materializar | Seleção explícita de identidades,versões e fatura válida se cartão | O financeiras únicas e R/S juntos; perfil inicial uma ocorrência; demais tamanhos exigem prova |
| confirmarValor | Identidade,valor positivo,versões e prévia | Definitivo apenas nesse mês; se virtual materializa inteiro; sem pagamento |
| prepararEdicao/editarEsta | Alvo,patch,versões,motivo e prévia | Exceção individual; preserva identidade e protegidas; virtual vira O financeira |
| prepararFuturas/revisarFuturas | Vigência>=mês atual,padrão novo,segmento atual,intervalo de slots derivado | Split/substituiçãoV e alterações elegíveis no mesmo commit; próximo reajuste intacto; não gerar slots virtuais |
| pular/cancelar | Identidade,motivo,prévia,versões | Tombstone virtual ou O cancelada preservada; sem desfazer supressão |
| encerrar | Primeiro mês excluído>=atual,motivo,prévia e versão | Bloqueia novas O na vigência; não modifica O já existentes |
| pagar/receber | O externa definitiva,valor<=pendência,conta efetiva ativa,data<=hoje,versões | Fato R e controles de O/S juntos; parcial não é nova ocorrência |
| reverter | Evento original,motivo e versões atuais | Inversão integral única e marcador M; conta/data originais; histórico preservado |
| consultarOperacao | Tipo/chave,descritor ou comando canônico | Confirmado com verificação de conteúdo quando fornecido; ausenteConfirmado; indeterminado |
| listar/detalhar | Mês/base/filtros/cursores próprios | Origem,financeiro,exceções,revisões,fatos e completude |

Assinatura paga pela fatura no fluxo008, nunca pelo comando externo pagar. Liquidação externa010 exige o próprio adaptador: chamada005 sem origem005 não é substituto válido. Confirmação e liquidação combinadas só podem ser habilitadas por perfil específico; primeiro incremento oferece confirmar e depois pagar em duas ações explícitas, não pagamento inferido.

## Resultado de geração concorrente

Repetição de mesma intenção procura R exato. Intenção diferente para O já existente devolve existente sem novo efeito somente se conteúdo corresponde ao pedido canônico, respeitando exceções/estado atual; conteúdo divergente retorna conflito, não sobrescreve. Se tentativa perder corrida em S/O, consultar recibo e identidade; exigir nova prévia se estado diferir. Tombstone sempre bloqueia geração, mesmo por chave nova. Nenhuma reserva temporária substitui unicidade natural.

## Futuras e encerramento

A..U derivado de S e segmento, com meses ausentes incluídos. Não aceitar lista do cliente como prova. Meses com exceção individual não recebem novo padrão; mostrar excluídas e motivos. Mês protegido em F exige conferir controles008/fechamento atuais. Se todo efeito material for vazio, ainda pode haver nova revisão para meses virtuais posteriores; isso é mudança real de padrão. Retornar semAlteracao somente se revisão e todos os efeitos normalizados forem idênticos.

Revisão maio antes de reajuste julho termina em junho. Substituição no mesmo início conserva histórico no R. Não recalcular meses anteriores. Comando excedente é rejeitado integralmente; nunca atualizar padrão antes de corrigir O afetadas. Encerrar é exceção deliberada: S muda vigência e mantém O persistidas intactas; prévia as lista como compromissos preservados, não excluídas canceladas.

## Erros e recuperação

Códigos existentes: valorInvalido,limiteMonetario,dataInvalida,referenciaInvalida,naoEncontrado,conflitoVersao,conflitoIdempotencia,limiteOperacional,semPermissao,cotaExcedida,indisponivel,esquemaIncompativel,confirmacaoIndeterminada,configuracaoPendente. Contexto inclui campo/limite e ação possível sem dados alheios. Fatura ausente ou ramo não habilitado informa configuração/limite pendente, sem criar O parcial.

Normalização sem diferença, com versão atual, retorna semAlteracao sem R/escrita/revisão; encerrar intenção local e não reutilizar chave para outro conteúdo. Repetição reavalia estado; não prometer confirmação persistida desse não efeito.

Consulta de R ausente exige autorização e não prova que tentativa em voo terminou. Preserve mesma intenção até resolver/abandonar explicitamente e reler estado; resposta tardia é descartada ao trocar sessão. Falha confirmada mantém estado anterior; resultado indeterminado permanece assim até confirmação do servidor. Não prometer persistência de rascunho após fechar navegador.

## Projeção e leitura

Entrada pura inclui revisões/slots completos de cada subrecorte e estado de reconciliação; projeção não busca nem grava dados. Para uma identidade, persistida prevalece; tombstone exclui exigibilidade; ausência confirmada permite virtual. Em conjunto inconsistente retornar erro, não escolher maior versão arbitrariamente. Cada linha indica fonte,estimado,mesReferencia,competência,base temporal e situação.

Leitor010 limita consultas do data-model, lê snapshot fixo e até100 documentos físicos por ação. Cursor retoma série/mês/fase, incluindo reconciliação ainda pendente, com TTL50min. Totais de recorte incompleto são parciais. Histórico V/R paginado não autoriza auditoria completa sem cadeia contígua. Planejamento de cartão resolve meses de cobrança pelo ciclo da fatura e adiciona persistidas escolhidas manualmente, sem duplicar com fluxo007.

## Forma concreta da candidata

Nomes rec* e envelope estão definidos no gerador build-recorrencias-rules.mjs. S.comandoAtual repete comando canônico fechado de R; ocorrencias/revisoes são mapas de imagens antes/depois e versoesFaturas fixa versõesG. Os IDs listados precisam corresponder exatamente aos mapas. O primeiro candidato permite uma O e intervalo ocupado de revisão futura de até um mês; capacidadeItem é parte de O, não J duplicado. recInicializarFatura usa recibo próprio sem série e só inicializa G de calendário certificado preexistente/inalterado. Coordenação006 mantém calendarioVersion em G. Ver remediation.md e contracts/security.md para o grafo corrigido; não confundir arquivo candidato com Rules ativas.

