# Feature Specification: Cadastros financeiros privados

**Feature Branch**: `develop` — branch existente; nenhum hook configurado

**Feature Directory**: `specs/004-cadastros-financeiros-privados`

**Created**: 2026-10-17

**Status**: Implementação local — validação remota e assistida pendentes

**Input**: CRUD mínimo de titulares, categorias de receita/despesa, contas de pagamento e etiquetas/projetos privados por UID. Listar, criar, editar e arquivar com validação, loading e erros. Preservar histórico, impedir novas referências arquivadas e vínculos entre UIDs. Saldo inicial opcional com data-base explícita, sem confirmação bancária indevida ou credenciais bancárias. Entrega de rules por coleção com campos permitidos, tipos, propriedade e invariantes.

## Clarifications

### Session 2026-10-17

- Q: Ao quitar uma despesa ou receber uma receita já existente cuja conta prevista foi arquivada, qual conta poderá ser usada? → A: Exigir uma conta ativa para registrar o pagamento ou recebimento, preservando a conta prevista arquivada no histórico.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrar cadastros privados (Priority: P1)

Como usuário autenticado com primeiro acesso concluído, quero organizar titulares, categorias, contas e etiquetas usando nomes escolhidos por mim.

**Why this priority**: Lançamentos dependem de classificações válidas, privadas e compreensíveis.

**Independent Test**: Para cada coleção, criar, listar, editar, recarregar e arquivar cadastro fictício, conferindo identidade e persistência.

**Acceptance Scenarios**:

1. **Given** lista vazia, **When** abre o cadastro, **Then** vê estado vazio e ação de criação; durante consulta vê carregamento, sem confundir falha com ausência de registros.
2. **Given** formulário válido, **When** salva com confirmação remota, **Then** o registro aparece com ID estável e persiste após recarga.
3. **Given** titular com nome diferente do usuário, **When** cadastrado ou renomeado, **Then** representa pessoa administrada, sem criar login, convite ou acesso.
4. **Given** categoria de receita/despesa e etiqueta com nome livre, **When** salvas, **Then** classificam e agrupam sem orçamento, meta ou nome real fixado no produto.
5. **Given** nome vazio, só espaços, acima de 120 caracteres ou tipo inválido, **When** tenta salvar, **Then** recebe erro no campo e nenhuma alteração é persistida.
6. **Given** falha de rede, cota ou permissão, **When** a operação falha, **Then** há mensagem acionável e entrada preservada na mesma sessão autorizada, sem sucesso falso.
7. **Given** duas abas editando a mesma versão, **When** a segunda salva após a primeira, **Then** recebe conflito e opção de reler, sem sobrescrita silenciosa.

---

### User Story 2 - Impedir acesso e referências indevidas (Priority: P1)

Como usuário, quero privacidade mesmo diante de acesso direto aos dados ou manipulação de referências fora dos seletores da tela.

**Why this priority**: O dropdown não estabelece propriedade nem autorização.

**Independent Test**: Com A, B e visitante, tentar operações diretas em cada coleção e associar conta de A a titular de B; repetir com administrador sem propriedade e sessão de primeiro acesso pendente.

**Acceptance Scenarios**:

1. **Given** registros de A, **When** B, visitante ou administrador de outro UID tenta ler, listar, criar, editar, arquivar ou excluir nesses caminhos, **Then** o acesso é negado sem revelar dados.
2. **Given** sessão de A, **When** envia conta com titular inexistente, arquivado, de coleção errada ou pertencente apenas a B, **Then** a persistência nega a gravação.
3. **Given** IDs iguais em A e B, **When** A referencia esse ID, **Then** somente o documento da coleção esperada em A pode ser resolvido; caminhos enviados pelo cliente não escolhem B.
4. **Given** escrita direta, **When** contém campo extra, tipo incorreto, troca de propriedade, versão adulterada ou alteração de metadado imutável, **Then** é rejeitada integralmente.
5. **Given** logout ou troca de A para B com operação pendente, **When** chega resposta da sessão anterior, **Then** não preenche a sessão de B nem exibe dados de A.

