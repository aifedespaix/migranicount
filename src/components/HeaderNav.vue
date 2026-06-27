<template>
  <header class="header-nav">
    <RouterLink :to="{ name: 'stats' }" class="header-brand">
      <img src="/icons/favicon-32.png" alt="" class="brand-icon" aria-hidden="true" />
      <span class="brand-name">Migracount</span>
    </RouterLink>

    <nav class="header-links">
      <RouterLink :to="{ name: 'stats' }" class="nav-link">
        <BarChart2 :size="16" />
        Stats
      </RouterLink>
      <RouterLink :to="{ name: 'liste' }" class="nav-link">
        <List :size="16" />
        Liste
      </RouterLink>
    </nav>

    <div class="header-actions">
      <AppTooltip content="Modifier le répertoire" placement="bottom">
        <button
          type="button"
          class="icon-btn"
          aria-label="Modifier le répertoire"
          @click="$emit('catalog')"
        >
          <BookOpen :size="18" />
        </button>
      </AppTooltip>
      <AppTooltip content="Réglages" placement="bottom">
        <button
          type="button"
          :class="['icon-btn', { 'icon-btn--active': isSettings }]"
          aria-label="Réglages"
          @click="router.push({ name: 'settings' })"
        >
          <SettingsIcon :size="18" />
        </button>
      </AppTooltip>
      <AppTooltip v-if="canInstall" content="Installer l'application" placement="bottom">
        <button
          type="button"
          class="icon-btn"
          aria-label="Installer l'application"
          @click="install"
        >
          <Download :size="18" />
        </button>
      </AppTooltip>
      <AuthButton />
      <button class="add-btn" :class="{ 'add-btn--resume': props.hasDraft }" @click="$emit('add')">
        {{ props.hasDraft ? '↩ Reprendre' : '+ Ajouter' }}
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { BookOpen, BarChart2, List, Settings as SettingsIcon, Download } from 'lucide-vue-next'
import AuthButton from './AuthButton.vue'
import AppTooltip from './AppTooltip.vue'
import { usePwaInstall } from '../composables/usePwaInstall'

const props = defineProps<{ hasDraft?: boolean }>()
defineEmits<{ add: []; catalog: [] }>()

const router = useRouter()
const route = useRoute()
const isSettings = computed(() => route.name === 'settings')
const { canInstall, install } = usePwaInstall()
</script>

<style scoped>
.header-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-muted);
  z-index: 30;
  box-sizing: border-box;
  gap: 0.75rem;
}
.header-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  text-decoration: none;
  color: inherit;
}
.brand-icon {
  width: 24px;
  height: 24px;
  border-radius: 5px;
}
.brand-name {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text);
}
.header-links {
  display: none;
  align-items: center;
  gap: 0.25rem;
}
.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  border-radius: 0.4rem;
  color: var(--color-muted);
  text-decoration: none;
  font-size: 0.9rem;
}
.nav-link.router-link-active {
  color: var(--color-accent);
  font-weight: 600;
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.icon-btn {
  background: none;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  padding: 0.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.4rem;
}
.icon-btn:hover {
  color: var(--color-text);
  background: color-mix(in srgb, var(--color-muted) 12%, transparent);
}
.icon-btn--active {
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}
.add-btn {
  display: none;
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border: none;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
}
.add-btn--resume {
  background: var(--color-info);
}
@media (min-width: 1024px) {
  .header-links { display: flex; }
  .add-btn { display: inline-block; }
  .header-nav { padding: 0 1.5rem; }
}
</style>
