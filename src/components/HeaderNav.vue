<template>
  <header class="header-nav">
    <span class="logo">Migracount</span>
    <nav>
      <RouterLink :to="{ name: 'stats' }">Stats</RouterLink>
      <RouterLink :to="{ name: 'liste' }">Liste</RouterLink>
      <RouterLink :to="{ name: 'settings' }">Réglages</RouterLink>
    </nav>
    <button class="add-btn" @click="$emit('add')">+ Ajouter</button>
  </header>
</template>

<script setup lang="ts">
defineEmits<{ add: [] }>()
</script>

<style scoped>
.header-nav {
  display: none;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-muted);
}
.header-nav nav a {
  margin-right: 1.5rem;
  color: var(--color-muted);
  text-decoration: none;
}
.header-nav nav a.router-link-active {
  color: var(--color-accent);
  font-weight: 600;
}
.add-btn {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border: none;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
@media (min-width: 1024px) {
  .header-nav { display: flex; }
}
</style>
