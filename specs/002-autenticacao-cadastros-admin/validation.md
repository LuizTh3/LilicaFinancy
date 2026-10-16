# Validação — autenticação, solicitações e administração

Data: 2026-10-16. Branch develop. Constituição 1.1.0.

## Resultado e limite da entrega

Código dos seis fluxos implementado e verificado localmente. A feature completa **não está
validada no ambiente real**. O responsável respondeu que contas A/B, Worker/Turnstile e
Brevo/remetente ainda não estão preparados e solicitou concluir código/verificações locais.
Não houve publicação de Rules/índices/Worker, envio de email, criação de conta, alteração
de senha remota ou exclusão de dados remotos. Nenhum commit foi feito.

## Ambiente e versões

Windows/PowerShell, Node 25.8.1, npm 11.18.0. Lockfile único com workspace privado do Worker.
Node mínimo atualizado para >=24.12.0 após verificar engines do Firestore SDK atual.
Firebase 13.0.0, Router 7.18.4, jose 6.2.12, Wrangler 4.151.1, workers-types 5.20261016.1.
React/Vite/TypeScript e outras dependências existentes não foram atualizadas indiscriminadamente.
Fontes/API verificadas via Context7 e documentos oficiais listados em docs/firebase-operations.md.

O npm detectou avisos transitivos de grpc-js 1.9.16. Override pontual 1.13.6, dentro do
major 1, corrigiu GHSA-m9gg-hp2v-232j e GHSA-f596-whhp-79r4. Não foi aplicado audit fix
--force ou downgrade do Firebase. A compatibilidade real do caminho Node Firebase com
esse override ainda depende da suíte A/B. Instalação final reportou zero vulnerabilidades.

## Verificações executadas

| Verificação | Resultado observado |
| --- | --- |
| npm ci | PASS após liberar binding nativo mantido pelo Vite no Windows; instalação final pelo lockfile com zero vulnerabilidades |
| npm run typecheck | PASS: app, ferramentas e harness/scripts de integração tipados |
| npm run typecheck:trusted-api | PASS: serviço e validações compartilhadas, sem secrets |
| npm run lint | PASS: Oxlint sem warnings |
| npm test | PASS: 39 testes em 15 arquivos, sem conectar a Firebase ou provedores |
| npm run build | PASS: Vite 8.3.4; bundle ~830 kB / ~252 kB gzip, com aviso de chunk >500 kB |
| npm run build:trusted-api | PASS: Wrangler dry-run, sem upload; ~77 kB / ~21 kB gzip; sem bindings configurados |
| npm run test:integration | BLOQUEADO intencionalmente no preflight: faltam alvo independente/runId/contas dedicadas; zero testes/fixtures remotos |
| Cleanup local | PASS: manifesto fictício de uma entrada, dry-run sem credencial, sem consulta ou exclusão remota |
| .env/exemplos/bundle | PASS: .env ignorado e não rastreado; exemplos com valores vazios; sem chave privada ou variáveis extras independentes no bundle |

Os testes locais cobrem CPF/dígitos repetidos, telefone, calendário/bissextos, campos extras,
configuração, barreiras de sessão/admin, geração antiga, ordem limpeza/signOut/navegação,
token malformado antes de lookup, supressão de tokens Auth na resposta, lease vencido,
senha atual/erros ambíguos, recibo idempotente, cutoff, falha Auth→commit, replay divergente,
orçamento de cadastro, Turnstile/hostname/action, limite de body e janela de deduplicação.
Contratos do serviço usam respostas HTTP controladas nos unitários; não são prova das Rules
nem teste real de provedores. Não foi instalado/configurado Firebase Emulator Suite.

Teste de replay divergente expôs retry indevido de conflito de payload como conflito de
transação. Reproduziu falha, corrigiu-se a distinção TRANSACTION_RETRY/OPERATION_CONFLICT
e confirmou-se a suíte verde. A primeira execução anterior foi impedida por EPERM no cache
temporário do Vitest; esse erro de ambiente não é contabilizado como falha comportamental
do ciclo TDD nem como aprovação de teste.

O build inicial encontrou nome legado inválido no .env. O arquivo foi preservado; Vite agora
expõe somente os seis campos usados por allowlist explícita. A auditoria de bundle distinguiu
um identificador público contido em APP_ID de uma exportação independente de campo extra;
nenhum valor foi impresso. Não há API key Brevo/secret Google no frontend.

## Inspeção de navegador local

No Vite e no preview do build, observados:

- Home, login e cadastro renderizados com labels e mensagens claras; cadastro tem exatamente
  quatro inputs de dados e nenhum campo de senha.
- Sem Turnstile configurado, aviso explícito e botão de envio desabilitado, sem envio fictício.
- Rota administrativa direta como visitante termina no login sem montar lista/detalhes.
- Primeiro Tab chega ao link de salto; envio vazio do login é bloqueado pelo HTML, focando
  o campo obrigatório Email, sem tentativa de autenticação.
- Cadastro inspecionado a 360×800 e 1280×900; conteúdo não ultrapassa viewport (scrollWidth
  345/1265, descontada barra vertical). Home móvel também sem overflow horizontal.
- Layout de cadastro desktop revisado em captura de página completa. Nenhuma credencial
  pessoal foi digitada; nenhum CAPTCHA resolvido ou senha alterada no navegador.

