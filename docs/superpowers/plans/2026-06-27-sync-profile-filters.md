# Sync multi-device, profil, auth header, filtres — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger la réactivité du bouton auth, améliorer le profil, étendre la sync realtime à toutes les collections avec toasts de diff, et moderniser les filtres de la liste.

**Architecture:** Fix de `isLoggedIn` via `user.value !== null` pour la réactivité Vue. Extraction d'un helper `syncDiff.ts` pour le calcul des diffs et la génération des toasts. Extension de `useSync.ts` pour couvrir `medocs_favoris` et `user_preferences` en realtime, avec `refreshFromRemote()` déclenché sur `visibilitychange`. Remplacement des `<input type="date">` natifs par `<DateField>` dans `ListView.vue`.

**Tech Stack:** Vue 3 (Composition API), Pinia, PocketBase SDK 0.27, Vitest, Vue Test Utils, TypeScript

## Global Constraints

- Vitest pour tous les tests ; commande : `npm run test` (`vitest run`)
- Pas de breaking change sur les types `Migraine`, `MedocFavori`
- localStorage reste la source de vérité locale ; PocketBase est la source distante
- Règle de merge en cas de conflit timestamp : `localUpdatedAt` gagne
- Les déclencheurs et symptômes custom sont stockés dans `user_preferences` (PocketBase), pas dans des collections dédiées
- Toast type : `'success' | 'pending'` (type Toast existant dans `src/stores/toast.ts`)

---

## Fichiers touchés

| Fichier | Action |
|---------|--------|
| `src/stores/auth.ts` | Modifier — fix `isLoggedIn` |
| `src/components/AuthButton.vue` | Modifier — style "Se connecter" |
| `src/views/ProfileView.vue` | Modifier — scroll + redesign card |
| `src/lib/syncDiff.ts` | Créer — helper pur : calcul diff + messages toast |
| `src/lib/syncDiff.test.ts` | Créer — tests unitaires du helper |
| `src/composables/useSync.ts` | Modifier — mergeOnLogin avec diff, realtime étendu, refreshFromRemote |
| `src/App.vue` | Modifier — `visibilitychange` → refreshFromRemote |
| `src/views/ListView.vue` | Modifier — DateField + label Rechercher |

---

## Task 1 : Fix réactivité `isLoggedIn` + bouton "Se connecter"

**Files:**
- Modify: `src/stores/auth.ts`
- Modify: `src/components/AuthButton.vue`

**Interfaces:**
- Produces: `authStore.isLoggedIn` réactif à `user.value !== null` — consommé par `AuthButton.vue`, `ProfileView.vue`, `useSync.ts`

- [ ] **Step 1 : Modifier `src/stores/auth.ts`**

Remplacer la ligne `isLoggedIn` :

```ts
// Avant
const isLoggedIn = computed(() => pb.authStore.isValid)

// Après
const isLoggedIn = computed(() => user.value !== null)
```

Fichier complet après modification :

```ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { pb } from '../lib/pocketbase'
import { clearPrefsCache } from '../lib/pbSync'
import type { RecordModel } from 'pocketbase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<RecordModel | null>(pb.authStore.record)
  const isLoggedIn = computed(() => user.value !== null)

  pb.authStore.onChange((_token, record) => {
    user.value = record as RecordModel | null
  })

  async function login(): Promise<void> {
    await pb.collection('users').authWithOAuth2({ provider: 'google' })
  }

  function logout(): void {
    clearPrefsCache()
    pb.authStore.clear()
  }

  return { user, isLoggedIn, login, logout }
})
```

- [ ] **Step 2 : Modifier `src/components/AuthButton.vue` — template**

Remplacer le bloc `<!-- Non connecté -->` :

```html
<!-- Non connecté -->
<button
  v-if="!authStore.isLoggedIn"
  type="button"
  class="auth-login-btn"
  :disabled="loading"
  :title="error ? error : 'Se connecter avec Google'"
  :aria-label="'Se connecter avec Google'"
  @click="handleLogin"
>
  <Loader2 v-if="loading" :size="14" class="spin" />
  <LogIn v-else :size="14" />
  Se connecter
</button>
```

