<template>
  <nav class="bottom-nav">
    <RouterLink :to="{ name: 'stats' }" class="nav-item">Stats</RouterLink>
    <RouterLink :to="{ name: 'liste' }" class="nav-item">Liste</RouterLink>
  </nav>
</template>

<script setup lang="ts"></script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  display: flex;
  background: var(--color-surface);
  border-top: 1px solid var(--color-muted);
  z-index: 10;
}
.nav-item {
  flex: 1;
  text-align: center;
  padding: 0.75rem 0;
  color: var(--color-muted);
  text-decoration: none;
}
.nav-item.router-link-active {
  color: var(--color-accent);
  font-weight: 600;
}
@media (min-width: 1024px) {
  .bottom-nav { display: none; }
}
</style>
