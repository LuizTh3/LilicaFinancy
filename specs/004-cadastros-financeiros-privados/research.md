# Research: Cadastros financeiros privados

Data: 2026-10-17. Fontes: código existente, constituição 1.2.0, spec 004 e documentação atual via Context7 (/websites/firebase_google), complementada por referências oficiais quando a busca retornou material Enterprise/Pipelines inadequado ao adaptador Standard.

## R1 — Arquitetura e contratos já existentes

**Decision**: Reutilizar money.ts, calendar.ts, errors.ts, idAvulsoValido, SessionGeneration, SessionGate e cliente Firebase existentes. Criar contratos cadastrais específicos sem estender tiposComando da 003 para comandos ainda sem consumidor financeiro.

**Rationale**: O núcleo já implementa centavos seguros, calendário/fuso e resultados discriminados. O app mantém cache em memória e primeiro acesso protegido. Estado persistido será estado; projeção para SnapshotAlvo.contas usa estadoCadastro por conversão explícita. Carteira corresponde semanticamente ao antigo dinheiro; banco é subtipo cadastral adicional.

**Alternatives considered**: Duplicar lógica monetária; colocar SDK nas funções de domínio; aceitar os dois schemas silenciosamente. Rejeitados por divergência/arquitetura. Não há migração real de cadastros autorizada; documento incompatível bloqueia escrita e exige migração explícita.

## R2 — Comandos e retomada

**Decision**: Duas escritas em runTransaction: cadastro e recibo imutável por coleção+ID+versão resultante. ID de criação gerado antes da tentativa; versões esperadas nunca são atualizadas automaticamente em retry. Consultar recibo antes de comparar versão atual, reconhecendo repetição mesmo se houve edição posterior.