Ajouter `LogIn` à l'import lucide (remplacer `Cloud, CloudOff, Loader2` par `LogIn, Loader2`) :

```ts
import { LogIn, Loader2 } from 'lucide-vue-next'
```

- [ ] **Step 3 : Modifier `src/components/AuthButton.vue` — styles**

Supprimer les styles `.icon-btn`, `.icon-btn--loading`, `.icon-error` de ce composant (ils ne servent plus pour ce bouton). Ajouter :

```css
.auth-login-btn {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border: none;
  border-radius: 0.5rem;
  padding: 0.4rem 0.85rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  transition: opacity 0.15s;
  white-space: nowrap;
}
.auth-login-btn:hover:not(:disabled) {
  opacity: 0.85;
}
.auth-login-btn:disabled {
  opacity: 0.6;
  cursor: default;
}
```

- [ ] **Step 4 : Vérifier visuellement**

Lancer `npm run dev`. Vérifier :
- Non connecté → bouton accent "Se connecter" avec icône LogIn
- Clic → spinner inline dans le bouton
- Connexion réussie → header passe IMMÉDIATEMENT en avatar sans reload
- Déconnexion (depuis le menu dropdown) → header repasse IMMÉDIATEMENT en "Se connecter" sans reload

- [ ] **Step 5 : Commit**

```bash
git add src/stores/auth.ts src/components/AuthButton.vue
git commit -m "fix: make isLoggedIn reactive and replace cloud icon with Se connecter button"
```

---

## Task 2 : Page Profil — scroll + redesign card-based

**Files:**
- Modify: `src/views/ProfileView.vue`

**Interfaces:**
- Consumes: `authStore.user`, `migrainesStore.migraines`, `medocsStore.favoris`, `averageIntensity()`
- Produces: page profil scrollable avec sections card

- [ ] **Step 1 : Réécrire `src/views/ProfileView.vue`**

