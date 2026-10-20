# Research: Pagamentos e ajustes de faturas

**Data**: 2026-10-19. Pesquisa documental/local; nenhuma avaliação oficial, publicação ou mutação financeira executada. Pesquisa paralela somente leitura conforme a skill speckit-plan.

## 1. Base existente e viabilidade

**Decision**: reutilizar domínio e infraestrutura atuais, mantendo gravações008 desabilitadas até fechar os gates herdados e próprios.

**Rationale**: `src/domain/finance/settlement.ts` já calcula pendência e rejeita excesso, mas `src/features/cartoes/availability.ts` mantém faturas indisponíveis. `firestore.rules` nega mutações de faturas. `specs/006-cartoes-ciclos-faturas/validation.md` registra falha oficial acima de 1000 expressões; `specs/007-compras-cartao-parceladas/validation.md` mantém avaliação do conserto e prova de parcelamento pendentes. Só cartões006 e criação externa005 têm perfis remotos aprovados em `operationBudget.ts`.

**Alternatives considered**: habilitar por flag, usar conta administrativa ou ampliar o backend restrito002. Rejeitadas: não provam segurança e excedem autorização/constituição. O desenho abaixo é referência para prova, não alegação de viabilidade integral.

## 2. Liquidação comum e fatos imutáveis

**Decision**: especializar a porta compartilhada de liquidações com comandos008 tipados, mantendo os contratos externos005. O evento/recibo008 contém os fatos limitados daquele comando; não criar uma segunda coleção autoritativa de pagamentos idênticos.

**Rationale**: segue o padrão concreto `externosRepository.ts`/`operacoesExternas`, reduz reciprocidade entre documentos e mantém identidade única por fato. A leitura converte evento em fato do núcleo com ID determinístico. Pagamento tem alvo fatura; parcela nunca recebe pagamento direto.

**Alternatives considered**: fato e recibo duplicados em coleções independentes; pago editável por parcela. Ambos ampliam riscos de divergência e dupla contagem.

## 3. Controle derivado e inicialização

**Decision**: evoluir `controlesFaturas`007 para schema2 com exigível/liquidado derivados, revisão explícita e marcador monotônico de histórico. Adicionar controles limitados por item e por pagamento. Cada delta exige evento recíproco e revisão exata; fatos continuam autoridade e controles são reconstruíveis.

**Rationale**: Rules não percorrem todo histórico para limitar um novo pagamento. É necessária prova indutiva de inicialização e de todas as transições que alteram itens. A 007 atualmente proíbe total/saldo no controle; a mudança é harmonização explícita, não funcionalidade já disponível.

**Alternatives considered**: somar páginas do cliente como autorização; iniciar controle legado com saldo enviado pelo formulário; agregar só pagamentos sem coordenar compras. Rejeitadas porque omissão, concorrência e cliente malicioso quebram os limites. Legado sem controle008 bloqueia escrita até migração comprovada e separadamente executada; não presumir histórico vazio.

## 4. Erro, devolução e três bases temporais

**Decision**: reversão de erro integral conserva conta/data originais; devolução real usa conta de destino e data recebida explícitas. Ajuste de erro corrige consumo no mês original; estorno econômico reduz consumo no mês de efeito. Inclusão tardia é compra nova identificada como correção, contada uma única vez pelos seus itens.

**Rationale**: decisões A/A de 19/10 na spec e contratos003/005. `validarFatos` atual força conta da inversão igual à original e aceita data posterior/reversão parcial: precisa discriminação por tipo antes de reutilização remota. `projections.ts` não possui a representação de erro/classificação necessária. Não alterar genericamente sem regressão005.

**Alternatives considered**: todo ajuste no mês atual; reembolso como receita; alterar a data/conta do pagamento original. Rejeitadas por contradizer decisões e inventar caixa/consumo. A data de registro técnico permanece atual, ainda que a correção econômica atinja mês anterior.

## 5. Revisão de fatura e inclusão tardia

**Decision**: overlay persistido de revisão, independente do calendário006; só reabrir sem qualquer histórico. Encerrar restaura fechado. Pagamento durante revisão é negado. Inclusão tardia em fatura movimentada é variante explícita do comando de compra007 e exige motivo/prévia em todos os destinos.

**Rationale**: `cicloFatura` atual deriva apenas das datas e fechar novamente numa recarga inutilizaria a revisão. A variante tardia não modifica parcelas antigas nem libera CRUD comum. Cartão arquivado continua impedindo compra nova; cronograma inteiro confirma junto.

**Alternatives considered**: alterar fechamento histórico, limpar marcador após reversão, repartir compra em commits independentes. Rejeitadas por perda de histórico ou séries incompletas.

## 6. Atomicidade, orçamento e recuperação

**Decision**: IDs/intenção antes do envio; callback transacional sem efeitos de UI; leitura de recibo antes de validar referências atuais para recuperar operação já confirmada. Depois de recibo ausente, exigir versões esperadas, leituras antes das escritas e validação do estado final conjunto. Sem confirmação remota, retornar indeterminado e repetir mesma intenção.

**Rationale**: a documentação oficial confirma repetição automática, falha offline e atomicidade. Reexecução do callback não autoriza substituir versão ou valor aceito pelo usuário. A capacidade de inversão é compartilhada entre reversão e reembolso, mesmo com chaves diferentes.

**Alternatives considered**: retry com nova chave; simples hash fornecido pelo cliente; confiar no cache das Rules; habilitar pelo número de escritas. Rejeitadas. A prova candidata está em `contracts/security.md`; expressões e ramos compostos continuam gates ERROR até demonstração.

## 7. Documentação atual consultada via Context7

Resolve inicial Firebase selecionou `/websites/firebase_google` por cobertura oficial das regras e transações. Consultas em TypeScript para atomicidade e limites foram realizadas em 2026-10-19. Resultados incluíram URLs Enterprise; o produto local permanece Standard. Usar apenas as garantias gerais citadas abaixo, sem importar APIs MongoDB/Enterprise.

- [Transações Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions): todas as leituras precedem escritas, callback pode repetir, offline falha e commit é integral.
- [Condições das Rules](https://firebase.google.com/docs/firestore/security/rules-conditions): `getAfter` valida pós-estado; limite20 chamadas por operação atômica e10 por escrita. Chamadas podem ser cacheadas, mas a prova interna não presume cache.
- [Limites das Rules](https://firebase.google.com/docs/firestore/security/rules-structure): 1000 expressões, sem recursão e limites de funções/fonte compilada. Compilar não demonstra aceitação de caso positivo.
- [Rules de consultas](https://firebase.google.com/docs/firestore/security/rules-query): consulta deve ser autorizável pelo seu conjunto potencial; exigir limite e escopo, sem confiar em filtro de tela.

Não adotar como garantia de capacidade o trecho recuperado sobre uma escrita/segundo em agregações: não é parâmetro necessário deste desenho nem medição do projeto. Tetos internos permanecem18/8,32 mutações,32KiB/documento,1MiB/comando e12 parcelas. Questões de domínio estão resolvidas; viabilidade remota é um gate técnico registrado, não lacuna a esconder em uma hipótese.