---

### User Story 3 - Arquivar sem quebrar o histórico (Priority: P1)

Como usuário, quero retirar cadastros de uso corrente sem perder a compreensão dos fatos anteriores.

**Why this priority**: Retirar uma classificação não pode apagar fatos financeiros ou permitir vínculos inválidos.

**Independent Test**: Arquivar cadastro com referência histórica autorizada e verificar leitura, proibição de exclusão e rejeição de novo vínculo por tentativa direta.

**Acceptance Scenarios**:

1. **Given** cadastro ativo, **When** confirma arquivamento após ler seu impacto, **Then** após confirmação remota ele sai das opções para novos vínculos e aparece no filtro de arquivados.
2. **Given** arquivado referenciado, **When** consulta histórico, **Then** nome e indicação de arquivado permanecem legíveis, preservando valores, datas e vínculos financeiros.
3. **Given** formulário aberto antes do arquivamento em outra aba, **When** tenta criar novo vínculo, **Then** a persistência rejeita a referência e orienta escolher cadastro ativo.
4. **Given** registro antigo com referência arquivada, **When** edita campo não relacionado à classificação, **Then** pode preservar exatamente o vínculo antigo; adicionar/substituir referência exige cadastro ativo do mesmo UID.
5. **Given** cadastro referenciado ou não, **When** tenta exclusão física, **Then** ela é negada; arquivamento é a operação disponível.
6. **Given** conta vinculada a titular posteriormente arquivado, **When** consulta ou renomeia a conta, **Then** mantém titular legível, sem exigir sua reativação.
7. **Given** despesa ou receita existente com conta prevista arquivada, **When** a futura funcionalidade de liquidação for habilitada e registrar pagamento ou recebimento, **Then** exige conta efetiva ativa do mesmo UID, preserva o vínculo previsto no histórico e rejeita tentativa direta de usar a conta arquivada na nova movimentação. Este cenário é obrigação da feature consumidora, sem ampliar o aceite executável do CRUD atual.

---

### User Story 4 - Informar base da conta sem falsa confirmação de saldo (Priority: P2)

Como usuário, quero identificar onde pago/recebo e, se souber, registrar uma posição inicial datada, distinguindo-a de saldo bancário confirmado.

**Why this priority**: Uma base ausente ou incompleta não pode produzir disponibilidade financeira enganosa.

**Independent Test**: Criar contas dos três tipos sem base, com zero, posição devedora e datas inválidas; conferir apresentação e bloqueios após uso.

**Acceptance Scenarios**:

1. **Given** nome e tipo banco, carteira ou conta de pagamento, **When** cria sem base, **Then** a conta é válida e informa base não informada, sem substituir ausência por zero.
2. **Given** saldo inicial informado, inclusive zero, **When** falta data-base válida ou posição credora/devedora, **Then** não salva e aponta campos necessários.
3. **Given** base válida, **When** salva, **Then** apresenta valor e data como informação manual, sem criar receita, despesa, pagamento ou recebimento.
4. **Given** base não confiável ou movimentações incompletas, **When** consulta resumo, **Then** vê saldo não confirmado/indisponível, nunca saldo bancário confirmado nem resultado mensal chamado de saldo disponível.
5. **Given** conta já usada em movimentação, **When** tenta alterar/remover base ou mudar tipo, **Then** a operação é bloqueada sem recalcular silenciosamente o histórico.
6. **Given** campo extra de senha, token bancário, número completo de cartão ou CVV, **When** enviado diretamente, **Then** é negado; formulários não solicitam esses dados.

### Edge Cases

