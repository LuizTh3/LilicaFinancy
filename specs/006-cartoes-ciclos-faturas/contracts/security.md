# Contract: Rules, consistência e orçamento

Este é contrato para implementação, não arquivo executável nem confirmação de regras publicadas. Preservar proteções002/004 e incremento005 atualmente habilitado. Não reaplicar diagnósticos antigos de corrupção já corrigida. Não ampliar catalog()/Colecao da004 para acomodar cartões.

## Superfície e autorização

Novos matches: users/{uid}/cartoes, faturas, operacoesCartoes e operacoesFaturas, com documentos descritos no [modelo](../data-model.md). Todos exigem own(uid). Leitura, inclusive get de documento ausente/recibo para retomada, exige perfil schema conhecido, timezone suportado, primeiro_login=false e auth_time posterior ao cutoff, conforme catalogReady. Admin não possui bypass.

- Cartões: get/list próprios; create/update somente pelos ramos de transição abaixo; delete sempre negado.
- Faturas: get/list próprios; create vazio válido; update exclusivamente ajuste de vencimento; delete negado.
- Eventos: get/list próprios com limite; create estritamente recíproco ao primário; update/delete negados.
- List exige limit inteiro1–50. Caminhos auxiliares construídos por enum/ID/competência no mesmo UID. Não aceitar collectionGroup global ou caminho fornecido pelo cliente.
- Compras, parcelas, itens, pagamentos e coleções não previstas continuam negados. Sem regra financeira global ou privilégio novo no backend002.

Recibos podem omitir leitura própria de perfil apenas na escrita create, pela prova recíproca obrigatória do primário. Leituras nunca delegam autorização a documento ausente.

## Grafo recíproco e invariantes

C=cartão; F=fatura; R=evento-recibo; H=titular. Usar resultado documental em let e passá-lo entre helpers, sem get/exists duplicado. As contagens abaixo não presumem cache.

### Primário C

- Forma fechada, ID/versão/instantes válidos e campos de negócio conforme modelo. Novo titular ativo do mesmo UID; exatamente o mesmo vínculo anterior pode conservar arquivado. Verificação usa getAfter(H), negando arquivamento/substituição concorrentes indevidos.
- getAfter(R) deve ter alvoId=self, tipo compatível, expectedVersion anterior, resultVersion posterior e comando/resultado exatamente correspondentes. ultimoEventoId=R.id. Em criação, expected0/result1 e estado ativo; edição exige ativo/revisão+1; arquivamento preserva todo conteúdo e só muda estado/metadados.
- createdAt/schema preservados; updatedAt=request.time; revisão segura sem overflow. Arquivado não admite edição/reativação/exclusão.

### Primário F

- ID exatamente cartaoId + '__' + competencia, datas gregorianas existentes, esquema fechado, versaoConteudo1. Sem total ou campo de ciclo/pagamento autoritativo.
- Criação: cartão pós-estado existe/ativo; snapshot dias/cartaoVersion corresponde; vincula getAfter(R) com expected0/result1 e conteúdo exato. Calcular datas esperadas, não aceitar datas livres só por estarem ordenadas.
- Verificar get de F(M±1) e F(M±2) no pré-estado, incluindo ausências. Só vizinho com snapshot válido preexistente fornece limite histórico: ±1 determina fronteiras compartilhadas e ±2 impede sobreposição. Se ausente antes, calcular pelo cartão pós-estado validado e exigir origem padrao, ainda que o vizinho seja criado no mesmo lote. Não usar getAfter dos vizinhos nem aceitar referências circulares entre faturas novas. Validar janelas mensais e exceção de coincidência conforme modelo; manter getAfter para cartão e recibo, que têm papéis distintos.
- Update: somente vencimento, version+1, ultimoEventoId e updatedAt podem mudar. R comprova antes exato, data nova/motivo e transição. Identidade/inicio/fechamento/calendarioOrigem/schema/versaoConteudo/createdAt preservados. Não precisa cartão ativo ou reler vizinhos, porque limites não mudam. Data nova do mesmo mês; igualdade só comprovada pelas âncoras preservadas.
- Nenhuma atualização cria itens; variante futura desconhecida é rejeitada. Dado incompatível preexistente bloqueia confirmação/ajuste, sem adoção ou correção silenciosa.

### Evento-recibo R

