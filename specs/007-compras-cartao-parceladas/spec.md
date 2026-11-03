# Feature Specification: Compras no cartão e parcelas

**Decisão autorizada21/10/2026**: compra guarda cronograma corrente finito de até12 obrigações no próprio agregado, com histórico em eventos separados. Cada parcela conserva identidade lógica por compra/revisão/ordinal; não é obrigatório um documento físico por posição. A decisão altera a persistência, preservando cálculo, atomicidade, histórico, bloqueios e isolamento. Detalhes locais e harmonizações pendentes: [finite-redesign.md](contracts/finite-redesign.md). Não dispensa prova de Rules nem autoriza publicação/migração.

**Feature Branch**: sem criação de branch; nenhum hook configurado (branch atual: develop)

**Created**: 2026-10-18

**Status**: Draft — validada para planejamento

**Input**: Registrar compras no cartão em uma ou várias parcelas com descrição, data de compra, categoria, etiquetas, valor total e primeira fatura. Conferir cronograma antes de salvar e permitir alterar primeira fatura. Gerar parcelas em centavos, sem caixa imediato ou dupla contagem. Persistir compra e parcelas com consistência, idempotência, concorrência, recuperação e limite operacional; reconstruir a visão sem geração duplicada. Editar/cancelar apenas em faturas abertas sem pagamento; bloquear impactos em fechadas ou com pagamento até correção explícita futura. Exibir itens, total, categorias, identificação de parceladas/uma parcela e navegação para origem e parcelas restantes.

## Clarifications

### Session 2026-10-18

- Q: Deve ser possível cadastrar uma compra antiga cuja primeira fatura já esteja fechada, mas ainda não tenha pagamento? → A: Não. Bloquear cadastro em fatura fechada, mesmo sem pagamento; aguardar o fluxo explícito de correção da etapa seguinte (opção A).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar e conferir uma compra (Priority: P1)

Como usuário autenticado com primeiro acesso concluído, quero conferir os compromissos da compra antes de confirmar seu cadastro.

**Why this priority**: O cadastro determina compromissos futuros sem confundir compra com pagamento.

**Independent Test**: Cadastrar compras em uma e três parcelas, alterar primeira fatura na prévia, confirmar e recarregar.

**Acceptance Scenarios**:

1. **Given** cartão e categoria de despesa ativos, **When** informa R$ 100,00 em três parcelas com primeira fatura 2026-12, **Then** a prévia mostra 1/3 de R$ 33,34 em dezembro, 2/3 de R$ 33,33 em 2027-01 e 3/3 de R$ 33,33 em fevereiro, com respectivos vencimentos e soma de R$ 100,00.
2. **Given** essa prévia, **When** altera primeira fatura para 2027-01, **Then** todo o cronograma avança um mês mantendo valores e total, sem qualquer gravação até confirmar.
3. **Given** compra no fechamento, **When** solicita sugestão, **Then** segue o próximo ciclo da 006; escolha explícita de outra fatura válida prevalece. Sem ciclo único, exige escolha explícita sem sugestão arbitrária.
4. **Given** compra de R$ 80,00 em uma parcela, **When** confirma, **Then** uma compra e um compromisso 1/1 aparecem na fatura, identificados como uma parcela, sem pagamento ou saída de caixa.
5. **Given** campo obrigatório ausente, categoria de receita, referência inexistente/alheia/arquivada em novo vínculo, valor zero/negativo, centavo fracionário, quantidade 0/13/fracionária ou dois compromissos para um centavo, **When** tenta salvar, **Then** há erro específico e nenhuma criação parcial.
6. **Given** prévia conferida, **When** muda qualquer dado ou abandona o formulário, **Then** a prévia anterior deixa de autorizar confirmação; abandonar não cria compra, parcelas ou faturas.
7. **Given** compra antiga cuja primeira fatura já esteja fechada e sem pagamento, **When** tenta confirmar o cadastro, **Then** bloqueia toda a criação, identifica a fatura e informa a necessidade do fluxo explícito de correção da etapa seguinte; não move a compra para outra fatura automaticamente.

