# Contract: Shell e tela inicial

## Interface disponível

- Idioma pt-BR, título de documento identificando LilicaFinancy.
- Header com identificação do aplicativo, `nav` com nome acessível, `main` com
  `id="conteudo-principal"` e título principal da página.
- Link de salto “Ir para o conteúdo”, visível ao receber foco.
- Link Início apontando para `/`, identificado como página atual.
- Conteúdo inicial breve informando que a base está disponível e que a configuração
  Firebase ocorrerá na próxima etapa. Nenhum valor financeiro ou promessa de recurso pronto.
- Omitir links para lançamentos, cartões, login e outros recursos ainda indisponíveis.

Uma única página não exige biblioteca de rotas. A navegação Início e o link de salto são
funcionais e verificáveis. Refresh em `/` mantém a mesma página; não criar rotas artificiais.

## Acessibilidade e responsividade

Testar a 360 e 1280 pixels de largura. Conteúdo deve se reorganizar sem sobreposição,
corte de texto ou rolagem horizontal da página. Usar HTML semântico, contraste legível,
foco visível e ordem de teclado compatível com a ordem de leitura.
Tab/Shift+Tab devem alcançar os links; Enter deve ativá-los. O salto deve direcionar
navegação/foco ao conteúdo principal e permitir continuar a leitura sem percorrer o header.

## Estados e efeitos

A tela não depende de dados remotos. Não mostrar spinner de Firebase, formulário de login,
configuração obrigatória, toast de conexão ou status “conectado”. Mesmo com quatro valores
de ambiente preenchidos, a aplicação não importa SDK nem inicia integração.

Não consumir fontes, ícones, analytics ou outros assets remotos para esta tela; usar CSS e
assets locais necessários. Requisições locais do Vite, incluindo HMR em desenvolvimento,
não são conexões Firebase e não constituem falha do critério de ausência de integração.

## Aceitação

Inspecionar a tela e o painel de rede em dev e preview; verificar ausência de erros de
configuração e chamadas de integração. Avaliar os quatro estados definidos em
[environment.md](environment.md). Documentar observações reais e limitações de navegador.
