# Contract: Autorizações, Rules e perímetro confiável

Este é o contrato de desenho. A implementação deve entregar firestore.rules textual
completo e nota de mudanças/publicação/reversão, não apenas trechos deste documento.

## Predicados

- own(uid): token autenticado e UID igual ao caminho.
- ready(uid): perfil schema suportado, primeiro_login=false, cutoff válido e
  auth_time * 1000 estritamente posterior a passwordChangeCompletedAt.toMillis().
- adminReady: ready do próprio UID e admins/{uid}.enabled=true no documento atual.
- Perfil sem flag, schema/cutoff inválido ou documento ausente nunca satisfaz ready.

## Matriz de operações do SDK cliente

| Caminho | get | list | create | update | delete |
| --- | --- | --- | --- | --- | --- |
| users/{uid} | Somente own, inclusive mínimo pendente | Negado | own, campos exatos, true e timestamps de servidor | Negado nesta feature | Negado |
| admins/{uid} | Próprio UID ready | Negado | Negado | Negado | Negado |
| registrationRequests/{id} | adminReady ou ready com applicantUid próprio confirmado | Somente adminReady, limit ≤25 | Negado | Negado | Negado |
| subscriptions/{id} | adminReady | Negado; detalhe por ID | adminReady, referência existente e campos válidos | adminReady, versão +1 e diff permitido | Negado |
| notificationOutbox/{id} | adminReady por ID | Negado | Negado | Negado | Negado |
| firstLoginOperations/{uid} | Negado | Negado | Negado | Negado | Negado |
| submissionOperations/{id} | Negado | Negado | Negado | Negado | Negado |
| operationBudgets/{key} | Negado | Negado | Negado | Negado | Negado |
| Demais documentos/subcoleções, inclusive financeiros | Negado | Negado | Negado | Negado | Negado |

Coleções explicitamente permitidas não abrem suas subcoleções. Pode haver wildcard final
somente para negar; nunca autorização recursiva permissiva para caminhos futuros.
Admin não pode obter users de terceiros ou escrever seu próprio papel pelo app.

## Validação de dados nas Rules

- Perfil novo: uid/path/auth consistentes; schemaVersion=1; timezone permitido; true;
  createdAt/updatedAt=request.time; nenhum campo extra ou cutoff escolhido pelo cliente.
- Perfil é mínimo para que get pendente não exponha CPF/telefone ou dados de terceiros.
- Assinatura: chaves exatas, requestId/path corretos e pedido existente; strings ISO de
  datas reais, incluindo dia do mês e ano bissexto, fim ≥ início; updatedBy=auth.uid;
  timestamps de servidor; createdAt imutável; version inicial 1 e incremento unitário.
- update só altera datas, version, updatedBy e updatedAt; não permite substituir referência.
  Transação cliente e condição de versão nas Rules detectam concorrência.
- Papel manual não é promovido por nome, email, parâmetro de URL ou campo editável.
- Consultas respeitam limite e possível propriedade; Rules não são filtros de resultados.

Funções de validação puras terão testes locais; Rules serão avaliadas com SDK autenticado
no projeto real. Se alguma validação não for expressável/compatível com Rules, não remover
proteção silenciosamente: redesenhar a escrita confiável antes da entrega.

## Serviço privilegiado

O Worker tem credencial de serviço Google dedicada, restrita por IAM às operações
necessárias e sem papel amplo Owner/Editor. Essa credencial não está sujeita às Rules;
consequentemente, rotas/caminhos e validações explícitas no serviço são obrigatórios.
Nenhum endpoint recebe path, query arbitrária, UID alvo, flags, papel ou delete genérico.

Cadastro: só quatro campos normalizados, Turnstile e orçamento; grava pedido/op/outbox.
Primeiro acesso: somente UID do token, conta ativa e operação controlada; a flag false
vem de sucesso Auth do serviço seguido de commit, nunca de promessa do cliente.
Cron: apenas outbox de notificações pendentes; não percorre perfis ou registros financeiros.

Credenciais administrativas não entram em VITE_, documento Firestore ou fixture versionada.
Se IAM não limitar coleções, registrar essa superfície residual e não anunciar isolamento
por Rules para o serviço; testes de endpoints devem demonstrar a restrição por código.

## Publicação e reversão

1. Inventariar regras/índices realmente ativos com acesso autorizado e salvar versão anterior.
2. Gerar firestore.rules completo, firestore.indexes.json completo e
   docs/firestore-rules-changes.md, com a matriz e procedimentos exatos.
3. Revisar incompatibilidades antes de publicar; não apagar regras remotas desconhecidas
   apenas porque não existem localmente. Não abrir dados para destravar teste.
4. Publicar somente conforme autorização vigente; criação local não equivale à publicação.
5. Confirmar projeto/versão ativos e executar A/B/visitante com cliente real.
6. Registrar o que foi gerado, publicado e verificado; rollback precisa preservar a exigência
   de primeiro login e não reabrir dados por uma regra antiga incompatível.

Nenhuma publicação, leitura remota de dados ou instalação de extensão ocorre nesta fase.
