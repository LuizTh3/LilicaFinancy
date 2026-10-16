<!--
Sync Impact Report
- Versão: modelo sem versão adotada → 1.0.0 (adoção inicial).
- Princípios substituídos: os cinco espaços reservados do modelo foram preenchidos por:
  I. Lógica financeira independente da interface;
  II. Uma fonte de verdade e rastreabilidade;
  III. Isolamento real entre usuários;
  IV. Simplicidade e uso dos recursos gratuitos;
  V. Segurança faz parte da entrega.
- Seções adicionadas: propósito e autoridade; referências e limites de escopo;
  regras financeiras obrigatórias; persistência e arquitetura; contrato de Firestore Rules;
  testes sem emuladores; interface mínima e qualidade; desenvolvimento orientado a
  especificações; referências consultadas.
- Governança: substituição do espaço reservado por procedimento de alteração,
  versionamento semântico e revisão de conformidade.
- Seções removidas: nenhuma seção normativa anterior; comentários de exemplo removidos.
- Impacto: especificações, planos, tarefas, implementações e revisões devem observar esta
  constituição em tempo de execução. Templates e comandos não foram modificados.
- Datas: primeira adoção registrada em 2026-10-16, data desta solicitação.
- Pendências/TODOs: nenhuma lacuna constitucional. Decisões de especificação explicitamente
  exigidas pelo texto permanecem para as respectivas funcionalidades.
-->

# Constituição do aplicativo de controle financeiro

## 1. Propósito e autoridade

Recriar o aplicativo para substituir o processo manual da planilha financeira fornecida,
preservando o acompanhamento de receitas, compras, parcelas, faturas, despesas fora dos
cartões e compromissos futuros. Priorizar correção da lógica, persistência e isolamento
entre usuários. O frontend inicial será funcional e simples, preparado para redesenho sem
reescrever regras financeiras.

Esta constituição governa especificações, planos, tarefas, implementação e revisões.
Toda IA que trabalhar no projeto deve lê-la antes de propor alterações. “Deve” indica
requisito obrigatório. Exceções exigem decisão explícita do responsável e registro do motivo.

A planilha é referência de necessidades, não um modelo de banco de dados nem garantia de
correção de fórmulas. Não copiar erros ou transformar suas colunas mensais em campos fixos
no Firestore.

## 2. Referências e limites de escopo

### 2.1 Processo de origem

A aba ATT 3.0 contém cartões de diferentes bancos e titulares, compras parceladas e à vista,
despesas fora do cartão, empréstimo, energia, internet, totais de faturas, salários,
diferença mensal, vencimentos e anotações. Distingue mês dos gastos e mês do pagamento e
atravessa a virada do ano.

O aplicativo deve representar essas necessidades por registros estruturados. Nomes pessoais,
bancos e descrições da planilha não devem ser fixados no código. O ano dos lançamentos deverá
ser informado na migração; nomes de meses isolados não permitem inferi-lo com segurança.

### 2.2 Mobills como referência funcional

Usar o Mobills como referência de organização: visão geral mensal, receitas, despesas,
categorias, contas e cartões. Adaptar os fluxos às necessidades deste projeto, sem copiar
marca, textos, identidade visual ou presumir equivalência com todos os recursos do produto.

A referência não autoriza ampliar o escopo para integrações bancárias, serviços financeiros
ou funcionalidades comerciais.

### 2.3 Primeira versão

Inclui:

- Autenticação e múltiplas contas de usuário com dados privados.
- Cadastro de titulares, categorias e contas de pagamento simples.
- Receitas avulsas e recorrentes, previstas e recebidas.
- Despesas avulsas, recorrentes e parceladas fora dos cartões.
- Cartões por banco e titular, com fechamento e vencimento.
- Compras à vista no cartão, parcelamentos, faturas e pagamentos.
- Empréstimos representados por compromissos e parcelas informados manualmente.
- Cadastro de parcelas já em andamento.
- Projeção mensal, visão de vários meses e consulta do histórico.
- Observações e agrupamento opcional de despesas por etiqueta/projeto.
- Correção, cancelamento e arquivamento com preservação de consistência.

