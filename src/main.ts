import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router'
import App from './App.vue'
import './style.css'
import './styles/theme.css'
import './styles/form.css'
import './styles/fonts.css'
import { pb } from './lib/pocketbase'
import { useSync } from './composables/useSync'
import { processOutbox } from './lib/syncOutbox'

const pinia = createPinia()
const app = createApp(App).use(pinia).use(router)

app.mount('#app')

// Restore PocketBase session, merge remote changes, then start realtime sync
if (pb.authStore.isValid) {
  const sync = useSync()
  sync.mergeOnLogin()
    .then(() => sync.startRealtimeSync())
    .catch(console.error)
}

// Retente les opérations de sync en attente (échouées faute de réseau) dès la reconnexion
window.addEventListener('online', () => {
  void processOutbox()
})

if ('serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller)
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || refreshing) return
    refreshing = true
    window.location.reload()
  })
}
