# Quickstart: Validar pagamentos e ajustes de faturas

Guia para **depois da implementação e saída dos gates**. Nenhum comando abaixo foi executado como validação008 nesta fase. Artefatos documentais não tornam as funcionalidades disponíveis. Não usar emuladores nem habilitar flags para contornar recusas das Rules.

## Pré-requisitos

- Node>=24.12.0/npm11.18.0; dependências do lock. Se ausentes, `npm ci` na raiz; não atualizar bibliotecas para este fluxo.
- G0/G1/G2 do [plano](plan.md) resolvidos: faturas006, cronograma007, inicialização008 e regras com orçamento/expressões comprovados. availability=false e falta de perfil008 são bloqueios reais no baseline.
- Regras/índices completos revisados, fonte ativa e índices READY conferidos no projeto autorizado, backup e rollback. Upload/avaliação/publicação seguem autorização vigente e restrições registradas em validation007/deployment-review006; esta fase documental não executa ações remotas.
- `TEST_EXPECTED_PROJECT_ID` confere com configuração do app antes de login/fixture. Credenciais em ambiente fora do Git/log. A/B/ADMIN prontos, PENDING pendente e visitante; contas fictícias distintas.
- Harness preparado para grupo literal `liquidacoesFaturas`, quatro papéis/visitante e manifesto008. O runner seleciona somente `tests/integration/liquidacoesFaturas*.integration.test.ts`; as suítes financeiras ainda não foram implementadas. Grupo desconhecido aborta, sem cair na suíte antiga.
- `liquidacoesFaturasFixtures.ts` produz somente IDs e plano de manifesto, sem seed ou envio. Usa runId de8–40 letras/dígitos/hífens para caber nos IDs existentes; registrar os caminhos com recordFixture antes de cada envio autorizado. O timestamp fixo do plano é sintético, não instante de registro real. Payloads008 dependem de fechar G0–G2; o construtor não os presume disponíveis.
- `TEST_RUN_ID` único e manifesto exato de cartões, faturas, compras, parcelas, eventos, controles e cadastros da execução. Sem dados pessoais, seed no login ou limpeza automática.

## Verificações locais

Na raiz, depois da implementação:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

Esperado: testes003/005 preservados e novos testes de centavos/datas, conta de destino diferente, reversão integral na data original, revisão persistente, capacidade cumulativa, ajustes no mês original, inclusão tardia, mappers, intenção/sessão e consultas. Doubles não comprovam autorização remota. Incluir orçamentos máximos aceitos e rejeição dos excedentes, primeiro uso e cinco etiquetas quando aplicável.

## Rules e integração dirigida

Avaliar fonte integral por ferramenta oficial autorizada com positivos válidos e ataques de [security.md](contracts/security.md). Registrar hash, casos, chamadas sem cache, bytes e expressões; recusa por1000 expressões não prova segurança. Não repetir envio previamente rejeitado por aprovação automática sem autorização reconhecida para ação/destino. Só depois publicar sob autorização e conferir fonte/índices.

Após criar a suíte e seu grupo, cumprir os pré-requisitos e verificar as regras ativas:

```powershell
$env:TEST_INTEGRATION_GROUP = 'liquidacoesFaturas'
$env:TEST_RULES_CONFIRMED = 'yes'
npm run test:integration
```

`TEST_RULES_CONFIRMED` declara conferência operacional; não publica. Reutilizar ambiente/clientes seguros existentes. Manifesto precede envio; testes pequenos e dirigidos por SDK/REST autenticado. Admin SDK não comprova Rules.