Ficam fora: ferramentas educativas, simulador de compras, orçamento por categoria, metas,
reservas, score financeiro, Open Finance, IA, WhatsApp, notificações externas, investimentos,
aplicativo nativo e compartilhamento familiar. Categorias são classificações; não implicam
orçamento. A projeção de compromissos continua no escopo por fazer parte do processo original.

## 3. Princípios fundamentais

### I. Lógica financeira independente da interface

Cálculos de valores, datas, parcelas, recorrências, faturas e projeções devem existir em
funções e serviços de domínio testáveis, independentes dos componentes React e do SDK Firebase.

A interface apresenta resultados e coleta dados. Repositórios encapsulam acesso ao Firestore.
Evitar abstrações genéricas desnecessárias, duplicação de fórmulas em telas e dependência de
bibliotecas visuais no domínio.

### II. Uma fonte de verdade e rastreabilidade

Todo total deve ser rastreável aos seus lançamentos. Não manter totais editáveis que disputem
autoridade com os registros de origem. Agregados persistidos, se necessários, devem ter
estratégia documentada de consistência e reconstrução.

Separar obrigação prevista de pagamento realizado. Não marcar pagamentos automaticamente
apenas porque chegou o vencimento. Cancelamentos e estornos devem ter efeitos explícitos e
diferentes de uma quitação.

### III. Isolamento real entre usuários

Firebase Authentication identifica o usuário pelo UID. Cada usuário acessa exclusivamente
seus dados, inclusive em consultas diretas fora da interface. Filtrar na tela não é mecanismo
de autorização.

Titular financeiro é diferente de usuário autenticado: um usuário pode administrar cartões de
vários titulares sem conceder acesso a eles. Dois usuários podem cadastrar titulares de mesmo
nome, com registros independentes.

Nesta versão, “múltiplos usuários” significa contas privadas independentes. Compartilhamento
entre logins depende de especificação futura de permissões e não pode ser ativado implicitamente.

### IV. Simplicidade e uso dos recursos gratuitos

Stack: React, Vite e TypeScript; Firebase Authentication e Cloud Firestore. Não incluir Cloud
Functions, backend próprio, serviços pagos ou dependência de faturamento habilitado sem
mudança expressa do escopo.

A meta é operar nas cotas gratuitas, não prometer capacidade ilimitada. Documentar configuração
necessária e comportamento quando cotas ou conectividade impedirem uma operação. Não inventar
limites: consultar a documentação oficial quando definir parâmetros.

### V. Segurança faz parte da entrega

Autorização e validação de dados devem existir nas Security Rules, além da validação para
experiência do usuário. Negar acessos não previstos por padrão. Nunca liberar o banco inteiro
para destravar desenvolvimento ou testes.

## 4. Regras financeiras obrigatórias

### 4.1 Dinheiro e datas

- Representar BRL em centavos inteiros; não usar ponto flutuante como autoridade para somas
  e divisão de parcelas.
- Distribuir o resto dos centavos de forma determinística e documentada. A soma das parcelas
  deve corresponder ao total informado.
- Armazenar competência mensal com ano e mês, e datas financeiras como datas de calendário,
  sem deslocamento acidental por UTC.
- Separar data de compra, competência de planejamento, vencimento e data de pagamento.
- Usar timestamps para criação e atualização técnica; configurar fuso do usuário, inicialmente
  America/Rio_Branco.
- Tratar virada de ano, fevereiro e dias inexistentes. Quando o vencimento configurado não
  existir no mês, usar o último dia, permitindo ajuste explícito.

### 4.2 Receitas e despesas fora do cartão

Registrar descrição, valor, categoria, datas, situação e observação opcional. Associar titular
e conta quando aplicável. Receitas previstas só entram no realizado após confirmação do
recebimento.

Despesas fora do cartão incluem pagamentos imediatos e obrigações futuras. A especificação
deve definir o tratamento de pagamentos parciais; se não implementados, a interface deve
bloqueá-los explicitamente, sem registrar quitação falsa.

### 4.3 Cartões, compras e faturas

- Identificar cartão por nome, banco e titular. Não armazenar número completo, CVV ou
  credenciais bancárias.
- Uma compra em uma parcela no cartão pertence a uma fatura; não equivale a saída imediata
  por Pix ou dinheiro.
