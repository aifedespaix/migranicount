<template>
  <div class="stats-view">
    <div v-if="migraines.migraines.length === 0" class="empty-state">
      <h1>{{ homeIntro.title }}</h1>
      <p>{{ homeIntro.paragraph }}</p>
      <button class="cta-btn" @click="emptyStateFormOpen = true">
        Répertorier une migraine
      </button>
    </div>

    <template v-else>
      <div class="summary-cards">
        <div class="card">
          <strong>Dernière crise</strong>
          <span>{{
            lastMigraine ? formatRelative(lastMigraine.date) : "aucune"
          }}</span>
        </div>
        <div class="card">
          <strong>Durée moyenne</strong>
          <span>{{ formatDuration(avgDur.avgMin) }}</span>
        </div>
        <div class="card">
          <strong>Ce mois-ci</strong>
          <span>{{ thisMonthCount }} crise(s)</span>
        </div>
      </div>

      <div class="period-selector">
        <button
          v-for="p in ['day', 'week', 'month'] as const"
          :key="p"
          type="button"
          :class="['period-btn', { active: period === p }]"
          @click="period = p"
        >
          {{ periodLabels[p] }}
        </button>
      </div>

      <button class="chart-card" @click="openDetail('frequency')">
        <h2>Fréquence des crises</h2>
        <div class="chart-wrap">
          <FrequencyChart
            :migraines="migraines.migraines"
            :period="period"
            :treatments="activeTreatments"
          />
        </div>
      </button>
      <TreatmentLegend
        v-if="allTreatments.length"
        :entries="allTreatments"
        :selected="selectedTreatments"
        @update:selected="selectedTreatments = $event"
      />

      <button class="chart-card heatmap-card" @click="openDetail('heatmap')">
        <h2>Calendrier des crises</h2>
        <CalendarHeatmap :migraines="migraines.migraines" />
      </button>

      <div class="stats-buttons">
        <StatsButton
          title="Intensité"
          :facts="intensityFacts"
          @click="openDetail('intensity')"
        />
        <StatsButton
          title="Distribution des intensités"
          :facts="distributionFacts"
          @click="openDetail('intensity-distribution')"
        />
        <StatsButton
          title="Efficacité médicaments"
          :facts="efficacyFacts"
          @click="openDetail('medoc-efficacy')"
        />
        <StatsButton
          title="Durée des crises"
          :facts="durationFacts"
          @click="openDetail('duration')"
        />
        <StatsButton
          title="Déclencheurs"
          :facts="triggerFacts"
          @click="openDetail('triggers')"
        />
        <StatsButton
          title="Symptômes"
          :facts="symptomFacts"
          @click="openDetail('symptoms')"
        />
        <StatsButton
          title="Zones touchées"
          :facts="zoneFacts"
          @click="openDetail('zones')"
        />
        <StatsButton
          title="Patterns temporels"
          :facts="timePatternFacts"
          @click="openDetail('time-patterns')"
        />
        <StatsButton
          title="Suivi médicamenteux"
          :facts="medicationFacts"
          @click="openDetail('medication')"
        />
        <StatsButton
          v-if="hasTraitementData"
          title="Traitement de fond"
          :facts="traitementFacts"
          @click="traitementEfficaciteOpen = true"
        />
      </div>
    </template>

    <Footer />

    <ChartDetailModal
      v-if="activeDetail"
      :chart="activeDetail"
      :migraines="migraines.migraines"
      :initial-period="period"
      :treatments="allTreatments"
      :selected-treatments="selectedTreatments"
      @close="activeDetail = null"
      @update:selected-treatments="selectedTreatments = $event"
    />

    <TraitementEfficaciteModal
      v-if="traitementEfficaciteOpen"
      :migraines="migraines.migraines"
      :medocs="medocsFavoris.favoris"
      @close="traitementEfficaciteOpen = false"
    />

    <MigraineFormModal
      v-if="emptyStateFormOpen"
      @close="emptyStateFormOpen = false"
      @saved="onEmptyStateSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import CalendarHeatmap from "../components/charts/CalendarHeatmap.vue";
