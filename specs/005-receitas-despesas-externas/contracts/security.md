# Contract: Transações, Rules e orçamento

## Pré-requisito e superfície

Restaurar firestore.rules completo: safeId e calendarDate contêm duplicações de blocos dentro das regex na base inspecionada. Não publicar esse arquivo para testar. Preservar perfil/primeiro_login/cutoff, administração restrita e coleções 002/004; comparar com contratos existentes e guardar backup antes da substituição. Este documento não é rules executável nem evidência de regras ativas.

Novos caminhos explicitamente permitidos: users/{uid}/lancamentosExternos, operacoesExternas e reversoesExternas. Todo match exige request.auth.uid==uid; nenhum bypass admin. Origem exige perfil schema conhecido, primeiro acesso concluído, auth_time posterior ao cutoff e timezone suportado. Read/get/list próprios também verificam perfil, inclusive documentos ausentes para retomada. List exige limit inteiro 1..50; marcador só get. Todos os deletes financeiros são negados. Fatos/eventos/marcadores são create-only.

Novas escritas auxiliares omitem leitura repetida do perfil somente quando sua regra prova transição obrigatória de origem que já executa ready. Isso é delegação por relação atômica comprovada, não concessão genérica: uma escrita auxiliar isolada não pode satisfazer as condições abaixo. Leituras nunca delegam autorização a documento ausente.

## Grafo de validação e prova indutiva

O=origem; R=evento/recibo; C=categoria; A=conta efetiva; H=titular; P=conta prevista; M=marcador de reversão. Caminhos construídos com enum/ID local no mesmo UID. Funções recebem mapas já lidos para evitar chamadas get repetidas. Nenhum get/exists duplicado para a mesma condição; orçamento não presume cache.

### Origem

- Esquema fechado, natureza/criação/proprietário imutáveis; createdAt preservado, version incremento unitário e updatedAt=request.time.
- getAfter(R) tem origemId=self, expectedVersion exatamente anterior (0 na criação), resultVersion exatamente posterior e comando correspondente ao conteúdo/transição real. ultimoEventoId=R.id. A comparação de antes em editar/cancelar é contra resource.data; depois corresponde ao resultado permitido.
- Criar: R tipo criar, liquidado=0 e jaLiquidada=false. Imediato: R fato pagamento integral, liquidado=valor e jaLiquidada=true. Receber/pagar: só controle/revisão muda, delta positivo exato, resultado <=valor. Reverter: delta negativo integral do original provado em R, nunca <0. Cancelar: liquidado zero, conteúdo preservado e motivo. Editar: ativa e jaLiquidada=false, controle permanece zero.
- Criação/edição valida C pós-estado, sua natureza, atividade quando novo vínculo, e trava permanente. Valida H/P existentes do mesmo UID e ativos quando vínculo novo, ou preservados se exatamente mesmos IDs/papéis. Em edição, R.antes é conferido pela origem e pode orientar exceções históricas nas validações delegadas das etiquetas.
- Substituição lê origem antiga e exige cancelada, mesma natureza/UID e ID diferente; ela não pode mudar depois de cancelada. Um vínculo não dá acesso ou permissão de reescrever a antiga.

### Evento/recibo

- ID=tipo__operationKey; fields/enum/conteúdo e limite validados. getAfter(O) exige origemId, natureza, ultimoEventoId=self e resultVersion/expectedVersion coerentes. Validar fato exatamente conforme tipo; fatos adicionais ou mapas extras negados.
- Recibo/fato existentes são imutáveis. Um R antigo não autoriza outra revisão de O: resultVersion é fixo e já foi consumido. Um O válido existente não pode apontar R inexistente: criação e cada transição exigiram R atomicamente, e ambos não podem ser excluídos. Portanto getAfter(O) basta no match de R, sem segundo get(O). Timestamp sozinho nunca prova esse vínculo.
- Criação/edição/imediato: conferir até cinco etiquetas, cada getAfter individual no UID. Todas existem, distintas, da coleção esperada e ativas se novas; em edição, preservadas podem estar arquivadas somente se R.antes (conferido por O) mantiver o mesmo ID/papel. Sem leitura livre de coleção ou caminho.
- Pagar/receber/imediato: getAfter(A) existe, é conta ativa, schema válido e tem usoFinanceiro imutável válido. Se primeiro uso, testemunha é este R. Não aceitar conta arquivada por ter sido prevista.
- Reverter: ler R original para conferir tipo inicial, origem, valor, conta e data; getAfter(M) aponta este evento e original. Sem revalidar atividade de conta histórica; sem tipos reembolso/crédito.

