# Quickstart: Validação de recorrências010

## Estado e pré-requisitos

Guia para implementação futura; nenhum comando de geração010 existe ainda. Leitura prévia: spec.md (decisãoA), research.md, data-model.md e contracts/*.md. Repositório já configurado; não reinicializar Firebase nem adicionar dependências. Node>=24.12.0, npm11.18.0, configuração local privada existente, projeto esperado lilicafinancy para integração autorizada. Não usar dados pessoais, Admin SDK ou emulador para provar Rules.

Perfis005 só criam receitas/despesas;006 pronta não comprova007/008. O010 é fonte financeira própria; antes de habilitar, leitores externos, projeções e faturas/pagamentos precisam consumir esse fluxo. Não criar dados005 e depois ligar010. Nenhuma dependência de escrita009.

## Comandos locais existentes

Executar na raiz do projeto:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

São comandos reais do package.json, não foram executados por plan. Após criar testes010, usar o mesmo runner com seus caminhos concretos; ausência de testes não conta como aprovação. Domínio/calendário, projeção, normalizadores, mappers e estado são testes locais sem rede.

## Gate de segurança antes das histórias mutantes

1. Construir Rules candidatas completas e matriz de casos/perfis de contracts/security.md. Primeiro entregar gerador/verificador local reproduzível e hashes; depois avaliação oficial somente conforme autorização vigente para envio da fonte/fixtures. Este plano não autoriza envio nem reutiliza autorização inexistente de009.
2. Comprovar todos os comandos mínimos, não só gerar/pular. Incluir revisão com uma futura materializada, assinatura com F existente e primeiro uso, correção/confirmar/cancelar, parcial/reversão externas, encerramento, e negações por acesso/omissão.
3. Medir/verificar18/8,1000 expressões,32KiB/1MiB e32 mutações, com metadados/campos máximos. Se mínimo reprovar, ERROR e redesenho; se avaliação indisponível, PENDENTE e não habilitar.
4. Preparar Rules/índices completos e nota/rollback. Publicação exige autorização própria. Só depois executar testes SDK autenticados contra versão/hash realmente ativos.

## Roteiros de aceitação

| Roteiro | Preparação/ação | Resultado verificável |
| --- | --- | --- |
| Fixo externo | Salário dia10 desde20/10/2026 | Outubro vazio, primeira ocorrência10/11, sem recebimento automático |
| Estimada | Energia150, dia31 desde01/10/2026 até31/03/2027 | Ajustes30/11 e28/02, demais âncoras preservadas, seis meses, sem abril |
| Definitivo | Confirmar fevereiro173,42 | Só fevereiro muda, modalidade da série preservada, sem caixa |
| Projeção | Um mês persistido173,42, outro virtual150, outro pulado | Persistida prevalece, virtual aparece uma vez e suprimido não gera exigibilidade |
| Pulo antes de materializar | Pular novembro virtual, gerar de novo em duas abas | Um tombstone durável, nenhuma O financeira nova |
| Geração repetida | Duplo clique/abas/chaves diferentes e resposta perdida | Uma identidade/lançamento, mesma confirmação ou conflito explícito |
| ReajusteA | Janeiro150; julho200 já agendado; inserir maio170 | Janeiro–abril150, maio/junho170, julho200; padrão histórico intacto |
| Protegidas | Futura paga/parcial/revertida/exceção individual intercaladas | Prévia enumera exclusões, confirmação preserva todas e aplica apenas elegíveis |
| Omissão maliciosa | Omitir slot presente/ausente no intervalo derivado do watermark | Negação de conjunto inexato, sem revisão parcial |
| Intervalo esparso | Tombstone distante aumenta watermark e mudança futura percorre>12 meses | Rejeição inteira com limite; não reduzir watermark nem dividir automaticamente |
| Corridas | Gerar versus pular/revisar/encerrar; pagamento versus edição | Resultado serial ou conflito com nova conferência; nenhum fato perdido |
| Assinatura | Cartão fechamento10/vencimento17, F abertas confirmadas, cobranças09/10 e10/10 | Sugestões outubro e novembro, item1/1 único, sem caixa ou parcelamento infinito |
| Fatura ausente | Pedir materialização sem F confirmada | Nenhum item/O; preparar calendário006 e conferir novamente |
| Fatura protegida | Cobrança para F fechada/com pagamento, cartão arquivado | Bloqueio explícito, sem mudar destino ou reabrir |
| Encerrar | Primeiro mês excluído dezembro; janeiro já materializado | Nada novo desde dezembro; janeiro continua visível/exigível, sem cancelamento automático |
| Caixa | Pagar60+140 de obrigação200, reverter um erro | Líquido/pendência exatos, uma reversão integral, conta/data originais, planejado não duplica |
| Snapshot | Páginas parciais, vazias, expiradas, troca de sessão | Sem virtual antes de reconciliar ausência, cursor seguro e totals parciais explícitos |
| Fatura versus cobrança | Meses de referência e fatura distintos, escolha manual, mudança de cartão | Consulta por ciclo/itens encontra ambos sem duplicar a ocorrência |
| Usabilidade | Cinco participantes no cadastro/confirmar/distinguir previsto/pago | Quatro de cinco em até3min ou registrar resultado/limitação real |

Testar adicionalmente centavo único, zero/fracionário/overflow, Unicode máximo, anos1900/2000/9999, dezembro/janeiro, mudança31→15, revisão no mesmo início com histórico, término antes do primeiro dia programado, referências arquivadas conservadas/novas, recusa de reativação e de delete.

## Integração real depois da implementação

Criar grupo recorrencias em tests/integration/support/environment.ts e seleção de arquivos em vitest.integration.config.ts; hoje grupo/arquivos010 não existem. Criar testes locais do ambiente que rejeitem projectId divergente, UIDs repetidos e escopo inválido antes de escrever.

Configurar arquivo local ignorado seguindo helpers existentes: TEST_EXPECTED_PROJECT_ID igual a VITE_FIREBASE_PROJECT_ID, TEST_RUN_ID exclusivo, clientesA/B/admin/pendente distintos e visitante sem login. Não imprimir credenciais. Confirmar hash das Rules/índices ativos, não usar flag de confirmação como autorização de deploy.

Somente quando grupo, testes e regras estiverem implementados/configurados/autorizados:

```powershell
$env:TEST_INTEGRATION_GROUP = 'recorrencias'
npm run test:integration
```

Não executar esse comando antes da configuração; seleção vazia ou grupo recusado não é aprovação. Testar get/list/create/update/delete diretamente, fora da interface, com os cinco perfis. Usar fixtures sintéticas pequenas e sequenciais, nunca carga/seed de inicialização.

## Evidência, rollout e limpeza

Registrar comandos, projeto esperado, instante, versão do código, hashes completos, caso/perfil, dados sintéticos sem credenciais, observado/esperado e limitações. Manifesto inclui runId, UIDs e todos os caminhos de S/V/O/R/M, F/control e cadastros usados/criados. Limpeza só por manifesto e autorização específica, inventariando dependentes; apagar pai não limpa filhos.

Habilitar leitores010, novos prefixos de primeiro uso e integração com itens/controles007/008 antes da escrita010. Rollback preserva leitura de eventos/tombstones e bloqueia comandos novos, sem apagar dados ou reativar ocorrências. Comparar regressões005/006 e candidatos007/008 com a fonte final completa.

## Resultado do comando plan

Somente desenho/pesquisa/contratos gerados. Sem teste financeiro, avaliação oficial, publicação, índice remoto, fixture ou participante real executado. Próximo comando: speckit-tasks, com gate executável explícito antes das histórias dependentes.

## Estado de implementação atual

T001–T006 concluídas localmente após redesenho em remediation.md. Scripts/casos/candidata existentes e comandos de reprodução em validation.md. T007 ainda não enviou fonte/fixtures à API por autorização específica pendente; T008–T060 não iniciadas. Não executar geração de produto/SDK como se essa construção tivesse habilitado regras. O candidato inicial aceita uma O/intervalo ocupado de revisão por comando e exige capacidade incorporada em O, controleG recíproco e ponte006 com calendarioVersion.

