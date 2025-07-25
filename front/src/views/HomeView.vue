<script setup>
import { ref, computed, onMounted,watch } from 'vue';
import axios from 'axios';
import { useI18n } from 'vue-i18n';

// 获取 t 函数和当前的 locale
const { t, locale } = useI18n();

import AppHeader from '../components/AppHeader.vue';
import QueryForm from '../components/QueryForm.vue';
import ServerStatusDisplay from '../components/ServerStatusDisplay.vue';
import EmbedGenerator from '../components/EmbedGenerator.vue';
import AppFooter from '../components/AppFooter.vue';
import ImageLinkGenerator from '../components/ImageLinkGenerator.vue';
import JoinServerModal from '../components/JoinServerModal.vue';
import Contributors from '../components/Contributors.vue';
import { useConfig } from '../composables/useConfig';
import SideMenu from '../components/SideMenu.vue';

const config = useConfig();

const isJoinModalVisible = ref(false);
const serverAddress = ref('');
const port = ref('');
const loading = ref(true);
const error = ref(null);
const data = ref({});
const icon = ref(null);
// [核心改动 1] 新增状态，用于保存当前的查询类型
const serverType = ref('auto');
const isSRV = ref(false);
const openJoinModal = () => {
    // 增加一个条件：服务器类型不能是 'Java'
    if (data.value && data.value.status !== 'offline' && data.value.type !== 'Java') {
        isJoinModalVisible.value = true;
    }
};

// [核心改动 2] 更新 handleFetchData 函数以接收和处理所有新参数
const handleFetchData = async (payload) => {
    // 从 payload 中更新所有相关的状态
    serverAddress.value = payload.address;
    port.value = payload.port;
    serverType.value = payload.serverType;
    isSRV.value = payload.isSRV;

    loading.value = true;
    error.value = null;

    try {
        const apiUrl = `/api/status`;
        // [核心改动 3] 将所有参数都发送给后端
        const response = await axios.get(apiUrl, {
            params: {
                ip: serverAddress.value,
                port: port.value || undefined,
                stype: serverType.value,
                srv: isSRV.value
            }
        });
        data.value = response.data;
    } catch (err) {
        const errorMessage = t("view.home.errorMsg");
        error.value = err.response?.data?.error || errorMessage;

        // 在失败时，依然构造一个包含查询信息的对象，以便其他组件使用
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

// 在 HomeView.vue 的 <script setup> 中
watch(config, (newConfig) => {

    // [防御性编程] 在使用 newConfig 之前，先进行严格的检查
    if (newConfig && newConfig.serverAddress && newConfig.port) {
        serverAddress.value = newConfig.serverAddress;
        port.value = newConfig.port;
        handleFetchData({
            address: serverAddress.value,
            port: port.value,
            serverType: 'auto',
            isSRV: false
        });
    } else if (newConfig) {
        // 如果 newConfig 存在但缺少必要属性
        console.error('[HomeView] 收到的配置对象不完整:', newConfig);
    }

}, { immediate: true });
</script>

<template>
    <div class="app-wrapper">
        <div class="app-content">
            <AppHeader />
            <div class="main-content-area">
                <!-- <div class="top-content-block">
                    <div v-if="loading" class="card status-box">
                        <p>{{$t('view.home.connectingMsg')}}</p>
                    </div>
                    <ServerStatusDisplay v-else :server-data="data" @card-click="openJoinModal" />
                </div> -->

                <div class="top-content-block">
                    <ServerStatusDisplay :server-data="data" :loading="loading" @card-click="openJoinModal" />
                </div>

                <div class="bottom-content-block">
                    <QueryForm :initial-address="serverAddress" :initial-port="port" :loading="loading"
                        @start-query="handleFetchData" />
                </div>

                <div v-if="!loading" class="generators-section">
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
        <SideMenu />
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