# Quickstart: Validação de cartões e faturas

Executar este roteiro **após implementar006**. Os módulos, rotas e grupo de integração abaixo são alvos do plano; sua descrição não significa que já existam. Esta fase documental não publica Rules/índices, executa testes remotos ou cria fixtures.

## Pré-requisitos

- Node>=24.12.0 e npm11.18.0; dependências do lock. Se faltarem, executar npm ci na raiz. Sem upgrade de dependências ou emulador.
- Features002/004 e núcleo003 presentes.005 só tem US1 habilitada; não pressupor pagamentos ou séries para estes cenários.
- Implementação entrega Rules/índices completos, nota de mudanças, compilação e avaliação oficial da fonte integral com orçamento/expressões, backup e rollback protegido. Publicação exige autorização vigente específica ao escopo006; autorização histórica005 não é autorização genérica para qualquer mudança futura.
- Antes de testes dependentes, conferir fonte efetivamente ativa, índices READY e configuração autorizada. Documento local ou TEST_RULES_CONFIRMED=yes não comprova publicação.
- .env.integration.local ignorado pelo Git, sem imprimir conteúdo. TEST_EXPECTED_PROJECT_ID deve corresponder a VITE_FIREBASE_PROJECT_ID antes da conexão. TEST_RUN_ID único; contas fictícias A/B/ADMIN/PENDING com UIDs distintos, visitante sem login. A/B/ADMIN prontos e login posterior ao cutoff; ADMIN enabled sem acesso alheio; PENDING no primeiro acesso.
- O harness006 seleciona o grupo literal `cartoesFaturas`, exige quatro contas e inventaria os novos caminhos; suítes/Rules006 só podem ser executadas após sua implementação e habilitação autorizada. Reutilizar parâmetros TEST_USER_{A|B|ADMIN|PENDING}_{UID|EMAIL|PASSWORD} e VITE_FIREBASE_{API_KEY|AUTH_DOMAIN|PROJECT_ID|APP_ID}, sem expor valores.
- Inventariar caminhos autorizados para detectar colisões com dados antigos incompatíveis. Não sobrescrever ou migrar automaticamente. Fixtures só nos UIDs selecionados, com IDs de cartão/fatura/eventos registrados antes das mutações.

## Verificações locais

Na raiz, depois de implementar:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Esperado: testes de calendário v2 e legado, dinheiro/parcelas/liquidações003, cadastro004 e previsão005 continuam aprovados. Cobrir mapeadores fechados, limites, canonicalização/idempotência, conflitos e descarte de geração. Testes de UI/contratos não podem apenas reproduzir o algoritmo: usar resultados de calendário conferidos na tabela do modelo e ataques independentes.

Não escrever suites financeiras remotas que presumam compra/pagamento ainda não implementados. Preservação de obrigações futuras é verificada por contrato/double do núcleo neste incremento; sua prova integrada remota virá com o consumidor de compras. Registrar essa fronteira sem abrir coleção apenas para fixture.

## Integração dirigida após habilitação autorizada

Com preflight/configuração completos, fonte ativa conferida e grupo006 implementado:

```powershell
$env:TEST_INTEGRATION_GROUP = 'cartoesFaturas'
$env:TEST_RULES_CONFIRMED = 'yes'
npm run test:integration
```

O segundo campo confirma uma verificação operacional já realizada; não publica nada. Nenhum comando de deploy, seed ou limpeza faz parte deste guia.

