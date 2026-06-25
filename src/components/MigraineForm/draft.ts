import { getJSON, setJSON } from '../../storage/storage'
import { todayISO, nowHHmm } from '../../utils/date'
import type { Migraine } from '../../types/migraine'

export type MigraineDraft = Omit<Migraine, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }

const DRAFT_KEY = 'draft'
const DRAFT_STEP_KEY = 'draft-step'

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
  localStorage.removeItem('migracount:draft')
  localStorage.removeItem('migracount:draft-step')
}

export function hasSavedDraft(): boolean {
  return localStorage.getItem('migracount:draft') !== null
}

export function saveDraftStep(index: number): void {
  setJSON(DRAFT_STEP_KEY, index)
}

export function loadDraftStep(): number {
  if (!hasSavedDraft()) return 0
  return getJSON<number>(DRAFT_STEP_KEY, 0)
}

export function canSaveDraft(d: MigraineDraft): boolean {
  return Boolean(d.date) && Boolean(d.heureDebut)
}
