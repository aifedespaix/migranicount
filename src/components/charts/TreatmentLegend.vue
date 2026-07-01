<template>
  <div v-if="entries.length" class="treatment-legend">
    <label
      v-for="e in entries"
      :key="e.name"
      class="legend-item"
      :class="{ inactive: !selected.includes(e.name) }"
    >
      <input
        type="checkbox"
        :checked="selected.includes(e.name)"
        class="legend-checkbox"
        @change="toggle(e.name)"
      />
      <span
        class="legend-swatch"
        :style="{ background: e.color.swatch, borderColor: e.color.border }"
      />
      <span class="legend-name" :style="{ color: selected.includes(e.name) ? e.color.text : 'var(--color-muted)' }">
        {{ e.name }}
      </span>
    </label>
  </div>
</template>

<script setup lang="ts">
import type { TreatmentEntry } from '../../utils/treatmentColors'

const props = defineProps<{ entries: TreatmentEntry[]; selected: string[] }>()
const emit = defineEmits<{ 'update:selected': [string[]] }>()

function toggle(name: string) {
  const next = props.selected.includes(name)
    ? props.selected.filter((n) => n !== name)
    : [...props.selected, name]
  emit('update:selected', next)
}
</script>

<style scoped>
.treatment-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.5rem;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
  padding: 0.2rem 0.5rem 0.2rem 0.3rem;
  border-radius: 1rem;
  border: 1px solid var(--color-muted);
  background: color-mix(in srgb, var(--color-muted) 6%, transparent);
  font-size: 0.75rem;
  transition: opacity 0.15s ease, border-color 0.15s ease;
  user-select: none;
}
.legend-item.inactive { opacity: 0.45; }
.legend-checkbox { display: none; }
.legend-swatch {
  display: inline-block;
  width: 0.85rem;
  height: 0.55rem;
  border-radius: 0.2rem;
  border: 1px solid;
  flex-shrink: 0;
}
.legend-name { white-space: nowrap; }
</style>