### Primeiro uso embutido C/A

- Permitir somente patch de schemaVersion 1→2 quando necessário e ausência→usoFinanceiro. Conteúdo/version/instantes cadastrais preservados. Criar patch em documento inexistente é negado.
- get(R) antes deve estar ausente e getAfter(R) presente com origem/ID/papel exatos: classificação aponta categoria em depois; movimentação aponta conta do fato inicial. R obriga O e O/R obrigam o pós-cadastro com a trava. Campos da trava estritamente definidos, createdAt=request.time.
- Como O/R validam atividade/natureza no pós-cadastro e o patch preserva conteúdo, não repetir get do próprio cadastro nas regras do patch; resource/request.resource já estão disponíveis.
- Trava existente nunca é alterada/removida/substituída, nem no CRUD, arquivamento, reversão ou cancelamento. Impedir mudança de tipo/base/natureza no mesmo lote que primeiro uso, mesmo se nome/versão forem forjados. Operação financeira não pode vir com atualização cadastral ordinária: ramos de patch exigem preservação exata; ramo ordinário continua exigindo seu recibo cadastral e respeita trava no antes/depois.
- Legado usoCadastros continua negado a escrita cliente e bloqueia campos sensíveis no CRUD. Alteração compatível das regras cadastrais deve continuar dentro do orçamento próprio; não remover proteção antiga para aceitar o novo schema.

### Marcador de reversão

M.id=originalId; origemId/originalId/reversaoEventoId tipados. get(R inverso) antes ausente, getAfter(R inverso) presente com originalId=M.id e origem correspondente. R valida original e exige M. Existência prévia de M só permite leitura para conflito, jamais update. Duas inversões de chaves diferentes disputam o mesmo create e uma falha atomicamente.

## Orçamento sem cache

semAlteracao é resultado somente de leitura com versão esperada atual, sem tentativa de escrita ou criação de evento/recibo. Não introduzir permissão de update vazio, evento sem transição ou exceção à reciprocidade O↔R para persistir esse resultado. Repetição revalida a versão; recuperação idempotente por recibo continua exclusiva de operações com efeito confirmado, conforme FR-016.

Contar cada chamada documental efetiva, inclusive autorizações das leituras dentro da transação. Preflight cadastral é separado, paginado/batch de no máximo oito gets, sem modificar dados; não é fonte de autorização. A tabela inclui todos os primeiros usos e opcionais diferentes. Se um campo estiver ausente ou cadastro já travado, custo diminui, não aumenta.

| Comando | Acessos de cada escrita | Reserva das leituras transacionais | Total máximo |
| --- | --- | --- | --- |
| Criar receita/despesa com 5 etiquetas e categoria inédita | O5 + R6 + C2 | R:1 | 14 |
| Criar receita/despesa substituta com 5 etiquetas e categoria inédita | O6 + R6 + C2 | R:1 | 15 |
| Gasto imediato, categoria/conta inéditas, H e P distinta de A | O5 + R7 + C2 + A2 | R:1 | 17 |
| Gasto imediato com substituição de origem cancelada | O6 + R7 + C2 + A2 | R:1 | 18 |
| Editar pendente com nova categoria e 5 etiquetas | O5 + R6 + C2 | R/O:2 | 15 |
| Editar pendente com substituiOrigemId histórico preservado | mesmo orçamento: não revalidar substituição imutável | R/O:2 | 15 |
| Receber/pagar com conta inédita | O2 + R2 + A2 | R/O:2 | 8 |
| Reverter | O2 + R3 + M2 | R/O/original/M:4 | 11 |
| Cancelar | O2 + R1 | R/O:2 | 5 |

O5 na criação/edição: perfil1 + C pós1 + H1 + P1 + R pós1. O6 acrescenta origem substituída1. R6: O pós1 + etiquetas5. R7 acrescenta A pós1. C2/A2: R antes1 + R pós1. O2: perfil1 + R pós1. R2 de liquidação: O pós1 + A pós1. R3 da reversão: O pós1 + original1 + M pós1. M2: R antes1 + R pós1.

