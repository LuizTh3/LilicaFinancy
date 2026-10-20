# Feature Specification: Recorrências mensais e assinaturas

**Feature Branch**: `develop` (checkout existente); feature lógica `010-recorrencias-mensais`

**Created**: 2026-10-20

**Status**: Draft validado para planejamento

**Input**: Receitas e despesas recorrentes mensais, fixas ou estimadas, com início, dia, término opcional e histórico de alterações; despesas externas e assinaturas em cartão; geração por período ao abrir tela ou por ação explícita; identidade estável e concorrência entre abas; projeção com persistidas e virtuais; exceções que impeçam recriação; confirmação de estimativas, pular, encerrar e editar ocorrência/futuras não liquidadas com vigência; compra/item de cartão sem duplicidade ou parcelamento infinito; encerramento sem cancelamento silencioso e calendário compartilhado.

## Clarifications

### Session 2026-10-20

- Q: Se já existe um reajuste agendado para julho e você altera o valor a partir de maio, o que deve acontecer em julho? → A: Preservar o reajuste de julho; o novo valor vale em maio e junho e, em julho, entra o reajuste já agendado (opção A).
## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar e consultar receitas e despesas mensais (Priority: P1)

Como usuário, quero cadastrar salário, aluguel ou energia com valor fixo ou estimado e consultar os meses previstos, sem registrar recebimentos ou pagamentos por antecipação.

**Why this priority**: É a base para acompanhar compromissos e entradas esperadas sem depender de lançamentos manuais repetidos.

**Independent Test**: Cadastrar energia estimada de R$150,00, início em2026-10-01, dia31 e término em2027-03-31; consultar meses, gerar outubro e repetir em duas abas.

**Acceptance Scenarios**:

1. **Given** série mensal com dia31, **When** consulta outubro a março, **Then** vê31/10,30/11,31/12,31/01,28/02 e31/03; abril não tem nova ocorrência e nenhum mês aparece pago automaticamente.
2. **Given** receita fixa com início2026-10-20 e dia10, **When** consulta outubro/novembro, **Then** a primeira ocorrência é10/11; não fabricar ocorrência anterior ao início.
3. **Given** ocorrência virtual de energia, **When** abre seu período e confirma a geração, ou a geração ao abrir é executada, **Then** passa a existir uma única ocorrência persistida com a mesma identidade e valor projetado.
4. **Given** duas abas abertas, **When** ambas geram a mesma série/mês, inclusive com intenções distintas, **Then** ambas recuperam a mesma ocorrência; não existem duas obrigações ou duas receitas para o mês.
5. **Given** série sem término, **When** consulta janela futura, **Then** obtém somente o intervalo pedido e indicação de continuidade, sem gerar toda a duração da série.

### User Story 2 - Projetar meses combinando registros e previsões (Priority: P1)

Como usuário, quero ver o que já foi registrado e o que ainda é previsão, com totais rastreáveis e sem duplicação.

**Why this priority**: Permite planejar antes de materializar, preservando os dados já confirmados.

**Independent Test**: Preparar série com um mês persistido, outro virtual e um pulado; projetar três meses e comparar valores e origens.

**Acceptance Scenarios**:

1. **Given** energia projetada em150 e ocorrência persistida confirmada em173,42, **When** projeta o mês, **Then** conta173,42 uma vez e identifica o valor definitivo.
2. **Given** ocorrência pulada ou cancelada, **When** reabre o período ou refaz a projeção, **Then** a exceção continua visível no histórico e não reaparece como compromisso virtual nem materializado.
3. **Given** pagamento ou recebimento de uma ocorrência, **When** compara planejamento e caixa, **Then** o valor planejado permanece uma vez e somente o fato financeiro entra no caixa na data real.
4. **Given** consulta paginada ainda incompleta, **When** vê projeção e totais, **Then** recebe indicação de parcialidade e continuação; ausência em uma página não permite fabricar duplicata virtual de um registro ainda não reconciliado.
5. **Given** série recém-cadastrada ou janela não consultada, **When** o aplicativo está fechado, **Then** nenhuma execução agendada ou notificação é prometida; ao retornar, o período pode ser projetado e gerado.

### User Story 3 - Registrar assinatura mensal no cartão (Priority: P1)

Como usuário, quero que cada cobrança da assinatura vire uma compra/item identificável na fatura correta, sem parcelamento infinito ou saída imediata de caixa.