### User Story 2 - Recuperar sem duplicar (Priority: P1)

Como usuário, quero recuperar o resultado após falha e consultar o cronograma salvo sem gerar novos compromissos.

**Why this priority**: Duplicações e séries incompletas comprometem todas as faturas envolvidas.

**Independent Test**: Repetir a mesma intenção em duas abas, perder a resposta da confirmação e recuperar após recarga.

**Acceptance Scenarios**:

1. **Given** a mesma intenção/conteúdo, **When** há duplo clique, tentativas concorrentes ou repetição após perda de resposta, **Then** o resultado tem as mesmas identidades, uma compra e exatamente N parcelas vigentes.
2. **Given** intenção usada, **When** repete com conteúdo diferente, **Then** há conflito sem alteração do resultado original; intenções distintas continuam permitindo compras deliberadamente iguais.
3. **Given** falha antes da confirmação ou orçamento operacional excedido, **When** tenta salvar, **Then** não persiste conjunto parcial de compra, parcelas, novas faturas, vínculos ou recibo; resposta perdida permanece indeterminada até consultar o resultado da mesma intenção.
4. **Given** cronograma confirmado, inclusive com cancelamento, **When** recarrega e navega repetidamente, **Then** apenas lê os registros persistidos, sem nova geração nem ressurreição de canceladas.
5. **Given** compras distintas destinadas à mesma fatura, **When** são confirmadas concorrentemente, **Then** ambas permanecem na única fatura por cartão/período, sem perda de itens ou totais divergentes.
6. **Given** alteração/arquivamento de referência ou calendário após a prévia, **When** confirma, **Then** revalida contexto e rejeita obsolescência com instrução para reler/conferir, sem sobrescrita silenciosa.

### User Story 3 - Corrigir ou cancelar com segurança (Priority: P1)

Como usuário, quero corrigir a compra e conferir efeitos nas faturas sem reescrever histórico fechado ou com pagamento.

**Why this priority**: Alteração de uma compra pode afetar vários meses e deve manter todo o conjunto consistente.

**Independent Test**: Editar e cancelar compra em três faturas abertas sem pagamento; repetir com uma fechada ou com pagamento.

**Acceptance Scenarios**:

1. **Given** todas as faturas atuais e propostas abertas e sem histórico de pagamento, **When** edita descrição, data, categoria, etiquetas, total, quantidade ou primeira fatura, **Then** vê antes/depois e confirma uma atualização consistente de origem, parcelas e dependências, preservando outras compras.
2. **Given** redução de três para duas parcelas, **When** confirma, **Then** só duas posições compõem o cronograma exigível; a retirada permanece rastreável e não reaparece ao recarregar. Aumentar depois não recicla identidade cancelada.
3. **Given** compra elegível, **When** confirma cancelamento com motivo e prévia, **Then** compra e parcelas deixam de ser exigíveis juntas, mantendo valores/vínculos históricos, sem pagamento, estorno ou crédito de caixa fictício.
4. **Given** uma fatura afetada fechada ou com qualquer pagamento registrado, inclusive parcial ou revertido, **When** tenta editar/cancelar, **Then** toda a ação é bloqueada, inclusive descrição/categoria/etiquetas, indicando fatura e necessidade de correção explícita na etapa seguinte.
5. **Given** faturas abertas na prévia, **When** uma fecha pela passagem do dia ou recebe pagamento antes da confirmação, **Then** a tentativa é bloqueada sem alteração parcial.
6. **Given** duas edições, edição/cancelamento ou ajuste de vencimento concorrentes, **When** disputam contexto, **Then** apenas resultado compatível com revisões atuais é aceito; conflito exige releitura e nova prévia.
7. **Given** compra cancelada, **When** tenta editar/reativar ou cancelar novamente, **Then** não há nova exigibilidade; mesma intenção recupera resultado e solicitação distinta informa cancelamento existente sem novo efeito.

