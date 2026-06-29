export interface MedocPris {
  id: string
  nom: string
  description?: string
  heure: string
  posologieParJour?: number
  intervalleHeures?: number
}

export interface Migraine {
  id: string
  date: string
  heureDebut: string
  heureFin: string | null
  medocs: MedocPris[]
  intensite: number
  avortee: boolean | 'probable'
  symptomes: string[]
  /** @deprecated remplacé par symptomes */
  nausee?: boolean
  /** @deprecated remplacé par symptomes */
  vomissement?: boolean
  /** @deprecated remplacé par symptomes */
  aura?: boolean
  zone: 'gauche' | 'droite' | 'bilaterale' | 'nuque' | null
  declencheurs: string[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface TreatmentPeriod {
  startDate: string
  endDate: string | null
}

export interface MedocFavori {
  nom: string
  description?: string
  usageCount: number
  posologieParJour?: number
  intervalleHeures?: number
  isLongTermTreatment?: boolean
  treatmentPeriods?: TreatmentPeriod[]
  sideEffects?: string
  expectedEffects?: string
}