- Cada parcela pertence a exatamente uma fatura identificada por cartão e ano/mês.
- Sugerir primeira fatura a partir da compra e do fechamento, exibindo a sugestão para
  correção. Definir e testar a regra para compras no dia do fechamento.
- Permitir selecionar explicitamente a primeira fatura, pois o processamento do emissor
  pode divergir da previsão.
- Alterar fechamento ou vencimento do cartão não pode mover silenciosamente o histórico
  já confirmado.
- Controlar faturas abertas/fechadas e seu pagamento separadamente. Atraso deve decorrer
  de vencimento e saldo pendente.
- Pagamentos parciais devem manter saldo pendente quando suportados. Juros e encargos serão
  lançados manualmente; não inventar taxas ou quitar a diferença automaticamente.
- Arquivar um cartão impede novas compras, mas preserva faturas e parcelas pendentes.

### 4.4 Proibição de dupla contagem

No planejamento por mês de pagamento, somar parcelas/compras destinadas às faturas daquele
mês e despesas externas uma única vez. Não somar novamente a fatura por cima de seus itens.

Na visão de caixa realizado, considerar pagamentos e recebimentos efetivos. Pagamento de
fatura liquida uma obrigação; não cria uma segunda despesa de consumo.

A visão por categoria usa itens de despesa, não repete pagamentos de faturas. Cada relatório
deve indicar a base temporal utilizada. Transferências entre contas próprias não são receitas
nem despesas.

### 4.5 Parcelamentos e empréstimos

Registrar valor total ou saldo de parcelas restante, quantidade de parcelas, valor por parcela
quando conhecido, primeira competência e vínculo de origem.

Na migração, permitir “próxima parcela 5 de 10” e gerar apenas as seis restantes. Não recriar
pagamentos anteriores nem inferir que o passado foi quitado sem informação do usuário. Se o
total original for desconhecido, preservar essa ausência.

Empréstimos serão cadastrados com valores e cronograma conhecidos; não oferecer cálculo de
amortização não especificado. Compras parceladas, empréstimos e recorrências devem ter
identidades distintas.

Editar uma série exige escolher entre ocorrência atual e futuras ainda não pagas, com prévia
do impacto. Registros quitados não podem ser reescritos silenciosamente.

### 4.6 Recorrências

Suportar receitas, assinaturas e contas recorrentes de valor fixo ou estimado, com início,
frequência mensal e fim opcional. Permitir confirmar um valor diferente para uma ocorrência
sem modificar o histórico.

Como não haverá processamento agendado no servidor, gerar ocorrências de modo idempotente ao
abrir o período ou por ação explícita. A projeção deve incluir ocorrências virtuais ainda não
persistidas sem duplicar as já existentes. Não prometer geração em segundo plano com o
aplicativo fechado.

### 4.7 Projeção e resumo

Exibir, por mês:

- Receitas previstas e recebidas.
- Faturas por cartão, com detalhamento de parcelas e compras em uma parcela.
- Despesas fora dos cartões.
- Total de compromissos, valores pagos e pendentes.
- Resultado previsto: receitas previstas menos compromissos previstos.

Um compromisso pago continua compondo o total planejado/realizado apropriado; não deve
desaparecer e aumentar artificialmente a sobra.

Oferecer visão de 12 meses navegável para outros períodos. Não limitar registros ao ano civil
nem ao intervalo da planilha. Resultado mensal é diferente de saldo bancário: não chamá-lo de
saldo disponível. Saldo de conta exige saldo inicial e movimentações completas.

## 5. Persistência e arquitetura

Adotar uma estrutura inicial sob `users/{uid}`, com coleções de domínio como titulares,
contas, categorias, cartões, compras, parcelas/obrigações, faturas, pagamentos e recorrências.
Os nomes finais e relações serão definidos na especificação de dados; não armazenar toda a
vida financeira em um documento ou array crescente.

Toda referência deve apontar para entidade do mesmo usuário. Regras devem proteger
propriedade, tipos, campos permitidos, faixas válidas e campos imutáveis. Não permitir troca
de proprietário. Referências cruzadas relevantes devem ser validadas nas rules quando viável.

Operações dependentes precisam de transações, lotes ou protocolo de recuperação explícito.
Criação de parcelas e recorrências deve resistir a duplo clique, duas abas e repetição após
falha de rede. Usar identificadores estáveis e chaves de idempotência por operação/ocorrência.

