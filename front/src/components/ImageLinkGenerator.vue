<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
    serverData: {
        type: Object,
        required: true,
    },
    loading: {
        type: Boolean,
        default: false,
    },
});

const copyButtonText = ref('复制');

// [核心修复] 1. 将 imageUrl 从 computed 改为 ref，使其可以被 v-model 修改
const imageUrl = ref('');

// [核心修复] 2. 使用 watch 监听 serverData 的变化，来自动更新 imageUrl 的值
// 这样既保留了自动生成的功能，也允许用户手动修改
watch(() => props.serverData, (newServerData) => {
    if (!newServerData?.host) {
        imageUrl.value = '';
        return;
    }
    // const [ip, port] = newServerData.host.split(':');
    const host = props.serverData.host;
    let ip, port;

    // 匹配 IPv6 格式：[::1]:19132
    const ipv6Match = host.match(/^\[([a-fA-F0-9:]+)\]:(\d+)$/);
    if (ipv6Match) {
        ip = ipv6Match[1];
        port = ipv6Match[2];
    } else {
        // IPv4 或简单端口分割
        const parts = host.split(':');
        ip = parts.slice(0, -1).join(':'); // 兼容 IPv6 没有端口的情况（不常见）
        port = parts[parts.length - 1];
    }

    const apiUrl = `/api/status_img?ip=${ip}&port=${port || ''}`;
    imageUrl.value = apiUrl;
}, { immediate: true }); // immediate: true 确保组件初始加载时也能执行一次

const copyToClipboard = () => {
    // ... (复制逻辑保持不变)
    if (!imageUrl.value) return;
    const copyText = (text) => {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        }
        return new Promise((resolve, reject) => {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try {
                const ok = document.execCommand('copy');
                document.body.removeChild(ta);
                ok ? resolve() : reject(new Error('execCommand failed'));
            } catch (e) {
                document.body.removeChild(ta);
                reject(e);
            }
        });
    };
    copyText(window.location.origin + imageUrl.value)
        .then(() => {
            copyButtonText.value = '已复制!';
            setTimeout(() => (copyButtonText.value = '复制'), 2000);
        })
        .catch((err) => {
            copyButtonText.value = '复制失败';
            console.error('Could not copy text:', err);
        });
};
</script>

<template>
    <div class="card generator-card">
        <h3>生成状态图片链接</h3>
        <p class="description">复制下方链接，你可以将其用于论坛签名档或 Markdown 文档中。</p>

        <div class="input-with-button">
            <input type="text" class="form-input" v-model="imageUrl">
            <button class="btn btn-copy-link" @click="copyToClipboard">{{ copyButtonText }}</button>
        </div>

        <div class="preview-area">
            <h4>图片预览</h4>
            <div class="image-container" :class="{ 'is-loading': loading }">
                <img v-if="imageUrl" :src="imageUrl" alt="Server Status Image" class="status-image">
            </div>
        </div>
    </div>
</template>

<style scoped>
.card.generator-card {
    font-family: 'Noto Sans SC', sans-serif;
    background-color: var(--card-background);
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 4px 25px var(--shadow-color);
}

h3 {
    font-weight: 700;
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
}

h4 {
    font-weight: 700;
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
    margin-top: 2rem;
    border-top: 1px solid var(--border-color);
    padding-top: 1.5rem;
}

.description {
    color: var(--text-color-light);
    margin-bottom: 2rem;
}

.form-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 1rem;
    font-family: 'Courier New', Courier, monospace;
    flex-grow: 1;
}

.input-with-button {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}

.btn {
    padding: 0.8rem 1rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: background-color 0.2s;
    font-family: inherit;
    white-space: nowrap;
}

.btn-copy-link {
    background-color: var(--primary-color);
    color: #fff;
}

.btn-copy-link:hover {
    background-color: var(--primary-color-hover);
}

.image-container {
    margin-top: 1rem;
    border: 1px dashed var(--border-color);
    border-radius: 8px;
    padding: 1rem;
    min-height: 100px;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--background-color);
    position: relative;
    transition: opacity 0.3s ease;
}

.status-image {
    max-width: 100%;
    height: auto;
}

.image-container.is-loading {
    opacity: 0.5;
}

.image-container.is-loading::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 32px;
    height: 32px;
    margin: -16px 0 0 -16px;
    border: 4px solid var(--border-color);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>