| Cenário | Ação | Resultado esperado |
| --- | --- | --- |
| Parcial/integral | Fatura1000, pagar400 e600 em contas/datas distintas | Liquidado1000, pendente0, duas saídas, zero despesa categorizada adicional e parcelas sem quitação individual. |
| Excesso | Pendente600, tentar600,01/zero/negativo/fracionário | Rejeição sem efeito;600 exatos aceita. |
| Duas abas | Dois pagamentos400 sobre600 | No máximo um commit; outro exige releitura/nova prévia sem ajuste silencioso. |
| Replay | Perder resposta após commit; repetir chave/corpo; depois alterar corpo | Mesmos IDs/efeitos uma vez; divergência conflita; recuperação independe de conta arquivada depois. |
| Atraso | Vencimento17/10 com pendência, consultar17 e18 | Só18 tem atraso; saldo zero não atrasa e ciclo é independente. |
| Encargo | Adicionar juros manuais25 à fatura paga | Exigível/pendente+25; consumo uma vez na data informada; caixa inalterado, sem cálculo automático. |
| Revisão | Reabrir fechada nunca paga, recarregar, corrigir e encerrar | Datas preservadas, revisão persiste; pagamento bloqueado até encerrar e voltar fechada. |
| Histórico revertido | Reverter todos os pagamentos e tentar reabrir/editar | Bloqueio persiste, histórico nunca retorna false. |
| Erro de pagamento | Pagar400 em outubro, reverter erro em novembro | Original preservado; outubro corrigido na mesma conta/data, novembro sem dinheiro fictício e pendente+400. |
| Capacidade | Reembolsar100 de pagamento400 e tentar reversão integral | Reversão bloqueada; reembolsos futuros limitados a300. |
| Erro de valor | Item100 de outubro corrigido para80 em novembro, com pendência suficiente | Outubro consumo80; novembro sem estorno econômico20; original/justificativa preservados. |
| Classificação | Corrigir categoria de item antigo | Mês original recategorizado; categoria original consultável, sem caixa ou gasto duplicado. |
| Compra esquecida | Fatura fechada1000 paga, incluir compra200 por correção | Exigível1200, pendente200, pagamentos/fechamento preservados; consumo no mês original, zero caixa novo. |
| Inclusão parcelada | Compra esquecida N>=2 com destinos conferidos | Cronograma único íntegro; cada delta exato; destino inválido rejeita tudo. |
| Abatimento | Item200, pendente500, estorno200 à própria fatura | Pendente300, redução de consumo na data de efeito, sem entrada em conta. |
| Reembolso | Fatura1000 paga, devolver200 de item elegível para conta diferente | Exigível/liquidado800, pendente0, entrada200 na data recebida e uma redução de consumo na data econômica. |
| Distribuição | Devolução parcial em itens/faturas/pagamentos selecionados | Somas exatas, sem presumir parcelas pagas; conjunto inválido/excedente rejeitado integralmente. |
| Crédito não suportado | Abater60 com pendente50; reduzir150 de exigível100 | Bloqueio explicado, sem truncar/crédito/transferência automática. |
| Cancelamento | Cancelar compra elegível antes de cobrança | Retira exigibilidade conforme007, sem simular devolução real ou estorno econômico. |
| Compensação | Compensar ajuste errado; repetir/exceder magnitude | Novo evento limitado ao remanescente, sem exclusão ou caixa implícito. |
| Escrita direta | Omitir evento/controle, forjar saldo, reutilizar recibo/capacidade | Negação fora da UI sem órfão; positivo do mesmo ramo aceita dentro do orçamento. |
| Isolamento | A/B/ADMIN/PENDING/visitante e referências cruzadas | Só proprietário pronto consulta/grava; admin não acessa finanças alheias. |
| Reconstrução | Ler itens/fatos completos no mesmo readTime | Valores/capacidades/histórico/revisões coincidem; divergência bloqueia sem autorreparo. |
| Página/sessão | Alterar entre páginas e depois logout | Snapshot coerente ou incompleto explícito, sem total falso/dado tardio/reenvio em outro UID. |

Exercitar centavo residual, dezembro/janeiro, ano bissexto, fechamento/vencimento coincidentes006 e conta arquivada após pagamento. Em consultas de caixa, deduplicar evento retornado em datas distintas e contar cada fato elegível uma vez; ver [queries-ui.md](contracts/queries-ui.md).

## Interface e critérios assistidos

```powershell
npm run dev
```

Entrar pelo detalhe da fatura. Conferir celular/desktop, teclado, foco/rótulos, motivos, prévias e navegação ao item/original. Distinguir ciclo/revisão/atraso/pendente; gate técnico indisponível não é sessão inválida.

Com cinco participantes, pelo menos quatro registram parcial em até2 minutos e distinguem pendência/caixa/erro/abatimento/devolução em conta. Registrar tempos/entendimento; sem participantes, SC-006 fica pendente. SC-001–005/007 exigem os roteiros financeiros/segurança acima, não apenas build.

## Relatório, rollback e limpeza

Registrar local/remoto/manual, projeto conferido, runId, hash ativo, índices, resultados e limites; sem credenciais/tokens/conteúdo pessoal. Distinguir regras geradas/compiladas/publicadas/verificadas. Não promover perfil sem evidência própria. Falha grave interrompe novas mutações e usa rollback compatível, sem apagar eventos para simular formato antigo.

Limpeza só por manifesto/UIDs fictícios delimitados, prévia de escopo/quantidade e mecanismo restrito autorizado. Incluir auxiliares, sem supor que apagar pai apaga filhos. Não remover travas de cadastros compartilhados ou dados anteriores. Este guia não concede delete financeiro ao cliente nem autoriza limpeza global.
