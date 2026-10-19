# Data Model: Compras no cartão e parcelas

Desenho de referência para implementação após gates do [plano](plan.md). Não é migração executada ou autorização de coleções. Todos os caminhos abaixo são relativos a users/{uid}; UID vem da sessão, nunca do formulário.

## Convenções

- Campos fechados; tipos validados em domínio, mapeador e Rules. Instantes técnicos são timestamps de servidor. Datas financeiras YYYY-MM-DD e competências YYYY-MM permanecem textos de calendário.
- schemaVersion identifica formato; version identifica edição; contractVersion identifica comando. Inteiros exatos positivos e revisões sem overflow. Criar começa em1.
- Identidades existentes de faturas006 permanecem cartaoId__YYYY-MM. ID de compra segue safeId atual; identidade de parcela nova usa codificação canônica de compraId + cronogramaRevision + numero, com separadores reservados e validação exata. Helper novo distinto do legado003; nunca aceitar caminhos livres.
- A lista corrente de IDs de parcelas contém no máximo12 referências ordenadas, substituída por revisão. Não contém valores duplicados ou histórico crescente. Compras de usuários diferentes nunca compartilham referência.

## Compra — compras/{compraId}

| Campo | Tipo / regra |
| --- | --- |
| schemaVersion | inteiro1 para formato007; desconhecido bloqueia mutação |
| version | revisão de conteúdo, crescente; expectedVersion obrigatório |
| cartaoId | ID de cartão próprio; imutável após criação |
| descricao | texto trim1–120 |
| dataCompra | data válida1900–9999; data de consumo da origem |
| categoriaId | categoria privada de despesa |
| etiquetaIds | lista canônica ordenada de0–5 IDs distintos |
| valorTotalCentavos | inteiro1–9.007.199.254.740.991 |
| quantidadeParcelas | inteiro1–12 e não maior que total em centavos |
| primeiraCompetenciaFatura | competência válida; conjunto inteiro deve caber nos anos suportados |
| primeiraFaturaEscolha | sugerida ou explicita; indicação de origem da decisão |
| cronogramaRevision | inteiro positivo; muda apenas ao alterar data/valor/quantidade/primeira fatura |
| parcelaIds | IDs determinísticos de todas as posições vigentes, tamanho igual à quantidade |
| estadoObrigacao | ativa ou cancelada; sem reativação |
| ultimoEventoId | referência recíproca ao último recibo |
| createdAt / updatedAt | servidor; createdAt imutável |

Novas referências ativas; conservar exatamente referência histórica arquivada é permitido. Cartão arquivado só em correção de compra preexistente. Não há conta, saldo, pago, juros, valor estimado ou total de fatura editáveis. Estado cancelado não apaga valor original.

## Parcela — parcelasCartao/{parcelaId}

Campos: schemaVersion1, compraId, cartaoId, cronogramaRevision, numero, quantidadeOriginal, valorCentavos, competenciaFatura, faturaId, eventoCriacaoId e createdAt. Imutável após criação; delete negado.

- numero1–N, quantidadeOriginal=N da revisão. Valor é quociente inteiro mais resto distribuído às primeiras posições. Parcela não aceita ajuste livre de valor ou migração com ordinal inicial>1.
- Fatura e competência vêm da primeira competência + numero−1 e do helper006. createdAt e evento vinculam confirmação da revisão. Não persistir vencimento, descrição, categoria, titular ou estado de pagamento duplicados.
- Situação efetiva: ativa somente se compra.estadoObrigacao=ativa, parcela.cronogramaRevision=compra.cronogramaRevision e parcela.id consta da lista corrente validada; caso contrário, cancelada por revisão ou cancelada com a compra. Ela nunca é exigível isoladamente por possuir valor positivo.
- A revisão nova invalida exigibilidade de todas as posições antigas pela mesma alteração da origem. Isso evita atualizar histórico ilimitado ou simular cronogramas parciais. Qualquer consumidor/projeção007 deve resolver origem e revisão; não usar consulta de parcelas sem esse vínculo para somar.
- Revisões antigas permanecem consultáveis e não podem ser modificadas/reativadas. Compra3→2→3 cria três conjuntos de IDs distintos. Mudança somente de metadados mantém conjunto de parcelas e revisão do cronograma.

## Fatura — faturas/{cartaoId__competencia}

Reutilizar calendário006, version, ultimoEventoId e eventos de calendário. Não incrementar version de calendário a cada compra. Evolução de versaoConteudo1 para2 introduz suporte a itens e controle obrigatório, sem alterar ID ou limites históricos.

