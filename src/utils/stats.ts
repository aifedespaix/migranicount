import type { Migraine, MedocFavori, TreatmentPeriod } from '../types/migraine'

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
      if (m.avortee === true || m.avortee === 'probable') bucket.avortee += 1
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

function dayToISO(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function mondayOf(d: Date): Date {
  const dow = d.getDay()
  const daysToMon = dow === 0 ? 6 : dow - 1
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysToMon)
}

export function dailyFrequency(
  migraines: Migraine[],
  from: Date = new Date(),
  days: number = 30
): { day: string; count: number }[] {
  const result: { day: string; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() - i)
    result.push({ day: dayToISO(d), count: 0 })
  }
  const map = new Map(result.map((r) => [r.day, r]))
  for (const m of migraines) {
    const bucket = map.get(m.date)
    if (bucket) bucket.count++
  }
  return result
}

export function weeklyFrequency(
  migraines: Migraine[],
  from: Date = new Date(),
  weeks: number = 12
): { week: string; count: number }[] {
  const thisMonday = mondayOf(from)
  const result: { week: string; count: number }[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - i * 7)
    result.push({ week: dayToISO(d), count: 0 })
  }
  const map = new Map(result.map((r) => [r.week, r]))
  for (const m of migraines) {
    const d = new Date(m.date + 'T00:00:00')
    const key = dayToISO(mondayOf(d))
    const bucket = map.get(key)
    if (bucket) bucket.count++
  }
  return result
}

export function averageIntensityByDay(
  migraines: Migraine[],
  from: Date = new Date(),
  days: number = 30
): { day: string; avg: number }[] {
  const result: { day: string; total: number; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() - i)
    result.push({ day: dayToISO(d), total: 0, count: 0 })
  }
  const map = new Map(result.map((r) => [r.day, r]))
  for (const m of migraines) {
    const bucket = map.get(m.date)
    if (bucket) { bucket.total += m.intensite; bucket.count++ }
  }
  return result.map(({ day, total, count }) => ({ day, avg: count === 0 ? 0 : Math.round((total / count) * 10) / 10 }))
}

export function averageIntensityByWeek(
  migraines: Migraine[],
  from: Date = new Date(),
  weeks: number = 12
): { week: string; avg: number }[] {
  const thisMonday = mondayOf(from)
  const result: { week: string; total: number; count: number }[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - i * 7)
    result.push({ week: dayToISO(d), total: 0, count: 0 })
  }
  const map = new Map(result.map((r) => [r.week, r]))
  for (const m of migraines) {
    const d = new Date(m.date + 'T00:00:00')
    const key = dayToISO(mondayOf(d))
    const bucket = map.get(key)
    if (bucket) { bucket.total += m.intensite; bucket.count++ }
  }
  return result.map(({ week, total, count }) => ({ week, avg: count === 0 ? 0 : Math.round((total / count) * 10) / 10 }))
}

export function durationDistribution(migraines: Migraine[]): { label: string; count: number }[] {
  const buckets = [
    { label: '<2h', min: 0, max: 120 },
    { label: '2-4h', min: 120, max: 240 },
    { label: '4-8h', min: 240, max: 480 },
    { label: '>8h', min: 480, max: Infinity },
  ]
  const counts = buckets.map((b) => ({ label: b.label, count: 0 }))
  for (const m of migraines) {
    if (!m.heureFin) continue
    const dur = toMinutes(m.heureFin) - toMinutes(m.heureDebut)
    const idx = buckets.findIndex((b) => dur >= b.min && dur < b.max)
    if (idx >= 0) counts[idx].count++
  }
  return counts
}

