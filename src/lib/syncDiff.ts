import type { Migraine, MedocFavori, CatalogTag } from '../types/migraine'

export interface MigrainesDiff {
  added: Migraine[]
  modified: Migraine[]
  removed: Migraine[]
}

export interface CatalogueDiff {
  total: number
  items: string[]
}

export function computeMigrainesDiff(before: Migraine[], after: Migraine[]): MigrainesDiff {
  const beforeMap = new Map(before.map((m) => [m.id, m]))
  const afterMap = new Map(after.map((m) => [m.id, m]))

  const added: Migraine[] = []
  const modified: Migraine[] = []
  const removed: Migraine[] = []

  for (const [id, m] of afterMap) {
    const prev = beforeMap.get(id)
    if (!prev) {
      added.push(m)
    } else if (m.updatedAt !== prev.updatedAt) {
      modified.push(m)
    }
  }

  for (const [id, m] of beforeMap) {
    if (!afterMap.has(id)) removed.push(m)
  }

  return { added, modified, removed }
}

export function computeCatalogueDiff(
  beforeMedocs: MedocFavori[],
  afterMedocs: MedocFavori[],
  beforeDecl: CatalogTag[],
  afterDecl: CatalogTag[],
  beforeSympt: CatalogTag[],
  afterSympt: CatalogTag[],
): CatalogueDiff {
  const items: string[] = []

  const beforeMedocSet = new Set(beforeMedocs.map((f) => f.id))
  for (const m of afterMedocs) {
    if (!beforeMedocSet.has(m.id)) items.push(`${m.nom} ajouté au catalogue`)
  }

  const beforeDeclSet = new Set(beforeDecl.map((d) => d.id))
  for (const d of afterDecl) {
    if (!beforeDeclSet.has(d.id)) items.push(`Déclencheur « ${d.nom} » ajouté`)
  }

  const beforeSymptSet = new Set(beforeSympt.map((s) => s.id))
  for (const s of afterSympt) {
    if (!beforeSymptSet.has(s.id)) items.push(`Symptôme « ${s.nom} » ajouté`)
  }

  return { total: items.length, items }
}

function formatMigraineDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR')
}

export function buildSyncToasts(migrainesDiff: MigrainesDiff, catalogueDiff: CatalogueDiff): string[] {
  const msgs: string[] = []

  const totalMigraines =
    migrainesDiff.added.length + migrainesDiff.modified.length + migrainesDiff.removed.length

  if (totalMigraines > 0 && totalMigraines <= 3) {
    for (const m of migrainesDiff.added) {
      msgs.push(`Migraine du ${formatMigraineDate(m.date)} ajoutée depuis un autre appareil`)
    }
    for (const m of migrainesDiff.modified) {
      msgs.push(`Migraine du ${formatMigraineDate(m.date)} mise à jour depuis un autre appareil`)
    }
    for (const m of migrainesDiff.removed) {
      msgs.push(`Migraine du ${formatMigraineDate(m.date)} supprimée depuis un autre appareil`)
    }
  } else if (totalMigraines > 3) {
    msgs.push(`${totalMigraines} migraines synchronisées depuis un autre appareil`)
  }

  if (catalogueDiff.total > 0 && catalogueDiff.total <= 3) {
    msgs.push(...catalogueDiff.items)
  } else if (catalogueDiff.total > 3) {
    msgs.push(`${catalogueDiff.total} éléments du catalogue synchronisés`)
  }

  return msgs
}
