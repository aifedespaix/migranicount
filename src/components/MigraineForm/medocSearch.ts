import type { MedocFavori } from '../../types/migraine'
import type { DefaultMedication } from '../../data/defaultMedications'

export function normalizeSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** Médicaments de crise du répertoire, les plus utilisés d'abord (ordre alphabétique à égalité). */
export function quickPickMedocs(favoris: MedocFavori[]): MedocFavori[] {
  return favoris
    .filter((f) => !f.isLongTermTreatment)
    .sort((a, b) => b.usageCount - a.usageCount || a.nom.localeCompare(b.nom, 'fr'))
}

export interface MedocSearchResult {
  /** Correspondances dans le répertoire de l'utilisateur. */
  favoris: MedocFavori[]
  /** Correspondances du catalogue par défaut, absentes du répertoire. */
  catalogue: DefaultMedication[]
  /** Vrai si aucun médicament ne porte exactement ce nom : on propose alors de le créer. */
  canCreate: boolean
}

export function searchMedocs(
  query: string,
  favoris: MedocFavori[],
  catalogue: DefaultMedication[],
): MedocSearchResult {
  const q = normalizeSearch(query)
  if (!q) return { favoris: [], catalogue: [], canCreate: false }
  const owned = new Set(favoris.map((f) => normalizeSearch(f.nom)))
  const matchedFavoris = favoris
    .filter((f) => normalizeSearch(f.nom).includes(q))
    .sort((a, b) => b.usageCount - a.usageCount)
  const matchedCatalogue = catalogue.filter(
    (m) => !owned.has(normalizeSearch(m.nom)) && normalizeSearch(m.nom).includes(q),
  )
  const exact =
    owned.has(q) || matchedCatalogue.some((m) => normalizeSearch(m.nom) === q)
  return { favoris: matchedFavoris, catalogue: matchedCatalogue, canCreate: !exact }
}