**Why this priority**: Assinaturas são despesas recorrentes com regras de cartão diferentes das contas externas.

**Independent Test**: Usar cartão fixture com fechamento10 e vencimento17; materializar assinatura com cobrança09/10 e outra com10/10 e repetir a solicitação.

**Acceptance Scenarios**:

1. **Given** cobrança em09/10 e ciclo válido aberto, **When** confere a materialização, **Then** sugere fatura de outubro; cobrança em10/10 sugere novembro, conforme regra de fechamento existente, com escolha explícita permitida pelas regras de compras.
2. **Given** cobrança materializada, **When** abre de novo o mês ou outra aba repete geração, **Then** recupera a mesma compra e item; o vínculo da ocorrência permanece único e a fatura não recebe item extra.
3. **Given** fatura fechada ou com histórico de pagamento, **When** tenta inserir/corrigir cobrança por um fluxo que exige fatura aberta sem pagamentos, **Then** informa o bloqueio e conserva o destino pendente; não move para outra fatura automaticamente.
4. **Given** cartão arquivado, **When** tenta materializar nova cobrança, **Then** bloqueia a nova compra e mantém acessíveis cobranças anteriores; não troca cartão silenciosamente.
5. **Given** assinatura mensal sem término, **When** consulta seu detalhe, **Then** cada mês é cobrança independente vinculada à série, sem numeração1/N ilimitada e sem caixa antes do pagamento da fatura.

### User Story 4 - Confirmar valores e corrigir com vigência (Priority: P2)

Como usuário, quero confirmar uma conta estimada e alterar esta ocorrência ou futuras elegíveis com prévia, preservando passado e liquidações.

**Why this priority**: Contas estimadas e reajustes exigem correções localizadas e históricas.

**Independent Test**: Usar janeiro virtual a150, fevereiro estimado, março liquidado e abril pendente; confirmar fevereiro173,42 e criar revisão válida a partir de abril.

**Acceptance Scenarios**:

1. **Given** fevereiro estimado em150, **When** confirma173,42 somente neste mês, **Then** fevereiro fica definitivo173,42 e os demais valores não mudam; confirmar valor não equivale a pagar.
2. **Given** janeiro virtual definido por revisão anterior, **When** altera futuras a partir de abril, **Then** janeiro continua usando a regra anterior, abril em diante usa a nova e o histórico mostra vigência, valores e motivo.
3. **Given** ocorrência selecionada e futuras contendo uma paga, uma parcial e uma com liquidação revertida, **When** pede edição, **Then** a prévia exclui todas com histórico financeiro e enumera razões; somente as elegíveis mudam.
4. **Given** prévia conferida, **When** outra aba materializa ou liquida alvo afetado antes da confirmação, **Then** a confirmação revalida o conjunto, preserva o fato concorrente e exige nova prévia em caso de conflito.
5. **Given** mudança do dia31 para15 ou do cartão nas futuras elegíveis, **When** confirma a vigência, **Then** cada identidade série/mês permanece a mesma, sem cobrança adicional naquele mês, e vínculos históricos protegidos não são movidos.

6. **Given** reajuste já agendado para julho e nova alteração válida desde maio, **When** confere e confirma a alteração, **Then** a prévia delimita seu efeito a maio e junho, julho em diante segue as revisões já agendadas e meses anteriores permanecem intactos.
### User Story 5 - Pular, cancelar, encerrar e recuperar tentativas (Priority: P2)

Como usuário, quero parar compromissos futuros ou pular um mês, conservando obrigações já confirmadas e recuperando resultados incertos.

**Why this priority**: Evita recriação involuntária e perda de histórico após falhas.

**Independent Test**: Pular novembro ainda virtual, encerrar a partir de dezembro e repetir geração após resposta perdida, com janeiro já materializado.

**Acceptance Scenarios**:

1. **Given** novembro virtual, **When** pula esse mês com motivo, **Then** registra exceção durável que exclui sua exigibilidade; reabrir novembro não o recria.
2. **Given** dezembro como primeiro mês excluído, **When** encerra a série nessa vigência, **Then** deixa de projetar/gerar novas ocorrências de dezembro em diante, mas janeiro já materializado permanece visível e exigível até tratamento explícito.
3. **Given** ocorrência já paga ou parcialmente paga, **When** tenta pular/cancelar diretamente, **Then** bloqueia a ação e orienta o fluxo de correção financeira existente, sem apagar pagamento nem anunciar quitação.
4. **Given** resposta perdida ao gerar ou registrar exceção, **When** consulta/repete a mesma intenção, **Then** recupera o resultado original ou mantém estado indeterminado; não cria efeito alternativo.
5. **Given** pedido acima dos limites ou um alvo inválido, **When** confirma o comando, **Then** rejeita o conjunto inteiro; nenhum subconjunto é anunciado como concluído.

