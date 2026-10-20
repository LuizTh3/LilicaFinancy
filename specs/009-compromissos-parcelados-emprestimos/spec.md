# Feature Specification: Compromissos parcelados externos e empréstimos manuais

**Feature Branch**: Sem criação de branch; diretório independente da branch atual.

**Created**: 2026-10-19

**Status**: Draft

**Input**: Compromissos parcelados fora dos cartões e empréstimos com cronogramas manuais, completos ou em andamento; preservar ausência de valor original, histórico, prévia, idempotência e isolamento. Não inferir receitas, pagamentos anteriores, taxas ou amortização.

## Clarifications

### Session 2026-10-19

- Q: Ao alterar o vencimento de “esta e futuras não pagas”, como devem mudar as datas das parcelas seguintes? → A: Opção A. Série mensal recalcula vencimentos a partir da parcela selecionada, mantendo o dia-base mensal; cronograma explícito exige informar cada nova data.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar compromissos conhecidos (Priority: P1)

Como usuário, quero cadastrar uma série completa ou em andamento para acompanhar obrigações sem inventar o passado.

**Why this priority**: Permite substituir o controle manual com valores e datas confiáveis.

**Independent Test**: Cadastrar série completa, próxima parcela 5/10 e cronograma desigual; comparar a consulta com a prévia.

**Acceptance Scenarios**:

1. **Given** série completa de R$ 100,00 em três parcelas, **When** confirma a divisão, **Then** cria 1/3 de R$ 33,34, 2/3 e 3/3 de R$ 33,33, sem pagamento.
2. **Given** empréstimo com próxima parcela 5 de 10, R$ 200,00 por parcela e próximo vencimento 2026-12-31, **When** confirma, **Then** cria exatamente seis obrigações 5/10 a 10/10, mensais até 2027-05-31, incluindo 2027-02-28, sem criar posições 1–4 ou declará-las pagas.
3. **Given** valor original desconhecido, **When** cadastra seis parcelas restantes de R$ 200,00, **Then** mostra soma cadastrada de R$ 1.200,00 e valor original ausente, sem extrapolar R$ 2.000,00.
4. **Given** cronograma 5/7 de R$ 110,00 em 2026-12-15, 6/7 de R$ 95,50 em 2027-02-03 e 7/7 de R$ 80,00 em 2027-02-20, **When** confirma, **Then** preserva datas, valores e soma R$ 285,50, sem preencher janeiro ou calcular taxa.
5. **Given** prévia conferida, **When** altera qualquer dado ou abandona, **Then** invalida a conferência; abandonar não cria registros.

### User Story 2 - Consultar e pagar parcelas (Priority: P1)

Como usuário, quero ver pagamentos e pendência por parcela, distinguindo compromisso de movimentação de dinheiro.

**Why this priority**: Cadastro de obrigação não comprova pagamento ou entrada de empréstimo.

**Independent Test**: Pagar uma parcela parcialmente e depois integralmente, conferir competência e caixa e registrar receita vinculada apenas por ação explícita.

**Acceptance Scenarios**:

1. **Given** parcela de R$ 200,00, **When** paga R$ 60,00 e depois R$ 140,00 informando datas e contas efetivas, **Then** mostra ambos os fatos, liquidado R$ 200,00 e pendência zero; qualquer excesso é rejeitado.
2. **Given** série recém-cadastrada, **When** consulta planejamento e caixa, **Then** cada parcela ativa aparece uma vez na competência, sem saída ou entrada gerada pelo cadastro.
3. **Given** empréstimo sem entrada vinculada, **When** solicita criar receita com seus dados ou vincular receita existente própria, **Then** confirma vínculo explícito; recebimento exige confirmação separada segundo 005. Vincular receita existente não cria outra receita.
4. **Given** pagamento registrado incorretamente, **When** confirma reversão integral de erro com motivo, **Then** conserva o original, reabre pendência e corrige caixa na data original conforme 005, sem devolução fictícia.
5. **Given** empréstimo ou receita já vinculados, **When** tenta confirmar segundo vínculo em qualquer ponta, **Then** rejeita sem criar receita/recebimento adicional e conserva o vínculo histórico.
6. **Given** série com conta/titular opcionais próprios, **When** consulta detalhe e histórico, **Then** encontra obrigações futuras, vencidas, pagamentos, contas efetivas e posições anteriores não cadastradas, sem quitação presumida.

