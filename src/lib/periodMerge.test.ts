import { describe, it, expect } from 'vitest'
import { mergeTreatmentPeriods, periodsOverlap } from './periodMerge'
import type { TreatmentPeriod } from '../types/migraine'

function period(overrides: Partial<TreatmentPeriod>): TreatmentPeriod {
  return { id: 'p1', startDate: '2026-01-01', endDate: null, updatedAt: '2026-01-01T00:00:00Z', ...overrides }
}

describe('mergeTreatmentPeriods', () => {
  it('keeps a period present only locally', () => {
    const result = mergeTreatmentPeriods([period({ id: 'p1' })], [])
    expect(result.map((p) => p.id)).toEqual(['p1'])
  })

  it('keeps a period present only remotely', () => {
    const result = mergeTreatmentPeriods([], [period({ id: 'p1' })])
    expect(result.map((p) => p.id)).toEqual(['p1'])
  })

  it('unions periods present on both sides under different ids (concurrent additions)', () => {
    const local = [period({ id: 'p1' })]
    const remote = [period({ id: 'p2' })]
    const result = mergeTreatmentPeriods(local, remote)
    expect(result.map((p) => p.id).sort()).toEqual(['p1', 'p2'])
  })

  it('when the same id exists on both sides, the most recently updated one wins', () => {
    const local = [period({ id: 'p1', startDate: '2026-01-01', updatedAt: '2026-01-05T00:00:00Z' })]
    const remote = [period({ id: 'p1', startDate: '2026-02-01', updatedAt: '2026-01-01T00:00:00Z' })]
    const result = mergeTreatmentPeriods(local, remote)
    expect(result).toHaveLength(1)
    expect(result[0].startDate).toBe('2026-01-01') // local wins (newer updatedAt)
  })

  it('remote wins when it is the more recently updated side', () => {
    const local = [period({ id: 'p1', startDate: '2026-01-01', updatedAt: '2026-01-01T00:00:00Z' })]
    const remote = [period({ id: 'p1', startDate: '2026-02-01', updatedAt: '2026-01-05T00:00:00Z' })]
    const result = mergeTreatmentPeriods(local, remote)
    expect(result[0].startDate).toBe('2026-02-01')
  })

  it('does not lose an edit made on one device and an unrelated addition made on another', () => {
    const local = [
      period({ id: 'p1', startDate: '2026-01-10', updatedAt: '2026-01-10T00:00:00Z' }), // edited locally
    ]
    const remote = [
      period({ id: 'p1', startDate: '2026-01-01', updatedAt: '2026-01-01T00:00:00Z' }), // stale
      period({ id: 'p2', startDate: '2026-03-01', updatedAt: '2026-03-01T00:00:00Z' }), // added on another device
    ]
    const result = mergeTreatmentPeriods(local, remote)
    expect(result).toHaveLength(2)
    expect(result.find((p) => p.id === 'p1')?.startDate).toBe('2026-01-10')
    expect(result.find((p) => p.id === 'p2')?.startDate).toBe('2026-03-01')
  })
})

describe('periodsOverlap', () => {
  it('detects two overlapping finite ranges', () => {
    expect(periodsOverlap(
      { startDate: '2026-01-01', endDate: '2026-01-31' },
      { startDate: '2026-01-15', endDate: '2026-02-15' },
    )).toBe(true)
  })

  it('returns false for two disjoint ranges', () => {
    expect(periodsOverlap(
      { startDate: '2026-01-01', endDate: '2026-01-31' },
      { startDate: '2026-02-01', endDate: '2026-02-28' },
    )).toBe(false)
  })

  it('treats an ongoing period (endDate null) as extending indefinitely', () => {
    expect(periodsOverlap(
      { startDate: '2026-01-01', endDate: null },
      { startDate: '2027-01-01', endDate: '2027-06-01' },
    )).toBe(true)
  })

  it('touching boundaries (same day) count as overlapping', () => {
    expect(periodsOverlap(
      { startDate: '2026-01-01', endDate: '2026-01-15' },
      { startDate: '2026-01-15', endDate: '2026-01-31' },
    )).toBe(true)
  })
})
