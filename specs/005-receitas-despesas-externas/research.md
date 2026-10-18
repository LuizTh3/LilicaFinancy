# Research: Receitas e despesas externas

Data: 2026-10-17. Pesquisa documental e inspeção local; sem implantação ou teste financeiro remoto. Skills speckit-plan e context7-mcp aplicadas. Pesquisa de segurança e consultas delegada a agentes conforme fase 0 da skill.

## R1 — Base existente e compatibilidade

**Decision**: Manter versões de package.json: Firebase 13.0.0, TypeScript ~6.0.2, React ^19.2.8, React Router 7.18.4; sem dependências novas. Reutilizar dinheiro, calendário e Resultado da 003 e autorização/geração de sessão da 002/004.

**Rationale**: src/domain/finance já oferece primitivas e regras gerais. O domínio atual permite inversões parciais e datas distintas e projetarPeriodo conta reversão de pagamento como entrada. A 005 exige especialização integral, data/conta herdadas e neutralização dos totais brutos; não alterar implicitamente semânticas econômicas futuras.

**Alternatives considered**: Novo domínio financeiro duplicado, usar cast para converter persistência, ou mudar toda inversão existente. Rejeitados por duplicação/perda de semântica. Um adaptador explícito e projeção especializada testada atendem o incremento.

## R2 — Regras locais precisam de reparo

**Decision**: Tornar a restauração de firestore.rules pré-requisito da implementação. O arquivo inspecionado tem blocos match duplicados interrompendo as regex de safeId e calendarDate, além de repetição de trechos superiores.

**Rationale**: Não é base compilável confiável para novas permissões. Preservar intenção das regras 002/004, não copiar corrupção ou substituí-la por permissão ampla. Nenhuma inspeção local permite afirmar o que está publicado.

**Alternatives considered**: Ignorar a corrupção, consertar só a linha afetada, publicar para experimentar. Rejeitados; entregar arquivo completo revisado, nota, backup e validação de compilação pelo serviço oficial quando autorizado, sem emuladores.

## R3 — Evento imutável reúne fato e recibo

**Decision**: lancamentosExternos guarda previsão/obrigação; operacoesExternas guarda recibo imutável com comando completo normalizado e fato opcional tipado. Recebimento/pagamento existe fisicamente uma vez dentro do evento, com ID igual ao evento. Não escrever cópias em pagamentos/recebimentos genéricos.

**Rationale**: Fato continua separado da obrigação. Um documento a menos evita leituras redundantes das Rules; recibo dá rastreabilidade e retomada. Último evento e versão resultante verificam o encadeamento nos dois sentidos.

**Alternatives considered**: Recibo, fato e controle em três documentos independentes; aumenta validações e excede orçamento no primeiro gasto imediato com cinco etiquetas. Um array de fatos na origem seria crescente e viola constituição.

**Refinamento após análise**: semAlteracao não é evento financeiro ou confirmação persistida: não escreve recibo, não reserva chave e reavalia a versão em repetição. Cliente encerra intenção/descritor. FR-016 e SC-007 delimitam a recuperação de resultado original às operações com efeito confirmado. Isso evita criar um novo protocolo de recibo sem efeito que alteraria a prova de encadeamento e os orçamentos.

## R4 — Primeiro uso com evolução dos cadastros

**Decision**: schemaVersion 2 para categoria/conta, com metadado opcional e permanente usoFinanceiro. Primeiro vínculo financeiro acrescenta metadado na mesma operação, preservando todo conteúdo e version cadastrais. Referência prévia de conta não congela base; movimentação efetiva congela. usoCadastros legado continua protegido e reconhecido.

**Rationale**: ler o cadastro via getAfter comprova ao mesmo tempo atividade, natureza e trava. Desenho separado de todos os controles aumenta acessos além do teto sem cache. A mudança é restrita, versionada e coordena mapeadores/CRUD/Rules; o cliente não escolhe liberar a trava.

**Alternatives considered**: Campo booleano livre, omitir prova remota, reconsultar coleções consumidoras, ou criar marcador em operação separada. Rejeitados por adulteração, impossibilidade de varredura nas Rules ou janela de inconsistência.

## R5 — Transações e orçamento

**Decision**: Preflight remoto separado lê cadastros e prepara somente os patches de primeiro uso necessários. Callback transacional lê recibo; para alteração, lê origem; para reversão, também original e marcador. Criar/gasto imediato não fazem leitura redundante de origem ausente: expectedVersion=0 e Rules de create garantem inexistência. Revalidar referências por getAfter no commit; preflight nunca autoriza a escrita.

**Rationale**: Evita gastar autorização de leitura de cada cadastro dentro da transação. Concorrência de primeiro uso entre preflight/commit causa rejeição integral; releitura/preflight e reenvio da mesma intenção após checar recibo recuperam sem duplicação. Não atualizar automaticamente expectedVersion da origem.

**Alternatives considered**: Ler todos os cadastros na transação ou pressupor cache. Rejeitados por orçamento. Acesso ready é explícito no match da origem; eventos/metadados só podem confirmar com transição recíproca dessa origem, mantendo own em todos os caminhos, sem multiplicar leitura do perfil em cada escrita auxiliar.

