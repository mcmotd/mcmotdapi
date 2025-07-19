<script setup>
import { ref, computed, onMounted } from 'vue';
import { defaultConfig } from '../config/app.config.js';
import axios from 'axios';

import AppHeader from '../components/AppHeader.vue';
import QueryForm from '../components/QueryForm.vue';
import ServerStatusDisplay from '../components/ServerStatusDisplay.vue';
import EmbedGenerator from '../components/EmbedGenerator.vue';
import AppFooter from '../components/AppFooter.vue';
import ImageLinkGenerator from '../components/ImageLinkGenerator.vue';
import JoinServerModal from '../components/JoinServerModal.vue';
import Contributors from '../components/Contributors.vue';

const isJoinModalVisible = ref(false);
const serverAddress = ref(defaultConfig.serverAddress);
const port = ref(defaultConfig.port);
const loading = ref(true);
const error = ref(null);
const data = ref(null);

const openJoinModal = () => {
    // 只有在查询成功后才打开弹窗
    if (data.value && data.value.status !== 'offline') {
        isJoinModalVisible.value = true;
    }
};

const handleFetchData = async (payload) => {
    serverAddress.value = payload.address;
    port.value = payload.port;

    loading.value = true;
    error.value = null;

    try {
        const apiUrl = `/api/status`;
        const response = await axios.get(apiUrl, {
            params: {
                ip: serverAddress.value,
                port: port.value || undefined
            }
        });
        data.value = response.data;
    } catch (err) {
        const errorMessage = '无法连接到查询后端或发生未知错误。';
        if (err.response && err.response.data && err.response.data.error) {
            error.value = err.response.data.error;
        } else {
            error.value = errorMessage;
        }

        // ==================== [核心修复] 失败对象必须包含 host ====================
        // 我们需要把用户尝试查询的地址 (payload) 传递下去，
        // 这样 EmbedGenerator 才能拿到 IP 和 Port 来生成 iframe。
        data.value = {
            status: 'offline',
            error: error.value,
            // 构造 host 字段
            host: `${payload.address}${payload.port ? ':' + payload.port : ''}`
        };
        // =======================================================================

        console.error(err);
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    handleFetchData({ address: serverAddress.value, port: port.value });
});
</script>

<template>
    <div class="app-wrapper">
        <div class="app-content">
            <AppHeader />
            <div class="main-content-area">
                <div class="top-content-block">
                    <div v-if="loading" class="card status-box">
                        <p>正在连接服务器...</p>
                    </div>
                    <ServerStatusDisplay v-else :server-data="data" @card-click="openJoinModal" />
                </div>

                <div class="bottom-content-block">
                    <QueryForm :initial-address="serverAddress" :initial-port="port" :loading="loading"
                        @start-query="handleFetchData" />
                </div>

                <div v-if="!loading" class="generators-section">
                    <EmbedGenerator :server-data="data" />
                    <ImageLinkGenerator :server-data="data" />
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