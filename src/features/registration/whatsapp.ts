const registrationMessage = 'Olá! Gostaria de realizar meu cadastro na plataforma LilicaFinancy para organizar minhas finanças e acompanhar minhas receitas, despesas e compromissos. Já enviei minha solicitação pelo aplicativo. Como posso concluir meu acesso?'

// Fixed destination and generic text: never include CPF, email or form values in this URL.
export const registrationWhatsappUrl = `https://wa.me/5568999739841?text=${encodeURIComponent(registrationMessage)}`
