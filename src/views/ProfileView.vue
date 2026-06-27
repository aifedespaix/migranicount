<template>
  <div class="profile-view">
    <h1>Mon profil</h1>

    <section>
      <h2>Mon compte</h2>
      <div class="profile-avatar">{{ initial }}</div>
      <dl class="profile-info">
        <dt>Nom</dt><dd>{{ displayName }}</dd>
        <dt>E-mail</dt><dd>{{ user?.email }}</dd>
        <dt>Membre depuis</dt><dd>{{ memberSince }}</dd>
      </dl>
    </section>

    <section>
      <h2>Statistiques</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">{{ migrainesStore.migraines.length }}</span>
          <span class="stat-label">Crises enregistrees</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ medocsStore.favoris.length }}</span>
          <span class="stat-label">Medicaments suivis</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ avgIntensity || '-' }}</span>
          <span class="stat-label">Intensite moyenne</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ lastSync }}</span>
          <span class="stat-label">Derniere mise a jour locale</span>
        </div>
      </div>
    </section>

    <section class="danger-zone">
      <h2>Zone de danger</h2>
      <div class="danger-actions">
        <button type="button" class="btn-danger-outline" @click="showLogoutDialog = true">
          Se deconnecter
        </button>
        <button type="button" class="btn-danger-outline" @click="showDeleteStep1 = true">
          Supprimer mon compte
        </button>
      </div>
    </section>

    <ConfirmDialog
      v-if="showLogoutDialog"
      title="Se deconnecter"
      message="Etes-vous sur de vouloir vous deconnecter ? Vous perdrez la synchronisation avec le serveur."
      confirm-label="Se deconnecter"
      cancel-label="Annuler"
      @confirm="handleLogout"
      @cancel="showLogoutDialog = false"
      @dismiss="showLogoutDialog = false"
    />

    <ConfirmDialog
      v-if="showDeleteStep1"
      title="Supprimer mon compte ?"
      message="Cette action supprimera definitivement toutes vos donnees et votre compte. Cette operation est irreversible."
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
    year: 'numeric', month: 'long', day: 'numeric'
  })
})
const avgIntensity = computed(() => averageIntensity(migrainesStore.migraines))
const lastSync = computed(() => {
  const latest = migrainesStore.migraines.reduce(
    (max, m) => (m.updatedAt > max ? m.updatedAt : max), ''
  )
  return latest ? new Date(latest).toLocaleDateString('fr-FR') : '–'
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
      deleteError.value = 'Vos donnees ont ete effacees mais la suppression du compte a echoue. Contactez le support.'
    } else {
      deleteError.value = 'Une erreur est survenue. Veuillez reessayer.'
    }
  } finally {
    deletingAccount.value = false
  }
}
</script>

<style scoped>
.profile-view {
  padding: 1.25rem 1.5rem;
  max-width: 32rem;
  margin: 0 auto;
}
.profile-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}
.profile-info {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 1rem;
  margin: 0;
}
.profile-info dt {
  color: var(--color-muted);
  font-size: 0.875rem;
}
.profile-info dd {
  margin: 0;
  font-size: 0.875rem;
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
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-accent);
}
.stat-label {
  font-size: 0.8rem;
  color: var(--color-muted);
}
.danger-zone h2 {
  color: var(--color-danger);
}
.danger-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 24rem;
}
.btn-danger-outline {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
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
