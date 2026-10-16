import { collection, doc, documentId, getDocFromServer, getDocsFromServer, limit, orderBy, query, runTransaction, serverTimestamp, startAfter } from 'firebase/firestore'
import type { QueryDocumentSnapshot } from 'firebase/firestore'
import { firebase } from './client'
import { validatePeriod } from '../../domain/subscription'
export type RequestData = { fullName: string; cpf: string; whatsapp: string; email: string; status: string }
export async function requestsPage(cursor?: QueryDocumentSnapshot) {
  const constraints = [orderBy('createdAt', 'desc'), orderBy(documentId(), 'desc'), ...(cursor ? [startAfter(cursor)] : []), limit(25)]
  return (await getDocsFromServer(query(collection(firebase().db, 'registrationRequests'), ...constraints))).docs
}
export async function requestDetail(id: string) {
  if (!/^[a-f0-9]{64}$/.test(id)) throw new Error('INVALID_ID')
  const { db } = firebase()
  const [request, subscription, outbox] = await Promise.all([getDocFromServer(doc(db, 'registrationRequests', id)), getDocFromServer(doc(db, 'subscriptions', id)), getDocFromServer(doc(db, 'notificationOutbox', id))])
  if (!request.exists()) throw new Error('NOT_FOUND')
  return { request: request.data() as RequestData, subscription: subscription.data() as { startDate: string; endDate: string; version: number } | undefined, notificationStatus: String(outbox.data()?.status ?? 'pending') }
}
export async function saveSubscription(id: string, startDate: string, endDate: string, expectedVersion: number, uid: string) {
  if (!validatePeriod(startDate, endDate) || !/^[a-f0-9]{64}$/.test(id)) throw new Error('INVALID_PERIOD')
  const { db } = firebase(), ref = doc(db, 'subscriptions', id)
  await runTransaction(db, async tx => {
    const existing = await tx.get(ref), data = existing.data()
    if (Number(data?.version ?? 0) !== expectedVersion) throw Object.assign(new Error('OPERATION_CONFLICT'), { code: 'OPERATION_CONFLICT' })
    tx.set(ref, { requestId: id, startDate, endDate, version: expectedVersion + 1, updatedBy: uid, createdAt: data?.createdAt ?? serverTimestamp(), updatedAt: serverTimestamp() })
  })
}
