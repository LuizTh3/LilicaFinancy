# Validação da implementação006

## Baseline — 2026-10-18 (T001)

- Git real: develop; contexto lógico006. Antes desta execução, .specify/feature.json já estava modificado e specs/006-cartoes-ciclos-faturas/ não rastreado; preservados.
- Node v25.8.1, npm11.18.0; stack e lock existentes preservados. Nenhuma atualização de dependências.
- Checklist requirements.md:16/16, zero pendências. extensions.yml ausente. Constituição1.2.0 lida. Correções C1/I1 incorporadas ao desenho.
- Ignore existente cobre node_modules, dist/build/coverage, .env e credenciais, logs, artefatos locais e temporários. Sem Docker, ESLint, Prettier, Terraform ou Helm detectados; package.json é private, sem publicação de pacote. Nenhum ignore adicional necessário.
- Base005 habilita somente US1 de previsões.006 não habilita compras, parcelas ou pagamentos remotos. MVP inicial: cadastro/consulta/edição, com arquivamento/faturas em fases seguintes.
- Nenhuma credencial exibida, conexão remota, fixture, publicação ou limpeza executada nesta baseline. Compilação e testes remotos serão registrados somente se efetivamente executados.

## Execução

Tarefas são marcadas somente após entrega/verificação correspondente. Ausência de evidência remota não é teste aprovado.

### T002–T004 — setup

- Dois testes novos falharam antes da implementação (grupo sem ADMIN/PENDING; manifesto sem coleções006). Após extensão: sete arquivos/nove testes locais aprovados, incluindo regressões de manifesto e limpeza.
- Runner seleciona cartoes/faturas no grupo cartoesFaturas; preflight continua exigindo confirmação operacional de Rules. TEMP/TMP locais apontados para .integration/tmp, ignorado.
- Clientes e manifesto restritos estendidos; nenhuma autenticação real, fixture, publicação ou limpeza executada. Configuração exemplo sem segredos, stack/ignore preservados.

### T005–T012 — fundação

- Contratos tipados006 separados do CRUD004. Testes de calendário expuseram seis falhas no comportamento antigo antes da correção. v2 decide mês por âncoras nominais, preserva metadados e comprova coincidência; legado continua estrito.
- Consumidores de parcelas/liquidação e doubles/fixtures harmonizados; novos testes verificam coincidência válida, vencimento copiado divergente e replay de série v2. Documentação003 registra especialização e ciclo derivado.
- Helpers safeId/safeVersion/calendarDate/catalogReady já satisfazem a fundação e serão reutilizados sem duplicação; novos caminhos seguem negados pelo fallback até US1.
- Testes vermelhos de descritor006 e perfis foram executados antes das mudanças. Limpeza de sessão preserva as chaves anteriores; perfis permanecem validacaoRemotaPendente.
- Regressão local:54 arquivos/213 testes aprovados; typecheck e lint aprovados. Nenhuma prova remota006 ou publicação executada.

### T013–T021 — cadastro MVP local

- Domínio criar/editar, validação fechada/canônica, revisão esperada, titular próprio e preservação do mesmo vínculo arquivado implementados. Cartões com nomes iguais mantêm identidades independentes. Arquivamento ainda é recusado e não aparece como ação.
- Mapper contextual valida schema, datas, metadados e recibo; ordem dos campos de mapas remotos não afeta replay. Adaptador lê recibo antes do cartão/titular, realiza todas as leituras antes das escritas e grava cartão+evento na mesma transação. No-op não gera recibo. Recuperação de resposta perdida conserva a mesma intenção.
- Testes controlados cobrem conflito de conteúdo/versão, retry, resposta perdida, titular arquivado, erro de índice sanitizado e descarte de sessão. Teste adicional após a regressão comprova que mudança de sessão após commit não retorna sucesso e cursor de outra geração/limite51 é recusado: cinco testes do adaptador aprovados.
- Matriz real preparada em tests/integration/cartoes.integration.test.ts: A/B/ADMIN/PENDING/visitante, primário+recibo, campos proibidos, referência alheia/ausente/arquivada, evento isolado/reutilizado e nomes duplicados. Fixtures exatas são inventariadas antes dos envios. NÃO executada contra Firebase.
- Rules completas locais implementam apenas criação/edição e leitura privada. Índices/isenções anteriores foram comparados estruturalmente e preservados. Reversão006 difere apenas nas três permissões de mutação006, que passam a false. Notas completas em docs/firestore-rules-changes.md. Essas revisões não substituem compilação oficial/integração.
- Tela /app/cartoes integrada com seleção paginada de titulares, filtros, rótulos, foco de erro/formulário, vínculo histórico e retomada. Sessão guarda somente UID+descritor fechado; formulário não é persistido. Testes de estado impedem envio duplo/geração antiga e conteúdo extra; formulário estático verifica somente os cinco campos permitidos. Fluxo visual real/teclado ainda não conferido no projeto.
- Validação final deste checkpoint: typecheck e lint aprovados; regressão60 arquivos/225 testes aprovados, seguida do teste adicional do adaptador (cinco/cinco aprovados); build aprovado com aviso de chunk maior que500kB (aprox.929kB minificado), sem falha. git diff --check aprovado. Nenhuma dependência alterada. extensions.yml segue ausente, sem hooks posteriores aplicáveis.

