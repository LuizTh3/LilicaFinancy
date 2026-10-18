# Quickstart: Validação de receitas e despesas externas

Este guia é para executar após implementar a 005. A criação dos documentos de planejamento não significa que comandos, telas ou regras já estejam disponíveis. Não executar integração antes de cumprir os pré-requisitos. Não há emulador, deploy ou alteração de dados reais neste plano.

## Pré-requisitos

- Node >=24.12.0 e npm 11.18.0; dependências conforme package-lock. Se ausentes, instalar com npm ci na raiz do projeto.
- Ambiente Firebase conhecido; TEST_EXPECTED_PROJECT_ID deve corresponder a VITE_FIREBASE_PROJECT_ID antes de qualquer conexão/fixture.
- Rules locais reconstruídas e compiladas: corrupção em safeId/calendarDate removida, permissões 002/004 preservadas, schema2 e invariantes da 005 revisados. rules/índices efetivamente publicados sob autorização vigente antes dos testes que os exigirem; documento de publicação distingue gerado/publicado/verificado.
- Configuração de testes fora do Git/log: .env.integration.local com parâmetros existentes e contas fictícias A/B/ADMIN/PENDING; nunca registrar senhas ou tokens.
- A/B/ADMIN com primeiro acesso concluído e novo login posterior ao cutoff; ADMIN cadastrado, sem acesso financeiro de B; PENDING ainda com primeiro acesso pendente. Visitante sem autenticação.
- TEST_RUN_ID único por execução. Manifesto inclui IDs exatos de todos os cadastros/eventos/origens/marcadores criados. Sem fixtures automáticas no login, dados pessoais reais ou carga massiva.

## Verificações locais

Na raiz do repositório, após a implementação:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Esperado: invariantes de centavos/calendário, comandos, mapeamento schema1/2, canonicalização, transições, parciais, reversões de erro e descarte de sessão aprovados. Regressões 002/003/004 permanecem verdes. Testes de projeção distinguem inversão genérica/reembolso econômico da neutralização de erro da 005. Perfil remoto externo não habilita séries da 003.

Revisão estática adicional: arquivo completo de Rules sem blocos duplicados/regex interrompidas; helpers com orçamento conforme contracts/security.md; schema fechado de cada variante; índices completos e nota com rollback. Compilação/validação oficial sem emulador depende do ambiente autorizado e deve ser registrada como executada ou pendente, nunca substituída por uma busca textual.

## Integração dirigida

Após estender configuração, preflight, clients e manifesto para o grupo literal externos (`externos`), com pré-requisitos anteriores satisfeitos:

```powershell
$env:TEST_INTEGRATION_GROUP = 'externos'
$env:TEST_RULES_CONFIRMED = 'yes'
npm run test:integration
```

Variáveis adicionais: TEST_EXPECTED_PROJECT_ID, TEST_RUN_ID, VITE_FIREBASE_API_KEY/AUTH_DOMAIN/PROJECT_ID/APP_ID e TEST_USER_{A|B|ADMIN|PENDING}_{UID|EMAIL|PASSWORD}. Reutilizar validação estrita do harness cadastral; confirmar que as quatro contas distintas foram carregadas. TEST_RULES_CONFIRMED=yes é uma confirmação operacional após verificação real, não um comando de publicação.