### User Story 3 - Corrigir e substituir com prévia (Priority: P2)

Como usuário, quero escolher o alcance da edição ou renegociação e preservar parcelas pagas.

**Why this priority**: Evita reescrever histórico e manter dívidas antigas e substitutas exigíveis juntas.

**Independent Test**: Editar série com posições quitadas, parciais e sem pagamentos; cancelar e substituir apenas as elegíveis.

**Acceptance Scenarios**:

1. **Given** parcela sem histórico de liquidação, **When** escolhe “esta parcela” e altera valor/vencimento, **Then** prévia mostra antes/depois e só a selecionada muda.
2. **Given** posições quitadas, parciais e intocadas, **When** escolhe “esta e futuras não pagas”, **Then** prévia enumera elegíveis a partir da selecionada e excluídas com motivo; apenas ativas sem histórico de pagamento mudam, sem renumerar ou redistribuir diferenças nas protegidas.
3. **Given** pagamento concorrente após a prévia, inclusive em outra parcela da mesma série, **When** confirma edição, **Then** recebe conflito e precisa reler e conferir, sem alteração silenciosa.
4. **Given** obrigações sem liquidações válidas, **When** confirma motivo, cancelamentos e novo cronograma manual, **Then** antigas deixam de ser exigíveis e nova série nasce vinculada por substituição numa única confirmação, sem transportar pagamentos ou inferir encargos.
5. **Given** parcela parcialmente paga, **When** tenta editá-la ou cancelá-la, **Then** bloqueia; pagamento real não pode ser revertido como contorno para renegociação.
6. **Given** todos os pagamentos de uma parcela revertidos por erro, **When** tenta corrigir conteúdo, **Then** bloqueia edição, permitindo cancelamento e substituição explícitos sem apagar histórico.
7. **Given** série mensal com posições 5/10 a 10/10 elegíveis, **When** altera o vencimento de 5/10 para 2027-01-31 no alcance “esta e futuras não pagas”, **Then** a prévia propõe janeiro a junho, com 6/10 em 2027-02-28 e 7/10 em 2027-03-31, sem deslocamento fixo em dias. Posições protegidas mantêm suas datas e seus lugares, sem compactar os intervalos das elegíveis.
8. **Given** cronograma explícito irregular, **When** altera vencimentos no alcance “esta e futuras não pagas”, **Then** exige informar cada nova data desejada, conservando as demais; não recalcula mensalmente nem desloca automaticamente as seguintes, e exige nova prévia antes da confirmação.

### User Story 4 - Recuperar tentativas e respeitar limites (Priority: P1)

Como usuário, quero retomar confirmação incerta sem duplicar dívida e conhecer impedimentos antes de salvar.

**Why this priority**: Falhas e concorrência não podem produzir cronograma incompleto ou duplicado.

**Independent Test**: Repetir criação após resposta perdida, testar fronteiras e disputar alterações com dois usuários.

**Acceptance Scenarios**:

