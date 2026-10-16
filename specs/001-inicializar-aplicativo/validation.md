# Validação da implementação

Data: 2026-10-16.

## Inventário inicial — T001

- Diretório continha somente `.agents/`, `.git/`, `.specify/` e `specs/`.
- Sem aplicativo, package.json, lockfile, README, .gitignore ou arquivos .env preexistentes.
- Node v25.8.1; npm 11.18.0; Git existente na branch develop.
- Nenhum .env/.env.* rastreado; nenhuma credencial encontrada na raiz.
- Checklist requirements.md: 16/16 concluídos, nenhum pendente.
- Constituição 1.0.0 e artefatos de especificação/plano lidos antes de mudanças.
- Nenhum extensions.yml: hooks não se aplicam.

As próximas seções registrarão somente evidências efetivamente coletadas.

## Seleção de ferramentas — T002–T004

- Gerador oficial publicado: create-vite 9.2.1, executado sem instalação automática em
  `.scaffold-financy/`; arquivos revisados integrados na raiz.
- Registros públicos npm consultados diretamente em 2026-10-16 após consulta Context7.
- Template publicado usa React 19, Vite 8, plugin React 6, TypeScript ~6.0.2 e Oxlint 1.
- Preservados os intervalos publicados pelo template; não foi adotado TypeScript 7 somente
  por ser latest. Versões resolvidas exatas serão registradas com o lockfile.
- create-vite/Vite/plugin React/Oxlint: Node ^20.19.0 || >=22.12.0; npm 11.18.0:
  ^20.17.0 || >=22.9.0. Piso de projeto adotado: ^22.12.0 || >=24.0.0.
- Vitest 4.1.6 verificado no registry: Node ^20.0.0 || ^22.0.0 || >=24.0.0;
  peers Vite ^6 || ^7 || ^8. Escolhido para evitar major que exclui Node 25.
- TypeScript 6.0.2 exige Node >=14.17; tipos React e React DOM do template têm peers compatíveis.
- Referências: https://vite.dev/guide/ ; https://registry.npmjs.org/create-vite/9.2.1 ;
  https://registry.npmjs.org/typescript/6.0.2 ; https://registry.npmjs.org/vitest/4.1.6 ;
  https://oxc.rs/docs/guide/usage/linter/config.html ; https://vitest.dev/guide/ .
- Acesso de rede no sandbox falhou por DNS; consultas e instalação necessárias usaram
  execução autorizada fora dessa restrição. Sem mudança de runtime ou uso de force.

## US1 — T005–T011

- npm install --engine-strict: sucesso, 27 pacotes, zero vulnerabilidades reportadas.
- npm ci --engine-strict: instalação reproduzida com sucesso pelo lockfile.
- Build TypeScript/Vite: sucesso sem .env e com ambiente vazio, parcial e completo.
- Dev http://127.0.0.1:5173 e preview http://127.0.0.1:4173 abertos em Chromium 155.0.8059.80.
- Quatro estados: ausente, vazio, parcial e completo, com valores fictícios; em cada um,
  página aberta e recarregada nos dois servidores. Aviso correto, sem pageerrors/console.error
  nas páginas isoladas e sem requisições Firebase/Firestore/Google APIs.
- Dev reiniciou a configuração ao detectar mudanças em .env; preview recebeu novo build
  para cada estado. Arquivo local final restaurado com quatro valores vazios.
- Condição do ambiente: navegador injeta script do antivírus Kaspersky no host
  gc.kis.v2.scr.kaspersky-labs.com. Essa requisição não pertence à aplicação; não foi
  desativada nem foi alegada ausência absoluta de tráfego de terceiros do navegador.
- Primeira navegação falhou com os servidores restritos pelo sandbox; servidores locais
  foram reiniciados em execução autorizada, permitindo a validação real no navegador.
- A matriz usou páginas novas por servidor e capturou erros/rede em abertura e recarga.

## US2 — T012–T016

- Shell com header, nav acessível, main e footer; links únicos: salto e Início.
- Chromium 155.0.8059.80 em dev e preview, viewports 360x800 e 1280x800.
- Em todas as quatro combinações, scrollWidth = largura da viewport: sem rolagem horizontal.
- Tab alcançou o salto visível; Tab seguinte alcançou Início; Shift+Tab retornou ao salto;
  Enter colocou foco em main. Início ativado por Enter e recarga preservaram a home.
- lang pt-BR, um main, um h1, destinos corretos e zero pageerrors nos ensaios.
- Assets/CSS de demonstração removidos apenas após ficarem sem uso; caminhos absolutos
  de src/assets e public conferidos dentro do workspace antes de remover.

## Ferramentas finais — T017–T020

- Vitest configurado em ambiente Node, sem suítes artificiais, DOM ou cobertura.
- Oxlint JSON preserva regras do template e inclui jsx-a11y/correctness; deny-warnings.
- strict e noEmit explícitos em app e ferramentas; vite/vitest configs incluídos nos tipos.
- READMEs de domínio/infraestrutura documentam responsabilidades, sem código especulativo.
- Instalação inicial de Vitest 4.1.6 reportou dois avisos moderados relacionados a
  @vitest/mocker, GHSA-82fw-gwwq-j7x9. Aplicado somente patch Vitest 4.1.12, após confirmar
  Node ^20 || ^22 || >=24 e peers Vite ^6 || ^7 || ^8. Instalação final: zero vulnerabilidades.
