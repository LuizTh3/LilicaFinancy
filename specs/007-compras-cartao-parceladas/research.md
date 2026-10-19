# Research: Compras no cartão e parcelas

Data: 2026-10-18. Escopo: pesquisa documental/local, sem implantação, login, envio de Rules privadas ou alteração remota.

## 1. Base real e dependência006

**Decision**: Preservar stack existente e tratar faturas como dependência bloqueada G0.

**Rationale**: package.json fixa Firebase13/React19/Router7. A parte final de `specs/006-cartoes-ciclos-faturas/validation.md` registra cartões publicados/validados e falha oficial das gravações de faturas por1000 expressões. `firestore.rules` conserva allow false nas mutações de faturas/eventos; `availability.ts` confirma a indisponibilidade. Cabe resolver a avaliação mantendo as provas de calendário006 antes de integrar compras. Essa constatação usa evidência local, não releitura da fonte ativa nesta sessão.

**Alternatives considered**: Simples troca de flag; reutilizar perfil validado de cartões; assumir todo006 operacional. Rejeitadas: não provam autorização nem funcionamento de faturas.

## 2. Identidade e revisão de cronograma

**Decision**: Compra mantém ID estável e revisão de conteúdo. Edição financeira incrementa cronogramaRevision e cria novas parcelas com identidade (compra, revisão, ordinal). Revisões anteriores são imutáveis; exigibilidade é derivada da compra ativa/revisão vigente. Metadados sem alteração financeira incrementam apenas version, preservando revisão/IDs das parcelas.

**Rationale**: identity.ts/seriesDouble atuais tratam (origem,ordinal) como identidade única e não podem reutilizá-la em3→2→3. A revisão resolve colisão e preserva rastreabilidade. Histórico de compras fica em recibos separados, não array crescente na origem. Origem guarda somente IDs das parcelas correntes (até12), sem valor/categoria/vencimento duplicados.

**Alternatives considered**: Apagar/recriar mesmo ID; reativar posição cancelada; editar parcelas antigas. Rejeitadas por apagar contexto ou reciclar identidade. Histórico cresce por documentos, nunca por array de todas as revisões.

Harmonização explícita: ampliar helper003 com identidade de parcela de cartão versionada; preservar formato legado e testes das parcelas externas, sem migração automática. Fatura usa helper006 `faturaId(cartaoId,competencia)` (cartaoId__YYYY-MM), jamais a identidade genérica k1_ para a mesma tupla.

## 3. Calendário, pagamento e controles

**Decision**: Não persistir vencimento nas novas parcelas de cartão; resolver pelo snapshot da fatura. Manter revisão de calendário006 separada de controle de conteúdo/pagamento por fatura. Controle compartilhado serializa compras/alterações/futuro pagamento e possui marcador monotônico de histórico de pagamento.

**Rationale**: Fatura.version/histórico006 exige cadeia de eventos de calendário contígua. Incrementá-la por compra quebra a consulta existente. Cópia de vencimento exigiria atualizar número indeterminado de parcelas ao ajustar fatura. Controle separado não guarda total e não é autoridade financeira alternativa. Estado de ciclo é comparado com request.time no fuso suportado; o cliente não escolhe hoje.

**Alternatives considered**: Total/pago editável; inferir ausência de pagamento por coleção vazia; usar version006 para tudo. Rejeitadas por segurança, concorrência ou quebra de contrato. Controle faltante em fatura legada exige inicialização provada, não false implícito.

## 4. Atomicidade e idempotência

**Decision**: Recibo de operação de compra é imutável, recíproco e confirmado com todos os efeitos; intenção nasce fora do callback transacional. Ler recibo primeiro; repetir recupera o resultado; callback não muda estado de UI. Leituras precedem escritas e indisponibilidade mantém confirmação indeterminada.

**Rationale**: O SDK pode repetir callback; ausência local não comprova ausência remota. A mesma intenção é conservada no descritor privado de sessão após recarga, sem persistir payload do formulário ou token. Comparar comando canônico, não ordem incidental de mapas. Novo comando com mesmo conteúdo pode ser compra deliberadamente distinta.