Definir limites operacionais e recuperação para séries que excedam uma operação atômica.
Não deixar séries parciais aparentarem estar concluídas.

Consultar por usuário e intervalo necessário. Usar paginação e índices documentados, evitando
listeners sobre todo o histórico. Não baixar dados de outros usuários. Descartar estado e
assinaturas ao sair ou trocar de conta. Escritas ainda pendentes de confirmação não devem ser
apresentadas como concluídas.

Arquivar cadastros referenciados; excluir ou cancelar lançamentos somente com tratamento
explícito das dependências. Mudanças de esquema precisam de versão e plano de migração.

## 6. Contrato obrigatório para Firestore Rules

Sempre que uma implementação exigir mudança nas regras:

1. Atualizar e entregar o arquivo textual completo `firestore.rules`, pronto para revisão
   e publicação.
2. Não entregar apenas trechos no chat, descrição informal ou instrução para o usuário
   montar as regras.
3. Entregar também uma nota em Markdown, por exemplo `docs/firestore-rules-changes.md`,
   explicando motivo, coleções afetadas, permissões, validações, testes e instruções
   de publicação.
4. Se houver novos índices, entregar `firestore.indexes.json` completo e instruções
   correspondentes.
5. Preservar regras existentes que continuem necessárias e registrar incompatibilidades.
6. Informar claramente se o arquivo foi apenas gerado ou se houve publicação e verificação.
   Não afirmar que rules locais já estão ativas.
7. Manter versão anterior para reversão e coordenar mudanças incompatíveis com o código.

Não publicar regras automaticamente apenas porque foram geradas; seguir a autorização vigente
do responsável. Nunca usar permissão global de leitura/escrita como solução temporária.

Esta constituição não contém rules executáveis: elas serão geradas com o primeiro esquema
implementado, evitando uma proteção fictícia para coleções ainda indefinidas.

## 7. Testes sem emuladores

Não instalar, configurar ou exigir Firebase Emulator Suite. Integrações e testes ponta a ponta
usarão o projeto Firebase real indicado pelo responsável, inclusive o ambiente chamado de
produção.

Isso não elimina testes unitários locais de funções puras: cálculos, datas e regras de domínio
devem ser testados sem conexão ao Firebase e sem emular seus serviços.

### 7.1 Disciplina no projeto real

- Usar contas de teste dedicadas e dados fictícios.
- Identificar fixtures por execução e manter todos os seus registros sob UIDs de teste
  conhecidos.
- Confirmar o projectId configurado antes de executar uma suíte de integração; abortar se
  não corresponder ao alvo declarado.
- Usar o SDK cliente autenticado para validar Security Rules. Admin SDK não comprova que
  as rules estão corretas.
- Testar usuário A, usuário B e acesso não autenticado, incluindo leitura, listagem,
  criação, atualização e exclusão indevidas.
- Não executar carga massiva, exclusão global ou seed automático na inicialização do app.
- Limpar apenas os registros da execução ou UIDs de teste explicitamente selecionados;
  listar escopo e quantidade antes de exclusões amplas.
- A intenção de limpar o banco no futuro não autoriza apagar dados agora. A limpeza geral
  deve ser uma ação separada e explícita.
- Lembrar que exclusão de documento pai não é estratégia suficiente para limpar
  subcoleções; incluir seus registros no procedimento.
- Credenciais de testes ficam fora do repositório e dos logs. Chaves administrativas
  nunca entram no frontend.

Rules publicadas no projeto real afetam o ambiente inteiro. A suíte deve ser pequena e
direcionada; uma conta separada isola registros, não isola a implantação das regras.

### 7.2 Casos mínimos de aceitação

- Dois usuários não conseguem acessar ou alterar dados um do outro.
- Cartões de mesmo banco e titulares distintos não têm faturas misturadas.
- Parcela iniciada em dezembro continua corretamente em janeiro do ano seguinte.
- Divisão de R$ 100,00 em três parcelas preserva R$ 100,00 no total.
- Importação manual da parcela 5/10 cria seis obrigações futuras.
- Repetição de criação não duplica parcelas nem recorrências.
- Compra em uma parcela aparece na fatura correta.
- Pagamento da fatura não duplica despesas.
- Energia estimada pode receber valor definitivo sem alterar outros meses.
- Arquivar cartão mantém parcelas pendentes.
- Cancelamento, edição de série e falha de rede preservam totais e histórico.
- Comparação de um conjunto revisado da planilha com os totais do aplicativo reconcilia
  valores ou documenta divergências.

