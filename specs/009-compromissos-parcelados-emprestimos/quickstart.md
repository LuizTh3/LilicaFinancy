# Quickstart: Validação da feature009

Este é um guia para a implementação futura. O desenho foi corrigido para agregado finito; G1/G2 continuam pendentes de prova executável; ainda não há tela/adapter009 ou perfil remoto aprovado. Não interpretar os comandos abaixo como testes desta funcionalidade já executados ou prontos para passar. Não publicar Rules por executar este guia.

## Pré-requisitos e gate obrigatório

1. Conferir o desenho finito e executar validate-design-budget.ps1; traduzir/avaliar Rules conforme T005–T007 e atualizar plan.md/research.md. Demonstrar caso5/10, máximo nominal, edição em lote e substituição mínima, ou registrar rejeições operacionais justificadas sem eliminar os fluxos obrigatórios.
2. Implementar contratos/modelos com agregado finito e eventos próprios de data-model.md, sem alterar schema005, testes e adaptadores; entregar arquivos completos de Rules/índices e nota de mudanças. Não liberar por teste simulado.
3. Node>=24.12.0 e npm11.18.0. Instalar lock do repositório sem atualizar versões por iniciativa desta feature.
4. Teste remoto exige projeto explicitamente autorizado, contas dedicadas A/B/admin sem propriedade/primeiro acesso pendente e credenciais fora de logs/repositório. Nenhuma publicação ou escrita em dados reais integra este planejamento.

## Verificações locais

