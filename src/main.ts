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

const pinia = createPinia()
const app = createApp(App).use(pinia).use(router)

app.mount('#app')

// Restore PocketBase session and start realtime sync if already authenticated
if (pb.authStore.isValid) {
  useSync().startRealtimeSync().catch(console.error)
}

if ('serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller)
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || refreshing) return
    refreshing = true
    window.location.reload()
  })
}
