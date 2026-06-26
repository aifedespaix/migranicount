import type { MigraineDraft } from '../components/MigraineForm/draft'

/**
 * Returns the number of important fields that are missing for a given step.
 * Important fields:
 *   Step 0 (When):  heureFin === null → 1 missing
 *   Step 4 (Zone):  zone === null     → 1 missing
 *   All others: 0
 */
export function stepMissingCount(stepIdx: number, draft: Pick<MigraineDraft, 'heureFin' | 'zone'>): number {
  if (stepIdx === 0) return draft.heureFin === null ? 1 : 0
  if (stepIdx === 4) return draft.zone === null ? 1 : 0
  return 0
}
