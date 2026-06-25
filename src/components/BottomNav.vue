<template>
  <nav class="bottom-nav">
    <RouterLink :to="{ name: 'stats' }" class="nav-item">
      <BarChart2 :size="20" />
      <span>Stats</span>
    </RouterLink>
    <button type="button" class="fab-center" @click="$emit('add')" aria-label="Ajouter une migraine">
      <Plus :size="24" />
    </button>
    <RouterLink :to="{ name: 'liste' }" class="nav-item">
      <List :size="20" />
      <span>Liste</span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { BarChart2, List, Plus } from 'lucide-vue-next'

defineEmits<{ add: [] }>()
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  background: var(--color-surface);
  border-top: 1px solid var(--color-muted);
  z-index: 10;
  height: 3.5rem;
}
.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  padding: 0.4rem 0;
  color: var(--color-muted);
  text-decoration: none;
  font-size: 0.7rem;
}
.nav-item.router-link-active {
  color: var(--color-accent);
}
.fab-center {
  flex-shrink: 0;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  border: none;
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.25);
  margin: 0 1rem;
  flex: 0 0 auto;
}
@media (min-width: 1024px) {
  .bottom-nav { display: none; }
}
</style>
