<template>
  <div class="legal-view">
    <h1>{{ content.title }}</h1>

    <section v-for="section in content.sections" :key="section.heading">
      <h2>{{ section.heading }}</h2>
      <p v-for="(p, i) in section.paragraphs" :key="i" v-html="p" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { mentionsLegales as content } from '../content/legal.mjs'
</script>

<style scoped>
.legal-view {
  max-width: 42rem;
  margin: 0 auto;
  padding: 1.5rem 1.5rem 3rem;
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
}
section {
  margin-top: 1.75rem;
}
h2 {
  font-size: 1.05rem;
}
p {
  line-height: 1.55;
}
:deep(a) {
  color: var(--color-accent);
}
</style>
