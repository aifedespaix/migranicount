import { createRouter, createWebHistory } from 'vue-router'
import StatsView from '../views/StatsView.vue'
import ListView from '../views/ListView.vue'
import SettingsView from '../views/SettingsView.vue'
import ProfileView from '../views/ProfileView.vue'
import { pb } from '../lib/pocketbase'
import { applySeo } from '../composables/useHead'
import type { SeoMeta } from '../composables/useHead'

declare module 'vue-router' {
  interface RouteMeta {
    seo?: SeoMeta
    requiresAuth?: boolean
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'stats',
      component: StatsView,
      meta: {
        seo: {
          title: 'Tableau de bord',
          description: 'Consultez vos statistiques de migraines : fréquence, intensité moyenne, médicaments efficaces et tendances sur 12 mois.',
          robots: 'index, follow',
        },
      },
    },
    {
      path: '/liste',
      name: 'liste',
      component: ListView,
      meta: {
        seo: {
          title: 'Mes crises',
          description: 'Retrouvez et gérez l’historique de toutes vos crises de migraine enregistrées dans Migracount.',
          robots: 'index, follow',
        },
      },
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
      meta: {
        seo: {
          title: 'Réglages',
          description: 'Personnalisez Migracount : thème, police, export et import de vos données.',
          robots: 'noindex, nofollow',
        },
      },
    },
    {
      path: '/profil',
      name: 'profil',
      component: ProfileView,
      meta: {
        requiresAuth: true,
        seo: {
          title: 'Mon profil',
          description: 'Gerez votre compte Migracount : informations personnelles, statistiques et suppression de compte.',
          robots: 'noindex, nofollow',
        }
      }
    },
  ],
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !pb.authStore.isValid) {
    return { name: 'stats' }
  }
})

router.afterEach((to) => {
  if (to.meta.seo) {
    applySeo(to.meta.seo as SeoMeta, to.fullPath)
  }
})
