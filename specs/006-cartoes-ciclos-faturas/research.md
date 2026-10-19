# Research: Cartões e ciclos de faturas

Data: 2026-10-18. Pesquisa documental e leitura do repositório; não executa implementação, integração, publicação ou alteração de dados reais.

## 1. Base observada e decisões pendentes resolvidas

**Decision**: Estender a aplicação existente, mantendo React 19.2.8, Firebase 13.0.0, React Router 7.18.4, TypeScript 6.0.2, Vite 8.3.0 e Vitest 4.1.12, conforme package.json/package-lock. Usar domínio puro, portas específicas e adaptadores Firebase, sem dependências novas. Não usar o serviço confiável da 002 para finanças.

**Rationale**: Constituição 1.2.0 e estrutura já implementada. A 004 fornece titulares/cadastros; a 005 habilitou somente US1 de previsões avulsas, não pagamentos/correções. Essa entrega parcial não bloqueia cartões vazios, mas proíbe assumir suporte remoto a compras, parcelas ou pagamentos. O arquivo atual de Rules já está restaurado; a corrupção descrita no início do plano 005 é diagnóstico histórico, não tarefa repetida desta feature.

**Alternatives considered**: CRUD genérico de cadastros rejeitado: Colecao/catalog()/validContent só admitem quatro coleções; cartão tem identidade e calendário próprios. Backend financeiro e novos frameworks rejeitados por escopo e constituição.

Fontes locais: package.json; src/domain/finance; src/infrastructure/firebase/cadastrosRepository.ts; src/app/router.tsx; firestore.rules; specs/005-receitas-despesas-externas/validation.md, seção final US1.

## 2. Calendário por competência e coincidência no último dia

**Decision**: Definir a relação dos meses pelos dias originais: fechamento < vencimento → fechamento no mesmo mês da competência; caso contrário → mês anterior. Aplicar o ajuste de dia inexistente depois, separadamente. Igualdade de datas só é aceita com âncoras preservadas distintas, fechamento < vencimento nominal, e as duas datas ajustadas iguais ao último dia do mesmo mês. Dias configurados 31/31 continuam com fechamento no mês anterior.

**Rationale**: Decisão A do usuário na sessão de esclarecimento de 2026-10-18. invoiceCalendar.ts atualmente compara datas ajustadas e rejeita igualdade em validarCalendarioFatura. Isso produz março em vez de fevereiro para 30/31 e compra em 27/02/2027. calendar.ts já oferece avanço de competência, dias gregorianos e preservação de âncora; reutilizá-lo.

**Alternatives considered**: Mover a fatura por coincidência de datas ou rejeitar 30/31 foi descartado pela decisão humana. Aceitar qualquer fechamento=vencimento rejeitado: permitiria fabricar calendário que não corresponde ao cadastro/snapshot.

Harmonizar invoiceCalendar.ts, contracts/commands.ts, installments.ts, settlement.ts e doubles de séries. Contratos e documentação da 003 que exijam fechamento estritamente anterior devem apontar a especialização da 006; não recalcular dados históricos. Fixtures legadas seguem estritamente válidas, sem âncoras inferidas de datas truncadas.

## 3. Limites históricos, independência da ordem e sobreposição

**Decision**: Na confirmação de F(M), ler as faturas das competências M−2, M−1, M+1 e M+2 no estado anterior à operação, mesmo ausentes. Nas Rules, usar get para esses quatro vizinhos, não getAfter. Reutilizar fechamento de F(M−1) como início e início de F(M+1) como fechamento somente se o vizinho já existia e tinha snapshot válido antes da operação. Na ausência anterior, calcular pelo padrão do cartão no pós-estado validado, ainda que o vizinho seja criado no mesmo lote. Fixar limites na confirmação; o padrão novo não os reescreve.

**Rationale**: Só os vizinhos imediatos não bastam. Exemplo válido: outubro/2026 confirmado no padrão30/31 fecha em30/10 e vence em31/10; novembro ausente; após mudar o padrão para25/5, dezembro proposto começa em25/10, fecha em25/11 e vence em05/12. A proposta sobrepõe outubro. Impor também F(M−2).fechamento ≤ início e fechamento ≤ F(M+2).início. Testar a ordem inversa em execução independente: confirmar dezembro sob25/5, mudar para30/31 e tentar outubro. Cada calendário é individualmente válido, isolando a rejeição por sobreposição. O mês de fechamento deve ser M−1 ou M; o mês de início M−2 ou M−1. Essas janelas garantem separação de qualquer competência a distância ≥3.

