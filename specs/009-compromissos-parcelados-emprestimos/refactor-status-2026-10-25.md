# Refatoração das Rules009 —25/10/2026

**Resultado: parcial, não aprovado para produção.** Não foi resolvido o caso central5/10 dentro do protocolo atual. Não anunciar correção concluída nem suporte apenas1/1 como entrega do parcelamento.

O gerador separa cabeçalho de validação completa, funde validação inicial com a de posição, valida campos comuns uma vez, comprova preservação por diff, evita somar novamente parcelas uniformes já provadas pelo valor unitário ou quociente/resto, reutiliza cálculo de mês/dias e usa condições explícitas para ramos inaplicáveis. Cabeçalho e forma das referências da criação foram delegados ao recibo obrigatório. Metadados de catálogo continuam protegidos pelos escritores004/005; a referência financeira consome schema/papel/estado e testemunho protegido. O formato financeiro deS/R não foi alterado.

Criação1/1 de série e recibo passou na API oficial. Criação5/10, máximos, valores explícitos e vários ramos de atualização continuam excedendo1000 expressões. As negativas que passam apenas por esse estouro não contam como prova de enforcement da condição de negócio.

Candidata experimental72.168 bytes, SHA256929a551e7f8985c6225f74406a740ffeb23df26123189fa1853b53b9a76eec44. A avaliação completa pediu134 casos e recebeu6 lotes/72 resultados antes deHTTP503:55 estadosSUCCESS, dos quais15 continham diagnóstico de limite;40 casos passaram sem esses diagnósticos,17 falharam e62 não chegaram a ser avaliados. Compilação ocorreu; o runner foi corrigido para preservarCOMPILED e estadoEVALUATION_INTERRUPTED quando uma falha de serviço vem após lotes válidos. Resumo em rules-evaluation-summary.json; respostas/tentativas preservadas em.integration.

Regressão local485/485 em121 arquivos PASS; verificação lexical local e sintaxe do runner PASS. Essas verificações não aprovam a candidata. Root Rules/índices e perfis permanecem inalterados, sem publicação, migração ou gravação financeira.

Alternativa preparada em contracts/validation-witness-proposal.md: um comprovante imutável adicional por série criada, no mesmo commit, sem mudar a autoridade financeiraS/R. Exige aprovação por alterar protocolo/coleção física e tornar a substituição com todos os opcionais acima do orçamento18 (custo candidato21). Criação máxima de referências teria custo candidato18. Esses números são aritméticos, ainda sujeitos à prova oficial de expressões e de todos os ramos.
