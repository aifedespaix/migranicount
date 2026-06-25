import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router'
import App from './App.vue'
import './style.css'
import './styles/theme.css'
import './styles/form.css'
import './styles/fonts.css'

createApp(App).use(createPinia()).use(router).mount('#app')
