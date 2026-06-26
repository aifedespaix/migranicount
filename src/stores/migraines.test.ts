import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMigrainesStore } from './migraines'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('useMigrainesStore', () => {
  it('loads existing migraines on creation', () => {
    const store = useMigrainesStore()
    expect(store.migraines).toEqual([])
  })

  it('save adds a migraine and updates reactive state', () => {
    const store = useMigrainesStore()
    store.save({
      date: '2026-06-24', heureDebut: '08:00', heureFin: null,
      medocs: [], intensite: 5, avortee: false, symptomes: [],
      localisation: null, declencheurs: [],
    })
    expect(store.migraines).toHaveLength(1)
  })

  it('remove deletes a migraine from reactive state', () => {
    const store = useMigrainesStore()
    const m = store.save({
      date: '2026-06-24', heureDebut: '08:00', heureFin: null,
      medocs: [], intensite: 5, avortee: false, symptomes: [],
      localisation: null, declencheurs: [],
    })
    store.remove(m.id)
    expect(store.migraines).toHaveLength(0)
  })
})
