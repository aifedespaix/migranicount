import { createRouter, createWebHistory } from 'vue-router'
import StatsView from '../views/StatsView.vue'
import ListView from '../views/ListView.vue'
import SettingsView from '../views/SettingsView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'stats', component: StatsView },
    { path: '/liste', name: 'liste', component: ListView },
    { path: '/settings', name: 'settings', component: SettingsView },
  ],
})
