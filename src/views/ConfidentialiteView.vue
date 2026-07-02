<template>
  <div class="legal-view">
    <h1>{{ content.title }}</h1>
    <p class="legal-updated">{{ content.updated }}</p>

    <section v-for="section in content.sections" :key="section.heading">
      <h2>{{ section.heading }}</h2>
      <p v-for="(p, i) in section.paragraphs" :key="i" v-html="p" />
      <ul v-if="section.list">
        <li v-for="(item, i) in section.list" :key="i" v-html="item" />
      </ul>
      <p v-for="(p, i) in section.paragraphsAfterList ?? []" :key="`after-${i}`" v-html="p" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { confidentialite as content } from '../content/legal.mjs'
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
.legal-updated {
  color: var(--color-muted);
  font-size: 0.85rem;
  margin-top: -0.5rem;
}
section {
  margin-top: 1.75rem;
}
h2 {
  font-size: 1.05rem;
}
p,
li {
  line-height: 1.55;
}
ul {
  list-style: disc;
  padding-left: 1.25rem;
  margin: 0.5rem 0;
}
li {
  margin-bottom: 0.35rem;
}
:deep(a) {
  color: var(--color-accent);
}
:deep(code) {
  background: var(--color-surface);
  padding: 0.1rem 0.35rem;
  border-radius: 0.3rem;
  font-size: 0.9em;
}
</style>
