import { getJSON, setJSON } from './storage'
import { newId } from '../utils/uuid'
import { DEFAULT_SYMPTOMES, DEFAULT_DECLENCHEURS } from '../data/defaultTags'
import { normalizeCatalogTags, dedupeCatalogTags, normalizeNom } from '../lib/catalogTags'
import { mergeTreatmentPeriods } from '../lib/periodMerge'
import type { Migraine, MedocFavori, TreatmentPeriod, CatalogTag } from '../types/migraine'
import type { Tombstone, TombstoneEntityType } from '../types/sync'

const MIGRAINES_KEY = 'migraines'
const MEDOCS_KEY = 'medocsFavoris'
const DECLENCHEURS_KEY = 'declencheursFavoris'
const SYMPTOMES_KEY = 'symptomesCustom'
const TOMBSTONES_KEY = 'tombstones'
const SCHEMA_VERSION_KEY = 'schemaVersion'
const SCHEMA_VERSION = 5

export function listTombstones(): Tombstone[] {
  return getJSON<Tombstone[]>(TOMBSTONES_KEY, [])
}

/** Enregistre (ou rafraîchit) une suppression, pour empêcher la résurrection lors d'un merge de sync. */
export function recordTombstone(entityType: TombstoneEntityType, entityId: string): Tombstone {
  const items = listTombstones()
  const existing = items.find((t) => t.entityType === entityType && t.entityId === entityId)
  const tombstone: Tombstone = { entityType, entityId, deletedAt: new Date().toISOString() }
  if (existing) {
    existing.deletedAt = tombstone.deletedAt
    setJSON(TOMBSTONES_KEY, items)
    return existing
  }
  setJSON(TOMBSTONES_KEY, [...items, tombstone])
  return tombstone
}

/** Efface une suppression enregistrée (undo), pour permettre à l'entité restaurée d'être re-synchronisée normalement. */
export function clearTombstone(entityType: TombstoneEntityType, entityId: string): void {
  setJSON(
    TOMBSTONES_KEY,
    listTombstones().filter((t) => !(t.entityType === entityType && t.entityId === entityId)),
  )
}

function migrateMigraine(m: any): Migraine {
  if (!Array.isArray(m.symptomes)) {
    m.symptomes = [
      m.nausee ? 'Nausée' : null,
      m.vomissement ? 'Vomissement' : null,
      m.aura ? 'Aura visuelle' : null,
    ].filter(Boolean) as string[]
  }
  if ('localisation' in m && !('zone' in m)) {
    m.zone = m.localisation
    delete m.localisation
  }
  if (!Array.isArray(m.declencheurs)) m.declencheurs = []
  return m as Migraine
}

function toCatalogTags(raw: any[]): CatalogTag[] {
  if (raw.length === 0) return []
  if (typeof raw[0] === 'string') return (raw as string[]).map((nom) => ({ id: newId(), nom }))
  return raw as CatalogTag[]
}

/** Migre en une fois toutes les données héritées (string[] / medocs sans id) vers le modèle à IDs stables. */
function migrateToV4(): void {
  const rawMedocs = getJSON<any[]>(MEDOCS_KEY, [])
  let medocsChanged = false
  for (const m of rawMedocs) {
    if (!m.id) {
      m.id = newId()
      medocsChanged = true
    }
  }
  if (medocsChanged) setJSON(MEDOCS_KEY, rawMedocs)
  const medocIdByNom = new Map<string, string>(rawMedocs.map((m) => [m.nom, m.id]))

  const symptCustom = toCatalogTags(getJSON<any[]>(SYMPTOMES_KEY, []))
  setJSON(SYMPTOMES_KEY, symptCustom)

  const declCustom = toCatalogTags(getJSON<any[]>(DECLENCHEURS_KEY, []))
  setJSON(DECLENCHEURS_KEY, declCustom)

  const symptByNom = new Map<string, CatalogTag>(
    [...DEFAULT_SYMPTOMES, ...symptCustom].map((s) => [s.nom, s]),
  )
  const declByNom = new Map<string, CatalogTag>(
    [...DEFAULT_DECLENCHEURS, ...declCustom].map((d) => [d.nom, d]),
  )

  const rawMigraines = getJSON<any[]>(MIGRAINES_KEY, []).map(migrateMigraine) as any[]
  for (const m of rawMigraines) {
    if (m.symptomes.length && typeof m.symptomes[0] === 'string') {
      m.symptomes = (m.symptomes as string[]).map((nom) => symptByNom.get(nom) ?? { id: newId(), nom })
    }
    if (m.declencheurs.length && typeof m.declencheurs[0] === 'string') {
      m.declencheurs = (m.declencheurs as string[]).map((nom) => declByNom.get(nom) ?? { id: newId(), nom })
    }
    if (Array.isArray(m.medocs)) {
      for (const p of m.medocs) {
        if (p.medocId === undefined) p.medocId = medocIdByNom.get(p.nom) ?? null
      }
    }
  }
  setJSON(MIGRAINES_KEY, rawMigraines)
}