### Edge Cases

- Dia29/30/31 em fevereiro comum/bissexto, anos1900/2000, dezembro/janeiro, limites1900–9999 e ausência de ajuste por dias úteis.
- Início após o dia de cobrança do mês; término antes da primeira ocorrência; início/término no próprio dia ajustado.
- Série sem fim consultada em janela limitada; meses antigos virtuais avaliados pela revisão então vigente, e não pelo valor atual.
- Troca de dia que altera data no mesmo mês sem alterar identidade; exceção com data/competência corrigida que continua identificada pelo mês original.
- Exceção antes da primeira materialização; tentativa de apagar lançamento para forçar recriação; pular e gerar simultaneamente em abas diferentes.
- Valor estimado confirmado igual ou diferente da estimativa; zero, negativo, fração de centavo, estouro e valor definitivo sem liquidação.
- Reajuste com ocorrência paga, parcial, revertida ou item de fatura fechada; revisão concorrente de série/cartão/ciclo; nova vigência anterior a reajuste já agendado, que permanece preservado.
- Fatura nova, existente, arquivamento de referências, destino ambíguo, cobrança exatamente no fechamento ajustado e escolha explícita de outra fatura válida.
- Encerramento com ocorrências futuras já materializadas, com exceções e com resposta perdida; repetir encerramento não cancela obrigações.
- Leitura incompleta, falha/cota durante geração, troca de usuário e resposta tardia; nenhum total parcial apresentado como completo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Oferecer séries privadas de receita externa, despesa externa e assinatura no cartão, todas mensais, com identidade própria e distinta de compra parcelada, empréstimo e transferência. Acesso somente do proprietário após primeiro acesso concluído; titular financeiro não concede acesso a outro login.
- **FR-002**: Exigir descrição1–120 caracteres, natureza, categoria compatível, início como data completa, dia inteiro1–31, valor positivo e modalidade fixa/estimada. Permitir término inclusivo opcional, observação até1000 caracteres e até cinco etiquetas distintas; término anterior ao início é inválido. Receita/despesa externa permite titular e conta prevista opcionais; assinatura exige cartão próprio ativo e usa titular do cartão.
- **FR-003**: Usar BRL em centavos inteiros seguros até9.007.199.254.740.991 e calendário1900–9999 compartilhado. Ajustar dia inexistente ao último dia do mês, conservando a âncora original nos meses seguintes. A data programada deve pertencer ao intervalo inclusivo início/término; um intervalo válido sem ocorrências mostra prévia vazia e não fabrica lançamento.
- **FR-004**: Cada série tem no máximo uma ocorrência por mês de referência, identificado com ano, independente de revisão, dia ajustado, data corrigida, cartão ou fatura escolhida. Identidade série+mês não muda em edições. Duas séries distintas podem ter mesma descrição/valor; não deduplicar por semelhança.
- **FR-005**: Gerar somente ocorrências do período solicitado ao abrir a respectiva tela ou por ação explícita, sem gerar toda a duração da série. Repetições, duplo clique e abas concorrentes devem convergir para a mesma ocorrência e os mesmos vínculos financeiros. Materialização não registra recebimento, pagamento ou quitação.
- **FR-006**: Prover projeção consultável sem gravação que combine ocorrências persistidas, exceções e previsões virtuais para o intervalo pedido. Resolver por identidade: persistida prevalece sobre virtual e exceção de pulo/cancelamento impede previsão ativa; conflito entre estados persistidos deve ser sinalizado, nunca resolvido pela soma de ambos. Confirmadas após encerramento continuam aparecendo.
- **FR-007**: Identificar na apresentação persistida/virtual, valor estimado/definitivo, situação, revisão de origem, mês de referência e base temporal. Planejamento soma cada obrigação/receita prevista uma vez, inclusive obrigações pagas; caixa considera somente fatos financeiros nas datas reais. Não somar série sobre ocorrências nem item de cartão sobre total de fatura.
- **FR-008**: Ocorrência de valor fixo nasce com valor definido; estimada nasce explicitamente estimada. Permitir confirmar valor definitivo positivo para esta ocorrência, inclusive quando inicialmente virtual, mediante prévia e materialização conjunta. Isso não altera outros meses, não liquida a obrigação e não troca a modalidade da série. Liquidação de estimada exige confirmar o valor antes ou na mesma ação explícita, sujeita às proteções financeiras existentes.
- **FR-009**: Materializar receita/despesa externa como lançamento de natureza correspondente vinculado à série e ocorrência, reutilizando regras existentes de recebimento, pagamento parcial/integral, excesso e reversão. Não usar armazenamento/classificação de cartão para despesas externas ou registrar fatos inferidos do vencimento.
- **FR-010**: Assinatura materializada deve produzir exatamente uma compra mensal e seu único item de cobrança vinculado à ocorrência, série, cartão e fatura do mesmo usuário. Pode usar a representação existente de compra em uma parcela, mas deve manter natureza de assinatura e mês recorrente explícitos; não criar uma compra com quantidade infinita nem sequência de parcelas da duração da assinatura.
- **FR-011**: Usar data mensal da assinatura como data da cobrança/compra para sugestão de fatura, conforme ciclos e snapshots existentes: início inclusivo, fechamento exclusivo, cobrança no fechamento segue ao próximo ciclo. Mostrar sugestão e permitir escolha explícita válida antes da materialização. Manter mês identificador da ocorrência mesmo quando sua fatura pertence a outro mês. Ausência de destino único exige escolha; não materializar silenciosamente no destino arbitrário.
- **FR-012**: Formação de compra/item, vínculos de ocorrência e eventual fatura necessária deve confirmar integralmente ou não produzir novo compromisso. Aplicar restrições existentes de compras/correções: fatura fechada ou com histórico de pagamento não admite inserção/edição por fluxo que exige aberta sem pagamentos. Falha/bloqueio fica visível e recuperável; não criar ocorrência anunciada como concluída sem seu item nem escolher outra fatura para contornar proteção.
- **FR-013**: Permitir alterar apenas esta ocorrência ou esta e futuras não liquidadas, com prévia antes/depois, selecionadas/excluídas, motivos e revisão esperada. Editáveis são ativas sem qualquer histórico de liquidação; preservar pagas, parciais e revertidas. Para cartão, exigir também elegibilidade da fatura. Sem elegíveis, rejeitar sem escrita. Tipo financeiro da série não muda; mudança de natureza exige encerrar e cadastrar nova série.
- **FR-014**: Registrar revisões históricas com início de vigência por mês de referência, conteúdo anterior/novo, motivo e instante. Alteração de futuras exige mês selecionado igual ou posterior ao mês atual no fuso do usuário; afeta elegíveis a partir dele, inclusive virtuais, preservando revisões anteriores. Não substituir o padrão atual de forma a recalcular meses anteriores à vigência. Uma nova revisão vale do mês escolhido até o mês anterior à próxima revisão já agendada, se houver; preservar integralmente as revisões posteriores e mostrar esse intervalo na prévia. Para corrigir uma revisão do mesmo mês de vigência, registrar sua substituição no histórico sem alterar revisões de meses posteriores. Revalidar também ocorrências materializadas afetadas; só publicar revisão e mudanças como sucesso se todo o conjunto do comando confirmar.
- **FR-015**: Edição somente desta cria exceção específica, sem revisar demais meses. Permitir descrição, valor/modalidade aplicável, categoria, referências, dia/data e competência mediante validação e prévia; cartão só pode mudar em assinatura elegível. Conservar identidade original e competência confirmada até escolha explícita. Revisões futuras não removem exceções individuais: puladas/canceladas permanecem excluídas e demais exceções conservam seus valores próprios até correção explícita.
- **FR-016**: Permitir pular mês ainda virtual ou cancelar ocorrência persistida elegível, com motivo1–1000 caracteres e prévia. Guardar exceção durável de supressão associada à identidade; excluir fisicamente um lançamento não substitui essa exceção. Pulo/cancelamento não equivale a pagamento ou recebimento. Neste incremento não oferecer desfazer supressão ou reativar a mesma identidade; eventual correção posterior exige fluxo explicitamente especificado.
- **FR-017**: Para pulo/cancelamento no cartão, tratar item/compra e exceção juntos conforme regras existentes, impedindo item órfão ou exigibilidade mantida indevidamente. Bloquear se houver proteção de fatura ou liquidação; não cancelar assinatura inteira para contornar bloqueio de uma cobrança.
- **FR-018**: Encerrar série exige prévia e primeiro mês excluído, igual ou posterior ao mês atual; após a confirmação, não criar novas ocorrências a partir dele. Ocorrências materializadas, pagamentos, recebimentos e exceções já existentes são preservados e identificados, mesmo após a vigência. Cancelá-las exige ações separadas explícitas. Conservar início/fim originais e histórico do encerramento; série encerrada não reabre neste incremento.
- **FR-019**: Revalidar vigência, revisões, exceções e elegibilidade na confirmação. Corridas entre gerar, pular, revisar, encerrar e liquidar devem produzir resultado serialmente consistente ou conflito acionável; geração baseada em revisão obsoleta não cria compromisso após encerramento confirmado. Se geração prevalecer antes, a ocorrência confirmada é preservada e mostrada na prévia atualizada do encerramento.
- **FR-020**: Toda ação com efeito exige intenção estável e resultado recuperável. Repetir mesma intenção/conteúdo retorna resultado original; conteúdo diferente conflita. A unicidade natural da ocorrência protege também intenções distintas. Resposta perdida exige consultar/repetir a intenção original; estado local ou envio pendente não equivale a confirmação. Edição sem diferença retorna sem alteração, sem novo efeito, e revalida estado em eventual repetição.
- **FR-021**: Respeitar tetos herdados da003: até12 ocorrências por comando,32 mutações,32KiB por registro,1MiB por comando,18 acessos de validação por conjunto e8 por escrita, além de1000 expressões. Contar referências, primeiro uso, faturas, itens, vínculos, exceções e histórico; tetos não garantem viabilidade. Excesso rejeita o comando inteiro antes de gravar, com limite e recuperação; não fracionar automaticamente o mesmo comando. Comandos menores exigem seleção/prévia próprias. Revisão futura que exceda orçamento permanece não confirmada, sem publicar apenas o novo padrão.
- **FR-022**: Consultar/projetar janelas de até12 meses por vez, navegáveis para outros intervalos, com páginas de até50 registros e completude explícita. Não carregar toda a vida da série. A abertura de período não autoriza lote ilimitado; informar pendências, limites e ação explícita necessária. Distinguir falha, cota, permissão, conflito e confirmação indeterminada; preservar dados na sessão e descartar respostas ao trocar usuário.
- **FR-023**: Novas referências devem ser existentes, ativas e do mesmo usuário; conservar exatamente referências históricas arquivadas nos papéis permitidos pelos contratos anteriores. Arquivamento de cartão bloqueia novas cobranças, conservando anteriores; revisões podem vincular outro cartão ativo apenas em elegíveis. Não alterar faturas históricas por mudança no padrão do cartão.
- **FR-024**: Garantir propriedade, campos permitidos, calendário/dinheiro, imutabilidade dos fatos, unicidade, vínculos e consistência também em acesso direto fora da interface. Administração não concede acesso financeiro alheio. Planejamento deve definir impacto e comprovar proteção das novas entidades, consultas e índices, preservando contratos existentes e sem prometer viabilidade apenas por contagem preliminar.
- **FR-025**: Oferecer lista/detalhe de séries e ocorrências por mês/ano, filtros por natureza, titular, cartão, categoria e situação, retorno ao contexto e histórico de revisões/exceções. Mostrar estados de carregamento, vazio, parcial, prévia, envio, confirmação e erro; suportar celular/desktop, rótulos, teclado e foco em erro.
- **FR-026**: Geração ocorre apenas com aplicativo aberto ao consultar período ou por ação explícita; não prometer agendamento com aplicativo fechado. Respeitar restrições solicitadas de ausência de Cloud Functions e emulador. Aceitação exige cálculos locais e persistência/concorrência/isolamento com dados fictícios no projeto real autorizado, registrando resultados e limitações. Esta especificação não autoriza publicação, envio remoto da fonte ou movimentação de dados.