### T022 — bloqueado na validação remota

- Trabalho local do MVP preparado; T022 continua desmarcada. A primeira tentativa de compilação oficial dentro do sandbox falhou por rede (fetch failed). A tentativa com acesso ampliado foi rejeitada pela aprovação automática antes de executar, porque enviaria o código privado das Rules à API Firebase e utilizaria o refresh token local sem autorização explícita desse envio. Não houve contorno nem nova tentativa.
- Nenhuma compilação oficial aprovada, avaliação de expressões/orçamento006, backup/comparação da revisão ativa006, publicação006, estado de índices READY006, autenticação real ou fixture006 foram realizados. Perfis006 permanecem validacaoRemotaPendente. A interface local não comprova persistência remota.
- Revisão concreta e gates em deployment-review.md. Próximo passo depende de autorização explícita para compilar/avaliar na API oficial com a sessão operacional existente; publicação segue exigindo autorização própria. US2–US5 não iniciadas porque T022 é checkpoint bloqueante do plano. Não declarar a feature completa nem substituir verificação remota por doubles.
## Continuação autorizada — cinco histórias locais (2026-10-18)

O responsável perguntou se as tarefas restantes afetavam a aplicação e, após a explicação, solicitou: “Então continue, mesmo assim”. Essa instrução autoriza concluir o trabalho local além do gate de T022. Não foi interpretada como envio da fonte privada à API Firebase ou publicação. A anotação anterior de US2–US5 não iniciadas descreve o checkpoint anterior; o estado atual está nesta seção.

### US2 — T023–T031

- Testes de domínio/porta e adaptadores escritos antes dos módulos correspondentes; houve falha de importação dos módulos inexistentes, seguida de aprovação após implementação. Calendário por competência usa snapshot do cartão, quatro vizinhos preexistentes e separação à distância2; a camada transacional lê as ausências. ID é cartaoId__YYYY-MM. Não há materialização automática de meses intermediários.
- Origem circular entre novos documentos não é aceita: o domínio recalcula o esperado e as Rules usam quatro get no pré-estado, mantendo getAfter exclusivamente para cartão/recibo. Teste real preparado nega fronteira12/10 sob10/17 e aceita controle10/10, sem depender de estourar orçamento. Exemplos30/31 versus25/5 à distância2 testados localmente nas duas ordens; matriz remota preparada com datas válidas.
- Mapper fecha schema1/versaoConteudo1 e identidade; total/itens/pago/ciclo/owner/schema futuro são recusados. Adaptador lê recibo→fatura→cartão→quatro vizinhos antes das duas escritas; retry não adota revisão nova. Mesmo calendário existente não cria recibo. Colisão incompatível falha fechado. Recibo histórico é recuperável antes da atividade atual das referências.
- Lista e detalhe protegidos implementados por cartão/intervalo e competência, inclusive mudança de ano. Prévia não grava; confirmação é explícita. Fatura vazia deriva total0 e não afirma pagamento/quitação/atraso. Ciclo é calculado pelo fechamento e data no fuso, atualizado também com foco/relógio local, sem escrever estado no banco.

### US3 — T033–T039

- Resolvedor aplica início inclusivo/fechamento exclusivo e combina snapshots com candidatos do mês da compra,+1,+2. Deduplica identidade e recusa leituras divergentes; ambiguidade não escolhe primeira linha. Escolha explícita distante prevalece. Compra no fechamento30/31 em fevereiro sugere março; calendário25/5 atravessa anos. Cartão arquivado bloqueia nova prévia.
- Consulta SDK usa duas desigualdades e limite2; auxiliares deduplicam no máximo sete competências consecutivas. Escolha explícita consulta seu próprio período e vizinhos. Não há fallback ilimitado ou escrita na prévia. Testes verificam consulta, índice ausente sanitizado, geração/sessão tardia, paginação e conflito/deduplicação. Leitura não isolada é rotulada como previsão, nunca confirmação.
- Componente explica processamento do emissor e permite mês/ano explícito; não apresenta ação de registrar compra. Índice de contenção incluído sem remover índices anteriores.

### US4 — T041–T047

