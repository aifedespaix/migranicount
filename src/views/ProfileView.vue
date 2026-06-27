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