### Key Entities *(include if feature involves data)*

- **Série recorrente**: Origem mensal privada, natureza, identidade estável, início, dia, término opcional e estado; não contém toda a história financeira como lista crescente.
- **Revisão com vigência**: Padrão de valores/referências/calendário válido a partir de um mês até a próxima revisão vigente, sem substituição automática de reajustes posteriores já agendados, com história suficiente para reconstituir meses virtuais anteriores e motivo da mudança.
- **Ocorrência**: Identidade única série+mês de referência; pode ser virtual ou persistida e conserva origem/revisão, datas, valor estimado/definitivo e vínculos financeiros. Mês de referência é distinto de competência ajustada e competência da fatura.
- **Exceção de ocorrência**: Sobrescrita individual ou supressão durável por pulo/cancelamento, com motivo e histórico; impede recriação da identidade suprimida.
- **Lançamento financeiro vinculado**: Receita/despesa externa ou compra/item mensal de assinatura, com fatos de liquidação separados e regras próprias; mesma ocorrência não gera cópias financeiras concorrentes.
- **Intenção e confirmação**: Identificam a ação e seus efeitos recuperáveis, revisões e alvos, para repetição e resolução de confirmação incerta.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em todos os casos de dia29/30/31, início/fim, fevereiro e virada do ano, as datas e quantidades projetadas correspondem exatamente ao calendário e à vigência definidos.
- **SC-002**: Em todos os roteiros de geração repetida, duas abas, intenções diferentes e resposta perdida, existe no máximo uma ocorrência ativa e um lançamento/item financeiro por identidade série+mês, sem efeitos órfãos anunciados como sucesso.
- **SC-003**: Em todos os recortes revisados, projeção combina persistida/virtual/exceção sem duplicidade e reconcilia centavo a centavo; supressões não reaparecem após reabrir ou gerar.
- **SC-004**: Em todos os roteiros de confirmação/reajuste, o mês individual e a vigência produzem exatamente a prévia, preservam100% das protegidas e deixam meses virtuais anteriores com o padrão histórico.
- **SC-005**: Em todos os roteiros de assinatura, cobrança segue a fatura conferida e suas regras; nenhum pagamento de fatura duplica despesa e nenhum encerramento cancela silenciosamente compromisso confirmado.
- **SC-006**: Zero acessos/associações indevidos nos testes com usuárioA/B, visitante, administrador sem propriedade e primeiro acesso pendente; zero comandos excedentes parcialmente anunciados como concluídos.
- **SC-007**: Pelo menos quatro de cinco participantes cadastram energia estimada, confirmam o valor de um mês e distinguem previsto de pago em até três minutos sem ajuda, excluindo indisponibilidade de serviço.

