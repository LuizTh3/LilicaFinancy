import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { requestDetail, saveSubscription } from '../../infrastructure/firebase/adminRepository'
import { useSession } from '../../app/session/useSession'
import { validatePeriod } from '../../domain/subscription'
import { errorMessage } from '../../shared/components/errorMessage'
import { mayApplyEditorResult, notificationLabel } from './subscriptionEditor'
export function RequestDetailPage() {
  const { requestId = '' } = useParams(), session = useSession(), generation = useRef(0)
  const { invalidate } = session
  const [data, setData] = useState<Awaited<ReturnType<typeof requestDetail>>>(), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [reload, setReload] = useState(0)
  useEffect(() => {
    const current = ++generation.current
    // eslint-disable-next-line react/set-state-in-effect -- Remove the previous protected document while fetching the selected ID.
    setData(undefined); setMessage('')
    void requestDetail(requestId).then(value => { if (mayApplyEditorResult(current, generation.current, true)) setData(value) }).catch(cause => { if (current === generation.current) { setMessage(errorMessage(cause)); if (cause.code === 'permission-denied') invalidate() } })
    return () => { generation.current = current + 1 }
  }, [requestId, reload, invalidate])
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !data || !session.user) return
    const fields = new FormData(event.currentTarget), start = String(fields.get('start')), end = String(fields.get('end')), current = generation.current
    if (!validatePeriod(start, end)) { setMessage('Informe duas datas válidas, com fim igual ou posterior ao início.'); return }
    setBusy(true); setMessage('')
    try {
      await saveSubscription(requestId, start, end, data.subscription?.version ?? 0, session.user.uid)
      if (current === generation.current) { setReload(value => value + 1) }
    } catch (cause) { if (current === generation.current) { setMessage(errorMessage(cause)); if ((cause as { code?: string }).code === 'permission-denied') session.invalidate() } }
    finally { if (current === generation.current) setBusy(false) }
  }
  return <section><Link to="/admin/solicitacoes">Voltar às solicitações</Link><h1>Dados da solicitação</h1>{!data ? <output>{message ? 'Consulta indisponível.' : 'Carregando…'}</output> : <><dl>{Object.entries({ 'Nome completo': data.request.fullName, CPF: data.request.cpf, WhatsApp: data.request.whatsapp, Email: data.request.email }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>Aviso por email: {notificationLabel(data.notificationStatus)}</p><h2>Assinatura</h2><p>Registro informativo. As datas não alteram o acesso.</p><form key={`${requestId}-${data.subscription?.version ?? 0}`} onSubmit={save} className="form-panel">
    <label>Data de início<input type="date" name="start" required defaultValue={data.subscription?.startDate} /></label>
    <label>Data de finalização<input type="date" name="end" required defaultValue={data.subscription?.endDate} /></label>
    <button disabled={busy}>{busy ? 'Salvando…' : 'Salvar período'}</button>
    {data.subscription && <output>Período confirmado. Versão {data.subscription.version}.</output>}
  </form></>}{message && <p role="alert">{message}</p>}<button onClick={() => { setBusy(false); setReload(value => value + 1) }}>Recarregar dados</button></section>
}
