# Feature Specification: Pagamentos e ajustes de faturas

**Feature Branch**: sem criação de branch; nenhum hook configurado (branch atual: develop)

**Created**: 2026-10-19

**Status**: Draft — validada para planejamento

**Input**: Pagamento integral ou parcial de faturas pelo serviço de liquidações, com conta, valor e data, sem nova despesa por categoria. Rejeitar excesso e saldo credor. Separar atraso, ciclo e pendência. Juros/encargos manuais identificados. Reabertura explícita sem pagamento, reversão de erro, ajustes documentados e estorno/reembolso vinculado ao item original, com data e destino. Preservar histórico, idempotência e concorrência; não quitar parcelas individualmente por pagamento parcial.

## Clarifications

### Session 2026-10-19

- Q: Ao corrigir um valor registrado por erro em uma fatura com pagamento, em qual mês a diferença deve aparecer no consumo por categoria? → A: Corrigir o consumo do mês original, preservando histórico e justificativa (opção A). Devolução econômica real permanece na data de efeito do estorno.
- Q: Se uma compra foi esquecida no cadastro e sua fatura já tem pagamento registrado, deve ser possível incluí-la por uma correção documentada? → A: Permitir inclusão por correção documentada, inclusive em fatura fechada, sem reabertura ou alteração dos fatos anteriores (opção A).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pagar a fatura e conferir o caixa (Priority: P1)

Como usuário autenticado, quero informar conta efetiva, valor e data de um pagamento integral ou parcial para acompanhar a pendência sem duplicar meu consumo.

**Why this priority**: É o fluxo central de liquidação e reconciliação financeira.

**Independent Test**: Em fatura de R$ 1.000,00, registrar R$ 400,00 e depois R$ 600,00 em contas e datas diferentes e conferir detalhe e caixa.

**Acceptance Scenarios**:

1. **Given** fatura de R$ 1.000,00 sem pagamentos, **When** registra R$ 400,00 com conta ativa e data real válida, **Then** pendente fica R$ 600,00, liquidado R$ 400,00 e caixa registra uma saída de R$ 400,00; consumo por categoria e compromisso não ganham outra despesa.
2. **Given** esse saldo, **When** registra R$ 600,00 em outra conta/data, **Then** pendente fica zero e os dois pagamentos permanecem identificáveis; nenhuma parcela recebe quitação individual atribuída pelo sistema.
3. **Given** pendente R$ 600,00, **When** tenta pagar R$ 600,01, zero, negativo, sem conta, com conta arquivada/alheia ou data futura/inválida, **Then** rejeita sem efeito financeiro e informa o campo ou limite violado.
4. **Given** obrigação de cartão arquivado, **When** registra pagamento válido, **Then** liquida normalmente sem reativar cartão ou permitir compra nova.
5. **Given** fatura aberta com pendência, **When** paga antecipadamente, **Then** aceita dentro do limite sem fechar o ciclo; novos itens elegíveis alteram pendência apenas pelos fluxos de ajuste protegidos quando já existe histórico de pagamento, incluindo compra esquecida mediante correção documentada.

### User Story 2 - Entender atraso e encargos (Priority: P1)

Como usuário, quero distinguir ciclo, dívida e atraso e lançar encargos conhecidos sem taxas presumidas.

**Why this priority**: Evita quitações falsas e cálculos financeiros sem informação.

**Independent Test**: Consultar a mesma fatura antes, no dia e após o vencimento; acrescentar encargo manual conhecido.

**Acceptance Scenarios**:

1. **Given** pendência positiva e vencimento 17/10, **When** consulta em 17/10 e 18/10, **Then** somente no dia 18 há atraso, sem pagamento, juros ou troca automática do estado do ciclo.
2. **Given** fatura vencida com saldo zero ou vazia, **When** consulta, **Then** não há atraso; ausência de pagamento é distinguida de quitação por pagamento e de redução por ajuste.
3. **Given** juros de R$ 25,00 informados pelo usuário, **When** confirma item manual identificado, com descrição, data de efeito, categoria e motivo, **Then** total exigível aumenta R$ 25,00, sem saída de caixa antes do pagamento; item aparece separado das compras e não há juros adicionais calculados.

