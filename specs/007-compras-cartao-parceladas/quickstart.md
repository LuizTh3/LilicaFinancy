# Quickstart: Validação da feature007

Guia para executar **após implementar e resolver G0/G1**. Nenhuma suíte007, deploy, fixture ou operação real foi executada durante este planejamento. Os arquivos/rotas novos são alvos futuros; rodar testes atuais não valida compras que ainda não existem.

## Pré-requisitos

- Node>=24.12.0, npm11.18.0 e dependências do lock existente. Na raiz, npm ci somente se necessário; não atualizar versões ou instalar emulador.
- Gates e desenho em [plan.md](plan.md), [data-model.md](data-model.md) e [security.md](contracts/security.md). Resolver primeiro expressão/positivos006 e viabilidade de N>=2 na007.
- Código de domínio, Rules completas/índices/notas/reversão e harness007 implementados; compilação/avaliação oficial positiva e negativa concluídas para cada perfil candidato, inclusive máximo aceito e primeiro rejeitado.
- Ambiente real explicitamente autorizado, source/hash ativo conferido e índices necessários READY. Autorização histórica006 não é autorização automática de toda mudança007. Não imprimir credenciais ou configuração privada.
- Contas fictícias A/B/ADMIN/PENDING, UIDs distintos, perfis e cutoff verificados; visitante sem login. TEST_EXPECTED_PROJECT_ID deve coincidir com projeto configurado antes de conectar. TEST_RUN_ID único e manifesto de IDs exatos antes das mutações.

## Verificações locais

Na raiz do repositório, após implementação dos módulos/testes007:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Esperado: regressões002–006 preservadas; domínio financeiro sem UI/SDK/relógio global; contratos de revisão, cálculo e erros aprovados. Testes de orçamento verificam grafo implementado, não só uma constante esperada que repete o código. Nenhum perfil simulado promove capacidade remota.

## Segurança e integração real dirigida

O harness reconhece o grupo literal `comprasCartao` em environment, preflight, clientes, manifesto e runner, com quatro contas e visitante. Os arquivos de suíte007 ainda dependem das tarefas seguintes; grupo sem testes falha, não é aprovação. Manifesto aceita explicitamente compras, parcelasCartao, controlesFaturas e operacoesCompras; ele somente autoriza inventário/limpeza delimitados, não cria permissão de escrita nas Rules. Não substituir por grupo que ignore testes007.

```powershell
$env:TEST_INTEGRATION_GROUP = 'comprasCartao'
$env:TEST_RULES_CONFIRMED = 'yes'
npm run test:integration
```

O marcador yes apenas confirma inspeção operacional já realizada; não publica Rules ou garante orçamento. Sem código/grupo/evidência, interromper com erro acionável, nunca executar apenas testes antigos e chamar007 aprovada. SDK cliente autenticado comprova autorização; Admin SDK não comprova Rules. Pagamento verdadeiro está fora desta etapa; marcador protegido com histórico de pagamento para negativo requer fixture autorizada própria ou evidência local/oficial claramente identificada, sem abrir pagamento para fabricar fixture.

| Roteiro | Resultado esperado |
| --- | --- |
| R$100/3 a partir de2026-12 | 33,34/33,33/33,33 em dez/jan/fev; total100; se perfil não couber, rejeição integral e gate de capacidade registrado, não roteiro falsamente aprovado |
| Uma parcela80 | Item1/1 na fatura, nenhum pagamento ou caixa; commit íntegro |
| Alterar primeira fatura | Todas competências seguintes mudam na prévia; nada gravado até salvar |
| Dia do fechamento e30/31 fevereiro | Sugestão/ciclo006, snapshots e coincidência autorizada corretos |
| Retroativo em fechada sem pagamento | Cadastro inteiro negado, mensagem de correção futura, sem mover destino |
| Valores/quantidades limites | Um centavo1/1;12 válido no domínio;13/zero/parcela zero/inseguro rejeitados; máximo monetário exato |
| Referências | Categoria de receita, arquivada nova, alheia, inexistente, etiqueta repetida e cartão obsoleto negados |
| Reenvio e resposta perdida | Um resultado por intenção; mesma chave recupera commit real; chave igual/corpo diferente conflita |
| Duas compras na mesma fatura | Nenhuma perda; controle de fatura serializa confirmação e reconcilia itens |
| Edição3→2→3 | Compra estável, revisões/IDs novos, posições antigas no histórico sem exigibilidade |
| Editar só metadados | Mesma revisão de cronograma; bloqueios da fatura continuam exigidos |
| Cancelamento | Motivo e impacto; origem e todas revisões sem exigibilidade, histórico preservado; replay sem novo efeito |
| Fechamento/pagamento concorrente | Tentativa obsoleta negada na confirmação; pagamento revertido ainda protege |
| Ajuste de vencimento | Nenhuma cópia divergente; conflito com compra tratado; calendário006 preserva própria cadeia |
| Arquivamento | Nova compra negada; consulta e correção elegível de obrigação existente preservadas |
| Recarregar após edição/cancelamento | Ler registros, sem gerar cronograma novamente ou reativar posição |
| Página/snapshot | Cruzar duas páginas pequenas no mesmo readTime; só total completo; expiração reinicia sem mistura |
| Categoria/navegação | Total113,34 para80+33,34; grupos reconciliam e item→origem→fatura posterior em2 ações |
| Escrita direta | O/P/R/G órfãos, soma/ID/revisão falsos, reset de marcador e categoria mutável negados |
| A/B/admin/pendente/visitante | Zero acesso financeiro alheio ou primeiro acesso indevido |
| Falha de rede/cota/logout | Sem série parcial ou falso sucesso; resposta tardia descartada |
| Máximo aceito e seguinte rejeitado | Perfil concreto dentro18/8/32/bytes/1000; excesso sem escrita, sem truncar ou relaxar Rules |

Criar somente fixtures pequenas necessárias; para paginação usar página2/3 e poucos itens. Inventariar antes de cada envio. Limpeza é separada, delimitada ao runId/UIDs e não automática. Não varrer vida financeira de usuários reais nem realizar carga massiva.

## Medição assistida e registro

Após evidência remota: cinco participantes fazem cadastro com alteração de primeira fatura; pelo menos4/5 concluem em3min e distinguem compra de pagamento/parcelas posteriores de pendência comprovada. Conferir teclado, foco e mobile/desktop.

Registrar em validation.md futuro: comando, versão/hash da fonte, projeto conferido sem segredos, runId, perfis efetivamente aceitos/rejeitados, testes reais/local/oficial, evidências de falha e limitações. Fontes geradas, compiladas, avaliadas, publicadas e testadas são estados distintos. Sem N>=2 funcionando com segurança, a feature não está entregue mesmo que1/1 passe.
