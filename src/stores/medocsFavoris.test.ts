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

  it('registerUsage adds a favori and updates reactive state', () => {
    const store = useMedocsFavorisStore()
    store.registerUsage('Doliprane', 'antidouleur')
    expect(store.favoris).toEqual([{ nom: 'Doliprane', description: 'antidouleur', usageCount: 1 }])
  })

  it('updateDescription updates reactive state', () => {
    const store = useMedocsFavorisStore()
    store.registerUsage('Doliprane', 'antidouleur')
    store.updateDescription('Doliprane', 'nouvelle description')
    expect(store.favoris[0].description).toBe('nouvelle description')
  })
})