### User Story 3 - Corrigir preservando os fatos (Priority: P1)

Como usuário, quero reabrir explicitamente uma fatura fechada sem pagamento e corrigir faturas movimentadas mediante registros vinculados, sem apagar o passado.

**Why this priority**: Fecha as restrições de correção das etapas 006 e 007 com rastreabilidade.

**Independent Test**: Reabrir fatura fechada sem histórico e corrigir outra com pagamento parcial por reversão e ajuste.

**Acceptance Scenarios**:

1. **Given** fatura fechada sem histórico de pagamento, **When** tenta edição comum, **Then** bloqueia; reabertura exige motivo, prévia e confirmação explícita e mantém datas/identidade históricas.
2. **Given** fatura reaberta, **When** cadastra compra antiga ou corrige/cancela compra elegível e depois encerra a revisão, **Then** alterações são rastreadas, outras faturas protegidas bloqueiam a operação completa e a fatura volta a fechada sem novo pagamento ou mudança do calendário.
3. **Given** pagamento registrado por erro de R$ 400,00, **When** confirma sua reversão integral com motivo, **Then** original permanece, caixa é corrigido na conta/data originais e pendência aumenta R$ 400,00; data da correção consta no histórico, sem devolução real fictícia nesse dia.
4. **Given** histórico de pagamento, inclusive integralmente revertido, **When** tenta reabrir ou editar/excluir conteúdo antigo, **Then** bloqueia; correção exige ajuste documentado ou reversão e novo pagamento, sem liberar edição comum.
5. **Given** conta/data/valor incorretos, **When** reverte o fato e registra o correto, **Then** são fatos distintos vinculados pela correção e a nova liquidação respeita a pendência e conta ativa.
6. **Given** item errado de R$ 100,00 em fatura movimentada, **When** corrige para R$ 80,00, **Then** mantém original e ajuste documentado de R$ 20,00, corrigindo o consumo por categoria no mês original do item, mesmo quando o erro é corrigido em outro mês; se a redução excede a pendência, bloqueia e orienta tratar o pagamento errado ou a devolução real conforme o caso.

7. **Given** compra de R$ 200,00 esquecida e fatura fechada de R$ 1.000,00 já paga integralmente, **When** confirma inclusão por correção documentada com motivo e prévia, **Then** exigível passa a R$ 1.200,00 e pendente a R$ 200,00; pagamentos e fechamento permanecem, consumo aparece no mês original da compra e nenhum ajuste duplicado ou caixa novo é gerado.

### User Story 4 - Registrar devolução sem inventar crédito (Priority: P1)

Como usuário, quero distinguir cancelamento, erro e devolução real de compra, informando o destino e a data do efeito.

**Why this priority**: Esses eventos têm impactos distintos na obrigação, no consumo e no caixa.

**Independent Test**: Exercitar crédito em fatura com pendência e devolução em conta de compra já paga, incluindo tentativas que exigiriam saldo credor.

**Acceptance Scenarios**:

1. **Given** item de R$ 200,00 e fatura com pendente R$ 500,00, **When** informa estorno de R$ 200,00 destinado a essa fatura, com data e motivo, **Then** pendente diminui R$ 200,00 e consumo é reduzido na data de efeito, preservando o mês original; não existe entrada em conta.
2. **Given** fatura de R$ 1.000,00 paga integralmente, item elegível de R$ 200,00 e devolução efetiva de R$ 200,00 em conta, **When** informa item, data, conta de destino e pagamentos originais que suportam o reembolso, **Then** uma única confirmação reduz dívida e liquidado líquido em R$ 200,00, mantém pendente zero e registra uma entrada real na data recebida; consumo diminui apenas uma vez.
3. **Given** fatura líquida R$ 100,00 ou pendência R$ 50,00, **When** tenta estorno em fatura de R$ 150,00 ou R$ 60,00 respectivamente, **Then** bloqueia sem truncar, transferir para outro mês ou criar saldo credor e explica a limitação.
4. **Given** compra parcelada, **When** registra devolução parcial, **Then** escolhe explicitamente itens/faturas e valores atingidos; soma dos efeitos corresponde ao valor informado, sem presumir distribuição, quitar parcelas ou cancelar futuras silenciosamente.
5. **Given** compra ainda não cobrada em todas as faturas afetadas abertas e sem histórico de pagamento, **When** cancela com motivo, **Then** retira exigibilidade conforme 007, sem estorno de consumo por devolução nem caixa fictício. Erro usa correção identificada; dinheiro devolvido usa reembolso.
6. **Given** item já estornado em parte ou pagamento já revertido/reembolsado em parte, **When** tenta reutilizar valor além do remanescente, **Then** rejeita sem segundo abatimento ou entrada duplicada.