- Ajuste puro valida motivo normalizado e vencimento no mesmo mês, conserva identidade/início/fechamento/calendarioOrigem e recusa variantes com itens/schema futuro. Domingo18/10 é mantido sem deslocamento. Coincidência só passa pela prova nominal do snapshot. Mesmo vencimento é no-op, sem recibo.
- Transação de ajuste lê recibo+fatura e grava somente fatura+evento com antes exato, motivo e novo vencimento. Não consulta atividade do cartão/titular. Recuperação de resposta perdida, revisão concorrente e descarte após mudança de sessão foram testados com SDK controlado. Mapper também valida recibo efetivo e recusa anterior/motivo adulterado.
- Histórico é paginado por resultVersion, valida cadeia contígua e revisão final contra a fatura exibida. Lacuna ou consulta de revisão divergente pede atualização. Interface apresenta impacto, formulário rotulado e motivo, anterior/novo e revisão atual. Mudar padrão cadastral não varre snapshots.

### US5 — T049–T055

- Testes de arquivamento falharam primeiro no domínio e repositório antes da transição ser implementada. Depois passaram: preserva conteúdo, dispensa titular, exige revisão atual, rejeita edição embutida, bloqueia edição/reativação e retorna no-op sem evento para revisão arquivada atual.
- Adaptador grava cartão+evento atômicos e archivedAt de servidor; não toca faturas. Teste de retry simula arquivamento concorrente e nega novo período. Recibo anterior continua recuperável. Ajuste de fatura existente após arquivar foi testado com SDK controlado.
- Contrato/double003 identificado conserva as três parcelas/faturas já existentes na fronteira pura de arquivamento. Isso não é integração de compras remotas: futuras compras ainda precisam validar cartão ativo no commit. Nenhuma coleção de compras/parcelas foi aberta para demonstrar esse contrato.
- UI oferece confirmação de impacto, filtros e acesso ao histórico. Arquivado sem fatura mostra ausência sem botão de novo período; existente segue com ajuste disponível. Fluxos de retomada preservam chave/alvo/revisão, guardam somente descritor e bloqueiam outra intenção entre telas de cartão/fatura. Conflito de idempotência conserva a pendência para conferência do recibo.

### Consolidação local — T057/T063

- Testes locais finais:66 arquivos/252 testes aprovados. typecheck (incluindo integração preparada), lint e build aprovados. Alteração final de retenção de pendência em conflito passou novamente por tipos/lint/build. Build tem aviso de chunk maior que500kB (aprox.967kB minificado), sem erro. Nenhuma dependência atualizada.
- Índices/isenções anteriores comparados estruturalmente contra HEAD e preservados. A reversão integral difere somente nas seis permissões006, todas negadas; leituras próprias e002/004/005 preservadas. git diff --check aprovado. extensions.yml ausente, sem hooks aplicáveis.
- Rules/índices/notas/reversão completos locais, README, quickstart, tasks e deployment-review atualizados. Perfis específicos006 continuam validacaoRemotaPendente. A camada do domínio passou pelo teste de independência de UI/SDK/relógio implícito.
- Rastreabilidade local: FR-001–003 cadastro/referências/privacidade; FR-004–008 identidade/calendário/snapshots; FR-009–010 ajuste; FR-011–013 prévia/escolha; FR-014–017 consulta/ciclo/zero; FR-018 arquivo; FR-019–023 recuperação/erros/revisão/UI/segurança estão implementados. Segurança remota, experiência real e critérios de sucesso assistidos NÃO estão comprovados por esses testes locais.

### Gates mantidos pendentes

T022/T032/T040/T048/T056 e T058–T062 continuam pendentes nas partes remotas/assistidas. Nenhuma fonte006 foi compilada oficialmente, avaliada quanto às1000 expressões, publicada ou verificada com cliente real. Contagem textual conservadora7/5/15/5 e lote direto16 não é comprovação de orçamento executado. Nenhum perfil foi promovido.

Nenhum acesso remoto novo, login, fixture006, comparação/backup ativo006, índice READY006, publicação ou limpeza ocorreu nesta continuação. A aprovação automática anterior rejeitou a compilação por exportar fonte privada usando a sessão operacional sem autorização explícita; não houve contorno nem nova tentativa. Conferência visual real em celular/desktop/teclado e SC-001/SC-008 com cinco participantes permanecem pendentes. A entrega local é revisável; não deve ser apresentada como habilitada no ambiente real. Consultar deployment-review.md antes de qualquer ação remota.
## Relato de recusa ao cadastrar cartão — 2026-10-18

Usuário recebeu “Verifique sua sessão e seu acesso”. Diagnóstico local: permission-denied/unauthenticated eram apresentados pelo adaptador com a mesma mensagem. Registro operacional local de publicação e readiness disponível refere-se à fonte005, sem006; isso sustenta a hipótese de Rules006 ainda não habilitadas, mas não é releitura da revisão ativa neste momento. Não foi afirmada sessão inválida nem recomendada troca de credenciais.

