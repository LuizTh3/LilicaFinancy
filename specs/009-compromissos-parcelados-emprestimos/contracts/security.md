# Contract: Segurança, atomicidade e orçamento 009

**Estado: desenho documental revalidado; prova executável e habilitação pendentes de T005–T007.** O grafo anterior, com origem/evento por parcela, foi descartado. O novo orçamento é candidato verificável e não prova Rules compiladas, número de expressões ou teste remoto. Nenhuma escrita 009 está habilitada por este documento.

## Grafo finito

S=série com mapa fixo de até 12 obrigações; R=evento/recibo imutável. Substituição usa S_antiga, S_nova e um R. Pagamentos e histórico não ficam em arrays da série. Fatos de pagamento/reversão usam R, sem duplicação em operacoesExternas. Campo de perfil/primeiro acesso é validado na criação obrigatória de R, e nas leituras de cada caminho, não repetido em cada posição.

Toda escrita exige own(uid). S exige getAfter(R) com ID, tipo, alvos, revisão e patch exatos. R é create-only e exige getAfter de cada S resultante, validando o perfil e schemas. Em update, S.version=resource.version+1 e R.expectedVersion=resource.version; criação exige versão 1 e alvo novo. Essa reciprocidade impede usar R antigo, criar R solto ou mutar S sem R. Delegação de ready para R só é válida porque nenhuma escrita auxiliar pode existir sem um R novo válido. Não delegar propriedade a campo fornecido pelo cliente. Leituras, inclusive de recibo ausente, continuam exigindo próprio UID e ready.

Cada entrada é validada localmente em helpers finitos para chaves p01..p12. Não há getAfter por posição: todas estão em request.resource/resource. Comprovar exatamente chaves P..N, identidade, tipo, calendário, valores e soma segura; não aceitar lista incompleta, posição anterior, extra ou saldo arbitrário. Para divisão, q/r inteiros comprovam q*count+r=total e valores das posições. Preservar mapa não alvo com diff/affectedKeys e comparação dos campos imutáveis. Mudanças de valor/data jamais alteram controle de pagamentos.

## Distribuição das validações

- S valida referências de categoria, titular e conta prevista novas/substituídas, até uma de cada por comando; referências conservadas no mesmo papel não exigem nova checagem de ativo. Patch comum de referências em edição em lote não altera as demais posições ou valores/datas individuais.
- R valida perfil e até cinco etiquetas novas distintas por patch comum, além das séries resultantes. Referências históricas inalteradas são provadas pelo diff do mapa, não reconsultadas por posição. Etiquetas pertencem ao mesmo UID e estão ativas ao novo vínculo.
- Primeiro uso de categoria cria patch protegido no mesmo commit com get/getAfter de R, demonstrando antes ausente e depois presente; conserva campos e natureza. O adaptador lê categoria quando precisa decidir o patch e Rules verificam categoria no pós-estado. Conta prevista não é primeiro uso de conta efetiva: seguir a distinção já existente em financialUsePatch da 004/005. Primeiro uso da conta efetiva é tratado no pagamento.
- Recibo só valida alvos pós-estado; série valida sua transição pré/pós e comando correspondente. Não repetir integralmente o validador de S dentro do de R; equivalência é por campos fechados/patch exato/revisão, sem hash livre.
- Em substituição, S_antiga só cancela posições explícitas com líquido zero; S_nova é criação. R exige ambas, a mesma intenção e referências recíprocas; não recebe pagamentos/receita da anterior. Uma série quitada ou parcial real não pode ser reescrita. A anterior existe antes e o vínculo da nova é imutável, impedindo ciclo sem varrer ancestralidade.

## Orçamento documental sem cache

Tetos internos vigentes: 18 acessos totais, 8 por escrita, 32 mutações, 32 KiB por documento, 1 MiB por comando, até 1000 expressões. Nenhum aumento ou geração multietapas. Contar autorizações das leituras transacionais conservadoramente, separadas das chamadas get/getAfter internas; preflight fora da transação não autoriza escrita e revalidação remota é obrigatória.

H/P=0 ou 1 para titular/conta prevista novos; L=0..5 novas etiquetas; K=0 ou 1 para primeiro uso da categoria. Categoria referenciada em criação/patch de classificação custa uma consulta. Perfis máximos abaixo usam H=P=1,L=5,K=1. N/P não aumentam acessos documentais, mas aumentam tamanho/expressões e precisam avaliação concreta.