### User Story 5 - Recuperar operações e evitar disputas (Priority: P1)

Como usuário, quero repetir uma operação após falha sem duplicá-la e receber conflito quando outra sessão alterar seu contexto.

**Why this priority**: Preserva a exatidão financeira mesmo com duas abas ou confirmação perdida.

**Independent Test**: Repetir intenções e disputar pagamentos/ajustes sobre a mesma fatura e originais.

**Acceptance Scenarios**:

1. **Given** confirmação perdida, **When** repete a mesma intenção e conteúdo, **Then** recupera o mesmo resultado sem novo efeito; mesma intenção com conteúdo divergente produz conflito.
2. **Given** pendente R$ 600,00 e dois pagamentos concorrentes de R$ 400,00, **When** confirmam, **Then** no máximo um é aceito e o outro exige releitura e nova confirmação, sem saldo negativo.
3. **Given** reversão e reembolso disputando o mesmo pagamento ou dois estornos disputando item, **When** confirmam, **Then** não excedem os limites originais nem consomem duas vezes o mesmo valor.
4. **Given** pagamento durante reabertura ou ajuste durante pagamento, **When** o contexto muda, **Then** operação incompatível falha inteira; não há fato órfão ou sucesso parcial.
5. **Given** outro usuário, visitante, administrador sem propriedade ou primeiro acesso pendente, **When** tenta consultar/gravar diretamente pagamentos, ajustes ou histórico, **Then** acesso é negado sem exposição financeira.

### Edge Cases

- Centavo residual, valor maior que a faixa monetária, soma excedente e data inexistente; dezembro/janeiro e fuso do perfil.
- Fatura sem itens, sem pagamentos, zerada por ajustes ou com pagamento integral depois revertido: não tratar situações distintas como comprovantes iguais.
- Fechamento e vencimento coincidentes por ajuste do último dia; atraso somente no dia seguinte com pendência positiva.
- Reabertura atravessando o dia de fechamento e recarga durante revisão; não fechar novamente apenas por consultar.
- Juros manuais em fatura paga geram nova pendência documentada, sem reescrever pagamentos.
- Compra devolvida parcialmente, devoluções sucessivas, distribuição entre faturas e conta de destino diferente da conta pagadora.
- Fatura paga com tentativa de crédito no próprio cartão: bloquear enquanto não houver modelo de saldo credor.
- Reembolso reduz capacidade restante de reversão do pagamento; reversão integral indisponível se original já teve reembolso parcial.
- Falta de rede/permissão/cota, sessão trocada, revisão obsoleta, tentativa de exclusão e totais de páginas incompletas.

## Requirements *(mandatory)*

### Functional Requirements

#### Pagamentos, valores e estados