export function triggerFrequency(migraines: Migraine[]): { tag: string; count: number }[] {
  const map = new Map<string, number>()
  for (const m of migraines) {
    for (const d of m.declencheurs) {
      map.set(d, (map.get(d) ?? 0) + 1)
    }
  }
  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

export function intensityStats(migraines: Migraine[]): { avg: number; max: number; severeCount: number } {
  if (!migraines.length) return { avg: 0, max: 0, severeCount: 0 }
  const avg = averageIntensity(migraines)
  const max = Math.max(...migraines.map((m) => m.intensite))
  const severeCount = migraines.filter((m) => m.intensite >= 7).length
  return { avg, max, severeCount }
}

export function durationStats(migraines: Migraine[]): { avgMin: number; maxMin: number } {
  const durations = migraines
    .filter((m) => m.heureFin)
    .map((m) => toMinutes(m.heureFin!) - toMinutes(m.heureDebut))
  if (!durations.length) return { avgMin: 0, maxMin: 0 }
  const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
  const max = Math.max(...durations)
  return { avgMin: avg, maxMin: max }
}

export type Period = 'day' | 'week' | 'month'

export function defaultPeriod(migraines: Migraine[]): Period {
  if (migraines.length === 0) return 'month'
  const oldest = migraines.reduce((min, m) => (m.date < min ? m.date : min), migraines[0].date)
  const oldestDate = new Date(oldest + 'T00:00:00')
  const now = new Date()
  const monthsDiff =
    (now.getFullYear() - oldestDate.getFullYear()) * 12 + (now.getMonth() - oldestDate.getMonth())
  if (monthsDiff < 3) return 'day'
  if (monthsDiff < 6) return 'week'
  return 'month'
}

// ─── Analyse des traitements de fond ────────────────────────────────────────

export function buildActivePeriodTimeline(
  medocs: MedocFavori[],
): { medoc: string; start: string; end: string }[] {
  const today = new Date().toISOString().slice(0, 10)
  const entries: { medoc: string; start: string; end: string }[] = []
  for (const m of medocs) {
    if (!m.isLongTermTreatment || !m.treatmentPeriods?.length) continue
    for (const p of m.treatmentPeriods) {
      entries.push({ medoc: m.nom, start: p.startDate, end: p.endDate ?? today })
    }
  }
  return entries.sort((a, b) => a.start.localeCompare(b.start))
}

export function buildPerTreatmentTimelines(
  medocs: MedocFavori[],
): { name: string; periods: { start: string; end: string }[] }[] {
  const today = new Date().toISOString().slice(0, 10)
  return medocs
    .filter((m) => m.isLongTermTreatment && m.treatmentPeriods?.length)
    .map((m) => ({
      name: m.nom,
      periods: m.treatmentPeriods!.map((p) => ({
        start: p.startDate,
        end: p.endDate ?? today,
      })),
    }))
}

export function isDateInTreatmentPeriod(
  date: string,
  timeline: { start: string; end: string }[],
): boolean {
  return timeline.some((t) => date >= t.start && date <= t.end)
}

export function splitMigrainesByPeriod(
  migraines: Migraine[],
  timeline: { start: string; end: string }[],
): { inPeriod: Migraine[]; outPeriod: Migraine[] } {
  const inPeriod: Migraine[] = []
  const outPeriod: Migraine[] = []
  for (const m of migraines) {
    if (isDateInTreatmentPeriod(m.date, timeline)) inPeriod.push(m)
    else outPeriod.push(m)
  }
  return { inPeriod, outPeriod }
}

export interface PeriodStats {
  avgFreqPerMonth: number
  avgDurationMin: number
  avgIntensity: number
  count: number
}

export interface TreatmentEfficacyResult {
  medoc: string
  periods: TreatmentPeriod[]
  inPeriod: PeriodStats
  outPeriod: PeriodStats
  reductionPct: { freq: number | null; duration: number | null; intensity: number | null }
}

export function treatmentEfficacyAnalysis(
  migraines: Migraine[],
  medocs: MedocFavori[],
): TreatmentEfficacyResult[] {
  if (!migraines.length) return []
  const today = new Date().toISOString().slice(0, 10)
  const sortedDates = [...migraines].map((m) => m.date).sort()
  const firstDate = sortedDates[0]
  const totalDays =
    (new Date(today).getTime() - new Date(firstDate).getTime()) / 86400000 || 1
  const totalMonths = totalDays / 30.44

  const pctChange = (inV: number, outV: number): number | null =>
    outV === 0 ? null : Math.round(((inV - outV) / outV) * 100)

  return medocs
    .filter((m) => m.isLongTermTreatment && m.treatmentPeriods?.length)
    .map((med) => {
      const medTimeline = med.treatmentPeriods!.map((p) => ({
        start: p.startDate < firstDate ? firstDate : p.startDate,
        end: (p.endDate ?? today) > today ? today : (p.endDate ?? today),
      }))

      const { inPeriod, outPeriod } = splitMigrainesByPeriod(migraines, medTimeline)

      const treatDays = medTimeline.reduce((sum, t) => {
        const d = (new Date(t.end).getTime() - new Date(t.start).getTime()) / 86400000
        return sum + Math.max(0, d)
      }, 0)

      const treatMonths = Math.max(treatDays / 30.44, 0.001)
      const outMonths = Math.max(totalMonths - treatMonths, 0.001)

      const freqIn = inPeriod.length / treatMonths
      const freqOut = outPeriod.length / outMonths
      const avgDurIn = averageDurationMinutes(inPeriod)
      const avgDurOut = averageDurationMinutes(outPeriod)
      const avgIntIn = averageIntensity(inPeriod)
      const avgIntOut = averageIntensity(outPeriod)

      return {
        medoc: med.nom,
        periods: med.treatmentPeriods!,
        inPeriod: {
          avgFreqPerMonth: Math.round(freqIn * 10) / 10,
          avgDurationMin: avgDurIn,
          avgIntensity: avgIntIn,
          count: inPeriod.length,
        },
        outPeriod: {
          avgFreqPerMonth: Math.round(freqOut * 10) / 10,
          avgDurationMin: avgDurOut,
          avgIntensity: avgIntOut,
          count: outPeriod.length,
        },
        reductionPct: {
          freq: pctChange(freqIn, freqOut),
          duration: pctChange(avgDurIn, avgDurOut),
          intensity: pctChange(avgIntIn, avgIntOut),
        },
      }
    })
}
