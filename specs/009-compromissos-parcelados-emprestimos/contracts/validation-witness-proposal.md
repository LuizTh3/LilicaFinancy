# Proposta de correção do protocolo009 —25/10/2026

**Estado em 26/10/2026: aprovado pelo responsável e implementado como protocolo candidato local; validação remota pendente.** A aprovação autoriza implementação e avaliação sintética, sem publicação, migração ou gravação financeira remota. A aprovação do desenho não comprova a viabilidade das Rules. Ver [estado da implementação](../witness-status-2026-10-26.md).

## Mudança proposta

Manter `seriesParceladas` (S) com mapa finito atual e `operacoesParceladas` (R) com comando/recibo imutável. Acrescentar **um comprovante imutável de validação (V) por série criada e operação**, em coleção privada `validacoesParceladas`. Ele não representa parcela, receita, pagamento ou outra autoridade financeira. Identidade derivada de evento e série; campos fechados de vínculo/versão/timestamp, sem cópia do cronograma e sem hash fornecido pelo cliente como prova.

S, R e V devem existir no pós-estado do mesmo commit, com identidade, versão e evento recíprocos. V é create-only; update/delete negados. A regra de S exigeV; V exigeS/R e valida o próprio vínculo. Nenhuma criação financeira pode depender de comprovante solto ou reutilizado. As validações deslocadas continuam sendo aplicadas nas Rules, não só no cliente.

Partição implementada: S valida envelope, cálculo, vínculo com o payload, referências e valor/ordinal da primeira posição; R valida perfil, intenção, cabeçalho e campos comuns da primeira posição; V valida seu vínculo, calendário inicial, ordem e índice exato de competências. As demais posições distribuem a validação financeira e de calendário por ordinal absoluto: S recebe 1/4/7/10, R recebe 2/5/8/11 e V recebe 3/6/9/12, excluindo a primeira posição já tratada separadamente. A distribuição ainda precisa de prova oficial dos três ramos, inclusive máximos e opcionais; os resultados atuais não comprovam o limite de 1000 expressões.

## Custo candidato sem cache

UmV acrescenta três acessos: S→V e V→S/R. Não acrescenta leitura transacional deV: identidade fixa e create-only comprovam ausência, e conflito rejeita o commit inteiro.

| Operação | Custo anterior | Custo proposto | Consequência |
| --- | --- | --- | --- |
| Criar sem opcionais/primeiro uso |5 |8 | Dentro de18, sujeito à prova |
| Criar com titular, conta prevista, cinco etiquetas e primeiro uso |15 |18 | No teto interno, sujeito à prova |
| Substituir mínimo, criando uma nova série |8 |11 | Dentro de18, sujeito à prova |
| Substituir com todos os opcionais/primeiro uso |18 |21 | Rejeição integral obrigatória; combinação deixa de caber |

Por escrita: S nova chega a5 acessos; R continua até7 na criação e8 na substituição; V usa2. Criação passa a até4 mutações contando categoria; substituição até5. Mantêm-se18/8/32,32KiB por documento e1MiB por comando. A fórmula de perfil, preflight e testes do repositório precisam refletir o custo real; não esconder ou fracionar operações excedentes.

## Impacto e autorização concedida

A proposta altera o protocolo/contrato físico009 e exige harmonização do repositório, fixtures, Rules e documentação. Mantém valores, identidades de série/parcela, histórico, pagamentos e formato financeiro deS/R. Não inclui migração, publicação, alterações remotas de finanças ou habilitação de produção. Leituras antigas não passam a inventar comprovante.

Foram gerados candidata separada e 172 casos recíprocos S/R/V. Continuam obrigatórias as provas de 1/1, 5/10, 12 posições e opcionais, ordem/datas, diferenças de centavos, ausência/orfandade/reuso de V, perfil/propriedade e referência arquivada. Só depois considerar promoção de viabilidade; SDK e publicação têm gates próprios. Se um ramo não couber, reportar o caso e seu custo, sem enfraquecer a proteção.
