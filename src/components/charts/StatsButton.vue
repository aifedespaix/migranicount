<template>
  <button class="stats-btn" @click="$emit('click')">
    <div class="stats-btn-header">
      <span class="stats-btn-title">{{ title }}</span>
      <ChevronRight :size="16" class="stats-btn-chevron" />
    </div>
    <div class="stats-btn-facts">
      <div v-for="fact in facts" :key="fact.label" class="fact">
        <span class="fact-value">{{ fact.value }}</span>
        <span class="fact-label">{{ fact.label }}</span>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
defineProps<{ title: string; facts: { label: string; value: string }[] }>()
defineEmits<{ click: [] }>()
</script>

<style scoped>
.stats-btn {
  width: 100%;
  background: var(--color-surface);
  border: 1px solid transparent;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  text-align: left;
  color: var(--color-text);
  font: inherit;
  transition: border-color 0.15s ease, transform 0.1s ease;
}
.stats-btn:hover {
  border-color: var(--color-accent);
  transform: translateY(-1px);
}
.stats-btn-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.stats-btn-title {
  font-size: 0.9rem;
  font-weight: 600;
}
.stats-btn-chevron {
  color: var(--color-muted);
}
.stats-btn-facts {
  display: flex;
  gap: 1.5rem;
}
.fact {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.fact-value {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-accent);
}
.fact-label {
  font-size: 0.65rem;
  color: var(--color-muted);
}
</style>
