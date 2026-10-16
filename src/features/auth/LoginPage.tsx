import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { login } from '../../infrastructure/firebase/auth'
import { useSession } from '../../app/session/useSession'
import { SessionFeedback } from '../../app/guards/SessionGate'
export function LoginPage() {
  const session = useSession()
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  if (session.status === 'firstLoginRequired') return <Navigate to="/primeiro-acesso" replace />
  if (session.status === 'readyUser' || session.status === 'readyAdmin') return <Navigate to="/app" replace />
  if (session.status !== 'guest' && session.status !== 'reloginRequired') return <SessionFeedback />
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return
    const form = event.currentTarget, data = new FormData(form)
    setBusy(true); setError('')
    try { await login(String(data.get('email')), String(data.get('password'))); form.reset() }
    catch { setError('Não foi possível entrar. Confira suas credenciais e a conexão.'); form.querySelector<HTMLInputElement>('[name=password]')!.value = '' }
    finally { setBusy(false) }
  }
  return <section className="form-panel"><h1>Entrar</h1><p>Use a conta fornecida pelo responsável.</p>{session.status === 'reloginRequired' && <output>Entre novamente com sua nova senha para iniciar.</output>}<form onSubmit={submit}>
    <label>Email<input name="email" type="email" autoComplete="username" required /></label>
    <label>Senha<input name="password" type="password" autoComplete="current-password" required /></label>
    {error && <p role="alert">{error}</p>}<button disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
  </form><p><Link to="/cadastro">Solicitar cadastro</Link></p></section>
}