- Forma/tipo e ID `tipo__operationKey` exatos; conteúdo limitado por variante, revisão/instante válidos e create-only.
- getAfter(primário) aponta exatamente para R.id com resultVersion e dados resultantes correspondentes. R não admite alvo livre de outra coleção/UID nem payload extra. Primário confere `antes` contra resource.data e comando contra efeito; R confere a identidade do comando/resultado com o mesmo primário.
- Um primário válido inalterado nunca aponta para recibo novo inexistente: sua criação/transição exigiu esse recibo atomicamente, e ambos têm delete negado. Um recibo antigo tem resultVersion/ID fixos e não satisfaz outra revisão. Logo a autorização de R pode delegar ready à transição do primário, com uma chamada getAfter, sem confiar apenas em timestamps.
- Dois recibos diferentes não podem consumir o mesmo primário/revisão, pois só um deles pode ser ultimoEventoId. Um recibo não pode autorizar dois primários, pois alvoId/tipo são únicos e conferidos em ambos os lados.

## Prova de cobertura e concorrência de ciclos

Para F(M): mês(inicio) em M−2/M−1 e mês(fechamento) em M−1/M; intervalo positivo, fechamento≤vencimento de M. No pré-estado, F(M−1).fechamento=inicio e fechamento=F(M+1).inicio quando presentes. Além disso, F(M−2).fechamento≤inicio e fechamento≤F(M+2).inicio para vizinhos preexistentes. Distância≥3 é separada pelas próprias janelas mensais, sem varredura de coleção nas Rules.

Exemplo negativo obrigatório com calendários individualmente válidos: confirmar outubro/2026 sob30/31, com fechamento30/10 e vencimento31/10; deixar novembro ausente; mudar o cartão para25/5 e tentar dezembro com início25/10, fechamento25/11 e vencimento05/12. Checagem de distância2 nega a sobreposição. Em execução independente, confirmar primeiro dezembro sob25/5, mudar para30/31 e tentar outubro: também negar pelo mesmo motivo, não por data inválida.

Transação do cliente lê documentos ausentes dos quatro vizinhos para estabelecer conflito se uma confirmação concorrente surgir. As Rules ancoram limites somente no pré-estado desses vizinhos e no padrão pós-estado validado do cartão; não exigem leitura pré e pós duplicada do mesmo vizinho. Vizinhos preexistentes têm limites imutáveis e não podem ser excluídos. Se dois novos períodos adjacentes são criados no mesmo lote, ambos calculam sua fronteira comum pelo mesmo padrão do cartão, sem herança mútua. À distância2, intermediário antigo separa os ciclos por início<fechamento; se ele era ausente, ambos usam fronteiras-base consecutivas. Janelas mensais separam os demais períodos. Isso cobre o lote direto mesmo sem a restrição da aplicação de uma intenção por transação.

Ataque obrigatório de origem circular: sem outubro/novembro preexistentes e com cartão10/17, tentar lote criando outubro com início10/09, fechamento12/10, vencimento17/10 e novembro com início12/10, fechamento10/11, vencimento17/11, mais recibos correspondentes. Negar integralmente: a fronteira exigida é10/10 e nenhum novo documento pode ser origem vizinhoConfirmado. Controle positivo: o mesmo lote com fronteira10/10 e origens padrao deve aceitar, respeitadas demais invariantes/limites. Não presumir que lotes múltiplos são negados pelo orçamento.

## Orçamento conservador sem cache

Contagem inclui cada get transacional com sua própria consulta de perfil. resource/request.resource não fazem leitura adicional de documento. Custos de SDK para obter documentos e chamadas documentais internas às Rules são métricas diferentes; esta tabela soma só chamadas documentais de Rules em ambos os tipos de operação.

| Comando máximo | Leituras transacionais | Rules dessas leituras | Rules escritas primário + R | Total | Maior escrita |
| --- | --- | --- | --- | --- | --- |
| Criar/editar cartão com titular | R,C,H =3 | 3 | C:perfil+R+H=3; R:C=1 | 7 | 3 |
| Arquivar cartão | R,C =2 | 2 | C:perfil+R=2; R:C=1 | 5 | 2 |
| Confirmar fatura | R,F,C,F−2,F−1,F+1,F+2 =7 | 7 | F:perfil+getAfter(R)+getAfter(C)+4get(vizinhos)=7; R:getAfter(F)=1 | 15 | 7 |
| Ajustar vencimento | R,F =2 | 2 | F:perfil+R=2; R:F=1 | 5 | 2 |
| Recuperar recibo existente | R =1 | 1 | sem escritas | 1 | 0 |

