<script setup>
import { ref, computed } from 'vue';
import { useConfig } from '../composables/useConfig';
import AnalyticsPanel from '../components/admin/AnalyticsPanel.vue';
import DashboardPanel from '../components/admin/DashboardPanel.vue';
import ConfigEditor from '../components/admin/ConfigEditor.vue';
import AppFooter from '../components/AppFooter.vue'; // 引入页脚

const config = useConfig();
const isLoading = computed(() => !config.value);

const activeTab = ref('analytics');

const refreshConfig = () => {
    console.log('配置已更新，数据已刷新。');
};
</script>

<template>
    <div class="app-wrapper">
        <div class="app-content">
            <div class="main-content-area">
                <header class="admin-header">
                    <h1>管理员面板</h1>
                    <nav class="admin-tabs">
                        <button @click="activeTab = 'analytics'"
                            :class="{ active: activeTab === 'analytics' }">数据统计</button>
                        <button @click="activeTab = 'overview'"
                            :class="{ active: activeTab === 'overview' }">配置总览</button>
                        <button @click="activeTab = 'editor'" :class="{ active: activeTab === 'editor' }">配置修改</button>
                    </nav>
                </header>

                <main class="admin-main-content">
                    <div v-if="isLoading" class="loading-panel">正在加载配置...</div>
                    <div v-else>
                        <div v-show="activeTab === 'analytics'">
                            <AnalyticsPanel />
                        </div>
                        <div v-show="activeTab === 'overview'">
                            <DashboardPanel :config="config" />
                        </div>
                        <div v-show="activeTab === 'editor'">
                            <ConfigEditor :config="config" @config-updated="refreshConfig" />
                        </div>
                    </div>
                </main>
            </div>
        </div>
        <!-- <AppFooter /> -->
    </div>
</template>

<style scoped>
/* [核心修正] 采用与主页一致的“文档式”布局，让整个页面可以滚动 */
.admin-view-wrapper {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    /* 使用 min-height 允许页面高度随内容增长 */
}
.app-content {
    flex-grow: 1;
    /* 内容区域占据剩余空间 */
}

/* 页面主要内容区域的容器 */
.main-content-area {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem 4rem 1rem;
    /* 增加顶部和底部内边距 */
    width: 100%;
}

.admin-header {
    border-bottom: 2px solid var(--border-color);
    padding-bottom: 1rem;
    margin-bottom: 2rem;
}

.admin-main-area {
    /* 这是内容区域，不再需要独立滚动 */
    width: 100%;
    max-width: 1200px;
    /* 或您需要的主内容宽度 */
    margin: 0 auto;
    padding: 2rem;
}

h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
}

.admin-tabs button {
    font-size: 1.1rem;
    font-weight: 500;
    padding: 0.8rem 1.5rem;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--text-color-light);
    border-bottom: 3px solid transparent;
    transition: color 0.2s, border-color 0.2s;
}

.admin-tabs button:hover {
    color: var(--text-color);
}

.admin-tabs button.active {
    color: var(--primary-color);
    border-bottom-color: var(--primary-color);
}

.loading-panel {
    text-align: center;
    font-size: 1.2rem;
    padding: 4rem;
    color: var(--text-color-light);
}
</style>
