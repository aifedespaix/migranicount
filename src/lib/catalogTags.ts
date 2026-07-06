import { newId } from '../utils/uuid'
import type { CatalogTag } from '../types/migraine'

/** Clé de comparaison des noms de tags (les doublons issus de la sync diffèrent souvent par la casse ou des espaces). */
export function normalizeNom(nom: string): string {
  return nom.trim().toLocaleLowerCase('fr')
}

/**
 * Convertit un tableau potentiellement hérité (strings pré-refonte, objets sans id,
 * entrées vides écrites par un ancien merge) en CatalogTag[] propres.
 * Les entrées sans nom exploitable sont éliminées.
 */
export function normalizeCatalogTags(raw: unknown): CatalogTag[] {
  if (!Array.isArray(raw)) return []
  const out: CatalogTag[] = []
  for (const entry of raw) {
    if (typeof entry === 'string') {
      const nom = entry.trim()
      if (nom) out.push({ id: newId(), nom })
      continue
    }
    if (entry && typeof entry === 'object') {
      const nomRaw = (entry as Record<string, unknown>)['nom']
      const nom = typeof nomRaw === 'string' ? nomRaw.trim() : ''
      if (!nom) continue
      const idRaw = (entry as Record<string, unknown>)['id']
      const id = typeof idRaw === 'string' && idRaw ? idRaw : newId()
      out.push({ id, nom })
    }
  }
  return out
}

/**
 * Dédoublonne par nom normalisé : le premier tag vu gagne, les suivants sont éliminés
 * et remappés vers l'id conservé. Un tag dont le nom correspond à un tag réservé
 * (les défauts) est toujours éliminé au profit de l'id réservé.
 * Le remap ne contient jamais d'entrée identitaire (id remappé vers lui-même).
 */
export function dedupeCatalogTags(
  tags: CatalogTag[],
  reserved: CatalogTag[] = [],
): { tags: CatalogTag[]; remap: Map<string, string> } {
  const keptByNom = new Map<string, CatalogTag>()
  for (const r of reserved) keptByNom.set(normalizeNom(r.nom), r)

  const out: CatalogTag[] = []
  const remap = new Map<string, string>()
  for (const tag of tags) {
    const key = normalizeNom(tag.nom)
    const kept = keptByNom.get(key)
    if (kept) {
      if (tag.id !== kept.id) remap.set(tag.id, kept.id)
      continue
    }
    keptByNom.set(key, tag)
    out.push(tag)
  }
  return { tags: out, remap }
}

/**
 * Fusionne le catalogue local avec sa copie distante : fusion par id (le local gagne),
 * normalisation du distant (format hérité possible), puis dédoublonnage par nom
 * (le local passe en premier, donc son id est conservé en cas de doublon).
 */
export function mergeCatalogTags(
  local: CatalogTag[],
  remoteRaw: unknown,
  defaults: CatalogTag[] = [],
): CatalogTag[] {
  const remote = normalizeCatalogTags(remoteRaw)
  const localIds = new Set(local.map((t) => t.id))
  const merged = [...local, ...remote.filter((t) => !localIds.has(t.id))]
  return dedupeCatalogTags(merged, defaults).tags
}
