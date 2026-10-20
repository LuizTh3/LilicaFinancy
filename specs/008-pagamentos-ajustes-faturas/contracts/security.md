# Contract: Segurança e orçamento008

**Estado: ERROR para habilitação remota integral.** G0/G1 herdados permanecem; grafos abaixo são candidatos verificáveis, ainda sem avaliação de expressões ou teste remoto008. Nenhuma autorização de publicação é criada por este documento.

## Permissões e prova por transição

Privado ao UID com primeiro acesso concluído, perfil/schema suportados e login posterior ao cutoff; administrador não tem acesso especial. Leituras de documento ausente para recuperação também verificam perfil. Listas limitadas1–50. Documentos imutáveis create-only; controles update somente por transições tipadas; deletes negados. Campo desconhecido ou coleção não entregue negados. Validar dia local por request.time e timezone do perfil, não pelo relógio do navegador.

Nomenclatura: G=controleFatura; R=evento/recibo; J=controleItem; B=controlePagamento; A=conta; P=parcela original; O=compra; C=categoria; K=controleAjuste. IDs exatos construídos sob UID. `resource/request.resource` não contam como get. Mapas lidos uma vez por avaliação são passados a helpers; chamadas repetidas em outras escritas continuam contabilizadas sem cache presumido.

### G — autoridade da transição financeira

Verifica perfil1 e getAfter(R)1. Exige expectedVersion=antes, resultVersion=antes+1, último evento=R e todos os deltas exatos; R identifica esta fatura e tipo de transição. Recibo inclui resultado completo de campos financeiros/revisão, que G compara com antes/depois; imutáveis preservados. Não aceitar evento antigo, reset de histórico, soma negativa ou alteração independente. Para comandos de compra/calendário, ramo específico valida a prova recíproca006/007, não enum genérico aberto.

### R — prova dos efeitos

Create-only e forma fechada por tipo; getAfter(G) exige versão exata e último evento=este R. Pagamento confere conta ativa no pós-estado e capacidade B criada junto; reversão confere original e pós-B. Estorno confere item original e compra, pós-J e, se há dinheiro, original do pagamento, pós-B e conta destino. Valores por fatura são exatos; nada autoriza escrever uma segunda origem/fato não listado. Mesmo R não pode ser usado para duas versões ou dois controles não listados.

### J/B/K — capacidade limitada

Cada controle valida getAfter(R), tipo/IDs, sua versão anterior/resultante e o delta previsto para si; nenhum campo de identidade/base muda. Inicialização também exige primário/evento criador que o aponta exatamente, nos dois sentidos. Reutilizar recibo antigo falha porque expectedVersion não coincide mais com resource.version e o evento não pode ser substituído. Todos os efeitos que necessitem controle exigem seu pós-estado correspondente em R/primário. Não aceitar controle isolado ou fato que omita controle.

### Travas cadastrais

Novas contas/categorias exigem referências ativas e travas permanentes004. Primeiro uso patch preserva conteúdo cadastral, lê R ausente e getAfter(R) presente com papel exato; duas chamadas. R verifica cadastro pós-estado/trava. Concorrência de primeiro uso exige resolver recibo e repetir preflight da mesma intenção, sem trocar conteúdo/version esperada. Reversão histórica não exige conta ativa nem altera trava; reembolso exige conta destino ativa, mesmo que pagadora arquivada.

## Orçamento candidato mínimo, sem cache

Inclui reserva de autorização de cada tx.get (1 acesso ao perfil por documento neste desenho) além das chamadas por escrita. Preflight de referências imutáveis/cadastros é separado, com leitura autenticada; não autoriza commit, que revalida via Rules. Perfil real pode custar mais: a tradução deve contar todos os helpers e invalidar a tabela se houver acesso adicional. Os totais não são medições.

| Comando/ramo | Chamadas por escrita | Leituras transacionais e reserva | Total candidato |
| --- | --- | --- | --- |
| Pagamento com primeiro uso de conta | G2 + R3 + B1 + A2 | R,G:2 | 10 |
| Reversão integral | G2 + R3 + B1 | R,G,B:3 | 9 |
| Reembolso de um item/parcela e um pagamento, primeiro uso de conta | G2 + R7 + J1 + B1 + A2 | R,G,J,B:4 | 17 |
| Abatimento econômico de um item/parcela | G2 + R4 + J1 | R,G,J:3 | 10 |
| Reabrir/encerrar revisão | G3 + R1 | R,G,F:3 | 7 |

