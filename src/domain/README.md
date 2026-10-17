# Domínio

Regras locais independentes de React e Firebase. `session`, `registration` e
`subscription` já atendem os fluxos existentes de acesso e assinatura.

O núcleo `finance/` implementa a feature 003 em módulos puros:

- `money`: centavos seguros, parser/formatação pt-BR, operações e crédito tipado.
- `calendar`, `installments`, `invoiceCalendar`: calendário civil, fuso explícito,
  âncora mensal, cronograma exato e sugestão de fatura. `subscription` delega ao calendário.
- `settlement`, `projections`: snapshots completos, pendência, inversões/estornos,
  prévia de edição e leitura por consumo, planejamento ou caixa.
- `identity`, `operationBudget`: identidades naturais, canonicalização e limites.
- `recurrence`: projeção deduplicada e confirmação do valor de uma ocorrência,
  preservando o estado de estimativa próprio e as demais ocorrências.
- `contracts/commands`: portas específicas e dados comuns usados pelos cenários.

Funções públicas retornam `Resultado<T>` com erro discriminado. Recebem dados, relógio
e fuso explicitamente; não fazem I/O, consultam sessão global ou geram IDs aleatórios.
BigInt é apenas intermediário interno: DTOs usam números inteiros seguros e strings.
Parcelas de cartão usam o vencimento confirmado da fatura, sem data independente.

Repositórios financeiros remotos permanecem não habilitados. Entidades futuras têm
contratos documentais, sem CRUD antecipado ou framework genérico de persistência.
Doubles usados para validar contratos ficam exclusivamente nos arquivos de teste.

Execute `npm test -- src/domain/finance` e `npm test -- src/domain/subscription.test.ts`.
Vitest não substitui `npm run typecheck`; complete com lint/build e a suíte geral.
O gate `architecture.test.ts` inspeciona imports transitivos, inclusive tipos/reexports.
Exemplos e evidência: [guia](../../specs/003-nucleo-financeiro-compartilhado/quickstart.md)
e [validação](../../specs/003-nucleo-financeiro-compartilhado/validation.md).