Preflight só coleta estados/erros: não pode bloquear recibo já confirmado por arquivamento posterior dos cadastros ou falha de leitura cadastral. Consultar recibo primeiro no callback e aplicar validação de referências atuais apenas se ele estiver ausente. Essa precedência preserva idempotência sem acessos transacionais adicionais.

O orçamento completo em contracts/security.md inclui no máximo 18 acessos e 8 por escrita. Contagens são limite superior de desenho; código final precisa manter o grafo de chamadas, validar <=1000 expressões e testar máximos. Não confundir 500 transformações por documento com limite universal de escritas.

Criação simples e substituição não compartilham um único perfil14: criarReceita/criarDespesa com origem antiga cancelada acrescenta uma validação e usa perfil15; gasto imediato substituto usa18. T041 implementa a extensão e T045 testa separadamente os ramos substitutos, inclusive cinco etiquetas e referências máximas.

## R6 — Reversão de erro e origem histórica

**Decision**: Reversão integral única por fato, comprovada por reversoesExternas/{eventoOriginalId}. Conta e data financeira vêm do original, sem escolha livre; instante técnico é atual. Em caixa, neutralizar original e inversão, mantendo ambos visíveis no histórico. Após qualquer liquidação histórica bloquear edição do conteúdo da origem; substituir explicitamente após reversão/cancelamento.

**Rationale**: Correção de erro não significa dinheiro devolvido posteriormente. O núcleo genérico continua representando reembolso/estorno econômico separadamente; adapter 005 não os habilita.

**Alternatives considered**: Somar inversão como nova entrada/saída econômica, alterar original, reversão parcial e transferência de fatos para origem corrigida. Rejeitados por falsos totais ou ampliação do escopo.

## R7 — Consistência dos totais mensais

**Decision**: Leitor REST limitado a runQuery e batchGet, com Firebase ID token atual e readTime comum. Obter T de uma consulta sentinela vazia/limitada sem dados privados adicionais; descartar resultados iniciais e executar todas as consultas reais com T explícito. Expirar cursor em 50 minutos, reler ao atualizar/mutar/voltar ao foco. Consultas usam somente passado recente suportado, sem habilitar PITR.

**Rationale**: Páginas SDK isoladas não garantem o mesmo snapshot. Revisão por usuário exigiria escrita compartilhada em toda mutação e aumentaria custo/contenda. readTime fornece visão consistente para páginas e hidratação pontual e não depende de modificar cada origem para fechar o mês. Rotular como posição na consulta, não fechamento contábil histórico.

**Alternatives considered**: Somar só primeira página, reler apenas versões dos documentos visíveis, contador global, baixar histórico inteiro. Os dois primeiros perdem inserções/movimentos concorrentes; os outros adicionam custo e acoplamento desnecessários.

**Boundary**: Nenhum token vai ao domínio, sessionStorage, URL ou log; fetch usa Authorization em memória, endpoint oficial fixo e UID atual. Se REST/readTime não puder ser validado no projeto real, consulta completa fica bloqueada, sem fallback que afirme total definitivo inconsistente. SDK continua para toda escrita.

## R8 — Sessão e testes existentes

**Decision**: Expor timezone validado do perfil na sessão, não repetir fuso fixo da tela de cadastros. Estender limpeza de descritores por UID/geração. Adicionar grupo externos (literal `externos`) em configuração, ambiente, preflight e clients, hoje especiais para cadastros. Manifesto aceita só novas coleções e schemas explicitamente validados.

**Rationale**: Somente adicionar arquivo de teste não fornece ADMIN/PENDING ao harness. Deixar token ou resposta de outra geração contaminaria consultas/retomadas. Cleanup usa escopo do manifesto e nunca exclusão de finanças pelo proprietário, negada pelas Rules.

**Alternatives considered**: Reutilizar limpeza genérica de coleção, fixtures reais, ou Admin SDK para provar autorização. Rejeitados pela constituição.

## Fontes e uso

Context7: resolve-library-id Firebase → /websites/firebase_google, reputação High; consultas sobre transação/Rules e snapshot pontual. Referências Standard/REST verificadas diretamente quando os trechos retornados misturavam Enterprise. Usar documentação compatível com o SDK instalado; nenhuma dependência foi atualizada.

- [Transações](https://firebase.google.com/docs/firestore/manage-data/transactions): leituras antes de escritas, repetição em conflito, falha offline e atomicidade.
- [Condições das Rules](https://firebase.google.com/docs/firestore/security/rules-conditions): getAfter, 10 acessos por operação e 20 em operações atômicas; desenho mantém tetos internos menores.
- [Autenticação REST](https://firebase.google.com/docs/firestore/use-rest-api): ID token Firebase submete chamadas às Security Rules; credenciais OAuth de serviço não serão usadas.
- [runQuery](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/runQuery) e [batchGet](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/batchGet): readTime e leituras pontuais no mesmo instante, com janela recente de uma hora sem extensão de recuperação.

Todas as decisões técnicas desconhecidas foram resolvidas no desenho; implementação e autorização de publicação permanecem etapas distintas.
