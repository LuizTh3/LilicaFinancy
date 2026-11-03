# Comprovante de validação — 26/10/2026

O responsável autorizou implementar e avaliar o comprovante adicional. O protocolo candidato grava série S, recibo R e comprovante V atomicamente. A produção permanece desabilitada; não houve publicação, migração ou gravação financeira remota.

## Implementação

`parceladosWitness.ts` constrói a identidade determinística `eventoId__serieId` e o documento fechado `{schemaVersion: 1, serieId, eventoId, resultVersion: 1, createdAt}`. Não duplica cronograma ou valores. Somente criação de versão 1 é elegível. O repositório usa o mesmo timestamp de servidor em S/R/V e no primeiro uso da categoria, quando necessário. Repetição e resposta perdida recuperam o mesmo recibo e não criam outro comprovante.

A ausência de S é consultada no preflight, sem leitura transacional redundante. Essa consulta não é autoridade de segurança: o ramo update das Rules rejeita comandos `criarSerie`, e a criação do recibo imutável protege a repetição. A prova remota desse caso e da concorrência continua obrigatória antes de habilitar o escritor.

Orçamento conservador candidato: criação `8 + H + P + L + 3K`; substituição `11 + H + P + L + 3K`. H/P são titular/conta prevista, L é a quantidade de etiquetas (0–5) e K é o primeiro uso de categoria. O máximo da criação é 18 acessos e quatro mutações; a substituição máxima exige 21 e deve ser rejeitada integralmente, sem dividir o commit. Permanecem os tetos internos 18/8/32, 32 KiB por documento e 1 MiB por comando. A função pura também orça substituição; o escritor SDK de substituição ainda não está implementado.

As referências de categoria consomem schema 2, natureza despesa, estado ativo e papel protegido `classificacao`. O contrato fechado completo de `usoFinanceiro` continua sob os escritores de cadastro/primeiro uso; a candidata não permite sua alteração arbitrária. Essa composição precisa constar da prova adversarial completa.

## Evidência e limite atual

- Testes locais: **488/488 em 122 arquivos**; tipos e lint passaram. Os testes do repositório usam mocks e não certificam Rules nem concorrência remota.
- Matriz gerada: 172 casos (62 ALLOW e 110 DENY). A checagem local é lexical/estrutural, sem compilação Firebase.
- Candidata `aa486c76cee81d70d0f15166f4f088456b740bc22e2022b848104d9c1b78c0e2`: compilou na API oficial; smoke 4/9 sem diagnósticos de limite. Falharam por 1000 expressões os três ramos de 5/10, o recibo 1/1 e o recibo de substituição. Portanto, **não aprovada**. Evidência sanitizada em `witness-aa486c76-evaluation.json`.
- Candidata seguinte `0f00ba6c9122f31589cfce76a0429f9ac09e62791f681c38d75a620b984f978d`, 77.478 bytes: conserva todas as checagens e evita percorrer posições posteriores quando a primeira já é a última. Duas tentativas oficiais retornaram HTTP 503, sem compilação ou avaliação concluída. O resumo corrente registra indisponibilidade, não PASS.

A revisão automática rejeitou uma tentativa de remover checagens de tipo consideradas redundantes, por risco de enfraquecimento. A alteração rejeitada não foi aplicada; as checagens de quantidade original e líquido continuam nas Rules.

T007 continua pendente/ERROR: ainda é necessário obter PASS da matriz inteira, sem negativas mascaradas por limite, provar os máximos e o grafo de acessos, e executar os testes SDK reais autorizados para o protocolo antes de habilitar produção. O comprovante implementado não resolve comprovadamente o limite de expressões atual.