- Nomes iguais no mesmo UID ou entre UIDs são permitidos; IDs continuam distintos e nome nunca é chave de vínculo/propriedade.
- Zero informado difere de ausência. Posição devedora usa magnitude, sem transformar saldo negativo em lançamento comum.
- Datas inexistentes, bissextos, virada de ano e anos fora de 1900–9999 são tratados como calendário, sem deslocamento por fuso. Data-base futura em relação ao dia local do perfil é recusada.
- Renomear preserva ID e mostra nome atual no histórico; não há promessa de snapshot do nome antigo.
- Arquivar titular não arquiva contas nem altera automaticamente lançamentos, faturas, parcelas ou recorrências existentes.
- Arquivar novamente não produz novo efeito. Não há reativação nem edição de conteúdo arquivado no mínimo.
- Categoria referenciada não pode mudar de receita para despesa ou vice-versa; criar outra e arquivar a anterior.
- Preservar referência arquivada não permite copiá-la para novo lançamento, nova série ou recorrência. Compromissos existentes continuam consultáveis e liquidáveis, mas novos pagamentos e recebimentos exigem conta efetiva ativa, preservando a conta prevista arquivada no histórico; geração futura por molde exige substituição ativa antes de criar novos lançamentos.
- Arquivamento concorrente com vínculo exige ordem consistente de confirmação: vínculo confirmado antes pode permanecer histórico; vínculo posterior é recusado.
- Duplo clique, resposta perdida ou recarga durante salvamento não duplicam cadastro nem indicam sucesso sem confirmação.
- Lista parcialmente carregada não afirma que inexistem outros registros.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Oferecer listagem, criação, edição e arquivamento das quatro coleções na área privada após primeiro acesso concluído. Listar ativos por padrão, com filtros ativos/arquivados/todos e páginas de até 50 registros; não carregar histórico financeiro inteiro.
- **FR-002**: Cada cadastro pertence exclusivamente ao UID autenticado. Titular é nome financeiro administrado, não usuário de acesso. Nenhum cadastro, vínculo ou papel administrativo concede acesso financeiro a terceiros.
- **FR-003**: Aceitar nome livre com 1–120 caracteres após remoção de espaços externos. Rejeitar vazio, tipo incorreto e excesso sem truncar. Permitir nomes duplicados; não fixar nomes pessoais, bancos ou finalidades reais no código ou inicialização obrigatória.
- **FR-004**: Categoria exige natureza receita/despesa e apenas classifica. Etiqueta/projeto é entidade única de agrupamento livre; não criar módulo de projetos, orçamento ou metas.
- **FR-005**: Conta exige nome e tipo banco, carteira ou conta de pagamento e permite titular opcional do mesmo UID. Não representa cartão de crédito. Não coletar/armazenar credenciais bancárias, número completo de cartão ou CVV.
- **FR-006**: Saldo inicial opcional é conjunto indivisível: magnitude em centavos inteiros, posição credora/devedora e data-base explícita. Magnitude de 0 a 9.007.199.254.740.991; zero exige posição credora. Reutilizar dinheiro e calendário da feature 003; posição devedora é extensão restrita à base, sem sinais em valores de lançamentos.
- **FR-007**: Sem base, campos correspondentes ficam ausentes, sem null ou zero implícito. Com base, exigir trio completo e data gregoriana canônica de 1900-01-01 a 9999-12-31, não futura no calendário local do perfil. Representa posição manual no início da data-base; futura apuração considera movimentos efetivos a partir desse dia sem duplicar a base como lançamento.
- **FR-008**: Apresentar base como “saldo inicial informado”, com data e origem manual. Esta entrega não confirma saldo bancário nem oferece campo editável de confiabilidade/completude. Sem garantia explícita de base confiável e movimentos completos, mostrar saldo não confirmado/indisponível. Resultado mensal é distinto de saldo de conta.
- **FR-009**: Antes da primeira movimentação vinculada, permitir corrigir/remover base completa e alterar tipo de conta. Após uso financeiro, bloquear mudanças de tipo, magnitude, posição e data-base. Nome/titular continuam editáveis sem reatribuir fatos históricos; novo titular exige referência ativa válida. Não gerar ajuste implícito; reconciliação posterior fica fora do escopo.
- **FR-010**: Renomear preserva ID. Natureza da categoria pode mudar apenas antes de qualquer referência. Garantir bloqueio por uso na persistência, inclusive diante de escrita direta/concorrente; não depender de consulta visual ou indicador livremente editável pelo cliente.
- **FR-011**: Confirmar arquivamento com impacto informado, preservando documento e fatos vinculados, inclusive pendências. Negar exclusão física nas quatro coleções, inclusive sem referências. Não implementar cascata, reativação ou edição de conteúdo arquivado.
- **FR-012**: Novos vínculos aceitam somente entidades existentes, da coleção esperada, ativas e do mesmo UID no momento da confirmação. Aplica-se ao titular da conta e consumidores financeiros. Todo novo pagamento ou recebimento exige conta efetiva ativa do mesmo UID, inclusive ao liquidar compromisso anterior com conta prevista arquivada; preservar essa conta prevista no histórico, sem substituição automática. Referência opcional ausente é válida; referência inexistente não é. Não aceitar caminho livre nem proprietário indicado no formulário.
- **FR-013**: Atualização histórica pode conservar arquivado somente se identificador e papel da relação forem exatamente os persistidos. Cada referência adicionada/substituída passa por FR-012. Categoria de receita classifica receita e de despesa classifica despesa. Validar cada etiqueta individualmente; consumidores respeitam até cinco IDs distintos conforme feature 003.
- **FR-014**: Ocultar arquivados no dropdown não substitui autorização na persistência. Bloquear tentativas diretas, formulário obsoleto, vínculo cruzado, troca de coleção e arquivado em entidade nova. Não abrir coleções financeiras sem funcionalidade para demonstrar referências.
- **FR-015**: Mostrar carregamento, vazio, envio, confirmação e erro. Impedir reenvio concorrente da mesma intenção. Distinguir validação, conflito, indisponibilidade/cota, ausência e falta de permissão sem revelar dados de outro UID. Preservar entrada na mesma sessão após falha; sucesso somente após confirmação remota.
- **FR-016**: Criação usa identidade estável por intenção, reutilizada após confirmação perdida; repetir não cria outro cadastro. Editar/arquivar exige versão esperada, rejeitando versão obsoleta. Após conflito, reler antes de nova intenção. Escrita pendente/offline não equivale a confirmação.
- **FR-017**: Limpar dados privados e assinaturas no logout/troca de UID, descartar respostas tardias e impedir reenvio de intenção anterior sob outro UID. Preservar proteção de primeiro acesso da feature 002 e permissões de autenticação/admin.
- **FR-018**: Listas/formulários funcionam em celular e desktop com rótulos, teclado, foco no erro e feedback perceptível sem depender somente de cor.
- **FR-019**: Entregar na implementação autorização explícita por coleção conforme contrato abaixo: campos fechados, tipos, faixas, propriedade, versões, imutáveis e relações. Negar campos desconhecidos e acesso não previsto; validação local não substitui autorização remota.
- **FR-020**: Implementação entrega firestore.rules completo e nota de alterações com coleções, permissões, invariantes, testes, limitações, publicação e reversão; índices completos quando necessários. Preservar regras válidas existentes. Gerar arquivo não significa publicar; esta especificação não modifica/publica rules.
- **FR-021**: Planejamento deve provar primeiro uso e integridade referencial sem varrer coleções nas rules nem confiar em sinalizador adulterável. Definir controles protegidos e transições na mesma fronteira de consistência dos consumidores. Orçar perfil, referências e concorrência dentro dos limites vigentes sem retirar proteções; impasse bloqueia implementação do caso afetado.
- **FR-022**: Aceitação da implementação inclui positivos/negativos por coleção e referência, com A/B/visitante, admin sem propriedade e primeiro acesso pendente. Verificações remotas usam cliente autenticado, dados fictícios e projeto real autorizado, sem emuladores. Registrar testes efetivos e limitações; validações locais não comprovam rules publicadas.