```vue
<template>
  <div class="profile-view">
    <div class="profile-header">
      <div class="profile-avatar">{{ initial }}</div>
      <div class="profile-identity">
        <p class="profile-name">{{ displayName }}</p>
        <p class="profile-email">{{ user?.email }}</p>
        <p class="profile-since">Membre depuis {{ memberSince }}</p>
      </div>
    </div>

    <section class="profile-section">
      <h2 class="section-title">Statistiques</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">{{ migrainesStore.migraines.length }}</span>
          <span class="stat-label">Crises enregistrées</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ medocsStore.favoris.length }}</span>
          <span class="stat-label">Médicaments suivis</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ avgIntensity || '–' }}</span>
          <span class="stat-label">Intensité moyenne</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ migrainesThisMonth }}</span>
          <span class="stat-label">Ce mois-ci</span>
        </div>
      </div>
    </section>

    <section class="profile-section">
      <h2 class="section-title">Synchronisation</h2>
      <div class="sync-card">
        <div class="sync-status">
          <span class="sync-dot sync-dot--ok"></span>
          <span class="sync-label">Compte connecté</span>
        </div>
        <p class="sync-detail">Dernière mise à jour locale : {{ lastSync }}</p>
      </div>
    </section>

    <section class="profile-section danger-zone">
      <h2 class="section-title danger-title">Zone de danger</h2>
      <div class="danger-actions">
        <button type="button" class="btn-danger-outline" @click="showLogoutDialog = true">
          Se déconnecter
        </button>
        <button type="button" class="btn-danger-outline" @click="showDeleteStep1 = true">
          Supprimer mon compte
        </button>
      </div>
    </section>

    <ConfirmDialog
      v-if="showLogoutDialog"
      title="Se déconnecter"
      message="Êtes-vous sûr de vouloir vous déconnecter ? Vous perdrez la synchronisation avec le serveur."
      confirm-label="Se déconnecter"
      cancel-label="Annuler"
      @confirm="handleLogout"
      @cancel="showLogoutDialog = false"
      @dismiss="showLogoutDialog = false"
    />

    <ConfirmDialog
      v-if="showDeleteStep1"
      title="Supprimer mon compte ?"
      message="Cette action supprimera définitivement toutes vos données et votre compte. Cette opération est irréversible."
      confirm-label="Continuer"
      cancel-label="Annuler"
      @confirm="showDeleteStep1 = false; showDeleteStep2 = true"
      @cancel="showDeleteStep1 = false"
      @dismiss="showDeleteStep1 = false"
    />

    <DeleteAccountDialog
      v-if="showDeleteStep2"
      :deleting="deletingAccount"
      :error="deleteError"
      @confirm="handleDeleteAccount"
      @cancel="showDeleteStep2 = false"
      @dismiss="showDeleteStep2 = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSync } from '../composables/useSync'
import { useMigrainesStore } from '../stores/migraines'
import { useMedocsFavorisStore } from '../stores/medocsFavoris'
import { averageIntensity } from '../utils/stats'
import { deleteAccount } from '../lib/accountDeletion'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import DeleteAccountDialog from '../components/DeleteAccountDialog.vue'

const router = useRouter()
const authStore = useAuthStore()
const sync = useSync()
const migrainesStore = useMigrainesStore()
const medocsStore = useMedocsFavorisStore()

const user = computed(() => authStore.user)

const displayName = computed(() =>
  (user.value?.['name'] as string) || (user.value?.['email'] as string) || 'Utilisateur'
)
const initial = computed(() => (displayName.value || '?').charAt(0).toUpperCase())
const memberSince = computed(() => {
  if (!user.value?.created) return '–'
  return new Date(user.value?.created as string).toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
})
const avgIntensity = computed(() => averageIntensity(migrainesStore.migraines))
const lastSync = computed(() => {
  const latest = migrainesStore.migraines.reduce(
    (max, m) => (m.updatedAt > max ? m.updatedAt : max), ''
  )
  return latest ? new Date(latest).toLocaleDateString('fr-FR') : '–'
})
const migrainesThisMonth = computed(() => {
  const now = new Date()
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return migrainesStore.migraines.filter((m) => m.date.startsWith(prefix)).length
})

const showLogoutDialog = ref(false)
const showDeleteStep1 = ref(false)
const showDeleteStep2 = ref(false)
const deletingAccount = ref(false)
const deleteError = ref('')

async function handleLogout() {
  showLogoutDialog.value = false
  sync.stopRealtimeSync()
  authStore.logout()
  router.push({ name: 'stats' })
}

async function handleDeleteAccount() {
  deletingAccount.value = true
  deleteError.value = ''
  try {
    await deleteAccount()
    router.push({ name: 'stats' })
  } catch (e) {
    if (e instanceof Error && e.message === 'DATA_CLEARED_BUT_ACCOUNT_REMAINS') {
      deleteError.value = 'Vos données ont été effacées mais la suppression du compte a échoué. Contactez le support.'
    } else {
      deleteError.value = 'Une erreur est survenue. Veuillez réessayer.'
    }
  } finally {
    deletingAccount.value = false
  }
}
</script>

<style scoped>
.profile-view {
  padding: 1.5rem 1.25rem 2rem;
  max-width: 32rem;
  margin: 0 auto;
  overflow-y: auto;
  height: 100%;
  box-sizing: border-box;
}

.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem 0 1.75rem;
  text-align: center;
}

.profile-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.profile-identity {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.profile-name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text);
}

.profile-email {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-muted);
}

.profile-since {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-muted);
}

.profile-section {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-muted);
  margin: 0 0 0.75rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-muted);
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-accent);
  line-height: 1;
}

.stat-label {
  font-size: 0.78rem;
  color: var(--color-muted);
}

.sync-card {
  background: var(--color-surface);
  border: 1px solid var(--color-muted);
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.sync-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sync-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sync-dot--ok {
  background: #22c55e;
}

.sync-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
}

.sync-detail {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-muted);
}

.danger-title {
  color: var(--color-danger);
}

.danger-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.btn-danger-outline {
  display: inline-flex;
  align-items: center;
  padding: 0.65rem 1.25rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-danger);
  background: transparent;
  color: var(--color-danger);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-danger-outline:hover {
  background: color-mix(in srgb, var(--color-danger) 8%, transparent);
}
</style>
```

