<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import ServerStatusDisplay from '../components/ServerStatusDisplay.vue';
import { useI18n } from 'vue-i18n';

// 获取 t 函数和当前的 locale
const { t, locale } = useI18n();
const route = useRoute();
const loading = ref(true);
const error = ref(null);
const data = ref(null);

const embedWrapperRef = ref(null);

let isSystemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
const isDarkMode = computed(() => route.query.dark === 'true' ? true : route.query.dark === 'auto' ? isSystemDark : false);

// [核心修复] 使用 onMounted 和 onUnmounted 动态修改 iframe 内部的样式
onMounted(() => {
    // 这段JS只会对当前组件所在的文档生效（即iframe的文档）
    document.documentElement.style.height = '100%';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.height = '100%';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => isSystemDark = e.matches)
});

onUnmounted(() => {
    // 组件卸载时恢复默认样式（主要在开发模式的热重载中有用）
    document.documentElement.style.height = '';
    document.documentElement.style.overflow = '';
    document.body.style.height = '';
    document.body.style.margin = '';
    document.body.style.padding = '';
    window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', e => isSystemDark = e.matches)
});


const fetchData = async () => {
    const serverIp = route.query.ip;
    const serverPort = route.query.port;
    const icon = route.query.icon;
    const serverType = route.query.stype;
    const isSrv = route.query.srv;


    if (!serverIp) {
        error.value = t("view.embed.noServerIpMsg");
        loading.value = false;
        return;
    }
    try {
        const apiUrl = `/api/status`;
        const response = await axios.get(apiUrl, {
            params: { ip: serverIp, port: serverPort, icon,stype:serverType, srv: isSrv }
        });
        data.value = response.data;
    } catch (err) {
        if (err.response?.data?.error) {
            error.value = err.response.data.error;
        } else {
            error.value = t('view.embed.unableConnectMsg');
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
            error: t("view.embed.offlineMsg")
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
        <div v-if="loading" class="message-box">{{ $t('view.embed.loadingMsg') }}</div>
        <div v-else-if="error" class="message-box error-box">{{ error }}</div>
        <ServerStatusDisplay v-else-if="data" :server-data="data" :has-queried="true" />
    </div>
</template>

<style scoped>
/* [已移除] 不再需要 :global 样式，因为它会影响主页面 */

/* 修改 .embed-wrapper 样式 */
.embed-wrapper {
    background-color: var(--background-color);
    width: 100%;
    height: 100%;
    min-height: 100vh;          /* 加强版，防塌陷 */
    padding: 20px;   /* 这里是真注释/doge */
                     /* 为什么要加边距呢？ */
                     /* 我觉得不加边距的话配上圆角、阴影和浮动效果太奇怪了 */
                     /* 要么就把那些去掉吧 */
    box-sizing: border-box;
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