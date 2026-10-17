# Revisão de arquitetura — feature 004

Revisão em 2026-10-17. Domínio financeiro continua sem imports transitivos de React/Firebase conforme architecture.test.ts. Dinheiro/calendário compartilham as funções da 003; nenhuma fórmula financeira foi colocada em componentes. SDK Firestore está no repositório/mapper; portas de domínio usam tipos comuns.

SessionGate, primeiro_login e cutoff preservados. Novas rotas estão sob SessionGate, sem bypass administrativo. Descritor mínimo é limpo em logout/troca de UID; página é remontada por UID/coleção, usa cleanup de requisições, geração para paginação e descarta respostas atrasadas. Origem das queries sempre users/{UID capturado}; consumidor não escolhe path/UID.

Sem novas dependências, serviços, integrações bancárias ou permissões para consumidores financeiros. Os arquivos de Rules anteriores foram preservados para rollback; novos matches têm schemas fechados, recibos recíprocos e exclusão negada. Esta revisão é local: não afirma compilação/publicação ou isolamento remoto verificado.
