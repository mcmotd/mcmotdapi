<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { defaultConfig } from '../config/app.config.js';

const props = defineProps({
    serverData: {
        type: Object,
        required: true
    }
});

const width = ref(700);
const height = ref(389);
const darkMode = ref(false);
const copyButtonText = ref('复制');
const previewIframe = ref(null);

// ==================== [核心修复] embedUrl 逻辑恢复为简单直接 ====================
const embedUrl = computed(() => {
    // 这个组件不关心查询是否成功。
    // 它只负责根据接收到的 host (IP:Port) 生成URL。
    // 如果 host 不存在，则返回空，这是为了防止初始渲染时出错。
    if (!props.serverData?.host) {
        return '';
    }

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
    const fullBaseUrl = window.location.origin + defaultConfig.embed.baseUrl;
    return `${fullBaseUrl}?ip=${ip}&port=${port || ''}&dark=${darkMode.value}&source=mc-status-${ip}`;
});
// ==============================================================================

const iframeCode = computed(() => {
    if (!embedUrl.value) return '';
    const iframeId = `mc-status-${props.serverData.host.replace(':', '-')}`;
    const iframeTag = `<iframe id="${iframeId}" class="responsive-iframe" frameborder="0" width="${width.value}" height="${height.value}" scrolling="no" src="${embedUrl.value}"></iframe>`;
    const scriptTag = `
<script>
  window.addEventListener('message', function(event) {
    var iframe = document.getElementById('${iframeId}');
    if (event.source === iframe.contentWindow && event.data && event.data.type === 'resize-iframe') {
      iframe.style.height = event.data.height + 'px';
    }
  });
<\/script>`;
    return iframeTag + scriptTag;
});

const copyToClipboard = () => {
    if (!iframeCode.value) return;
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
    copyText(iframeCode.value)
        .then(() => {
            copyButtonText.value = '已复制!';
            setTimeout(() => (copyButtonText.value = '复制'), 2000);
        })
        .catch((err) => {
            copyButtonText.value = '复制失败';
            console.error('Could not copy text:', err);
        });
};

const handleIframeMessage = (event) => {
    if (
        previewIframe.value &&
        event.source === previewIframe.value.contentWindow &&
        event.data &&
        event.data.type === 'resize-iframe'
    ) {
        const requiredHeight = event.data.height;
        height.value = Math.round(requiredHeight);
    }
};

onMounted(() => {
    window.addEventListener('message', handleIframeMessage);
});
onUnmounted(() => {
    window.removeEventListener('message', handleIframeMessage);
});
</script>

<template>
    <div class="card generator-card">
        <h3>嵌入到你的网页</h3>
        <p class="description">调整下方选项以实时预览效果，然后复制生成的代码。</p>

        <div class="options-grid">
            <div class="form-group">
                <label for="embed-width">宽度 (px)</label>
                <input type="number" id="embed-width" class="form-input" v-model="width">
            </div>
            <div class="form-group">
                <label for="embed-height">高度 (px) - <span style="font-style: italic; color: #999;">自动调整</span></label>
                <input type="number" id="embed-height" class="form-input" v-model="height">
            </div>
            <div class="form-group checkbox-group">
                <input type="checkbox" id="dark-mode" class="form-checkbox" v-model="darkMode">
                <label for="dark-mode">暗色模式</label>
            </div>
        </div>

        <div class="preview-area">
            <h4>实时预览</h4>
            <div class="iframe-container" :style="{ height: height + 'px' }">
                <iframe ref="previewIframe" :key="embedUrl" :src="embedUrl" width="100%" :height="height"
                    frameborder="0" scrolling="no" style="display: block;">
                </iframe>
            </div>
        </div>

        <div class="code-area">
            <h4>复制代码</h4>
            <textarea readonly class="form-input code-display" :value="iframeCode"></textarea>
            <button class="btn btn-copy" @click="copyToClipboard">{{ copyButtonText }}</button>
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

.options-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1.5rem;
    align-items: flex-end;
    margin-bottom: 1.5rem;
}

.form-group {
    margin-bottom: 0;
}

label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
}

.form-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 1rem;
    font-family: inherit;
}

.checkbox-group {
    display: flex;
    align-items: center;
    padding-bottom: 0.75rem;
}

.form-checkbox {
    width: 1.25em;
    height: 1.25em;
    margin-right: 0.5rem;
}

.preview-area {
    width: 100%;
}

/* EmbedGenerator.vue */
.iframe-container {
    border: 1px dashed var(--border-color);
    border-radius: 8px;
    background-color: var(--background-color);
    margin: 1rem auto;
    /* [核心修复] 只对高度应用过渡动画，宽度调整保持即时响应 */
    transition: height 0.3s ease;
    box-sizing: border-box;
    /* [核心修复] 移除 max-width，让内联样式的 width 完全生效 */
    /* max-width: 700px; */
    overflow: hidden;
    max-width: 100%;
}

.iframe-container iframe {
    display: block;
    border: none;
    transition: height 0.3s ease;
    width: 100%;
    height: 100%;
}

.code-area {
    position: relative;
}

.code-display {
    width: 100%;
    height: 120px;
    resize: vertical;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.9rem;
    color: var(--text-color);
    background-color: var(--background-color);
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
}

.btn-copy {
    display: block;
    width: 100%;
    margin-top: 1rem;
    background-color: var(--primary-color);
    color: #fff;
}

.btn-copy:hover {
    background-color: var(--primary-color-hover);
}
</style>