1. **Given** mesma intenção e conteúdo, **When** ocorre duplo clique, concorrência ou perda da resposta, **Then** recupera mesmos resultados e identidades, com uma série e uma obrigação por posição vigente.
2. **Given** intenção confirmada, **When** envia conteúdo diferente com a mesma identidade de operação, **Then** rejeita conflito sem novo efeito.
3. **Given** quantidade original 13, mesmo com duas restantes, ou orçamento excedido, **When** solicita confirmação, **Then** rejeita tudo, informa limite e não trunca nem cria série parcial.
4. **Given** cota, indisponibilidade ou resultado indeterminado, **When** tenta salvar, **Then** preserva entrada e intenção na sessão, distingue falha de incerteza e só anuncia sucesso após confirmação; retomada usa a mesma intenção.
5. **Given** comando sem diferença normalizada e versão atual, **When** confirma, **Then** retorna semAlteracao sem escrita/revisão/recibo e encerra a intenção; repetição após mudança concorrente exige revalidar versão e pode conflitar.
6. **Given** conta, titular, receita ou série de outro usuário, **When** tenta associar, consultar ou alterar, inclusive fora da interface, **Then** nega acesso, inclusive a administrador sem propriedade.

### Edge Cases

- Próxima 1/1 e 10/10 geram uma obrigação; zero, fracionária, próxima maior que quantidade original e quantidade acima de 12 são rejeitadas.
- Divisão que produz parcela zero, centavo fracionário ou soma/intermediário fora da faixa é rejeitada integralmente.
- Dia-base 31 usa último dia em fevereiro e retorna a 31 em março; cronograma explícito preserva dias escolhidos.
- Cronograma explícito exige posições restantes completas e únicas, datas não decrescentes e admite duas parcelas no mesmo dia.
- Vencimentos anteriores a hoje indicam pendência vencida, nunca pagamento presumido.
- Valor original informado pode ser diferente da soma das parcelas, especialmente capital do empréstimo; diferença não vira juros calculados.
- Referência arquivada já vinculada permanece histórica; novo vínculo exige referência ativa. Logout limpa dados e descarta respostas tardias.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Oferecer compromisso parcelado externo e empréstimo como tipos distintos entre si, de compra no cartão e de recorrência. Nenhum exige cartão, gera fatura ou se prolonga indefinidamente.
- **FR-002**: Exigir descrição de 1–120 caracteres, categoria de despesa, tipo, quantidade original inteira de 1–12 e próxima posição de 1 até a quantidade original. Permitir titular/conta prevista opcionais, observação até 1000 caracteres e até cinco etiquetas distintas. Novas referências devem existir, estar ativas e pertencer ao mesmo usuário; titular não concede acesso a outro login.
- **FR-003**: Gerar exatamente N − P + 1 obrigações numeradas P a N. Posições anteriores são não cadastradas, sem pagamentos fictícios ou quitação presumida. Não fabricar data de contratação/consumo; dados de origem desconhecidos permanecem ausentes.
- **FR-004**: Oferecer modo uniforme mensal com próximo vencimento e valor por parcela ou total das obrigações a gerar. Distinguir total restante cadastrado de valor original do contrato. Se total e valor por parcela forem informados juntos, exigir compatibilidade com a prévia, sem escolher autoridade silenciosamente.
- **FR-005**: Reutilizar cálculo exato da 003: dividir o total a gerar pelas posições restantes e distribuir centavos residuais nas primeiras posições geradas. Valor por parcela informado é repetido sem divisão adicional. Vencimentos mensais mantêm dia-base, usando último dia quando necessário, inclusive na virada do ano.
- **FR-006**: Oferecer cronograma explícito com todas as posições restantes, cada uma com valor positivo, vencimento e competência. Exigir ordinais únicos e completos e datas não decrescentes; não impor intervalo mensal ou valores iguais. Preservar valores informados sem taxa, juros, amortização ou preenchimento de meses automático.
- **FR-007**: Preservar valor original opcional como dado do contrato, distinto de soma cadastrada, total a gerar e pendência. Ausência não vira zero ou valor calculado. Não exigir igualdade entre capital original e soma das parcelas nem classificar sua diferença automaticamente como encargos.
- **FR-008**: Aplicar BRL, centavos inteiros e faixas monetárias/calendário da 003. Cada obrigação exige competência com ano/mês e vencimento; sugerir competência pelo vencimento e permitir correção explícita. Rejeitar valor, soma, intermediário ou data fora da faixa, sem arredondamento silencioso.
- **FR-009**: Exigir prévia vigente de criação, edição, cancelamento e substituição, mostrando tipo, ordinais, quantidade original, valores/datas/competências, soma cadastrada, pendência, valor original informado/ausente, escopo e antes/depois quando aplicável. Mudança invalida conferência; prévia não grava efeitos.
- **FR-010**: Cada parcela deve ser obrigação externa de identidade estável vinculada à série. Reutilizar liquidações parciais/integral e reversão integral de erro da 005: fatos separados, conta efetiva ativa obrigatória, data real válida não futura, excesso bloqueado, saldo exato e histórico preservado. Pagamento parcial não é nova parcela.
- **FR-011**: Cadastro de série não cria pagamento, receita ou recebimento. Somente por ação explícita permitir criar receita vinculada ou vincular receita existente do mesmo usuário conforme 005, exibindo valor e situação separadamente. Recebimento continua separado; vínculo não gera caixa, duplica receita ou exige igualdade com parcelas. Cancelamento/substituição não cancela receita nem reverte recebimento automaticamente. Nesta entrega, permitir de zero a uma receita vinculada por série de empréstimo e de zero a uma série por receita; rejeitar segundo vínculo em qualquer ponta, sem substituição silenciosa ou transporte automático na renegociação.
- **FR-012**: Mostrar cronograma, futuras/vencidas, canceladas, substituições, pagamentos por parcela, valores, datas, contas efetivas, reversões, liquidado líquido e pendência atual. Identificar posições anteriores não cadastradas; nunca anunciar quitação de posições desconhecidas.
- **FR-013**: Planejamento soma parcelas ativas uma vez pela competência, inclusive valor planejado de quitadas. Série e valor original não são despesas adicionais. Caixa usa apenas fatos confirmados e datas reais; receita vinculada segue sua natureza sem compensação silenciosa. Identificar base temporal, recorte e completude; não classificar empréstimo como compra de consumo no cartão.
- **FR-014**: Exigir alcance “esta parcela” ou “esta e futuras não pagas”; futuras significa posições posteriores no cronograma vigente, independentemente de hoje. Elegíveis são ativas sem qualquer histórico de liquidação. Permitir corrigir descrição, categoria, etiquetas, titular/conta prevista, valor, vencimento e competência dessas obrigações; enumerar excluídas e motivos, rejeitando se não houver elegíveis. Não redistribuir diferenças sobre protegidas.
- **FR-014a**: Ao alterar vencimento de “esta e futuras não pagas” em série mensal, recalcular as datas elegíveis a partir da nova data da parcela selecionada e do dia-base mensal, usando último dia quando necessário. Preservar distância em meses pelo ordinal, mesmo com posições protegidas intercaladas, sem alterá-las ou compactar o cronograma. Em cronograma explícito, exigir informar individualmente cada nova data desejada e conservar datas não alteradas, sem propagação automática. Validar o cronograma resultante e mostrar todos os impactos na prévia; alteração de vencimento não sobrescreve competência já confirmada sem escolha explícita.
- **FR-015**: Preservar quitadas, parciais e parcelas com histórico revertido conforme 005. Edição não altera proprietário, tipo, quantidade original, ordinal ou identidade. Alteração estrutural exige cancelamento/substituição explícitos; não reciclar identidade cancelada. Revalidar versões e elegibilidade na confirmação, inclusive diante de pagamento concorrente.
- **FR-016**: Cancelamento exige seleção explícita, motivo de 1–1000 caracteres, prévia e ausência de liquidações válidas em cada alvo. Conservar valores, vínculos e histórico; retirar exigibilidade sem quitação, exclusão física ou reativação. Pode cancelar apenas parte elegível de série com outras parcelas quitadas.
- **FR-017**: Renegociação informa nova série manual e obrigações antigas substituídas. Confirmar cancelamentos e criação vinculada juntos ou rejeitar tudo. Nova série tem identidade e numeração próprias conferidas; preservar cadeia, motivo e posições protegidas. Impedir exigibilidade simultânea de substituídas e substitutas. Não transportar pagamentos, inferir saldo negociado ou calcular juros/amortização. Renegociação de saldo de parcela com pagamento parcial real fica fora deste incremento; reversão de erro não é contorno para pagamento real.
- **FR-018**: Criação, edição, cancelamento, substituição e vínculo de receita exigem intenção estável por usuário/tipo e resultado recuperável. Mesma intenção/conteúdo confirmado retorna mesmos resultados; conteúdo diferente conflita. Revalidar estado/versões; conjunto parcial não pode aparecer como sucesso completo. Nenhuma mudança concorrente pode ser sobrescrita silenciosamente. Exceção explícita: edição sem diferença normalizada ou cancelamento de alvos já cancelados, com versão esperada atual, retorna semAlteracao sem escrita, revisão ou recibo; encerrar a intenção local e descartar sua chave. Esse resultado não é confirmação persistida recuperável: repetição reavalia estado/versão e pode conflitar após mudança concorrente. Qualquer intenção posterior usa chave nova.
- **FR-019**: Manter limites internos documentados na 003: máximo 12 parcelas originais, 12 obrigações geradas e 32 mutações por comando, contando origens, parcelas, vínculos, histórico, recibos e controles; substituição conta ambos os lados. Aplicar orçamento de até 1 MiB por comando, 32 KiB por registro, 18 acessos de validação por operação conjunta e 8 por escrita, sem presumir cache e respeitando menor teto aplicável. Esses tetos herdados não garantem capacidade. Excesso rejeita o comando inteiro antes de gravar, informando o limite.
- **FR-020**: Adotar rejeição integral sem geração multietapas, truncamento ou lotes independentes automáticos. Retomar somente confirmação da mesma intenção incerta. Distinguir entrada inválida, conflito, limite, permissão, cota, indisponibilidade e confirmação indeterminada; preservar dados/intenção na sessão. Falha confirmada conserva estado anterior; sucesso exige confirmação de todos os efeitos.
- **FR-021**: Garantir propriedade, primeiro acesso concluído, referências, integralidade, unicidade e fatos imutáveis inclusive fora da interface. Conservar referências históricas arquivadas conforme 004. Administrador sem propriedade não acessa finanças alheias; troca de sessão limpa dados/intenções e descarta respostas tardias.
- **FR-022**: Planejamento deve comprovar orçamento e consistência de cada comando, incluindo substituição, máximo de etiquetas, vínculos opcionais e conflitos com pagamentos; rejeitar casos inviáveis sem reduzir proteção. Definir consultas, índices e regras de acesso completas preservando contratos anteriores. Controle de totais, se necessário, é derivado, protegido e reconstruível dos fatos.
- **FR-023**: Oferecer navegação mensal entre anos e filtros por tipo, situação e titular, detalhe da origem e retorno ao contexto; paginar até 50 registros sem baixar todo histórico. Identificar totais incompletos. Atender celular/desktop com rótulos, teclado, foco em erro e estados de carregamento, vazio, envio, confirmação e falha perceptíveis.
- **FR-024**: Aceitação da implementação cobre dinheiro/calendário localmente e persistência, concorrência, falhas e isolamento com dados fictícios no projeto real autorizado, sem emuladores, conforme constituição. Registrar testes efetivos e limitações. Esta especificação não implementa, publica regras ou movimenta dados reais.