- Novas faturas007 confirmam calendário, evento de calendário, controle de conteúdo e compra no mesmo commit, usando regras de vizinhança006 reparadas. Ramo de evento de calendário identifica origem de confirmação007 e não aceita testemunho circular entre faturas novas.
- Nenhum total persistido. Total exige consulta completa das parcelas efetivamente exigíveis e ajustes compatíveis, se existirem.
- Ajuste explícito de vencimento da006 pode continuar permitido pela sua política mesmo em fatura fechada; não é edição de compra. Atualiza calendário + evento + controle de conteúdo numa fronteira comum, preservando semântica006. Parcelas resolvem a nova data ao consultar, sem cascata de cópias.

## Controle de fatura — controlesFaturas/{faturaId}

Campos: schemaVersion1, faturaId, cartaoId, competencia, version, possuiHistoricoPagamento, ultimoEventoTipo, ultimoEventoId e updatedAt; createdAt imutável. Não armazena valores/saldos/contagens financeiras.

- Criação somente junto de fatura nova compatível, marcador false e relação recíproca obrigatória. Uma fatura legada sem controle não é presumida sem pagamento.
- Alteração por compra exige version+1, marcador preservado, testemunha recíproca da mesma compra/operação e calendário atual, hoje anterior ao fechamento e marcador false. Todos os controles da união de destinos atuais/propostos são coordenados.
- Futuro pagamento precisa atualizar o mesmo controle atomicamente e tornar marcador true, sem permitir true→false mesmo após reversão. Registrar pagamento fora desse grafo continua negado até funcionalidade própria. Valor pago é derivado dos fatos, não do marcador.
- Controle não pode ser criado isoladamente, apagado, resetado ou reatribuído. Dado desconhecido bloqueia mutação e total definitivo que dependa dele.

## Recibo/histórico — operacoesCompras/{tipo__operationKey}

schemaVersion1, contractVersion1, tipo, operationKey, compraId, expectedVersion, resultVersion, comando canônico limitado, antes/depois de conteúdo, revisões de cronograma e IDs resultantes, motivo no cancelamento, createdAt. Um recibo por confirmação, create-only. Snapshot de uma revisão é limitado, sem anexar todo histórico anterior.

Identidade de intenção é por UID/tipo. Recibo exige pós-compra apontando para si com resultVersion; compra exige o mesmo recibo novo e conteúdo correspondente. Histórico anterior é preservado por eventos imutáveis. Não incluir token, senha, dados bancários ou payload nos logs.

## Categoria e cadastros004

Preservar schema e proteção atuais. Primeiro uso de categoria deve ter testemunha de operação007 validada reciprocamente; não reutilizar financialUsePatch que hoje aceita somente operacoesExternas. Após primeiro uso, natureza permanece imutável. Arquivar não elimina referência. Categoria renomeada muda apresentação atual, sem snapshot de nome antigo.

## Transições

| Ação | Antes → depois | Dependências |
| --- | --- | --- |
| Criar | ausente → ativa/version1/revisão1 | Cartão/categoria/etiquetas válidos; destinos abertos e sem pagamentos; todas posições presentes |
| Editar metadados | ativa/versionV → ativa/V+1, mesma revisão | Mesmos bloqueios em todas faturas atuais, inclusive descrição/categoria/etiquetas |
| Recalcular | ativa/V/revisãoR → ativa/V+1/revisãoR+1 | Novas parcelas completas e controles de todos destinos antigos/novos |
| Cancelar | ativa/V → cancelada/V+1 | Motivo; controles atuais elegíveis; parcelas de todas revisões tornam-se não exigíveis |
| Repetir intenção | estado já confirmado → mesmo resultado | Sem novas escritas/revisões |

Sem alteração de conteúdo retorna semAlteracao sem novo recibo/revisão; descritor local é encerrado e uma intenção futura usa nova chave. Cancelamento já realizado por outra intenção retorna jaCancelada sem novo efeito. Resposta perdida após alteração nunca é classificada como semAlteracao antes de consultar recibo.

## Compatibilidade e migração

- Contratos003 recebem especialização explícita de parcela de cartão versionada, com vencimento resolvido em leitura e situação efetiva dependente da origem. Externas e calendários legados mantêm identidade/formato. Não publicar mapeador que interprete revisão antiga como vigente.
- A estrutura de histórico de calendário006 continua contígua e independente de controles de conteúdo. Consultas006 precisam reconhecer versaoConteudo2 sem liberar schema desconhecido.
- Faturas existentes sem controle exigem inventário autorizado e migração versionada que comprove origem/esquema e impossibilidade de pagamento anterior no escopo conhecido. Se não houver prova, ficam somente consultáveis e bloqueadas para compra. Não oferecer inicialização false pelo formulário.
- Verificar fonte ativa/dados antes de migração futura; o inventário zero da006 não prova estado atual vazio. Não executar migração nesta fase.