- **FR-001**: Oferecer pagamento integral ou parcial de uma fatura existente pelo serviço compartilhado de liquidações da 003, com valor positivo em BRL, conta efetiva ativa do mesmo usuário e data real válida não posterior a hoje no fuso do perfil. Permitir pagamentos em várias contas/datas, inclusive antecipados e de cartão arquivado; cada fato tem exatamente uma fatura como alvo.
- **FR-002**: Derivar total exigível dos itens ativos e ajustes confirmados, liquidado líquido dos pagamentos menos reversões e reembolsos válidos, e pendente = exigível menos liquidado líquido. Valores e intermediários seguem dinheiro/datas da 003; exigir exigível ≥ 0 e 0 ≤ liquidado líquido ≤ exigível. Não permitir total editável independente das origens.
- **FR-003**: Rejeitar pagamento maior que o pendente atual, sem truncamento ou crédito. Pagamento afeta apenas caixa na data real e pendência da fatura; não cria compra, despesa categorizada ou novo compromisso. Parcelas permanecem itens da fatura sem alocação individual de pagamentos, inclusive na quitação integral.
- **FR-004**: Mostrar separadamente ciclo aberto/fechado, total exigível, pagamentos, reversões/reembolsos, liquidado líquido, pendente e atraso. Atraso exige pendência positiva e vencimento anterior a hoje; no vencimento não há atraso. Sem lançamentos ou zerada por ajustes não significa pagamento realizado. Passagem de datas não gera liquidação, encargos ou quitação.
- **FR-005**: Encargos e juros exigem lançamento manual identificado por tipo, descrição, valor positivo, data de efeito, categoria de despesa e motivo, vinculados à fatura. Seguem o fluxo de ajuste documentado, inclusive em fechadas/movimentadas; afetam exigível e consumo uma vez e caixa somente na liquidação. Não calcular taxas, multas, juros compostos, descontos ou rotativo sem condições especificadas, nem oferecer cálculo automático nesta versão.

#### Fechamento e correções

- **FR-006**: Fechamento bloqueia edição comum de itens e compras. Reabrir somente por ação explícita com motivo e confirmação de impacto, se não existir qualquer histórico de pagamento, mesmo revertido. Registrar estado anterior/novo, autor e instante, preservando datas e identidade. Revalidar condição na confirmação; pagamento enquanto reaberta é bloqueado até encerrar a revisão.
- **FR-007**: Reabertura é exceção explícita ao ciclo por data da 006: permanece aberta em revisão até encerramento explícito, sem mudar fechamento/vencimento ou reabrir períodos vizinhos. Identificar essa condição em lista/detalhe e após recarga. Encerrar revisão de fatura originalmente fechada restaura fechado. Não permitir reabertura repetida enquanto já em revisão.
- **FR-008**: Durante revisão sem histórico, permitir cadastro retroativo e edição/cancelamento pelos contratos da 007, substituindo apenas o impedimento de fechamento das faturas explicitamente reabertas. Todas as faturas atuais e propostas devem estar abertas ou reabertas e sem histórico. Uma protegida bloqueia toda a alteração; não mover itens automaticamente para contornar proteção. Preservar arquivamento: cartão arquivado não admite nova compra.
- **FR-009**: Em fatura com histórico de pagamento, proibir reabertura, exclusão e sobrescrita de itens, classificação, valores, datas e fatos originais. Correções exigem ajustes aditivos/subtrativos vinculados ao item, com motivo, data de efeito, valor e identificação do tipo; correção de classificação registra valores anterior/novo sem apagar o original ou mover caixa. Corrigir valor conserva original e diferença explícita e corrige o consumo por categoria no mês original do item, preservando histórico e justificativa; a data do registro da correção não desloca esse efeito para o mês atual. Essa regra é exclusiva de erro de registro: devolução econômica real reduz consumo na data de efeito do estorno. Nunca substituir silenciosamente cronograma ou mover parcelas. Cada ajuste apresenta prévia do total, pendente, consumo e caixa antes de confirmar.
- **FR-010**: Reversão de erro desfaz integralmente um pagamento individual ainda não invertido, exigindo motivo e confirmação. Conserva conta/data financeiras originais, mesmo conta arquivada, e registra instante atual da correção; anula o caixa original e reabre pendência sem cancelar compra ou criar dinheiro recebido hoje. Corrigir conta/data/valor requer reversão e novo pagamento com intenção própria. Não admitir reversão de reversão, reversão parcial ou reversão integral de pagamento já parcialmente reembolsado; explicar a limitação sem reinterpretar erro como devolução real.
- **FR-011**: Preservar histórico imutável de pagamentos, inversões, ajustes, reaberturas, encerramentos e correções, com origem, intenção, autor, instante, motivo e valores/contexto anterior e resultante. Proibir exclusão física; conservar vínculos e registros após arquivamento. Ajuste incorreto exige novo ajuste compensatório documentado, ligado ao anterior e sujeito aos mesmos limites; não editar/apagar o ajuste nem gerar caixa sem fato próprio.

