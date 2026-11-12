import { describe, it, expect } from 'vitest'
import { ongoingMigraines, elapsedMinutes, startedOverADayAgo, quickEndOptions, durationMinutes } from './ongoing'

const now = new Date('2026-11-12T10:00:00')

describe('ongoingMigraines', () => {
  it('ne garde que les crises sans heure de fin, la plus récente en premier', () => {
    const list = [
      { id: 'a', date: '2026-11-10', heureDebut: '08:00', heureFin: null },
      { id: 'b', date: '2026-11-11', heureDebut: '08:00', heureFin: '12:00' },
      { id: 'c', date: '2026-11-12', heureDebut: '07:00', heureFin: null },
    ]
    expect(ongoingMigraines(list).map((m) => m.id)).toEqual(['c', 'a'])
  })
})

describe('elapsedMinutes', () => {
  it('compte les minutes depuis le début', () => {
    expect(elapsedMinutes({ date: '2026-11-12', heureDebut: '07:30' }, now)).toBe(150)
  })
  it('traverse minuit', () => {
    expect(elapsedMinutes({ date: '2026-11-11', heureDebut: '23:00' }, now)).toBe(660)
  })
  it('ne renvoie jamais de valeur négative', () => {
    expect(elapsedMinutes({ date: '2026-11-12', heureDebut: '11:00' }, now)).toBe(0)
  })
})

describe('startedOverADayAgo', () => {
  it('est faux sous 24 h et vrai au-delà', () => {
    expect(startedOverADayAgo({ date: '2026-11-11', heureDebut: '10:01' }, now)).toBe(false)
    expect(startedOverADayAgo({ date: '2026-11-11', heureDebut: '10:00' }, now)).toBe(true)
  })
})

describe('quickEndOptions', () => {
  it('propose uniquement les raccourcis postérieurs au début', () => {
    const opts = quickEndOptions({ date: '2026-11-12', heureDebut: '09:15' }, now)
    expect(opts).toEqual([
      { label: "À l'instant", heure: '10:00' },
      { label: 'Il y a 30 min', heure: '09:30' },
    ])
  })
  it('gère le passage de minuit', () => {
    const opts = quickEndOptions({ date: '2026-11-11', heureDebut: '22:00' }, new Date('2026-11-12T00:20:00'))
    expect(opts.map((o) => o.heure)).toEqual(['00:20', '23:50', '23:20', '22:20'])
  })
  it('ne propose rien pour une crise commencée il y a plus de 24 h', () => {
    expect(quickEndOptions({ date: '2026-11-09', heureDebut: '08:00' }, now)).toEqual([])
  })
})

describe('durationMinutes', () => {
  it('calcule la durée, y compris après minuit', () => {
    expect(durationMinutes('14:00', '18:30')).toBe(270)
    expect(durationMinutes('23:00', '01:00')).toBe(120)
  })
})
