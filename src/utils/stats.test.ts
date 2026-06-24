import { describe, it, expect } from 'vitest'
import { monthlyFrequency, averageIntensityByMonth, medocEfficacy, averageDurationMinutes } from './stats'
import type { Migraine } from '../types/migraine'

function makeMigraine(overrides: Partial<Migraine>): Migraine {
  return {
    id: 'x', date: '2026-06-01', heureDebut: '08:00', heureFin: '10:00',
    medocs: [], intensite: 5, avortee: false, nausee: false, vomissement: false,
    aura: false, localisation: null, declencheurs: [], createdAt: '', updatedAt: '',
    ...overrides,
  }
}

describe('monthlyFrequency', () => {
  it('counts migraines per month, last 12 months', () => {
    const data = [
      makeMigraine({ date: '2026-06-01' }),
      makeMigraine({ date: '2026-06-15' }),
      makeMigraine({ date: '2026-05-01' }),
    ]
    const result = monthlyFrequency(data, new Date(2026, 5, 24))
    const june = result.find((r) => r.month === '2026-06')
    const may = result.find((r) => r.month === '2026-05')
    expect(june?.count).toBe(2)
    expect(may?.count).toBe(1)
    expect(result).toHaveLength(12)
  })
})

describe('averageIntensityByMonth', () => {
  it('averages intensite per month', () => {
    const data = [
      makeMigraine({ date: '2026-06-01', intensite: 4 }),
      makeMigraine({ date: '2026-06-15', intensite: 8 }),
    ]
    const result = averageIntensityByMonth(data, new Date(2026, 5, 24))
    expect(result.find((r) => r.month === '2026-06')?.avg).toBe(6)
  })
})

describe('medocEfficacy', () => {
  it('computes % aborted per medoc', () => {
    const data = [
      makeMigraine({ medocs: [{ id: '1', nom: 'Triptan', heure: '08:00' }], avortee: true }),
      makeMigraine({ medocs: [{ id: '2', nom: 'Triptan', heure: '08:00' }], avortee: false }),
      makeMigraine({ medocs: [{ id: '3', nom: 'Doliprane', heure: '08:00' }], avortee: true }),
    ]
    const result = medocEfficacy(data)
    const triptan = result.find((r) => r.nom === 'Triptan')
    expect(triptan?.total).toBe(2)
    expect(triptan?.pctAvortee).toBe(50)
  })
})

describe('averageDurationMinutes', () => {
  it('averages duration for entries with an end time', () => {
    const data = [
      makeMigraine({ heureDebut: '08:00', heureFin: '10:00' }),
      makeMigraine({ heureDebut: '08:00', heureFin: '09:00' }),
      makeMigraine({ heureDebut: '08:00', heureFin: null }),
    ]
    expect(averageDurationMinutes(data)).toBe(90)
  })
})
