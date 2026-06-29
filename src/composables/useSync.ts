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
  registerMedocUsage,
  addMedocFavoriWithDetails,
  registerDeclencheur,
  addSymptomeCustom,
} from '../storage/migraineRepository'
import { getJSON, setJSON } from '../storage/storage'
import type { Migraine, MedocFavori } from '../types/migraine'
import type { RecordModel } from 'pocketbase'

const SETTINGS_KEY = 'settings'

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
      toastStore.add({ message: msg, type: 'success', persistent: false })
    }
    diffAccumulator = { migrainesAdded: [], migrainesModified: [], migrainesRemoved: [], catalogueItems: [] }
    flushTimer = null
  }, 300)
}

export function useSync() {
  async function _mergeAndToast(userId: string): Promise<void> {
    if (mergeInFlight) return
    mergeInFlight = true
    try {
      const beforeMigraines = listMigraines()
      const beforeMedocs = listMedocsFavoris()
      const beforeDecl = listDeclencheursFavoris()
      const beforeSympt = listSymptomesCustom()

      await Promise.all([
        _mergeMigraines(userId),
        _mergeMedocs(userId),
        _mergePreferences(userId),
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
        toastStore.add({ message: msg, type: 'success', persistent: false })
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

  async function _mergeMigraines(userId: string): Promise<void> {
    const remoteMigraines: RecordModel[] = await pb.collection('migraines').getFullList({
      filter: `userId="${userId}"`,
    })

    const localMigraines = listMigraines()
    const localMap = new Map(localMigraines.map((m) => [m.id, m]))
    const remoteMap = new Map(remoteMigraines.map((r) => [r['localId'] as string, r]))

    const allLocalIds = new Set([...localMap.keys(), ...remoteMap.keys()])
    const mergedLocally: Migraine[] = []
    const toUpload: Migraine[] = []

    for (const localId of allLocalIds) {
      const local = localMap.get(localId)
      const remote = remoteMap.get(localId)

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

    const localMap = new Map(localMedocs.map((f) => [f.nom, f]))
    const remoteMap = new Map(remoteMedocs.map((r) => [r['localId'] as string, r]))

    const allNoms = new Set([...localMap.keys(), ...remoteMap.keys()])
    const toUpload: MedocFavori[] = []

    for (const nom of allNoms) {
      const local = localMap.get(nom)
      const remote = remoteMap.get(nom)

      if (local && remote) {
        const mergedUsage = Math.max(local.usageCount, (remote['usageCount'] as number) ?? 0)
        if (local.usageCount < mergedUsage) {
          registerMedocUsage(nom, local.description)
        }
        toUpload.push({ ...local, usageCount: mergedUsage })
      } else if (local && !remote) {
        toUpload.push(local)
      } else if (!local && remote) {
        addMedocFavoriWithDetails({
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
        const remote = remoteMap.get(f.nom)
        const payload = {
          userId,
          localId: f.nom,
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

    const remoteDeclencheurs = (remotePrefs['declencheursFavoris'] as string[]) || []
    const remoteSymptomes = (remotePrefs['symptomesCustom'] as string[]) || []

    const mergedDeclencheurs = Array.from(new Set([...localDeclencheurs, ...remoteDeclencheurs]))
    const mergedSymptomes = Array.from(new Set([...localSymptomes, ...remoteSymptomes]))
    const mergedTheme = (remotePrefs['theme'] as string) || localSettings.theme
    const mergedFont = (remotePrefs['dyslexicFont'] as string) || localSettings.dyslexicFont

    setJSON(SETTINGS_KEY, { theme: mergedTheme, dyslexicFont: mergedFont })
    for (const tag of mergedDeclencheurs) registerDeclencheur(tag)
    for (const s of mergedSymptomes) addSymptomeCustom(s)

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
    const userId = pb.authStore.record!.id
    const migrainesStore = useMigrainesStore()
    const medocsStore = useMedocsFavorisStore()
    const declStore = useDeclencheursStore()
    const symptStore = useSymptomesStore()

    // Migraines
    const unsubMigraines = await pb.collection('migraines').subscribe('*', (e) => {
      if ((e.record['userId'] as string) !== userId) return
      if (e.action === 'create' || e.action === 'update') {
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
        const nom = e.record['nom'] as string
        const existing = listMedocsFavoris().find((f) => f.nom === nom)
        if (!existing) {
          addMedocFavoriWithDetails({
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
      const remoteDeclencheurs = (e.record['declencheursFavoris'] as string[]) || []
      const remoteSymptomes = (e.record['symptomesCustom'] as string[]) || []

      const localDecl = listDeclencheursFavoris()
      const localSympt = listSymptomesCustom()

      for (const d of remoteDeclencheurs) {
        if (!localDecl.includes(d)) {
          registerDeclencheur(d)
          diffAccumulator.catalogueItems.push(`Déclencheur « ${d} » ajouté`)
        }
      }
      for (const s of remoteSymptomes) {
        if (!localSympt.includes(s)) {
          addSymptomeCustom(s)
          diffAccumulator.catalogueItems.push(`Symptôme « ${s} » ajouté`)
        }
      }

      declStore.refresh()
      symptStore.refresh()
      if (diffAccumulator.catalogueItems.length > 0) scheduleFlushToasts()
    })

    realtimeUnsubscribers.push(unsubMigraines, unsubMedocs, unsubPrefs)
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
