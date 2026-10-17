const messages: Record<string, string> = {
  SAME_PASSWORD: 'Escolha uma senha diferente da senha atual.',
  PASSWORD_POLICY: 'A nova senha não atende à política de segurança da conta.',
  PASSWORD_CHANGE_UNCERTAIN: 'A senha pode já ter mudado. Saia, entre com a senha recém escolhida e escolha outra nova senha para concluir o primeiro acesso.',
  REAUTH_REQUIRED: 'Entre novamente para continuar.', OPERATION_BUSY: 'Há uma operação em andamento. Aguarde e tente novamente.',
  OPERATION_CONFLICT: 'Esta operação foi alterada. Recarregue antes de continuar.',
  RATE_LIMITED: 'Limite temporário atingido. Tente mais tarde.', CHALLENGE_REQUIRED: 'Confirme novamente o desafio de segurança.',
  CONFIG_TRUSTED_API: 'Serviço de acesso ainda não configurado. Contate o responsável.',
  CONFIG_INCOMPLETE: 'O serviço de cadastro está com configuração pendente. Avise o responsável para concluir a configuração na Cloudflare.',
  DEPENDENCY_UNAVAILABLE: 'O serviço não conseguiu concluir a operação. O responsável deve verificar a conexão e as permissões dos serviços configurados.',
  NETWORK_UNAVAILABLE: 'Não foi possível conectar ao serviço de cadastro. Verifique a conexão e tente novamente.',
  INVALID_SERVICE_RESPONSE: 'O serviço retornou uma resposta inesperada. Avise o responsável.',
  INVALID_INPUT: 'Os dados enviados não foram aceitos. Confira os campos e tente novamente.',
  'permission-denied': 'Você não tem permissão para esta operação.',
}
export function errorMessage(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code).replace(/^firestore\//, '') : ''
  const message = messages[code] ?? 'Não foi possível concluir. Confira os dados e a conexão e tente novamente.'
  const requestId = error && typeof error === 'object' && 'requestId' in error && typeof error.requestId === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(error.requestId) ? error.requestId : ''
  return requestId ? `${message} Referência: ${requestId}.` : message
}