| Comando | Validação por escrita | Autorizações de leituras transacionais | Total máximo | Mutações máximas |
| --- | --- | --- | --- | --- |
| Criar, inclusive 5/10 ou 12 posições | S:1R+1categoria+H+P=4; R:1perfil+1S+L=7; categoria:2K | R:1; categoria:K | 15 | 3 |
| Editar elegíveis | S:até4; R:até7; categoria:2K | R:1; S:1; categoria:K | 16 | 3 |
| Cancelar até12 | S:1R; R:1perfil+1S=2 | R:1; S:1 | 5 | 2 |
| Substituir até12 antigas por até12 novas | S_antiga:1R; S_nova:até4; R:1perfil+2S+L=8; categoria:2K | R:1; S_antiga:1; categoria:K | 18 | 4 |
| Pagar uma parcela | S:1R+1conta=2; R:1perfil+1S=2; primeiro uso conta:até2 | R,S,conta:1 cada | 9 | 3 |
| Reverter pagamento | S:1R+1original+1marcador=3; R:1perfil+1S+1original=3; marcador:1R | R,S,original,marcador:1 cada | 11 | 3 |
| Vincular receita | S:1R; vínculo:1R; R:1perfil+1S+1vínculo+1receita=4 | R,S,vínculo,receita:1 cada | 10 | 3 |

Fórmulas: criar=5+H+P+L+3K; editar=6+H+P+L+3K; substituir=8+H+P+L+3K. Criar sem opcionais/K custa5; substituição mínima sem opcionais/K custa8, em vez de20 no grafo descartado. A versão máxima com opcionais/primeiro uso chega exatamente a18 na substituição: nenhuma consulta extra cabe nesse perfil sem novo orçamento. Ler S_nova antes de criar acrescentaria custo desnecessário: a regra create e a exclusividade do ID comprovam inexistência; se adaptador optar por fazê-lo, o perfil máximo deve ser reavaliado/rejeitado.

A implementação deve manter o grafo exato das leituras declaradas. Ler outros cadastros na transação ou acrescentar controles exige atualizar a tabela e rejeitar excedentes. O mapa finite resolve fanout documental; não dispensa medir expressões por branch, total compilado, datas e tamanhos com máximo de campos. Recibo guarda patches limitados, não snapshots duplicados sem orçamento. Se 32 KiB/1000 expressões impedirem um comando, rejeitar antes da escrita e não declarar suporte irrestrito.

## Pagamento, reversão e vínculo

Pagamento modifica apenas uma entrada, preserva identidade/conteúdo das outras e incrementa a versão global; líquido aumenta exatamente o valor do fato e não excede valor ativo. jaLiquidada torna-se true; nunca retorna a false. Conta efetiva ativa e data real não futura são verificadas; primeiro uso de conta é patch recíproco ao R de fato.

Reversão exige fato original confirmado do mesmo UID/série/ordinal, valor integral, conta/data herdadas e marcador novo de chave originalEventoId. S exige marcador pós-estado e original; R exige original e efeito exato; marcador exige R correspondente. Não aceitar marcador previamente existente, reutilizar reversão ou inverter inversão. Data original permite corrigir caixa no mês original sem devolução fictícia.

Vínculo receita é 0..1 por série e por receita conforme FR-011. S não pode substituir receitaVinculadaId existente; documento de vínculo por receita é create-only. R valida receita existente da natureza receita e mesma propriedade; nada cria recebimento. Vínculo falho não desfaz receita explicitamente criada antes. Ausência de campos no cadastro de série proíbe entrada inferida.

## Recuperação e autorização

Criar nova intenção somente antes do primeiro envio; repetir comando confirmado consulta R pelo mesmo conteúdo e retorna IDs/versões originais. Conflito de versão do agregado exige nova prévia, inclusive pagamento concorrente de outra parcela. Sem alteração segue a exceção explícita de FR-018: sem escrita/recibo, intenção encerrada e eventual repetição reavalia versão atual.

Leituras get/list próprias exigem perfil pronto; admin sem propriedade não acessa dados. List paginada deve permitir apenas recorte/limit e caminho privado; nenhuma regra concede leitura financeira a terceiros. Delete negado em S/R/vínculos/marcadores. Fatos e recibos imutáveis; unknown schema/tipo/campos falham fechados. Não alterar schemas nem permissões das coleções avulsas 005.