- **FR-025**: Permitir incluir compra esquecida em fatura com histórico de pagamento, inclusive fechada, exclusivamente por correção documentada, com motivo, identificação explícita da inclusão tardia e prévia dos efeitos em todas as faturas atingidas. Não reabrir fatura nem alterar itens ou pagamentos anteriores. Registrar a compra e seu cronograma uma única vez, conforme valores, categorias, datas e vínculos da 007, com exceção explícita dos impedimentos de fechamento/histórico nos destinos confirmados por esse fluxo. O aumento exigível é derivado dos novos itens: não somar novamente o registro documental da correção. Preservar conta, valor e data de cada pagamento; recalcular pendência, inclusive eventual atraso, e reconhecer consumo no mês original da compra conforme a regra de correção de erro. Exigir cartão ativo para a compra incluída; respeitar limites, integridade e concorrência do cronograma inteiro, sem sucesso parcial.

#### Cancelamento, estorno e reembolso

- **FR-012**: Distinguir três intenções na entrada e no histórico: cancelamento antes de cobrança, correção de erro e devolução econômica real. Cancelamento segue elegibilidade da 007/FR-008 e não simula recebimento; erro usa FR-009–011; devolução exige estorno/reembolso próprio. Nunca inferir um tipo a partir de pendente zero ou da data.
- **FR-013**: Estorno econômico exige item original do mesmo usuário, valor positivo até o valor ainda não estornado, motivo, data de efeito não futura e destino explícito: abatimento na fatura original ou devolução recebida em conta. Para parcelada, exigir discriminação de itens/faturas e valores cuja soma iguale a devolução. Não aplicar ao total da compra e às parcelas duas vezes. Rejeitar itens cancelados, origens incompatíveis, valores já devolvidos e distribuição ausente/inconsistente.
- **FR-014**: Abatimento em fatura reduz obrigação e consumo no mês da data de efeito, preserva consumo original e não gera caixa. Exigir estado final com exigível ≥ liquidado líquido ≥ 0; bloquear redução maior que pendente ou fatura líquida negativa. Destino para outra fatura, crédito futuro, compensação automática e saldo credor não são suportados; explicar o bloqueio e preservar entrada sem inventar alternativa financeira.
- **FR-015**: Devolução efetiva em conta exige conta de destino ativa, data real recebida não futura e vínculo explícito a pagamentos da mesma fatura com capacidade de reembolso. Não inferir qual parcela foi paga: o vínculo financeiro é à fatura, separado do item devolvido. Cada valor reembolsado consome o remanescente não revertido/reembolsado dos pagamentos selecionados; aceitar seleção múltipla somente se toda a operação couber nos limites vigentes. Conta de destino pode diferir da pagadora, mantendo ambas identificadas.
- **FR-016**: Estorno com devolução em conta confirma conjuntamente redução da obrigação/consumo e inversão por reembolso do liquidado líquido, com uma entrada real na conta/data de recebimento. Consumo diminui uma única vez, na data de efeito, e caixa uma única vez na data real. Para esta versão, valor devolvido em conta coincide com redução atribuída à mesma fatura; se faltar pagamento original disponível ou o conjunto exigir saldo credor, bloquear integralmente. Não registrar receita categorizada ou nova redução pelo fato de reembolso.
- **FR-017**: Reversões e reembolsos compartilham o limite do pagamento original; ajustes de devolução compartilham o limite do item original. Não permitir consumir o mesmo valor duas vezes. Validar o estado final conjunto: uma fatura paga pode receber devolução em conta com redução equivalente de dívida e liquidado sem passar por estado persistido inconsistente. A existência de pagamentos nunca autoriza marcar parcelas individualmente como liquidadas.

#### Consistência, acesso e experiência