Criar com substituição sem gasto imediato tem perfil próprio de 15 acessos, distinto dos 14 da criação simples e dos 18 do gasto imediato substituto. Testar tanto criarReceita quanto criarDespesa com substituiOrigemId e máximo de referências, conferindo antiga cancelada da mesma natureza/UID. Criação não faz tx.get(O): Rules de update não aceitam comandos de criação; origem que já existir recusa integralmente. Consulta extra redundante subiria o pior comando para 19 e é proibida. Não ler C/A/H/P/etiquetas dentro do callback do pior comando: preflight separado mais revalidação atômica nas Rules dá integridade, sem esses acessos transacionais adicionais.

Patches de primeiro uso usam update de campos protegidos, não set de snapshot cadastral obtido antes. Se outra operação já instalou a trava, patch de substituição é recusado: consultar R, refazer preflight e retomar a mesma intenção com revisão esperada original. Sem retry cego de permissão ou relaxamento do controle.

Teto por escrita <=8 (pior7), comando <=18, escritas <=4, bytes e expressões conforme plano. Esta é prova de desenho por grafo, a ser traduzida literalmente em helpers sem get oculto/repetido. Entrega final inclui inventário por ramo, tamanho da ruleset, contagem de expressões, casos máximos reais e negações; não declarar aprovação remota com doubles. Listas e batchGet de snapshot são requisições separadas com leitura ready por documento; batchGet até oito IDs.

## Integridade, datas e consultas

Calendário valida formato/existência gregoriana e competência, não regex isolada. valorCentavos inteiro seguro positivo, somas sem estouro, projeções em faixa. Perfil suportado America/Rio_Branco permite comparação não futura da data real com request.time em UTC−05; não aceitar offset enviado pelo cliente. Data de ocorrência não é data real de liquidação e tem regra própria de validade, sem proibir compromisso futuro por inferência.

Queda de conexão não confirma; consultas REST usam token Firebase, sem IAM administrativo. Get/list negados para outro UID/visitante/primeiro acesso pendente. readTime expirado, falha de índice ou autorização causa estado não completo e não fallback para cache como total definitivo.

## Matriz negativa obrigatória

1. O sem R; R sem O; R antigo para outra versão/origem; mesmo R tentando autorizar dois O.
2. Dois eventos de IDs diferentes no mesmo incremento; fato extra em variante sem liquidação; evento com delta/conta/data/natureza distintos da origem.
3. Forjar liquidado, jaLiquidada false após primeiro fato, resetar version, alterar natureza ou excluir documento/recibo.
4. Pagar 70+70 sobre100 em duas abas; pagar enquanto cancela/edita; valor acima da última pendência, zero/fracionário/negativo/inseguro.
5. Duas reversões/chaves sobre mesmo original, reversão de reversão, original de outro UID/origem e valor/conta/data alterados.
6. Cadastro arquivado ou alterado sensivelmente no mesmo lote; inserir/substituir/remover usoFinanceiro; mudar base/natureza no primeiro uso; forjar recibo cadastral para contornar trava.
7. Cada uma das cinco etiquetas inválida individualmente, IDs repetidos, holder/conta de coleção errada, arquivados novos e cruzamento de UID.
8. Mesmo token/timestamp reaproveitado sem nova revisão e operação; mesma chave com corpo distinto; origem existente em comando expected=0.
9. REST paginado/batchGet e SDK com A/B/visitante/ADMIN/PENDING; limite ausente/>50, schema extra/desconhecido, dados tardios após logout.

## Entregáveis de segurança na implementação

firestore.rules completo, firestore.indexes.json completo, docs/firestore-rules-changes.md com motivo/esquema/coleções/permissões/orçamentos/testes/reversão e situação de publicação. Backup anterior e implantação coordenada com versão cliente capaz de preservar schema2. Publicar somente sob autorização vigente; testes de autorização pelo SDK/REST com ID token, nunca Admin SDK como prova. Admin só pode ser usado em preparo/limpeza restrita explicitamente autorizados e inventariados.
