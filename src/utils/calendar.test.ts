import { describe, it, expect } from 'vitest'
import { buildCalendarGrid } from './calendar'

describe('buildCalendarGrid', () => {
  it('returns weeks of 7 days covering the full month (June 2026, starts on Monday)', () => {
    const weeks = buildCalendarGrid(2026, 5) // June = month index 5
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    const inMonthDays = weeks.flat().filter((d) => d.inCurrentMonth)
    expect(inMonthDays).toHaveLength(30)
    expect(inMonthDays[0].iso).toBe('2026-06-01')
    expect(inMonthDays[inMonthDays.length - 1].iso).toBe('2026-06-30')
  })

  it('has no leading padding when the month starts on Monday', () => {
    const weeks = buildCalendarGrid(2026, 5)
    expect(weeks[0][0].iso).toBe('2026-06-01')
  })

  it('pads leading days from the previous month when the month does not start on Monday', () => {
    const weeks = buildCalendarGrid(2026, 6) // July 2026 starts on a Wednesday
    const firstWeek = weeks[0]
    expect(firstWeek.filter((d) => !d.inCurrentMonth)).toHaveLength(2)
    expect(firstWeek[2].iso).toBe('2026-07-01')
  })

  it('pads trailing days from the next month to complete the last week', () => {
    const weeks = buildCalendarGrid(2026, 5) // June 2026 ends on a Tuesday
    const lastWeek = weeks[weeks.length - 1]
    const trailing = lastWeek.filter((d) => !d.inCurrentMonth)
    expect(trailing.length).toBeGreaterThan(0)
    expect(trailing[0].iso).toBe('2026-07-01')
  })
})