- **FR-018**: Cada operação mutável tem intenção estável por usuário/tipo antes de enviar. Repetição de intenção e conteúdo já confirmados retorna os mesmos fatos/resultados; conteúdo diferente conflita. Recibo, fatos, histórico e efeitos confirmam juntos ou nada confirma. Não deduplicar intenções diferentes por coincidência de valor/data e não criar intenção nova automaticamente após confirmação perdida.
- **FR-019**: Coordenar concorrência por todas as faturas, itens e pagamentos originais afetados, incluindo compra, reabertura, encerramento, vencimento, ajuste e cancelamento. Exigir revisões atuais e revalidar pendência, limites cumulativos, estado do ciclo e referências na confirmação. Contexto alterado exige releitura e nova prévia/consentimento; nunca reduzir valor ou substituir destino silenciosamente.
- **FR-020**: Proteger propriedade e primeiro acesso concluído na persistência, inclusive contra gravação direta; administrador sem propriedade não acessa finanças alheias. Todas as referências pertencem ao mesmo usuário. Novos vínculos usam cadastros ativos compatíveis; exceção histórica de conta somente para reversão vinculada. Validar integralidade, imutabilidade, exatidão, limites e recibos associados fora da interface.
- **FR-021**: Reutilizar fontes de verdade e controles reconstruíveis da 003/005/007, sem pago editável ou agregado concorrente aos fatos. Divergência entre controle e histórico bloqueia mutação até reparação explícita. O planejamento deve demonstrar proteção de excesso, inversão única, unicidade de ajuste e consistência integral dentro dos limites operacionais existentes. Se conjunto excede limites, rejeitar antes de efeitos, sem sucesso parcial ou remoção de validações.
- **FR-022**: Oferecer detalhe com itens, encargos, ajustes, origens, destino, datas, contas e motivos; navegação do ajuste ao item e pagamento original. Identificar base temporal e separar consumo, planejamento e caixa: consumo mantém mês original, com correção de erro aplicada nesse mesmo mês e estorno econômico em sua própria data de efeito; compromissos usam competência da fatura e ajustes sem somar pagamento; caixa usa fatos efetivos e reversões de erro no período original. Totais de pendência são posição atual, sem prometer fotografia imutável do passado.
- **FR-023**: Apresentar formulários acessíveis em celular/desktop, prévia de impacto e confirmação perceptível. Informar erros de excesso, crédito não suportado, elegibilidade, conflito, permissão, cota e indisponibilidade com orientação de recuperação. Só mostrar sucesso após confirmação; preservar intenção/entrada na sessão durante incerteza. Limpar dados no logout/troca de usuário e ignorar respostas tardias; listas paginadas não apresentam totais incompletos como definitivos.
- **FR-024**: Planejamento identifica impacto nas autorizações, consultas e índices e harmoniza explicitamente contratos de 003/005/006/007. Implementação entrega regras completas e nota de mudanças, índices completos quando necessários e validação de isolamento/concorrência no ambiente autorizado, além dos cálculos locais, conforme constituição. Não presumir que documentação ou arquivo local equivalem a publicação ou testes executados.

### Key Entities *(include if feature involves data)*

