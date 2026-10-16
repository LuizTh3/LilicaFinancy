import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router'
import { useSession } from '../../app/session/useSession'
import { SessionFeedback } from '../../app/guards/SessionGate'
import { trustedApi } from '../../infrastructure/trusted-api/client'
import { operationId } from '../../infrastructure/trusted-api/contracts'
import type { PasswordReceipt } from '../../infrastructure/trusted-api/contracts'
import { checkPasswordPolicy } from '../../infrastructure/firebase/auth'
import { errorMessage } from '../../shared/components/errorMessage'
export function FirstLoginPage() {
  const session = useSession(), key = useRef(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [completed, setCompleted] = useState(false)
  if (session.status === 'guest' || session.status === 'reloginRequired') return <Navigate to="/login" replace />
  if (session.status === 'readyUser' || session.status === 'readyAdmin') return <Navigate to="/app" replace />
  if (session.status !== 'firstLoginRequired') return <SessionFeedback />
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !session.user) return
    const form = event.currentTarget, data = new FormData(form)
    const newPassword = String(data.get('newPassword')), confirmPassword = String(data.get('confirmPassword'))
    if (!newPassword || newPassword !== confirmPassword) { setError('Preencha senhas iguais nos dois campos.'); return }
    setBusy(true); setError('')
    try {
      if (!(await checkPasswordPolicy(newPassword)).isValid) { setError('A senha não atende à política de segurança da conta.'); return }
      key.current ||= operationId()
      const result = await trustedApi<PasswordReceipt>('first-login/change-password', { newPassword, confirmPassword }, key.current, await session.user.getIdToken())
      form.reset(); setCompleted(true)
      const delay = Math.max(0, result.loginAvailableAt - Date.now())
      if (delay > 0 && delay < 5000) await new Promise(resolve => setTimeout(resolve, delay))
      await session.exit()
    } catch (cause) { form.reset(); setError(errorMessage(cause)) }
    finally { setBusy(false) }
  }
  return <section className="form-panel"><h1>Primeiro acesso</h1><p>Atualize a senha provisória. Depois, entre novamente com a nova senha.</p>{!completed && <form onSubmit={submit}>
    <label>Nova senha<input name="newPassword" type="password" autoComplete="new-password" required /></label>
    <label>Confirmar nova senha<input name="confirmPassword" type="password" autoComplete="new-password" required /></label>
    <button disabled={busy}>{busy ? 'Atualizando…' : 'Atualizar senha'}</button>
  </form>}{completed && <output>Senha atualizada. Encerrando a sessão…</output>}{error && <p role="alert">{error}</p>}<button type="button" disabled={busy} onClick={() => { void session.exit().catch(() => setError('Tente sair novamente.')) }}>Sair</button></section>
}
