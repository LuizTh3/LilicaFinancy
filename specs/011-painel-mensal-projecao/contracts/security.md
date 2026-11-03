# Contract: Segurança e entrega011

## Autorização e superfície

011 é leitura e projeção: não expõe comando financeiro, CRUD genérico ou gravação de resumo. Usuário pronto lê somente users/{request.auth.uid}; pendente/visitante não acessam fontes financeiras e admin não acessa dados de outro usuário. Permissões continuam nos caminhos de origem; filtro de interface/cursor não é autorização.

REST usa Firebase ID token da sessão, não OAuth administrativo/service account. Nunca incluir token em URL,cache persistente,relatório ou log. Validar projeto,db,UID,generation,coleção e ID do documento retornado, mesmo em batchGet. Verificar atual() em toda fronteira assíncrona; abortar controladores e limpar cache na invalidação. ReadTime não concede acesso que Rules atuais não permitam.

## Rules e orçamento de leitura

O arquivo raiz atual cobre005/006, não habilita automaticamente007–010. Não criar match wildcard financeiro ou liberação global para painel. Índices não concedem autorização. Quando habilitar dependências, entregar firestore.rules completo com permissões necessárias preservadas, nota de mudanças, fonte anterior/rollback e testes reais por caminho. Lista deve exigir limit inteiro1..50; get só caminhos próprios e perfil pronto.011 não adiciona allow write.

Consulta runQuery está sujeita ao limite oficial de10 acessos documentais da avaliação; multi-document read tem20 e limite aplicável por operação. Perfil interno mantém margem18/8 quando aplicável. Para cada tipo de batch, contar regras transitivas de ready/referências sem cache;8 IDs é teto do transporte, não prova de viabilidade. Reduzir lote se necessário ou negar perfil, sem remover verificações. Expressões <=1000; novas regras/metadados008 precisam compilação/avaliação própria. Nenhuma chamada administrativa comprova acesso de cliente.

A guarda de período e orçamento100/8HTTP está no adapter fechado; Rules atuais não comprovam todos os predicados temporais do client. Não afirmar que o banco impõe janela12 a qualquer consulta externa; ele deve impor UID/perfil e limite de lista. Testar consultas diretas maliciosas de outro UID e limites0/51/ausente. Revisar enforcement adicional viável sem transformar Rules em filtros de linhas.

## Integridade de fontes

- 007: validar compra/revisão e controle; não somar parcelas antigas de revisão supersedida.
- 008: controle schema2 e efeitos devem concordar; competenciasConsumo obrigatório, canônico e exato, com cardinalidade0/1 por variante conforme data-model.md. [] não equivale a campo ausente. Negar duas competências, omissão, mês adicional/incorreto e metadado forjado; compensações seguem o mês do efeito resolvido. Provar bytes,acessos,expressões e migração/compatibilidade antes de habilitar.
- 009: mapa da série é autoridade; ID de slot lógico tem parser próprio. Não criar cópia005 para facilitar relatório.
- 010: O de assinatura já contém compra/item/capacidade; G tem calendarioVersion. Harmonizar resolvedor008 e ponte006; controle ausente ou desconhecido nunca vira zero. S exige metadados de vigência virtual derivados e protegidos exatamente, sem poder ocultar série elegível por campo forjado; testar criação/encerramento, limites1900/9999 e legado sem índice. Persistidas são consultadas independentemente da vigência virtual. Projeção exige ausência confirmada e tombstones conservados.

Prontidão é por capacidade e evidência, não flag local isolada. Reconstrução divergente bloqueia total dependente e oferece relatório de integridade sem reparar/escrever ao abrir tela. Nunca converter evento reembolsado em receita categorizada por conveniência de relatório.

## Privacidade, observabilidade e operação

Somente logs estruturados de código de erro,fonte lógica,fase,contadores/latência e motivo de incompletude; sem nomes,descrições,valores,CPFs,UIDs reais,tokens ou payloads de documentos. Manifesto de teste contém projectId/runId/UIDs de teste/caminhos exatos e hashes pertinentes, guardado fora do frontend. Não criar telemetria externa.

Sem seed/backfill/limpeza automáticos. Publicação de Rules/índices e criação/remoção de fixtures requerem autorização vigente específica; a autorização anterior010 era somente avaliação de candidata010 e não amplia011. Teste real deve confirmar projeto e quatro UIDs distintos antes de conexão; visitante é quinto perfil. Limpeza somente inventário delimitado e autorização própria, incluindo subcoleções.

## Regressão e rollback

Limpeza de cache, handles, filtros, estado privado e aborto dos controladores deve integrar SessionProvider/financeSession na fundação, com testes de logout/troca de UID/generation/revogação antes de G0-local e qualquer MVP. G0-remoto acrescenta prova real concorrente durante carga/continuação/detalhe antes da habilitação do produto. US5 amplia a matriz de regressão; não adia essas proteções básicas.

Provar005/006 após extração do transporte;006 mantém prévia/comandos com dados atuais, não escreve usando snapshot011 antigo. Rollback da UI desabilita novas visões/adapters, preserva leitura/fatos das fontes publicadas. Não restaurar Rules antigas que deixem novas escritas sem controles. Nova metadata de índice008 requer readers compatíveis antes do rollout; legado não coberto permanece indisponível, sem migração implícita.

Plano atual não altera nem publica Rules/índices. Implementação deverá entregar arquivos completos se houver mudanças, status gerado/publicado/verificado separado e matriz A/B/admin/pendente/visitante por fonte, get/list/negações de escrita, snapshots e regressões.