/** Fusionne deux médocs dupliqués en gardant le maximum de données de chacun. */
function mergeMedocData(keep: MedocFavori, dup: MedocFavori): MedocFavori {
  return {
    ...keep,
    description: keep.description || dup.description || undefined,
    usageCount: Math.max(keep.usageCount ?? 0, dup.usageCount ?? 0),
    posologieParJour: keep.posologieParJour ?? dup.posologieParJour,
    intervalleHeures: keep.intervalleHeures ?? dup.intervalleHeures,
    isLongTermTreatment: keep.isLongTermTreatment || dup.isLongTermTreatment || undefined,
    treatmentPeriods:
      keep.treatmentPeriods || dup.treatmentPeriods
        ? mergeTreatmentPeriods(keep.treatmentPeriods ?? [], dup.treatmentPeriods ?? [])
        : undefined,
    sideEffects: keep.sideEffects || dup.sideEffects || undefined,
    expectedEffects: keep.expectedEffects || dup.expectedEffects || undefined,
  }
}

/** Répare un catalogue de tags : normalise les entrées héritées, dédoublonne par nom, tombstone les ids abandonnés. */
function repairTagCatalog(
  key: string,
  entityType: TombstoneEntityType,
  defaults: CatalogTag[],
): Map<string, string> {
  const { tags, remap } = dedupeCatalogTags(normalizeCatalogTags(getJSON<unknown>(key, [])), defaults)
  setJSON(key, tags)
  for (const droppedId of remap.keys()) recordTombstone(entityType, droppedId)
  return remap
}

/** Répare les médocs favoris : dédoublonne par nom en fusionnant les données, tombstone les ids abandonnés. */
function repairMedocs(): Map<string, string> {
  const raw = getJSON<any[]>(MEDOCS_KEY, []).filter(
    (m) => m && typeof m.nom === 'string' && m.nom.trim(),
  )
  const keptByNom = new Map<string, MedocFavori>()
  const remap = new Map<string, string>()
  for (const m of raw) {
    if (!m.id) m.id = newId()
    const key = normalizeNom(m.nom)
    const kept = keptByNom.get(key)
    if (kept) {
      keptByNom.set(key, mergeMedocData(kept, m))
      remap.set(m.id, kept.id)
      recordTombstone('medoc', m.id)
    } else {
      keptByNom.set(key, m)
    }
  }
  setJSON(MEDOCS_KEY, Array.from(keptByNom.values()))
  return remap
}

/** Remap une liste de références {id, nom} d'une migraine vers les ids conservés, en dédoublonnant. */
function remapTagRefs(
  refs: unknown,
  remap: Map<string, string>,
  catalog: CatalogTag[],
): CatalogTag[] {
  const catalogById = new Map(catalog.map((t) => [t.id, t]))
  const catalogByNom = new Map(catalog.map((t) => [normalizeNom(t.nom), t]))
  const out: CatalogTag[] = []
  const seen = new Set<string>()
  for (const tag of normalizeCatalogTags(refs)) {
    let id = remap.get(tag.id) ?? tag.id
    // Référence orpheline (id inconnu du catalogue) : tente une réconciliation par nom.
    if (!catalogById.has(id)) {
      const match = catalogByNom.get(normalizeNom(tag.nom))
      if (match) id = match.id
    }
    if (!seen.has(id)) {
      seen.add(id)
      out.push({ id, nom: catalogById.get(id)?.nom ?? tag.nom })
    }
  }
  return out
}