**Rationale**: A transação exige leituras antes das escritas e pode repetir seu callback por concorrência; falha offline. Portanto callback não altera UI nem cria chave nova. Recibo guarda payload normalizado, não apenas hash escolhido pelo cliente. Rules ligam recibo e documento em ambos os sentidos por estado antes/depois. [Transações](https://firebase.google.com/docs/firestore/manage-data/transactions).

**Alternatives considered**: setDoc simples com último vencedor; comparar só nome/valor após falha; reusar mesma chave com conteúdo modificado. Rejeitados. Não usar um recibo único editável nem array histórico. Consultas de confirmação são remotas; getDocFromServer falha sem rede, diferentemente de leitura que pode usar cache. [Referência do SDK](https://firebase.google.com/docs/reference/js/firestore#getdocfromserver).

## R3 — Primeiro uso sem varredura

**Decision**: Reservar usoCadastros/{colecao}__{id} para categorias/contas. Ausência permite mudar natureza ou base/tipo; presença bloqueia essas mudanças, inclusive se controle malformado. Cliente atual não cria, altera ou exclui controle. Também não cria nenhum consumidor financeiro, logo não há uso financeiro novo sem controle nesta entrega.

**Rationale**: Controle separado preserva os campos fechados definidos na spec. Futuro consumidor deve obrigar controle imutável em getAfter, e regra do controle deve validar testemunha tipada antes/depois no mesmo UID, com relação efetivamente adicionada. Remoção da última referência não remove primeiro uso. Estratégia/contagem em contracts/security.md. [Condições e getAfter](https://firebase.google.com/docs/firestore/security/rules-conditions).

**Alternatives considered**: Sinalizador editável, busca por documentos consumidores, congelar todas as categorias/contas desde criação. Rejeitados por insegurança, inviabilidade nas Rules ou conflito com edição pré-uso. Metadado embutido no cadastro reduz acessos de futuros consumidores mas altera allowlist/esquema; é alternativa futura explícita se controles separados não couberem, nunca relaxamento silencioso.

## R4 — Limites e orçamento

**Decision**: CRUD opera um cadastro por comando; orçamento conservador até oito acessos de Rules no conjunto de duas escritas, até cinco em uma escrita, sem contar com cache. Não ativar perfilFinanceiroRemoto da 003: é simulador e não prova operacional.

**Rationale**: Limites oficiais incluem dez acessos por operação e vinte no conjunto atômico; também há mil expressões por requisição. Usar margens internas de oito/dezoito da 003 e registrar orçamento por branch antes de publicar. [Cotas oficiais](https://firebase.google.com/docs/firestore/quotas).

**Alternatives considered**: Lotes de cadastros sem necessidade, assumir cache ou transportar orçamento de doubles. Rejeitados. Titular+categoria+conta+cinco etiquetas já requer oito referências; perfil e controles separados podem exceder o teto por escrita. Consumidor futuro precisa limitar combinações ou redesenhar controle e provar seu próprio orçamento.

## R5 — Schemas, referências e arquivamento

**Decision**: hasAll/hasOnly e tipos por coleção, diff de imutáveis, version+1, timestamps de servidor, deletes negados. Novo titular da conta deve existir ativo em getAfter no próprio UID. Vínculo idêntico já persistido pode continuar arquivado. Nenhuma referência aceita path livre.

**Rationale**: getAfter também impede criar vínculo e arquivar seu alvo no mesmo lote como atalho. Preservar histórico não permite criar novo fato com referência arquivada. [Campos e diffs](https://firebase.google.com/docs/firestore/security/rules-fields).

**Alternatives considered**: Dropdown como validação, get apenas do estado anterior, permissões admin financeiras. Rejeitados. Nomes são livres; normalizar espaços externos e comparar nome persistido à versão aparada, validando também comprimento. String das Rules oferece trim, size e conversão string(int) para chave de recibo. [Referência String](https://firebase.google.com/docs/reference/rules/rules.String).

## R6 — Datas e saldo inicial

**Decision**: Validar data civil com núcleo compartilhado na entrada e função gregoriana nas Rules. Reutilizar/revisar validDate existente para checar tipo/formato antes de conversões. Não aceitar data-base futura: comparar YYYYMMDD inteiro com ano/mês/dia de request.time menos cinco horas, exigindo perfil America/Rio_Branco.

**Rationale**: O perfil atualmente tem esse único fuso e sua edição cliente é negada. Derivar dia remoto impede relógio adulterado do navegador. Offset é usado para determinar hoje na requisição, não para converter a data financeira em instante ou calcular offsets históricos. Timestamp oferece year/month/day; duration.value permite horas. [Timestamp](https://firebase.google.com/docs/reference/rules/rules.Timestamp), [duration](https://firebase.google.com/docs/reference/rules/rules.duration_).

**Alternatives considered**: UTC puro, hoje enviado pelo cliente, parser ISO presumido nas Rules. Rejeitados. Mudança de fuso exige revisão coordenada da validação remota; fuso inesperado bloqueia gravação da base. Base manual não fornece evidência de saldo bancário confirmado.

## R7 — Listas e índices

**Decision**: Consultar uma coleção privada por vez, estado opcional, orderBy(nome asc) e documentId asc, limit<=50 e cursor composto. Não aplicar ordenação pt-BR em memória sobre página parcial nem prometer snapshot estável entre páginas com edições concorrentes. Recomeçar paginação após mutação/filtro e disponibilizar recarregar.

**Rationale**: Cursor com desempate suporta nomes repetidos. Quatro índices estado asc + nome asc, escopo COLLECTION, preservando anteriores; __name__ asc é desempate do índice. Consultas sem filtro usam índice simples de nome. [Cursores](https://firebase.google.com/docs/firestore/query-data/query-cursors).

**Alternatives considered**: offset, carregar tudo para ordenar/buscar, listener de histórico. Rejeitados por custo/escopo. Seleção de titular também paginada, sem usar uma primeira página como prova de inexistência.

## R8 — Validação remota e limpeza

**Decision**: Estender grupo cadastros, manifesto para seis subcoleções fixas e IDs exatos da execução; preflight bloqueia projeto incorreto ou contas ausentes. Fixture de controle de primeiro uso usa operação operacional separada/privilegiada, jamais endpoint do app ou permissão cliente temporária. Operações de aceitação usam cliente autenticado.

**Rationale**: Manifesto atual aceita apenas documentos raiz e limpeza recusa pais com filhos. Registrar cada filho antes de criá-lo; não listar/apagar o conteúdo inteiro do UID. Limpar filhos revisados com updateTime antes de eventual pai autorizado, recusando pai com filhos não inventariados. Contas preexistentes e perfis não criados pela execução não são removidos.

**Alternatives considered**: Emuladores, Admin SDK como prova de Rules, permissões globais de teste, exclusão do UID inteiro. Proibidos ou insuficientes. Sem projeto/credenciais/publicação confirmada, documentar integração bloqueada; não alegar sucesso remoto.

## Resultado

Nenhuma decisão técnica atual permanece aberta. O desenho é verificável na implementação; documentação não comprova compilação de Rules, índices implantados ou testes remotos. A fase financeira futura conserva gate fechado até prova própria de controles, fontes de verdade e limites.