- [ ] **Step 2 : Vérifier visuellement**

Lancer `npm run dev`. Naviguer sur `/profil`. Vérifier :
- La page scrolle correctement sur petit écran
- L'avatar est centré en haut
- La grille de stats affiche 4 cards (crises, médocs, intensité moyenne, ce mois-ci)
- La section sync s'affiche
- La zone danger est en bas

- [ ] **Step 3 : Commit**

```bash
git add src/views/ProfileView.vue
git commit -m "feat: profile — scrollable layout and card-based redesign"
```

---

## Task 3 : Helper `syncDiff.ts` — calcul de diff et messages toast

**Files:**
- Create: `src/lib/syncDiff.ts`
- Create: `src/lib/syncDiff.test.ts`

**Interfaces:**
- Produces:
  - `computeMigrainesDiff(before: Migraine[], after: Migraine[]): MigrainesDiff`
  - `computeCatalogueDiff(beforeMedocs, afterMedocs, beforeDecl, afterDecl, beforeSympt, afterSympt): CatalogueDiff`
  - `buildSyncToasts(migrainesDiff: MigrainesDiff, catalogueDiff: CatalogueDiff): string[]`
- Consumes: `Migraine`, `MedocFavori` types de `../types/migraine`

- [ ] **Step 1 : Écrire les tests en premier** — `src/lib/syncDiff.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import {
  computeMigrainesDiff,
  computeCatalogueDiff,
  buildSyncToasts,
} from './syncDiff'
import type { Migraine, MedocFavori } from '../types/migraine'

function makeMigraine(id: string, date: string, updatedAt = '2024-01-01T00:00:00Z'): Migraine {
  return {
    id,
    date,
    heureDebut: '08:00',
    heureFin: null,
    medocs: [],
    intensite: 5,
    avortee: false,
    symptomes: [],
    zone: null,
    declencheurs: [],
    createdAt: updatedAt,
    updatedAt,
  }
}

describe('computeMigrainesDiff', () => {
  it('détecte les ajouts', () => {
    const before: Migraine[] = []
    const after = [makeMigraine('a', '2024-06-01')]
    const diff = computeMigrainesDiff(before, after)
    expect(diff.added).toHaveLength(1)
    expect(diff.added[0].id).toBe('a')
    expect(diff.modified).toHaveLength(0)
    expect(diff.removed).toHaveLength(0)
  })

  it('détecte les suppressions', () => {
    const before = [makeMigraine('a', '2024-06-01')]
    const after: Migraine[] = []
    const diff = computeMigrainesDiff(before, after)
    expect(diff.removed).toHaveLength(1)
    expect(diff.removed[0].id).toBe('a')
  })

  it('détecte les modifications (updatedAt plus récent)', () => {
    const before = [makeMigraine('a', '2024-06-01', '2024-01-01T00:00:00Z')]
    const after = [makeMigraine('a', '2024-06-01', '2024-06-01T12:00:00Z')]
    const diff = computeMigrainesDiff(before, after)
    expect(diff.modified).toHaveLength(1)
    expect(diff.modified[0].id).toBe('a')
  })

  it('ignore les enregistrements inchangés', () => {
    const m = makeMigraine('a', '2024-06-01')
    const diff = computeMigrainesDiff([m], [m])
    expect(diff.added).toHaveLength(0)
    expect(diff.modified).toHaveLength(0)
    expect(diff.removed).toHaveLength(0)
  })
})

describe('computeCatalogueDiff', () => {
  it('détecte un médoc ajouté', () => {
    const medoc: MedocFavori = { nom: 'Doliprane', usageCount: 1 }
    const diff = computeCatalogueDiff([], [medoc], [], [], [], [])
    expect(diff.total).toBe(1)
    expect(diff.items[0]).toContain('Doliprane')
  })

  it('détecte un déclencheur ajouté', () => {
    const diff = computeCatalogueDiff([], [], [], ['Stress'], [], [])
    expect(diff.total).toBe(1)
    expect(diff.items[0]).toContain('Stress')
  })

  it('détecte un symptôme ajouté', () => {
    const diff = computeCatalogueDiff([], [], [], [], [], ['Aura'])
    expect(diff.total).toBe(1)
    expect(diff.items[0]).toContain('Aura')
  })

  it('cumule plusieurs types', () => {
    const medoc: MedocFavori = { nom: 'Ibuprofène', usageCount: 1 }
    const diff = computeCatalogueDiff([], [medoc], [], ['Stress'], [], ['Aura'])
    expect(diff.total).toBe(3)
  })
})

describe('buildSyncToasts', () => {
  it('1 migraine ajoutée → toast individuel', () => {
    const migrainesDiff = {
      added: [makeMigraine('a', '2024-06-15')],
      modified: [],
      removed: [],
    }
    const catalogueDiff = { total: 0, items: [] }
    const msgs = buildSyncToasts(migrainesDiff, catalogueDiff)
    expect(msgs).toHaveLength(1)
    expect(msgs[0]).toContain('15/06/2024')
    expect(msgs[0]).toContain('ajoutée')
  })

  it('2 migraines modifiées → 2 toasts individuels', () => {
    const migrainesDiff = {
      added: [],
      modified: [makeMigraine('a', '2024-06-01'), makeMigraine('b', '2024-06-10')],
      removed: [],
    }
    const catalogueDiff = { total: 0, items: [] }
    const msgs = buildSyncToasts(migrainesDiff, catalogueDiff)
    expect(msgs).toHaveLength(2)
  })

  it('4 migraines → 1 toast récap', () => {
    const migrainesDiff = {
      added: [
        makeMigraine('a', '2024-06-01'),
        makeMigraine('b', '2024-06-02'),
        makeMigraine('c', '2024-06-03'),
        makeMigraine('d', '2024-06-04'),
      ],
      modified: [],
      removed: [],
    }
    const catalogueDiff = { total: 0, items: [] }
    const msgs = buildSyncToasts(migrainesDiff, catalogueDiff)
    expect(msgs).toHaveLength(1)
    expect(msgs[0]).toContain('4')
    expect(msgs[0]).toContain('migraine')
  })

  it('3 objets catalogue → 3 toasts individuels', () => {
    const migrainesDiff = { added: [], modified: [], removed: [] }
    const catalogueDiff = {
      total: 3,
      items: ['Doliprane ajouté', 'Stress ajouté', 'Aura ajoutée'],
    }
    const msgs = buildSyncToasts(migrainesDiff, catalogueDiff)
    expect(msgs).toHaveLength(3)
  })

  it('4 objets catalogue → 1 toast récap', () => {
    const migrainesDiff = { added: [], modified: [], removed: [] }
    const catalogueDiff = {
      total: 4,
      items: ['A', 'B', 'C', 'D'],
    }
    const msgs = buildSyncToasts(migrainesDiff, catalogueDiff)
    expect(msgs).toHaveLength(1)
    expect(msgs[0]).toContain('4')
  })

  it('aucun changement → tableau vide', () => {
    const migrainesDiff = { added: [], modified: [], removed: [] }
    const catalogueDiff = { total: 0, items: [] }
    const msgs = buildSyncToasts(migrainesDiff, catalogueDiff)
    expect(msgs).toHaveLength(0)
  })
})
```

