# Contract: Segurança e orçamento010

**Estado atual: aritmética do redesenho conferida; T007 PENDENTE de prova executável.** O erro21 do layout descartado não se aplica ao layout corrigido, mas nenhum teste oficial foi executado. Autorizações e restrições de publicação permanecem separadas.

## Fontes autoritativas e compatibilidade

S=seriesRecorrentes,V=revisoesRecorrentes,O=ocorrenciasRecorrentes,R=operacoesRecorrentes,M=reversoesRecorrentes,G=controlesFaturas. O de assinatura incorpora capacidadeItem (original,acréscimos,reduções,devolvido,categoria efetiva); não existe J separado/cópia de controle para esse novo tipo. Itens007/encargos008 mantêm seus caminhos. O resolvedor tipado e os leitores008 precisam reconhecer ocorrenciaRecorrente antes de habilitar seus pagamentos/ajustes. Ver remediation.md.

G é separado e obrigatório, schema2 com calendarioVersion adicional para a ponte010/006. Todos os deltas são exatos; líquido/histórico não mudam por materializar/editar/cancelar assinatura. Nenhum comando010 paga uma fatura. Compatibilidade008 ainda exige validação real, não é presumida da disponibilidade006.

## Reciprocidade e prontidão

Todo caminho exige own(uid). S exige R com version+1,comando canônico,IDs/timestamps exatos; R create-only exige ready e S pós-estado. O/V exigem S pós-estado e a imagem exata da transição em comandoAtual. O snapshot de comando atual é finito e substituído, não histórico crescente; R guarda a mesma imagem para recuperação. MonotonicidadeS e R create-only tornam evento antigo incompatível com nova revisão.

G exige R novo e seu delta/version esperada; R exige G pós-estado. ready é delegado ao R obrigatório no ramoG, não retirado. M exige reversão exata; O exige original/M e inversão integral única. Fatos são imutáveis, contas/datas de reversão herdadas. Categoria classificada ao criar/revisar padrão exige marcador004; materialização revalida atividade e conserva esse primeiro uso, sem emitir novo marcador de classificação.

## Integralidade e revisão

S.ultimoMesOcupado é máximo monotônico de qualquer O/tombstone; todas as mutaçõesO incrementamS. Revisão usa o intervalo completo A..min(watermark,próximaRevisão−1), incluindo ausentes e protegidas. Cliente não escolhe subconjunto arbitrário. Omissão/mudança de protegida é negada; auxiliares não listadas não podem mudar. Meses virtuais continuam virtuais e recebem regra por vigência; próxima revisão agendada permanece intacta.

O primeiro perfil candidato aceita intervalo ocupado de até um mês e uma O por comando; intervalo vazio de ocupação permite revisão de virtuais. Teto geral12 não garante lote12. Intervalos maiores ou novas referências que excedam orçamento são recusados integralmente; ampliar capacidade exige novo perfil/prova, nunca fragmentação automática.

Card confirma elegibilidade pelo fechamento/ciclo imutáveis copiados de F e pelo G atual para histórico financeiro. Transferência revalida novo cartão/F e doisG juntos. Nova referência ativa/própria, histórica conservada no mesmo papel. Reabertura/correções008 não são contorno automático para inserir compra010 em ciclo originalmente fechado.

## Ponte006 e inicializaçãoG

G inicial zero exige F006 certificada preexistente, igual no pré/pós-estado, ausência anteriorG e recibo tipado. Não se infere zero de lista vazia nem de controle legado desconhecido. Prova depende de todos os criadores de item exigirem G e da proibição de excluir/resetar G; fonte anterior e caminhos007/008 precisam ser auditados no gate. Dados não certificados exigem migração explícita.

Ajuste de vencimento006 com G existente exige pós-G version+1 e calendarioVersion+1, com F/recibo006 recíprocos; todos os valores financeiros permanecem iguais. calendarioVersion impede reaproveitar recibo de calendário antigo. Leitor006 continua usando calendário schema1/versaoConteudo1, pois versão financeira tem autoridade em G. O adaptador006 precisa emitir a contraparteG antes de habilitar esta ponte em produção.

