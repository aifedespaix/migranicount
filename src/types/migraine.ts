export interface MedocPris {
  id: string
  nom: string
  description?: string
  heure: string
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
  localisation: 'gauche' | 'droite' | 'bilaterale' | 'nuque' | null
  declencheurs: string[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface MedocFavori {
  nom: string
  description?: string
  usageCount: number
}