- [ ] **Step 2 : Lancer les tests pour confirmer qu'ils échouent**

```bash
npm run test -- syncDiff
```

Résultat attendu : erreur `Cannot find module './syncDiff'`

- [ ] **Step 3 : Créer `src/lib/syncDiff.ts`**

```ts
import type { Migraine, MedocFavori } from '../types/migraine'

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
  beforeDecl: string[],
  afterDecl: string[],
  beforeSympt: string[],
  afterSympt: string[],
): CatalogueDiff {
  const items: string[] = []

  const beforeMedocSet = new Set(beforeMedocs.map((f) => f.nom))
  for (const m of afterMedocs) {
    if (!beforeMedocSet.has(m.nom)) items.push(`${m.nom} ajouté au catalogue`)
  }

  const beforeDeclSet = new Set(beforeDecl)
  for (const d of afterDecl) {
    if (!beforeDeclSet.has(d)) items.push(`Déclencheur « ${d} » ajouté`)
  }

  const beforeSymptSet = new Set(beforeSympt)
  for (const s of afterSympt) {
    if (!beforeSymptSet.has(s)) items.push(`Symptôme « ${s} » ajouté`)
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
```

- [ ] **Step 4 : Lancer les tests et vérifier qu'ils passent**

```bash
npm run test -- syncDiff
```

