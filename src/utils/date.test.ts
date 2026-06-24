import { describe, it, expect } from 'vitest'
import { todayISO, nowHHmm, formatRelative, formatDuration } from './date'

describe('todayISO', () => {
  it('returns YYYY-MM-DD format', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('nowHHmm', () => {
  it('returns HH:mm format', () => {
    expect(nowHHmm()).toMatch(/^\d{2}:\d{2}$/)
  })
})

describe('formatRelative', () => {
  it('formats today as "aujourd\'hui"', () => {
    const today = new Date(2026, 5, 24)
    expect(formatRelative('2026-06-24', today)).toBe("aujourd'hui")
  })

  it('formats yesterday as "hier"', () => {
    const today = new Date(2026, 5, 24)
    expect(formatRelative('2026-06-23', today)).toBe('hier')
  })

  it('formats N days ago as "il y a N jours"', () => {
    const today = new Date(2026, 5, 24)
    expect(formatRelative('2026-06-20', today)).toBe('il y a 4 jours')
  })
})

describe('formatDuration', () => {
  it('formats minutes under an hour', () => {
    expect(formatDuration(45)).toBe('45min')
  })

  it('formats whole hours', () => {
    expect(formatDuration(120)).toBe('2h')
  })

  it('formats hours and minutes', () => {
    expect(formatDuration(135)).toBe('2h15')
  })
})