| Roteiro | Ação | Resultado esperado |
| --- | --- | --- |
| Datas independentes | Criar despesa ocorrência17/10, vencimento10/11, competência12/2026 | Três campos preservados; ausência/data inválida de ocorrência recusada; nenhum caixa |
| Parcial despesa | Origem100; pagar40 em outubro contaA e60 em novembro contaB | Dois fatos, pendência0; compromisso100 uma vez na competência; saídas40/60 |
| Parcial receita | Previsão1000; receber600 depois400 | Recebido líquido1000; previsto1000 permanece; nunca previsão como caixa |
| Excesso | Com pendência60, enviar60,01,0,negativo,fracionário | Negação integral, sem alteração de projeção/origem/eventos |
| Duas abas | Mesmo estado100, pagar70 em cada aba com chaves distintas | Máximo um commit; outra exige releitura, zero excesso |
| Idempotência | Mesma chave e corpo em paralelo; depois corpo divergente | Um evento; retorno dos mesmos IDs; divergência recusada |
| Sem alteração | Editar sem diferença na versão atual, alterar por outra intenção e repetir o comando antigo | Primeiro retorna semAlteracao sem escrita/recibo/revisão e encerra descritor; repetição antiga conflita por versão, conforme exceção de FR-016 |
| Retomada após arquivar | Confirmar intenção, arquivar referência e repetir comando; simular falha de preflight cadastral | Recibo original ainda recuperável antes de rejeitar por estado atual das referências, sem novo efeito |
| Gasto imediato máximo | Categoria/conta inéditas, titular, conta prevista distinta, cinco etiquetas, substituição cancelada | Novo par integral atômico, travas corretas e orçamento18 sem cache |
| Falha de resposta | Injetar perda somente após commit real; consultar intenção | Mesmos IDs e nenhum par adicional; distinguir ausência de confirmação indeterminada |
| Primeiro uso concorrente | Duas origens usando mesma categoria inédita; alteração de base/natureza no mesmo lote | Um patch permanente; conflito recuperável pela mesma intenção; nenhum conteúdo sensível muda |
| Arquivamento | Arquivar conta prevista; depois tentar liquidar; arquivar conta real após pagamento | Nova liquidação exige conta ativa; reversão ainda preserva conta histórica |
| Erro em mês posterior | Pagar40 em outubro, reverter erro em novembro | Original/reversão visíveis; caixa econômico de outubro0 e novembro sem devolução fictícia; pendência+40 |
| Duas reversões | Dois eventos inversos com chaves distintas para original | Um único marcador/inversão; nenhum liquidado negativo |
| Preservação | Editar parcialmente pago, apagar evento, cancelar com liquidado>0 | Todas recusadas; após reverter tudo, cancelar e criar substituição ligada |
| Substituição interrompida | Confirmar cancelamento e falhar criação sucessora | Antiga segue cancelada; indicação de substituição incompleta e retomada da mesma criação |
| Criação substituta máxima | Criar receita e despesa substitutas de origens canceladas, com cinco etiquetas, categoria inédita e referências opcionais | Perfil15 aceita sem cache; perfil14 não é usado para esse ramo; antiga ativa/de outra natureza ou UID é recusada; imediato substituto permanece perfil18 |
| Escrita direta | O sem R, R sem O, dois fatos por delta, usar evento antigo, forjar trava/projeção | Negação independente de UI; nenhum órfão ou efeito parcial |
| Cinco etiquetas | Repetir máximo com cada referência inválida individualmente | Caso válido aceita; cada inválido rejeita integralmente |
| Roles e REST | A/B/visitante/ADMIN/PENDING por SDK e snapshot REST | Só proprietário pronto acessa; admin não lê finanças alheias |
| Snapshot mensal | Criar51 origens fictícias inventariadas; mudar inserção/datas entre páginas de T | Páginas de T coerentes, total só após completude; Atualizar traz novo T com mudança |
| Reversão entre páginas | Ler caixaT, confirmar reversão em outra aba e continuar T | SnapshotT íntegro, sem misturar com versão nova; atualizar mostra neutralização |
| Expiração | Cursor de T expirado/token inválido/índice indisponível | Estado parcial/erro e reinício explícito, nunca total inconsistente ou fallback pago |
| Troca de sessão | Logout/UID diferente durante envio e leitura | Nenhum dado tardio exibido, intenção anterior não reenviada sob outro UID |
| Reconstrução | Auditar origem e eventos completos em T | Soma e jaLiquidada coincidem, sequência sem lacunas e último evento correto |

As 51 origens são o mínimo dirigido para provar fronteira de página, não teste de carga. Reutilizar UIDs fictícios e não criar séries/cartões para compor fixtures. Separar casos máximos de testes pequenos se cota estiver limitada, registrando cobertura restante.

Para comprovar integridade, executar ataques do contrato de segurança através do cliente proprietário, além de A/B. Admin SDK não prova autorização. Eventual preparação de cenário corrompido exige ferramenta restrita/autorização específica; sem isso, registrar teste de bloqueio com double local e não alegar prova remota de corrupção privilegiada.

## Verificação manual da interface

```powershell
npm run dev
```

Abrir /app/lancamentos autenticado. Conferir celular/desktop, teclado e rótulos: mês, bases, filtros, criação de previsão, gasto imediato, detalhe e histórico parcial. Navegar dezembro/janeiro. Competência paga mantém compromisso; caixa usa datas reais. Cancelamento/reversão exibem motivo/impacto e distinguem erro de reembolso real.

Com pelo menos cinco participantes, registrar tempo e conclusão dos fluxos de SC-001 e entendimento de SC-008. Meta: quatro de cinco sem ajuda e <=2 minutos por registro, desconsiderando indisponibilidade. Se não houver participantes, informar SC assistido pendente em vez de substituí-lo por impressão do implementador.

## Relatório e limpeza

Registrar projectId conferido, runId, versões, Rules/índices efetivamente ativos, comandos executados, resultados e limitações. Sem credenciais, token, descrições financeiras reais ou logs completos de requests. Relatório diferencia build/local, integração autorizada, validação manual e medição assistida.

Limpeza continua por manifesto e caminho exato, com prévia de escopo/quantidade; incluir eventos, marcadores, controles legados de fixture e cadastros correspondentes. Clientes financeiros não têm delete. Utilizar apenas mecanismo de limpeza restrita já autorizado para contas/execução selecionadas; nenhum novo privilégio de exclusão é concedido pelo guia. Não remover travas de cadastro compartilhado ou dados anteriores ao runId. Não executar limpeza global, seed ou delete de documento pai presumindo apagar subcoleções.
