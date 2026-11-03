# Contract: Consultas e interação007

**Revisão21/10/2026**: [redesenho finito autorizado](finite-redesign.md). Novas consultas devem descobrir agregados por competenciasFaturas e expandir apenas as posições da revisão corrente; não consultar documentos-filho obrigatórios do layout anterior. Paginação, snapshot, classificação e limites abaixo continuam necessários. Porta/índices/UI ainda não implementados ou habilitados.

## Rotas e jornadas

Estender rotas existentes sob SessionGate, sem alterar administração/auth:

- /app/compras: lista por cartão/data e filtros de situação, categoria e etiquetas, com intervalo explícito e paginação.
- /app/compras/nova: formulário → prévia obrigatória → confirmação → detalhe/retomada.
- /app/compras/:compraId: origem, revisão atual, cronograma, histórico paginado e ações elegíveis.
- /app/cartoes/:cartaoId/faturas/:competencia: calendário existente, itens, categorias, total exigível e link de origem em cada item.

Item → compra → fatura posterior são duas ações. Link transporta somente IDs próprios/contexto de retorno validado, sem aceitar URL de redirecionamento externa. Destaque de parcela é estado de navegação, não pagamento inferido.

## Prévia e formulários

Exigir cartão, descrição, data, categoria de despesa, total, quantidade e primeira fatura; etiquetas opcionais até5. Coletar valor textualpt-BR e exibir valores com duas casas. Sugerir primeira fatura pela006, mostrando que pode divergir do emissor. Escolha explícita mantém prioridade; alterar dado invalida conferência anterior. Não gerar faturas na prévia.

Cronograma mostra posição/quantidade, valor, competência com ano, fechamento e vencimento por fatura. Mesmo1/1 usa esse fluxo. Faturas protegidas e limite operacional aparecem como impedimento antes de enviar, repetidos na confirmação remota. Cadastro retroativo em fechada aguarda correção explícita futura; sem mover destino automaticamente.

Edição de compra existente permite conservar cartão arquivado, sem reaproveitar caminho de compra nova que exige ativo. Mostrar escopo compra inteira e antes/depois, faturas afetadas e parcelas retiradas. Cancelamento requer motivo e confirmação. Sem ações de reativação, pagamento, antecipação ou ajuste de parcela isolada.

Estado de envio e intenção pendente impedem outra mutação incompatível. Erros de permissão do banco, sessão expirada, conflito e indisponibilidade são distintos. Após logout nenhuma mensagem tardia anuncia sucesso nem exibe resultado da sessão anterior.

## Snapshot e completude

Porta de consulta separada da mutação; adapter usa padrão existente externossnapshotReader com allowlist007 tipada, Firebase REST autenticado como usuário e readTime comum. Não copiar fetcher permissivo ou aceitar coleção/caminho arbitrário. Implementar testes do decoder para documento ausente, schema/tipo incorreto e referência alheia.

1. Iniciar snapshot remoto e guardar readTime, UID, generation e expiração conforme mecanismo existente (50min, abaixo da janela de uma hora sem depender de PITR).
2. Consultar parcelasCartao por faturaId, ordem compraId/cronogramaRevision/numero/ID, página1–50. Ler origens, controle, fatura e classificações no mesmo readTime, em grupos pequenos com budget de autorização.
3. Validar unicidade, identidade, soma de cada revisão necessária e exigibilidade via origem. Histórico antigo não entra no total corrente. Não usar campo pago individual.
4. Só apresentar completo=true quando todas as páginas/referências forem obtidas e consistentes no snapshot. Em erro, expiração, lacuna ou schema desconhecido, completo=false, sem totalDefinitivo; oferecer reinício, não juntar snapshot antigo com novo.
5. Após confirmação de mutação, invalidar snapshot da compra e todas as faturas afetadas. Nova consulta produz estado atual; não sobrescrever histórico antigo conservado em recibos.

O detalhe da compra lê revisão corrente de no máximo12 posições e permite histórico de versões/parcelas antigas paginado. Fatura exibe somente exigíveis por padrão e opção de histórico para retiradas/canceladas, sem alegar que soma do recorte representa total. Categoria de itens soma planejamento do mês de vencimento; compra inteira só no consumo por data, quando consultado. Ajustes compatíveis são linhas separadas conciliáveis; fluxo de criá-los não existe aqui.

“Parcelas restantes” é apresentação das posições posteriores à selecionada da revisão vigente. Mostrar quantidade/valores/faturas; não chamar de não pagas. Se fatura tem pagamento parcial não há rateio entre itens; estado de pagamento só no nível da fatura.

## Índices propostos

Adicionar ao arquivo completo, preservando índices/isenções anteriores; validar necessidade/READY no projeto antes dos testes reais:

| Coleção | Filtros / ordem |
| --- | --- |
| compras | cartaoId + dataCompra + __name__ |
| compras | cartaoId + estadoObrigacao + dataCompra + __name__ |
| compras | cartaoId + categoriaId + dataCompra + __name__ |
| compras | cartaoId + etiquetaIds(array-contains) + dataCompra + __name__ |
| parcelasCartao | faturaId + compraId + cronogramaRevision + numero + __name__ |
| parcelasCartao | compraId + cronogramaRevision + numero + __name__ |
| operacoesCompras | compraId + resultVersion + __name__ |

Não oferecer combinações arbitrárias de filtros sem índice correspondente. Etiquetas: filtro por uma etiqueta por consulta; seleção múltipla de agrupamento não promete AND/OR indefinido. Contratos de cursor incluem filtros, limite, UID/generation e readTime; mudar qualquer parâmetro reinicia consulta. Isentar payloads antes/depois/comando de indexação quando não consultados.

## Acessibilidade e disponibilidade

Usar componentes simples existentes; rótulos, foco em erro, navegação por teclado, tabela com identificação de cabeçalhos e estado de envio anunciado, sem depender só de cor. Mobile deve permitir ler cronograma sem ocultar competência/valor. Medir SC-001/008 com cinco participantes separadamente de testes automatizados.

Enquanto G0/G1 não resolvidos: manter indisponibilidade explícita de gravação, sem botão que anuncie cadastro funcional, confirmação local otimista ou esconder limite após envio. Interface de prévia pode existir como conferência de formulário durante desenvolvimento, sem publicação como simulador independente.
