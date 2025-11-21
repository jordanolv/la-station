import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'

// Configurer axios avec les intercepteurs
import './utils/axios'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)

// L'initialisation se fera dans le router guard
app.mount('#app') 