### Key Entities *(include if feature involves data)*

O UID vem da sessão e do espaço proprietário. IDs são estáveis, não reciclados e independentes de nomes. Os campos são contrato de dados solicitado, sem impor algoritmo de persistência.

#### Campos comuns permitidos

| Campo | Tipo e obrigatoriedade | Invariantes |
| --- | --- | --- |
| nome | Texto obrigatório, 1–120 caracteres após trim | Não vazio; duplicados não unem registros. |
| estado | Enum obrigatório: ativo/arquivado | Criar ativo; transição apenas ativo → arquivado; arquivado sem edição de conteúdo. |
| schemaVersion | Inteiro obrigatório, inicialmente 1 | Imutável no CRUD; esquema desconhecido bloqueia escrita. |
| version | Inteiro positivo obrigatório | Criar em 1; alteração efetiva exige versão anterior e incremento de 1. |
| createdAt | Instante técnico obrigatório | Definido na criação e imutável. |
| updatedAt | Instante técnico obrigatório | Corresponde à confirmação da alteração, sem instante arbitrário do cliente. |
| archivedAt | Instante técnico condicional | Ausente no ativo, obrigatório ao arquivar e preservado depois. |

#### Contrato de autorização por coleção

Caminhos relativos a users/{uid}. Leitura individual/listagem, inclusive de arquivados, exige próprio UID e primeiro acesso concluído. Mesma condição para criar/editar/arquivar. Exclusão sempre negada, sem privilégio financeiro administrativo.

