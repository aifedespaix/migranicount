import type { MedocFavori, Migraine, CatalogTag } from '../types/migraine'
import type { Tombstone, TombstoneEntityType } from '../types/sync'
import { pb } from './pocketbase'

function avorteeToStr(v: boolean | 'probable'): string {
  if (v === 'probable') return 'probable'
  return v ? 'true' : 'false'
}

function strToAvortee(s: string): boolean | 'probable' {
  if (s === 'probable') return 'probable'
  return s === 'true'
}

export function migraineToRemote(m: Migraine) {
  return {
    localId: m.id,
    userId: pb.authStore.record!.id,
    date: m.date,
    heureDebut: m.heureDebut,
    heureFin: m.heureFin ?? null,
    medocs: m.medocs,
    intensite: m.intensite,
    avortee: avorteeToStr(m.avortee),
    symptomes: m.symptomes,
    zone: m.zone ?? null,
    declencheurs: m.declencheurs,
    notes: m.notes ?? null,
    localUpdatedAt: m.updatedAt,
  }
}

export function remoteToMigraine(r: Record<string, unknown>): Migraine {
  return {
    id: r['localId'] as string,
    date: r['date'] as string,
    heureDebut: r['heureDebut'] as string,
    heureFin: (r['heureFin'] as string) || null,
    medocs: (r['medocs'] as Migraine['medocs']) || [],
    intensite: r['intensite'] as number,
    avortee: strToAvortee(r['avortee'] as string),
    symptomes: (r['symptomes'] as CatalogTag[]) || [],
    zone: (r['zone'] as Migraine['zone']) || null,
    declencheurs: (r['declencheurs'] as CatalogTag[]) || [],
    notes: (r['notes'] as string) || undefined,
    createdAt: r['created'] as string,
    updatedAt: (r['localUpdatedAt'] as string) || (r['created'] as string),
  }
}

export async function pushMigraine(m: Migraine): Promise<void> {
  if (!pb.authStore.isValid) return
  const payload = migraineToRemote(m)
  try {
    const existing = await pb.collection('migraines').getFirstListItem(`localId="${m.id}"`)
    await pb.collection('migraines').update(existing['id'] as string, payload)
  } catch {
    await pb.collection('migraines').create(payload)
  }
}

export async function deleteMigraineRemote(localId: string): Promise<void> {
  if (!pb.authStore.isValid) return
  try {
    const existing = await pb.collection('migraines').getFirstListItem(`localId="${localId}"`)
    await pb.collection('migraines').delete(existing['id'] as string)
  } catch {
    // not found remotely - nothing to delete
  }
}

/**
 * Supprime l'enregistrement distant ET crée le tombstone en une seule transaction PocketBase
 * (pb.createBatch) : soit les deux réussissent, soit aucun n'est appliqué. Évite l'état
 * intermédiaire "supprimé à distance mais sans tombstone" (ou l'inverse) qu'un enchaînement
 * de deux requêtes séparées peut laisser en cas d'échec réseau entre les deux.
 */
export async function deleteMigraineAndTombstoneAtomic(localId: string, tombstone: Tombstone): Promise<void> {
  if (!pb.authStore.isValid) return
  const userId = pb.authStore.record!.id
  const [existingMigraine, existingTombstone] = await Promise.all([
    pb.collection('migraines').getFirstListItem(`localId="${localId}"`).catch(() => null),
    pb.collection('tombstones')
      .getFirstListItem(`userId="${userId}" && entityType="migraine" && entityId="${localId}"`)
      .catch(() => null),
  ])
  if (!existingMigraine && existingTombstone) return // déjà pleinement supprimé côté distant
  const batch = pb.createBatch()
  if (existingMigraine) batch.collection('migraines').delete(existingMigraine['id'] as string)
  if (!existingTombstone) {
    batch.collection('tombstones').create({
      userId, entityType: 'migraine', entityId: localId, deletedAt: tombstone.deletedAt,
    })
  }
  await batch.send()
}

