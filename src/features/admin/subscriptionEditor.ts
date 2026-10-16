export function mayApplyEditorResult(generation: number, current: number, ready: boolean) { return ready && generation === current }
export function notificationLabel(status: string) {
  const labels: Record<string, string> = { pending: 'Pendente', sending: 'Em processamento', accepted: 'Aceito pelo provedor', accepted_deduplicated: 'Aceito (deduplicado)', retry_wait: 'Aguardando nova tentativa', failed: 'Falha no envio', uncertain: 'Resultado incerto; exige conferência' }
  return labels[status] ?? 'Estado desconhecido'
}