Registrar o que foi efetivamente testado, os resultados e as limitações. Não declarar testes
aprovados quando faltarem acesso, credenciais ou rules publicadas.

## 8. Interface mínima e qualidade

Criar uma aplicação web responsiva para desktop e celular com navegação simples: visão mensal,
lançamentos, cartões/faturas, recorrências/parcelamentos e cadastros.

Priorizar tabelas legíveis, formulários, filtros por período/titular/cartão/categoria e
mensagens claras de erro, carregamento e vazio. Confirmar ações destrutivas e exibir impacto
de alterações em séries.

Evitar animações, design exclusivo, dashboards ornamentais e bibliotecas redundantes.
Economia visual não permite omitir acessibilidade básica, rótulos, navegação por teclado ou
feedback de persistência.

## 9. Desenvolvimento orientado a especificações

Sequência sugerida:

1. Fundação, autenticação, isolamento e primeira entrega das rules.
2. Cadastros, receitas e despesas.
3. Cartões, fechamento, compras, parcelas e faturas.
4. Pagamentos, recorrências, empréstimos e migração de parcelas.
5. Projeção mensal, reconciliação com a planilha e acabamento funcional.

Cada especificação deve definir escopo, entidades, regras de negócio, impacto nas rules/índices,
cenários de aceitação e limitações antes da implementação. Decisões financeiras ambíguas
precisam ser registradas; não esconder hipóteses no código.

Entrega concluída exige código tipado, build e verificações aplicáveis, cálculos testados,
persistência confirmada quando houver acesso ao ambiente, isolamento verificado e arquivos
de rules/índices quando alterados. Caso uma verificação esteja bloqueada, informar o bloqueio
em vez de declarar a funcionalidade validada.

Importação automática de XLSX não é requisito inicial. A migração pode ocorrer por cadastro
assistido/manual com conferência de totais, evitando inferências sobre anos, pagamentos e
anotações incompletas.

## 10. Governança

Mudanças de escopo ou princípios devem atualizar versão e data desta constituição, com resumo
do impacto nas especificações existentes. Alterações incompatíveis de segurança, multiusuário
ou modelo financeiro exigem revisão explícita. Correções editoriais não autorizam mudanças
funcionais.

Toda alteração deve registrar sua justificativa e o impacto sobre especificações, planos e
tarefas existentes. Exceções devem identificar a decisão explícita do responsável e seu motivo.
Especificações, planos, tarefas, implementações e revisões devem verificar conformidade com
esta constituição; incompatibilidades devem ser registradas e resolvidas antes de declarar a
entrega concluída.

A versão segue o formato MAJOR.MINOR.PATCH:

- MAJOR: remoção ou redefinição incompatível de princípios ou regras de governança.
- MINOR: inclusão de princípio, seção ou ampliação material das orientações.
- PATCH: esclarecimentos, correções editoriais ou ajustes sem mudança funcional.

A data de ratificação registra a adoção original; a data de última alteração deve ser
atualizada a cada revisão. Datas devem usar o formato ISO `YYYY-MM-DD`.

## Referências consultadas

- Planilha fornecida: PLANILHA ANUAL-1 (3) (1).xlsx, aba ATT 3.0. Reconhecimento estrutural;
  fórmulas e valores não foram auditados integralmente.
- [Mobills, organização funcional](https://www.mobills.com.br/blog/mobills/como-utilizar-o-mobills/).
- [Firebase, cotas](https://firebase.google.com/docs/firestore/quotas).
- [Firebase, transações e lotes](https://firebase.google.com/docs/firestore/manage-data/transactions).
- [Firebase, regras básicas](https://firebase.google.com/docs/rules/basics).

As referências orientam o projeto; as decisões específicas acima pertencem a esta constituição.

**Version**: 1.0.0 | **Ratified**: 2026-10-16 | **Last Amended**: 2026-10-16
