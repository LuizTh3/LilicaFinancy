# Comparação anterior à implantação — 2026-10-18

**Substituição protegida autorizada e publicada após a comparação.** A primeira tentativa foi interrompida antes de qualquer alteração; este documento preserva o achado e registra a autorização adicional recebida em seguida.

## Estado efetivamente encontrado

O release cloud.firestore ativo contém somente a regra padrão de modo de teste: todos os documentos aceitam leitura e escrita enquanto request.time for anterior a timestamp.date(2026,11,11). As proteções 002/004 da base local não estão publicadas. Não há evidência de isolamento financeiro nesse estado; o preflight das contas apenas confirmou autenticação/perfil, sem comprovar permissões.

Backup completo da fonte, release, ruleset e inventário de índices preservado localmente em `.integration/005-backup-2026-10-18T15-56-12-850Z/`. Artefatos ignorados pelo Git, sem tokens ou senhas. Nenhum dado de usuários foi inventariado ou alterado.

- SHA-256 da fonte remota: `1487d8e022b375579bc7fb8975e5d95fb9fb341b47a91785995f13741350d6e6`.
- SHA-256 do firestore.rules proposto: `c1ae449dabdec54d3182174c05c35640804019ffb5645a9cb6dd1fbd802d8f48`.
- Quatro índices remotos READY: estado+nome de titulares, categorias, contas e etiquetas. Todos são preservados no arquivo local. Nenhum índice desconhecido e nenhuma isenção explícita remota; configuração padrão de indexação preservada.
- Arquivo local contém nove índices e oito isenções: os quatro existentes, dois de outbox da base002 e três de previsões005; cinco isenções da base anterior e três dos mapas financeiros. Publicação será aditiva para os índices, sem exclusão de índices remotos.

## Alteração concreta proposta

| Área | Ativo hoje | Após substituição pelo arquivo local |
| --- | --- | --- |
| Acesso geral | Leitura/escrita sem autenticação até 11/11/2026 | Negado por padrão |
| Perfil e primeiro acesso | Escrita livre | Perfil próprio mínimo; proteção do estado/cutoff |
| Administração | Sem isolamento nas Rules | Papel manual atual e permissões explícitas |
| Cadastros | Escrita livre | Proprietário pronto, esquemas fechados, recibos e travas imutáveis |
| Previsões005 | Escrita livre | Origem/recibo atômicos e leitura própria; demais comandos financeiros negados |

A substituição ativa as proteções locais 002/004 e o incremento US1 conjuntamente. Isso ultrapassa a hipótese de apenas acrescentar previsões sobre uma base002/004 já ativa. Requer confirmação explícita desse estado remoto encontrado antes de publicar. Não implica deploy de hosting ou trusted-api. Cliente atualizado é necessário para novos cadastros sensíveis schema2.

## Reversão preparada

O backup remoto é evidência fiel, mas **não deve ser reativado automaticamente**, pois reabriria leitura/escrita gerais. `docs/firestore-rules-005-safe-rollback.rules` conserva a base protegida e compatibilidade schema1/2, inclusive leitura de recibos existentes, e desabilita novas criações financeiras. Não muda dados nem remove travas. Sua publicação, se necessária, continua sujeita ao escopo autorizado; a preparação do arquivo não o ativa.

Compilação oficial da alternativa protegida concluída: ok=true, issues=[], sem publicação. Helpers financeiros sem uso foram removidos dessa alternativa para evitar avisos do compilador. O arquivo principal proposto permanece inalterado.

## Próximo gate

Após confirmação da substituição: verificar se o release não mudou desde o backup, publicar os arquivos revisados sem exclusões, aguardar índices prontos e executar os testes do incremento nos quatro UIDs fictícios mais visitante. Registrar resultados efetivos antes de marcar T024. Não executar testes negativos contra a regra aberta e interpretá-los como prova da implementação.

## Execução autorizada

O usuário confirmou "Autorizar a substituição protegida e os testes". Release e inventário foram conferidos novamente e permaneciam iguais ao backup. Rules publicadas e lidas novamente pelo serviço oficial: SHA-256 ativo igual ao proposto acima. O modo de teste global foi substituído; não houve deploy de hosting/trusted-api nem alteração de documentos de usuários.

Criados cinco índices (dois de outbox e três de previsões), preservando os quatro existentes, e enviadas oito isenções de indexação. Nenhum índice excluído. Os novos índices e operações de isenção ainda estavam em construção na primeira conferência; testes que dependem deles aguardam conclusão. Estado operacional preservado em .integration/005-deployment.json e .integration/005-readiness.json, sem credenciais.

Conferência das contas sob as Rules protegidas passou: A/B/ADMIN prontos, ADMIN habilitado e PENDING pendente. A autenticação e leituras de perfil não criaram fixtures.

## Conclusão do incremento autorizado

Todos os nove índices ficaram READY e as oito isenções concluíram. O primeiro teste real revelou excesso do limite de expressões das Rules; a revisão corretiva preservou as validações recíprocas e reduziu verificações repetidas. Foi compilada, publicada no mesmo escopo e relida, com backup protegido anterior. SHA-256 ativo atual: 77133633eb823fd97322c7d06382a34eec5aed8e4dcc1c77fd382fd747050cee. Estado/revisões em .integration/005-deployment.json; prontidão reconfirmada em .integration/005-readiness.json.

Quatro testes de integração aprovados, incluindo ramo máximo e isolamento de todos os papéis; repetição após hidratação dos nomes aprovada. Fluxo manual de previsão com cinco etiquetas e datas independentes aprovado após recarga. Evidências, limitações e inventário em validation.md. Dados fictícios permanecem no projeto; nenhuma exclusão executada. Apenas US1 foi publicada e validada; histórias seguintes e hosting/API permanecem fora desta publicação.
