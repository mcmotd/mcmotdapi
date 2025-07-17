import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // 1. 导入路由

import './assets/main.css'

const app = createApp(App)

app.use(router) // 2. 使用路由

app.mount('#app')