| Entidade | Dados de negócio e vínculos |
| --- | --- |
| Fatura | Cartão/competência e calendário preservados; ciclo e eventual revisão explícita; exigível, liquidado e pendente derivados separadamente. |
| Pagamento de fatura | Fatura, valor, conta efetiva, data real, intenção e autor; fato imutável, sem categoria de consumo própria. |
| Reversão de erro | Pagamento original, valor integral, conta/data herdadas, motivo, intenção e instante da correção. |
| Item e ajuste documentado | Compra/parcela ou encargo identificado; original preservado; tipo, magnitude, data de efeito, motivo e contexto anterior/resultante; correções vinculadas. |
| Estorno econômico | Item original, valor, data de efeito e destino, com distribuição explícita dos efeitos por item/fatura; redução de consumo separada do caixa. |
| Reembolso efetivo | Estorno e pagamentos originais, valor por pagamento, conta de destino e data recebida; compartilha capacidade de inversão com reversões. |
| Histórico de revisão | Fatura, ação de reabrir/encerrar, motivo, autor, instante e estados anterior/novo. |
| Recibo de operação | Identidade estável da intenção, conteúdo e fatos/resultados confirmados em conjunto. |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos cenários integral/parcial, encargos, reversão e devolução, exigível, liquidado, pendente e caixa reconciliam ao centavo, com zero dupla contagem por categoria e zero quitação individual presumida de parcela.
- **SC-002**: Todas as tentativas de excesso, crédito não suportado, inversão repetida e distribuição inválida são rejeitadas sem qualquer efeito parcial.
- **SC-003**: Em todos os roteiros de repetição, confirmação perdida e disputa, cada intenção confirmada produz um único conjunto de efeitos e nenhuma disputa supera os limites da fatura/item/pagamento.
- **SC-004**: Em 100% das correções e revisões, originais, motivos, vínculos, datas e estados anteriores/resultantes continuam consultáveis; nenhuma fatura com histórico é liberada para edição comum.
- **SC-005**: Todos os cenários antes/no dia/depois do vencimento distinguem atraso e ciclo corretamente, inclusive saldo zero e datas coincidentes, sem juros automáticos.
- **SC-006**: Pelo menos quatro de cinco participantes em teste assistido registram um pagamento parcial em até dois minutos e identificam corretamente pendência, saída de caixa e diferença entre erro, abatimento em fatura e devolução em conta.
- **SC-007**: Zero acessos financeiros indevidos nos cenários entre dois usuários, visitante, administrador sem propriedade e primeiro acesso pendente, incluindo consultas e gravações diretas.

## Assumptions

- Dependências: constituição 1.2.0 e features 002–007. Esta entrega especifica comportamento; não implementa, publica regras ou altera dados financeiros reais.
- Uma fatura corresponde ao cartão/mês-ano da 006. Dinheiro em centavos, calendário e limites operacionais da 003 permanecem vigentes. Não incluir integração bancária, saldo credor, compensação entre faturas, renegociação, antecipação de parcelas ou juros automáticos.
- Reabertura só sem qualquer histórico de pagamento é a interpretação conservadora alinhada à 007; mesmo após reversão integral, histórico não volta a ser editável. A exceção de revisão explícita substitui a derivação automática do ciclo somente enquanto estiver ativa, sem alterar snapshots.
- Reversão de erro é integral por fato, como na 005. Reembolso admite parcial para representar dinheiro efetivamente recebido, com capacidade cumulativa compartilhada. Pagamento parcialmente reembolsado não admite reversão integral nesta versão; não presumir que devolução seja erro.
- Data de efeito econômico e data real do recebimento podem diferir, mas ambas precisam ser informadas quando houver reembolso e nenhuma pode ser futura. Abatimento em fatura usa somente data de efeito; reversão usa datas originais e instante técnico atual.
- Devolução em conta fica restrita ao montante suportado por pagamentos da própria fatura e reduz dívida/liquidado conjuntamente, conforme 003. Não pressupor alocação dos pagamentos nas parcelas. Casos sem esse suporte ou que exigem crédito permanecem bloqueados com explicação.
- Correção documentada de classificação distingue erro de cadastro de devolução econômica; conserva leitura do original e explicita classificação corrigida. Ajuste compensatório não é autorização para movimentar caixa sem liquidação/inversão própria.
- Impacto sobre especificações anteriores: amplia a 006 com revisão explícita, a 007 com correção protegida e a 003 com detalhamento dos destinos de devolução; preserva a reversão de erro da 005. Inclusão tardia de compra esquecida por correção documentada é exceção explícita aos bloqueios de criação em fatura fechada/com histórico da 007; continua vedada a edição dos fatos anteriores. Nenhum documento anterior é reescrito nesta etapa; compatibilidade executável deve ser resolvida no plano.
- Template: tentativa de resolução pelo comando do Spec Kit impedida pelo launcher Python indisponível. Não há presets/sobrescritas locais; usado .specify/templates/spec-template.md com seções e ordem preservadas. Numeração sequencial 008; nenhum extensions.yml ou hook configurado.


