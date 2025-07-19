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

// 这个 ref 用于引用内容的根元素，以便测量其高度
const embedWrapperRef = ref(null);

const isDarkMode = computed(() => route.query.dark === 'true');

// fetchData 函数本身不需要改变
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

// 这个函数负责测量自身高度并向父页面发送消息
const postHeight = () => {
    if (embedWrapperRef.value) {
        const height = embedWrapperRef.value.scrollHeight;
        // 使用 parent.postMessage 发送数据
        parent.postMessage({
            type: 'resize-iframe',
            height: height,
            source: route.query.source // 使用 query 中的 sourceId
        }, '*');
    }
};

let resizeObserver;

// [核心修复] onMounted 钩子函数
onMounted(() => {
    // 首先检查 URL 参数
    if (route.query.status === 'offline') {
        // 如果 URL 指示这是一个“失败”状态，我们就跳过 API 请求
        // 直接创建一个“失败对象”，用来渲染标语界面
        data.value = {
            status: 'offline',
            error: '服务器未响应或不存在'
        };
        // 并立即结束加载状态
        loading.value = false;
    } else {
        // 否则，才执行常规的数据获取流程
        fetchData();
    }

    // ResizeObserver 逻辑保持不变
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

// 当数据更新，DOM渲染完成后，也发送一次高度
watch(data, () => {
    nextTick(postHeight);
}, { deep: true }); // 使用 deep watch 以确保在嵌套对象变化时也能触发
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
/* [核心改动] .embed-wrapper 不再需要自己定义背景色，它会从 body 继承 */
.embed-wrapper {
    background-color: transparent;
    width: 100%;
    min-height: 100%;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1rem;
}

/* message-box 的样式也应使用变量 */
.message-box {
    padding: 1rem;
    font-size: 1rem;
    text-align: center;
    min-height: 100px;
    display: flex;
    justify-content: center;
    align-items: center;
    background: var(--card-background);
    /* 使用变量 */
    border-radius: 12px;
    box-shadow: 0 4px 25px var(--shadow-color);
}

.error-box {
    color: var(--error-color);
    background-color: var(--status-error-bg);
    /* 使用变量 */
}
</style>