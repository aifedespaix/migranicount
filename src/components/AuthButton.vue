<template>
  <div ref="wrapperRef" class="auth-wrapper">
    <!-- Non connecté -->
    <button
      v-if="!authStore.isLoggedIn"
      type="button"
      class="icon-btn"
      :class="{ 'icon-btn--loading': loading }"
      :title="error ? error : 'Synchroniser avec un compte'"
      :aria-label="'Connexion Google'"
      :disabled="loading"
      @click="handleLogin"
    >
      <Loader2 v-if="loading" :size="18" class="spin" />
      <CloudOff v-else-if="error" :size="18" class="icon-error" />
      <Cloud v-else :size="18" />
    </button>

    <!-- Connecté -->
    <div v-else class="auth-connected">
      <button
        type="button"
        class="user-avatar-btn"
        :title="displayName"
        :aria-label="`Compte : ${displayName}`"
        @click="toggleMenu"
      >
        {{ initial }}
      </button>
      <div v-if="showMenu" class="auth-dropdown" role="menu">
        <span class="auth-dropdown-name">{{ displayName }}</span>
        <button type="button" class="auth-dropdown-btn" role="menuitem" @click="handleLogout">
          Se déconnecter
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { Cloud, CloudOff, Loader2 } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import { useSync } from '../composables/useSync'

const authStore = useAuthStore()
const sync = useSync()

const loading = ref(false)
const error = ref('')
const showMenu = ref(false)
const wrapperRef = ref<HTMLElement | null>(null)

onClickOutside(wrapperRef, () => {
  showMenu.value = false
})

const displayName = computed(() => {
  const u = authStore.user
  if (!u) return ''
  return (u['name'] as string) || (u['email'] as string) || 'Utilisateur'
})

const initial = computed(() =>
  (displayName.value || '?').charAt(0).toUpperCase()
)

async function handleLogin() {
  loading.value = true
  error.value = ''
  try {
    await authStore.login()
    await sync.mergeOnLogin()
    await sync.startRealtimeSync()
  } catch (e) {
    error.value = 'Connexion échouée'
    console.error('Auth error:', e)
    // Reset error after 3s
    setTimeout(() => { error.value = '' }, 3000)
  } finally {
    loading.value = false
  }
}

function handleLogout() {
  showMenu.value = false
  sync.stopRealtimeSync()
  authStore.logout()
}

function toggleMenu() {
  showMenu.value = !showMenu.value
}
</script>

<style scoped>
.auth-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.auth-connected {
  position: relative;
}

.user-avatar-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s;
}

.user-avatar-btn:hover {
  opacity: 0.85;
}

.auth-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 160px;
  background: var(--color-surface);
  border: 1px solid var(--color-muted);
  border-radius: 0.5rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 0.25rem 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
}

.auth-dropdown-name {
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  color: var(--color-muted);
  border-bottom: 1px solid var(--color-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.auth-dropdown-btn {
  background: none;
  border: none;
  color: var(--color-text);
  padding: 0.5rem 0.75rem;
  text-align: left;
  cursor: pointer;
  font-size: 0.875rem;
  width: 100%;
}

.auth-dropdown-btn:hover {
  background: color-mix(in srgb, var(--color-muted) 12%, transparent);
}

.icon-error {
  color: var(--color-danger, #e53e3e);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