Mensagem de permission-denied ajustada para informar recusa do banco e orientar conferir regras de cartões publicadas e acesso; mensagens locais de mudança de sessão e unauthenticated continuam distintas. Seis testes do adaptador aprovados, typecheck e lint aprovados. Nenhuma nova compilação remota, publicação ou alteração de dados. O conserto operacional continua dependendo dos gates de deployment-review.md e da autorização explícita exigida pela rejeição automática anterior.
## Correção operacional autorizada do cadastro — 2026-10-18

O responsável autorizou explicitamente o envio das Rules à API oficial, validação e publicação. Nenhuma aprovação foi contornada. A fonte integral compilou oficialmente; backup da revisão ativa e dos índices/isenções guardado em .integration/006-backup-2026-10-19T02-18-06-440Z (timestamp UTC, ainda18/10 no fuso do usuário). Inventário agregado retornou zero documentos nas quatro coleções006 antes da habilitação. Comparação confirmou preservação da base002/004/005; somente um comentário diferia fora da006.

### Resultado da avaliação e escopo seguro

- Sete casos oficiais de cartões passaram: criação/edição/arquivamento, recibos de cada transição e recusa de campo proibido. Chamadas observadas na escrita principal3/3/2 e recibo1; leituras do comando mantêm totais conservadores7/7/5. Fonte usada na publicação conferida por hash.
- A avaliação do candidato completo de faturas falhou por limite1000 expressões, inclusive em cenários positivos e no ajuste. Controles negativos que apenas negaram por orçamento não foram aceitos como prova. Tentativas de reduzir recomputações preservaram a segurança, mas não resolveram o gate. Não foi publicada gravação de fatura com esse resultado.
- Fonte publicada SHA256 8469f7b4bcef603f26ec75180611ee3d56eae437e208b40d2ccb49dff28fb952: cria/edita/arquiva cartões com recibos; mantém false nas três permissões de criação/ajuste/evento de faturas. Consultas próprias continuam protegidas. A interface informa indisponibilidade de registro/ajuste e desabilita essas ações via availability.ts. T029/T046 reabertas; gates de faturas continuam técnicos, não dependentes de nova autorização para este escopo.
- Cinco índices novos adicionados, nenhum excluído. Isenções novas adicionadas preservando anteriores. A reversão completa atualizada compilou sem erros; avisos são de funções tornadas inacessíveis pelos allow false. Fonte ativa verificada novamente após publicação. Nenhuma reversão, migração, exclusão de documento ou limpeza foi executada.

### Teste real de cartões

- Smoke: runId cartoes006-smoke-20261018-01, um teste aprovado/quatro ignorados,8,35s. Com contas fictícias, confirmou criação/edição/replay e cartões de mesmo nome no Firebase real; não depende de índice de lista.
- Matriz completa: runId cartoes006-full-20261018-01, tests/integration/cartoes.integration.test.ts, cinco testes aprovados,18,89s. Cobre A/B/ADMIN/PENDING/visitante, leituras/escritas diretas em cartão/recibo, campos proibidos, titular alheio/ausente/arquivado, grafo órfão/reutilizado, arquivo sem edição embutida, revisão obsoleta, recuperação de recibo após arquivo, reativação/delete negados e cartão separado do mesmo banco preservado.
- Fixtures registradas nos manifestos exatos antes dos envios; permaneceram no ambiente fictício, sem limpeza automática. Não houve teste com dados pessoais do usuário nem acesso bancário. A falha de permissão do cadastro não foi reproduzida após habilitar as regras.
- Todos os14 índices compostos estão READY e todas as15 isenções configuradas. Algumas operações assíncronas de configuração ainda aguardavam flag done na checagem intermediária; verify006/wait006 acompanham conclusão. O índice de cartões estava READY antes da matriz completa. Detalhes em .integration/006-readiness.json.
- Perfis criarCartao/editarCartao/arquivarCartao promovidos para validadoNoProjeto com esta evidência. ConfirmarFatura/ajustarVencimento continuam validacaoRemotaPendente e as gravações seguem negadas. Nenhuma porta genérica de séries/compras/pagamentos foi habilitada.

A correção do cadastro está publicada e testada por SDK real. Conferência visual na sessão do responsável e medições assistidas permanecem pendentes; a entrega completa de faturas ainda requer resolver o limite de expressões e executar sua própria matriz real.
Checagem final: fonte ativa corresponde ao hash publicado;14/14 índices READY,15/15 isenções configuradas e todas as operações assíncronas concluídas. wait006 terminou com ready=true. Regressão local final:66 arquivos/252 testes aprovados; typecheck, lint e build aprovados. Nenhum monitor ou limpeza continua em execução.