/**
 * Répare les dégâts causés par les anciens merges de sync non normalisés (avant cette version) :
 * entrées héritées au format string, tags sans id/nom, doublons du même nom sous des ids
 * différents (chaque appareil mintait les siens à la migration v4). Les ids abandonnés sont
 * tombstonés pour que la sync nettoie aussi les copies distantes sans jamais les ressusciter.
 */
function migrateToV5(): void {
  const symptRemap = repairTagCatalog(SYMPTOMES_KEY, 'symptome', DEFAULT_SYMPTOMES)
  const declRemap = repairTagCatalog(DECLENCHEURS_KEY, 'declencheur', DEFAULT_DECLENCHEURS)
  const medocRemap = repairMedocs()

  const symptCatalog = [...DEFAULT_SYMPTOMES, ...getJSON<CatalogTag[]>(SYMPTOMES_KEY, [])]
  const declCatalog = [...DEFAULT_DECLENCHEURS, ...getJSON<CatalogTag[]>(DECLENCHEURS_KEY, [])]

  const migraines = getJSON<any[]>(MIGRAINES_KEY, [])
  for (const m of migraines) {
    m.symptomes = remapTagRefs(m.symptomes, symptRemap, symptCatalog)
    m.declencheurs = remapTagRefs(m.declencheurs, declRemap, declCatalog)
    if (Array.isArray(m.medocs)) {
      for (const p of m.medocs) {
        if (p.medocId && medocRemap.has(p.medocId)) p.medocId = medocRemap.get(p.medocId)
      }
    }
  }
  setJSON(MIGRAINES_KEY, migraines)
}

function ensureMigrated(): void {
  const version = getJSON<number>(SCHEMA_VERSION_KEY, 0)
  if (version >= SCHEMA_VERSION) return
  if (version < 4) migrateToV4()
  if (version < 5) migrateToV5()
  setJSON(SCHEMA_VERSION_KEY, SCHEMA_VERSION)
}

export function listMigraines(): Migraine[] {
  ensureMigrated()
  return getJSON<Migraine[]>(MIGRAINES_KEY, []).map(migrateMigraine)
}

export function getMigraine(id: string): Migraine | undefined {
  return listMigraines().find((m) => m.id === id)
}

type MigraineInput = Omit<Migraine, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }

export function saveMigraine(input: MigraineInput): Migraine {
  const all = listMigraines()
  const now = new Date().toISOString()
  const existingIndex = input.id ? all.findIndex((m) => m.id === input.id) : -1

  if (existingIndex >= 0) {
    const updated: Migraine = { ...all[existingIndex], ...input, id: input.id!, updatedAt: now }
    all[existingIndex] = updated
    setJSON(MIGRAINES_KEY, all)
    return updated
  }

  const created: Migraine = { ...input, id: newId(), createdAt: now, updatedAt: now }
  setJSON(MIGRAINES_KEY, [...all, created])
  return created
}

export function deleteMigraine(id: string): void {
  setJSON(MIGRAINES_KEY, listMigraines().filter((m) => m.id !== id))
  recordTombstone('migraine', id)
}

/** Réinsère une migraine en conservant son id d'origine (undo de suppression), au lieu d'en miner un nouveau. */
export function restoreMigraine(m: Migraine): Migraine {
  const all = listMigraines()
  const existing = all.find((x) => x.id === m.id)
  clearTombstone('migraine', m.id)
  if (existing) return existing
  setJSON(MIGRAINES_KEY, [...all, m])
  return m
}

export function listMedocsFavoris(): MedocFavori[] {
  ensureMigrated()
  return getJSON<MedocFavori[]>(MEDOCS_KEY, [])
}

