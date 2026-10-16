const messages: Record<string, string> = {
  SAME_PASSWORD: 'Escolha uma senha diferente da senha atual.',
  PASSWORD_POLICY: 'A nova senha não atende à política de segurança da conta.',
  PASSWORD_CHANGE_UNCERTAIN: 'A senha pode já ter mudado. Saia, entre com a senha recém escolhida e escolha outra nova senha para concluir o primeiro acesso.',
  REAUTH_REQUIRED: 'Entre novamente para continuar.', OPERATION_BUSY: 'Há uma operação em andamento. Aguarde e tente novamente.',
  OPERATION_CONFLICT: 'Esta operação foi alterada. Recarregue antes de continuar.',
  RATE_LIMITED: 'Limite temporário atingido. Tente mais tarde.', CHALLENGE_REQUIRED: 'Confirme novamente o desafio de segurança.',
  CONFIG_TRUSTED_API: 'Serviço de acesso ainda não configurado. Contate o responsável.',
  'permission-denied': 'Você não tem permissão para esta operação.',
}
export function errorMessage(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code).replace(/^firestore\//, '') : ''
  return messages[code] ?? 'Não foi possível concluir. Confira os dados e a conexão e tente novamente.'
}