Páginas privadas/primeiro acesso com sessão real, edição admin por teclado e layout com
dados autenticados continuam sem execução por falta das contas/Rules/serviço. Capturas
locais públicas não comprovam isolamento no Firestore. O aviso de chunk grande permanece
registrado; não se ocultou warning ou introduziu atualização de stack para eliminá-lo.

## Critérios de sucesso

| Critério | Estado | Evidência / trabalho restante |
| --- | --- | --- |
| SC-001 | Parcial | Guards locais e visitante no navegador; login/restauração/troca A/B reais pendentes |
| SC-002 | Bloqueado real | Criação idempotente implementada e teste SDK preparado; concorrência real não executada |
| SC-003 | Parcial | Validações/replay/orçamento locais passam; persistência e CAPTCHA reais pendentes |
| SC-004 | Bloqueado real | Admin/datas/versão e testes preparados; falta papel e contas reais dedicadas |
| SC-005 | Bloqueado real | Outbox/Brevo/cron implementados; nenhum remetente/aceite/inbox confirmado |
| SC-006 | Bloqueado real | Arquivo Rules e matriz SDK preparados; regras ativas desconhecidas |
| SC-007 | Parcial | Abort antes de configuração/fixtures e validação de manifesto passam; execução/limpeza reais não realizadas |
| SC-008 | PASS local | Ignore, rastreamento, exemplos vazios e auditoria do bundle; revisar secrets operacionais no provisionamento |
| SC-009 | PASS documental | Distinção explícita de código, publicação inexistente, testes locais e bloqueios |
| SC-010 | Parcial | Código não cria conta nem usa assinatura para autorizar; confirmação ponta a ponta pendente |
| SC-011 | Parcial | Guards locais bloqueiam pendência/estados desconhecidos; ciclo real/duas abas pendentes |
| SC-012 | Bloqueado real | Endpoint/tela/recibo/logout implementados; credencial provisória→nova no projeto real não testada |
| SC-013 | Parcial | Falha parcial, senha atual e barreiras cobertas localmente; negações reais e recuperação no Firebase pendentes |

## Cobertura dos requisitos

| Requisitos | Implementação/evidência |
| --- | --- |
| FR-001–FR-002 | client.ts singleton/validação, allowlist Vite, ambiente preservado |
| FR-003–FR-007 | auth/profileRepository, SessionProvider, SessionGate e descarte integral após logout |
| FR-008–FR-011 | domínio/formulário, Turnstile, API transacional e recibo sem conta automática |
| FR-012–FR-015 | AdminGate/adminRepository, papel manual, paginação/datas/versão e Rules |
| FR-016–FR-019 | notifications.ts, outbox/cron/Brevo e destino fixo; canal real bloqueado |
| FR-020–FR-022 | firestore.rules, firestore.indexes.json, firebase.json e nota de mudanças; não publicados |
| FR-023–FR-025 | harness A/B/visitante, alvo/runId, grupos opt-in e cleanup delimitado |
| FR-026–FR-028 | mensagens sanitizadas, erro por campo, nenhum segredo no frontend, recepção protegida |
| FR-029–FR-034 | primeiro_login/cutoff protegidos, protocolo/lease/recibo, recuperação incerta e novo login |

## Pendências para ativação e conclusão

T024, T035, T045, T052, T053, T062, T070, T071, T073, T074 e T077 permanecem abertos por
incluírem execução/inspeção do ambiente real ou telas autenticadas ainda indisponíveis.
O código e os testes preparatórios correspondentes existem; não marcar etapas remotas como
concluídas. O restante é verificado por fontes, arquivos locais e comandos acima.

Próxima execução exige contas dedicadas A/B, alvo independente, IAM/secrets, Turnstile,
remetente Brevo verificável, medição Free e inventário/snapshot/publicação autorizada de
Rules/índices. Restaurar o papel de teste manualmente ao estado anterior. Não limpar dados
preexistentes, papéis/contas Auth ou contadores globais. Backup remoto ainda não existe
localmente e deverá ser obtido antes de qualquer substituição; rollback deve manter o gate
de primeiro acesso. Nunca tratar flags editáveis ou metadata Auth como prova da troca.

Hooks: `.specify/extensions.yml` ausente; nenhum hook pré/pós executável registrado.

## Complemento: encaminhamento ao WhatsApp (FR-035)

Constituição 1.2.0 registra o pedido explícito de encaminhar ao número +55 (68) 99973-9841.
RegistrationPage aguarda o recibo do serviço, preserva a rota de confirmação e só então
chama a navegação externa. Em erro ao salvar, não encaminha. O recibo mantém link manual
caso o navegador impeça a abertura ou o cliente volte. Texto fixo informa interesse em
cadastro no LilicaFinancy para organizar finanças; não recebe CPF, email ou dados do formulário.
O cliente confirma o envio no WhatsApp. Nenhuma mensagem foi enviada nesta alteração.
Código de email/outbox/Brevo não foi alterado; aviso continua independente do navegador.

Typecheck, lint e build passaram após a mudança; aviso de tamanho do chunk permanece.
Sem teste ponta a ponta do redirecionamento após cadastro real, pois a infraestrutura
continua pendente conforme orientação do responsável. Não foi publicado serviço ou regra.
T079/T080 concluídos: 69 de 80 tarefas no total; as 11 pendências remotas originais mantidas.
