# Research: Recorrências mensais010

## 1. Inventário e dependências reais

**Decision**: Preservar os contratos existentes e implementar domínio/porta010 específicos, compartilhando funções neutras.

**Rationale**: package.json confirma TypeScript~6.0.2, React^19.2.8, Router7.18.4, Firebase13.0.0, Vite^8.3.0 e Vitest4.1.12. recurrence.ts da003 trabalha com molde schema1 mutável e receitas/obrigações externas; não representa revisão histórica, cartão ou supressão antes de materializar. calendar.ts:dataNaCompetencia já ajusta dia inexistente sem perder âncora. settlement.ts fornece cálculos, não habilitação remota.

externosRepository.ts só executa criarReceita/criarDespesa; operationBudget.ts nega os demais perfis. externosMapper.ts possui schema fechado, sem vínculo de recorrência. Nenhum adaptador de compra/item ou pagamento008 está habilitado; availability.ts e validation008 registram prontidão006, não007/008. O candidato009 também não está aprovado. Não depender de009 nem declarar essas operações prontas.

**Alternatives considered**: Acrescentar campos em documentos005 aceitos por mapper fechado; chamar criação005 e só depois vincular010; reutilizar aprovação006 como autorização para compras. Rejeitadas por incompatibilidade e efeitos órfãos.

## 2. Ocorrência como registro financeiro único

**Decision**: Uma ocorrência010 persistida é o registro financeiro de sua receita/despesa ou cobrança de assinatura. Mantém conteúdo financeiro próprio; revisões/exceções e eventos separados. Adaptadores convertem para os read models comuns. Em assinatura, a ocorrência representa a compra mensal e seu único item1/1, com identificadores lógicos distintos e vínculo de fatura, sem duplicar documentos de compra e item só para copiar campos.

**Rationale**: A compra mensal tem uma cobrança, não cronograma parcelado. Fonte física única permite provar reciprocidade com série/evento dentro do orçamento, em vez de compor ingenuamente005/007 com novas escritas010. Nenhum registro é também inserido em lancamentosExternos ou nas coleções de compra007. Lista externa, categorias, fatura e pagamentos devem incluir explicitamente o fluxo010; sem essa integração a feature não está entregue.

**Alternatives considered**: Reusar adaptador005 sem alteração; criar ocorrência e financeiro em duas transações; copiar occurrence+origem+compra+item+recibos. Rejeitadas. Migrar schemas005 não é necessário; introduzir schema010 fechado exige atualização coordenada de leitores e Rules. O efeito007/008 será contrato de leitura e elegibilidade de itens010, não migração silenciosa dos documentos anteriores.

## 3. Revisões com intervalo e preservação de reajustes

**Decision**: Revisões endereçadas pelo primeiro mês, com intervalo [inicioMes,fimExclusivo). Inserir maio em segmento janeiro–julho encurta janeiro até maio e cria maio–julho; julho fica intacto. Substituir conteúdo no mesmo limite conserva versão anterior no evento imutável. Intervalos iniciais e cada divisão são comprovados por transições recíprocas; nenhum cliente pode inventar segmento solto.

**Rationale**: Projeção de mês antigo escolhe revisão histórica válida; não consulta apenas padrão atual. A escolhaA de clarify preserva reajustes agendados. Exceções individuais prevalecem e não são reescritas pelo novo padrão.

**Alternatives considered**: Uma lista de revisões crescente em S; só versão atual; ordenar por timestamp e escolher última. Rejeitadas por crescimento, reescrita do passado e ausência de prova de vigência.

## 4. Conjunto completo de futuras: watermark monotônico

**Decision**: S.ultimoMesOcupado é o maior mês identificador de qualquer ocorrência/exceção já criada. Só aumenta, nunca é apagado; todas as escritas em O exigem transição recíproca de S. Revisão futura verifica cada mês canônico entre vigência e min(ultimoMesOcupado, mês anterior à próxima revisão), inclusive posições ausentes/protegidas. Intervalo vazio não tem O a reescrever. Intervalo acima12 meses ou orçamento efetivo excedido rejeita tudo.

**Rationale**: Consulta do cliente pode omitir alvos. Enumerar intervalo derivado de controle protegido permite Rules finitas conferirem exatamente o conjunto; não impõe teto total de ocorrências por série. Materializações/pulos/edições/finanças incrementam S.version, serializando corridas. Para cartão, a revisão também lê e fixa versões de fatura/controle, pois pagamento008 pode mudar elegibilidade sem mudar S.

