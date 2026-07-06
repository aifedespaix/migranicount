import { pb } from '../lib/pocketbase'
import { remoteToMigraine, migraineToRemote, patchPreferences } from '../lib/pbSync'
import { useMigrainesStore } from '../stores/migraines'
import { useMedocsFavorisStore } from '../stores/medocsFavoris'
import { useDeclencheursStore } from '../stores/declencheurs'
import { useSymptomesStore } from '../stores/symptomes'
import { useSettingsStore } from '../stores/settings'
import { useToastStore } from '../stores/toast'
import {
  computeMigrainesDiff,
  computeCatalogueDiff,
  buildSyncToasts,
} from '../lib/syncDiff'
import {
  listMigraines,
  listMedocsFavoris,
  listDeclencheursFavoris,
  listSymptomesCustom,
  listTombstones,
  registerMedocUsage,
  addMedocFavoriWithDetails,
  setTreatmentPeriods,
} from '../storage/migraineRepository'
import { pushTombstone } from '../lib/pbSync'
import { processOutbox } from '../lib/syncOutbox'
import { mergeTreatmentPeriods } from '../lib/periodMerge'
import { mergeCatalogTags, normalizeCatalogTags, normalizeNom } from '../lib/catalogTags'
import { DEFAULT_SYMPTOMES, DEFAULT_DECLENCHEURS } from '../data/defaultTags'
import { getJSON, setJSON } from '../storage/storage'
import type { Migraine, MedocFavori, TreatmentPeriod } from '../types/migraine'
import type { Tombstone, TombstoneEntityType } from '../types/sync'
import type { RecordModel } from 'pocketbase'

const SETTINGS_KEY = 'settings'
const DECLENCHEURS_KEY = 'declencheursFavoris'
const SYMPTOMES_KEY = 'symptomesCustom'
const TOMBSTONES_KEY = 'tombstones'

function tombstonedIds(type: TombstoneEntityType): Set<string> {
  return new Set(listTombstones().filter((t) => t.entityType === type).map((t) => t.entityId))
}

let realtimeUnsubscribers: Array<() => void> = []
let diffAccumulator: {
  migrainesAdded: Migraine[]
  migrainesModified: Migraine[]
  migrainesRemoved: Migraine[]
  catalogueItems: string[]
} = { migrainesAdded: [], migrainesModified: [], migrainesRemoved: [], catalogueItems: [] }
let flushTimer: ReturnType<typeof setTimeout> | null = null
let mergeInFlight = false

function scheduleFlushToasts() {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    const toastStore = useToastStore()
    const migrainesDiff = {
      added: diffAccumulator.migrainesAdded,
      modified: diffAccumulator.migrainesModified,
      removed: diffAccumulator.migrainesRemoved,
    }
    const catalogueDiff = {
      total: diffAccumulator.catalogueItems.length,
      items: diffAccumulator.catalogueItems,
    }
    const msgs = buildSyncToasts(migrainesDiff, catalogueDiff)
    for (const msg of msgs) {
      toastStore.add({ message: msg, type: 'success' })
    }
    diffAccumulator = { migrainesAdded: [], migrainesModified: [], migrainesRemoved: [], catalogueItems: [] }
    flushTimer = null
  }, 300)
}