export function registerMedocUsage(nom: string, description?: string): MedocFavori {
  const favoris = listMedocsFavoris()
  const existing = favoris.find((f) => normalizeNom(f.nom) === normalizeNom(nom))
  if (existing) {
    existing.usageCount += 1
    if (description) existing.description = description
    setJSON(MEDOCS_KEY, favoris)
    return existing
  }
  const created: MedocFavori = { id: newId(), nom, description, usageCount: 1 }
  favoris.push(created)
  setJSON(MEDOCS_KEY, favoris)
  return created
}

export function updateMedocFavoriDescription(id: string, description: string): void {
  const favoris = listMedocsFavoris()
  const existing = favoris.find((f) => f.id === id)
  if (!existing) return
  existing.description = description || undefined
  setJSON(MEDOCS_KEY, favoris)
}

export function updateMedocFavoriPosologie(
  id: string,
  posologieParJour?: number,
  intervalleHeures?: number,
): void {
  const favoris = listMedocsFavoris()
  const existing = favoris.find((f) => f.id === id)
  if (!existing) return
  existing.posologieParJour = posologieParJour || undefined
  existing.intervalleHeures = intervalleHeures || undefined
  setJSON(MEDOCS_KEY, favoris)
}

export function listDeclencheursFavoris(): CatalogTag[] {
  ensureMigrated()
  return getJSON<CatalogTag[]>(DECLENCHEURS_KEY, [])
}

export function registerDeclencheur(nom: string): CatalogTag {
  const tags = listDeclencheursFavoris()
  const existing = tags.find((t) => normalizeNom(t.nom) === normalizeNom(nom))
  if (existing) return existing
  const created: CatalogTag = { id: newId(), nom }
  setJSON(DECLENCHEURS_KEY, [...tags, created])
  return created
}

export function deleteDeclencheur(id: string): void {
  setJSON(DECLENCHEURS_KEY, listDeclencheursFavoris().filter((t) => t.id !== id))
  recordTombstone('declencheur', id)
}

export function addMedocFavori(nom: string, description?: string): MedocFavori {
  const favoris = listMedocsFavoris()
  const existing = favoris.find((f) => normalizeNom(f.nom) === normalizeNom(nom))
  if (existing) return existing
  const created: MedocFavori = { id: newId(), nom, description, usageCount: 0 }
  favoris.push(created)
  setJSON(MEDOCS_KEY, favoris)
  return created
}

export function deleteMedocFavori(id: string): void {
  setJSON(MEDOCS_KEY, listMedocsFavoris().filter((f) => f.id !== id))
  recordTombstone('medoc', id)
}

export function renameMedocFavori(id: string, newNom: string): void {
  const favoris = listMedocsFavoris()
  const existing = favoris.find((f) => f.id === id)
  if (!existing) return
  existing.nom = newNom
  setJSON(MEDOCS_KEY, favoris)
}

export function listSymptomesCustom(): CatalogTag[] {
  ensureMigrated()
  return getJSON<CatalogTag[]>(SYMPTOMES_KEY, [])
}

export function addSymptomeCustom(nom: string): CatalogTag {
  const items = listSymptomesCustom()
  const existing = items.find((s) => normalizeNom(s.nom) === normalizeNom(nom))
  if (existing) return existing
  const created: CatalogTag = { id: newId(), nom }
  setJSON(SYMPTOMES_KEY, [...items, created])
  return created
}

export function deleteSymptomeCustom(id: string): void {
  setJSON(SYMPTOMES_KEY, listSymptomesCustom().filter((s) => s.id !== id))
  recordTombstone('symptome', id)
}

export function renameSymptomeCustom(id: string, newNom: string): void {
  setJSON(SYMPTOMES_KEY, listSymptomesCustom().map((s) => (s.id === id ? { ...s, nom: newNom } : s)))
}

/** Réinsère un symptôme en conservant son id d'origine (undo de suppression), au lieu d'en miner un nouveau. */
export function restoreSymptomeCustom(tag: CatalogTag): CatalogTag {
  const items = listSymptomesCustom()
  const existing = items.find((s) => s.id === tag.id || s.nom === tag.nom)
  clearTombstone('symptome', tag.id)
  if (existing) return existing
  setJSON(SYMPTOMES_KEY, [...items, tag])
  return tag
}

