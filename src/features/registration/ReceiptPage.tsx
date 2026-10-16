import { Link, useLocation } from 'react-router'
import type { Receipt } from '../../infrastructure/trusted-api/contracts'
import { registrationWhatsappUrl } from './whatsapp'
export function ReceiptPage() {
  const state = useLocation().state as { receipt?: Receipt } | null
  return <section><h1>{state?.receipt ? 'Solicitação recebida' : 'Comprovante indisponível'}</h1>{state?.receipt ? <><p>Referência: <code>{state.receipt.requestId}</code></p><p>O responsável criará a conta posteriormente. Este recibo não libera acesso.</p><p>O aviso por email será processado separadamente.</p><p>Se o WhatsApp não abriu, use o botão abaixo. A mensagem estará preenchida; você confirma o envio no WhatsApp.</p><p><a className="nav-link" href={registrationWhatsappUrl} rel="noreferrer">Continuar no WhatsApp</a></p></> : <p>Este endereço não permite consultar dados pessoais. Se o envio foi confirmado, aguarde o responsável.</p>}<Link to="/login">Ir para login</Link></section>
}
