import { describe, it, expect, beforeEach, vi } from 'vitest'

const pushMigraine = vi.fn().mockResolvedValue(undefined)
const deleteMigraineAndTombstoneAtomic = vi.fn().mockResolvedValue(undefined)
const pushMedocFavori = vi.fn().mockResolvedValue(undefined)
const deleteMedocAndTombstoneAtomic = vi.fn().mockResolvedValue(undefined)
const pushTombstone = vi.fn().mockResolvedValue(undefined)
const deleteTombstoneRemote = vi.fn().mockResolvedValue(undefined)
const patchPreferences = vi.fn().mockResolvedValue(undefined)

vi.mock('./pbSync', () => ({
  pushMigraine: (...a: unknown[]) => pushMigraine(...a),
  deleteMigraineAndTombstoneAtomic: (...a: unknown[]) => deleteMigraineAndTombstoneAtomic(...a),
  pushMedocFavori: (...a: unknown[]) => pushMedocFavori(...a),
  deleteMedocAndTombstoneAtomic: (...a: unknown[]) => deleteMedocAndTombstoneAtomic(...a),
  pushTombstone: (...a: unknown[]) => pushTombstone(...a),
  deleteTombstoneRemote: (...a: unknown[]) => deleteTombstoneRemote(...a),
  patchPreferences: (...a: unknown[]) => patchPreferences(...a),
}))

let authValid = true
vi.mock('./pocketbase', () => ({
  pb: { authStore: { get isValid() { return authValid } } },
}))

import { enqueue, processOutbox, listOutbox } from './syncOutbox'
import type { Migraine } from '../types/migraine'

function makeMigraine(id: string): Migraine {
  return {
    id, date: '2026-01-01', heureDebut: '08:00', heureFin: null,
    medocs: [], intensite: 5, avortee: false, symptomes: [],
    zone: null, declencheurs: [], createdAt: '', updatedAt: '',
  }
}

beforeEach(() => {
  localStorage.clear()
  authValid = true
  vi.clearAllMocks()
})

describe('syncOutbox', () => {
  it('enqueue persists the op and processes it immediately when online', async () => {
    enqueue({ type: 'migraine-upsert', migraine: makeMigraine('m1') })
    await vi.waitFor(() => expect(listOutbox()).toHaveLength(0))
    expect(pushMigraine).toHaveBeenCalledTimes(1)
  })

  it('does not process while offline, but keeps the op queued', async () => {
    authValid = false
    enqueue({ type: 'migraine-upsert', migraine: makeMigraine('m1') })
    await new Promise((r) => setTimeout(r, 10))
    expect(pushMigraine).not.toHaveBeenCalled()
    expect(listOutbox()).toHaveLength(1)
  })

  it('processes queued ops in order once back online', async () => {
    authValid = false
    enqueue({ type: 'migraine-upsert', migraine: makeMigraine('m1') })
    enqueue({ type: 'migraine-upsert', migraine: makeMigraine('m2') })
    authValid = true
    await processOutbox()
    expect(pushMigraine).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 'm1' }))
    expect(pushMigraine).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 'm2' }))
    expect(listOutbox()).toHaveLength(0)
  })

  it('stops at the first failure and retries it (does not skip ahead)', async () => {
    pushMigraine.mockRejectedValueOnce(new Error('network down'))
    authValid = false
    enqueue({ type: 'migraine-upsert', migraine: makeMigraine('m1') })
    enqueue({ type: 'migraine-upsert', migraine: makeMigraine('m2') })
    authValid = true
    await processOutbox()
    expect(pushMigraine).toHaveBeenCalledTimes(1)
    expect(listOutbox()).toHaveLength(2) // both still queued - the failed op blocks the rest

    pushMigraine.mockResolvedValueOnce(undefined)
    await processOutbox()
    expect(pushMigraine).toHaveBeenCalledTimes(3) // retried m1, then m2
    expect(listOutbox()).toHaveLength(0)
  })

  it('routes migraine-delete through the atomic batch function', async () => {
    authValid = false
    enqueue({ type: 'migraine-delete', id: 'm1', tombstone: { entityType: 'migraine', entityId: 'm1', deletedAt: 'x' } })
    authValid = true
    await processOutbox()
    expect(deleteMigraineAndTombstoneAtomic).toHaveBeenCalledWith('m1', expect.objectContaining({ entityId: 'm1' }))
  })

  it('routes medoc-delete through the atomic batch function', async () => {
    authValid = false
    enqueue({ type: 'medoc-delete', id: 'med1', tombstone: { entityType: 'medoc', entityId: 'med1', deletedAt: 'x' } })
    authValid = true
    await processOutbox()
    expect(deleteMedocAndTombstoneAtomic).toHaveBeenCalledWith('med1', expect.objectContaining({ entityId: 'med1' }))
  })

  it('routes tombstone-clear through deleteTombstoneRemote', async () => {
    authValid = false
    enqueue({ type: 'tombstone-clear', entityType: 'symptome', entityId: 's1' })
    authValid = true
    await processOutbox()
    expect(deleteTombstoneRemote).toHaveBeenCalledWith('symptome', 's1')
  })

  it('routes preferences-patch through patchPreferences', async () => {
    authValid = false
    enqueue({ type: 'preferences-patch', patch: { theme: 'dark' } })
    authValid = true
    await processOutbox()
    expect(patchPreferences).toHaveBeenCalledWith({ theme: 'dark' })
  })
})