export async function pushMedocFavori(f: MedocFavori): Promise<void> {
  if (!pb.authStore.isValid) return
  const userId = pb.authStore.record!.id
  try {
    const existing = await pb.collection('medocs_favoris').getFirstListItem(
      `userId="${userId}" && localId="${f.id}"`
    )
    await pb.collection('medocs_favoris').update(existing['id'] as string, {
      nom: f.nom,
      description: f.description ?? null,
      usageCount: Math.max(f.usageCount, (existing['usageCount'] as number) ?? 0),
      posologieParJour: f.posologieParJour ?? null,
      intervalleHeures: f.intervalleHeures ?? null,
      isLongTermTreatment: f.isLongTermTreatment ?? null,
      treatmentPeriods: f.treatmentPeriods ?? null,
      sideEffects: f.sideEffects ?? null,
      expectedEffects: f.expectedEffects ?? null,
    })
  } catch {
    await pb.collection('medocs_favoris').create({
      userId,
      localId: f.id,
      nom: f.nom,
      description: f.description ?? null,
      usageCount: f.usageCount,
      posologieParJour: f.posologieParJour ?? null,
      intervalleHeures: f.intervalleHeures ?? null,
      isLongTermTreatment: f.isLongTermTreatment ?? null,
      treatmentPeriods: f.treatmentPeriods ?? null,
      sideEffects: f.sideEffects ?? null,
      expectedEffects: f.expectedEffects ?? null,
    })
  }
}

export async function deleteMedocFavoriRemote(id: string): Promise<void> {
  if (!pb.authStore.isValid) return
  const userId = pb.authStore.record!.id
  try {
    const existing = await pb.collection('medocs_favoris').getFirstListItem(
      `userId="${userId}" && localId="${id}"`
    )
    await pb.collection('medocs_favoris').delete(existing['id'] as string)
  } catch {
    // not found remotely
  }
}

/** Équivalent atomique (pb.createBatch) de deleteMedocFavoriRemote + pushTombstone. Voir deleteMigraineAndTombstoneAtomic. */
export async function deleteMedocAndTombstoneAtomic(id: string, tombstone: Tombstone): Promise<void> {
  if (!pb.authStore.isValid) return
  const userId = pb.authStore.record!.id
  const [existingMedoc, existingTombstone] = await Promise.all([
    pb.collection('medocs_favoris').getFirstListItem(`userId="${userId}" && localId="${id}"`).catch(() => null),
    pb.collection('tombstones')
      .getFirstListItem(`userId="${userId}" && entityType="medoc" && entityId="${id}"`)
      .catch(() => null),
  ])
  if (!existingMedoc && existingTombstone) return
  const batch = pb.createBatch()
  if (existingMedoc) batch.collection('medocs_favoris').delete(existingMedoc['id'] as string)
  if (!existingTombstone) {
    batch.collection('tombstones').create({
      userId, entityType: 'medoc', entityId: id, deletedAt: tombstone.deletedAt,
    })
  }
  await batch.send()
}

export async function pushTombstone(t: Tombstone): Promise<void> {
  if (!pb.authStore.isValid) return
  const userId = pb.authStore.record!.id
  try {
    await pb.collection('tombstones').create({
      userId,
      entityType: t.entityType,
      entityId: t.entityId,
      deletedAt: t.deletedAt,
    })
  } catch {
    // déjà présent (contrainte d'unicité userId+entityType+entityId) - rien à faire
  }
}

export async function deleteTombstoneRemote(entityType: TombstoneEntityType, entityId: string): Promise<void> {
  if (!pb.authStore.isValid) return
  const userId = pb.authStore.record!.id
  try {
    const existing = await pb.collection('tombstones').getFirstListItem(
      `userId="${userId}" && entityType="${entityType}" && entityId="${entityId}"`
    )
    await pb.collection('tombstones').delete(existing['id'] as string)
  } catch {
    // pas de tombstone distant - rien à faire
  }
}

let prefsRecordId: string | null = null

export function clearPrefsCache(): void {
  prefsRecordId = null
}

export async function patchPreferences(patch: Record<string, unknown>): Promise<void> {
  if (!pb.authStore.isValid) return
  const userId = pb.authStore.record!.id

  if (prefsRecordId) {
    try {
      await pb.collection('user_preferences').update(prefsRecordId, patch)
      return
    } catch {
      prefsRecordId = null
    }
  }

  try {
    const existing = await pb.collection('user_preferences').getFirstListItem(
      `userId="${userId}"`,
      { requestKey: null },
    )
    prefsRecordId = existing['id'] as string
    await pb.collection('user_preferences').update(prefsRecordId, patch)
  } catch {
    try {
      const created = await pb.collection('user_preferences').create({ userId, ...patch })
      prefsRecordId = created['id'] as string
    } catch {
      // concurrent create won the race - look up the record and update instead
      try {
        const existing = await pb.collection('user_preferences').getFirstListItem(
          `userId="${userId}"`,
          { requestKey: null },
        )
        prefsRecordId = existing['id'] as string
        await pb.collection('user_preferences').update(prefsRecordId, patch)
      } catch {
        // best-effort
      }
    }
  }
}