**Alternatives considered**: Confiar em query seguida de S.version (não prova integralidade contra cliente malicioso); aplicar revisão só na leitura de persistidas (contradizFR-014/021); mapa de todas pendentes em S (crescimento/novo teto global); fracionar alteração automaticamente (proibido). Pesquisa delegada auditou as invariantes e confirmou a coerência lógica, sem afirmar orçamento executável.

**Tradeoff**: Watermark distante, inclusive de mês cancelado, pode tornar revisão de intervalo esparso inviável. Informar intervalo/limite e oferecer edição individual ou outra vigência explicitamente escolhida, sem anunciar que isso equivale ao pedido original. Não reduzir watermark nem compactar meses para caber.

## 5. Identidade, exceções e confirmação

**Decision**: seriesId novo de1–40 caracteres alfanuméricos/hífen; O.id=`r10-<serieId>-<YYYYMM>` (até51 caracteres), validado por concatenação e calendário. Revisão usa seriesId e YYYYMM. Compra lógica=`O.id`; item lógico=`O.id` no namespace de itens. Tipo+operationKey identifica recibo separado. Campos id/mes/série e natureza são imutáveis.

**Rationale**: Identidade não depende de fatura, data corrigida ou versão. identidadeNatural003 admite até512 caracteres, enquanto cadastros005 usam até64; não injetar a codificação003 em validadores incompatíveis. Namespaces distinguem os papéis; nenhuma colisão é resolvida sobrescrevendo origem anterior.

Pulo virtual cria O suprimida sem conteúdo financeiro, como tombstone. Cancelamento de O materializada conserva financeiro cancelado e história no próprio slot. Não existe segundo documento de exceção que possa conflitar com O. Geração e pulo disputam exatamente o mesmo caminho e S. Confirmar estimativa virtual materializa O com valor definitivo numa única confirmação.

## 6. Cartão e fatura

**Decision**: Criar cobrança somente com fatura já confirmada, elegível e identificada na prévia; fatura ausente devolve configuracaoPendente e ação explícita de preparar calendário pela006. Depois reler e conferir novamente. Não criar O/item antes disso. Nenhum comando010 desta versão cria nova fatura junto; eventual ramo futuro de composição precisa orçamento próprio.

**Rationale**: A composição ingênua de007 já chega18 acessos no caso mínimo com primeiro uso; juntar S/revisão/tombstone não cabe. Preparar fatura vazia pela006 não cria compromisso nem caixa; materialização010 continua atômica. Sugestão respeita fechamento exclusivo e snapshots, escolha explícita não contorna fatura protegida. Cobrança em fatura fechada permanece bloqueada, mesmo que vencimento ainda não tenha chegado.

**Alternatives considered**: Abrir/reabrir fatura para inserir cobrança; mover automaticamente a fatura; chamar criação007 sem prova. Rejeitadas. Fatura projetada virtual não é compra confirmada nem autorização de materializar.

## 7. Snapshot e projeção paginada

**Decision**: Novo leitor010 fechado com Firebase ID token, readTime fixo e TTL50min, sem ampliar leitor005. Por página selecionar séries estáveis e até12 meses; reconciliar todos os slots determinísticos e revisões necessários antes de emitir cada linha virtual. Dados de fatura e exceções usam mesmo snapshot. Saída até50 linhas, no máximo100 documentos físicos por ação; cursores guardam fase e pendências. Ao atingir limite retornar parcial, inclusive vazio com cursor; nunca gerar virtual a partir de ausência não confirmada.

**Rationale**: Prioridade persistida precisa provar ausência no mesmo instante, não ausência em uma página. IDs determinísticos permitem gets pontuais. Início do snapshot vem do servidor, inclusive resposta vazia; a primeira consulta deve ser refeita no readTime escolhido antes de combinar fluxos. Cache de sessão não prova ausência atual nem autoriza escrita.

**Alternatives considered**: Baixar todo histórico; consultas em instantes misturados; inventar virtual enquanto páginas financeiras faltam; token administrativo. Rejeitadas.

## 8. Evidência e documentação atual

Skill Context7 aplicada: resolve Firebase selecionou /websites/firebase_google. Três consultas separadas: regras/atomicidade, transações web, REST/snapshot. Documentação Standard/REST sustenta:

