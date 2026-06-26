export function todayISO(): string {
  const d = new Date()
  return toISODate(d)
}

export function nowHHmm(): string {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatRelative(dateISO: string, from: Date = new Date()): string {
  const target = new Date(dateISO + 'T00:00:00')
  const reference = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const diffDays = Math.round((reference.getTime() - target.getTime()) / 86400000)
  if (diffDays === 0) return "aujourd'hui"
  if (diffDays === 1) return 'hier'
  if (diffDays > 1) return `il y a ${diffDays} jours`
  return `dans ${-diffDays} jours`
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${pad(m)}`
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseLooseISODate(text: string): string | null {
  const trimmed = text.trim()
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  const frMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed)
  let year: number, month: number, day: number
  if (isoMatch) {
    year = Number(isoMatch[1])
    month = Number(isoMatch[2])
    day = Number(isoMatch[3])
  } else if (frMatch) {
    day = Number(frMatch[1])
    month = Number(frMatch[2])
    year = Number(frMatch[3])
  } else {
    return null
  }
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null
  return toISODate(d)
}

export function parseLooseTime(text: string): string | null {
  const trimmed = text.trim()
  const colonMatch = /^(\d{1,2}):(\d{2})$/.exec(trimmed)
  const compactMatch = /^(\d{2})(\d{2})$/.exec(trimmed)
  let hour: number, minute: number
  if (colonMatch) {
    hour = Number(colonMatch[1])
    minute = Number(colonMatch[2])
  } else if (compactMatch) {
    hour = Number(compactMatch[1])
    minute = Number(compactMatch[2])
  } else {
    return null
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return `${pad(hour)}:${pad(minute)}`
}

export function addMinutesToHHmm(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const total = ((h * 60 + m + minutes) % 1440 + 1440) % 1440
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

/**
 * Formats an ISO date string (YYYY-MM-DD) to "Mer. 12 juin" in French.
 * Returns '' if isoDate is falsy.
 */
export function formatMigraineTitleDate(isoDate: string): string {
  if (!isoDate) return ''

  const daysAbbr = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  const monthsLower = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc']

  const d = new Date(isoDate + 'T00:00:00')
  const dayAbbrWithDot = daysAbbr[d.getDay()] + '.'
  const dayOfMonth = d.getDate()
  const month = monthsLower[d.getMonth()]

  return `${dayAbbrWithDot} ${dayOfMonth} ${month}`
}
