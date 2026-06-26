import { describe, it, expect } from 'vitest'
import { filterMigraines } from './migraineFilters'
import type { Migraine } from '../types/migraine'

function makeMigraine(overrides: Partial<Migraine>): Migraine {
  return {
    id: 'x', date: '2026-06-01', heureDebut: '08:00', heureFin: '10:00',
    medocs: [], intensite: 5, avortee: false, symptomes: [],
    localisation: null, declencheurs: [], createdAt: '', updatedAt: '',
    ...overrides,
  }
}

describe('filterMigraines', () => {
  it('returns all migraines when no filters are given', () => {
    const data = [makeMigraine({ id: 'a' }), makeMigraine({ id: 'b' })]
    expect(filterMigraines(data, {})).toHaveLength(2)
  })

  it('filters by keyword matching a médoc name', () => {
    const data = [
      makeMigraine({ id: 'a', medocs: [{ id: '1', nom: 'Triptan', heure: '08:00' }] }),
      makeMigraine({ id: 'b', medocs: [{ id: '2', nom: 'Doliprane', heure: '08:00' }] }),
    ]
    const result = filterMigraines(data, { keyword: 'triptan' })
    expect(result.map((m) => m.id)).toEqual(['a'])
  })

  it('filters by keyword matching notes, case- and accent-insensitive', () => {
    const data = [
      makeMigraine({ id: 'a', notes: 'Crise après café' }),
      makeMigraine({ id: 'b', notes: 'Sans rapport' }),
    ]
    const result = filterMigraines(data, { keyword: 'CAFE' })
    expect(result.map((m) => m.id)).toEqual(['a'])
  })

  it('filters by keyword matching a déclencheur', () => {
    const data = [
      makeMigraine({ id: 'a', declencheurs: ['stress', 'fatigue'] }),
      makeMigraine({ id: 'b', declencheurs: ['alcool'] }),
    ]
    const result = filterMigraines(data, { keyword: 'fatigue' })
    expect(result.map((m) => m.id)).toEqual(['a'])
  })

  it('filters by keyword matching the localisation label', () => {
    const data = [
      makeMigraine({ id: 'a', localisation: 'bilaterale' }),
      makeMigraine({ id: 'b', localisation: 'nuque' }),
    ]
    const result = filterMigraines(data, { keyword: 'bilat' })
    expect(result.map((m) => m.id)).toEqual(['a'])
  })

  it('filters by month', () => {
    const data = [
      makeMigraine({ id: 'a', date: '2026-06-15' }),
      makeMigraine({ id: 'b', date: '2026-05-15' }),
    ]
    const result = filterMigraines(data, { month: '2026-06' })
    expect(result.map((m) => m.id)).toEqual(['a'])
  })

  it('combines keyword and month with AND', () => {
    const data = [
      makeMigraine({ id: 'a', date: '2026-06-15', notes: 'café' }),
      makeMigraine({ id: 'b', date: '2026-05-15', notes: 'café' }),
      makeMigraine({ id: 'c', date: '2026-06-15', notes: 'rien' }),
    ]
    const result = filterMigraines(data, { keyword: 'café', month: '2026-06' })
    expect(result.map((m) => m.id)).toEqual(['a'])
  })

  it('treats empty-string keyword/month as no filter', () => {
    const data = [makeMigraine({ id: 'a' }), makeMigraine({ id: 'b' })]
    expect(filterMigraines(data, { keyword: '', month: '' })).toHaveLength(2)
  })
})
