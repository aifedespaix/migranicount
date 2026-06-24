import { toISODate } from './date'

export interface CalendarDay {
  iso: string
  day: number
  inCurrentMonth: boolean
}

export function buildCalendarGrid(year: number, month: number): CalendarDay[][] {
  const firstOfMonth = new Date(year, month, 1)
  const startWeekday = (firstOfMonth.getDay() + 6) % 7 // 0 = Monday
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells: CalendarDay[] = []

  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    cells.push({ iso: toISODate(new Date(year, month - 1, day)), day, inCurrentMonth: false })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ iso: toISODate(new Date(year, month, day)), day, inCurrentMonth: true })
  }
  let nextDay = 1
  while (cells.length % 7 !== 0) {
    cells.push({ iso: toISODate(new Date(year, month + 1, nextDay)), day: nextDay, inCurrentMonth: false })
    nextDay++
  }

  const weeks: CalendarDay[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
}