**Correção C1**: Usar o pós-estado dos vizinhos permitiria origem circular: padrão10/17, outubro novo fecha12/10 e novembro novo inicia12/10; cada um alega herdar do outro. Pelo pré-estado ambos estavam ausentes, portanto a fronteira exigida é10/10 e o lote inventado é negado. O lote legítimo com10/10 é aceito, sujeito às demais invariantes e ao orçamento. Para vizinhos antigos, limites imutáveis garantem preservação; para dois novos adjacentes, ambos calculam a fronteira pelo mesmo padrão pós-estado do cartão. Para distância2 com intermediário antigo, seu início<fechamento separa os ciclos; sem intermediário antigo, ambos usam fronteiras-base mensais consecutivas. Assim, a prova cobre também lote direto sem confiar na restrição de uma intenção da interface.

**Alternatives considered**: Busca irrestrita em coleção dentro das Rules é inviável. Bloquear todas as mudanças de calendário seria restrição indevida. Documentos auxiliares de fronteira aumentariam escritas e superfície sem necessidade. Atualizar limites antigos silenciosamente viola snapshots.

Se os dois limites fixos e o vencimento não satisfizerem o contrato, bloquear a confirmação, mostrar conflito e permitir escolher outra fatura já válida. Não oferecer editor de fechamento histórico. Consulta retroativa segue as mesmas regras. Nas bordas 1900/9999 omitir apenas vizinhos realmente fora do domínio; se o próprio ciclo precisar de data fora dele, recusar o período.

## 4. Identidade comprovável remotamente

**Decision**: CartaoId é ID aleatório estável, validado por `[A-Za-z0-9-]{1,64}`; faturaId persistido é `cartaoId__YYYY-MM`. O UID pertence ao caminho. A identidade lógica é a tupla (cartão, competência), compatível com identidadeNatural da 003; o adaptador faz tradução explícita, sem aceitar IDs codificados como caminhos remotos livres. Rules comprovam concatenação e mês/ano.

**Rationale**: identidadeNatural produz base64url com prefixo k1_; Rules não devem confiar que esse texto corresponde à tupla fornecida. Formato legível, delimitador excluído do ID do cartão e imutabilidade permitem provar unicidade sem marcador extra. Não adicionar cartão à coleção contas ou coleções financeiras ao CRUD 004.

**Alternatives considered**: ID aleatório de fatura permitiria duplicação. Confiar em hash/base64 calculado apenas no cliente não prova unicidade remota. Subcoleção por cartão seria possível, porém coleção privada de faturas simplifica filtros/indexação e os contratos existentes de referências.

## 5. Escritas, recibos e orçamento

**Decision**: Cartão/fatura e evento-recibo imutável confirmam juntos. Cada primário guarda ultimoEventoId e versão, cada recibo declara alvo, comando normalizado, expectedVersion e resultVersion. O primário exige getAfter do recibo e a correspondência integral com sua transição; a regra do recibo exige getAfter do primário apontando exatamente para ele. Autorização do recibo é delegada exclusivamente a essa transição comprovada, sem segundo perfil. Timestamps sozinhos não são prova.

**Rationale**: Padrão de grafo recíproco já empregado pela 005. Reads antes dos writes e callbacks sem efeitos visuais, conforme documentação de transações. SDK repete callbacks e transação offline falha; identidade da intenção e IDs são criados fora dele. Recuperar recibo vem antes de testar atividade atual do cartão/titular, permitindo recuperar confirmação depois de arquivar.

**Alternatives considered**: Só botão desabilitado ou transação no cliente não impede escrita direta. Recibo editável permite reuso. Recibo com ID só por versão não protege reutilização da chave com outro conteúdo; usar tipo + operationKey nesta feature, com conteúdo completo e comparação exata, não hash livre.

Orçamento conservador detalhado em contracts/security.md: confirmação nova com sete leituras transacionais custa no máximo quinze acessos de Rules somando leituras e escritas; sete por escrita primária, duas mutações. A correção C1 substitui quatro getAfter por quatro get, sem somar leitura pré/pós de cada vizinho. Mantém limites internos da003(18 totais/8 por operação), além dos oficiais(20/10), sem pressupor cache. Lote direto de duas faturas e dois recibos tem16 acessos das escritas no desenho, sem as sete leituras transacionais da aplicação; logo o orçamento não é defesa contra origem circular. Número de expressões e aceitação/rejeição desses lotes precisam de prova oficial com fonte completa e execução real. Compilar não comprova execução.

## 6. Prévia, sugestões e consulta

