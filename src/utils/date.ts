export function todayISO(): string {
  const d = new Date()
  return toISO(d)
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

function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}