### User Story 4 - Conferir fatura e origem das parcelas (Priority: P2)

Como usuário, quero entender o total da fatura e consultar a compra e as parcelas posteriores.

**Why this priority**: Rastreabilidade permite conferir o cadastro e os compromissos sem oferecer simulador financeiro.

**Independent Test**: Consultar fatura com itens 1/1 e parcelados de categorias diferentes e navegar ao cronograma entre anos.

**Acceptance Scenarios**:

1. **Given** itens de R$ 80,00 em 1/1 e R$ 33,34 em 1/3, **When** consulta, **Then** totaliza R$ 113,34, mostrando descrição, data, categoria, etiquetas, valor do item, modalidade e acesso à origem, sem adicionar novamente o total da compra parcelada.
2. **Given** categorias diferentes, **When** agrupa, **Then** subtotais dos itens daquela fatura reconciliam com o total e indicam base de planejamento pelo mês/ano de vencimento, sem ratear pagamentos entre compras.
3. **Given** item 1/3, **When** abre sua compra, **Then** consulta total, primeira fatura, cronograma completo e as duas posições posteriores com número, valor, fatura e vencimento navegáveis; posições posteriores não são apresentadas como comprovadamente não pagas.
4. **Given** compra editada/cancelada, **When** retorna à fatura, **Then** itens e grupos refletem revisão confirmada; cancelados ficam no histórico fora do total exigível. Fatura esvaziada mantém identidade/calendário.
5. **Given** carregamento incompleto ou falha, **When** consulta, **Then** não apresenta soma parcial como total definitivo e distingue vazio de indisponível.
6. **Given** usuário B, visitante, administrador sem propriedade ou primeiro acesso pendente, **When** tenta ler/alterar dados de A diretamente, **Then** acesso é negado sem revelar dados; troca de sessão limpa a visão anterior.

### Edge Cases

- Um centavo em 1/1; R$ 100,00 em três; quantidade igual ao total em centavos; 12 parcelas; rejeição de 13 e parcela zero.
- Quantidade nominalmente válida excede orçamento por referências/faturas/controles: rejeição integral sem truncar cronograma.
- Dezembro/janeiro, fevereiro bissexto, dias 29/30/31, coincidência de fechamento/vencimento permitida pela 006 e avanço além de 9999.
- Escolha manual fora do ciclo; destino fechado, com pagamento, de outro cartão/usuário ou calendário conflitante.
- Cartões de mesmo nome/banco com identidades diferentes; renomear não mistura faturas ou quebra vínculos.
- Ajuste do vencimento de fatura mantém cópias dependentes consistentes ou é bloqueado integralmente; mudar padrão do cartão não move parcelas.
- Fatura aberta com pagamento parcial/integral/revertido e fechada sem pagamento continuam protegidas.
- Arquivar cartão preserva cronograma; corrigir compra existente não autoriza uma compra nova disfarçada.
- Falha de rede/cota, perda de confirmação, duas abas, escrita direta adulterada e troca de usuário durante envio.
- Reduzir e aumentar quantidade não ressuscita posições retiradas nem recicla identidades históricas.

## Requirements *(mandatory)*

### Functional Requirements

#### Cadastro e prévia

