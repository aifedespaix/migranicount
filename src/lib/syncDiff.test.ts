import { describe, it, expect } from 'vitest'
import {
  computeMigrainesDiff,
  computeCatalogueDiff,
  buildSyncToasts,
} from './syncDiff'
import type { Migraine, MedocFavori } from '../types/migraine'

function makeMigraine(id: string, date: string, updatedAt = '2024-01-01T00:00:00Z'): Migraine {
  return {
    id,
    date,
    heureDebut: '08:00',
    heureFin: null,
    medocs: [],
    intensite: 5,
    avortee: false,
    symptomes: [],
    zone: null,
    declencheurs: [],
    createdAt: updatedAt,
    updatedAt,
  }
}

describe('computeMigrainesDiff', () => {
  it('détecte les ajouts', () => {
    const before: Migraine[] = []
    const after = [makeMigraine('a', '2024-06-01')]
    const diff = computeMigrainesDiff(before, after)
    expect(diff.added).toHaveLength(1)
    expect(diff.added[0].id).toBe('a')
    expect(diff.modified).toHaveLength(0)
    expect(diff.removed).toHaveLength(0)
  })

  it('détecte les suppressions', () => {
    const before = [makeMigraine('a', '2024-06-01')]
    const after: Migraine[] = []
    const diff = computeMigrainesDiff(before, after)
    expect(diff.removed).toHaveLength(1)
    expect(diff.removed[0].id).toBe('a')
  })

  it('détecte les modifications (updatedAt plus récent)', () => {
    const before = [makeMigraine('a', '2024-06-01', '2024-01-01T00:00:00Z')]
    const after = [makeMigraine('a', '2024-06-01', '2024-06-01T12:00:00Z')]
    const diff = computeMigrainesDiff(before, after)
    expect(diff.modified).toHaveLength(1)
    expect(diff.modified[0].id).toBe('a')
  })

  it('ignore les enregistrements inchangés', () => {
    const m = makeMigraine('a', '2024-06-01')
    const diff = computeMigrainesDiff([m], [m])
    expect(diff.added).toHaveLength(0)
    expect(diff.modified).toHaveLength(0)
    expect(diff.removed).toHaveLength(0)
  })
})

describe('computeCatalogueDiff', () => {
  it('détecte un médoc ajouté', () => {
    const medoc: MedocFavori = { nom: 'Doliprane', usageCount: 1 }
    const diff = computeCatalogueDiff([], [medoc], [], [], [], [])
    expect(diff.total).toBe(1)
    expect(diff.items[0]).toContain('Doliprane')
  })

  it('détecte un déclencheur ajouté', () => {
    const diff = computeCatalogueDiff([], [], [], ['Stress'], [], [])
    expect(diff.total).toBe(1)
    expect(diff.items[0]).toContain('Stress')
  })

  it('détecte un symptôme ajouté', () => {
    const diff = computeCatalogueDiff([], [], [], [], [], ['Aura'])
    expect(diff.total).toBe(1)
    expect(diff.items[0]).toContain('Aura')
  })

  it('cumule plusieurs types', () => {
    const medoc: MedocFavori = { nom: 'Ibuprofène', usageCount: 1 }
    const diff = computeCatalogueDiff([], [medoc], [], ['Stress'], [], ['Aura'])
    expect(diff.total).toBe(3)
  })
})

describe('buildSyncToasts', () => {
  it('1 migraine ajoutée → toast individuel', () => {
    const migrainesDiff = {
      added: [makeMigraine('a', '2024-06-15')],
      modified: [],
      removed: [],
    }
    const catalogueDiff = { total: 0, items: [] }
    const msgs = buildSyncToasts(migrainesDiff, catalogueDiff)
    expect(msgs).toHaveLength(1)
    expect(msgs[0]).toContain('15/06/2024')
    expect(msgs[0]).toContain('ajoutée')
  })

  it('2 migraines modifiées → 2 toasts individuels', () => {
    const migrainesDiff = {
      added: [],
      modified: [makeMigraine('a', '2024-06-01'), makeMigraine('b', '2024-06-10')],
      removed: [],
    }
    const catalogueDiff = { total: 0, items: [] }
    const msgs = buildSyncToasts(migrainesDiff, catalogueDiff)
    expect(msgs).toHaveLength(2)
  })

  it('4 migraines → 1 toast récap', () => {
    const migrainesDiff = {
      added: [
        makeMigraine('a', '2024-06-01'),
        makeMigraine('b', '2024-06-02'),
        makeMigraine('c', '2024-06-03'),
        makeMigraine('d', '2024-06-04'),
      ],
      modified: [],
      removed: [],
    }
    const catalogueDiff = { total: 0, items: [] }
    const msgs = buildSyncToasts(migrainesDiff, catalogueDiff)
    expect(msgs).toHaveLength(1)
    expect(msgs[0]).toContain('4')
    expect(msgs[0]).toContain('migraine')
  })

  it('3 objets catalogue → 3 toasts individuels', () => {
    const migrainesDiff = { added: [], modified: [], removed: [] }
    const catalogueDiff = {
      total: 3,
      items: ['Doliprane ajouté', 'Stress ajouté', 'Aura ajoutée'],
    }
    const msgs = buildSyncToasts(migrainesDiff, catalogueDiff)
    expect(msgs).toHaveLength(3)
  })

  it('4 objets catalogue → 1 toast récap', () => {
    const migrainesDiff = { added: [], modified: [], removed: [] }
    const catalogueDiff = {
      total: 4,
      items: ['A', 'B', 'C', 'D'],
    }
    const msgs = buildSyncToasts(migrainesDiff, catalogueDiff)
    expect(msgs).toHaveLength(1)
    expect(msgs[0]).toContain('4')
  })

  it('aucun changement → tableau vide', () => {
    const migrainesDiff = { added: [], modified: [], removed: [] }
    const catalogueDiff = { total: 0, items: [] }
    const msgs = buildSyncToasts(migrainesDiff, catalogueDiff)
    expect(msgs).toHaveLength(0)
  })
})
