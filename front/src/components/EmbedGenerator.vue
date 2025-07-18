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
const height = ref(225);
const darkMode = ref(false);
const copyButtonText = ref('复制');

const embedUrl = computed(() => {
    if (!props.serverData?.host) return '';
    const [ip, port] = props.serverData.host.split(':');
    const fullBaseUrl = window.location.origin + defaultConfig.embed.baseUrl;
    return `${fullBaseUrl}?ip=${ip}&port=${port || ''}&dark=${darkMode.value}&source=mc-status-${ip}`;
});

const iframeCode = computed(() => {
    if (!embedUrl.value) return '';
    const iframeId = `mc-status-${props.serverData.host.split(':')[0]}`;
    const iframeTag = `<iframe id="${iframeId}" class="responsive-iframe"  frameborder="0" width="${width.value}" height="${height.value}" scrolling="no" src="${embedUrl.value}"></iframe>`;
    const scriptTag = `
<script>
  window.addEventListener('message', function(event) {
    var iframe = document.getElementById('${iframeId}');
    if (event.source === iframe.contentWindow && event.data && event.data.type === 'resize-iframe') {
      iframe.style.height = event.data.height + 'px';
    }
  });
<\/script>`;
    return iframeTag;
});

// const copyToClipboard = () => {
//     if (!iframeCode.value) return;
//     navigator.clipboard.writeText(iframeCode.value).then(() => {
//         copyButtonText.value = '已复制!';
//         setTimeout(() => {
//             copyButtonText.value = '复制';
//         }, 2000);
//     }).catch(err => {
//         copyButtonText.value = '复制失败';
//         console.error('Could not copy text: ', err);
//     });
// };

const copyToClipboard = () => {
    if (!iframeCode.value) return;

    // 工具：把字符串写入剪贴板，优先用 Clipboard API，不支持则降级
    const copyText = (text) => {
        // 1. HTTPS / localhost 场景
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        }

        // 2. HTTP 降级方案
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
        const requiredHeight = event.data.height + 32;
        height.value = Math.round(requiredHeight);
    }
};

const previewIframe = ref(null);
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
            <div class="iframe-container" :style="{ width: width + 'px', height: height + 'px' }">
                <iframe ref="previewIframe" v-if="embedUrl" :key="embedUrl" width="100%"
                    :style="{ height: height + 'px' }" :src="embedUrl" frameborder="0" scrolling="no">
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
/* [核心改动] 为卡片根元素显式设置字体 */
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

/* 输入框继承字体 */
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

.iframe-container {
    border: 1px dashed var(--border-color);
    border-radius: 8px;
    background-color: var(--background-color);
    margin: 1rem auto;
    transition: width 0.3s, height 0.3s;
    max-width: 100%;
    box-sizing: border-box;
}

.iframe-container iframe {
    display: block;
    border: none;
    transition: height 0.3s ease;
}

.code-area {
    position: relative;
}

/* 代码框使用等宽字体 */
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
    /* 按钮继承字体 */
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