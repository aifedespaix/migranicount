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
