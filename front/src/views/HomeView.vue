<script setup>
import { ref, computed, onMounted } from 'vue';
import { defaultConfig } from '../config/app.config.js';
import axios from 'axios'; // 1. 导入 axios

// 导入所有需要的组件
import AppHeader from '../components/AppHeader.vue';
import QueryForm from '../components/QueryForm.vue';
import ServerStatusDisplay from '../components/ServerStatusDisplay.vue';
import EmbedGenerator from '../components/EmbedGenerator.vue';
import AppFooter from '../components/AppFooter.vue';

const serverAddress = ref(defaultConfig.serverAddress);
const port = ref(defaultConfig.port);
const loading = ref(true); // 初始为 true，因为 onMounted 会立即查询
const error = ref(null);
const data = ref(null);

// [核心改动] 重写 handleFetchData 函数
const handleFetchData = async (payload) => {
    serverAddress.value = payload.address;
    port.value = payload.port;

    loading.value = true;
    error.value = null;
    data.value = null;

    try {
        // 2. 使用 axios 调用我们后端的智能查询 API
        const apiUrl = `/api/status`;
        const response = await axios.get(apiUrl, {
            params: {
                ip: serverAddress.value,
                port: port.value || undefined // 如果 port 为空字符串，则不发送该参数
            }
        });
        data.value = response.data;
    } catch (err) {
        // 3. 处理来自后端的错误信息
        if (err.response && err.response.data && err.response.data.error) {
            error.value = err.response.data.error;
        } else {
            error.value = '无法连接到查询后端或发生未知错误。';
        }
        console.error(err);
    } finally {
        // 4. 无论成功或失败，都结束加载状态
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
                    <div v-else-if="error" class="card status-box error-box">
                        <strong>错误</strong>
                        <p>{{ error }}</p>
                    </div>
                    <ServerStatusDisplay v-else-if="data" :server-data="data" />
                </div>
                <div class="bottom-content-block">
                    <QueryForm :initial-address="serverAddress" :initial-port="port" :loading="loading"
                        @start-query="handleFetchData" />
                </div>
                <div class="generator-container" v-if="data">
                    <EmbedGenerator :server-data="data" />
                </div>
            </div>
        </div>
        <AppFooter />
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

@media (max-width: 768px) {
    .top-content-block {
        margin-top: 2rem;
    }
}

.generator-container {
    margin-top: 2rem;
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