| Roteiro | Ação | Resultado esperado |
| --- | --- | --- |
| Cadastro privado | Dois cartões de mesmo banco/nome, titulares distintos | IDs e faturas independentes após recarga. |
| Referências e campos | Titular alheio/ausente/arquivado novo; CVV/número completo/credencial/campo extra | Negação direta e no formulário, sem dados parciais. |
| Vínculo histórico | Arquivar titular depois; renomear cartão conservando vínculo | Permitido; novo vínculo arquivado recusado. |
| Calendário usual | 10/17 outubro e25/5 janeiro | Datas iguais à tabela de data-model.md. |
| Âncoras | 31/5 em2027/2028 e30/31 fevereiro/março/abril | Clamp correto sem deriva; coincidência válida somente pela prova nominal. |
| Dias iguais | 31/31 fevereiro | Fechamento31/01, vencimento28/02, sem confundir com30/31. |
| Limites de calendário | Anos2000/2100,1900/9999 e competência que precise data fora do domínio | Bissextos corretos; rejeição sem data truncada/sentinela. |
| Sugestão | Compra antes/no/depois do fechamento, inclusive28/02 em30/31 | Dia do fechamento vai à seguinte; nenhuma escrita. |
| Escolha explícita | Corrigir primeira fatura para período diferente/fechado | Mantém escolha, sem mover calendário ou fingir compra. |
| Snapshot | Confirmar mês, mudar dias/nome/titular, abrir de novo | Mesma identidade e datas; nomes atuais; novos períodos respeitam limites. |
| Retroativo | Confirmar sucessora antes da anterior | Fronteira compartilhada preservada ou conflito explícito. |
| Distância2 | Outubro/2026 sob30/31 fecha30/10 e vence31/10; novembro ausente; após mudar para25/5, dezembro proposto inicia25/10, fecha25/11 e vence05/12 | Negar pela sobreposição de calendários individualmente válidos. Em execução independente, confirmar dezembro sob25/5, mudar para30/31 e tentar outubro; também negar. |
| Origem circular em lote | Cartão10/17, outubro/novembro ausentes; criar ambos mais recibos no mesmo lote, usando12/10 como fechamento de outubro e início de novembro | Negar integralmente: nenhum vizinho novo pode justificar a fronteira; o padrão exige10/10. |
| Controle positivo do lote | Mesmo cartão/lote anterior, com fronteira10/10 e origens padrao, sem histórico anterior | Aceitar calendários legítimos, sujeito às demais invariantes/limites; não alegar que todo lote múltiplo é proibido. |
| Concorrência | Duas abas no mesmo período e períodos adjacentes | Um documento por tupla, sem fronteira divergente; revalidação da revisão. |
| Orçamento máximo | Confirmar fatura com quatro vizinhos preexistentes válidos e cartão válido; avaliar também o lote direto de controle | Caso individual aceita com15 acessos conservadores (quatro get de vizinhos); lote direto usa16 acessos das escritas no desenho, sem leituras transacionais da aplicação; avaliar fonte completa/expressões e provar rejeição por origem, não por orçamento. |
| Grafo recíproco | Primário sem recibo, recibo isolado/antigo, dois recibos para revisão, ID errado | Negação atômica independente da UI. |
| Recuperação | Reenvio da mesma chave/corpo e perda de resposta após commit | Mesmo resultado; corpo divergente conflita; sem efeito duplicado. |
| Sem efeito | Editar sem diferença/confirmar existente/arquivar novamente na revisão atual | Sem escrita/recibo novo; nova intenção posterior usa nova chave. |
| Ajuste | 17/10→19/10 com motivo; consultar evento e recarregar | Só vencimento atual muda; snapshot original/competência/limites preservados. |
| Ajuste inválido | Outro mês, anterior ao fechamento, igualdade sem prova, schema futuro | Negação sem efeito parcial. |
| Dias úteis | Vencimento no fim de semana/feriado | Data mantida até ajuste manual explícito. |
| Arquivamento | Arquivar cartão com faturas futuras; abrir histórico e tentar novo vazio | Histórico intacto; novo vazio bloqueado; ajuste existente continua válido. |
| Ciclo vazio | Antes/no fechamento e após vencimento | Aberto/fechado correto; total0, sem pagamento registrado, sem atraso fictício. |
| Roles | A/B/ADMIN/PENDING/visitante em get/list/create/update/delete | Só proprietário pronto acessa; nenhum bypass admin. |
| Página/índice | Página cheia, nome duplicado, intervalo entre anos, índice ausente | Cursor sem salto; nenhum recorte vira total completo; erro acionável. |
| Sessão/rede | Logout durante await, offline, cota e permissão | Sem dado tardio/falso sucesso; chave preservada só na mesma sessão. |

