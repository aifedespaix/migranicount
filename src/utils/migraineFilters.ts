import type { Migraine } from '../types/migraine'
import { zoneLabel } from './zone'
import { intensityLabel } from './intensity'

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

function matchesKeyword(migraine: Migraine, keyword: string): boolean {
  const needle = normalize(keyword)
  const haystacks = [
    ...migraine.medocs.map((m) => m.nom),
    migraine.notes ?? '',
    ...migraine.declencheurs.map((d) => d.nom),
    zoneLabel(migraine.zone) ?? '',
    ...migraine.symptomes.map((s) => s.nom),
    intensityLabel(migraine.intensite),
    migraine.avortee ? 'avortée' : '',
  ]
  return haystacks.some((h) => normalize(h).includes(needle))
}

export function filterMigraines(
  migraines: Migraine[],
  opts: { keyword?: string; dateFrom?: string; dateTo?: string; month?: string }
): Migraine[] {
  const keyword = opts.keyword?.trim()
  const dateFrom = opts.dateFrom?.trim()
  const dateTo = opts.dateTo?.trim()
  const month = opts.month?.trim()
  return migraines.filter((m) => {
    if (keyword && !matchesKeyword(m, keyword)) return false
    if (dateFrom && m.date < dateFrom) return false
    if (dateTo && m.date > dateTo) return false
    if (month && !m.date.startsWith(month)) return false
    return true
  })
}
