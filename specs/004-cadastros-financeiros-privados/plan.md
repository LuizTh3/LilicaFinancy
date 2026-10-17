# Implementation Plan: Cadastros financeiros privados

**Branch**: Git real `develop`; contexto lógico Spec Kit `004-cadastros-financeiros-privados` | **Date**: 2026-10-17 | **Spec**: [spec.md](spec.md)

**Input**: Especificação 004 e clarificação A: pagamento/recebimento novo exige conta efetiva ativa, preservando conta prevista arquivada. O BRANCH do setup é o contexto lógico da feature, não comprovação de checkout Git.

## Summary

Implementar CRUD privado de titulares, categorias, contas e etiquetas, com formulários simples, paginação e arquivamento irreversível no mínimo. Reutilizar autenticação/primeiro acesso da 002 e domínio financeiro da 003. Não criar cadastros no login nem conceder acesso a titulares.

Persistência sob users/{uid}, validada por coleção nas Rules. Cada comando cadastral grava atomicamente o documento e um recibo imutável, ligado à entidade e versão, para repetição segura após resposta perdida. Controles separados e protegidos de primeiro uso bloqueiam natureza da categoria e tipo/base da conta sem varredura de consumidores. Nesta feature nenhum consumidor financeiro está habilitado, portanto o cliente não cria esses controles; sua transição futura exige testemunha consumidora e orçamento próprios.

Saldo inicial é posição manual datada opcional, sem lançamento automático nem cálculo/confirmação de saldo bancário. Pagamentos, recebimentos, cartões e recorrências permanecem negados até suas features. Rules completas e índices serão entregues na implementação; não são publicados por este plano.

## Technical Context

**Language/Version**: TypeScript ~6.0.2, strict; Node >=24.12.0; npm 11.18.0, conforme package.json. Não atualizar dependências por esta feature.

**Primary Dependencies**: Firebase 13.0.0 modular, React/ReactDOM ^19.2.8, react-router 7.18.4, Vite ^8.3.0 e Vitest 4.1.12 existentes. Nenhuma dependência nova. Context7 e referências oficiais consultados em research.md.

**Storage**: Firestore Standard, seis subcoleções permitidas: quatro cadastros, operacoesCadastros e usoCadastros. Esta última tem get próprio e nenhuma escrita cliente. Cache de dados somente em memória, já configurado; comandos online via transação, listas/leitura de confirmação remotas.

**Testing**: Vitest local para domínio, mapeadores, estado e contratos; suíte pequena remota pelo cliente Auth real para autorização. Estender grupo de integração e manifesto para caminhos exatos de quatro segmentos, sem emuladores. Não executar integração sem preflight/projeto/contas/rules confirmadas.

**Target Platform**: Web responsiva desktop/celular, pt-BR, fuso do perfil atual America/Rio_Branco.

**Project Type**: Aplicação web existente, sem novo backend ou serviço financeiro.

**Performance Goals**: Uma página remota de até 50 cadastros por consulta; nenhuma leitura de histórico para abrir cadastros. Meta de interface: estado de envio exibido imediatamente e criação válida em até dois minutos conforme SC-001; medição remota registra ambiente/rede, sem inventar SLA de disponibilidade.

**Constraints**: Nomes 1–120 caracteres, centavos 0..9.007.199.254.740.991, datas 1900–9999 não futuras; duas escritas por comando, até oito acessos documentais de Rules no par de escritas, até doze incluindo reserva de autorização de leituras da transação e até cinco por escrita como margem conservadora. Documento <=32 KiB e comando <=1 MiB internos, bem abaixo dos limites oficiais; schemas fechados. Até cinco etiquetas em consumidores futuros, sem promessa de que todas as combinações cabem no orçamento.

**Scale/Scope**: Quatro histórias, 22 FR, sete SC; quatro telas de listagem/formulário e contratos protegidos de seis coleções. Paginação sem limite artificial total de cadastros; recibos um por alteração, nunca array crescente. Sem busca global, compartilhamento, reativação, exclusão física, saldo atual, reconciliação ou API externa nova.

## Constitution Check

Gates avaliados antes da pesquisa e novamente após o desenho, sob constituição 1.2.0.

