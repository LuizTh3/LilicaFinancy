# Contract: Segurança, atomicidade e orçamento007

**Estado**: desenho de referência; G0/G1 impeditivos. Não são Rules executáveis, prova remota ou perfil habilitado. Preservar proteção002/004/005 e cartões006. Fontes oficiais consultadas em2026-10-18: [condições das Rules](https://firebase.google.com/docs/firestore/security/rules-conditions), [cotas](https://firebase.google.com/docs/firestore/quotas) e [transações](https://firebase.google.com/docs/firestore/manage-data/transactions).

## Superfície autorizável

- compras: get/list próprios, create/update apenas por transição fechada, delete negado.
- parcelasCartao: get/list próprios, create somente junto da revisão, update/delete negados.
- controlesFaturas: get/list próprios e transições específicas recíprocas; sem total ou saldo. Delete/reset negados.
- operacoesCompras: get/list próprios; create recíproco, update/delete negados.
- faturas/operacoesFaturas/categorias: somente extensões explicitamente descritas abaixo. Não abrir pagamentos, ajustes ou entidades externas ao incremento.
- Leituras exigem own, catalogReady/cutoff/primeiro acesso e schema suportado, inclusive get de recibo ausente. List exige limit1–50 e escopo privado. Papel admin não dá acesso alheio.

## Grafo de referência

O=compra; P=parcela nova; G=controle de fatura; F=calendário; R=recibo007. Todas as referências são resolvidas sob mesmo UID com IDs exatos. resource/request.resource são dados locais da avaliação, sem consulta adicional. Reutilizar documento lido em let, sem presumir cache entre chamadas ou escritas.

### O: autoridade da transição

- Valida forma, perfil, versão, estado anterior, campos imutáveis e recibo getAfter(R) que corresponde ao comando/resultado. Criar/editar consulta cartão e categoria pós-estado, conservando arquivado somente conforme contrato.
- Ao criar/recalcular, confere getAfter de cada P prevista e a lista completa de IDs, posição/revisão/valor/fatura. Sem loops nas Rules: helpers por índice com curto-circuito e teto nominal12, contabilizados antes de habilitar. Não pode confirmar origem com filho omitido, valor divergente ou ordinal extra.
- Faturas novas são aquelas dos IDs determinísticos; P força G correspondente. Para destinos antigos que saem do cronograma, O confere diretamente getAfter(G) com recibo/revisão esperados. Toda a união de faturas afetadas participa da transição.
- Cancelamento e edição só de metadados não criam P; O confere G de todas as faturas correntes. Campo de quantidade/revisão não pode mudar em ramo de metadados.

### P: integridade de posição

- GetAfter(O) autoriza uma posição exata da nova revisão e força que compra a referencie. GetAfter(G) comprova fatura/cartão/competência e operação recíproca. Não usa timestamps sozinhos para provar revisão nova.
- ID inclui compra/revisão/ordinal; valor deriva de divisão inteira exata. Testemunha q/r no recibo tem q inteiro>=1,0<=r<N e q*N+r=T; multiplicação inteira limitada ao domínio evita dividir o total máximo por aproximação. P exige q+1 para numero<=r e q nos demais. Testar o máximo monetário, não só100/3.
- FaturaId é helper006 da primeira competência+ordinal−1. Campos arbitrários, P órfã, referência histórica em nova intenção ou parcela excedente são negados. P imutável e sua exigibilidade depende da origem/revisão, portanto cancelamento não exige regravar histórico.

### G: calendário e serialização de conteúdo/pagamento

- GetAfter(O) prova tipo, conjunto de destinos e evento exato; consulta F para comprovar snapshot/version e fechamento. Atualização incrementa version uma vez e conserva marcador de histórico de pagamento. Esperar versões impede duas operações antigas de se sobreporem.
- Em ramo de compra, request.time convertido ao calendário local suportado deve ser estritamente anterior ao fechamento; possuiHistoricoPagamento deve ser false no pré e pós-estado. Nunca confiar em hoje do payload. Para America/Rio_Branco, testar deslocamento UTC−05 e virada de dia com helper finito; fuso não suportado falha fechado em vez de assumir UTC/navegador. Não prometer interpretar IANA arbitrário nas Rules.
- O→P→G→O forma ciclo de referências de dados, sem recursão de funções. Cada escrita tem validação própria; não chamar a regra de O dentro da de G/P. Reciprocidade de IDs/revisões e transição create/update forçam conjunto completo, sem repetir validação de todo mapa.
- Criação de G somente com F nova no mesmo commit e conteúdo compatível comprovado. Legado sem controle não autoriza criar G falso isoladamente. Inicialização legada exige migração própria inventariada.
- Ramo futuro de pagamento é negado nesta etapa. Quando especificado, fato de pagamento deverá exigir G pós-estado com histórico true e G exigir o fato; reversão nunca limpa histórico. Não dizer que o marcador já prova pagamentos futuros que ainda não foram integrados.

### R e primeiro uso

- R novo exige getAfter(O), ultimoEventoId e revisão resultante exatos; O exige R correspondente. Recibo antigo não autoriza nova revisão; dois recibos não podem ocupar a mesma versão. Hash livre fornecido pelo cliente não substitui comparação canônica do comando.
- R valida cada etiqueta nova/retida segundo as regras históricas004; máximo5 getAfter distintos, sem descontar cache. Delegar ready em escrita auxiliar só é admissível pela prova de transição recíproca; todas as leituras permanecem protegidas por perfil.
- Primeiro uso da categoria precisa adaptar ramo financialUsePatch004: testemunha antes ausente e depois presente em operacoesCompras, categoria correspondente, alteração exclusiva de usoFinanceiro e nenhuma perda de conteúdo/campo protegido. Dois acessos extras estimados. Natureza não pode mudar no mesmo commit; origem exige categoria pós-estado de despesa.
- Histórico de alteração é o próprio R, limitado a uma transição; não inventar documento extra esquecido na contagem.

### F nova e ajuste de vencimento

- F nova e evento de calendário usam invariantes006: quatro vizinhos preexistentes por get, snapshots, identidade e origem de fronteira, sem herança circular entre novos períodos. Compra deve permitir ambos os recibos serem amarrados à mesma intenção financeira sem reutilizar evento velho.
- Não copiar indiscriminadamente ramo006 que exige cartão ativo: correção de obrigação preexistente em arquivado precisa variante recíproca e restrita a essa origem; compra nova continua negada.
- Ajuste de vencimento006, inclusive após encerramento quando permitido naquele contrato, coordena G sem reescrever compras/parcelas. O ramo de G para ajuste é distinto do de compra e não reabre permissões de compra em fechada. Nenhuma cópia de vencimento nova precisa cascata.

## Prova de dependências e consulta

- O não pode salvar sem todos P porque confere cada pós-P. P não pode existir sem O referenciando aquela posição; extra/orfã não satisfaz O.
- P obriga G pós-estado da mesma intenção; G precisa de O recém-transicionado e revisão exata. Todas as faturas antigas removidas são forçadas diretamente por O. G inalterado não pode conter ID de recibo novo, porque sua criação/transição anterior já exigiu aquele recibo create-only.
- Cancelamento muda exigibilidade de todas as revisões na única origem: nenhum consumidor pode contar P sem resolver estado/revisão da origem no mesmo snapshot. Parcelas históricas possuem valor, mas não exigibilidade autônoma.
- Integridade acima é desenho a traduzir e avaliar; aprovação de testes de doubles não prova enforcement remoto.

## Orçamento conservador do desenho

Oficial:10 acessos por operação e20 por conjunto;1000 expressões por requisição. Interno003:8/18,32 mutações,32KiB/documento,1MiB total. Não adotar500 como teto universal de parcelas por referência genérica do SDK.

Definições: N=parcelas novas, U=faturas distintas afetadas, D=faturas antigas que não aparecem nas posições novas, L=etiquetas verificadas, K=1 se precisa primeiro uso da categoria, J=faturas novas. Para criar, U=N e D=0. A tabela conta chamadas internas das Rules, inclusive autorização das leituras transacionais; leituras de SDK e getAfter não são a mesma métrica.

| Componente de criar/recalcular | Acessos de referência |
| --- | --- |
| Escrita O | 4 + N + D (perfil, R, cartão, categoria, novas P, G antigos removidos) |
| Escritas P | 2N (O e G por P) |
| Escritas G | 2U (O e F por G) |
| Escrita R | 1 + L (O e etiquetas) |
| Primeiro uso categoria | 2K |
| Leituras transacionais mínimas consideradas | 4 + 2U (R,O,cartão,categoria e G/F por destino), com um perfil por leitura |
| Subtotal sem novas F | 9 + 3N + D + 4U + L + 2K |

Leituras adicionais (parcelas/contexto incompatível/vizinhos) acrescentam custo; subtotal não dá licença para omiti-las. Maior escrita O exige4+N+D<=8. Cada perfil precisa de contagem do código concreto, incluindo helpers executados e expressões; esta tabela não é perfil validado.

| Cenário criação, todas F existentes e compatíveis | Subtotal conservador | Resultado |
| --- | --- | --- |
| N1,L0,K1 | 18 | Candidato mínimo aritmético; ainda sem prova oficial |
| N1,L5,K1 | 23 | Rejeitar por limite operacional |
| N2,L0,K0 | 23 | Rejeitar; demonstra que desenho atual não entrega múltiplas parcelas |
| N12,L5,K1 | 100 | Rejeitar, inclusive maior escrita16>8 |

Para cancelamento, O consulta perfil+R+U controles; R consulta O; G consulta O+F. Leituras mínimas R,O e U pares G/F: custo total3+3U +2+2U =5+5U; sem novas P/categoria/etiquetas. U1=10,U2=15 são somente candidatos;U3=20 excede18. Edição de metadados tem custo distinto, com referências e controles atuais, e não pode herdar o perfil de cancelamento.

Mutações de criar/recalcular: W=2+N+U+K+2J (O,R,P,G e F/evento de calendário novos). N12,U12,J12,K1 dá51>32. Cancelamento escreve O,R e U controles (2+U), sem regravar P históricas. Bytes dos snapshots/recibos e primeira referência também entram no orçamento.

F nova acrescenta checagem de quatro vizinhos nas Rules e respectivas leituras de contexto além do subtotal; pode também exigir testemunhas extras de calendário. Não usar uma fórmula inferior como orçamento final. O caminho006 sozinho já tem falha oficial de expressões; não considerar compilar com sucesso equivalente a satisfazer1000 expressões.

**Conclusão G1**: tabela basta para rejeitar máximos e apontar bloqueio, não para habilitar. G0/G1 só saem de ERROR com redesenho concreto que aceite parcelamento e seus fluxos seguros. Reduzir escopo aceito, eliminar redundâncias comprovadas ou outro layout são pesquisas possíveis; não alterar limites/requisitos silenciosamente. Enquanto isso, perfis007 permanecem naoHabilitado e mutações remotas negadas.

## Matriz obrigatória de ataques/provas

- A/B/ADMIN/PENDING/visitante: get/list/create/update/delete por caminho direto; tentativas de chave/cursor de outra sessão.
- O sem P; P sem O; P extra; soma errada; q/r adulterados; ordinal/quantidade/revisão/competência errados; total máximo; P com pagamento/categoria livre.
- R sozinho, antigo, corpo divergente, dois R numa revisão; G sozinho, reset, histórico true→false, origem errada; primeiro uso falso ou mudança de natureza concorrente.
- Fatura fechada sem pagamento, aberta com pagamento parcial/revertido, hoje adulterado, transição no fechamento local entre prévia e commit; bloqueio também por lote direto.
- Revisões3→2→3, cancelamento repetido, metadados em fatura protegida, destino antigo omitido e dupla edição/pagamento/ajuste de vencimento.
- F nova com vizinho circular ou sobreposição distância2; positivo legítimo com snapshot antigo válido. Negação por limite não comprova rejeição semântica do ataque.
- Commit realmente confirmado com resposta perdida; retry mesma intenção; conteúdo distinto; recarga; indisponibilidade e cota sem falso sucesso.
- Páginas em snapshot único e reinício por expiração; revision mismatch; soma parcial não definitiva.

## Entrega/release

Implementação deve entregar firestore.rules completo, firestore.indexes.json completo, docs/firestore-rules-changes.md e reversão que negue novas mutações007 sem perder proteção/dados anteriores. Preservar base002–006. Compilação, avaliação oficial, publicação autorizada e validação real são estados separados. Plano não usa credenciais locais, faz deploy ou inventaria dados remotos. Notas futuras devem identificar exatamente quais casos/capacidades foram comprovados e quais rejeitados.
