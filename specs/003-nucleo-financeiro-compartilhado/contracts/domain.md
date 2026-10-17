# Contrato público do núcleo de domínio v1

Escopo: módulos internos consumidos pela aplicação e por testes, sem endpoint HTTP, UI, SDK ou I/O. Este arquivo descreve assinaturas, não implementações. Referência: [modelo](../data-model.md) e [pesquisa](../research.md).

## 1. Convenções de tipos e erros

Tipos nominais TypeScript sobre primitivos: Centavos/ValorPositivo sobre number, DataCalendario/Competencia/FusoPerfil/IDs tipados sobre string. Construtores recebem unknown e validam em execução; marca nominal não substitui validação. Entradas de coleções são readonly; funções não as modificam.

Assinaturas usam `Resultado<T> = {ok:true;valor:T} | {ok:false;erro:ErroDominio}`. Erro inclui `codigo`, mensagem pt-BR, campo opcional e detalhes escalares necessários (limite, valor da versão, sem payload pessoal). Operações públicas falham pelo resultado discriminado, sem lançar para entradas inválidas. Exceções de Intl são convertidas em erro. Falha interna de programação não deve ser convertida em sucesso vazio.

Códigos do domínio: valorInvalido, limiteMonetario, dataInvalida, referenciaInvalida, conflitoVersao, limiteOperacional, esquemaIncompativel. Contratos de repositório estendem com não encontrado, idempotência, conexão/permissão/cota/confirmação conforme [repositories.md](repositories.md).

## 2. Dinheiro

| Operação | Entrada → saída | Regra |
| --- | --- | --- |
| centavos | unknown → Resultado<Centavos> | Tipo numérico, inteiro seguro 0..MAX; zero normalizado. |
| valorPositivo | unknown → Resultado<ValorPositivo> | Mesma faixa, exclui zero. |
| interpretarBRL | unknown → Resultado<Centavos> | Gramática pt-BR integral; vazio inválido; string monetária zero é válida como valor, mas formulário de fato exige refinamento positivo. |
| formatarBRL | Centavos → Resultado<string> | Canônico `R$ ` com duas casas, sem divisão decimal aproximada. Revalida limites na borda pública. |
| somarCentavos | readonly Centavos[] → Resultado<Centavos> | Vazio resulta zero; cada soma intermediária segura. |
| compararCentavos | Centavos, Centavos → Resultado<-1\|0\|1> | Não depende da apresentação. |
| subtrairCentavos | Centavos, Centavos → Resultado<Centavos> | Rejeita subtraendo maior. |
| multiplicarCentavos | Centavos, quantidade inteira segura >=0 → Resultado<Centavos> | Rejeita quantidade inválida e overflow; zero permitido. |
| diferencaMonetaria | entradas:Centavos, saidas:Centavos → Resultado<Diferenca> | natureza superavit/deficit/equilibrio, magnitudeCentavos >=0; equilíbrio exige zero. |
| distribuirParcelas | total:ValorPositivo, quantidade:inteiro → Resultado<readonly ValorPositivo[]> | N=1..12, T>=N, quociente/resto inteiro, primeiros ordinais recebem centavo. |

Casos canônicos:

| Entrada | Resultado |
| --- | --- |
| `R$ 0,01` | 1 centavo, saída `R$ 0,01`. |
| `1.234` | 123400, nunca 123 centavos ou 1,234 real. |
| `90.071.992.547.409,91` | MAX=9007199254740991, ida/volta exata. |
| `1.23`, `1,234`, `1e3`, `-0,01`, vazio | valorInvalido. |
| MAX+1 ou somar(MAX,1) | limiteMonetario, nunca valor arredondado. |
| T=10000,N=3 | [3334,3333,3333]. |
| T=1,N=2 | valorInvalido; zero em parcela é proibido. |

Resultado de consumo com mais estornos que gastos no mês usa natureza `reducoesSuperioresAosGastos` e magnitude; não reaproveita valor negativo como campo monetário.

## 3. Calendário e fuso

| Operação | Entrada → saída | Regra |
| --- | --- | --- |
| dataCalendario | unknown → Resultado<DataCalendario> | Formato, faixa 1900..9999 e existência real do dia. |
| competencia | unknown → Resultado<Competencia> | YYYY-MM canônico, mesmos anos. |
| anoBissexto / diasNoMes | ano inteiro / ano+mês → Resultado<boolean/integer> | Valida ano/mês, não aceita overflow como mudança de mês. |
| competenciaDaData | DataCalendario → Resultado<Competencia> | Componentes, sem UTC. |
| avancarCompetencia | Competencia, deslocamento inteiro seguro → Resultado<Competencia> | Deslocamento de qualquer sinal, rejeição fora da faixa. |
| dataNaCompetencia | Competencia, diaAncora 1..31 → Resultado<DataCalendario> | min(âncora,diasDoMês). |
| avancarMes | dataBase, deslocamento, diaAncora → Resultado<DataCalendario> | Mês-alvo parte da data-base, mantendo âncora explícita. |
| validarFuso | unknown → Resultado<FusoPerfil> | Nome IANA/alias/UTC reconhecido; offset explícito inválido. |
| hojeNoFuso | instanteMs, FusoPerfil → Resultado<DataCalendario> | Relógio passado pelo chamador; Intl apenas converte instante para partes locais. |

