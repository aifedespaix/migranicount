import { describe, it, expect } from 'vitest'
import {
  monthlyFrequency, averageIntensityByMonth, medocEfficacy, averageDurationMinutes,
  frequencyTrendStats, intensityDistribution, averageIntensity, efficacyRanking,
  dailyFrequency, weeklyFrequency, averageIntensityByDay, averageIntensityByWeek, defaultPeriod,
  treatmentEfficacyAnalysis,
} from './stats'
import type { Migraine, MedocFavori } from '../types/migraine'

function makeMigraine(overrides: Partial<Migraine>): Migraine {
  return {
    id: 'x', date: '2026-06-01', heureDebut: '08:00', heureFin: '10:00',
    medocs: [], intensite: 5, avortee: false, symptomes: [],
    zone: null, declencheurs: [], createdAt: '', updatedAt: '',
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
      makeMigraine({ medocs: [{ id: '1', nom: 'Triptan', heure: '08:00', medocId: null }], avortee: true }),
      makeMigraine({ medocs: [{ id: '2', nom: 'Triptan', heure: '08:00', medocId: null }], avortee: false }),
      makeMigraine({ medocs: [{ id: '3', nom: 'Doliprane', heure: '08:00', medocId: null }], avortee: true }),
    ]
    const result = medocEfficacy(data)
    const triptan = result.find((r) => r.nom === 'Triptan')
    expect(triptan?.total).toBe(2)
    expect(triptan?.pctAvortee).toBe(50)
  })

  it('counts "probable" as avortee in pctAvortee', () => {
    const data = [
      makeMigraine({ medocs: [{ id: '1', nom: 'Triptan', heure: '08:00', medocId: null }], avortee: 'probable' }),
      makeMigraine({ medocs: [{ id: '2', nom: 'Triptan', heure: '08:00', medocId: null }], avortee: false }),
    ]
    const result = medocEfficacy(data)
    expect(result.find((r) => r.nom === 'Triptan')?.pctAvortee).toBe(50)
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

describe('frequencyTrendStats', () => {
  it('computes total, busiest month, and trend vs prior 3 months', () => {
    const data = [
      makeMigraine({ date: '2026-04-01' }),
      makeMigraine({ date: '2026-05-01' }),
      makeMigraine({ date: '2026-06-01' }),
      makeMigraine({ date: '2026-06-10' }),
      makeMigraine({ date: '2026-06-20' }),
    ]
    const result = frequencyTrendStats(data, new Date(2026, 5, 24))
    expect(result.total).toBe(5)
    expect(result.busiestMonth).toEqual({ month: '2026-06', count: 3 })
    // last 3 months (Apr+May+Jun = 1+1+3=5) vs prior 3 months (Jan+Feb+Mar = 0) -> no prior data, trendPct null
    expect(result.trendPct).toBeNull()
  })

  it('calculates percentage trend when prior period has data', () => {
    const data = [
      makeMigraine({ date: '2026-01-05' }),
      makeMigraine({ date: '2026-02-10' }),
      makeMigraine({ date: '2026-04-01' }),
      makeMigraine({ date: '2026-05-15' }),
      makeMigraine({ date: '2026-06-01' }),
      makeMigraine({ date: '2026-06-10' }),
      makeMigraine({ date: '2026-06-20' }),
    ]
    const result = frequencyTrendStats(data, new Date(2026, 5, 24))
    // prior 3 months (Jan+Feb+Mar) = 2, last 3 (Apr+May+Jun) = 5
    // trendPct = Math.round(((5 - 2) / 2) * 100) = Math.round(150) = 150
    expect(result.trendPct).toBe(150)
  })

  it('returns null busiestMonth when there are no migraines', () => {
    const result = frequencyTrendStats([], new Date(2026, 5, 24))
    expect(result.total).toBe(0)
    expect(result.busiestMonth).toBeNull()
    expect(result.trendPct).toBeNull()
  })
})

describe('intensityDistribution', () => {
  it('counts migraines per intensity level, sorted ascending', () => {
    const data = [
      makeMigraine({ intensite: 8 }),
      makeMigraine({ intensite: 3 }),
      makeMigraine({ intensite: 8 }),
    ]
    expect(intensityDistribution(data)).toEqual([
      { level: 3, count: 1 },
      { level: 8, count: 2 },
    ])
  })
})

describe('averageIntensity', () => {
  it('averages intensite across all migraines', () => {
    const data = [makeMigraine({ intensite: 4 }), makeMigraine({ intensite: 8 })]
    expect(averageIntensity(data)).toBe(6)
  })

  it('returns 0 when there are no migraines', () => {
    expect(averageIntensity([])).toBe(0)
  })
})

describe('efficacyRanking', () => {
  it('ranks medocs by % aborted, descending', () => {
    const data = [
      makeMigraine({ medocs: [{ id: '1', nom: 'Triptan', heure: '08:00', medocId: null }], avortee: true }),
      makeMigraine({ medocs: [{ id: '2', nom: 'Triptan', heure: '08:00', medocId: null }], avortee: true }),
      makeMigraine({ medocs: [{ id: '3', nom: 'Doliprane', heure: '08:00', medocId: null }], avortee: false }),
    ]
    const result = efficacyRanking(data)
    expect(result[0].nom).toBe('Triptan')
    expect(result[0].pctAvortee).toBe(100)
    expect(result[1].nom).toBe('Doliprane')
    expect(result[1].pctAvortee).toBe(0)
  })
})

describe('dailyFrequency', () => {
  it('returns `days` entries for the last N days', () => {
    const from = new Date(2026, 5, 25) // 25 juin
    const result = dailyFrequency([], from, 7)
    expect(result).toHaveLength(7)
    expect(result[6].day).toBe('2026-06-25')
    expect(result[0].day).toBe('2026-06-19')
  })

  it('counts migraines on the correct day', () => {
    const from = new Date(2026, 5, 25)
    const data = [makeMigraine({ date: '2026-06-24' }), makeMigraine({ date: '2026-06-24' })]
    const result = dailyFrequency(data, from, 7)
    expect(result.find(r => r.day === '2026-06-24')?.count).toBe(2)
  })
})

describe('weeklyFrequency', () => {
  it('returns `weeks` entries starting on Mondays', () => {
    const from = new Date(2026, 5, 25) // jeudi
    const result = weeklyFrequency([], from, 4)
    expect(result).toHaveLength(4)
    // La semaine du 25 juin commence le lundi 22 juin
    expect(result[3].week).toBe('2026-06-22')
  })

  it('counts a migraine in the correct week', () => {
    const from = new Date(2026, 5, 25)
    const data = [makeMigraine({ date: '2026-06-23' })] // mardi de la semaine du 22
    const result = weeklyFrequency(data, from, 4)
    expect(result.find(r => r.week === '2026-06-22')?.count).toBe(1)
  })
})

describe('averageIntensityByDay', () => {
  it('returns 0 avg for days with no migraines', () => {
    const from = new Date(2026, 5, 25)
    const result = averageIntensityByDay([], from, 3)
    expect(result.every(r => r.avg === 0)).toBe(true)
  })

  it('averages intensity on a given day', () => {
    const from = new Date(2026, 5, 25)
    const data = [
      makeMigraine({ date: '2026-06-24', intensite: 4 }),
      makeMigraine({ date: '2026-06-24', intensite: 8 }),
    ]
    const result = averageIntensityByDay(data, from, 3)
    expect(result.find(r => r.day === '2026-06-24')?.avg).toBe(6)
  })
})

describe('averageIntensityByWeek', () => {
  it('averages intensity across a week', () => {
    const from = new Date(2026, 5, 25)
    const data = [
      makeMigraine({ date: '2026-06-22', intensite: 6 }),
      makeMigraine({ date: '2026-06-24', intensite: 4 }),
    ]
    const result = averageIntensityByWeek(data, from, 2)
    expect(result.find(r => r.week === '2026-06-22')?.avg).toBe(5)
  })
})

describe('treatmentEfficacyAnalysis', () => {
  it('does not double-count days for overlapping treatment periods', () => {
    const medoc: MedocFavori = {
      id: 'med-1', nom: 'Propranolol', usageCount: 0, isLongTermTreatment: true,
      treatmentPeriods: [
        { id: 'p1', startDate: '2026-01-01', endDate: '2026-01-31', updatedAt: '' },
        { id: 'p2', startDate: '2026-01-15', endDate: '2026-02-15', updatedAt: '' },
      ],
    }
    const migraines = [
      makeMigraine({ id: 'm0', date: '2025-12-01' }), // établit firstDate avant les périodes
      makeMigraine({ id: 'm1', date: '2026-01-20' }), // dans le chevauchement
    ]
    const result = treatmentEfficacyAnalysis(migraines, [medoc])
    expect(result).toHaveLength(1)
    // intervalle fusionné 01-01 → 02-15 = 45 jours ≈ 1,48 mois -> ≈0,7 crise/mois
    // (un calcul buggé qui somme 30+31=61 jours ≈ 2,00 mois donnerait 0,5)
    expect(result[0].inPeriod.avgFreqPerMonth).toBe(0.7)
  })
})

describe('defaultPeriod', () => {
  it('returns month when no migraines', () => {
    expect(defaultPeriod([])).toBe('month')
  })

  it('returns day when oldest migraine is < 3 months ago', () => {
    const recent = makeMigraine({ date: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10) })
    expect(defaultPeriod([recent])).toBe('day')
  })

  it('returns week when oldest migraine is 3-6 months ago', () => {
    const d = new Date()
    d.setMonth(d.getMonth() - 4)
    const old = makeMigraine({ date: d.toISOString().slice(0, 10) })
    expect(defaultPeriod([old])).toBe('week')
  })

  it('returns month when oldest migraine is > 6 months ago', () => {
    const d = new Date()
    d.setMonth(d.getMonth() - 8)
    const old = makeMigraine({ date: d.toISOString().slice(0, 10) })
    expect(defaultPeriod([old])).toBe('month')
  })
})
