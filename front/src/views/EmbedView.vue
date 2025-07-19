<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import { defaultConfig } from '../config/app.config.js';
import ServerStatusDisplay from '../components/ServerStatusDisplay.vue';

const route = useRoute();
const loading = ref(true);
const error = ref(null);
const data = ref(null);

const embedWrapperRef = ref(null);

const isDarkMode = computed(() => route.query.dark === 'true');

const fetchData = async () => {
    const serverIp = route.query.ip;
    const serverPort = route.query.port;

    if (!serverIp) {
        error.value = "URL中必须提供服务器IP参数。";
        loading.value = false;
        return;
    }
    try {
        const apiUrl = `${defaultConfig.api.baseUrl}/status`;
        const response = await axios.get(apiUrl, {
            params: { ip: serverIp, port: serverPort }
        });
        data.value = response.data;
    } catch (err) {
        if (err.response?.data?.error) {
            error.value = err.response.data.error;
        } else {
            error.value = '无法连接到查询后端。';
        }
        data.value = {
            status: 'offline',
            error: error.value
        };
        console.error(err);
    } finally {
        loading.value = false;
    }
};

const postHeight = () => {
    if (embedWrapperRef.value) {
        const height = embedWrapperRef.value.scrollHeight;
        parent.postMessage({
            type: 'resize-iframe',
            height: height,
            source: route.query.source
        }, '*');
    }
};

let resizeObserver;

onMounted(() => {
    if (route.query.status === 'offline') {
        data.value = {
            status: 'offline',
            error: '服务器未响应或不存在'
        };
        loading.value = false;
    } else {
        fetchData();
    }
    if (embedWrapperRef.value) {
        resizeObserver = new ResizeObserver(postHeight);
        resizeObserver.observe(embedWrapperRef.value);
    }
});

onUnmounted(() => {
    if (resizeObserver) {
        resizeObserver.disconnect();
    }
});

watch(data, () => {
    nextTick(postHeight);
}, { deep: true });
</script>

<template>
    <teleport to="head">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </teleport>

    <div class="embed-wrapper" :class="{ 'dark-theme': isDarkMode }" ref="embedWrapperRef">
        <div v-if="loading" class="message-box">查询中...</div>
        <div v-else-if="error" class="message-box error-box">{{ error }}</div>
        <ServerStatusDisplay v-else-if="data" :server-data="data" />
    </div>
</template>

<style scoped>
/* 新增 :global 样式，用于设置 iframe 内部的 html 和 body。
  这能确保我们的根容器可以占满整个 iframe 的可用空间。
*/
:global(html, body) {
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
    /* 防止意外出现滚动条 */
}

/* 修改 .embed-wrapper 样式 */
.embed-wrapper {
    background-color: transparent;
    width: 100%;
    height: 100%;
    /* 使用 height 替代 min-height */
    box-sizing: border-box;
    /* 移除 flex 布局和 padding，让内容自然填充 */
}

/* message-box 的样式保持不变，它只在加载和错误时出现 */
.message-box {
    height: 100%;
    /* 让加载和错误提示也能撑满容器 */
    padding: 1rem;
    font-size: 1rem;
    text-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
    background: var(--card-background);
    border-radius: 12px;
    box-shadow: 0 4px 25px var(--shadow-color);
}

.error-box {
    color: var(--error-color);
    background-color: var(--status-error-bg);
}
</style>