**Decision**: Consulta é somente leitura; mostrar prévia rotulada e confirmar fatura vazia por ação explícita. Sugestão compara intervalos concretos. Buscar snapshots contendo a data com duas desigualdades e limite2; dois resultados já provam conflito, zero exige candidatos virtuais calculados pelo calendário atual, um exige verificar também candidatos não confirmados. Prévia nunca cria faturas automaticamente. Ao confirmar, reler dependências e recusar mudança desde a revisão apresentada.

**Rationale**: Uma janela fixa de doze parcelas não delimita histórico. A busca de contenção consulta somente ciclos relevantes, sem todo o histórico. Candidatos novos podem ser construídos pelas competências do mês da compra até dois meses seguintes e seus vizinhos; justificativa: fechamento novo pertence ao mês da competência ou ao anterior. Ciclos confirmados vêm da consulta, incluindo calendários históricos diferentes. Uma sugestão é previsão não vinculante; escolha explícita e confirmação final continuam obrigatórias.

**Alternatives considered**: Usar só dias atuais ignora histórico. Materializar todo intervalo de consulta geraria registros acidentais. Prometer snapshot de toda lista ou total agregado sem necessidade aumenta complexidade. Listas cadastrais/faturas mostram posição atual e podem exigir Atualizar; limites do ciclo são imutáveis e novas inserções não mudam silenciosamente o período confirmado.

## 7. Ajuste manual, evolução e estados

**Decision**: Ajuste de vencimento grava apenas fatura + evento, conservando identidade e limites. Nesta versão, `versaoConteudo=1` atesta, por schema fechado protegido, que a fatura não admite itens nem fatos financeiros. Nenhuma coleção de itens/compras/pagamentos recebe permissão nova. Esquema futuro com conteúdo será recusado por este comando até revisão que garanta atualização integral das cópias de vencimento.

**Rationale**: Não é suficiente consultar a tela ou contar itens pelo cliente. A ausência é estrutural neste incremento e exigida nas Rules. Cópias de vencimento em ItemFatura/CompromissoPlanejamento exigem integração futura. Estado aberta/fechada é derivado em leitura por hoje no fuso do perfil, sem campo autoritativo mutável; legado pode receber `ciclo` derivado no adaptador.

**Alternatives considered**: Atualizar parcelas em partes ou manter datas divergentes viola contrato. Persistir total zero/estado pago em fatura vazia cria autoridade financeira duplicada. Job agendado e ajuste por dia útil não pertencem ao escopo.

## 8. Validação e entrega segura

**Decision**: Gates em camadas: domínio/contratos; adaptadores com doubles; fonte de Rules completa compilada e avaliada oficialmente; integração dirigida com SDK cliente real A/B/ADMIN/PENDING/visitante; UI e medição assistida. Sem emulador, seed ou mudança de ambiente nesta fase documental. Criar perfis de orçamento 006 como `validacaoRemotaPendente`; só promovê-los com evidência própria.

**Rationale**: Testes locais não comprovam Rules publicadas; a evidência da 005 cobre apenas o incremento dela. Gerar regras/índices completos e rollback protegido antes de eventual publicação, respeitando autorização vigente para a 006. Logs contêm só código de erro, tipo de comando e correlação opaca; não dados financeiros, payload, token ou credenciais.

**Alternatives considered**: Admin SDK não prova segurança do cliente; regra global de teste, backend genérico e contorno de primeiro acesso são proibidos. Não exigir conclusão das US2–US6 da 005 para entregar cartões vazios.

## Fontes oficiais e limites da pesquisa

Documentação consultada em 2026-10-18 via Context7: resolve-library-id Firebase → `/websites/firebase_google`, fonte High; três query-docs sobre validação atômica, transações Web e consultas. Alguns resultados apontaram Enterprise; os limites e semântica usados foram conferidos nas páginas Standard abaixo, sem propor mudança de edição ou serviço.

- [Transações](https://firebase.google.com/docs/firestore/manage-data/transactions): leituras antes de escritas, repetição e falha offline.
- [Condições de Rules](https://firebase.google.com/docs/firestore/security/rules-conditions): getAfter e validação relacionada.
- [Limites](https://firebase.google.com/docs/firestore/quotas): acessos 10 por operação/20 em operações atômicas e 1000 expressões; limites internos permanecem mais conservadores.
- [Consultas e autorização](https://firebase.google.com/docs/firestore/security/rules-query): Rules não filtram resultados; limitar páginas e consultar caminho do proprietário.
- [Índices](https://firebase.google.com/docs/firestore/query-data/index-overview): índices conforme filtros/ordenação.

Pesquisa concluída, sem decisões funcionais pendentes. Orçamento é análise de desenho, não medição nem validação remota já executada.
