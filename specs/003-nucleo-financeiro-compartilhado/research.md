# Pesquisa: núcleo financeiro compartilhado

Data: 2026-10-17. Base: [spec.md](spec.md), constituição 1.2.0 e inspeção local. Pesquisa executada pelo agente principal e agentes de dinheiro/calendário e limites de persistência, conforme workflow da skill. Nenhum serviço ou dependência foi instalado.

## R1 — Escopo executável e dependências existentes

**Decision**: Implementar núcleo TypeScript puro e contratos consumidos pelos exemplos/testes desta feature; não implementar adaptadores Firestore financeiros, telas ou backend. Usar TypeScript ~6.0.2, Vitest 4.1.12 e configuração Node existentes. Reutilizar projeto único com `src/domain/finance/`, sem pacote/workspace novo.

**Rationale**: `package.json`, `tsconfig.app.json` e `vitest.config.ts` já oferecem tipagem estrita, ES2023 e testes locais. O SDK Firebase 13.0.0 e React já estão no aplicativo, mas não são dependências do núcleo. A exceção do serviço `trusted-api` na feature 002 é restrita a acesso/solicitações e não autoriza backend financeiro.

**Alternatives considered**: pacote financeiro publicável, monorepo novo, bibliotecas de dinheiro/datas e repositório CRUD genérico acrescentariam estrutura sem consumidor. Adaptadores para todas as entidades violariam FR-002.

Compatibilidade: `src/domain/subscription.ts` já valida datas gregorianas. Na implementação, preservar `calendarDate`/`validatePeriod` como wrappers do novo validador compartilhado e manter testes existentes; não deixar dois algoritmos financeiros de calendário independentes. Atualizar o README do domínio, atualmente desatualizado em relação aos módulos de sessão/assinatura existentes.

Inventário: engine declarada Node >=24.12.0; ambiente inspecionado Node 25.8.1, npm 11.18.0. Não atualizar dependências só por diferença entre requisito mínimo e runtime local. Git real em `develop`; setup retorna identificador lógico `003-nucleo-financeiro-compartilhado`. Não houve criação/troca de branch.

## R2 — Precisão monetária e apresentação

**Decision**: `Centavos` é `number` nominal validado de 0 a Number.MAX_SAFE_INTEGER; valores de fatos usam refinamento positivo. BigInt pode ser usado somente internamente para interpretar dígitos, quociente/resto e verificar cálculos antes de reconverter. Nunca transitar BigInt em DTO/JSON ou SDK. Validar limites após cada operação de negócio, inclusive intermediários; BigInt não autoriza ampliar a faixa do contrato.

**Rationale**: A faixa da especificação coincide com o inteiro seguro do ECMAScript. Converter centavos para reais por divisão decimal antes de formatar pode perder o último centavo no máximo. Formatar a sequência inteira: separar os dois últimos dígitos, completar zeros e agrupar a parte inteira. A apresentação canônica independe das variações de espaços do Intl.

**Alternatives considered**: decimal aproximado, `parseFloat`, arredondamento por parcela, `Intl.NumberFormat(valor/100)` como autoridade e BigInt nos documentos. Todos falham na precisão ou no contrato de intercâmbio solicitado.

Gramática após trim externo e prefixo opcional: `(?:[0-9]+|[0-9]{1,3}(?:\.[0-9]{3})+)(?:,[0-9]{1,2})?`. A validação ancora início/fim; prefixo `R$` pode ter zero ou um espaço comum/inseparável. Trim externo não remove espaços internos. `-0`, sinais, dígitos de outra escrita e valores fracionários de centavo são inválidos. `centavos(0)` é válido; `valorPositivo(0)` falha. Normalizar zero numérico para +0.