- [Transações web](https://firebase.google.com/docs/firestore/manage-data/transactions): leituras antes das escritas, callback pode repetir, falha offline, confirmação integral. Não gerar IDs/toasts/estado no callback.
- [RunQuery](https://firebase.google.com/docs/firestore/reference/rpc/google.firestore.v1): readTime em microssegundos na última hora sem PITR; retorno vazio contém readTime.
- [Autorização REST](https://firebase.google.com/docs/firestore/use-rest-api): Firebase ID token usa Rules; token de serviço usa IAM e não comprova autorização cliente.
- [Condições de Rules](https://firebase.google.com/docs/firestore/security/rules-conditions) e [limites](https://firebase.google.com/docs/firestore/quotas): referências para avaliação antes da implementação.

A consulta de limites retornou também páginas Enterprise. Não usar esses trechos para alterar limites Standard ou declarar capacidade. Tetos internos18/8/1000 e bytes são herdados da003; precisam comprovação concreta por ramo. Contagens em contracts/security.md são orçamento de desenho, não compilação/avaliação. Documentação antiga de agregação que menciona uma escrita/segundo não é adotada como limite oficial atual.

## Resultado da pesquisa

Escolhas e desconhecidos arquiteturais resolvidos documentalmente; nenhuma dúvida funcional pendente. A implementação precisa construir Rules candidatas completas e provar casos mínimos e limites antes de habilitar. Ausência de teste não é falha técnica inventada; caso mínimo que reprovar torna o gate ERROR e exige redesenho. Sem publicação, execução remota, emulador, nova biblioteca ou alteração financeira nesta fase.

### Conferência Standard complementar

Após os resultados Enterprise do Context7, foram abertas diretamente as páginas oficiais Standard de condições e quotas acima. Confirmam getAfter para efeitos conjuntos, limites oficiais10 por operação/20 por conjunto e1000 expressões. O projeto continua com tetos internos mais conservadores18/8, sem presumir cache. Essa conferência resolve a origem documental dos parâmetros, sem compilar/avaliar o desenho010.

## Execução T001/T004 — conferência contra contratos008

Inventário confirmado em2026-10-20: operationBudget.ts só habilita criarReceita/criarDespesa005 e operações de cartão/calendário006; availability.ts não prova compras/pagamentos. recurrence.ts continua molde schema1 externo sem revisões/cartão/tombstone. Não existem coleções010 nas Rules de produção e não há dependência executável de009 nesta fase.

A inspeção de specs/008-pagamentos-ajustes-faturas/data-model.md corrigiu uma premissa do plano: F é calendário, enquanto possuiHistoricoPagamento, líquido, exigível e revisão financeira são autoridade de controlesFaturas(G), schema2. Todo item precisa de controlesItensFaturas(J), com capacidade/categoria/último evento. Novo item e delta de G precisam confirmar juntos. A própria security008 mantém habilitação integral em ERROR; não há ramo010 de G/J implementado.

Decisão técnica desta execução: rejeitar a composição direta do desenho atual antes de gerar candidato. S/O/R010 mais G/J008 e suas leituras resultam21 acessos no caso básico sem opcionais/primeiro uso. O primeiro uso acrescenta3, chegando24. Isso é cálculo documental conservador do grafo descrito, não avaliação oficial nem impossibilidade de qualquer redesenho.

Alternativas rejeitadas: ler apenas F e inferir ausência de pagamento, omitir J/G, gravar item e depois atualizar saldo, considerar compras prontas por006, retirar controles para alcançar18. Próximo trabalho técnico é redesenhar a transição compartilhada010/008 e completar todos os perfis; somente depois retomar T005. Nenhuma fonte candidata010, regra ativa ou dado financeiro foi alterado.

## Retomada: decisão corrigida prevalente

O erro21 foi resolvido no orçamento documental incorporando capacidadeJ em O e mantendoG obrigatório.26 grafos novos e10 testes passam; fonte completa e327 casos construídos. calendarioVersion impede replay006 e inicialização requerF pré/pós idêntica. Ver remediation.md, data-model.md e contracts/security.md atualizados; referências anteriores a ERROR21 são históricas do layout descartado. T007 permanece pendente de autorização específica de envio/avaliação. Nenhuma fonte ativa ou dado financeiro alterado.