/** Réinsère un déclencheur en conservant son id d'origine (undo de suppression), au lieu d'en miner un nouveau. */
export function restoreDeclencheur(tag: CatalogTag): CatalogTag {
  const items = listDeclencheursFavoris()
  const existing = items.find((t) => t.id === tag.id || t.nom === tag.nom)
  clearTombstone('declencheur', tag.id)
  if (existing) return existing
  setJSON(DECLENCHEURS_KEY, [...items, tag])
  return tag
}

export function addMedocFavoriWithDetails(
  med: Omit<MedocFavori, 'id' | 'usageCount'> & { id?: string; usageCount?: number },
): MedocFavori {
  const favoris = listMedocsFavoris()
  const existing = favoris.find((f) => normalizeNom(f.nom) === normalizeNom(med.nom))
  if (existing) return existing
  const created: MedocFavori = { ...med, id: med.id ?? newId(), usageCount: med.usageCount ?? 0 }
  favoris.push(created)
  setJSON(MEDOCS_KEY, favoris)
  clearTombstone('medoc', created.id)
  return created
}

export function updateMedocFavoriDetails(
  id: string,
  updates: Partial<Pick<MedocFavori, 'isLongTermTreatment' | 'sideEffects' | 'expectedEffects'>>,
): void {
  const favoris = listMedocsFavoris()
  const existing = favoris.find((f) => f.id === id)
  if (!existing) return
  Object.assign(existing, updates)
  setJSON(MEDOCS_KEY, favoris)
}

export function addTreatmentPeriod(medocId: string, period: Omit<TreatmentPeriod, 'id' | 'updatedAt'>): void {
  const favoris = listMedocsFavoris()
  const existing = favoris.find((f) => f.id === medocId)
  if (!existing) return
  const created: TreatmentPeriod = { ...period, id: newId(), updatedAt: new Date().toISOString() }
  existing.treatmentPeriods = [...(existing.treatmentPeriods ?? []), created]
  setJSON(MEDOCS_KEY, favoris)
}

export function updateTreatmentPeriod(
  medocId: string,
  periodId: string,
  period: Omit<TreatmentPeriod, 'id' | 'updatedAt'>,
): void {
  const favoris = listMedocsFavoris()
  const existing = favoris.find((f) => f.id === medocId)
  if (!existing?.treatmentPeriods) return
  existing.treatmentPeriods = existing.treatmentPeriods.map((p) =>
    p.id === periodId ? { ...period, id: periodId, updatedAt: new Date().toISOString() } : p,
  )
  setJSON(MEDOCS_KEY, favoris)
}

/** Remplace en bloc les périodes d'un médicament (utilisé par le merge de sync, après fusion par id). */
export function setTreatmentPeriods(medocId: string, periods: TreatmentPeriod[]): void {
  const favoris = listMedocsFavoris()
  const existing = favoris.find((f) => f.id === medocId)
  if (!existing) return
  existing.treatmentPeriods = periods
  setJSON(MEDOCS_KEY, favoris)
}

export function removeTreatmentPeriod(medocId: string, periodId: string): void {
  const favoris = listMedocsFavoris()
  const existing = favoris.find((f) => f.id === medocId)
  if (!existing?.treatmentPeriods) return
  existing.treatmentPeriods = existing.treatmentPeriods.filter((p) => p.id !== periodId)
  setJSON(MEDOCS_KEY, favoris)
}

export function exportAll(): string {
  return JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    migraines: listMigraines(),
    medocsFavoris: listMedocsFavoris(),
    declencheursFavoris: listDeclencheursFavoris(),
  })
}

export function importAll(json: string): void {
  const data = JSON.parse(json)
  setJSON(MIGRAINES_KEY, data.migraines ?? [])
  setJSON(MEDOCS_KEY, data.medocsFavoris ?? [])
  setJSON(DECLENCHEURS_KEY, data.declencheursFavoris ?? [])
  setJSON(SCHEMA_VERSION_KEY, data.schemaVersion ?? SCHEMA_VERSION)
}