Decisão algorítmica própria: adição exige `b <= MAX-a`, subtração exige `b <= a`; multiplicação e divisão inteira podem usar BigInt interno. Quantidades são inteiros seguros não negativos, e quantidade de parcelas continua em 1–12. Não aceitar overflow intermediário compensado por subtração posterior. Diferenças são `{natureza, magnitudeCentavos}` e não números monetários negativos.

Fonte: [ECMAScript, Number.MAX_SAFE_INTEGER](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number.max_safe_integer). Para serialização, [BigInt e JSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt#use_within_json).

## R3 — Calendário sem UTC acidental

**Decision**: Analisar ano/mês/dia por posição, validar calendário gregoriano e trabalhar com números inteiros. Índice mensal = ano*12+(mês−1); aplicar deslocamento e reconstruir componentes. Rejeitar deslocamento não inteiro/seguro e saída fora de 1900–9999. Cronograma sempre parte da mesma âncora original, não da data já ajustada do mês anterior.

**Rationale**: Strings canônicas bastam para comparar datas. `Date` não é necessário para calendário; seu uso fica restrito à conversão de um instante recebido para o dia do perfil, por `Intl.DateTimeFormat` com `timeZone`, calendário gregoriano, numeração latina e `formatToParts`. Não analisar a string localizada de `format()`.

**Alternatives considered**: `new Date('YYYY-MM-DD')`, `toISOString().slice(0,10)`, `setMonth` e fuso do navegador não preservam o contrato civil/âncora. Biblioteca ou polyfill Temporal não se justifica neste escopo limitado.

Validar IANA: rejeitar offsets explícitos (`+01:00`, `-05:00`) antes de validar o nome com Intl; aceitar nomes reconhecidos pelo runtime, inclusive aliases IANA, mantendo entrada validada. Falta de suporte do runtime/fuso é erro explícito. Instante entra como epoch de milissegundos finito válido, nunca obtido por Date.now dentro da função. Testar America/Rio_Branco, UTC e Asia/Tokyo e casos de fronteira.

Fonte: [Intl.DateTimeFormat e timeZone](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat), [formatToParts](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/formatToParts).

## R4 — Fatos, projeções e correções

**Decision**: Implementar cálculos puros sobre snapshots completos validados. Dinheiro e calendário são módulos base; parcelas, sugestão de fatura, pendência, projeção e recorrência os consomem. Não criar estado de pagamento gravável nem total duplicado.

**Rationale**: As clarificações exigem estorno no mês de `dataEfeito` e competência de planejamento externa independente do vencimento. `competenciaOcorrencia` conserva identidade mesmo que o planejamento mude. Consumo usa origem uma vez; planejamento usa compromisso; caixa usa fato. Um estorno de compra parcelada é o evento de consumo; seus efeitos nas parcelas são referências de dívida, excluídas da soma de consumo.

**Alternatives considered**: campo `pago`, edição do total da fatura, somar compra com parcelas e atribuir pagamento parcial de fatura a compras sem rateio definido.

Refinamentos aprovados após análise U1/U2: estimado é atributo próprio de cada receita/obrigação avulsa de ocorrência; confirmar valor usa snapshot completo e versão esperada e não altera molde/outras ocorrências/caixa. Fatura é autoridade única do vencimento das parcelas de cartão, e toda cópia deve coincidir exatamente; divergência é erro de referência em criação, snapshot e prévia. Rejeitados herança dinâmica de estimativa e vencimentos independentes de parcela/fatura, que permitiriam modificar histórico ou divergir datas sem decisão explícita.

Reembolso é inversão de pagamento por devolução efetiva. A combinação reembolso+estorno avalia estado final atomicamente, sem aplicar entrada e redução duas vezes. Cancelamento sem estorno retira exigibilidade, mas não inventa redução de consumo: consumo só é reduzido pelo evento tipado de estorno, conforme FR-007/018. Migração sem data/total original gera indicador de informação incompleta; não apresenta consumo histórico como completo.

## R5 — Limites atuais e impossibilidade do desenho ingênuo

**Decision**: Manter adaptadores financeiros não habilitados nesta feature. Teto de domínio 12 parcelas, teto candidato 32 escritas e margens 8/18 são políticas, não promessa de persistência. Rejeitar comando que não tenha perfil operacional comprovado; ausência de perfil nunca significa orçamento zero.

**Rationale**: As Rules locais terminam em negação para finanças. `ready()` lê `users/{uid}`. Sem presumir cache, uma operação com N parcelas e N faturas novas tem W=2N+2 escritas (origem+parcelas+faturas+recibo). Só uma chamada de perfil por escrita dá A>=W; N=12 → 26, acima de 18 interno e 20 oficial. N<=8 é apenas limite aritmético desse desenho antes de referências, não quantidade persistível aprovada. Mesmo com faturas existentes, integridade/versões pode exigir atualizá-las e contabilizar essas escritas.

| Restrição oficial verificada em 2026-10-17 | Política inicial |
| --- | --- |
| Requisição 10 MiB; documento 1 MiB | Estimar no máximo 1 MiB/comando, 32 KiB/documento, incluindo margem técnica. |
| Transação 270 s, inatividade 60 s, deadline de lock 20 s | Falha/timeout não confirma sucesso; retomar mesma operação. |
| Rules 10 acessos/operação e 20/conjunto atômico | Tetos internos 8 e 18, sem depender de cache. |
| Rules até 1000 expressões/requisição | Contar caminhos de pior caso; orçamento documental não prova orçamento de expressões. |
| 500 transformações por documento/commit | Não interpretar como 500 parcelas ou teto universal de escritas. |

**Alternatives considered**: confiar em 500 escritas, desabilitar validação, Admin SDK no frontend, ampliar `trusted-api` ou gravar série em partes. Todos rejeitados. Protocolo multietapas só poderá existir por nova decisão explícita; esta feature escolhe rejeição integral.

Fontes primárias, edição Standard: [cotas](https://firebase.google.com/docs/firestore/quotas), [transações](https://firebase.google.com/docs/firestore/manage-data/transactions), [condições de Rules](https://firebase.google.com/docs/firestore/security/rules-conditions). Context7 resolveu `/websites/firebase_google`; trechos que apontavam Enterprise/Android foram confrontados com páginas Standard e não usados como garantia do adaptador web.

## R6 — Integridade agregada, concorrência e confirmação

**Decision**: Contratos exigem coordenação por versão do alvo: receita para recebimentos; obrigação avulsa/parcela externa para pagamentos próprios; fatura para parcelas de cartão e seus pagamentos; origem parcelada para edição do cronograma. Comando que toca vários agregados recebe todas as versões esperadas. Todos os escritores futuros precisam respeitar essas versões, inclusive alteração de itens de fatura.

**Rationale**: Transação que apenas consulta páginas de pagamentos não prova que não surgiu outro fato. Uma trava lógica de edição no alvo serializa comandos; é metadado, não total. Regras também precisam impor o protocolo e invariantes: cliente bem-comportado não é prova contra cliente adulterado.

**Alternatives considered**: last-write-wins, validar somente soma no cliente ou afirmar que versão do alvo prova automaticamente a ausência de pagamentos ocultos. Versão sozinha não prova a soma remota.

Limitação resolvida como fronteira de escopo: regras não oferecem consulta arbitrária para somar uma coleção de pagamentos/parcelas nem validação ilimitada de cronograma. Liberar um adaptador exigirá prova fechada por comando de referências, conjunto completo, soma e protocolo de versões dentro dos limites. Projeção financeira persistida ou canal confiável financeiro seria mudança explícita de desenho/escopo; não é introduzida aqui. Test double prova contrato local, nunca segurança Firestore.

Paginação: snapshots de cálculo devem ser completos e de revisão consistente; leituras futuras podem cercar a paginação por versão do agregado e reiniciar se ela mudar, desde que todos os escritores avancem o guard. Leitura mensal com vários agregados exige estratégia equivalente; se não comprovada, retorna incompleto sem total definitivo. Não fazer uma busca ilimitada para aparentar resolver completude.

## R7 — Identidades, idempotência e schema

**Decision**: IDs avulsos são UUID fornecidos pelo chamador; IDs naturais derivam de tuplas tipadas. Escolha de codificação: JSON compacto da tupla UTF-8 codificado em base64url, prefixado por versão `k1_`; cada componente tem validação e limite. Mantém unicidade reversível, sem depender de hash para identificar origem. IDs de operação incluem tipo+chave; UID é escopo do repositório e caminho, não um campo editável.

**Rationale**: Concatenação com hífen é ambígua. Tupla distingue compra de obrigação externa e preserva ordinal/competência. IDs avulsos têm até 64 caracteres alfanuméricos/hífen/underscore, IDs naturais até 512 bytes; gerar erro se exceder. Recibo guarda payload canônico limitado e imutável para comparar exatamente, além dos resultados, sem digest opaco como prova única.

**Alternatives considered**: nomes como chave, IDs aleatórios de parcelas a cada tentativa, hash sem comparação do conteúdo, remoção automática de recibos e campo financeiro para controle de concorrência.

Canonicalização: valores JSON validados, chaves de objetos ordenadas recursivamente, arrays ordenados preservados; conjuntos como etiquetas/referências de guard são normalizados por ID. Excluir metadados técnicos gerados na confirmação; incluir tipo, versão, valores, datas, IDs e versões esperadas. Proibir undefined, NaN, BigInt, sinais monetários e chaves inesperadas. Mesma chave e payload retorna recibo antes de avaliar versão desatualizada; mudança de intenção exige chave nova. `schemaVersion=1` é por entidade; nunca alterar versão do perfil para versionar finanças.

## R8 — Testes, observabilidade e não regressão

**Decision**: Testes Vitest adjacentes ao domínio, tabela de casos e loops determinísticos de fronteira; BigInt como oráculo de soma/divisão. Doubles finitos por caso de uso em arquivos de teste, com falha antes do commit e resposta perdida depois dele. Sem framework de banco em memória ou nova dependência de testes.

**Rationale**: Vitest já roda em Node e aceita filtro por caminho; execução não faz typecheck. Reutilizar scripts `test`, `typecheck`, `lint` e `build`. Núcleo não deve registrar payload financeiro, UID ou descrições em logs: erros discriminados retornam contexto mínimo ao chamador. Testes reportam caso, código de erro e contagens; observabilidade de rede pertence aos adaptadores futuros.

**Alternatives considered**: emuladores (vedados), testes de integração real sem adaptador, snapshots gigantes e fixtures gravadas no login.

Alvo de engenharia local: gerar/validar uma série de 12 em <50 ms p95 após aquecimento, em 1000 execuções no Node local, com resultado/ambiente registrados sem transformar variação de CI em falha financeira. Testes de correção, importação proibida, soma e ausência de efeitos parciais são gates; não prometer SLA de rede ou desempenho de Firestore.

Fonte: [Vitest, filtragem](https://vitest.dev/guide/filtering), [ambiente Node](https://vitest.dev/config/environment), [testes TypeScript e typecheck](https://vitest.dev/guide/testing-types). Context7 `/vitest-dev/vitest` confirmou filtro por substring do caminho, Node e separação entre transformar e verificar tipos.

## Resultado da pesquisa

Não há decisão de produto pendente. Todas as incógnitas técnicas foram resolvidas em escolhas explícitas ou fronteiras de entrega: valores e contratos implementáveis localmente; persistência financeira não habilitada até feature própria com prova completa. Essa fronteira aplica FR-002/031/033, sem dispensa constitucional. Fase 1 pode prosseguir sem alegar viabilidade remota comprovada.
