// src/router/index.js

import { createRouter, createWebHistory } from 'vue-router';
// 我们将很快创建这两个新文件
import HomeView from '../views/HomeView.vue';
import EmbedView from '../views/EmbedView.vue';
import AdminView from '../views/AdminView.vue';
import LoginView from '../views/LoginView.vue';
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
        // [新增] 登录页路由
        {
            path: '/login',
            name: 'Login',
            component: LoginView
        },
        // [新增] 添加管理员页面路由
        {
            path: '/admin',
            name: 'Admin',
            component: AdminView,
            meta: { requiresAuth: true }
        },
        {
            path: '/docs',
            name: 'Docs',
            component: DocsView
        }
    ]
});

// [新增] 全局路由守卫
router.beforeEach((to, from, next) => {
    // 检查目标路由是否需要认证
    if (to.matched.some(record => record.meta.requiresAuth)) {
        // 检查用户是否已登录 (通过 sessionStorage 标记)
        if (sessionStorage.getItem('isAdminAuthenticated') === 'true') {
            next(); // 已登录，放行
        } else {
            next('/login'); // 未登录，重定向到登录页
        }
    } else {
        next(); // 不需要认证的页面，直接放行
    }
});

export default router;