Résultat attendu : tous les tests PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/syncDiff.ts src/lib/syncDiff.test.ts
git commit -m "feat: add syncDiff helper for computing merge diffs and building toast messages"
```

---

## Task 4 : Sync étendue — mergeOnLogin avec diff, realtime medocs + prefs, refreshFromRemote, visibilitychange

**Files:**
- Modify: `src/composables/useSync.ts`
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: `computeMigrainesDiff`, `computeCatalogueDiff`, `buildSyncToasts` de `../lib/syncDiff`
- Consumes: `useToastStore` de `../stores/toast`
- Produces: `sync.refreshFromRemote()` — fetch + merge léger appelable depuis App.vue

**Note architecture :** `declencheurs_favoris` et `symptomes_custom` ne sont PAS des collections PocketBase séparées — ils sont stockés comme champs dans `user_preferences`. Le realtime sur `user_preferences` suffit pour capter leurs changements.

- [ ] **Step 1 : Réécrire `src/composables/useSync.ts`**

```ts
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
  addMedocFavori,
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
  async function mergeOnLogin(): Promise<void> {
    if (!pb.authStore.isValid) return
    const userId = pb.authStore.record!.id

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
    if (msgs.length > 0) {
      const toastStore = useToastStore()
      for (const msg of msgs) {
        toastStore.add({ message: msg, type: 'success', persistent: false })
      }
    }
  }

  async function refreshFromRemote(): Promise<void> {
    if (!pb.authStore.isValid) return
    const userId = pb.authStore.record!.id

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
    if (msgs.length > 0) {
      const toastStore = useToastStore()
      for (const msg of msgs) {
        toastStore.add({ message: msg, type: 'success', persistent: false })
      }
    }
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
        addMedocFavori(remote['nom'] as string, (remote['description'] as string) ?? undefined)
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
    settings.setTheme(mergedTheme as Parameters<typeof settings.setTheme>[0])
    settings.setDyslexicFont(mergedFont as Parameters<typeof settings.setDyslexicFont>[0])

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
        const description = (e.record['description'] as string) ?? undefined
        const existing = listMedocsFavoris().find((f) => f.nom === nom)
        if (!existing) {
          addMedocFavori(nom, description)
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
```

- [ ] **Step 2 : Ajouter le `visibilitychange` dans `src/App.vue`**

Dans le `<script setup>` de `App.vue`, ajouter après les imports existants :

```ts
import { onMounted, onUnmounted } from 'vue'
import { pb } from './lib/pocketbase'
import { useSync } from './composables/useSync'
```

(Note: `useSync` est déjà importé dans `AuthButton.vue` mais pas dans `App.vue` — l'ajouter ici.)

Après `useSettingsStore()`, ajouter :

```ts
const sync = useSync()

function onVisibilityChange() {
  if (document.visibilityState === 'visible' && pb.authStore.isValid) {
    sync.refreshFromRemote().catch(console.error)
  }
}

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
```

- [ ] **Step 3 : Lancer les tests complets**

```bash
npm run test
```

Résultat attendu : tous les tests existants PASS (le refactor de `useSync` ne touche pas les tests existants).

- [ ] **Step 4 : Tester manuellement la sync**

Lancer `npm run dev`. Se connecter sur deux onglets (ou deux navigateurs). Sur l'onglet A, ajouter une migraine. Passer sur l'onglet B. Vérifier :
- Un toast apparaît ("Migraine du JJ/MM/AAAA ajoutée depuis un autre appareil")
- La liste de l'onglet B se met à jour

Tester aussi en mettant l'onglet B en arrière-plan pendant l'ajout puis en y revenant → toast doit apparaître.

- [ ] **Step 5 : Commit**

```bash
git add src/composables/useSync.ts src/App.vue
git commit -m "feat: extend realtime sync to medocs and preferences, add refreshFromRemote on visibilitychange, toast diffs"
```

---

## Task 5 : Filtres ListView — DateField + label Rechercher

**Files:**
- Modify: `src/views/ListView.vue`

**Interfaces:**
- Consumes: `DateField` de `../components/DateField.vue` (composant existant, `v-model: string` ISO YYYY-MM-DD)

- [ ] **Step 1 : Modifier le template de `src/views/ListView.vue`**

Remplacer la section `<div class="filters">` par :

```html
<div class="filters">
  <div class="filter-field">
    <label class="filter-label" for="filter-keyword">Rechercher</label>
    <input
      id="filter-keyword"
      v-model="keyword"
      type="search"
      class="filter-input"
      placeholder="Médoc, note, symptôme, déclencheur, zone"
    />
  </div>
  <div class="date-range">
    <div class="date-range-field">
      <label class="date-range-label" @click="focusDu">Du</label>
      <div class="date-range-input-wrap">
        <DateField ref="duRef" v-model="dateFrom" />
        <button v-if="dateFrom" type="button" class="date-clear-btn" @click="dateFrom = ''">×</button>
      </div>
    </div>
    <div class="date-range-field">
      <label class="date-range-label" @click="focusAu">Au</label>
      <div class="date-range-input-wrap">
        <DateField ref="auRef" v-model="dateTo" />
        <button v-if="dateTo" type="button" class="date-clear-btn" @click="dateTo = ''">×</button>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2 : Modifier le `<script setup>` de `src/views/ListView.vue`**

Ajouter l'import `DateField` et les refs :

```ts
import { ref, computed } from 'vue'
import { useMigrainesStore } from '../stores/migraines'
import { filterMigraines } from '../utils/migraineFilters'
import MigraineListItem from '../components/MigraineListItem.vue'
import MigraineFormModal from '../components/MigraineForm/MigraineFormModal.vue'
import DateField from '../components/DateField.vue'
import { useToastStore } from '../stores/toast'

const migraines = useMigrainesStore()
const toastStore = useToastStore()
const editId = ref<string | null>(null)
const addFormOpen = ref(false)
const keyword = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const duRef = ref<InstanceType<typeof DateField> | null>(null)
const auRef = ref<InstanceType<typeof DateField> | null>(null)

function focusDu() {
  duRef.value?.$el?.querySelector('input')?.click()
}

function focusAu() {
  auRef.value?.$el?.querySelector('input')?.click()
}

// ... reste inchangé (sorted, filtered, resetFilters, onEditSaved, onAddSaved)
```

- [ ] **Step 3 : Modifier les styles de `src/views/ListView.vue`**

Ajouter les classes manquantes :

```css
.filter-field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1;
  min-width: 200px;
}

.filter-label {
  font-size: 0.7rem;
  color: var(--color-muted);
  font-weight: 500;
  cursor: default;
}
```

Modifier `.filter-input` pour retirer `flex: 1` et `min-width` (maintenant portés par `.filter-field`) :

```css
.filter-input {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.95rem;
  width: 100%;
  box-sizing: border-box;
}
```

Supprimer `.filter-input--date` (plus utilisé).

- [ ] **Step 4 : Vérifier visuellement**

Lancer `npm run dev`. Naviguer sur `/liste`. Vérifier :
- Le label "Rechercher" apparaît au-dessus de la barre de recherche
- Les labels "Du" et "Au" sont au-dessus des champs date
- Cliquer sur "Du" ou "Au" ouvre le calendrier custom
- Le calendrier custom fonctionne (sélection, navigation mois/année)
- Le bouton × efface la date

- [ ] **Step 5 : Lancer les tests**

```bash
npm run test
```

Résultat attendu : PASS (aucun test ne couvre ListView directement).

- [ ] **Step 6 : Commit**

```bash
git add src/views/ListView.vue
git commit -m "feat: replace native date inputs with DateField and add Rechercher label in filters"
```
