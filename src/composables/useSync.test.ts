import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const authRecordId = 'user1'
let authValid = true

const tombstonesCol = { getFullList: vi.fn() }
const migrainesCol = { getFullList: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() }
const medocsCol = { getFullList: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() }
const prefsCol = { getFirstListItem: vi.fn(), create: vi.fn(), update: vi.fn() }

const collections: Record<string, unknown> = {
  tombstones: tombstonesCol,
  migraines: migrainesCol,
  medocs_favoris: medocsCol,
  user_preferences: prefsCol,
}

vi.mock('../lib/pocketbase', () => ({
  pb: {
    get authStore() {
      return { isValid: authValid, record: { id: authRecordId } }
    },
    collection: (name: string) => collections[name],
  },
}))

import { useSync } from './useSync'
import { useMigrainesStore } from '../stores/migraines'
import { useToastStore } from '../stores/toast'
import { listMigraines, listSymptomesCustom, addSymptomeCustom } from '../storage/migraineRepository'

function remoteMigraine(localId: string) {
  return {
    id: `remote-${localId}`,
    localId,
    userId: authRecordId,
    date: '2026-01-01',
    heureDebut: '08:00',
    heureFin: null,
    medocs: [],
    intensite: 5,
    avortee: 'false',
    symptomes: [],
    zone: null,
    declencheurs: [],
    notes: null,
    localUpdatedAt: '2026-01-01T08:00:00.000Z',
    created: '2026-01-01T08:00:00.000Z',
  }
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  authValid = true
  vi.clearAllMocks()

  tombstonesCol.getFullList.mockRejectedValue(new Error('404: collection "tombstones" not found'))
  migrainesCol.getFullList.mockResolvedValue([remoteMigraine('m1')])
  medocsCol.getFullList.mockResolvedValue([])
  prefsCol.getFirstListItem.mockRejectedValue(new Error('404: not found'))
  prefsCol.create.mockResolvedValue({ id: 'prefs1' })
})

describe('useSync mergeOnLogin resilience', () => {
  it('still merges migraines/medocs/preferences and surfaces a toast when the tombstones step fails', async () => {
    const sync = useSync()

    await sync.mergeOnLogin()

    // The failing step must not block the others.
    expect(migrainesCol.getFullList).toHaveBeenCalledTimes(1)
    expect(medocsCol.getFullList).toHaveBeenCalledTimes(1)
    expect(prefsCol.getFirstListItem).toHaveBeenCalled()

    const merged = listMigraines()
    expect(merged.map((m) => m.id)).toContain('m1')
    expect(useMigrainesStore().migraines.map((m) => m.id)).toContain('m1')

    const toasts = useToastStore().toasts
    expect(toasts.some((t) => t.type === 'danger' && t.message.includes('suppressions'))).toBe(true)
  })

  it('does not get stuck after a partial failure - a later merge can run again', async () => {
    const sync = useSync()
    await sync.mergeOnLogin()
    await sync.mergeOnLogin()

    expect(migrainesCol.getFullList).toHaveBeenCalledTimes(2)
  })
})

describe('useSync _mergePreferences integrity', () => {
  it('normalise et dédoublonne les symptômes distants hérités (strings, doublons par nom)', async () => {
    const local = addSymptomeCustom('Photophobie')
    prefsCol.getFirstListItem.mockResolvedValue({
      id: 'prefs1',
      userId: authRecordId,
      // Ancien format pré-refonte : strings brutes + doublon du même nom sous un autre id
      symptomesCustom: ['Photophobie', 'Osmophobie', '', { id: 'remote-1', nom: 'photophobie' }, { id: 'remote-2', nom: 'Nausée' }],
      declencheursFavoris: [],
      theme: 'auto',
      dyslexicFont: 'none',
    })
    prefsCol.update.mockResolvedValue({})

    await useSync().mergeOnLogin()

    const sympt = listSymptomesCustom()
    // Pas d'entrée vide/sans id, pas de doublon par nom, pas de copie d'un défaut ('Nausée')
    expect(sympt.every((s) => typeof s.id === 'string' && s.id && typeof s.nom === 'string' && s.nom)).toBe(true)
    expect(sympt.map((s) => s.nom.toLowerCase()).sort()).toEqual(['osmophobie', 'photophobie'])
    expect(sympt.find((s) => s.nom === 'Photophobie')?.id).toBe(local.id)
  })
})