Ramo semAlteracao/existente tem até as leituras do comando, sem escritas; não criar recibo fictício. Arquivamento não consulta titular. Leitura de cada referência tem uma autorização de perfil; não chamar ready/catalogReady várias vezes. Confirmar somente uma intenção; não empilhar dois comandos de15 numa transação. Limites internos00318/8 preservados; fonte oficial estabelece20/10. Dois documentos escritos por efeito; até32KiB/documento,16KiB de comando canônico e1MiB operacional. Perfis006 específicos, inicialmente validacaoRemotaPendente, não habilitam adaptador genérico de séries.

A substituição dos quatro getAfter por quatro get de vizinhos mantém15 acessos no comando da aplicação, sem consulta documental adicional. Um lote direto de duas faturas mais dois recibos soma16 acessos das escritas, sem as leituras transacionais da aplicação: cabe nos limites documentados e exige a prova de origem acima. Avaliar oficialmente os dois ramos (lote válido e origem circular) sem depender de cache, além do comando máximo individual.

Gates executáveis antes de habilitação: contagem real de ramos máximos sem duplicação de helper; compilação da fonte integral; avaliação oficial com mocks tipados e limite1000 expressões; execução cliente real positivo e negativa. Funções respeitam limites oficiais de profundidade/argumentos/let; delegar sem repetir validação de todo mapa no recibo. Redução de expressões não pode retirar invariantes, como verificado após o incidente real005 registrado em validation.md.

## Matriz mínima de ataques e falhas

- A/B/ADMIN/PENDING/visitante: get/list/create/update/delete diretos nas quatro coleções; admin financeiro alheio sempre negado.
- Campos extras/proibidos, tipos incorretos, trim/vazio/excesso, titular de outra coleção/UID/inexistente/arquivado em novo vínculo.
- Fatura com ID aleatório ou competência divergente, dois IDs para a mesma tupla, troca de cartão/competência, vencimento fora do mês, fechamento posterior e igualdade sem prova de clamp.
- Snapshot de dias/revisão inventados, origem de limite falsa, vizinho omitido, fronteira alterada, distância2 sobreposta e sequência retroativa/concorrente; lote com duas novas faturas herdando limite circular deve negar, enquanto o controle ancorado no padrão deve aceitar.
- Primário sem R, R sem primário, recibo antigo em nova revisão, dois R para uma revisão, mesmo operationKey com payload diferente, timestamps falsificados.
- Ajustar limite em vez de vencimento, alterar snapshot/createdAt, itens/total/pago em versaoConteudo1, schema futuro desconhecido e ajuste parcial de cópias simuladas.
- Arquivar com edição embutida, reativar/excluir, confirmar vazio após arquivar, formulário com cartão obsoleto; recuperar operação já confirmada após arquivamento deve continuar permitido.
- Perda de resposta após commit, cota/offline/conflito, logout durante await; não produzir falso sucesso ou novo efeito.

## Entregas e publicação

Implementação fornece firestore.rules completo, firestore.indexes.json completo e docs/firestore-rules-changes.md com coleções/permissões/invariantes/testes/limitações/publicação/reversão. Preservar regras e índices anteriores válidos; isentar mapas de recibos/calendários que não precisam de indexação. Não fazer deploy automático pelo plano.

Antes de eventual publicação autorizada: comparar fonte/índices ativos, guardar backup da revisão protegida, verificar documentos preexistentes nos caminhos autorizados, compilar/avaliar fonte completa e preparar rollback que bloqueie novas escritas006 sem expor dados ou invalidar leitura dos registros já criados. Não voltar ao modo global de teste. Coordenar schema/código/Rules. Gerado, compilado, publicado e validado são estados distintos a registrar.

Fontes oficiais consultadas2026-10-18: [Rules e getAfter](https://firebase.google.com/docs/firestore/security/rules-conditions), [limites](https://firebase.google.com/docs/firestore/quotas), [transações](https://firebase.google.com/docs/firestore/manage-data/transactions). Não há prova remota006 executada nesta fase.
