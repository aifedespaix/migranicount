import { getJSON, setJSON } from '../../storage/storage'
import { todayISO, nowHHmm } from '../../utils/date'
import type { Migraine } from '../../types/migraine'

export type MigraineDraft = Omit<Migraine, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }

const DRAFT_KEY = 'draft'

export function emptyDraft(): MigraineDraft {
  return {
    date: todayISO(),
    heureDebut: nowHHmm(),
    heureFin: null,
    medocs: [],
    intensite: 5,
    avortee: false,
    nausee: false,
    vomissement: false,
    aura: false,
    localisation: null,
    declencheurs: [],
    notes: '',
  }
}

export function loadDraft(): MigraineDraft {
  return getJSON<MigraineDraft>(DRAFT_KEY, emptyDraft())
}

export function saveDraft(d: MigraineDraft): void {
  setJSON(DRAFT_KEY, d)
}

export function clearDraft(): void {
  setJSON(DRAFT_KEY, emptyDraft())
}