import ChartDetailModal from "../components/charts/ChartDetailModal.vue";
import FrequencyChart from "../components/charts/FrequencyChart.vue";
import StatsButton from "../components/charts/StatsButton.vue";
import TreatmentLegend from "../components/charts/TreatmentLegend.vue";
import Footer from "../components/Footer.vue";
import MigraineFormModal from "../components/MigraineForm/MigraineFormModal.vue";
import TraitementEfficaciteModal from "../components/TraitementEfficaciteModal.vue";
import { homeIntro } from "../content/home.mjs";
import { useMedocsFavorisStore } from "../stores/medocsFavoris";
import { useMigrainesStore } from "../stores/migraines";
import { useToastStore } from "../stores/toast";
import { formatDuration, formatRelative, todayISO } from "../utils/date";
import {
  buildPerTreatmentTimelines,
  defaultPeriod,
  durationStats,
  efficacyRanking,
  intensityDistribution,
  intensityStats,
  medicationDaysPerMonth,
  startHourDistribution,
  symptomFrequency,
  treatmentEfficacyAnalysis,
  triggerFrequency,
  weekdayDistribution,
  zoneDistribution,
  type Period,
  type Zone,
} from "../utils/stats";
import { colorForIndex, type TreatmentEntry } from "../utils/treatmentColors";

type ChartType =
  | "frequency"
  | "intensity"
  | "intensity-distribution"
  | "medoc-efficacy"
  | "duration"
  | "heatmap"
  | "triggers"
  | "symptoms"
  | "zones"
  | "time-patterns"
  | "medication";

const migraines = useMigrainesStore();
const medocsFavoris = useMedocsFavorisStore();
const toastStore = useToastStore();
const period = ref<Period>(defaultPeriod(migraines.migraines));
const activeDetail = ref<ChartType | null>(null);
const emptyStateFormOpen = ref(false);
const traitementEfficaciteOpen = ref(false);

const periodLabels: Record<Period, string> = {
  day: "Jour",
  week: "Semaine",
  month: "Mois",
};

function openDetail(chart: ChartType) {
  activeDetail.value = chart;
}

function onEmptyStateSaved() {
  emptyStateFormOpen.value = false;
  toastStore.add({ message: "Migraine enregistrée !", type: "success" });
}

const lastMigraine = computed(
  () => [...migraines.migraines].sort((a, b) => (a.date < b.date ? 1 : -1))[0],
);

const thisMonthCount = computed(
  () =>
    migraines.migraines.filter(
      (m) => m.date.slice(0, 7) === todayISO().slice(0, 7),
    ).length,
);

const iStats = computed(() => intensityStats(migraines.migraines));
const avgDur = computed(() => durationStats(migraines.migraines));

const intensityFacts = computed(() => [
  { value: `${iStats.value.avg}/10`, label: "intensité moy." },
  { value: `${iStats.value.max}/10`, label: "max" },
  { value: String(iStats.value.severeCount), label: "crises sévères (≥7)" },
]);

const distributionFacts = computed(() => {
  const dist = intensityDistribution(migraines.migraines);
  const dominant = dist.reduce((max, d) => (d.count > max.count ? d : max), {
    level: 0,
    count: 0,
  });
  return [
    {
      value: dominant.level ? `${dominant.level}/10` : "-",
      label: "intensité dominante",
    },
    { value: String(iStats.value.severeCount), label: "crises sévères (≥7)" },
  ];
});

const efficacyFacts = computed(() => {
  const best = efficacyRanking(migraines.migraines)[0];
  return [
    { value: best ? best.nom : "-", label: "plus efficace" },
    { value: best ? `${best.pctAvortee}%` : "-", label: "taux d'avortivité" },
  ];
});

const durationFacts = computed(() => [
  {
    value: avgDur.value.avgMin > 0 ? formatDuration(avgDur.value.avgMin) : "-",
    label: "durée moy.",
  },
  {
    value: avgDur.value.maxMin > 0 ? formatDuration(avgDur.value.maxMin) : "-",
    label: "max",
  },
]);

const triggerFacts = computed(() => {
  const top = triggerFrequency(migraines.migraines)[0];
  return [
    { value: top ? top.tag : "-", label: "plus fréquent" },
    { value: top ? String(top.count) : "-", label: "crise(s)" },
  ];
});

const symptomFacts = computed(() => {
  const top = symptomFrequency(migraines.migraines)[0];
  return [
    { value: top ? top.tag : "-", label: "plus fréquent" },
    { value: top ? String(top.count) : "-", label: "crise(s)" },
  ];
});

const zoneLabels: Record<Zone, string> = {
  gauche: "Gauche",
  droite: "Droite",
  bilaterale: "Bilatérale",
  nuque: "Nuque",
};