Executar na raiz do repositório:

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run dev
```

Esses scripts existem em package.json. Após implementar009, npm test deve incluir testes novos de domínio, contrato, mapper e estado de interface; as verificações atuais isoladas não comprovam009. Para ciclos direcionados, usar o filtro real dos arquivos criados, sem adicionar scripts fictícios. Domínio financeiro não pode importar SDK Firebase ou componentes visuais.

## Roteiros de aceitação

| Roteiro | Ação | Resultado verificável |
| --- | --- | --- |
| Completa uniforme | Total das obrigações R$100,00, N3, início2026-12-31 | Valores33,34/33,33/33,33, soma100,00, fevereiro28, sem pagamento/entrada |
| Em andamento | P5,N10, valor200,00, próximo2026-12-31 | Seis obrigações5..10, soma1200,00, original ausente, nenhuma posição1..4 criada |
| Cronograma explícito | 5/7 110,00 em2026-12-15;6/7 95,50 em2027-02-03;7/7 80,00 em2027-02-20 | Soma285,50, mesmas datas/valores, nenhum preenchimento de janeiro ou taxa |
| Pagamento por parcela | Pagar60 e140 de obrigação200 com contas/datas próprias | Dois fatos, pendência140 depois0; excesso negado, planejamento não duplica |
| Reversão de erro | Reverter um pagamento integralmente e tentar repetir | Original preservado, uma inversão, data/conta originais, pendência reaberta, repetição sem duplicação |
| Edição isolada | Mudar valor/vencimento de uma parcela elegível | Só selecionada muda, identidade/ordinal preservados e prévia coincide |
| Mensal futuras | Nova data da selecionada2027-01-31; posição protegida intercalada | Elegíveis seguem fevereiro28/março31 por ordinal; protegida fica igual, sem compactar intervalos |
| Explícito futuras | Informar novas datas de duas posições e conservar terceira | Apenas datas informadas mudam, sem propagação; competência não muda sozinha |
| Histórico protegido | Parcela quitada, parcial e outra com fatos revertidos | Nenhuma editável; cancelamento só da que não possui líquido válido |
| Substituição | Cancelar alvos elegíveis e criar série nova manual com motivo | Tudo junto ou nada, cadeia explícita, sem transporte de pagamentos/receita |
| Receita explícita | Cadastrar série; depois criar/vincular receita, depois receber | Cadastro sozinho não cria entrada; cada ação tem confirmação própria; mesma receita não é duplicada |
| Falha de vínculo | Receita criada, erro antes da confirmação de vínculo | Receita continua acessível, vínculo pendente explícito; retomar vínculo não cria receita nova |
| Limites | N13,P12; quantidade fracionária; zero por parcela; soma fora da faixa; orçamento excedido | Rejeição integral com limite/campo, nenhum subconjunto persistido |
| Recuperação | Duplo clique, duas abas, resposta perdida, mesma chave/conteúdo diferente | Uma intenção confirmada, IDs originais, conflito se conteúdo difere, sem chave nova automática |
| Disputa | Pagamento concorrente com prévia de edição/cancelamento | Uma versão prevalece; operação obsoleta conflita e exige nova prévia |
| Projeção | Competência e pagamento em meses distintos, inclusive ano seguinte | Planejamento por competência, caixa por data real; nenhuma série somada sobre parcelas |
| Paginação | Mais de50 posições entre séries, filtro que deixa página vazia, cursor antigo | Consumir páginas brutas até fim; total parcial identificado, cursor incorreto recusado |
| Usabilidade | Cinco participantes, celular/desktop, teclado | Pelo menos quatro completam5/10 em até3min e distinguem original/soma/pagamentos/ausência de entrada inferida |

Testar também centavo único, N1,N12, P=N, máximo monetário, fevereiro bissexto, anos1900/9999, referência arquivada retida/substituída e mudança de sessão durante envio. Em lote, incluir item protegido fora/entre elegíveis e ordem de datas que se torna inválida; rejeitar sem movê-lo.

## Integração real após implementação e autorização

A configuração atual reconhece grupos até liquidacoesFaturas; não reconhece parcelados. Implementação deve acrescentar grupo parcelados em tests/integration/support/environment.ts, sua matriz de cinco clientes, fixture/manifesto por execução e seleção de arquivo no vitest.integration.config.ts antes do comando abaixo. Caso contrário, falhar fechado em TEST_INTEGRATION_GROUP, sem alegar ausência de testes como aprovação.

Preparar .env.integration local, sem credenciais versionadas, seguindo docs/externos-test-setup.md e helpers existentes. Exigir TEST_EXPECTED_PROJECT_ID=VITE_FIREBASE_PROJECT_ID e TEST_RUN_ID único; incluir TEST_USER_A/B/ADMIN/PENDING_* com UIDs distintos e visitor sem login. TEST_RULES_CONFIRMED=yes só depois de confirmar versão/hash das Rules realmente ativas; não usar o sinalizador como autorização de publicar.

```powershell
$env:TEST_INTEGRATION_GROUP = 'parcelados'
npm run test:integration
```

Executar testes pequenos e sequenciais com SDK cliente autenticado, nunca Admin para provar Rules. Antes do teste: confirmar projeto-alvo e escopo do manifesto. Avaliação oficial de Rules deve validar as mutações adversariais de contracts/security.md; avaliação oficial e integração remota têm registros separados. Não testar lançamentos pessoais nem criar seed na abertura do aplicativo.

Matriz: A permite próprios comandos habilitados; B/visitor/admin sem propriedade/primeiro acesso pendente são negados para leitura e escrita diretas. Incluir operações sem cada dependência e falsificação de versão, saldo, ordinal, recibo, pagamento e vínculos. Medir orçamento real de expressões/acessos por perfil e manter rejeição de perfis não comprovados. Não presumir que índices locais já foram publicados.

## Evidência e limpeza

Guardar comandos executados, versão do código, hash das Rules/índices, projectId esperado, runId, IDs fictícios exatos, orçamento por caso, resultados e limitações, sem tokens/senhas. Não declarar testes remotos se faltarem acesso/configuração/gates. Contratos de dados, eventos e projeções devem reconciliar centavos e pendência com registros da execução.

Limpeza somente pelo manifesto da execução/UIDs dedicados, com inventário e escopo explícitos. Não excluir registros desconhecidos, não fazer limpeza global nem apagar série pai esperando remover dependências. Rollback é coordenado entre leitores e Rules, preserva fatos009; não restaura um arquivo incompatível mantendo escrita nova habilitada.

## Estado desta entrega documental

Artefatos gerados e revisados; testes de implementação, compilação/avaliação de Rules, publicação, integração e aceitação de usuários009 não executados. Hooks before_plan/after_plan ausentes. Gates de prova executável permanecem pendentes e impedem anunciar habilitação integral. A contagem local do novo grafo não é avaliação oficial de Rules.

## Validação específica da correção

Executar na raiz: & './specs/009-compromissos-parcelados-emprestimos/validate-design-budget.ps1'. O script confere aritmética de48 combinações de referências para cada comando estrutural e os limites18/8/32; não mede expressões, bytes reais nem compila Rules. Testar em T005–T007 mapa incompleto/extra, competencias divergentes, serialização por série, segundo vínculo e semAlteracao. A revisão atual invalida prévia após qualquer pagamento na série, mesmo em outra posição. Paginação física de séries deve produzir no máximo50 linhas lógicas sem perder slots no cursor.


## Aceitação adicional do replanejamento

| Caso | Resultado esperado após implementar |
| --- | --- |
| Referências no cronograma explícito | Valores/datas/competências variam por linha; referências novas são comuns e as Rules rejeitam patch inconsistente com o orçamento |
| Filtro local raro | No máximo duas páginas físicas por ação; resultado pode ser vazio com cursor e completo=false, sem afirmar mês vazio |
| Corte em posição intermediária | Retomar mesma série no ordinal seguinte e mesmo snapshot sem perder/repetir linhas |
| Snapshot vazio/expirado | Obter readTime de resposta vazia; cursor após50min exige recarga integral do recorte; nunca juntar snapshots |
| Histórico fora da ordem de revisão | Ordenação visual por timestamp não autoriza reconstrução; cadeia de versões deve ser contígua e única antes de concluir auditoria |
| Leitor fechado | Coleção/prefixo/filtro não permitido e cursor de outro usuário/geração são recusados; ID token preserva avaliação pelas Rules |
| Pagamento concorrente em outra parcela | A versão global muda; a prévia antiga conflita e exige nova conferência |

Adicionar testes em src/infrastructure/firebase/parceladosSnapshotReader.test.ts para allowlist, consultas ARRAY_CONTAINS, readTime exato, consulta vazia, expiração e troca de sessão. Testes de parceladosQueries devem verificar páginas físicas/lógicas, filtros locais e completude. Auditar eventos por versões expected/result, inclusive duas transições de substituição, recusando lacunas e duplicatas antes de anunciar reconstrução completa.

Planejamento documental está concluído. As instruções de candidato/avaliação e SDK continuam pré-requisitos para habilitação e não foram executadas por esta fase. Não alterar credenciais, publicar Rules ou marcar tarefas de implementação concluídas pelo comando plan.
