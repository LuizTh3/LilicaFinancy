# Correções aplicadas após speckit-analyze

## Achados tratados

| ID | Correção | Estado |
| --- | --- | --- |
| C1 | Substituído fanout de origens/eventos por mapa fixo até12 em uma série e eventos separados; grafo detalhado de criação/edição/substituição e demais comandos | Impedimento aritmético removido no desenho; prova executável ainda pendente em T005–T007 |
| I1 | Exceção semAlteracao explícita em FR-018 e cenárioUS4, alinhada ao contrato e T031/T032 | Corrigido documentalmente |
| U1 | Cardinalidade0..1 por ponta explícita em FR-011 e cenárioUS2, alinhada ao modelo e T022 | Corrigido documentalmente |
| I2 | Plano reconhece tasks.md existente e descreve as dependências atuais | Corrigido documentalmente |

## Verificações

Executar validate-design-budget.ps1 para conferir orçamento por chamadas declaradas, incluindo leituras transacionais e primeiro uso, sem desconto de cache. As fórmulas não medem expressões/bytes nem provam autorização executável. Contagem de tarefas/labels/IDs preservada em50; nenhum checkbox de implementação é concluído pela correção documental.

Revisão cruzada deve conferir ausência de instruções para gravar parcela em lancamentosExternos schema2, ausência de eventos individuais redundantes e propagação do mapa finito aos contratos, consultas e tarefas. Prévia e pagamento continuam por obrigação lógica; alteração concorrente é serializada por revisão global.

## Próximo passo concreto

Conferir T004 e produzir candidato de Rules completas em T005, casos de avaliação em T006 e evidência de T007. Apenas depois desses gates e das autorizações aplicáveis executar tarefas dependentes. Não trocar pendência de prova por PASS ou por proibição genérica de implementar pesquisa técnica.

## Evidência local obtida

validate-design-budget.ps1 executado com sucesso:48 combinações por comando estrutural (144 avaliações); máximos criar15, editar16, substituir18. Demais perfis: cancelar5, pagar9, reverter11, vincular10. Expressões e bytes reais não medidos; Rules não avaliadas/publicadas. A execução comprova apenas soma das chamadas declaradas no desenho.

