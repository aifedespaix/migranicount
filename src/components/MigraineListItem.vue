<template>
  <li class="migraine-card" @click="$emit('click')">
    <div class="gutter" :style="{ background: intensityColorValue }"></div>
    <div class="card-body">
      <div class="card-header">
        <span class="date">{{ formatRelative(migraine.date) }}</span>
        <div class="header-right">
          <span class="time">{{ migraine.heureDebut }}</span>
          <span class="intensity-badge" :style="{ background: intensityColorValue }">{{ migraine.intensite }}/10</span>
        </div>
      </div>

      <div class="card-duration">
        <span class="duration">{{ durationLabel }}</span>
        <span v-if="migraine.avortee" class="badge-avortee">Avortée</span>
      </div>

      <div v-if="migraine.symptomes.length || migraine.medocs.length" class="card-details">
        <div v-if="migraine.symptomes.length" class="detail-row">
          <span class="detail-label">Symptômes</span>
          <div class="pill-list">
            <span v-for="s in migraine.symptomes.slice(0, 3)" :key="s" class="pill">{{ s }}</span>
            <span v-if="migraine.symptomes.length > 3" class="pill">+{{ migraine.symptomes.length - 3 }}</span>
          </div>
        </div>
        <div v-if="migraine.medocs.length" class="detail-row">
          <span class="detail-label">Traitement</span>
          <span class="detail-value">{{ migraine.medocs.map(m => m.nom).join(', ') }}</span>
        </div>
      </div>

      <div v-if="migraine.declencheurs.length || zoneLabel" class="card-footer">
        <span v-if="zoneLabel" class="footer-tag">{{ zoneLabel }}</span>
        <span v-for="d in migraine.declencheurs.slice(0, 2)" :key="d" class="footer-tag">{{ d }}</span>
        <span v-if="migraine.declencheurs.length > 2" class="footer-more">+{{ migraine.declencheurs.length - 2 }}</span>
      </div>
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatRelative, formatDuration } from '../utils/date'
import type { Migraine } from '../types/migraine'
import { intensityColor as intensityColorFn } from '../utils/intensity'
import { zoneLabel as zoneLabelFn } from '../utils/zone'

const props = defineProps<{ migraine: Migraine }>()
defineEmits<{ click: [] }>()

const durationLabel = computed(() => {
  if (!props.migraine.heureFin) return 'En cours'
  const [h1, m1] = props.migraine.heureDebut.split(':').map(Number)
  const [h2, m2] = props.migraine.heureFin.split(':').map(Number)
  return formatDuration(h2 * 60 + m2 - (h1 * 60 + m1))
})

const intensityColorValue = computed(() => intensityColorFn(props.migraine.intensite))
const zoneLabel = computed(() => zoneLabelFn(props.migraine.zone))
</script>

<style scoped>
.migraine-card {
  background: var(--color-surface);
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  display: flex;
  overflow: hidden;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  border: 1px solid transparent;
}
.migraine-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  border-color: var(--color-accent);
}
.gutter {
  width: 4px;
  flex-shrink: 0;
}
.card-body {
  flex: 1;
  min-width: 0;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.date {
  font-weight: 700;
  font-size: 0.95rem;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}
.time {
  font-size: 0.8rem;
  color: var(--color-muted);
}
.intensity-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 0.75rem;
  color: #1c1726;
}
.card-duration {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.duration {
  font-size: 0.82rem;
  color: var(--color-muted);
}
.badge-avortee {
  font-size: 0.68rem;
  padding: 0.1rem 0.45rem;
  border-radius: 1rem;
  background: var(--color-danger);
  color: white;
  font-weight: 600;
}
.card-details {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.detail-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}
.detail-label {
  color: var(--color-muted);
  flex-shrink: 0;
  min-width: 4.5rem;
}
.detail-value {
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.pill {
  font-size: 0.68rem;
  padding: 0.1rem 0.4rem;
  border-radius: 1rem;
  background: var(--color-bg);
  color: var(--color-muted);
  border: 1px solid var(--color-muted);
}
.card-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding-top: 0.25rem;
  border-top: 1px solid var(--color-bg);
  margin-top: 0.1rem;
}
.footer-tag {
  font-size: 0.65rem;
  color: var(--color-muted);
  padding: 0.1rem 0.4rem;
  border-radius: 1rem;
  background: var(--color-bg);
}
.footer-more {
  font-size: 0.65rem;
  color: var(--color-muted);
}
</style>
