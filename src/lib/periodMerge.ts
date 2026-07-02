import type { TreatmentPeriod } from '../types/migraine'

/**
 * Fusionne deux listes de périodes de traitement au niveau de chaque période (par id),
 * au lieu de faire gagner un tableau entier sur l'autre. Une période présente d'un seul
 * côté est conservée ; présente des deux côtés, la plus récemment modifiée (updatedAt) gagne.
 */
export function mergeTreatmentPeriods(local: TreatmentPeriod[], remote: TreatmentPeriod[]): TreatmentPeriod[] {
  const map = new Map<string, TreatmentPeriod>()
  for (const p of remote) map.set(p.id, p)
  for (const p of local) {
    const existing = map.get(p.id)
    if (!existing || new Date(p.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()) {
      map.set(p.id, p)
    }
  }
  return Array.from(map.values())
}

/** Deux périodes se chevauchent si leurs intervalles [startDate, endDate] s'intersectent (endDate null = en cours, sans limite). */
export function periodsOverlap(
  a: { startDate: string; endDate: string | null },
  b: { startDate: string; endDate: string | null },
): boolean {
  const aEnd = a.endDate ?? '9999-12-31'
  const bEnd = b.endDate ?? '9999-12-31'
  return a.startDate <= bEnd && b.startDate <= aEnd
}
