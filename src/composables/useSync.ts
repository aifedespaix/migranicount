import { pb } from '../lib/pocketbase'
import { remoteToMigraine, migraineToRemote, patchPreferences } from '../lib/pbSync'
import { useMigrainesStore } from '../stores/migraines'
import { useMedocsFavorisStore } from '../stores/medocsFavoris'
import { useDeclencheursStore } from '../stores/declencheurs'
import { useSymptomesStore } from '../stores/symptomes'
import { useSettingsStore } from '../stores/settings'
import {
  listMigraines,
  listMedocsFavoris,
  listDeclencheursFavoris,
  listSymptomesCustom,
  registerMedocUsage,
  addMedocFavori,
  registerDeclencheur,
  addSymptomeCustom,
} from '../storage/migraineRepository'
import { getJSON, setJSON } from '../storage/storage'
import type { Migraine, MedocFavori } from '../types/migraine'
import type { RecordModel } from 'pocketbase'

const SETTINGS_KEY = 'settings'

let realtimeUnsubscribers: Array<() => void> = []

export function useSync() {
  async function mergeOnLogin(): Promise<void> {
    if (!pb.authStore.isValid) return
    const userId = pb.authStore.record!.id

    await Promise.all([
      _mergeMigraines(userId),
      _mergeMedocs(userId),
      _mergePreferences(userId),
    ])

    // Refresh all stores from updated localStorage
    useMigrainesStore().refresh()
    useMedocsFavorisStore().refresh()
    useDeclencheursStore().refresh()
    useSymptomesStore().refresh()
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
        if (localDate > remoteDate) {
          toUpload.push(winner)
        }
      } else if (local && !remote) {
        mergedLocally.push(local)
        toUpload.push(local)
      } else if (!local && remote) {
        mergedLocally.push(remoteToMigraine(remote))
      }
    }

    // Write merged data directly to localStorage
    setJSON('migraines', mergedLocally)

    // Push local-only and local-winner records to PocketBase
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
          // Remote had higher usage — update local
          registerMedocUsage(nom, local.description)
        }
        // If local usage was lower, it's been bumped; if higher it stays. Either way push.
        toUpload.push({ ...local, usageCount: mergedUsage })
      } else if (local && !remote) {
        toUpload.push(local)
      } else if (!local && remote) {
        addMedocFavori(remote['nom'] as string, (remote['description'] as string) ?? undefined)
      }
    }

    // Push local-winner / local-only records
    await Promise.allSettled(
      toUpload.map(async (f) => {
        const remote = remoteMap.get(f.nom)
        const payload = {
          userId,
          localId: f.nom,
          nom: f.nom,
          description: f.description ?? null,
          usageCount: f.usageCount,
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
      // no remote prefs yet — we'll create them
    }

    const localDeclencheurs = listDeclencheursFavoris()
    const localSymptomes = listSymptomesCustom()
    const localSettings = getJSON<{ theme: string; dyslexicFont: string }>(SETTINGS_KEY, {
      theme: 'auto',
      dyslexicFont: 'none',
    })

    if (!remotePrefs) {
      // Push local to remote
      await patchPreferences({
        declencheursFavoris: localDeclencheurs,
        symptomesCustom: localSymptomes,
        theme: localSettings.theme,
        dyslexicFont: localSettings.dyslexicFont,
      })
      return
    }

    // Merge: union for arrays, remote wins for theme/font
    const remoteDeclencheurs = (remotePrefs['declencheursFavoris'] as string[]) || []
    const remoteSymptomes = (remotePrefs['symptomesCustom'] as string[]) || []

    const mergedDeclencheurs = Array.from(new Set([...localDeclencheurs, ...remoteDeclencheurs]))
    const mergedSymptomes = Array.from(new Set([...localSymptomes, ...remoteSymptomes]))
    const mergedTheme = (remotePrefs['theme'] as string) || localSettings.theme
    const mergedFont = (remotePrefs['dyslexicFont'] as string) || localSettings.dyslexicFont

    // Write merged values to localStorage
    setJSON(SETTINGS_KEY, { theme: mergedTheme, dyslexicFont: mergedFont })
    for (const tag of mergedDeclencheurs) registerDeclencheur(tag)
    for (const s of mergedSymptomes) addSymptomeCustom(s)

    // Update the settings store live
    const settings = useSettingsStore()
    settings.setTheme(mergedTheme as Parameters<typeof settings.setTheme>[0])
    settings.setDyslexicFont(mergedFont as Parameters<typeof settings.setDyslexicFont>[0])

    // Push merged back to remote
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

    const unsub = await pb.collection('migraines').subscribe(
      '*',
      (e) => {
        if ((e.record['userId'] as string) !== userId) return
        if (e.action === 'create' || e.action === 'update') {
          const incoming = remoteToMigraine(e.record as unknown as Record<string, unknown>)
          const existing = migrainesStore.getById(incoming.id)
          if (!existing || new Date(incoming.updatedAt) > new Date(existing.updatedAt)) {
            const all = listMigraines()
            const idx = all.findIndex((m) => m.id === incoming.id)
            if (idx >= 0) {
              all[idx] = incoming
            } else {
              all.push(incoming)
            }
            setJSON('migraines', all)
            migrainesStore.refresh()
          }
        } else if (e.action === 'delete') {
          const localId = e.record['localId'] as string
          setJSON('migraines', listMigraines().filter((m) => m.id !== localId))
          migrainesStore.refresh()
        }
      }
    )

    realtimeUnsubscribers.push(unsub)
  }

  function stopRealtimeSync(): void {
    realtimeUnsubscribers.forEach((fn) => fn())
    realtimeUnsubscribers = []
  }

  return { mergeOnLogin, startRealtimeSync, stopRealtimeSync }
}