### Key Entities *(include if feature involves data)*

| Entidade | Dados e significado | Invariantes |
| --- | --- | --- |
| Série de compromisso | Proprietário, tipo, descrição, quantidade original, posição inicial, valor original opcional e referências | Origem finita, distinta de cartão e recorrência; sem caixa inferido. |
| Obrigação de parcela | Série, identidade, ordinal, quantidade original, valor, competência, vencimento, estado e revisão | Uma posição vigente por série; liquidação própria e histórico protegido. |
| Pagamento e reversão | Obrigação, valor, conta, data real, intenção e original | Contrato da 005; sem excesso ou reescrita de fatos. |
| Substituição | Séries anterior/nova, obrigações canceladas, motivo e confirmação | Cadeia rastreável, sem obrigações substituídas ainda exigíveis. |
| Vínculo de receita | Empréstimo e receita explicitamente escolhida ou criada | Mesmo usuário; recebimento independente. |
| Registro de operação | Intenção, conteúdo confirmado, resultados e revisões | Retomada sem duplicação; conteúdo diferente conflita. |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos roteiros P/N válidos até 12 posições, existem exatamente N − P + 1 obrigações, nenhuma posição anterior criada e nenhum pagamento/recebimento inferido.
- **SC-002**: Todos os cronogramas uniformes reconciliam centavo a centavo e todos os explícitos preservam valores e datas, inclusive fevereiro/virada de ano; valor original desconhecido permanece ausente em todas as consultas.
- **SC-003**: Em todos os testes de pagamento parcial, integral e reversão, liquidado/pendente reconciliam exatamente, sem excesso ou dupla contagem no planejamento/caixa.
- **SC-004**: Em todos os roteiros de edição/substituição, confirmação corresponde à prévia vigente, protegidas permanecem intactas e nenhuma obrigação substituída continua exigível com sua substituta.
- **SC-005**: Em todos os roteiros de repetição, concorrência, falha e limite, zero parcelas duplicadas, alterações silenciosas de histórico ou conjuntos parciais anunciados como sucesso.
- **SC-006**: Zero acessos ou associações indevidos nos roteiros com usuários A/B, visitante, administrador sem propriedade e primeiro acesso pendente, inclusive por acesso direto.
- **SC-007**: Pelo menos quatro de cinco participantes cadastram série 5/10 e distinguem valor original desconhecido, soma restante e pagamentos em até três minutos sem ajuda, excluindo indisponibilidade; identificam que cadastrar empréstimo não registra entrada de dinheiro.