| Coleção | Campos além dos comuns | Tipos e invariantes específicos |
| --- | --- | --- |
| titulares/{id} | Nenhum | Pessoa administrada, sem login, senha, convite, permissões ou orçamento. |
| categorias/{id} | natureza obrigatório | Enum receita/despesa; imutável após primeiro uso; sem orçamento ou total editável. |
| contas/{id} | tipo obrigatório; titularId opcional; trio opcional saldoInicialCentavos, saldoInicialPosicao, saldoInicialDataBase | Tipo banco/carteira/contaPagamento. Titular é ID textual não vazio resolvido só em titulares do mesmo UID. Base: inteiro na faixa FR-006, posição credora/devedora e data canônica; ausência ou trio completo, zero só credor. Mudanças seguem FR-009; sem saldo atual/confirmado, completude ou credenciais. |
| etiquetas/{id} | Nenhum | Agrupamento livre; projeto não é coleção ou login adicional. |

Campos opcionais ausentes não são null. uid, ownerUid, caminhos arbitrários e campos extras são proibidos; propriedade deriva do caminho autenticado. Identidade/caminho não são transferíveis por atualização; criar em caminho de outro UID também é negado.

Controles protegidos de primeiro uso, se necessários, terão contrato fechado no plano; não são campos editáveis dos formulários. Cliente não pode apagar/retroceder controle para liberar natureza, tipo ou base. Coleção auxiliar exige regras explícitas, justificativa e testes; nenhuma permissão genérica é autorizada.

#### Referências e histórico