const zoneFacts = computed(() => {
  const withData = zoneDistribution(migraines.migraines).filter(
    (z) => z.count > 0,
  );
  if (!withData.length) return [{ value: "-", label: "zone dominante" }];
  const top = withData.reduce((max, z) => (z.count > max.count ? z : max));
  return [
    { value: zoneLabels[top.zone], label: "zone dominante" },
    { value: String(top.count), label: "crise(s)" },
  ];
});

const timePatternFacts = computed(() => {
  const hours = startHourDistribution(migraines.migraines);
  const topHour = hours.reduce((max, b) => (b.count > max.count ? b : max));
  const days = weekdayDistribution(migraines.migraines);
  const topDay = days.reduce((max, b) => (b.count > max.count ? b : max));
  return [
    {
      value: topHour.count > 0 ? topHour.label.split(" ")[0] : "-",
      label: "moment le plus fréquent",
    },
    {
      value: topDay.count > 0 ? topDay.label : "-",
      label: "jour le plus fréquent",
    },
  ];
});

const medicationFacts = computed(() => {
  const months = medicationDaysPerMonth(migraines.migraines);
  const current = months[months.length - 1];
  const facts = [
    { value: String(current?.days ?? 0), label: "jour(s) avec médoc ce mois" },
  ];
  if ((current?.days ?? 0) >= 8) {
    facts.push({ value: "⚠", label: "seuil de vigilance atteint" });
  }
  return facts;
});

const allTreatments = computed<TreatmentEntry[]>(() =>
  buildPerTreatmentTimelines(medocsFavoris.favoris).map((t, i) => ({
    name: t.name,
    color: colorForIndex(i),
    periods: t.periods,
  })),
);
const selectedTreatments = ref<string[]>([]);

watch(
  allTreatments,
  (entries) => {
    selectedTreatments.value = entries.map((e) => e.name);
  },
  { immediate: true },
);

const activeTreatments = computed(() =>
  allTreatments.value.filter((e) => selectedTreatments.value.includes(e.name)),
);

const hasTraitementData = computed(() =>
  medocsFavoris.longTermMeds.some((m) => m.treatmentPeriods?.length),
);

const traitementFacts = computed(() => {
  const results = treatmentEfficacyAnalysis(
    migraines.migraines,
    medocsFavoris.favoris,
  );
  const withData = results.filter((r) => r.reductionPct.freq !== null);
  if (!withData.length) {
    return [
      {
        value: String(medocsFavoris.longTermMeds.length),
        label: "traitement(s) suivi(s)",
      },
    ];
  }
  const best = [...withData].sort(
    (a, b) => (a.reductionPct.freq ?? 0) - (b.reductionPct.freq ?? 0),
  )[0];
  return [
    { value: best.medoc, label: "meilleure efficacité" },
    {
      value: `${Math.abs(best.reductionPct.freq!)}%`,
      label:
        best.reductionPct.freq! < 0 ? "réduction fréquence" : "augmentation",
    },
  ];
});
</script>

<style scoped>
.stats-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1rem 1.5rem;
  box-sizing: border-box;
  gap: 1rem;
  overflow-y: auto;
}
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 1rem;
  max-width: 480px;
  margin: 0 auto;
}
.cta-btn {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border: none;
  border-radius: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
}
.summary-cards {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}
.card {
  flex: 1;
  min-width: 0;
  background: var(--color-surface);
  border-radius: 0.5rem;
  padding: 0.6rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.card strong {
  font-size: 0.7rem;
  color: var(--color-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card span {
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.period-selector {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}
.period-btn {
  padding: 0.35rem 0.85rem;
  border-radius: 1rem;
  border: 1px solid var(--color-muted);
  background: none;
  color: var(--color-muted);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}
.period-btn.active {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border-color: var(--color-accent);
}
.chart-card {
  background: var(--color-surface);
  border: 1px solid transparent;
  border-radius: 0.5rem;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  transition:
    border-color 0.15s ease,
    transform 0.15s ease;
  flex-shrink: 0;
}
.chart-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
}
.chart-card h2 {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
}
.chart-wrap {
  height: 180px;
  position: relative;
}
.stats-buttons {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
}
@media (min-width: 1024px) {
  .stats-buttons {
    grid-template-columns: 1fr 1fr;
  }
  .heatmap-card :deep(.heatmap-scroll) {
    text-align: center;
  }
}
</style>
