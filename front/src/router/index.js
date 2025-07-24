// src/router/index.js

import { createRouter, createWebHistory } from 'vue-router';
// 我们将很快创建这两个新文件
import HomeView from '../views/HomeView.vue';
import EmbedView from '../views/EmbedView.vue';
import DocsView from '../views/DocsView.vue';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView
        },
        {
            path: '/iframe', // 这就是我们提供给 iframe 的路径
            name: 'embed',
            component: EmbedView
        },
        {
            path: '/docs',
            name: 'docs',
            component: DocsView
        }
    ]
});

export default router;