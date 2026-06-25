import { describe, it, expect } from 'vitest'
import { todayISO, nowHHmm, formatRelative, formatDuration, toISODate, parseLooseISODate, parseLooseTime, addMinutesToHHmm } from './date'

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

describe('toISODate', () => {
  it('formats a Date as YYYY-MM-DD', () => {
    expect(toISODate(new Date(2026, 5, 3))).toBe('2026-06-03')
  })
})

describe('parseLooseISODate', () => {
  it('accepts a valid ISO date', () => {
    expect(parseLooseISODate('2026-06-24')).toBe('2026-06-24')
  })

  it('accepts a French DD/MM/YYYY date and converts to ISO', () => {
    expect(parseLooseISODate('24/06/2026')).toBe('2026-06-24')
  })

  it('rejects an invalid calendar date', () => {
    expect(parseLooseISODate('2026-02-30')).toBeNull()
  })

  it('rejects unparseable text', () => {
    expect(parseLooseISODate('not a date')).toBeNull()
  })
})

describe('parseLooseTime', () => {
  it('accepts HH:mm', () => {
    expect(parseLooseTime('08:05')).toBe('08:05')
  })

  it('accepts compact HHmm', () => {
    expect(parseLooseTime('0805')).toBe('08:05')
  })

  it('accepts a single-digit hour with a colon', () => {
    expect(parseLooseTime('8:05')).toBe('08:05')
  })

  it('rejects an out-of-range hour', () => {
    expect(parseLooseTime('25:00')).toBeNull()
  })

  it('rejects unparseable text', () => {
    expect(parseLooseTime('nope')).toBeNull()
  })
})

describe('addMinutesToHHmm', () => {
  it('adds minutes within the same hour', () => {
    expect(addMinutesToHHmm('08:00', 15)).toBe('08:15')
  })

  it('rolls over to the next hour', () => {
    expect(addMinutesToHHmm('08:50', 15)).toBe('09:05')
  })

  it('rolls over past midnight', () => {
    expect(addMinutesToHHmm('23:50', 15)).toBe('00:05')
  })

  it('handles negative minutes (subtracting)', () => {
    expect(addMinutesToHHmm('00:05', -15)).toBe('23:50')
  })
})
