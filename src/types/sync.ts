export type TombstoneEntityType = 'migraine' | 'medoc' | 'symptome' | 'declencheur'

export interface Tombstone {
  entityType: TombstoneEntityType
  entityId: string
  deletedAt: string
}