- **FR-001**: Oferecer cadastro privado após primeiro acesso concluído, exigindo cartão ativo, descrição de 1–120 caracteres após remoção de espaços externos, data da compra, categoria de despesa, valor total positivo, quantidade inteira de 1 a 12 e primeira fatura; permitir zero a cinco etiquetas distintas. Não exigir conta de pagamento nem coletar credenciais bancárias.
- **FR-002**: Reutilizar dinheiro/calendário da 003: BRL em centavos inteiros positivos até 9.007.199.254.740.991, entrada/apresentação pt-BR e datas gregorianas de 1900–9999 sem deslocamento por fuso. Rejeitar quantidade maior que total em centavos, valores/intermediários fora da faixa e cronograma fora dos anos suportados, sem arredondamento silencioso.
- **FR-003**: Validar cartão, categoria de despesa e cada etiqueta existentes, ativos e do mesmo usuário ao criar/substituir vínculo. Edição pode conservar exatamente categoria/etiquetas arquivadas já vinculadas conforme 004. Titular é resolvido pelo cartão, sem conceder acesso a outro login. Referência opcional ausente não equivale a inexistente.
- **FR-004**: Sugerir primeira fatura pelos ciclos/snapshots da 006, com início inclusivo e fechamento exclusivo; compra no fechamento segue ao próximo ciclo. Permitir escolha explícita do mesmo cartão fora do ciclo sugerido. Sem sugestão única, exigir escolha. Para salvar, todas as faturas do cronograma devem ter calendário válido, estar abertas e sem histórico de pagamento. Bloquear também cadastro retroativo em fatura já fechada mesmo sem pagamento, aguardando o fluxo explícito de correção da etapa seguinte; não escolher outro destino automaticamente para contornar o bloqueio.
- **FR-005**: Exigir prévia vigente antes de salvar, mostrando dados da compra, soma, quantidade, sugestão/escolha e, por parcela, número, quantidade original, valor, cartão, competência com ano e vencimento. Alterar primeira fatura recalcula competências mensais consecutivas; qualquer mudança invalida conferência anterior.
- **FR-006**: Prévia não grava compra, parcelas, faturas ou pagamento. Usar propostas de calendário para períodos novos e confirmar faturas necessárias junto à compra, preservando snapshots existentes. Não oferecer simulador autônomo, juros, capacidade de pagamento ou comparação financeira.

#### Parcelas e totais

- **FR-007**: Compra nova gera exatamente N compromissos. Dividir total em centavos por N e distribuir um centavo adicional nas primeiras posições até esgotar o resto, sem parcela zero. Soma igual ao total e diferença máxima de um centavo entre valores: R$ 100,00 em três resulta sempre R$ 33,34, R$ 33,33 e R$ 33,33.
- **FR-008**: Parcela possui origem, identidade estável, ordinal 1 a N, quantidade original do cronograma confirmado, valor e exatamente uma fatura do mesmo cartão/usuário. Competência é a da fatura, autoridade do vencimento; qualquer cópia de vencimento deve coincidir, inclusive após ajuste da 006, sem edição independente.
- **FR-009**: Compra em uma parcela usa o mesmo modelo 1/1. Cadastro não registra pagamento, reduz saldo de conta ou movimenta caixa. Parcela de cartão não recebe pagamento direto ou indicação individual de quitada; liquidação pertence à fatura e terá fluxo próprio posterior.
- **FR-010**: Fatura/planejamento soma itens exigíveis daquela competência uma vez, sem somar origem ou fatura sobre suas parcelas. Subtotais por categoria usam classificação da origem e valor do item daquela fatura. Consumo conta origem uma vez na data da compra; caixa usa fatos efetivos. Identificar base temporal na consulta sem antecipar relatórios completos.

#### Consistência e recuperação

