import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // 1. 导入路由
import i18n from './i18n';
import './assets/main.css'
import ConfigProvider from './components/ConfigProvider.vue';

const app = createApp(App);
app.use(router) // 2. 使用路由
app.use(i18n)
app.mount('#app')