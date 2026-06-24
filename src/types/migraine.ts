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
  avortee: boolean
  nausee: boolean
  vomissement: boolean
  aura: boolean
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
