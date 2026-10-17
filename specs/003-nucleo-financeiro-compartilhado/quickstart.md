# Guia de validação do núcleo financeiro

Este guia será executado após implementar as tarefas derivadas do [plano](plan.md). Hoje os artefatos de planejamento existem; os módulos/testes financeiros abaixo ainda não. Não registrar comandos planejados como testes aprovados.

## Pré-requisitos

- Checkout do projeto e contexto ativo `specs/003-nucleo-financeiro-compartilhado` em `.specify/feature.json`; Git pode continuar em `develop`.
- Node >=24.12.0 e npm compatível com packageManager npm11.18.0; ambiente pesquisado Node25.8.1/npm11.18.0.
- Dependências do lockfile já instaladas. Se necessário instalar em ambiente autorizado com `npm ci`; não atualizar versões para executar este guia.
- Para testes puros, nenhuma credencial, configuração Firebase, emulador ou acesso remoto é necessária. Build/typecheck usam a configuração de projeto existente, sem consulta financeira remota.

```powershell
Set-Location 'C:/Projetos/LilicaFinancy'
node --version
npm --version
```

## 1. Executar a suíte do núcleo

Após implementação, os testes ficam em `src/domain/finance/*.test.ts` e `src/domain/finance/contracts/*.test.ts`:

```powershell
npm test -- src/domain/finance --reporter=verbose
npm test -- src/domain/subscription.test.ts
```

Esperado: todos os casos de [contracts/domain.md](contracts/domain.md) passam em Node, sem importar Firebase/React ou consultar rede. O filtro do Vitest é por substring de caminho; ausência dos testes é falha de entrega, não sucesso com zero testes.

## 2. Reconciliação reproduzível

Fixtures finitas do núcleo devem demonstrar os resultados seguintes. IDs e relógio fixos; fixtures nunca são gravadas no app/projeto real.

| Cenário | Resultado esperado |
| --- | --- |
| `R$ 90.071.992.547.409,91` → centavos → texto | Exatamente9007199254740991 e a mesma string, sem perda do último centavo. |
| MAX+1, negativo livre, `1.23`, `1,234` e NaN | Erro discriminado e zero efeitos. |
| 10000/3 | [3334,3333,3333]; soma10000. |
| N=1..12, total=N/N+1/MAX | Soma exata, ordem estável e diferença máxima1 na divisão uniforme. Total=N−1 rejeitado. |
| Migração5/10, saldo60000 | Seis compromissos de10000, ordinais5..10; total original/pagamentos anteriores não inventados. |
| Âncora31: janeiro2027, meses0/1/2 | 2027-01-31 / 2027-02-28 / 2027-03-31. |
| Fevereiro1900/2000/2028/2100 | 28/29/29/28 dias. |
| Instante2026-10-18T02:00:00Z, RioBranco | Dia2026-10-17; datas civis salvas não mudam com o fuso. |
| Deslocamento fora de1900..9999, fuso inválido ou offset+01:00 | dataInvalida, sem fallback. |
| Compra10000 outubro, parcelas novembro/janeiro | ConsumoOut10000, planejamentoNov3334, caixa zero até pagamento. |
| Fatura10000 fechada, pagamento4000 | Pendência6000, parcial, ciclo fechado; vencimento passado indica atraso. |
| Reverter4000 | Original preservado, pendência10000 e inversão no caixa uma vez. |
| Estorno10000 novembro de compra outubro | ConsumoOut10000 preservado; reduçãoNov10000. Reembolso não duplica redução nem cria recebimento. |
| PlanejamentoOut/vencimentoNov para receita/externa | Previsão emOut; vencimentoNov; caixa na data efetiva. Parcela cartão não admite essa divergência. |
| Recorrência materializada com exceção/cancelamento | Uma ocorrência por identidade, virtual substituída; mover planejamento não recria origem. |
| Molde energia15000/true, novembro/dezembro estimados; confirmar novembro16327 | Novembro16327/false; dezembro15000/true e molde15000/true intactos. Mesmo ID/datas, sem caixa; repetir a mesma confirmação não incrementa versão novamente. |
| Fatura vence2026-11-17, parcela de cartão copiada com2026-11-20 | referenciaInvalida na criação, snapshot e prévia de edição; sem alteração silenciosa da fatura. Parcela externa mantém vencimento próprio. |

Para testes independentes do fuso do processo, o relógio e fuso entram como argumentos. Opcionalmente repetir em processo com TZ diferente, restaurando-o ao fim:

```powershell
$financePreviousTZ = $env:TZ
try {
  $env:TZ = 'Asia/Tokyo'
  npm test -- src/domain/finance/calendar.test.ts
} finally {
  if ($null -eq $financePreviousTZ) { Remove-Item Env:TZ -ErrorAction SilentlyContinue }
  else { $env:TZ = $financePreviousTZ }
}
```

## 3. Contratos e falhas

```powershell
npm test -- src/domain/finance/contracts --reporter=verbose
```

Esperado: mesma chave/payload retorna mesmos IDs; payload diferente conflita; duas edições esperam3, apenas uma confirma4; dois pagamentos/inversões concorrentes não ultrapassam pendência/original. Falha antes de commit não aplica efeitos; resposta perdida após commit é recuperada pela mesma chave. Testar 13 parcelas, 33 mutações, acesso19 ou acesso9 por escrita e limites de bytes/expressões como rejeições integrais. Testar valores exatamente nos tetos com perfis sintéticos para separar `>` de `>=`; nenhum perfil sintético habilita produção.

Verificar que série com último ordinal ausente é rejeitada e que double de usuárioA rejeita referência deB. Esse resultado é comportamento local, não prova de segurança Firebase. Conferir que sem perfil operacional remoto o comando é rejeitado como limiteOperacional/funcionalidade não habilitada, em vez de assumir custo zero.

## 4. Checagens de entrega

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

Vitest não substitui typecheck. Build/testes gerais protegem primeiro acesso, assinatura e outras funcionalidades existentes. O verificador de fronteira planejado percorre imports transitivos do núcleo e falha para React/Firebase, infraestrutura, features, app, imports dinâmicos não declarados e Node-only no código de produção do domínio. Testes adjacentes podem importar Vitest e utilitários de Node; essa permissão não se estende aos módulos de produção.

Desempenho informativo: 1000 gerações/validações de cronograma de12, após aquecimento, com p95 alvo<50ms no Node local; registrar runtime e resultado, sem misturar isso com SLA remoto ou mudar regra financeira para melhorar benchmark.

## 5. Limite da evidência e habilitação futura

Nenhum teste deste guia exige `test:integration`, Admin SDK, conta real, credencial ou publicação. `firestore.rules` e `firestore.indexes.json` devem conservar conteúdo; serviços da feature002 não ganham rotas financeiras. Não instalar emuladores.

Adaptador financeiro só poderá ser implementado/habilitado após os gates em [contracts/repositories.md](contracts/repositories.md#4-budget-remoto-e-gate-de-habilitação), com projeto real autorizado, contas A/B/visitante dedicadas, preflight do projectId, fixtures por execução, Rules completas, índices necessários e revisão de publicação/reversão. Se o orçamento ou integridade falhar, registrar bloqueio e rejeitar comando; não declarar integração comprovada por teste em memória.

Relatório de implementação deve separar: cenários locais executados/aprovados, falhas, limitações, adaptadores não habilitados e qualquer integração realmente autorizada/testada. Não criar tasks.md nem executar implementação a partir deste guia durante `$speckit-plan`.
