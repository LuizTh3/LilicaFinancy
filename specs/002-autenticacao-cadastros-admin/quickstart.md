# Quickstart: validação da autenticação e do cadastro real

Guia para a implementação futura. Os comandos adicionais e endpoints descritos ainda não
existem nesta fase de planejamento; nenhum resultado abaixo deve ser marcado como aprovado
antes da execução. Verificar [contrato de ambiente](contracts/environment.md) primeiro.

## 1. Preparação e gates

1. Incorporar à constituição as exceções já autorizadas, mantendo isolamento financeiro.
2. Conferir configuração local sem imprimir valores, runtime/engines e versões publicadas.
3. Preparar conta Google de serviço exclusiva, Worker Free, secrets e Turnstile; medir
   criptografia/cold start no plano gratuito antes de considerar o serviço operacional.
4. Preparar Brevo Free e remetente no-reply verificável; confirmar o destino fixo indicado.
   Se faltar conta/domínio ou sender compatível, registrar bloqueio, sem contratar/ativar pago.
5. Preparar contas A/B dedicadas existentes no Authentication; não pedir senha pessoal.
6. Declarar TEST_EXPECTED_PROJECT_ID e TEST_RUN_ID independentemente dos valores efetivos;
   suíte aborta se o projeto/UIDs não coincidirem antes de qualquer escrita.
7. Inventariar e salvar as Rules/índices ativos antes de sua substituição autorizada.
   Publicação segue autorização vigente, nunca é consequência automática de gerar o arquivo.

Não registrar, contratar, publicar ou enviar email apenas porque o guia contém os passos.
Não ativar Firebase Emulator Suite nem trocar o runtime do usuário automaticamente.

## 2. Instalação e verificações locais futuras

Na raiz, após existir o workspace de serviço e o lockfile atualizado:

```powershell
node --version
npm --version
npm ci
npm run typecheck
npm run typecheck:trusted-api
npm run lint
npm test
npm run build
npm run build:trusted-api
```

build:trusted-api faz bundle/dry-run sem publicação. Segredos não são necessários para
validar tipos/compilação. O comando unitário nunca executa integração real por descoberta
acidental: configurar includes/excludes para separar tests/integration.

Casos unitários mínimos com comportamento real: CPF inválido/repetido e normalização;
WhatsApp; datas de calendário/bissexto/intervalo; DTO com campos extras; transições de
sessão/primeiro acesso e descarte de respostas de geração antiga. Não criar testes de
existência, teste vazio ou simulador local de Firebase para produzir aprovação.

Confirmar .env ignorado, .env.example sem valores reais e secrets fora do bundle, logs e
repositório. Preservar o conteúdo anterior de .gitignore; adicionar somente os novos
arquivos privados do Worker/testes quando implementados.

## 3. Integração de configuração e sessão

Com ambiente real provisionado e Rules confirmadas, iniciar frontend:

```powershell
npm run dev
```

Abrir a URL impressa. Em cópia local controlada, testar ausência de cada campo obrigatório:
erro cita o nome ausente sem valor, não cria instâncias duplicadas nem tenta conexão parcial.
Restaurar configuração original sem imprimir ou versionar seus valores.

Login com A e B, refresh e URL privada direta: só aparece carregamento até resolver Auth,
perfil e primeiro acesso. Enquanto pendente não abrir app/admin. Logout limpa componentes e
listeners antes de aguardar signOut; depois navegação completa descarta cache de SDK.
Troca de UID não exibe dados/role da conta anterior, inclusive com resposta tardia de rede.

Perfil ausente: duas abas podem tentar iniciar; resultado é um único users/{uid} com true,
fuso e timestamps corretos. Perfil existente mantém createdAt e flags protegidas.
Nenhum registro financeiro é criado ou carregado nesta etapa.

## 4. Primeiro acesso e recuperação

Usar somente conta dedicada com credencial provisória e perfil true/ausente:

1. Entrar, verificar a tela com apenas Nova senha e Confirmar nova senha e ação de sair.
2. Testar vazio, divergência e senha atual: falha, sem concluir ou mostrar app/admin.
3. Confirmar nova senha válida: serviço valida e altera no Authentication, commit protegido
   grava false/cutoff e recibo. UI limpa campos, encerra sessão e exige novo login.
4. Aguardar o segundo de login indicado, autenticar com a nova. A provisória deve falhar.
5. Outra aba com sessão provisória não pode usar flag false para ler dados normais; refresh
   de ID token sem novo signIn também deve falhar nesse gate.
6. Tentativa direta do SDK de marcar false/criar perfil liberado é negada.
7. Em ambiente de teste controlado do serviço, provocar falha após Auth e antes do commit:
   flag continua true; entrar com a senha efetiva e escolher outra nova para concluir.
   Não liberar apenas por metadata Auth, não exigir provisória já inválida.
8. Se o commit ocorreu mas a resposta se perdeu, repetir mesma operação retorna conclusão
   sem trocar novamente a senha. Não repetir chamadas Auth depois de recibo concluído.

Injeção de falha deve existir somente no harness/ambiente de teste isolado do serviço, não
como parâmetro público para burlar segurança ou ferramenta de produção aberta a visitantes.
A nova senha de teste deve vir de secret local conhecido do operador, não de log público;
registrar a mudança da credencial dedicada no procedimento seguro do ambiente.

