import type { Migraine } from '../types/migraine'

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
}

function last12Months(from: Date): string[] {
  const months: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(from.getFullYear(), from.getMonth() - i, 1)
    months.push(monthKey(d))
  }
  return months
}

export function monthlyFrequency(migraines: Migraine[], from: Date = new Date()): { month: string; count: number }[] {
  const months = last12Months(from)
  const counts = new Map(months.map((m) => [m, 0]))
  for (const m of migraines) {
    const key = m.date.slice(0, 7)
    if (counts.has(key)) counts.set(key, counts.get(key)! + 1)
  }
  return months.map((month) => ({ month, count: counts.get(month) ?? 0 }))
}

export function averageIntensityByMonth(migraines: Migraine[], from: Date = new Date()): { month: string; avg: number }[] {
  const months = last12Months(from)
  const sums = new Map(months.map((m) => [m, { total: 0, count: 0 }]))
  for (const m of migraines) {
    const key = m.date.slice(0, 7)
    const bucket = sums.get(key)
    if (bucket) {
      bucket.total += m.intensite
      bucket.count += 1
    }
  }
  return months.map((month) => {
    const bucket = sums.get(month)!
    return { month, avg: bucket.count === 0 ? 0 : Math.round((bucket.total / bucket.count) * 10) / 10 }
  })
}

export function medocEfficacy(migraines: Migraine[]): { nom: string; pctAvortee: number; total: number }[] {
  const byMedoc = new Map<string, { total: number; avortee: number }>()
  for (const m of migraines) {
    const noms = new Set(m.medocs.map((p) => p.nom))
    for (const nom of noms) {
      const bucket = byMedoc.get(nom) ?? { total: 0, avortee: 0 }
      bucket.total += 1
      if (m.avortee) bucket.avortee += 1
      byMedoc.set(nom, bucket)
    }
  }
  return Array.from(byMedoc.entries()).map(([nom, { total, avortee }]) => ({
    nom,
    total,
    pctAvortee: Math.round((avortee / total) * 100),
  }))
}

export function averageDurationMinutes(migraines: Migraine[]): number {
  const durations = migraines
    .filter((m) => m.heureFin !== null)
    .map((m) => toMinutes(m.heureFin!) - toMinutes(m.heureDebut))
  if (durations.length === 0) return 0
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function frequencyTrendStats(
  migraines: Migraine[],
  from: Date = new Date()
): { total: number; busiestMonth: { month: string; count: number } | null; trendPct: number | null } {
  const months = monthlyFrequency(migraines, from)
  const total = months.reduce((sum, m) => sum + m.count, 0)
  const busiestMonth = months.reduce<{ month: string; count: number } | null>((best, m) => {
    if (m.count === 0) return best
    if (!best || m.count > best.count) return m
    return best
  }, null)
  const last3 = months.slice(-3).reduce((sum, m) => sum + m.count, 0)
  const prev3 = months.slice(-6, -3).reduce((sum, m) => sum + m.count, 0)
  const trendPct = prev3 === 0 ? null : Math.round(((last3 - prev3) / prev3) * 100)
  return { total, busiestMonth, trendPct }
}

export function intensityDistribution(migraines: Migraine[]): { level: number; count: number }[] {
  const counts = new Map<number, number>()
  for (const m of migraines) {
    counts.set(m.intensite, (counts.get(m.intensite) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([level, count]) => ({ level, count }))
}

export function averageIntensity(migraines: Migraine[]): number {
  if (migraines.length === 0) return 0
  return Math.round((migraines.reduce((sum, m) => sum + m.intensite, 0) / migraines.length) * 10) / 10
}

export function efficacyRanking(migraines: Migraine[]): { nom: string; pctAvortee: number; total: number }[] {
  return medocEfficacy(migraines)
    .filter((d) => d.total >= 1)
    .sort((a, b) => b.pctAvortee - a.pctAvortee)
}