- Versões diretas resolvidas: React/React DOM 19.3.1; Vite 8.3.4; plugin React 6.1.2;
  TypeScript 6.0.3; Oxlint 1.88.0; Vitest 4.1.12; tipos Node 24.19.2;
  tipos React/React DOM 19.3.0. npm ls --depth=0 sem peers inválidos.
- Engines presentes no lockfile revisados: conjunto aceita Node 22.12.0 e Node 25.8.1.
  Piso de projeto ^22.12.0 || >=24.0.0 mantido; execução real realizada apenas no Node 25.8.1.

## Verificações finais de qualidade — T021

| Verificação | Resultado |
| --- | --- |
| npm run typecheck | Código 0 |
| npm run lint | Código 0, sem warnings |
| npm run build | Código 0; 19 módulos; distribuição local gerada |
| npm test | Código 0; nenhum arquivo de teste encontrado; runner preparado |
| npm ls --depth=0 | Sem dependências/peers inválidos |

Nenhum JavaScript ou source map emitido em src. Não há testes financeiros nesta entrega.

## Ambiente e controle de versão — T022–T025

- .env e .env.example conferidos: exatamente quatro nomes esperados, valores vazios.
- git ls-files para .env/.env.* não retornou arquivo rastreado; não foi necessária remoção do índice.
- git check-ignore --no-index confirmou .env, .env.local, .env.production, node_modules,
  dist, coverage, logs, diretório e padrões de credenciais, além dos artefatos locais do navegador.
- .env.example não ignorado (código 1 esperado na consulta específica).
- Nenhum SDK Firebase, chamada de rede, localStorage/sessionStorage ou asset remoto no código.
- README cobre seis scripts, preparação segura do ambiente e publicidade de VITE_.
- Nenhum arquivo de credencial preexistente foi alterado; .env local foi criado nesta execução.

## Revisão e conclusão — T026–T029

- README, scripts e lockfile consistentes com os contratos; quickstart atualizado para
  refletir a implementação concluída. Nenhuma mudança funcional de especificação.
- npm ci --engine-strict final: 56 pacotes, zero vulnerabilidades reportadas e SHA256
  do package-lock.json idêntico antes/depois. Instalação validada no runtime informado.
- Screenshots desktop e móvel inspecionados visualmente; layout legível, sem sobreposição.
  Evidências locais em `.playwright-mcp/lilica-financy-desktop.png` e
  `.playwright-mcp/lilica-financy-mobile.png`, ignoradas pelo Git.
- Matriz de ambiente executada antes do acabamento do shell; o acabamento não adicionou
  consumidor de env nem SDK. O build e a inspeção de navegação foram repetidos após essa
  mudança. Não houve motivo para repetir toda a matriz inalterada.
- Scaffold temporário removido após conferir exatamente o caminho absoluto
  C:/Projetos/LilicaFinancy/.scaffold-financy dentro do workspace.
- Material rastreado anterior preservado: git diff --name-only sem alterações em arquivos
  previamente rastreados. Novos arquivos preparados para revisão, sem staging ou commit.
- Servidores de teste dev/preview encerrados ao terminar; iniciar com npm run dev.
- Não foram criados backend, emuladores, banco, rules/índices fictícios, deploy ou commits.
- Hooks antes/depois: ausentes, pois não há .specify/extensions.yml.

## Critérios de sucesso

| Critério | Resultado | Evidência |
| --- | --- | --- |
| SC-001 | PASS | npm ci reproduzível e execução pelos comandos README sem credenciais |
| SC-002 | PASS | 4 estados x dev/preview, abertura e refresh sem requisição Firebase |
| SC-003 | PASS | 360/1280, teclado, foco do salto e sem overflow; screenshots inspecionados |
| SC-004 | PASS | Somente Início e salto; ambos funcionais, nenhum destino futuro |
| SC-005 | PASS | Seis fluxos executados; verificações código 0; runner informa zero testes |
| SC-006 | PASS | .env não rastreado; exemplo não ignorado; quatro valores vazios |
| SC-007 | PASS | Comandos, resultados e limitações documentados neste registro |

## Limitações

- Execução verificada em Windows, Node 25.8.1 e Chromium 155.0.8059.80; não foi executada
  matriz em outras versões de Node, Firefox, Safari ou leitores de tela.
- O piso Node foi conferido pelos engines declarados, não por execução em Node 22.12.0.
- Runner disponível com zero testes de domínio, pois não há lógica financeira implementada.
- Não há alegação de persistência, autenticação, isolamento ou Security Rules validados.
- O navegador possui script injetado pelo antivírus local, conforme registrado na US1;
  a aplicação não o declara em seus assets e não realiza chamadas Firebase.
- Auditoria npm sem avisos na data da execução não é garantia de ausência futura de vulnerabilidades.