Pagamento R3 = G pós1 + A pós1 + B pós1. Reversão R3 = G pós1 + original1 + B pós1; conta/data herdadas. Reembolso R7 = G pós1 + J pós1 + B pós1 + originalPagamento1 + A pós1 + P1 + O1. Abatimento R4 = G pós1 + J pós1 + P1 + O1. Revisão G3 acrescenta calendárioF1 para comprovar fechamento; R1 confirma G pós. Recibo ausente e controles mutáveis são lidos na transação; original imutável pode ser lido antes, com revalidação de conteúdo/UID/tipo na regra do evento. Se cálculo do adaptador exigir tx.get adicional, incluir sua autorização no total; não esconder consulta.

O controle B é criado com todo pagamento, mesmo sem inversão; o R de pagamento exige B, evitando ramo sem capacidade. R/J devem comprovar valor corrigido, vínculo da parcela à revisão vigente e soma dos efeitos; O/P fornecem fontes, não snapshot enviado pelo cliente. Se forem precisos mais documentos para essa prova ou migração, o perfil perde sua elegibilidade candidata até nova contabilização.

Encargos, correção monetária/classificação e compensação acrescentam validação de categoria/trava e eventualmente K; **não têm perfil de acesso comprovado neste plano**. Incluir K para limitar compensação de qualquer ajuste que a ofereça também acrescenta escritas/acessos aos ramos acima. As tabelas mínimas só abrangem eventos sem compensação habilitada; não habilitar a funcionalidade completa por esses números. A prova final deve decidir e orçar o conjunto completo com K, sem dispensar o histórico/capacidade de compensação de FR-011. Essa pendência integra G2.

Múltiplos itens/pagamentos/faturas e inclusão tardia exigem listas explícitas de controles e primários afetados e verificação nas duas direções; adicionar custo por chamada e por escrita, inclusive perfis das leituras. Helpers por posição com teto definido, sem loops nas Rules. Não demonstrado dentro18/8 no estado atual. Um único reembolso candidato de17 não prova viabilidade de refund composto ou correções centrais. Rejeitar previamente excesso é válido para combinações excedentes, mas não declarar requisito entregue se nenhum caso central couber.

Todos os ramos precisam simultaneamente de ≤18 acessos totais/≤8 por operação, ≤32 mutações, ≤32KiB por documento, ≤1MiB por comando e ≤1000 expressões; manter margem interna e limite canônico16KiB. Contar validação de bytes, esquemas, datas, perfil, existência, controle e primeiro uso. Compilação aceita não mede expressões de execução. Positivos negados por orçamento ou negativos negados apenas por estouro não constituem prova de segurança.

## Matriz adversarial e critérios de saída

1. G sem R, R sem G, B/J/K sem primário, inversão sem capacidade, recibo antigo e dois fatos consumindo mesmo incremento.
2. Exigível forjado, delta não relacionado a item, histórico true→false, reembolso sem estorno ou estorno sem redução de dívida, ID/UID/fatura trocados.
3. Pagamento concorrente a compra/cancelamento/reabertura/ajuste/vencimento; 400+400 sobre600; duas inversões sobre mesmo original; devoluções ultrapassando valor corrigido.
4. Conta destino diferente válida; conta alheia/arquivada/inexistente inválida; primeira utilização com mudança cadastral embutida; categoria de natureza errada e cada etiqueta007 inválida.
5. Reversão parcial, data/conta alteradas, original já reembolsado; reembolso de reversão; compensação com caixa implícito; controle ausente ou schema antigo.
6. Compra tardia sem motivo, mesma compra contada por itens e ajuste, série parcial, cartão arquivado e alteração de pagamento anterior.
7. Perfil A/B/ADMIN/PENDING/visitante por SDK e REST; cursor de outro UID/generation, list ilimitada e operações extras no lote.

Saída dos gates: fonte integral com perfis concretos e chamada por helper, provas de inicialização/transição006/007/008, positivos mínimos e máximos aceitos, negativos recusados pelo motivo correto, reconstrução, bytes e expressões; depois publicação autorizada e matriz por cliente autenticado no projeto identificado. Até lá, availability/perfis008 permanecem desabilitados. Preservar todos os caminhos002/004/005 e cartões006 com regressão.

Implementação deverá entregar `firestore.rules`, `firestore.indexes.json` e `docs/firestore-rules-changes.md` completos, backup/reversão e relato gerado/publicado/verificado. Não modificar esses arquivos executáveis nesta fase documental.
