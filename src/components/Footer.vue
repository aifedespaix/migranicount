<template>
  <footer class="app-footer">
    <nav class="footer-links" aria-label="Liens légaux">
      <RouterLink to="/confidentialite/">Confidentialité</RouterLink>
      <span class="footer-sep" aria-hidden="true">·</span>
      <RouterLink to="/mentions-legales/">Mentions légales</RouterLink>
      <span class="footer-sep" aria-hidden="true">·</span>
      <a href="mailto:aife.contacts@gmail.com">Contact</a>
    </nav>
    <p class="footer-copy">
      © {{ year }} Migracount — vos données de santé restent sur votre appareil,
      par défaut.
    </p>
  </footer>
</template>

<script setup lang="ts">
const year = new Date().getFullYear();
</script>

<style scoped>
.app-footer {
  flex-shrink: 0;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid color-mix(in srgb, var(--color-muted) 15%, transparent);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.footer-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  font-size: 0.8rem;
}
.footer-links a {
  color: var(--color-muted);
  text-decoration: none;
}
.footer-links a:hover,
.footer-links a:focus-visible {
  color: var(--color-accent);
  text-decoration: underline;
}
.footer-sep {
  color: var(--color-muted);
}
.footer-copy {
  margin: 0;
  font-size: 0.72rem;
  color: var(--color-muted);
}
</style>
