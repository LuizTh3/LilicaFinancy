import { useEffect, useRef } from 'react'
type Turnstile = { render: (node: HTMLElement, options: { sitekey: string; action: string; callback: (token: string) => void; 'expired-callback': () => void; 'error-callback': () => void }) => string; remove: (id: string) => void }
declare global { interface Window { turnstile?: Turnstile } }
let scriptPromise: Promise<void> | undefined
function loadScript() {
  return scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => resolve(); script.onerror = () => { scriptPromise = undefined; reject(new Error('CHALLENGE_UNAVAILABLE')) }
    document.head.append(script)
  })
}
export function TurnstileWidget({ onToken, reset }: { onToken: (token: string) => void; reset: number }) {
  const container = useRef<HTMLDivElement>(null)
  const sitekey = import.meta.env.VITE_TURNSTILE_SITE_KEY
  useEffect(() => {
    if (!sitekey) return
    let disposed = false, id: string | undefined
    void loadScript().then(() => {
      if (!disposed && container.current && window.turnstile) id = window.turnstile.render(container.current, { sitekey, action: 'registration', callback: onToken, 'expired-callback': () => onToken(''), 'error-callback': () => onToken('') })
    }).catch(() => onToken(''))
    return () => { disposed = true; if (id) window.turnstile?.remove(id) }
  }, [sitekey, onToken, reset])
  return <div>{!sitekey && <p role="alert">Cadastro indisponível: VITE_TURNSTILE_SITE_KEY não configurada.</p>}<div ref={container} /></div>
}
