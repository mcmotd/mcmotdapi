<script setup>
import { ref, computed } from 'vue';
import { useConfig } from '../composables/useConfig';
import DashboardPanel from '../components/admin/DashboardPanel.vue';
import ConfigEditor from '../components/admin/ConfigEditor.vue';

const config = useConfig();
const isLoading = computed(() => !config.value);

// 控制当前显示的标签页
const activeTab = ref('dashboard');

// 定义一个方法来强制刷新配置，当子组件修改成功后调用
const refreshConfig = () => {
    // useConfig 内部是响应式的，理论上更新后会自动反应。
    // 如果需要强制重新获取，可以在 useConfig composable 中实现一个 reload 方法。
    // 目前，我们假设子组件修改后，config 的响应性能正常工作。
    console.log('配置已更新，数据已刷新。');
};
</script>

<template>
    <div class="admin-container">
        <header class="admin-header">
            <h1>管理员面板</h1>
            <nav class="admin-tabs">
                <button @click="activeTab = 'dashboard'" :class="{ active: activeTab === 'dashboard' }">数据面板</button>
                <button @click="activeTab = 'editor'" :class="{ active: activeTab === 'editor' }">配置修改</button>
            </nav>
        </header>

        <main class="admin-content">
            <div v-if="isLoading" class="loading-panel">正在加载配置...</div>
            <div v-else>
                <div v-show="activeTab === 'dashboard'">
                    <DashboardPanel :config="config" />
                </div>
                <div v-show="activeTab === 'editor'">
                    <ConfigEditor :config="config" @config-updated="refreshConfig" />
                </div>
            </div>
        </main>
    </div>
</template>

<style scoped>
.admin-container {
    max-width: 1000px;
    margin: 2rem auto;
    padding: 0 1rem;
    font-family: 'Noto Sans SC', sans-serif;
}

.admin-header {
    border-bottom: 2px solid var(--border-color);
    padding-bottom: 1rem;
    margin-bottom: 2rem;
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