| Gate | Antes da pesquisa | Após desenho |
| --- | --- | --- |
| I — domínio independente | Passa: reutilizar núcleo 003 | Passa: validadores/portas puros; SDK somente em infrastructure, React em features. |
| II — fonte de verdade | Passa: saldo inicial não é lançamento | Passa: cadastro é autoridade atual; recibo é confirmação histórica, sem totais financeiros editáveis. |
| III — isolamento | Passa: UID da sessão | Passa: own + ready, referências construídas no UID, sem bypass admin nem caminhos livres. |
| IV — simplicidade e cotas | Passa: stack existente | Passa: duas escritas, orçamento detalhado, paginação; sem backend, Blaze ou novo serviço. |
| V — segurança na entrega | Passa: contrato de Rules obrigatório | Passa no desenho: schemas por coleção, recibos recíprocos e controles negados ao cliente; publicação/testes remotos ainda não executados. |
| Dinheiro e calendário | Passa: núcleo existente | Passa: magnitude/posição, base manual, data canônica e dia remoto no fuso fixo; sem saldo confirmado. |
| Testes sem emulador | Passa: projeto real autorizado | Passa: guia com A/B/visitante e papéis extras; fixtures/limpeza restritas, sem interpretar doubles como prova remota. |
| Entrega incremental | Passa: só cadastros | Passa: novas finanças negadas; protocolo de consumidor é requisito de integração futura, não permissão antecipada. |

Nenhuma exceção constitucional nova. O desenho atual cabe no orçamento estimado; a implementação deve compilar/verificar as Rules e executar a matriz remota quando autorizada antes de afirmar validação. Controles futuros de primeiro uso não são liberados parcialmente para simular prova de integridade.

## Project Structure

### Documentation (this feature)

```text
specs/004-cadastros-financeiros-privados/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── cadastros.md
│   └── security.md
└── checklists/requirements.md
```

O comando termina na fase de desenho. tasks.md será gerado por $speckit-tasks.

### Source Code (repository root)

Layout proposto, não arquivos de implementação já entregues:

```text
src/domain/finance/
  cadastros.ts / cadastros.test.ts
  contracts/cadastros.ts / cadastros.contract.test.ts
src/infrastructure/firebase/
  cadastrosRepository.ts / cadastrosRepository.test.ts
  cadastrosMapper.ts / cadastrosMapper.test.ts
src/features/cadastros/
  CadastrosPage.tsx
  CadastroForm.tsx
  cadastroState.ts / cadastroState.test.ts
src/app/router.tsx                         # rotas dentro de SessionGate
src/app/AppShell.tsx                       # link Cadastros
src/shared/styles/global.css              # estilos funcionais existentes
firestore.rules                           # arquivo completo, preservando 002
firestore.indexes.json                    # arquivo completo, preservando índices anteriores
docs/firestore-rules-changes.md
vitest.integration.config.ts              # grupo cadastros
tests/integration/cadastros.integration.test.ts
tests/integration/support/manifest.ts      # validar filhos explicitamente
tests/integration/support/manifest.test.ts
scripts/cleanup-integration.mts            # filhos inventariados antes de eventual pai
```

**Structure Decision**: Estender módulos existentes com funções e contratos específicos das quatro entidades, união discriminada e serialização restrita. Não criar CRUD genérico para qualquer coleção. O domínio recebe relógio, versões e IDs explícitos. Reutilizar Resultado, money/calendar, SessionGeneration e o cliente Firebase único. Não alterar o serviço trusted-api para armazenar finanças.

## Design and Delivery Sequence

1. Modelar entradas/saídas e erros puros, base e versões; compatibilizar estado persistido com estadoCadastro do SnapshotAlvo sem alterar semântica da 003.
2. Entregar Rules completas, recibos/controles e índices conforme contracts/security.md. Preservar perfil/cutoff/admin e testar negações; sem implantação automática.
3. Implementar repositório transacional, confirmação por recibo e mapeamento validado; testes de disputa, repetição e resposta perdida executados contra o repositório concreto, além do double de contrato. Consulta de confirmação distingue comandoCompleto de descritor sem capacidade de escrita.
4. Integrar telas/rotas e estados acessíveis conforme contracts/cadastros.md; limpar estado por UID/geração.
5. Estender preflight/manifesto, fixtures exatas e dry-run de limpeza; executar verificações locais e, quando disponíveis as condições autorizadas, matriz remota/manual descrita no quickstart.

## Post-design Validation

Pesquisa resolveu idempotência, data local nas Rules, referências, bloqueio por uso, paginação e incompatibilidades com testes existentes. Sem decisões de produto pendentes. Provas executáveis, publicação e integração pertencem à implementação e serão reportadas separadamente.

O bloqueio base/tipo após uso é validável com controles de teste preparados por operação restrita; isso não comprova o protocolo de um consumidor financeiro inexistente. A liberação de cada consumidor futuro exige o par de Rules, atomicidade e orçamento concretos. Em especial, não reutilizar o desenho ingênuo da 003 para séries ou arbitrários oito vínculos.

## Complexity Tracking

Nenhuma violação constitucional. Duas coleções auxiliares têm finalidade delimitada: recibos para confirmação/idempotência e controles irreversíveis para primeiro uso. Evitam varreduras, dados financeiros auxiliares ou backend; não autorizam infraestrutura genérica de operações.
