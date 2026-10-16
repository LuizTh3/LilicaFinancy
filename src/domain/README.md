# Domínio

Área reservada às futuras funções e serviços de regras financeiras. Devem ser puros,
testáveis localmente e independentes de React, componentes visuais e SDK Firebase.

Esta fundação não implementa cálculos, entidades financeiras ou testes de domínio.
Acrescente módulos somente quando houver funcionalidade especificada; não criar abstrações
ou interfaces sem consumidor. Futuros testes unitários podem ficar próximos aos módulos,
com nomes `*.test.ts`, executados por `npm test` em ambiente Node.