export function useSync() {
  const MERGE_STEP_LABELS = {
    tombstones: 'suppressions',
    migraines: 'migraines',
    medocs: 'médicaments favoris',
    preferences: 'préférences',
  } as const

  async function _runMergeStep(
    step: keyof typeof MERGE_STEP_LABELS,
    fn: () => Promise<void>,
    failedSteps: string[],
  ): Promise<void> {
    try {
      await fn()
    } catch (err) {
      console.error(`Sync: échec de la fusion (${step})`, err)
      failedSteps.push(MERGE_STEP_LABELS[step])
    }
  }

  async function _mergeAndToast(userId: string): Promise<void> {
    if (mergeInFlight) return
    mergeInFlight = true
    try {
      const beforeMigraines = listMigraines()
      const beforeMedocs = listMedocsFavoris()
      const beforeDecl = listDeclencheursFavoris()
      const beforeSympt = listSymptomesCustom()

      // Chaque étape est isolée : l'échec de l'une (ex. collection distante absente)
      // ne doit pas empêcher les autres de se synchroniser.
      const failedSteps: string[] = []
      await _runMergeStep('tombstones', () => _mergeTombstones(userId), failedSteps)
      await Promise.all([
        _runMergeStep('migraines', () => _mergeMigraines(userId), failedSteps),
        _runMergeStep('medocs', () => _mergeMedocs(userId), failedSteps),
        _runMergeStep('preferences', () => _mergePreferences(userId), failedSteps),
      ])

      useMigrainesStore().refresh()
      useMedocsFavorisStore().refresh()
      useDeclencheursStore().refresh()
      useSymptomesStore().refresh()

      const afterMigraines = listMigraines()
      const afterMedocs = listMedocsFavoris()
      const afterDecl = listDeclencheursFavoris()
      const afterSympt = listSymptomesCustom()

      const migrainesDiff = computeMigrainesDiff(beforeMigraines, afterMigraines)
      const catalogueDiff = computeCatalogueDiff(
        beforeMedocs, afterMedocs,
        beforeDecl, afterDecl,
        beforeSympt, afterSympt,
      )
      const msgs = buildSyncToasts(migrainesDiff, catalogueDiff)
      const toastStore = useToastStore()
      for (const msg of msgs) {
        toastStore.add({ message: msg, type: 'success' })
      }
      if (failedSteps.length > 0) {
        toastStore.add({
          message: `Échec de synchronisation (${failedSteps.join(', ')}). Réessayez plus tard.`,
          type: 'danger',
        })
      }
    } finally {
      mergeInFlight = false
    }
  }

  async function mergeOnLogin(): Promise<void> {
    if (!pb.authStore.isValid) return
    await _mergeAndToast(pb.authStore.record!.id)
  }

  async function refreshFromRemote(): Promise<void> {
    if (!pb.authStore.isValid) return
    await _mergeAndToast(pb.authStore.record!.id)
  }

  /** Fusionne les tombstones AVANT tout le reste : sans ça, un merge ne peut pas distinguer
   *  "jamais synchronisé" de "supprimé ailleurs pendant l'offline", et ressuscite les suppressions. */
  async function _mergeTombstones(userId: string): Promise<void> {
    const remote: RecordModel[] = await pb.collection('tombstones').getFullList({
      filter: `userId="${userId}"`,
    })
    const local = listTombstones()

    const map = new Map<string, Tombstone>()
    for (const t of local) map.set(`${t.entityType}:${t.entityId}`, t)
    for (const r of remote) {
      const key = `${r['entityType']}:${r['entityId']}`
      if (!map.has(key)) {
        map.set(key, {
          entityType: r['entityType'] as TombstoneEntityType,
          entityId: r['entityId'] as string,
          deletedAt: r['deletedAt'] as string,
        })
      }
    }
    setJSON(TOMBSTONES_KEY, Array.from(map.values()))

    const remoteKeys = new Set(remote.map((r) => `${r['entityType']}:${r['entityId']}`))
    const toUpload = local.filter((t) => !remoteKeys.has(`${t.entityType}:${t.entityId}`))
    await Promise.allSettled(toUpload.map((t) => pushTombstone(t)))
  }

  async function _mergeMigraines(userId: string): Promise<void> {
    const remoteMigraines: RecordModel[] = await pb.collection('migraines').getFullList({
      filter: `userId="${userId}"`,
    })

    const localMigraines = listMigraines()
    const localMap = new Map(localMigraines.map((m) => [m.id, m]))
    const remoteMap = new Map(remoteMigraines.map((r) => [r['localId'] as string, r]))
    const deletedIds = tombstonedIds('migraine')

    const allLocalIds = new Set([...localMap.keys(), ...remoteMap.keys()])
    const mergedLocally: Migraine[] = []
    const toUpload: Migraine[] = []

    for (const localId of allLocalIds) {
      const local = localMap.get(localId)
      const remote = remoteMap.get(localId)

      if (deletedIds.has(localId)) {
        // supprimée quelque part : jamais résurrectée, et on nettoie la copie distante orpheline
        if (remote) void pb.collection('migraines').delete(remote['id'] as string).catch(() => {})
        continue
      }

      if (local && remote) {
        const localDate = new Date(local.updatedAt).getTime()
        const remoteDate = new Date((remote['localUpdatedAt'] as string) || 0).getTime()
        const winner = localDate >= remoteDate ? local : remoteToMigraine(remote)
        mergedLocally.push(winner)
        if (localDate > remoteDate) toUpload.push(winner)
      } else if (local && !remote) {
        mergedLocally.push(local)
        toUpload.push(local)
      } else if (!local && remote) {
        mergedLocally.push(remoteToMigraine(remote))
      }
    }

    setJSON('migraines', mergedLocally)

    await Promise.allSettled(
      toUpload.map(async (m) => {
        const payload = { ...migraineToRemote(m), userId }
        const remote = remoteMap.get(m.id)
        if (remote) {
          await pb.collection('migraines').update(remote['id'] as string, payload)
        } else {
          await pb.collection('migraines').create(payload)
        }
      })
    )
  }

  async function _mergeMedocs(userId: string): Promise<void> {
    const remoteMedocs: RecordModel[] = await pb.collection('medocs_favoris').getFullList({
      filter: `userId="${userId}"`,
    })
    const localMedocs = listMedocsFavoris()

    const localMap = new Map(localMedocs.map((f) => [f.id, f]))
    const remoteMap = new Map(remoteMedocs.map((r) => [r['localId'] as string, r]))
    const deletedIds = tombstonedIds('medoc')

    const allIds = new Set([...localMap.keys(), ...remoteMap.keys()])
    const toUpload: MedocFavori[] = []

    for (const id of allIds) {
      const local = localMap.get(id)
      const remote = remoteMap.get(id)

      if (deletedIds.has(id)) {
        if (remote) void pb.collection('medocs_favoris').delete(remote['id'] as string).catch(() => {})
        continue
      }

      if (local && remote) {
        const mergedUsage = Math.max(local.usageCount, (remote['usageCount'] as number) ?? 0)
        if (local.usageCount < mergedUsage) {
          registerMedocUsage(local.nom, local.description)
        }

        const remotePeriods = (remote['treatmentPeriods'] as TreatmentPeriod[] | null) ?? []
        const mergedPeriods = mergeTreatmentPeriods(local.treatmentPeriods ?? [], remotePeriods)
        if (JSON.stringify(mergedPeriods) !== JSON.stringify(local.treatmentPeriods ?? [])) {
          setTreatmentPeriods(local.id, mergedPeriods)
        }

        toUpload.push({ ...local, usageCount: mergedUsage, treatmentPeriods: mergedPeriods })
      } else if (local && !remote) {
        toUpload.push(local)
      } else if (!local && remote) {
        addMedocFavoriWithDetails({
          id,
          nom: remote['nom'] as string,
          description: (remote['description'] as string) ?? undefined,
          posologieParJour: (remote['posologieParJour'] as number) ?? undefined,
          intervalleHeures: (remote['intervalleHeures'] as number) ?? undefined,
          isLongTermTreatment: (remote['isLongTermTreatment'] as boolean) ?? undefined,
          treatmentPeriods: (remote['treatmentPeriods'] as any) ?? undefined,
          sideEffects: (remote['sideEffects'] as string) ?? undefined,
          expectedEffects: (remote['expectedEffects'] as string) ?? undefined,
        })
      }
    }

    await Promise.allSettled(
      toUpload.map(async (f) => {
        const remote = remoteMap.get(f.id)
        const payload = {
          userId,
          localId: f.id,
          nom: f.nom,
          description: f.description ?? null,
          usageCount: f.usageCount,
          posologieParJour: f.posologieParJour ?? null,
          intervalleHeures: f.intervalleHeures ?? null,
          isLongTermTreatment: f.isLongTermTreatment ?? null,
          treatmentPeriods: f.treatmentPeriods ?? null,
          sideEffects: f.sideEffects ?? null,
          expectedEffects: f.expectedEffects ?? null,
        }
        if (remote) {
          await pb.collection('medocs_favoris').update(remote['id'] as string, payload)
        } else {
          await pb.collection('medocs_favoris').create(payload)
        }
      })
    )
  }

  async function _mergePreferences(userId: string): Promise<void> {
    let remotePrefs: RecordModel | null = null
    try {
      remotePrefs = await pb.collection('user_preferences').getFirstListItem(`userId="${userId}"`)
    } catch {
      // no remote prefs yet
    }

    const localDeclencheurs = listDeclencheursFavoris()
    const localSymptomes = listSymptomesCustom()
    const localSettings = getJSON<{ theme: string; dyslexicFont: string }>(SETTINGS_KEY, {
      theme: 'auto',
      dyslexicFont: 'none',
    })

    if (!remotePrefs) {
      await patchPreferences({
        declencheursFavoris: localDeclencheurs,
        symptomesCustom: localSymptomes,
        theme: localSettings.theme,
        dyslexicFont: localSettings.dyslexicFont,
      })
      return
    }

    const deletedDeclIds = tombstonedIds('declencheur')
    const deletedSymptIds = tombstonedIds('symptome')
    // normalizeCatalogTags absorbe l'ancien format distant (strings, entrées sans id/nom)
    // et mergeCatalogTags dédoublonne par nom : sans ça, chaque appareil ayant minté ses
    // propres ids à la migration v4 crée des doublons à chaque merge.
    const remoteDeclencheurs = normalizeCatalogTags(remotePrefs['declencheursFavoris'])
      .filter((d) => !deletedDeclIds.has(d.id))
    const remoteSymptomes = normalizeCatalogTags(remotePrefs['symptomesCustom'])
      .filter((s) => !deletedSymptIds.has(s.id))

    const mergedDeclencheurs = mergeCatalogTags(localDeclencheurs, remoteDeclencheurs, DEFAULT_DECLENCHEURS)
      .filter((d) => !deletedDeclIds.has(d.id))
    const mergedSymptomes = mergeCatalogTags(localSymptomes, remoteSymptomes, DEFAULT_SYMPTOMES)
      .filter((s) => !deletedSymptIds.has(s.id))
    const mergedTheme = (remotePrefs['theme'] as string) || localSettings.theme
    const mergedFont = (remotePrefs['dyslexicFont'] as string) || localSettings.dyslexicFont

    setJSON(SETTINGS_KEY, { theme: mergedTheme, dyslexicFont: mergedFont })
    setJSON(DECLENCHEURS_KEY, mergedDeclencheurs)
    setJSON(SYMPTOMES_KEY, mergedSymptomes)

    const settings = useSettingsStore()
    settings.applyFromSync(
      mergedTheme as Parameters<typeof settings.setTheme>[0],
      mergedFont as Parameters<typeof settings.setDyslexicFont>[0],
    )

    await patchPreferences({
      declencheursFavoris: mergedDeclencheurs,
      symptomesCustom: mergedSymptomes,
      theme: mergedTheme,
      dyslexicFont: mergedFont,
    })
  }

  async function startRealtimeSync(): Promise<void> {
    if (!pb.authStore.isValid) return
    void processOutbox()
    const userId = pb.authStore.record!.id
    const migrainesStore = useMigrainesStore()
    const medocsStore = useMedocsFavorisStore()
    const declStore = useDeclencheursStore()
    const symptStore = useSymptomesStore()

    // Migraines
    const unsubMigraines = await pb.collection('migraines').subscribe('*', (e) => {
      if ((e.record['userId'] as string) !== userId) return
      if (e.action === 'create' || e.action === 'update') {
        if (tombstonedIds('migraine').has(e.record['localId'] as string)) return
        const incoming = remoteToMigraine(e.record as unknown as Record<string, unknown>)
        const existing = migrainesStore.getById(incoming.id)
        if (!existing || new Date(incoming.updatedAt) > new Date(existing.updatedAt)) {
          const all = listMigraines()
          const idx = all.findIndex((m) => m.id === incoming.id)
          const isNew = idx < 0
          if (isNew) {
            all.push(incoming)
            diffAccumulator.migrainesAdded.push(incoming)
          } else {
            all[idx] = incoming
            diffAccumulator.migrainesModified.push(incoming)
          }
          setJSON('migraines', all)
          migrainesStore.refresh()
          scheduleFlushToasts()
        }
      } else if (e.action === 'delete') {
        const localId = e.record['localId'] as string
        const removed = listMigraines().find((m) => m.id === localId)
        if (removed) diffAccumulator.migrainesRemoved.push(removed)
        setJSON('migraines', listMigraines().filter((m) => m.id !== localId))
        migrainesStore.refresh()
        scheduleFlushToasts()
      }
    })

    // Médocs favoris
    const unsubMedocs = await pb.collection('medocs_favoris').subscribe('*', (e) => {
      if ((e.record['userId'] as string) !== userId) return
      if (e.action === 'create' || e.action === 'update') {
        const id = e.record['localId'] as string
        if (tombstonedIds('medoc').has(id)) return
        const nom = e.record['nom'] as string
        const existing = listMedocsFavoris().find((f) => f.id === id)
        if (!existing) {
          addMedocFavoriWithDetails({
            id,
            nom,
            description: (e.record['description'] as string) ?? undefined,
            posologieParJour: (e.record['posologieParJour'] as number) ?? undefined,
            intervalleHeures: (e.record['intervalleHeures'] as number) ?? undefined,
            isLongTermTreatment: (e.record['isLongTermTreatment'] as boolean) ?? undefined,
            treatmentPeriods: (e.record['treatmentPeriods'] as any) ?? undefined,
            sideEffects: (e.record['sideEffects'] as string) ?? undefined,
            expectedEffects: (e.record['expectedEffects'] as string) ?? undefined,
          })
          diffAccumulator.catalogueItems.push(`${nom} ajouté au catalogue`)
          medocsStore.refresh()
          scheduleFlushToasts()
        }
      }
    })

    // Préférences (déclencheurs + symptômes)
    const unsubPrefs = await pb.collection('user_preferences').subscribe('*', (e) => {
      if ((e.record['userId'] as string) !== userId) return
      const deletedDeclIds = tombstonedIds('declencheur')
      const deletedSymptIds = tombstonedIds('symptome')
      const remoteDeclencheurs = normalizeCatalogTags(e.record['declencheursFavoris'])
        .filter((d) => !deletedDeclIds.has(d.id))
      const remoteSymptomes = normalizeCatalogTags(e.record['symptomesCustom'])
        .filter((s) => !deletedSymptIds.has(s.id))

      const localDecl = listDeclencheursFavoris()
      const localSympt = listSymptomesCustom()
      const localDeclIds = new Set(localDecl.map((d) => d.id))
      const localSymptIds = new Set(localSympt.map((s) => s.id))
      // Dédoublonnage par nom en plus de l'id : un même tag peut exister sous un autre id
      // sur l'autre appareil (ids mintés indépendamment à la migration v4).
      const localDeclNoms = new Set([...DEFAULT_DECLENCHEURS, ...localDecl].map((d) => normalizeNom(d.nom)))
      const localSymptNoms = new Set([...DEFAULT_SYMPTOMES, ...localSympt].map((s) => normalizeNom(s.nom)))

      const mergedDecl = [...localDecl]
      for (const d of remoteDeclencheurs) {
        if (!localDeclIds.has(d.id) && !localDeclNoms.has(normalizeNom(d.nom))) {
          mergedDecl.push(d)
          localDeclNoms.add(normalizeNom(d.nom))
          diffAccumulator.catalogueItems.push(`Déclencheur « ${d.nom} » ajouté`)
        }
      }
      const mergedSympt = [...localSympt]
      for (const s of remoteSymptomes) {
        if (!localSymptIds.has(s.id) && !localSymptNoms.has(normalizeNom(s.nom))) {
          mergedSympt.push(s)
          localSymptNoms.add(normalizeNom(s.nom))
          diffAccumulator.catalogueItems.push(`Symptôme « ${s.nom} » ajouté`)
        }
      }
      if (mergedDecl.length !== localDecl.length) setJSON(DECLENCHEURS_KEY, mergedDecl)
      if (mergedSympt.length !== localSympt.length) setJSON(SYMPTOMES_KEY, mergedSympt)

      declStore.refresh()
      symptStore.refresh()
      if (diffAccumulator.catalogueItems.length > 0) scheduleFlushToasts()
    })

    // Tombstones : propage immédiatement une suppression faite sur un autre appareil,
    // sans attendre le prochain merge complet au login/reconnexion.
    const unsubTombstones = await pb.collection('tombstones').subscribe('*', (e) => {
      if ((e.record['userId'] as string) !== userId) return
      if (e.action !== 'create') return
      const entityType = e.record['entityType'] as TombstoneEntityType
      const entityId = e.record['entityId'] as string
      const deletedAt = e.record['deletedAt'] as string

      const local = listTombstones()
      if (!local.some((t) => t.entityType === entityType && t.entityId === entityId)) {
        setJSON(TOMBSTONES_KEY, [...local, { entityType, entityId, deletedAt }])
      }

      if (entityType === 'migraine') {
        setJSON('migraines', listMigraines().filter((m) => m.id !== entityId))
        migrainesStore.refresh()
      } else if (entityType === 'medoc') {
        setJSON('medocsFavoris', listMedocsFavoris().filter((f) => f.id !== entityId))
        medocsStore.refresh()
      } else if (entityType === 'declencheur') {
        setJSON(DECLENCHEURS_KEY, listDeclencheursFavoris().filter((d) => d.id !== entityId))
        declStore.refresh()
      } else if (entityType === 'symptome') {
        setJSON(SYMPTOMES_KEY, listSymptomesCustom().filter((s) => s.id !== entityId))
        symptStore.refresh()
      }
    })

    realtimeUnsubscribers.push(unsubMigraines, unsubMedocs, unsubPrefs, unsubTombstones)
  }

  function stopRealtimeSync(): void {
    realtimeUnsubscribers.forEach((fn) => fn())
    realtimeUnsubscribers = []
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
    diffAccumulator = { migrainesAdded: [], migrainesModified: [], migrainesRemoved: [], catalogueItems: [] }
  }

  return { mergeOnLogin, refreshFromRemote, startRealtimeSync, stopRealtimeSync }
}