## Prova antes de habilitar

T005 traduz este grafo em Rules completas candidatas; T006 cria casos oficiais; T007 mede/avalia orçamento, expressões e invariantes, sem publicação automática. Manter a prova executável de G1/G2 PENDENTE até evidência concreta; a aprovação documental do desenho não é PASS remoto.

Casos indispensáveis: 5/10, N12, substituição mínima e máxima com opcionais; primeira categoria/conta; recibo sem série e série sem recibo; slot extra/omitido e alteração em protegida; atualização de competencias divergente; hash/versão/saldo forjado; R antigo; transações com referência arquivada, acesso A/B/visitante/admin/pendente; marcador de reversão duplicado; segundo vínculo em qualquer ponta; máximo monetário, calendário, tamanhos e expressão excedidos. Testar leituras/query e projeção após expansão do mapa.

Fontes consultadas via Context7: [getAfter e acessos](https://firebase.google.com/docs/firestore/security/rules-conditions), [diff e validação de campos](https://firebase.google.com/docs/firestore/security/rules-fields), [transações](https://firebase.google.com/docs/firestore/manage-data/transactions). São suporte às primitivas, não certificação deste desenho. Entrega futura exige firestore.rules completo, índices completos e nota/rollback; nenhuma publicação ou teste remoto ocorreu nesta correção documental.


## Formas de consulta e limites do enforcement

| Uso | Consulta da porta/leitor |
| --- | --- |
| Mês de planejamento | seriesParceladas com competencias array-contains YYYY-MM, orderBy __name__, limit1–50; filtro remoto tipo opcional com índice correspondente |
| Detalhe | Get de S próprio e dos IDs privados de referências; eventos por seriesIds array-contains serieId, orderBy createdAt/__name__, limit1–50 |
| Caixa | operacoesParceladas por fato.tipo pagamento ou reversaoPagamento, intervalo fechado/aberto de fato.dataEfetiva, orderBy dataEfetiva/__name__, limit1–50 por fluxo |
| Recuperação | Get do R exato tipo__operationKey, incluindo resultado de ausência; nunca lista de todos os recibos para descobrir intenção |
| Vínculo/reversão | Gets privados por receitaId/originalEventoId exatos, sem varredura |

O leitor valida combinações de campos/filtros/cursores e rejeita caminho/coleção arbitrários. As Rules garantem propriedade/perfil em get e list e request.query.limit1–50 nas listas; negar collection-group/global. Não prometer introspecção genérica de filtros em request.query.where: o contrato de consulta é implementado no leitor e índices, enquanto privacidade não depende de sua obediência. Quando uma condição dependente de dados for usada na regra, a consulta deverá prová-la segundo o mecanismo de autorização de queries do Firestore.

Na criação, validar que todas as posições têm as mesmas referências comuns do comando. Não aceitar12 categorias novas distintas usando a contagem de uma referência; values/dates/competencias explícitos continuam individuais. Na edição, referências inalteradas são preservadas pelo diff; patch de referência nova é comum às elegíveis. Não inserir gets adicionais por slot.

Casos de leitura da provaT006/T007: mês vazio com readTime; cursor expirado/de outro UID/filtro; duas páginas físicas sem resultados após filtro; corte no meio de uma série; duas séries com mesma data; fluxo de caixa incompleto; histórico com timestamp empatado, revisão omitida/duplicada e substituição participando de duas cadeias. Primitivas de snapshot fixo usam ID token Firebase sujeito a Rules; não é exceção administrativa.

## Candidato e prova pendente

Candidato completo gerado por scripts/build-parcelados-rules.mjs e134 casos por scripts/build-parcelados-rules-cases.mjs. Contrato de payload concreto e comandos de avaliação em validation.md. Verificações locais não compilam Rules; T007 não recebeu resultado oficial porque o envio à API foi rejeitado pelo auto-review até autorização explícita para fonte interna/destino/sessão operacional. Novos prefixes de usoFinanceiro exigem compatibilidade dos leitores de cadastros antes do rollout, sem mudar schemas avulsos. Não considerar T005 integralmente comprovada por existir fonte gerada.

