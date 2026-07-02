import { pb } from './pocketbase'
import {
  pushMigraine,
  deleteMigraineAndTombstoneAtomic,
  pushMedocFavori,
  deleteMedocAndTombstoneAtomic,
  pushTombstone,
  deleteTombstoneRemote,
  patchPreferences,
} from './pbSync'
import { getJSON, setJSON } from '../storage/storage'
import type { Migraine, MedocFavori } from '../types/migraine'
import type { Tombstone, TombstoneEntityType } from '../types/sync'

export type OutboxOp =
  | { type: 'migraine-upsert'; migraine: Migraine }
  | { type: 'migraine-delete'; id: string; tombstone: Tombstone }
  | { type: 'medoc-upsert'; medoc: MedocFavori }
  | { type: 'medoc-delete'; id: string; tombstone: Tombstone }
  | { type: 'tombstone-push'; tombstone: Tombstone }
  | { type: 'tombstone-clear'; entityType: TombstoneEntityType; entityId: string }
  | { type: 'preferences-patch'; patch: Record<string, unknown> }

const OUTBOX_KEY = 'syncOutbox'
let processing = false

function getQueue(): OutboxOp[] {
  return getJSON<OutboxOp[]>(OUTBOX_KEY, [])
}

function setQueue(queue: OutboxOp[]): void {
  setJSON(OUTBOX_KEY, queue)
}

export function listOutbox(): OutboxOp[] {
  return getQueue()
}

/** Ajoute une opération à la file et déclenche son traitement (no-op si hors-ligne, elle attendra). */
export function enqueue(op: OutboxOp): void {
  setQueue([...getQueue(), op])
  void processOutbox()
}

/**
 * Traite la file séquentiellement, dans l'ordre. Une opération n'est retirée de la file
 * qu'une fois confirmée par le serveur ; en cas d'échec, on s'arrête immédiatement (sans
 * sauter à la suivante) pour préserver l'ordre et retenter au prochain appel (reconnexion,
 * minuteur, nouvel événement local).
 */
export async function processOutbox(): Promise<void> {
  if (processing || !pb.authStore.isValid) return
  processing = true
  try {
    let queue = getQueue()
    while (queue.length > 0) {
      try {
        await applyOp(queue[0])
      } catch {
        break
      }
      queue = queue.slice(1)
      setQueue(queue)
    }
  } finally {
    processing = false
  }
}

async function applyOp(op: OutboxOp): Promise<void> {
  switch (op.type) {
    case 'migraine-upsert':
      return pushMigraine(op.migraine)
    case 'migraine-delete':
      return deleteMigraineAndTombstoneAtomic(op.id, op.tombstone)
    case 'medoc-upsert':
      return pushMedocFavori(op.medoc)
    case 'medoc-delete':
      return deleteMedocAndTombstoneAtomic(op.id, op.tombstone)
    case 'tombstone-push':
      return pushTombstone(op.tombstone)
    case 'tombstone-clear':
      return deleteTombstoneRemote(op.entityType, op.entityId)
    case 'preferences-patch':
      return patchPreferences(op.patch)
  }
}