## Assumptions

- Uma ocorrência mensal por série; frequências semanais/anuais, múltiplas cobranças da mesma série no mesmo mês, reajuste por índice, juros automáticos, integração bancária e notificações externas ficam fora.
- Data inicial/término restringem datas programadas inclusivamente. Vigências de revisão/encerramento usam meses de referência: encerramento informa o primeiro mês sem novas ocorrências. Ausência de término não significa materialização infinita.
- Mudanças em futuras começam no mês atual ou posterior. Correção de mês histórico elegível é ação individual explícita; consulta sozinha nunca altera o passado virtual. Se uma revisão mudar o dia no primeiro mês para antes da data inicial, esse mês passa a não ser elegível, preservadas ocorrências já confirmadas e exceções históricas.
- Estimativa exige valor positivo conhecido como referência, não valor ausente ou zero. Confirmação definitiva é decisão do usuário; nenhuma taxa ou valor é inferido por histórico.
- Abertura mensal pode materializar apenas seleção limitada permitida, com indicação de geração e resultado; a função de projeção permanece sem escrita. Janela de doze meses não autoriza materializar todas as séries em um único comando.
- Contratos003–005 fornecem dinheiro/calendário, cadastros e liquidações externas;006–008 fornecem ciclos, compras e pagamentos/correções de fatura. Reutilização exige verificar implementação e habilitação reais no planejamento, sem presumir todos os fluxos remotos disponíveis. Parcelados009 mantêm identidade própria e não são usados como recorrência indefinida.
- Fuso do usuário rege mês atual, inicialmente America/Rio_Branco; datas financeiras são datas de calendário sem mudança por conversão de fuso. Datas programadas externas sugerem competência do próprio mês, ajustável explicitamente.
- Não se altera configuração de autenticação, regras ativas, dados financeiros ou autorização de envio externo nesta fase. A restrição de serviços/emuladores é requisito explícito do usuário e da constituição, não uma decisão de arquitetura nova.