Em teste dirigido de paginação, criar somente o mínimo de registros fictícios necessário para cruzar o tamanho de página configurado, inventariando-os; não exigir carga massiva. Distinguir simples reenvio de recuperação pós-commit: a perda de resposta deve ser injetada depois de um commit realmente confirmado. Admin SDK não prova Rules. Fixture de corrupção privilegiada exige autorização/mecanismo separado; sem ele, registrar cobertura local de falha fechada, sem alegar ataque remoto executado.

## Interface e medição assistida

```powershell
npm run dev
```

Entrar com conta fictícia pronta e abrir `/app/cartoes`. Conferir criar/editar/arquivar, filtro de arquivados, consulta mensal entre anos, prévia/confirmar vazio, ajuste/histórico e primeira fatura corrigível. Recarregar cada confirmação. Testar teclado, foco e celular/desktop. Não oferecer registro de compra/pagamento neste incremento.

Com cinco participantes, medir SC-001/008: pelo menos quatro cadastram/localizam fatura em≤2min sem ajuda e distinguem ciclo fechado, ausência de pagamento e sugestão corrigível. Sem participantes, marcar a medição como pendente; teste automatizado não substitui compreensão humana.

## Evidência e limpeza

Registrar em validation.md: versões, comandos, resultados, projectId conferido, runId, fonte/índices efetivamente ativos, cenários cobertos e limitações. Separar local/compilação/avaliação oficial, cliente real, manual e assistido. Não declarar perfil006 validadoNoProjeto antes da evidência própria.

Sem dados pessoais reais, payloads financeiros ou credenciais em logs. Manifesto inclui todos os eventos/cartões/faturas criados; incluir origem/IDs exatos e UID fictício. Não há limpeza automática: cliente financeiro não tem delete. Eventual limpeza usa mecanismo restrito e autorização vigente, com prévia do escopo/quantidade, somente registros desta execução; excluir documento pai não remove subcoleções. Não ampliar permissões para facilitar teste/limpeza.

## Estado após implementação local das cinco histórias (2026-10-18)

O responsável solicitou continuar o desenvolvimento local apesar do gate remoto de T022. As rotas e ações descritas neste guia agora estão implementadas; os testes de integração cartoes/faturas também estão preparados. Isto não confirma autorização remota nem execução dos exemplos contra o projeto.

Usar /app/cartoes para cadastro e arquivo; Faturas de um cartão abre a lista por intervalo, inclusive outros anos. Abrir mês/ano mostra snapshot confirmado ou prévia sem escrita. Confirmar fatura vazia grava somente calendário+evento quando o ambiente estiver habilitado. Ajustar exige nova data no mesmo mês e motivo. A primeira fatura de compra é apenas consulta com escolha explícita; não registra compra. Arquivado conserva consulta/ajuste de existentes e não oferece criação de período novo.

Operação sem resposta mantém descritor mínimo da mesma intenção. Consultar confirmação antes de reenviar; após recarga sem conteúdo, a retomada exige conferir/reinformar e confirmar explicitamente com chave/alvo/revisão preservados. Outra tela de cartão/fatura não pode substituir a pendência. Logout/invalidação limpa a chave privada006.

A compilação/avaliação oficial da fonte privada depende de autorização explícita para envio à API Firebase com a sessão operacional; a tentativa anterior foi rejeitada pela aprovação automática. Nenhuma tentativa alternativa foi realizada. Publicação tem autorização própria e exige backup/comparação/índices READY antes da integração real. Perfis permanecem validacaoRemotaPendente. Conferência visual/teclado/celular e medição com cinco participantes não foram realizadas. Para evidência efetiva e pendências, consultar validation.md e deployment-review.md.
Atualização após autorização: foi publicado o incremento seguro de cartões (criar/editar/arquivar e recibos). Faturas/eventos de fatura têm gravação negada enquanto o candidato exceder o limite de expressões da avaliação oficial; criação/ajuste na UI também estão desabilitados. Não executar a suíte real de faturas como se estivesse habilitada. Executar a suíte de cartões isoladamente após fonte/índices READY e registrar o runId e resultado. A autorização anterior para envio/publicação já foi concedida; o bloqueio atual de faturas é técnico, não falta de permissão do responsável.