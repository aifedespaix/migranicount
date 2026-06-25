# Feedbacks Utilisateur — Toasts

Domaine 3 sur 6 du lot d'améliorations UI/UX (Formulaire/Modale → Médicaments → **Toasts** → Layout Global → Graphiques → Correctif PWA).

## Goals

- Afficher un toast de succès vert lors d'une sauvegarde réussie ("Migraine enregistrée !").
- Afficher un toast persistant "Brouillon en attente" lorsque l'utilisateur ferme la modale de saisie sans enregistrer, avec un bouton "Reprendre" qui rouvre directement la modale.

## Architecture

### Toast store — `src/stores/toast.ts`

Pinia store suivant la convention existante (`defineStore`, `ref`, pas de `state` objet).

```ts
interface Toast {
  id: string
  message: string
  type: 'success' | 'pending'
  persistent: boolean
  action?: { label: string; handler: () => void }
}
```

- `toasts: Ref<Toast[]>` — liste réactive.
- `add(opts: Omit<Toast, 'id'>): string` — ajoute un toast, retourne l'id. Si `persistent === false`, programme un `setTimeout(3000)` pour appeler `remove(id)`.
- `remove(id: string): void` — retire le toast correspondant.

### ToastContainer.vue — `src/components/ToastContainer.vue`

Composant présentationnel rendu dans `App.vue` au-dessus de tout (z-index: 100, supérieur aux modales à z-60).

- Position fixe : haut-centre sur mobile, haut-droite sur desktop.
- Chaque toast : pill avec icône (✓ pour success, ⏳ pour pending), message, bouton action si présent, bouton × pour dismisser.
- Entrée/sortie : `<TransitionGroup name="toast">` avec slide-down + fade.
- Les toasts success disparaissent automatiquement (géré par le store, pas par le composant).

### Wiring dans App.vue

Seule la modale de saisie créée depuis `App.vue` (sans `editId`) est concernée par le toast "Brouillon en attente" — les modales d'édition de `ListView`/`StatsView` n'ont pas de draft.

```
openForm()         → retire le toast pending existant → formOpen = true
onFormSaved()      → retire le toast pending existant → success toast → formOpen = false
onFormClose()      → formOpen = false → ajoute toast pending avec action "Reprendre" → openForm
```

`pendingDraftToastId: Ref<string | null>` dans App.vue mémorise l'id du toast pending pour pouvoir le retirer.

Les modales d'édition (`ListView`, `StatsView`) émettent aussi `@saved` → chacune appelle `useToastStore().add(...)` pour le toast succès (pas de toast pending pour les éditions).

## Tests

- `src/stores/toast.test.ts` (TDD) : add/remove, auto-dismiss (vi.useFakeTimers), persistent ne se retire pas automatiquement.
- `ToastContainer.vue` : pas de test unitaire (convention existante — zéro tests sur les .vue).

## Out of scope

- Pas de toast d'erreur pour cette itération.
- Pas de toast dans les vues Liste/Stats pour les suppressions ou annulations.
- Pas de toast lorsque l'utilisateur ouvre la modale de création et qu'un brouillon existe déjà (le brouillon est chargé silencieusement comme actuellement).