Nenhuma função chama Date.now, consulta navegador ou interpreta string civil com Date. O wrapper legado `calendarDate(value): boolean` em `src/domain/subscription.ts` passa a delegar ao novo construtor; `validatePeriod` conserva assinatura/resultados, com testes de não regressão.

Casos: 2027-01-31 âncora31 em offsets [0,1,2] → janeiro31/fevereiro28/março31; 1900/2100 não bissextos, 2000/2028 bissextos; 2026-12+1 → 2027-01; 1900-01−1 e 9999-12+1 falham. Instante 2026-10-18T02:00:00Z em America/Rio_Branco → 2026-10-17; string civil já salva não muda ao trocar fuso. `+01:00` e nome inexistente são erros explícitos.

## 4. Cronograma e sugestão de fatura

`montarCronograma(entrada): Resultado<readonly CompromissoProposto[]>` recebe união:

- nova: totalCentavos, quantidadeOriginal, primeiraCompetencia, primeiroVencimento e diaAncora;
- migrada: saldoMigradoCentavos, quantidadeOriginal, numeroInicial, primeiraCompetencia, primeiroVencimento, diaAncora e valoresConhecidos opcionais completos.

Cada item tem numero, quantidadeOriginal, valorCentavos, competenciaPlanejamento e vencimento. Não gera IDs aleatórios nem grava. Quantidade efetiva é N−K+1. Avançar competência de planejamento e vencimento por mesmo offset a partir das respectivas bases, preservando eventual diferença escolhida para obrigação externa. Para cartão, montagem usa competências/calendários de faturas e garante igualdade de planejamento; não usar regra externa para deslocar parcela de cartão.

No cartão, vencimento de cada item deve ser exatamente o vencimento confirmado da fatura correspondente, que é sua única autoridade. Campo copiado divergente gera referenciaInvalida; nunca usar a âncora da origem ou data editada na parcela para substituir o vencimento da fatura. A mesma igualdade é validada ao construir SnapshotAlvo e ao avaliar prévia de edição.

`sugerirPrimeiraFatura(dataConsumo, calendarioCartao)` retorna competência, fechamento, vencimento e `origem=sugestao`. No fechamento ou depois segue ciclo seguinte. Exemplos com fechamento10/vencimento17: compra2026-10-09 → competência2026-10; compra2026-10-10 →2026-11. Com fechamento25/vencimento5: compra2026-10-24 →2026-11. Ajustar datas inexistentes e validar `fechamento < vencimento` na mesma função. Primeira fatura informada explicitamente tem precedência, não é corrigida silenciosamente.

## 5. Snapshot completo e pendência

`SnapshotAlvo` contém alvo discriminado, estado de obrigação aplicável, base/itens de origem, créditos efetivos, fatos de liquidação/inversão, versões de coordenação e completude. Dados completos devem indicar revisão consistente; snapshot parcial tem `completo=false` e motivos e não é aceito para quitação/total definitivo. Construtor valida IDs únicos, referências, moeda, versão, faixa e duplicidade de efeito. Um simples booleano enviado por usuário não comprova segurança de persistência.

