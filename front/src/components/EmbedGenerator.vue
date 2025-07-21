<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
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
const copyButtonText_iframeCode = ref('复制');
const copyButtonText_iframeUrl = ref('复制');
const previewIframe = ref(null);

// [核心改动 1] 新增 ref 用于绑定图标URL输入框
const iconUrl = ref('');

// [核心改动 2] 使用 watch 侦听器，当服务器数据变化时，自动填充图标URL
watch(() => props.serverData.icon, (newIcon) => {
    // 只填充有效的 http/https URL，忽略 base64 或其他无效值
    if (newIcon && /^https?:\/\/.+/.test(newIcon)) {
        iconUrl.value = newIcon;
    } else {
        iconUrl.value = ''; // 如果服务器数据没有有效的URL图标，则清空输入框
    }
}, { immediate: true }); // immediate: true 确保组件加载时立即执行一次

// [核心改动 3] embedUrl 计算属性现在使用我们自己的 iconUrl ref
const embedUrl = computed(() => {
    if (!props.serverData?.host) {
        return '';
    }

    const host = props.serverData.host;
    let ip, port;

    const ipv6Match = host.match(/^\[([a-fA-F0-9:]+)\]:(\d+)$/);
    if (ipv6Match) {
        ip = ipv6Match[1];
        port = ipv6Match[2];
    } else {
        const parts = host.split(':');
        ip = parts[0];
        port = parts.length > 1 ? parts[parts.length - 1] : '';
    }

    // 使用来自输入框的 iconUrl.value
    const icon = iconUrl.value;
    const isHttpUrl = (url) => url && /^https?:\/\/.+\..+/.test(url);
    const iconParam = isHttpUrl(icon) ? `&icon=${encodeURIComponent(icon)}` : '';

    const fullBaseUrl = window.location.origin + defaultConfig.embed.baseUrl;
    return `${fullBaseUrl}?ip=${ip}&port=${port || ''}&dark=${darkMode.value}&source=mc-status-${ip}${iconParam}`;
});

const iframeCode = computed(() => {
    if (!embedUrl.value) return '';
    const iframeId = `mc-status-${props.serverData.host.replace(/[:.]/g, '-')}`;
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

const iframeUrl = ref('');
// [核心修复] 2. 使用 watch 监听 serverData 的变化，来自动更新 imageUrl 的值
// 这样既保留了自动生成的功能，也允许用户手动修改
watch(() => props.serverData, (newServerData) => {
    if (!props.serverData?.host) {
        return '';
    }

    const host = props.serverData.host;
    let ip, port;

    const ipv6Match = host.match(/^\[([a-fA-F0-9:]+)\]:(\d+)$/);
    if (ipv6Match) {
        ip = ipv6Match[1];
        port = ipv6Match[2];
    } else {
        const parts = host.split(':');
        ip = parts[0];
        port = parts.length > 1 ? parts[parts.length - 1] : '';
    }

    // 使用来自输入框的 iconUrl.value
    const icon = iconUrl.value;
    const isHttpUrl = (url) => url && /^https?:\/\/.+\..+/.test(url);
    const iconParam = isHttpUrl(icon) ? `&icon=${encodeURIComponent(icon)}` : '';

    const apiUrl = `/api/iframe_img?ip=${ip}&port=${port || ''}&dark=${darkMode.value}&source=mc-status-${ip}${iconParam}`;
    iframeUrl.value = apiUrl;
}, { immediate: true }); // immediate: true 确保组件初始加载时也能执行一次

const copyToClipboard = (textInputValue,copyButtonText) => {
    if (!textInputValue) return;
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
    copyText(textInputValue)
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

const copyToClipboard_iframeCode = () => { 
    copyToClipboard(iframeCode.value,copyButtonText_iframeCode);
};

const copyToClipboard_iframeUrl = () => { 
    copyToClipboard(window.location.origin + iframeUrl.value,copyButtonText_iframeUrl);
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
                <label for="embed-height">高度 (px) - <span class="label-hint">自动调整</span></label>
                <input type="number" id="embed-height" class="form-input" v-model="height">
            </div>
            <div class="form-group icon-group">
                <label for="embed-icon">图标 URL (可选)</label>
                <input type="text" id="embed-icon" class="form-input" v-model="iconUrl"
                    placeholder="https://example.com/icon.png">
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
            <button class="btn btn-copy" @click="copyToClipboard_iframeCode">{{ copyButtonText_iframeCode }}</button>
        </div>

        <div class="code-area">
            <h4>复制图片链接</h4>
            <input type="text" class="form-input-url" v-model="iframeUrl">
            <button class="btn btn-copy" @click="copyToClipboard_iframeUrl">{{ copyButtonText_iframeUrl }}</button>
        </div>
    </div>
</template>

<style scoped>
/* ... (样式部分保持不变，仅为网格布局和标签提示稍作调整) ... */
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
    /* 调整网格以更好地适应新项目 */
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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

.label-hint {
    font-style: italic;
    color: #999;
}

.form-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 1rem;
    font-family: inherit;
}

.form-input-url {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 1rem;
    font-family: 'Courier New', Courier, monospace;
    flex-grow: 1;
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

.iframe-container {
    border: 1px dashed var(--border-color);
    border-radius: 8px;
    background-color: var(--background-color);
    margin: 1rem auto;
    transition: height 0.3s ease;
    box-sizing: border-box;
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

/* 确保图标输入框能很好地融入网格 */
@media (min-width: 680px) {
    .icon-group {
        grid-column: 1 / -1;
        /* 在较宽屏幕上，让图标输入框占据整行 */
    }
}
</style>