- **Conta → titular**: inclusão/substituição exige titular ativo do próprio UID. Remover associação não altera titularidade de fatos passados. Arquivar titular preserva relação existente.
- **Consumidor → categoria/titular/conta/etiqueta**: ID e papel tipado no UID corrente; validar existência, coleção, estado e natureza aplicável na persistência. Nome/caminho textual não autoriza acesso.
- **Histórico → arquivado**: resolver cadastro e sinalizar arquivamento. Preservar vínculo é exceção de atualização do mesmo registro, nunca autorização para criar outro com ele.
- **Liquidação → conta efetiva**: novo pagamento ou recebimento exige conta ativa do mesmo UID; a conta prevista arquivada permanece no compromisso como informação histórica, sem autorizar sua utilização na nova movimentação.
- **Base de conta**: informação manual datada, sem lançamento automático, total concorrente ou confirmação bancária. Nenhuma integração bancária é criada.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Nas quatro coleções, 100% dos roteiros criar → listar → editar → recarregar → arquivar preservam ID, dados confirmados e leitura do arquivado; criar um cadastro válido exige no máximo dois minutos em teste assistido sem falha de conectividade.
- **SC-002**: Zero acessos indevidos nos roteiros A/B, visitante, admin de outro UID e primeiro acesso pendente, abrangendo leitura individual, listagem, criação, edição, arquivamento e exclusão nas quatro coleções.
- **SC-003**: Todas as tentativas de novo vínculo conta → titular inexistente, de outro UID, da coleção errada ou arquivado são rejeitadas, inclusive fora dos seletores; 100% dos vínculos históricos válidos conta → titular permanecem legíveis após arquivamento.
- **SC-004**: Em todos os casos sem base, com base manual ou histórico incompleto, zero telas afirmam saldo bancário confirmado; zero informado e base ausente são distinguíveis em 100% dos casos.
- **SC-005**: Todos os casos de campo extra, tipo inválido, versão obsoleta, natureza alterada após uso e base/tipo alterado após movimentação são recusados sem mudança parcial ou perda do valor anterior.
- **SC-006**: Nos roteiros de falha, duplo clique, confirmação perdida e troca de sessão, há zero duplicações da mesma intenção, confirmações falsas ou exposições da sessão anterior; toda falha orienta correção, releitura ou nova tentativa.
- **SC-007**: Pelo menos quatro de cinco participantes de teste assistido criam e arquivam um cadastro sem ajuda e distinguem titular administrado de usuário com acesso e saldo informado de saldo bancário confirmado.

### Obrigações de integração futura

- Antes de habilitar qualquer consumidor financeiro, comprovar referências existentes e válidas no mesmo UID, natureza compatível da categoria e cada etiqueta validada conforme FR-012/013. Essa obrigação não é substituída pela aprovação de SC-003 no CRUD atual.
- Antes de habilitar pagamentos/recebimentos, comprovar conta efetiva ativa do mesmo UID em toda nova liquidação, inclusive de compromisso antigo, preservando a conta prevista arquivada no histórico. Permanecem vigentes a clarificação A e o cenário 7 da história 3, a serem executados na feature consumidora.

## Assumptions

- Constituição 1.2.0 e features 002/003 são dependências. Reutilizar autenticação, primeiro acesso, dinheiro, calendário e conflitos. Este comando produz especificação, não código, publicação de rules ou alteração de dados reais.
- Feature 003 descreve inicialmente conta como dinheiro/conta de pagamento. Esta feature especializa em banco, carteira (dinheiro) e contaPagamento e acrescenta base opcional. Harmonizar contratos/planos dependentes na implementação e versionar migração necessária, sem aceitar esquemas incompatíveis silenciosamente.
- Base devedora tem magnitude positiva e posição própria, restrita à conta; não permite valores negativos em despesas/receitas.
- CRUD não confirma confiabilidade da base nem completude das movimentações. Reconciliação, saldo atual e correção da base após uso exigem funcionalidade futura. Esta entrega apresenta a incerteza explicitamente.
- Nomes atuais são exibidos nos vínculos antigos. Snapshots de nomes, fusão de duplicados, hierarquia de categorias, cores, ícones, importação, compartilhamento, reativação e exclusão física estão fora do mínimo.
- Consumidores futuros devem cumprir FR-012/013 e proteger primeiro uso. Neste incremento, conta → titular já exige prova de isolamento/estado. Não autorizar coleções financeiras antecipadas para testar contratos sem implementação.
- Numeração sequencial conforme init-options.json. Não existe extensions.yml nem hooks antes/depois da especificação. A resolução specify preset resolve spec-template falhou por launcher Python indisponível; sem presets/sobrescritas locais, foi copiado .specify/templates/spec-template.md, preservando seções e ordem.
