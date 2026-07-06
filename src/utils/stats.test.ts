import { describe, it, expect } from 'vitest'
import {
  monthlyFrequency, averageIntensityByMonth, medocEfficacy, averageDurationMinutes,
  frequencyTrendStats, intensityDistribution, averageIntensity, efficacyRanking,
  dailyFrequency, weeklyFrequency, averageIntensityByDay, averageIntensityByWeek, defaultPeriod,
  treatmentEfficacyAnalysis, durationStats, durationDistribution,
  symptomFrequency, zoneDistribution, startHourDistribution, weekdayDistribution,
  medicationDaysPerMonth, abortionRateByDelay, reliefStats,
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
  it('returns null avg for days with no migraines', () => {
    const from = new Date(2026, 5, 25)
    const result = averageIntensityByDay([], from, 3)
    expect(result.every(r => r.avg === null)).toBe(true)
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

describe('durées à cheval sur minuit', () => {
  it('averageDurationMinutes ajoute 24h quand la fin précède le début', () => {
    // 22:00 -> 06:00 = 8h = 480 min
    const data = [makeMigraine({ heureDebut: '22:00', heureFin: '06:00' })]
    expect(averageDurationMinutes(data)).toBe(480)
  })

  it('durationStats gère une crise nocturne', () => {
    const data = [
      makeMigraine({ heureDebut: '23:00', heureFin: '01:30' }), // 150 min
      makeMigraine({ heureDebut: '08:00', heureFin: '09:00' }), // 60 min
    ]
    const result = durationStats(data)
    expect(result.avgMin).toBe(105)
    expect(result.maxMin).toBe(150)
  })

  it('durationDistribution classe une crise nocturne dans le bon bucket', () => {
    const data = [makeMigraine({ heureDebut: '22:00', heureFin: '03:00' })] // 5h -> 4-8h
    const result = durationDistribution(data)
    expect(result.find((b) => b.label === '4-8h')?.count).toBe(1)
  })
})

describe('fréquence avec intensité', () => {
  it('dailyFrequency renvoie l\'intensité max du jour', () => {
    const from = new Date(2026, 5, 25)
    const data = [
      makeMigraine({ date: '2026-06-24', intensite: 4 }),
      makeMigraine({ date: '2026-06-24', intensite: 7 }),
    ]
    const result = dailyFrequency(data, from, 7)
    expect(result.find((r) => r.day === '2026-06-24')?.maxIntensity).toBe(7)
    expect(result.find((r) => r.day === '2026-06-23')?.maxIntensity).toBe(0)
  })

  it('weeklyFrequency renvoie l\'intensité moyenne de la semaine', () => {
    const from = new Date(2026, 5, 25)
    const data = [
      makeMigraine({ date: '2026-06-22', intensite: 4 }),
      makeMigraine({ date: '2026-06-24', intensite: 7 }),
    ]
    const result = weeklyFrequency(data, from, 2)
    expect(result.find((r) => r.week === '2026-06-22')?.avgIntensity).toBe(5.5)
  })

  it('monthlyFrequency renvoie l\'intensité moyenne du mois', () => {
    const data = [
      makeMigraine({ date: '2026-06-01', intensite: 3 }),
      makeMigraine({ date: '2026-06-15', intensite: 8 }),
    ]
    const result = monthlyFrequency(data, new Date(2026, 5, 24))
    expect(result.find((r) => r.month === '2026-06')?.avgIntensity).toBe(5.5)
    expect(result.find((r) => r.month === '2026-05')?.avgIntensity).toBe(0)
  })
})

describe('efficacyRanking (lissage)', () => {
  it('un médoc 8/10 passe devant un médoc 1/1', () => {
    const dix = Array.from({ length: 10 }, (_, i) =>
      makeMigraine({
        medocs: [{ id: `a${i}`, nom: 'Triptan', heure: '08:00', medocId: null }],
        avortee: i < 8,
      }),
    )
    const un = makeMigraine({
      medocs: [{ id: 'b', nom: 'Nouveau', heure: '08:00', medocId: null }],
      avortee: true,
    })
    const result = efficacyRanking([...dix, un])
    expect(result[0].nom).toBe('Triptan')
  })
})

describe('symptomFrequency', () => {
  it('compte les symptômes groupés par id, triés par fréquence', () => {
    const data = [
      makeMigraine({ symptomes: [{ id: 's1', nom: 'Nausée' }, { id: 's2', nom: 'Aura' }] }),
      makeMigraine({ symptomes: [{ id: 's1', nom: 'Nausée' }] }),
    ]
    const result = symptomFrequency(data)
    expect(result[0]).toEqual({ tag: 'Nausée', count: 2 })
    expect(result[1]).toEqual({ tag: 'Aura', count: 1 })
  })
})

describe('zoneDistribution', () => {
  it('compte les crises par zone, en ignorant les zones nulles', () => {
    const data = [
      makeMigraine({ zone: 'gauche' }),
      makeMigraine({ zone: 'gauche' }),
      makeMigraine({ zone: 'nuque' }),
      makeMigraine({ zone: null }),
    ]
    const result = zoneDistribution(data)
    expect(result.find((z) => z.zone === 'gauche')?.count).toBe(2)
    expect(result.find((z) => z.zone === 'nuque')?.count).toBe(1)
    expect(result.find((z) => z.zone === 'droite')?.count).toBe(0)
  })
})

describe('startHourDistribution', () => {
  it('classe les heures de début en 4 tranches', () => {
    const data = [
      makeMigraine({ heureDebut: '03:00' }), // nuit
      makeMigraine({ heureDebut: '07:30' }), // matin
      makeMigraine({ heureDebut: '11:59' }), // matin
      makeMigraine({ heureDebut: '14:00' }), // après-midi
      makeMigraine({ heureDebut: '23:00' }), // soir
    ]
    const result = startHourDistribution(data)
    expect(result.map((b) => b.count)).toEqual([1, 2, 1, 1])
  })
})

describe('weekdayDistribution', () => {
  it('compte les crises par jour de la semaine, lundi en premier', () => {
    const data = [
      makeMigraine({ date: '2026-06-22' }), // lundi
      makeMigraine({ date: '2026-06-22' }),
      makeMigraine({ date: '2026-06-28' }), // dimanche
    ]
    const result = weekdayDistribution(data)
    expect(result[0]).toEqual({ label: 'Lun', count: 2 })
    expect(result[6]).toEqual({ label: 'Dim', count: 1 })
  })
})

describe('medicationDaysPerMonth', () => {
  it('compte les jours distincts avec au moins une prise', () => {
    const medoc = { id: 'p', nom: 'Triptan', heure: '08:00', medocId: null }
    const data = [
      makeMigraine({ date: '2026-06-01', medocs: [medoc] }),
      makeMigraine({ date: '2026-06-01', medocs: [medoc, { ...medoc, id: 'p2' }] }), // même jour
      makeMigraine({ date: '2026-06-15', medocs: [medoc] }),
      makeMigraine({ date: '2026-06-20', medocs: [] }), // sans médoc
    ]
    const result = medicationDaysPerMonth(data, new Date(2026, 5, 24))
    expect(result).toHaveLength(12)
    expect(result.find((r) => r.month === '2026-06')?.days).toBe(2)
  })
})

describe('abortionRateByDelay', () => {
  it('calcule le taux d\'avortement par tranche de délai de première prise', () => {
    const data = [
      makeMigraine({ heureDebut: '08:00', medocs: [{ id: '1', nom: 'T', heure: '08:15', medocId: null }], avortee: true }),
      makeMigraine({ heureDebut: '08:00', medocs: [{ id: '2', nom: 'T', heure: '08:20', medocId: null }], avortee: false }),
      makeMigraine({ heureDebut: '08:00', medocs: [{ id: '3', nom: 'T', heure: '10:30', medocId: null }], avortee: false }),
      makeMigraine({ heureDebut: '08:00', medocs: [] }), // ignorée
    ]
    const result = abortionRateByDelay(data)
    const first = result.find((b) => b.label === '<30 min')
    expect(first?.total).toBe(2)
    expect(first?.pct).toBe(50)
    const late = result.find((b) => b.label === '>2h')
    expect(late?.total).toBe(1)
    expect(late?.pct).toBe(0)
  })

  it('prend la première prise et gère le passage de minuit', () => {
    const data = [
      makeMigraine({
        heureDebut: '23:30',
        medocs: [
          { id: '1', nom: 'T', heure: '00:10', medocId: null }, // +40 min (après minuit)
          { id: '2', nom: 'D', heure: '02:00', medocId: null },
        ],
        avortee: true,
      }),
    ]
    const result = abortionRateByDelay(data)
    expect(result.find((b) => b.label === '30-60 min')?.total).toBe(1)
  })
})

describe('reliefStats', () => {
  it('compte les soulagements renseignés par médicament', () => {
    const data = [
      makeMigraine({ medocs: [{ id: '1', nom: 'Triptan', heure: '08:00', medocId: 'm1', soulagement: 'oui' }] }),
      makeMigraine({ medocs: [{ id: '2', nom: 'Triptan', heure: '08:00', medocId: 'm1', soulagement: 'partiel' }] }),
      makeMigraine({ medocs: [{ id: '3', nom: 'Triptan', heure: '08:00', medocId: 'm1' }] }), // non renseigné
    ]
    const result = reliefStats(data)
    const triptan = result.find((r) => r.nom === 'Triptan')
    expect(triptan).toEqual({ nom: 'Triptan', oui: 1, partiel: 1, non: 0, total: 2 })
  })

  it('ignore les médicaments sans aucune donnée de soulagement', () => {
    const data = [
      makeMigraine({ medocs: [{ id: '1', nom: 'Doliprane', heure: '08:00', medocId: null }] }),
    ]
    expect(reliefStats(data)).toEqual([])
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