- **FR-011**: Criação, edição e cancelamento confirmam integralmente ou não produzem efeitos: compra, cronograma vigente, novas faturas, vínculos, controles de referência/revisão, histórico e recibo devem permanecer consistentes. Não expor série parcial como concluída nem repartir automaticamente compra em confirmações independentes.
- **FR-012**: Identificar intenção antes da primeira tentativa e reutilizar em repetição/retomada. Mesma intenção/conteúdo recupera mesmo resultado; conteúdo diferente gera conflito. Recibo e efeitos são confirmados juntos, conservando recibo enquanto efeitos existirem. Intenções distintas podem representar compras deliberadamente iguais; descrição/valor não deduplicam.
- **FR-013**: Garantir unicidade de posição vigente por compra/ordinal e de fatura por cartão/competência, inclusive em concorrência e gravação direta. Recarga/consulta lê cronograma persistido sem gerar parcelas, preencher lacunas presumidas ou ressuscitar canceladas. Inconsistência detectada informa problema e bloqueia mutação até tratamento explícito.
- **FR-014**: Exigir revisões atuais da compra/dependências e fronteira de conflito verificável entre compras na mesma fatura, edição/cancelamento, arquivamento, classificação, ajuste de vencimento e futuro pagamento. Revalidar dia local do perfil e estados na confirmação, inclusive fechamento após a prévia. Contexto obsoleto exige releitura/nova conferência, sem última escrita vencedora.
- **FR-015**: Herda-se da 003 o máximo de 12 parcelas, 32 mutações documentais por comando, páginas de até 50 registros e demais orçamentos conservadores. São tetos internos, não garantia de aceite. Excesso de qualquer orçamento concreto rejeita toda criação/edição/cancelamento antes da escrita, informando limite e preservando estado anterior, sem truncar, reduzir proteções ou declarar sucesso parcial.
- **FR-016**: Distinguir validação, referência inválida, conflito de revisão/intenção, limite operacional, permissão, cota, indisponibilidade, esquema incompatível e confirmação indeterminada. Sucesso exige persistência confirmada. Resposta perdida exige consultar/retomar mesma intenção antes de outra; preservar entrada na mesma sessão e recuperar resultado após recarga autenticada. Ausência local/offline não prova ausência remota.

#### Edição e cancelamento

- **FR-017**: Editar/cancelar apenas compra ativa cujo conjunto completo de faturas atuais e destinos propostos esteja aberto e sem qualquer histórico de pagamento, inclusive parcial ou revertido. Uma fatura protegida bloqueia toda a operação. Saldo zero não prova pagamento e ciclo aberto não prova ausência de pagamento.
- **FR-018**: A ação opera sobre a compra inteira e cronograma completo, com escopo explicitado na prévia. Permitir editar descrição, data, categoria, etiquetas, total, quantidade e primeira fatura; proprietário/cartão são imutáveis. Mostrar antes/depois, itens retirados/adicionados e impacto por fatura. Correção isolada de parcela ou apenas de futuras depende de fluxo próprio posterior.
- **FR-019**: Edição substitui integralmente cronograma vigente, sem revisões exigíveis sobrepostas. Preservar identidade da compra, história e vínculos anteriores; nunca reciclar identidade cancelada. Harmonizar no plano identidade por origem/ordinal da 003 com revisão do cronograma e posições retiradas, mantendo uma única posição exigível por ordinal vigente. Não apagar faturas esvaziadas ou alterar outras compras.
- **FR-020**: Cancelamento exige confirmação e motivo de 1–1000 caracteres. Conserva origem, valores, cronogramas e relações históricas, zerando exigibilidade da compra e todas as parcelas numa única confirmação. Não excluir fisicamente, quitar ou gerar crédito, estorno ou reembolso. Cancelada não é editável/reativável; repetição não produz novos efeitos.
- **FR-021**: Bloquear qualquer alteração, inclusive metadados, quando afeta fatura fechada/com histórico de pagamento. Identificar impedimento e dependência da correção explícita da etapa seguinte. Não reabrir fatura, reverter pagamento ou transferir itens como contorno. Bloqueio também vale para criação em destino protegido.
- **FR-022**: Arquivar cartão preserva todas as compras/parcelas e impede novas compras. Compra existente pode ser corrigida/cancelada mantendo exatamente cartão arquivado se cumprir FR-017–021. Se necessário, confirmar novos períodos somente vinculados à obrigação existente, nunca períodos vazios autônomos ou nova compra disfarçada.

#### Consulta, proteção e entrega

