import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMedocsFavorisStore } from './medocsFavoris'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('useMedocsFavorisStore', () => {
  it('loads existing favoris on creation', () => {
    const store = useMedocsFavorisStore()
    expect(store.favoris).toEqual([])
  })

  it('registerUsage adds a favori with a stable id and updates reactive state', () => {
    const store = useMedocsFavorisStore()
    const created = store.registerUsage('Doliprane', 'antidouleur')
    expect(store.favoris).toHaveLength(1)
    expect(store.favoris[0]).toMatchObject({ nom: 'Doliprane', description: 'antidouleur', usageCount: 1 })
    expect(created.id).toBeTruthy()
  })

  it('updateDescription updates reactive state by id', () => {
    const store = useMedocsFavorisStore()
    const created = store.registerUsage('Doliprane', 'antidouleur')
    store.updateDescription(created.id, 'nouvelle description')
    expect(store.favoris[0].description).toBe('nouvelle description')
  })

  it('renameMedoc keeps the same id', () => {
    const store = useMedocsFavorisStore()
    const created = store.registerUsage('Doliprane')
    store.renameMedoc(created.id, 'Dolipranex')
    expect(store.favoris).toHaveLength(1)
    expect(store.favoris[0].id).toBe(created.id)
    expect(store.favoris[0].nom).toBe('Dolipranex')
  })
})