**Alternatives considered**: Chave nova em retry, geração ao abrir mês e compra salva antes de parcelas. Rejeitadas por duplicação/série parcial. A escolha segue [transações oficiais](https://firebase.google.com/docs/firestore/manage-data/transactions) e [referência do SDK](https://github.com/firebase/firebase-js-sdk/blob/main/docs-devsite/firestore.md).

## 5. Orçamento e resultado de viabilidade

**Decision**: Desenho de referência com documentos separados, grafo recíproco e rejeição integral acima de orçamento; perfis007 naoHabilitado. ERROR G1: ainda não existe demonstração de parcelamento viável no grafo escolhido. A primeira implementação necessária é experimento de desenho/orçamento, não CRUD liberado.

**Rationale**: Limites internos003 são18/8,32 escritas,32KiB/documento e1MiB por comando. Limites oficiais de acesso são20 por conjunto atômico e10 por operação; expressões1000. Consulta de documento pode acionar leitura de perfil nas Rules e deve entrar no orçamento conservador. Cache eventual não é prova. Fontes: [condições das Rules](https://firebase.google.com/docs/firestore/security/rules-conditions) e [cotas Standard](https://firebase.google.com/docs/firestore/quotas).

A tabela em contracts/security.md demonstra custos do grafo de referência, não impossibilidade de todo desenho Firestore. Ela exige rejeitar máximos concretos. Um subtotal otimista publicado na003 de26 escritas para12 parcelas/12 faturas omite controles, histórico de calendário e validação: não é prova de capacidade. Nem aceitar1/1 isoladamente satisfaz o cadastro em várias parcelas.

**Alternatives considered**:

- Distribuir validação entre recibo/primários: escolhido como técnica a pesquisar, mas não elimina contagem total.
- Array limitado de cronograma dentro de uma compra: não equivale a array de toda vida financeira, mas alteraria fonte/modelo separados003; não adotado sem demonstração de integridade, consultas por fatura e harmonização explícita. Não alegar que é proibido ou que resolve orçamento por si só.
- Reduzir combinações aceitas: permitido por FR-015 após orçamento concreto; rejeitar tudo com N>=2 é bloqueio, não entrega de parcelamento.
- Cache, retirar validação de referências, lote em etapas, Functions/backend financeiro, mudar plano gratuito: rejeitados pelas garantias e escopo.

## 6. Consulta e interface

**Decision**: Total definitivo só após snapshot completo de itens, compras e referências no mesmo readTime; reutilizar padrão do leitor externo005 com allowlist007 separada. Ler todas as revisões candidatas de itens por fatura e resolver exigibilidade pela origem do mesmo snapshot. Não filtrar por estado persistido de parcela isoladamente.

**Rationale**: Revisões antigas não podem ser somadas; páginas de instantes diferentes podem produzir totais híbridos. Snapshot expirado exige reiniciar consulta, nunca acrescentar páginas atuais ao total antigo. Compra mostra cronograma vigente e histórico paginado; origem e fatura posterior em duas ações.

**Alternatives considered**: Somar só página visível; confiar em ausência de cursor; armazenar categoria livre na parcela; array de todas as compras da fatura. Rejeitadas por incompletude, dupla autoridade ou crescimento ilimitado.

## 7. Semântica de cancelamento e projeções

**Decision**: Cancelamento aqui corrige cadastro ainda não fechado/movimentado: compra cancelada e todas suas revisões têm exigibilidade zero, sem caixa. Na montagem de consumo corrente, excluir origem cancelada; histórico continua consultável. Não registrar estorno em outro mês como efeito implícito.

**Rationale**: projections.ts atual aceita estadoObrigacao mas ainda adiciona origem cancelada ao consumo. Essa integração precisa teste específico e harmonização de contrato, sem mudar silenciosamente semântica de estornos tipados003. Não entregar relatório completo de consumo neste incremento.

**Alternatives considered**: Reduzir só planejamento mantendo consumo corrente incorreto; apagar compra; criar estorno ou pagamento de valor zero. Rejeitadas por incoerência ou ampliação de escopo.

## Pendências técnicas resolvidas como gates explícitos

Não há pergunta funcional pendente. G0/G1 são falhas técnicas demonstradas do estado/desenho corrente, com critérios de saída no plano. G2/G3 são provas de implementação ainda não executadas. Nenhuma fonte007 foi compilada/publicada/testada no Firebase nesta fase.