## Assumptions

- Dependências: constituição 1.2.0 e features 002–005. Reutilizar dinheiro, distribuição e calendário da 003 e liquidações da 005. Features 006–008 mantêm domínio de cartão separado; fechamento de fatura não se aplica a parcela externa.
- Limite de 12 refere-se à quantidade original, mesmo em série em andamento. Não ampliar limites nem introduzir geração multietapas. Retomada recupera a mesma intenção; excesso exige rejeição integral conforme 003.
- Mensalidade é sugestão do modo uniforme; irregularidade usa cronograma explícito. Competência sugerida pelo vencimento pode ser corrigida sem mudar data real de pagamento.
- Valor original é dado opcional do contrato, especialmente capital emprestado; não inferir taxa da diferença para parcelas. Simulação, amortização automática, integração bancária, importação automática e recorrência ilimitada ficam fora.
- Renegociação entregue cobre obrigações sem liquidações válidas e preserva quitadas; saldo de parcial real permanece protegido. Reversão de erro não representa renegociação econômica.
- Criar/vincular receita é ação explícita separada conforme 005; não precisa ocorrer junto da criação da série. Recebimento é confirmado no fluxo próprio, sem inferência ou duplicação.
- Não existem hooks registrados: `.specify/extensions.yml` ausente, verificado antes e após a especificação. O resolvedor `specify preset resolve spec-template` falhou por launcher Python inválido; sem presets/sobrescritas locais, usou-se `.specify/templates/spec-template.md`, preservando seções e ordem.



