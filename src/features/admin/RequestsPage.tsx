import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { QueryDocumentSnapshot } from 'firebase/firestore'
import { requestsPage } from '../../infrastructure/firebase/adminRepository'
import { useSession } from '../../app/session/useSession'
import { errorMessage } from '../../shared/components/errorMessage'
export function RequestsPage() {
  const { invalidate } = useSession(), [cursors, setCursors] = useState<(QueryDocumentSnapshot | undefined)[]>([undefined]), [docs, setDocs] = useState<QueryDocumentSnapshot[]>([]), [busy, setBusy] = useState(true), [error, setError] = useState('')
  useEffect(() => {
    let active = true
    // eslint-disable-next-line react/set-state-in-effect -- Clear the previous remote page before changing its cursor.
    setBusy(true); setDocs([]); setError('')
    void requestsPage(cursors.at(-1)).then(result => { if (active) setDocs(result) }).catch(cause => { if (active) { setError(errorMessage(cause)); if (cause.code === 'permission-denied') invalidate() } }).finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [cursors, invalidate])
  return <section><h1>Solicitações</h1>{busy ? <output>Carregando…</output> : <>{!docs.length && !error && <p>Nenhuma solicitação neste período.</p>}<div className="table-scroll"><table><thead><tr><th>Nome</th><th>Email</th><th>Detalhes</th></tr></thead><tbody>{docs.map(row => <tr key={row.id}><td>{String(row.data().fullName)}</td><td>{String(row.data().email)}</td><td><Link to={`/admin/solicitacoes/${row.id}`}>Consultar</Link></td></tr>)}</tbody></table></div></>}{error && <p role="alert">{error}</p>}<div className="actions"><button disabled={busy || cursors.length === 1} onClick={() => setCursors(value => value.slice(0, -1))}>Anterior</button><button disabled={busy || docs.length < 25} onClick={() => setCursors(value => [...value, docs.at(-1)])}>Próxima</button><button disabled={busy} onClick={() => setCursors(value => [...value])}>Recarregar</button></div></section>
}