`derivarLiquidacao(snapshot, hoje): Resultado<ResumoLiquidacao>` retorna exigivelCentavos, liquidadoLiquidoCentavos, pendenteCentavos, estadoLiquidacao e atrasada. Fórmulas e estados em [modelo §8](../data-model.md#8-derivações-e-transições). Sem clamp de saldo negativo; origem/valores inválidos dão erro de consistência via referenciaInvalida/valorInvalido. Parcela de cartão retorna `viaFatura` com estado/pendência da fatura, sem atribuir a ela uma fração de pagamento.

`preverEdicaoSerie` explicita também `preservados`: no escopo de futuras, registros com liquidação não são alterados e aparecem com motivo liquidacaoPreservada. Cancelar uma origem inteira exige `alteracoes.origemSerie` com quantidadeOriginal, numeroInicial e manifesto limitado de parcelas `{numero,alvoId}`; conferir continuidade, unicidade e correspondência com todos os snapshots, sem aceitar subconjunto como série completa. Esse contexto deve vir da origem autoritativa em adaptador futuro; não prova autorização por alegação do cliente.

`avaliarLiquidacao(snapshot, comando)` valida valor parcial, conta, original quando houver inversão e saldo final; retorna proposta de fatos e versões a coordenar. Não faz I/O e não valida posse por alegação do chamador. `avaliarAjuste` trata créditos/estorno/reembolso combinado com mesma regra; valida mapa explícito de alvos sem inventar rateio. `preverEdicaoSerie(snapshot, escopo, alteracoes)` retorna alvos, versões e impacto ou bloqueio por liquidação/ciclo/limite. Nenhuma dessas propostas equivale a commit.

Casos mínimos: base10000/pagamento4000 → pendente6000, parcial; reversão4000 → pendente10000; crédito1000 → exigível9000; pagamento acima da pendência falha. Dois candidatos com expectedVersion=3 podem ser válidos localmente; só um pode confirmar versão4 no contrato de repositório. Reembolso de pagamento10000 + estorno/crédito10000 → pendência0 e entrada de caixa10000 uma vez.

## 6. Projeção temporal e recorrência

`projetarPeriodo(baseTemporal, intervalo, snapshotCompleto)` retorna lançamentos rastreáveis por origem/fato, totais tipados e completude. Base é consumo/planejamento/caixa; filtro temporal não é inferido da tela. Projeção é leitura pura. Resultado incompleto contém itens/motivos e não inclui totalDefinitivo.

Regras obrigatórias:

- Compra10000 em outubro, parcelas [3334,3333,3333] a partir de novembro: consumoOut=10000; planejamentoNov=3334; pagar faturaNov não cria consumoNov.
- Estorno10000 em novembro: consumoOut permanece10000; novembro registra redução10000. Caixa só recebe quando houver reembolso confirmado; não criar recebimento duplicado.
- Receita/obrigação com vencimento novembro e planejamento outubro aparece em outubro para planejamento, mantendo vencimento novembro. Data de pagamento não reclassifica previsão.
- Migração sem data/total conserva `semDataConsumo`/`totalOriginalDesconhecido`; não completa histórico por inferência.

`projetarOcorrencias(molde, competencias, existentes)` retorna ocorrências virtuais deduplicadas. Para cada competência, âncora ajustada deve cair entre início/fim inclusivos. Existente com mesmo ID natural prevalece, inclusive cancelada/com valor excepcional. Mudar competenciaPlanejamento da ocorrência não muda competenciaOcorrencia e não recria virtual na competência antiga. Projeção de período é distinta de materialização (comando explícito, até12).

Cada ocorrência de receita/obrigação avulsa possui estimado booleano próprio, capturado do molde ao materializar. `confirmarValorOcorrencia({ocorrencia, snapshot}, valorDefinitivo, expectedVersion)` recebe a ocorrência e snapshot completo do alvo existente, incluindo os fatos necessários aos bloqueios de liquidação, e retorna proposta pura com valor positivo definitivo, estimado=false e versão seguinte, preservando identidade, datas e vínculos. Valida versão e bloqueios de liquidação existentes; não modifica molde, outras ocorrências ou caixa. Para virtual, contexto é `{ocorrencia}` sem snapshot: a versão proposta inicial1 é preservada na materialização confirmada. Caso obrigatório: molde15000/true, novembro e dezembro estimados; confirmar novembro16327 deixa somente novembro16327/false, e alteração posterior do molde não o reclassifica como estimado. Molde encerrado exige fim explícito; nenhum corte depende de relógio global.

## 7. Limites e identidades

`avaliarOrcamento(comando, perfilOperacional): Resultado<OrcamentoAprovado>` verifica N<=12, ocorrências<=12, mutações<=32, tamanho estimado<=1MiB, documentos<=32KiB, acessos Rules<=18 no conjunto e<=8 por operação, expressões<=1000. Contagens negativas/não inteiras, perfil ausente/desconhecido ou tamanho não comprovado rejeitam. Metadados, guardas, recibo, leituras de validação e pior caso de referências entram na conta. Tipos de comando sem adaptador têm perfil `naoHabilitado`; nunca passam para execução remota. Valores de exemplo são sintéticos e não autorizam produção.

`identidadeNatural(tupla)` e `canonicalizarComando(payloadValidado)` são funções determinísticas de dados. Codec UTF-8/base64url deve ser compatível browser/Node, sem Buffer no domínio e sem SDK. Não gerar chave aleatória internamente; `operationKey` é argumento explícito. Canonicalização e limites em [pesquisa R7](../research.md#r7--identidades-idempotência-e-schema).

## 8. Matriz de validação

| Requisitos | Evidência local planejada |
| --- | --- |
| FR-001/003–007 | Casos de parsing/formatação, MAX, overflow, inversões tipadas e ausência de imports externos. |
| FR-008–013 | Tabelas de calendário/âncora/fusos/fechamento, distribuição e migração5/10. |
| FR-014–021 | Reconciliação completa dos três eixos e das três bases; parciais, crédito, reembolso e recorrência deduplicada. |
| FR-022–027 | Casos de contrato com double específico: idempotência, payload divergente, versões e resultado indeterminado. |
| FR-028–033 | Fronteiras de orçamento, rejeição total, referências cruzadas e adaptação remota desabilitada. Não prova Rules reais. |

Esses cenários serão executados na implementação; este documento não registra aprovação de testes ainda inexistentes.
