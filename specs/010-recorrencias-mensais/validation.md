# Validação010 — estado após retomada autorizada

## Resultado atual

T001–T006 concluídas na construção local; T007 PENDENTE de prova após tentativas autorizadas retornarem HTTP503 UNAVAILABLE. T008–T060 não iniciadas. Nenhuma regra ativa, índice, fixture financeira ou migração foi alterada. Não houve publicação.

## Correção do bloqueio anterior

A composição inicial com J separado somava21 chamadas no mínimo de assinatura. O redesenho preserva capacidadeItem no próprio O (fonte única compra/item), mantém G obrigatório e recíproco, delega ready ao R novo e elimina leituras transacionais redundantes. A regra revalida cartão ativo no commit. O fechamento de ciclo preservado em O vem de F e não substitui G como autoridade de pagamento/história.

Materializar assinatura passa a16 e revisar uma futura a18 na aritmética sem cache. O antigo21 permanece como teste de rejeição.26 perfis cobrem mínimos de criação/geração, confirmar virtual/persistido, editar/mover cartão, revisão/same-boundary, pular/cancelar/encerrar, pagar/receber/reverter, inicializarG e coordenar vencimento006. Opções maiores podem ser recusadas integralmente; candidato inicial aceita uma O e intervalo ocupado de revisão futura de até um mês, com projeção até12 meses.

G inclui calendarioVersion; inicialização exige F preexistente idêntica pré/pós e protocolo certificado, sem inferir zero de query vazia. Ajuste006 exige G recíproco e não permite reusar recibo antigo. Itens008 do novo tipo precisam resolver capacidade em O; formatos007/encargos conservam suas autoridades. Nada foi habilitado por essa decisão documental. Detalhes em remediation.md e contracts/security.md.

## Artefatos reproduzíveis

Executar na raiz:

```powershell
node --test scripts/validate-recorrencias-budget.test.mjs
node scripts/validate-recorrencias-budget.mjs
node scripts/build-recorrencias-rules.mjs
node scripts/build-recorrencias-rules-cases.mjs
node scripts/validate-recorrencias-candidate.mjs
npm run lint
```

Resultados efetivos:10/10 testes do verificador passaram; aritmética26 perfis sem falha mínima no novo desenho; candidata82766 bytes gerada; suíte327 casos sintéticos (189 ALLOW,138 DENY) construída. Checker lexical e integridade passou:129 funções, profundidade conservadora10, sem função desconhecida, duplicação de helper/caso/mock ou desbalanceamento; hashes de fonte-base/candidata e suíte registrados. Maior fixture positiva JSON4278 bytes não prova todos os inputs. Lint passou sem avisos.

Testes foram escritos antes das respectivas funções: primeira execução falhou por módulo inexistente; extensão intervaloFuturas falhou por export ainda ausente; após implementar, dez testes passaram. Cobrem18/8, excesso19, escrita9, total21 descartado, novo16/18, meses ausentes, corte na próxima revisão e rejeição de13 meses. Não são testes financeiros ou compilador de Rules.

Manifesto da candidata declara constructionComplete, não aprovação. local-validation.json mantém compiler NOT_RUN, expressions NOT_MEASURED e allInputSizeBound NOT_PROVEN. A candidata tem guarda conservadora de texto/esquemas e orçamento por ramo, ainda sujeitos à prova real. Não tratar negativa por falta de mock/limite/expressões como validação semântica.

## Avaliação oficial e autorização

Runner scripts/evaluate-recorrencias-rules.mjs preparado. Sem --authorized-source-disclosure ele não importa provedor operacional nem faz rede; gera status AWAITING_EXPLICIT_SOURCE_DISCLOSURE_AUTHORIZATION. Essa proteção foi executada com --smoke:9 casos selecionados,0 requisições completas, compilador/publicação NOT_RUN. A tentativa autorizada posterior está registrada abaixo.

O sinalizador abaixo só deve ser usado depois de autorização explícita de envio da fonte completa e fixtures sintéticas para firebaserules.googleapis.com com a sessão operacional local existente:

```powershell
node scripts/evaluate-recorrencias-rules.mjs --smoke --authorized-source-disclosure
node scripts/evaluate-recorrencias-rules.mjs --authorized-source-disclosure
```

Destino fixado: projects/lilicafinancy:test. Sem criar ruleset/release ou escrever dados financeiros. RULES_EVALUATION_PROVIDER pode indicar provedor operacional autorizado do mesmo escopo; não pode contornar destino/restrição. Erros não copiam credenciais/headers/detalhes arbitrários do provedor aos relatórios. Publicação e SDK requerem autorização/configuração próprias, não decorrem de sucesso da avaliação.

T007 só conclui com fonte compilada, positivos/negativos válidos, orçamento efetivo por ramo, bytes/expressões e harmonização. SDK futuro confirma atomicidade/concorrência/snapshot de verdade. Os mocks individuais usam contraparteR obrigatória para ready; não são prova de execução de transação inteira.

## Ambiente, fixtures e entrega futura

Windows/PowerShell, Node v25.8.1, npm11.18.0, package.json private:true/engines>=24.12.0. .gitignore cobre dependências,build,coverage,logs,temporários,.env,credenciais e.integration. Sem publicação npm/Docker/ESLint/Terraform/Helm nova exigida; lint é oxlint. Nenhuma dependência instalada/atualizada. Git preservado.

Projeto esperado lilicafinancy; futuro grupo recorrencias deve abortar projeto divergente/UIDs repetidos antes de escrita. A/B/admin/pendente com UIDs distintos e visitante sem login. Manifesto lista runId/projeto/UIDs e caminhos S/V/O/R/M,G/F/cadastros usados/criados, sem senhas/tokens. Limpeza somente por inventário e autorização específica; apagar pai não remove filhos. Não há seed automático.

Antes de habilitar ponte006, adaptar faturasRepository para gravar contraparteG/calendarioVersion e integrar leitores/read models008 do item010. Rollback bloqueia comandos novos e conserva leitura/fatos/tombstones. Nenhuma disponibilidade de pagamentos008 foi presumida; T034/T037 continuam dependências reais.

Hooks before_implement/after_implement ausentes. Não executados typecheck/build/SDK financeiro desta feature, pois nenhum código de produto010 foi habilitado; nenhuma dessas verificações foi anunciada aprovada. A continuidade para T008 está condicionada ao gateT007 conforme tasks.md.

## Avaliação autorizada em 20/10/2026

O usuário autorizou explicitamente o envio da candidata completa e fixtures sintéticas para firebaserules.googleapis.com, com a sessão operacional existente, somente para avaliação. A autorização permanece válida nesse escopo.

Tentativas do smoke de nove casos, de uma única fixture e de compilação da candidata sem fixtures retornaram HTTP503 UNAVAILABLE. Uma regra sintética mínima de negação total foi aceita pelo mesmo endpoint/sessão. Isso demonstra conectividade, mas não distingue indisponibilidade transitória de falha do serviço provocada pela complexidade da candidata. Nenhuma compilação da candidata ou resultado semântico foi obtido. rules-evaluation-summary.json registra EVALUATION_UNAVAILABLE, status503 e codeUNAVAILABLE; zero respostas de avaliação válidas, compiler NOT_RUN e deployment NOT_RUN.

O runner foi corrigido para conservar status HTTP e código de erro enumerado, sem copiar mensagens arbitrárias, headers ou credenciais. A revisão automática rejeitou um diagnóstico opcional que enviaria separadamente a fonte-base privada; essa tentativa não foi executada e não houve contorno. A comparação foi abandonada sem ampliar o escopo autorizado.

T007 permanece PENDENTE e T008–T060 permanecem não iniciadas conforme o checkpoint impeditivo. Não classificar HTTP503 como reprovação de caso mínimo nem como aprovação de Rules. Retomar pelo smoke autorizado; depois avaliar a suíte completa e provar os demais limites exigidos antes de marcar T007. Verificação sintática do runner e git diff --check passaram após a correção do diagnóstico.
