<script setup>
import { ref, computed } from 'vue';
import { useConfig } from '../composables/useConfig';
import AnalyticsPanel from '../components/admin/AnalyticsPanel.vue';
import DashboardPanel from '../components/admin/DashboardPanel.vue';
import ConfigEditor from '../components/admin/ConfigEditor.vue';
// import AppFooter from '../components/AppFooter.vue';

const config = useConfig();
const isLoading = computed(() => !config.value);
const activeTab = ref('analytics');

const refreshConfig = () => {
    console.log('配置已更新，数据已刷新。');
};
</script>

<template>
    <div class="app-wrapper">
        <!-- [核心修改] app-content 现在是可滚动区域 -->
        <div class="app-content">
            <div class="admin-page-container">
                <header class="admin-header">
                    <div class="header-content">
                        <h1>管理员面板</h1>
                        <nav class="admin-tabs">
                            <button @click="activeTab = 'analytics'"
                                :class="{ active: activeTab === 'analytics' }">数据统计</button>
                            <button @click="activeTab = 'overview'"
                                :class="{ active: activeTab === 'overview' }">配置总览</button>
                            <button @click="activeTab = 'editor'"
                                :class="{ active: activeTab === 'editor' }">配置修改</button>
                        </nav>
                    </div>
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
        <AppFooter />
    </div>
</template>

<style scoped>
/* [核心修改] 采用应用式布局，确保内容区可滚动 */
.app-wrapper {
    display: flex;
    flex-direction: column;
    /* 将高度固定为视口高度 */
    height: 100vh;
    background-color: var(--background-color);
    /* 防止整个页面出现滚动条 */
    overflow: hidden;
}

.app-content {
    /* flex: 1; 也可以用，但 flex-grow 更明确 */
    flex-grow: 1;
    /* [关键] 让这个区域在内容溢出时出现滚动条 */
    overflow-y: auto;
    /* 将内边距移到这里，确保滚动区域的边缘有空间 */
    padding: 2rem 1rem;
}

.admin-page-container {
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
    /* 移除内边距，因为它已移至父元素 */
}

.admin-header {
    background-color: var(--card-background);
    border-radius: 12px;
    padding: 1.5rem 2rem;
    margin-bottom: 2rem;
    border: 1px solid var(--border-color);
    /* [新增] 让头部在滚动时保持在顶部（可选，但体验更好） */
    position: sticky;
    top: 0;
    z-index: 10;
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
}

h1 {
    font-size: 2rem;
    font-weight: 700;
    margin: 0;
}

.admin-tabs button {
    font-size: 1rem;
    font-weight: 500;
    padding: 0.6rem 1.2rem;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--text-color-light);
    border-radius: 8px;
    transition: color 0.2s, background-color 0.2s;
}

.admin-tabs button:hover {
    background-color: var(--background-color);
    color: var(--text-color);
}

.admin-tabs button.active {
    background-color: var(--primary-color);
    color: #fff;
}

.loading-panel {
    text-align: center;
    font-size: 1.2rem;
    padding: 4rem;
    color: var(--text-color-light);
}
</style>
