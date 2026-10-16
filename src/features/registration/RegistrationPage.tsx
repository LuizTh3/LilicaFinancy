import { useCallback, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { parseRegistration, formatWhatsapp } from '../../domain/registration'
import { trustedApi } from '../../infrastructure/trusted-api/client'
import { operationId } from '../../infrastructure/trusted-api/contracts'
import type { Receipt } from '../../infrastructure/trusted-api/contracts'
import { errorMessage } from '../../shared/components/errorMessage'
import { TurnstileWidget } from './TurnstileWidget'
import { registrationWhatsappUrl } from './whatsapp'
export function RegistrationPage() {
  const navigate = useNavigate(), key = useRef(''), fingerprint = useRef(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [token, setToken] = useState(''), [reset, setReset] = useState(0)
  const onToken = useCallback((value: string) => setToken(value), [])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return
    const data = new FormData(event.currentTarget)
    let parsed
    try { parsed = parseRegistration(Object.fromEntries(['fullName', 'cpf', 'whatsapp', 'email'].map(field => [field, String(data.get(field))]))) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Dados inválidos.'); return }
    if (!token) { setError('Confirme o desafio de segurança.'); return }
    // Preserve only a digest in memory to distinguish a new deliberate payload from a retry.
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(parsed)))
    const digest = Array.from(new Uint8Array(bytes)).join(',')
    if (fingerprint.current && fingerprint.current !== digest) { setError('Os dados mudaram. Recarregue para iniciar outra solicitação; uma tentativa anterior pode já ter sido recebida.'); return }
    fingerprint.current = digest; key.current ||= operationId()
    setBusy(true); setError('')
    try {
      const receipt = await trustedApi<Receipt>('registration-requests', { ...parsed, turnstileToken: token }, key.current)
      navigate('/cadastro/recebido', { replace: true, state: { receipt } })
      // Only leave after persistence confirms success. The receipt remains a fallback on Back.
      try { window.location.assign(registrationWhatsappUrl) } catch { /* The receipt offers a manual link if navigation is blocked. */ }
    } catch (cause) { setError(errorMessage(cause)); setToken(''); setReset(value => value + 1) }
    finally { setBusy(false) }
  }
  return <section className="form-panel"><h1>Solicitar cadastro</h1><p>O responsável analisará a solicitação e criará sua conta manualmente.</p><p>Depois de salvar o pedido, você será encaminhado ao WhatsApp com uma mensagem pronta para enviar. O aviso por email também será mantido.</p><form onSubmit={submit}>
    <label>Nome completo<input name="fullName" autoComplete="name" maxLength={150} required /></label>
    <label>CPF<input name="cpf" inputMode="numeric" maxLength={14} required /></label>
    <label>WhatsApp<input name="whatsapp" type="tel" autoComplete="tel" placeholder="+55 (68) 99999-1234" onBlur={event => { if (event.target.value) event.target.value = formatWhatsapp(event.target.value) }} required /></label>
    <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
    <TurnstileWidget onToken={onToken} reset={reset} />{error && <p role="alert">{error}</p>}
    <button disabled={busy || !token}>{busy ? 'Salvando solicitação…' : 'Enviar solicitação e ir para WhatsApp'}</button>
  </form><p><Link to="/login">Já tenho uma conta</Link></p></section>
}
