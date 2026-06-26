import { pb } from './pocketbase'
import type { Migraine, MedocFavori } from '../types/migraine'

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
    symptomes: (r['symptomes'] as string[]) || [],
    zone: (r['zone'] as Migraine['zone']) || null,
    declencheurs: (r['declencheurs'] as string[]) || [],
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
    // not found remotely — nothing to delete
  }
}

export async function pushMedocFavori(f: MedocFavori): Promise<void> {
  if (!pb.authStore.isValid) return
  const userId = pb.authStore.record!.id
  try {
    const existing = await pb.collection('medocs_favoris').getFirstListItem(
      `userId="${userId}" && localId="${f.nom}"`
    )
    await pb.collection('medocs_favoris').update(existing['id'] as string, {
      nom: f.nom,
      description: f.description ?? null,
      usageCount: Math.max(f.usageCount, (existing['usageCount'] as number) ?? 0),
      posologieParJour: f.posologieParJour ?? null,
      intervalleHeures: f.intervalleHeures ?? null,
    })
  } catch {
    await pb.collection('medocs_favoris').create({
      userId,
      localId: f.nom,
      nom: f.nom,
      description: f.description ?? null,
      usageCount: f.usageCount,
      posologieParJour: f.posologieParJour ?? null,
      intervalleHeures: f.intervalleHeures ?? null,
    })
  }
}

export async function deleteMedocFavoriRemote(nom: string): Promise<void> {
  if (!pb.authStore.isValid) return
  const userId = pb.authStore.record!.id
  try {
    const existing = await pb.collection('medocs_favoris').getFirstListItem(
      `userId="${userId}" && localId="${nom}"`
    )
    await pb.collection('medocs_favoris').delete(existing['id'] as string)
  } catch {
    // not found remotely
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
    const existing = await pb.collection('user_preferences').getFirstListItem(`userId="${userId}"`)
    prefsRecordId = existing['id'] as string
    await pb.collection('user_preferences').update(prefsRecordId, patch)
  } catch {
    const created = await pb.collection('user_preferences').create({ userId, ...patch })
    prefsRecordId = created['id'] as string
  }
}
