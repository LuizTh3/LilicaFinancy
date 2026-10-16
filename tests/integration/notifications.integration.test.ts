import { expect, it } from 'vitest'
import { doc, getDocFromServer } from 'firebase/firestore'
import { integrationClients } from './support/clients'
import { requireFixture } from './support/manifest'
import { integrationEnvironment } from './support/environment'
if (!process.env.TEST_REQUEST_ID || process.env.TEST_ALLOW_EMAIL !== 'yes' || process.env.TEST_ADMIN_A_CONFIRMED !== 'yes') throw new Error('Email bloqueado: usar uma solicitação fictícia existente e autorizar conferência com admin dedicado')
it('records real provider acceptance separately from inbox delivery', async () => {
  requireFixture(integrationEnvironment(process.env), `registrationRequests/${process.env.TEST_REQUEST_ID!}`)
  const clients = await integrationClients()
  try {
    const outbox = (await getDocFromServer(doc(clients.a.db, 'notificationOutbox', process.env.TEST_REQUEST_ID!))).data()
    expect(['accepted', 'accepted_deduplicated']).toContain(outbox?.status)
    if (outbox?.status === 'accepted') expect(typeof outbox.providerMessageId).toBe('string')
    expect(outbox).not.toHaveProperty('cpf'); expect(outbox).not.toHaveProperty('whatsapp')
  } finally { await clients.close() }
})