- **FR-023**: Fatura apresenta cartão/titular, competência, ciclo, vencimento, itens, total exigível, categorias/etiquetas e indicação uma parcela ou ordinal/quantidade original. Total e grupos reconciliam; cancelados ficam identificados no histórico fora da exigibilidade. Se ajustes tipados compatíveis preexistirem, mostrá-los separadamente sem reaplicar; criá-los não integra esta etapa.
- **FR-024**: Navegar do item à compra e dela ao cronograma completo e às faturas, incluindo parcelas posteriores e canceladas com valores/datas. “Restantes” significa posições posteriores à selecionada no cronograma vigente, sem presumir quitação das anteriores; pendência da fatura é distinta. Navegar entre anos e preservar contexto de retorno.
- **FR-025**: Consultar por usuário, cartão e intervalo com paginação, sem carregar todo histórico. Total definitivo exige completude ou garantia equivalente verificável. Distinguir carregando, vazio, incompleto e falha; atualizar dependências após confirmação. Atender celular/desktop com rótulos, teclado, foco no erro e estados perceptíveis sem depender apenas de cor.
- **FR-026**: Proteger fora da interface propriedade, primeiro acesso, campos permitidos, tipos/faixas, referências, identidades, revisões, unicidade, integralidade e bloqueios de fatura/pagamento. Negar exclusão física e gravações que criem origem sem parcelas, órfãs, soma divergente ou cancelamento com itens exigíveis. Administrador sem propriedade não acessa finanças alheias; troca de sessão limpa dados/intenções e descarta respostas tardias.
- **FR-027**: Planejamento deve comprovar consistência, concorrência e orçamento para criação, recálculo máximo, cancelamento, novas faturas, cinco etiquetas e verificação de pagamentos, harmonizando 003/004/006. Definir autorização de compras/parcelas/recibos e dependências, consultas e índices sem abrir fluxos não entregues. Teto nominal de 12 não prova viabilidade; excesso aplica FR-015.
- **FR-028**: Implementação entrega regras de acesso completas, nota de mudanças e índices completos se necessários, conforme constituição. Testar localmente centavos/calendário e, com dados fictícios no projeto real autorizado, persistência/falha/concorrência e acessos A/B/visitante/admin sem propriedade/primeiro acesso pendente, sem emuladores. Registrar verificações efetivas/limitações; especificação não publica regras ou executa operações reais.

### Key Entities *(include if feature involves data)*

| Entidade | Dados e relações | Invariantes |
| --- | --- | --- |
| Compra | Identidade, proprietário, cartão, descrição, data de compra/consumo, categoria, etiquetas, total, quantidade, primeira fatura, situação e revisão | Origem do consumo; não é pagamento nem soma extra sobre parcelas. |
| Cronograma confirmado | Revisão, posições, soma e primeira competência | Uma revisão vigente exigível; anteriores rastreáveis, sem reciclar identidade retirada. |
| Parcela de cartão | Origem/revisão, identidade, ordinal, quantidade original daquela revisão, valor, fatura e situação | Uma fatura; soma vigente igual ao total confirmado; vencimento da fatura, sem quitação individual presumida. |
| Fatura | Identidade cartão/competência, calendário, ciclo, itens e histórico de pagamentos | Snapshot da 006; total derivado; ciclo e liquidação independentes; fechada/com pagamento é protegida. |
| Prévia | Dados conferidos, sugestão/escolha, cronograma, revisões e impacto | Sem efeito financeiro; mudanças invalidam conferência; confirmação revalida contexto. |
| Histórico de alteração/cancelamento | Compra, intenção, revisões anterior/nova, escopo, motivo quando exigido e instante | Preserva rastreabilidade sem duplicar exigibilidade ou apagar original. |
| Recibo de operação | Intenção privada, tipo, conteúdo identificado, resultado e revisões | Confirmado junto aos efeitos; repetição recupera resultado. |
| Cadastros e pagamentos referenciados | Cartão/titular da 006, categoria/etiquetas da 004 e histórico de pagamento da fatura | Mesmo usuário; arquivados preservados; nenhum pagamento criado neste incremento. |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Pelo menos quatro de cinco participantes registram compra em três parcelas, alteram primeira fatura e conferem cronograma em até três minutos sem ajuda, excluindo indisponibilidade de conexão.
- **SC-002**: Em 100% dos casos válidos de uma a 12 parcelas, soma reconcilia centavo a centavo e competências são consecutivas, incluindo virada do ano/fevereiro; todos os inválidos de fronteira são rejeitados integralmente.
- **SC-003**: Em todos os roteiros de repetição/falha/recarga, cada intenção confirmada produz uma compra e exatamente N posições vigentes, com zero duplicatas, órfãs ou série parcial apresentada como sucesso.
- **SC-004**: Em 100% dos roteiros reconciliados, total/categorias da fatura correspondem aos itens exigíveis, sem soma extra da origem/fatura; cadastrar 1/1 ou parcelada produz zero movimentos de caixa.
- **SC-005**: Em todos os roteiros elegíveis, edição/cancelamento produz uma revisão consistente; 100% das tentativas com fatura protegida/contexto obsoleto são bloqueadas sem perda de histórico ou efeito parcial.
- **SC-006**: Cada item permite chegar à origem e a qualquer fatura de parcela posterior em até duas ações de navegação a partir dele; todas as canceladas permanecem rastreáveis e fora da exigibilidade.
- **SC-007**: Zero acessos cruzados ou alterações diretas que violem invariantes nos testes de aceitação; nenhuma resposta tardia expõe dados da sessão anterior.
- **SC-008**: Pelo menos quatro de cinco participantes distinguem compra em uma parcela de pagamento imediato e identificam parcelas posteriores sem confundi-las com parcelas comprovadamente não pagas.

