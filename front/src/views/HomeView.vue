<script setup>
import { ref, computed, watch } from 'vue'; // watch 已被重新引入
import axios from 'axios';
import { useI18n } from 'vue-i18n';

import AppHeader from '../components/AppHeader.vue';
import QueryForm from '../components/QueryForm.vue';
import ServerStatusDisplay from '../components/ServerStatusDisplay.vue';
import EmbedGenerator from '../components/EmbedGenerator.vue';
import AppFooter from '../components/AppFooter.vue';
import ImageLinkGenerator from '../components/ImageLinkGenerator.vue';
import JoinServerModal from '../components/JoinServerModal.vue';
import Contributors from '../components/Contributors.vue';
import { useConfig } from '../composables/useConfig';

const { t } = useI18n();
const config = useConfig();

const isJoinModalVisible = ref(false);
const serverAddress = ref('');
const port = ref('');
const loading = ref(false);
const error = ref(null);
const data = ref({});
const serverType = ref('auto');
const isSRV = ref(false);
const hasQueried = ref(false);

const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
if(isDarkMode) document.body.classList.add('dark-theme');

const isServerOnline = computed(() => {
    return data.value && data.value.version && data.value.status !== 'offline';
});

const openJoinModal = () => {
    if (data.value && data.value.status !== 'offline' && data.value.type !== 'Java') {
        isJoinModalVisible.value = true;
    }
};

const handleFetchData = async (payload) => {
    hasQueried.value = true;
    serverAddress.value = payload.address;
    port.value = payload.port;
    serverType.value = payload.serverType;
    isSRV.value = payload.isSRV;

    loading.value = true;
    error.value = null;
    data.value = {};

    try {
        const apiUrl = `/api/status`;
        const response = await axios.get(apiUrl, {
            params: {
                ip: serverAddress.value,
                port: port.value || undefined,
                stype: serverType.value,
                srv: isSRV.value
            },
            headers: {
                'X-Internal-Request': 'true'
            }
        });
        data.value = response.data;
    } catch (err) {
        const errorMessage = t("view.home.errorMsg");
        error.value = err.response?.data?.error || errorMessage;
        data.value = {
            status: 'offline',
            error: error.value,
            host: `${payload.address}${payload.port ? ':' + payload.port : ''}`,
            port: payload.port,
            address: payload.address
        };
        console.error(err);
    } finally {
        loading.value = false;
    }
};

// [核心修改] 重新启用 watch 侦听器，用于在应用加载时处理默认服务器逻辑
watch(config, (newConfig) => {
    if (!newConfig) return;

    // 检查 defaultServer 配置
    const { defaultServer } = newConfig;
    if (defaultServer && defaultServer.enable === true && defaultServer.host) {
        // 如果启用，则使用默认值并自动执行一次查询
        const host = defaultServer.host;
        const portVal = defaultServer.port ? String(defaultServer.port) : '';

        handleFetchData({
            address: host,
            port: portVal,
            serverType: 'auto',
            isSRV: false
        });
    }
    // 如果不满足条件，则什么都不做，等待用户手动查询
}, { immediate: true }); // immediate: true 确保在加载时立即运行

</script>

<template>
    <div class="app-wrapper">
        <div class="app-content">
            <AppHeader />
            <div class="main-content-area">
                <div class="top-content-block">
                    <ServerStatusDisplay :server-data="data" :loading="loading" :has-queried="hasQueried"
                        @card-click="openJoinModal" />
                </div>

                <div class="bottom-content-block">
                    <QueryForm :initial-address="serverAddress" :initial-port="port" :loading="loading"
                        @start-query="handleFetchData" />
                </div>

                <div v-if="!loading && isServerOnline" class="generators-section">
                    <EmbedGenerator :server-data="data" :address="serverAddress" :port="port" :server-type="serverType"
                        :is-srv="isSRV" />
                    <ImageLinkGenerator :server-data="data" :loading="loading" :address="serverAddress" :port="port"
                        :server-type="serverType" :is-srv="isSRV" />
                </div>
                <Contributors />
            </div>
        </div>
        <AppFooter />
        <JoinServerModal :show="isJoinModalVisible" :server-data="data" @close="isJoinModalVisible = false" />
    </div>
</template>

<style scoped>
.app-wrapper {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
}

.app-content {
    flex-grow: 1;
}

.main-content-area {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 1rem 2rem 1rem;
    position: relative;
}

.top-content-block {
    position: relative;
    z-index: 10;
    margin-top: -80px;
}

.bottom-content-block {
    margin-top: 2rem;
}

.generators-section {
    margin-top: 2rem;
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem;
}

@media (max-width: 768px) {
    .top-content-block {
        margin-top: 2rem;
    }
}

.card {
    background-color: var(--card-background);
    border-radius: 12px;
    box-shadow: 0 4px 25px var(--shadow-color);
}

.status-box {
    padding: 2rem;
    text-align: center;
    font-size: 1.1rem;
}

.error-box {
    color: var(--error-color);
    background-color: #fbebee;
}
</style>