## 5. Solicitação pública e email

Preencher os quatro dados fictícios por navegador, com desafio Turnstile legítimo.
Não resolver/burlar CAPTCHA por script: se exigir interação humana, registrar a dependência
e aguardar ação do operador nesse passo. Não substituir validação em produção por test key.

- Validar CPF/telefone/email obrigatórios; máscara WhatsApp conforme contrato.
- Enviar e repetir mesma operação com novo desafio quando necessário: uma solicitação e
  uma outbox. Referência não permite get/list público de CPF/WhatsApp/email.
- Variar payload com mesma chave: conflito sem revelar conteúdo original.
- Ler no admin somente após pronto; pedido é recebido, não conta automaticamente criada.
- Verificar envio ao destinatário fixo com remetente validado e registro do provedor.
  accepted não é sinônimo de chegada à inbox; conferir ambos separadamente quando disponíveis.
- Testar falha/cota e abandono do navegador: outbox permanece e cron tenta recuperar.
- Timeout de envio além da janela de deduplicação vai para uncertain, sem reenvio automático.
  Reconciliar antes de qualquer envio adicional para evitar duplicação.

Executar uma única operação de email por conjunto de testes de deduplicação, com no máximo
duas notificações reais identificadas na execução inteira. Não realizar carga/seed massivo.
Registrar sender realmente aceito; não declarar um domínio fictício ou endereço no-reply
como configurado se o provedor o substituiu ou rejeitou.

## 6. Administração e datas informativas

Provisionar manualmente admins/{UID_A}.enabled=true, sem senha pessoal no chat e sem
conceder tal permissão ao cliente da suíte. Concluir primeiro login de A antes de usar admin.
B continua usuário comum; visitante permanece sem autenticação.

A consulta lista páginas delimitadas e abre detalhe; B/visitante não acessam por URL ou SDK.
Salvar início/fim válidos confirma no servidor, mantém dados originais e incrementa version.
Datas inválidas/fim anterior são rejeitados também em tentativa direta do cliente.
Duas edições simultâneas não se sobrescrevem silenciosamente: uma recebe conflito/recarrega.

Ausência, futuro e vencimento de assinatura não mudam acesso de B. Remover/desativar papel A
nega próxima operação e desmonta dados administrativos ao detectar a alteração/negação.
Admin não lê perfil B nem coleções financeiras, com ou sem papel existente.

## 7. Suíte real explícita

Com scripts implementados, secrets de teste locais e alvo confirmado:

```powershell
npm run test:integration
```

A suíte lê o alvo esperado independente, confere UIDs dedicados e identifica runId antes de
qualquer gravação. Usar instâncias cliente separadas para A/B/visitante, auth em memória,
sem persistência de documentos e sem emuladores. Falta de configuração aborta como bloqueio,
não como suíte verde sem executar cenários.

Matriz obrigatória get/list/create/update/delete:

- Perfil próprio: get/create permitido apenas conforme schema/true; update/delete bloqueados
  nesta feature; tentativas sobre perfil alheio sempre negadas, inclusive por admin.
- Flags/cutoff/schema/createdAt/papel: adulterações e criação liberada negadas.
- Admin: get/list paginado de pedidos e create/update validado de assinatura; B/visitante negados.
- Coleções financeiras, subcoleções futuras e caminhos internos de operações: sempre negados.
- Serviço: token de projeto errado/expirado, UID/campos injetados, quota, Turnstile inválido,
  replay divergente e comparação incorreta de senha retornam negação/erro seguro.

SDK cliente comprova Rules; testes de REST privilegiado comprovam apenas o serviço.
Não usar Admin SDK/credencial OAuth de servidor para anunciar aprovação de Rules.

## 8. Limpeza limitada e relatório

Não executar limpeza automática global. Um manifesto local ignorado registra runId, UIDs
dedicados responsáveis, IDs exatos criados e versões/timestamps de fixture. Registros
preexistentes não entram na limpeza. Listar coleções, IDs e quantidade antes de deletar.

scripts/cleanup-integration.mts, quando implementado, exige alvo/runId/UIDs allowlist e
manifesto escolhido explicitamente, começando em dry-run. Só remove os documentos da
execução e dependências identificadas; não usa prefixo amplo de coleção nem supõe que
apagar pai remove subcoleções. A credencial de limpeza é operacional separada, fora do
frontend; não criar endpoint público de limpeza no Worker.

Fixture pública sem UID autenticado fica atribuída ao runId/UID de teste responsável no
manifesto para limpeza, sem inventar propriedade do visitante. Manter essa exceção mínima
documentada na governança. Não limpar contadores globais compartilhados de tráfego como
se fossem fixtures exclusivas. Papel admin manual é restaurado pelo operador conforme
estado anterior, sem excluir conta Authentication ou papel preexistente automaticamente.

Registrar em validation.md: versões, comandos/resultados, runtime, origem/host, alvo
conferido, Rules/índices realmente ativos, matriz A/B/visitante, execução de primeiro acesso,
email aceito/inbox quando observado, cotas medidas, conflitos e limitações. Não registrar
valores de .env, senhas, tokens ou PII. Marcar SC-001–SC-013 individualmente, com bloqueio
explícito para dependências ou cenários sem execução.
