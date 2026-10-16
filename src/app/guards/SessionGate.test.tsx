import { expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { SessionGate } from './SessionGate'
import { AdminGate } from './AdminGate'
import { SessionContext } from '../session/useSession'
import type { SessionStatus } from '../session/useSession'
function render(status: SessionStatus, admin = false) {
  return renderToString(<SessionContext.Provider value={{ status, user: null, retry: () => {}, exit: async () => {}, invalidate: () => {} }}><MemoryRouter initialEntries={['/private']}><Routes><Route element={<SessionGate />}><Route element={admin ? <AdminGate /> : undefined}><Route path="/private" element={<div>PRIVATE_FIXTURE_CONTENT</div>} /></Route></Route></Routes></MemoryRouter></SessionContext.Provider>)
}
it('never mounts private content during any unresolved, provisional or failed state', () => {
  const statuses: SessionStatus[] = ['resolvingAuth', 'resolvingProfile', 'resolvingRole', 'guest', 'firstLoginRequired', 'reloginRequired', 'logoutPending', 'error']
  for (const status of statuses) expect(render(status)).not.toContain('PRIVATE_FIXTURE_CONTENT')
  expect(render('readyUser')).toContain('PRIVATE_FIXTURE_CONTENT')
})
it('keeps the administrative outlet absent for ordinary users and removed roles', () => {
  expect(render('readyUser', true)).not.toContain('PRIVATE_FIXTURE_CONTENT')
  expect(render('readyAdmin', true)).toContain('PRIVATE_FIXTURE_CONTENT')
})
