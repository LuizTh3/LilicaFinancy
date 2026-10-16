# Quickstart: Validação da base inicial

Este guia descreve a validação da base implementada. Os comandos estão disponíveis na raiz;
os resultados efetivamente obtidos e as limitações estão registrados em validation.md.

## 1. Pré-requisitos e preparação

Usar um runtime aceito pelo `engines.node` final e a versão npm registrada no README.
O piso planejado é Node 22.12.0, sujeito ao conjunto selecionado; Node 25.8.1/npm 11.18.0
foram observados localmente, não são uma certificação de compatibilidade futura.

Na raiz do repositório:

```powershell
node --version
npm --version
git status --short
```

A instalação inicial e a seleção de versões pertencem à implementação. Para validar uma
cópia limpa após existir `package-lock.json`:

```powershell
npm ci
```

Resultado: instalação consistente sem modificar manifesto ou lockfile. Não inicializar
Git, trocar branches, publicar ou fazer commit. Se o runtime não atender ao conjunto,
registrar o bloqueio antes de prosseguir; não ignorar engines ou peers.

Para preparar ambiente em uma cópia limpa, criar `.env` a partir do exemplo somente se
não existir arquivo local:

```powershell
if (-not (Test-Path -LiteralPath '.env')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env'
}
```

Nenhum valor Firebase é necessário. O contrato exato está em
[contracts/environment.md](contracts/environment.md).

## 2. Verificações de ferramentas

Executar separadamente para registrar o resultado de cada comando:

```powershell
npm run typecheck
npm run lint
npm run build
npm test
```

Esperado: código 0 em cada verificação, `dist/` gerado e runner informando ausência de
arquivos de teste quando não houver casos. Não registrar “testes financeiros aprovados”.
Revisar `strict: true`, `noEmit`, projetos da aplicação/ferramentas e configuração de lint.
Detalhes dos scripts: [contracts/commands.md](contracts/commands.md).

## 3. Desenvolvimento e distribuição local

Em um terminal:

```powershell
npm run dev
```

Abrir a URL impressa. Verificar identificação, Início, link de salto e aviso de configuração
na próxima etapa. Recarregar `/` e conferir ausência de erros no console. Encerrar com Ctrl+C.

Após o build, executar:

```powershell
npm run preview
```

Abrir a URL informada e repetir a inspeção. Encerrar com Ctrl+C. Preview não é publicação.
Não instalar serviço, acessar Firebase nem criar projeto externo para esses passos.

## 4. Matriz de ambiente e rede

Usar somente valores fictícios sem sensibilidade e proteger qualquer arquivo preexistente.
Em cada estado, reiniciar dev, abrir e recarregar a página. Para preview, gerar novo build
após a alteração de ambiente, pois os valores são resolvidos na construção.

| Estado | Preparação local | Esperado |
| --- | --- | --- |
| Ausente | Remover temporariamente a disponibilidade do `.env`, sem perdê-lo | Home acessível |
| Vazio | Quatro campos sem valores | Mesma home |
| Parcial | Preencher somente um campo com marcador fictício | Mesma home |
| Completo | Quatro campos com marcadores fictícios | Mesma home |

Em todas as linhas: nenhuma inicialização Firebase, autenticação, leitura ou escrita externa.
Verificar painel de rede e console e revisar ausência de import do SDK no código.
Requisições locais de módulos/HMR são esperadas. Não imprimir configuração em logs.
Ao terminar a matriz, restaurar os quatro campos vazios desta base nova; se houver arquivo
local preexistente de outra etapa, preservar seu conteúdo e registrar a diferença.

## 5. Navegação e acessibilidade

Seguir [contracts/ui.md](contracts/ui.md):

1. Nas larguras de 360 e 1280 pixels, verificar texto legível, sem sobreposição ou rolagem horizontal.
2. Usar Tab e Shift+Tab para alcançar os dois links, com foco visível.
3. Ativar o salto com Enter e confirmar acesso ao conteúdo principal.
4. Ativar Início e recarregar `/`; nenhuma opção deve levar a página inexistente.
5. Conferir português, título do documento, header, nav e main no navegador.

Registrar navegador e tamanhos realmente inspecionados; se não houver acesso ao navegador,
registrar esse bloqueio em vez de declarar acessibilidade/responsividade verificadas.

## 6. Arquivos locais e controle de versão

Conferir os quatro campos e valores vazios sem registrar valores reais no relatório.
Executar verificações de rastreamento/ignore:

```powershell
git ls-files -- .env
git check-ignore --no-index -- .env .env.local .env.production node_modules/probe dist/probe coverage/probe logs/probe.log .credentials/probe.json
git check-ignore --no-index -- .env.example
git status --short
```

Esperado: `.env` não listado em `ls-files`; artefatos locais reconhecidos como ignorados;
o comando específico para `.env.example` não lista arquivo e retorna 1, sinalizando que
não está ignorado. Esse código 1 é esperado para essa verificação, não falha de build.
Conferir manualmente outros nomes de credenciais encontrados e regras existentes preservadas.

Se `.env` estiver rastreado, informar exposição anterior possível e tratar remoção do índice
separadamente, sem apagar arquivo local nem afirmar que ignorá-lo resolve histórico.
Nenhuma limpeza ampla, commit ou reescrita de histórico faz parte deste guia.

## 7. Evidências da implementação

Registrar em `specs/001-inicializar-aplicativo/validation.md`:

- Runtime/npm efetivos, versões diretas, gerador utilizado e requisito Node final com fontes.
- Comandos executados e resultados; instalação limpa e coerência do lockfile.
- Runner preparado e quantidade real de testes, inclusive zero.
- URLs locais, navegador, larguras, teclado e quatro estados de ambiente verificados.
- Ausência de import/conexão Firebase e de autenticação/regras financeiras.
- Verificação de ignore/rastreamento e preservação de conteúdo anterior.
- Bloqueios, limitações e critérios SC-001–SC-007 efetivamente atendidos.

Não registrar credenciais, inventar resultados nem declarar isolamento ou persistência validados.