## Assumptions

- Dependências: constituição 1.2.0, autenticação/primeiro acesso 002, núcleo 003, cadastros 004 e cartões/calendário 006. A 005 permanece restrita a receitas/despesas externas. Entrega documental, sem implementação/publicação ou alteração de dados reais.
- Escopo: compras novas completas em BRL, de 1/1 até 12/12, mensais, com divisão uniforme e resto determinístico. Migração de parcelas em andamento, empréstimos, antecipação, recorrências, pagamentos, estornos e correção de faturas fechadas/movimentadas ficam para etapas próprias.
- Data de compra futura é aceita como compromisso informado, em continuidade à prévia da 006, sem criar caixa ou alegar pagamento/consumo já realizado antes da data. Primeira competência não precisa coincidir com mês da compra; seleção explícita respeita elegibilidade das faturas.
- Bloqueio solicitado é conservador: aplica-se à compra inteira, inclusive metadados; qualquer histórico de pagamento protege a fatura mesmo após reversão. Ausência de pagamentos deve ser verificada, nunca presumida porque o fluxo de pagamento ainda não foi entregue.
- Escopo de correção é explicitamente compra inteira. Plano deve harmonizar seleção genérica de ocorrência/futuras da 003 com este caso sem habilitar alteração parcial de compra protegida. Revisão do cronograma é necessária para mudar quantidade sem reciclar identidades; harmonização de contratos será explícita, sem alteração silenciosa da 003.
- Calendário/ciclo seguem 006, incluindo coincidência de fechamento/vencimento causada por ajuste ao último dia. Por decisão explícita de 2026-10-18, criação em destino fechado é bloqueada mesmo para compra antiga e sem pagamento, até o fluxo de correção da etapa seguinte; destino com histórico de pagamento também permanece bloqueado. Prévia pode mostrar impedimento sem gravar. Revalidar fechamento na confirmação não requer rotina com aplicativo fechado.
- Limites operacionais são os já definidos na 003, com rejeição integral ao exceder orçamento, sem protocolo multietapas. Plano deve revalidar limites vigentes e provar orçamento das regras concretas, sem capacidade presumida ou remoção de proteções.
- Descrição e etiquetas atendem dados solicitados, sem campo adicional de observação. Categoria obrigatória de despesa; nomes atuais são resolvidos dos cadastros, sem promessa de fotografia dos nomes antigos, conforme 004/006.
- Numeração sequencial 007. Ausência de extensions.yml verificada: sem hooks antes/depois, sem criação de branch. Resolvedor de template falhou por launcher Python indisponível; sem presets/sobrescritas locais encontrados, utilizado `.specify/templates/spec-template.md`, preservando seções e ordem.