## Orçamento aritmético

rules-budget-profiles.json contém26 grafos e o script validate-recorrencias-budget.mjs confere18 acessos totais,8 por escrita e32 mutações sem cache. Inclui autorizações de leituras transacionais. Exemplos mínimos:

| Comando | Escritas | Autorizações de leitura | Total |
| --- | --- | --- | ---: |
| Criar série externa | S2,V2,R2 | 0 | 6 |
| Materializar externa | S3,O2,R2 | 3 | 10 |
| Materializar assinatura | S3,O4,R3,G1 | 5 | 16 |
| Revisar futura de assinatura com um slot | S7,Vantiga1,Vnova1,R3,O1,G1 | 4 | 18 |
| Editar assinatura mesmaF | S2,O1,R3,G1 | 3 | 10 |
| Transferir cartão/F | S2,O3,R4,Gantigo1,Gnovo1 | 5 | 16 |
| Pular virtual | S3,O1,R2 | 3 | 9 |
| Cancelar assinatura | S2,O1,R3,G1 | 3 | 10 |
| Encerrar | S1,R2 | 1 | 4 |
| Pagar/receber externa | S2,O2,R2 | 3 | 9 |
| Reverter externa | S2,O3,R2,M1 | 4 | 12 |
| InicializarG | G3,R2 | 2 | 7 |
| Ajustar vencimento006 comG | F4,R0061,G2 | 3 | 10 |

Mínimos sem novas referências; primeiro uso/novos vínculos/etiquetas acrescentam custo. Geração não lê cartão no callback porque F fornece a identidade; Rules revalidam cartão ativo. J não tem leitura separada porque sua autoridade está em O. Não deslocar consultas para preflight para esconder custo.

## Bytes, expressão e evidência

Candidata contém formas fechadas, limite de uma O e doisV por comando, estimativa conservadora de texto em UTF-8 (quatro bytes por unidade textual mais reserva de10000 bytes) e recusa de metadados combinados acima32KiB. Entradas antigas/novas devem ser imagens de schemas fechados, sem payloads opacos adicionais. A reserva e a serialização real precisam prova em T007; não confundir guard local ou fixture máxima com todos os inputs comprovados. Também provar1MiB por comando,1000 expressões e limites compilados.

T005 constrói fonte completa e manifesto, T006 constrói327 casos sintéticos (189 ALLOW,138 DENY), T007 avalia. Checker local apenas verifica integridade/lexema/funções/mocks/hashes. Não é compilador, avaliação semântica ou SDK. Cada escrita legítima tem caso de autoridade; ready delegado é testado na contraparte obrigatória, e a atomicidade final exige SDK real. Nunca tratar negação por falta de mock/expressões como prova de invariantes.

## Matriz e entrega

Testes incluem naturezas,confirmar valor virtual/persistido,edição,transferência deF,revisão/same-boundary,omissão de slot,próximo reajuste,capacidade,deltaG,liquidações/reversão,tombstone,primeiro uso,cinco perfis,Unicode/limites e regressões005/006. Negativos guardam dependências não relacionadas. get/list próprios exigem ready; list1–50; delete financeiro negado. Não existe permissão global ou introspecção fictícia de filtroswhere.

Avaliação usa apenas projects/lilicafinancy:test em firebaserules.googleapis.com, com fonte completa e fixtures sintéticas; sem criação de ruleset/release/dados financeiros. Runner não importa provedor operacional sem --authorized-source-disclosure, sinalizador a usar somente após autorização explícita. Não há envio nesta execução. Publicação e SDK são etapas posteriores separadas, com fonte/índices completos, nota, hashes e rollback.

Se compilação/caso mínimo reprovar, ERROR e correção; sem autorização/avaliação, PENDENTE. Não iniciar T008–T060 até PASS documentado de T007.
