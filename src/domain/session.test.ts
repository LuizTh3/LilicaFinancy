import { describe, expect, it } from 'vitest'
import { accessState, endSession, SessionGeneration } from './session'

describe('session boundaries', () => {
  it('never releases missing flags or a false without cutoff', () => {
    expect(accessState({ schemaVersion: 1 }, 100)).toBe('firstLoginRequired')
    expect(accessState({ schemaVersion: 1, primeiro_login: false }, 100)).toBe('error')
  })
  it('requires a strictly newer authentication, including same-second login', () => {
    const profile = { schemaVersion: 1, primeiro_login: false, completedAt: 100500 }
    expect(accessState(profile, 100)).toBe('reloginRequired')
    expect(accessState(profile, 101)).toBe('ready')
    expect(accessState({ ...profile, schemaVersion: 9 }, 200)).toBe('error')
  })
  it('invalidates previous asynchronous generations', () => {
    const generation = new SessionGeneration()
    const first = generation.next()
    generation.next()
    expect(generation.isCurrent(first)).toBe(false)
  })
  it('clears private state before async logout and navigates only after confirmation', async () => {
    const events: string[] = []
    await endSession(() => { events.push('clear') }, async () => { events.push('signOut') }, () => { events.push('navigate') })
    expect(events).toEqual(['clear', 'signOut', 'navigate'])
    events.length = 0
    await expect(endSession(() => { events.push('clear') }, async () => { throw new Error('network') }, () => { events.push('navigate') })).rejects.toThrow()
    expect(events).toEqual(['clear'])
  })
})
