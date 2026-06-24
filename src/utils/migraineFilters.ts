import type { Migraine } from '../types/migraine'

const LOCALISATION_LABELS: Record<NonNullable<Migraine['localisation']>, string> = {
  gauche: 'Gauche',
  droite: 'Droite',
  bilaterale: 'Bilatérale',
  nuque: 'Nuque',
}

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
    ...migraine.declencheurs,
    migraine.localisation ? LOCALISATION_LABELS[migraine.localisation] : '',
  ]
  return haystacks.some((h) => normalize(h).includes(needle))
}

export function filterMigraines(
  migraines: Migraine[],
  opts: { keyword?: string; month?: string }
): Migraine[] {
  const keyword = opts.keyword?.trim()
  const month = opts.month?.trim()
  return migraines.filter((m) => {
    if (keyword && !matchesKeyword(m, keyword)) return false
    if (month && !m.date.startsWith(month)) return false
    return true
  })
}
