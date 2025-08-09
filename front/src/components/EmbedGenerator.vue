<script setup>
import { ref, computed, watch ,onMounted,onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useConfig } from '../composables/useConfig';
// [新增] 导入 ServerStatusDisplay 组件
import ServerStatusDisplay from '../components/ServerStatusDisplay.vue';

const { t } = useI18n();
const config = useConfig();

const props = defineProps({
    serverData: { type: Object, required: true },
    address: String,
    port: String,
    serverType: String,
    isSrv: Boolean,
});

// --- 状态 ---
const width = ref(700);
// [移除] height 和相关的 postMessage 逻辑不再需要
const height = ref(389);
const darkMode = ref(false);
const copyButtonText = ref(t("comp.embedG.copy"));
const iconUrl = ref('');

// --- 计算属性 ---

// [新增] 创建一个专门给预览组件使用的数据源
const previewData = computed(() => {
    // 创建一个 props.serverData 的副本，避免直接修改 props
    const data = { ...props.serverData };
    // 如果用户输入了有效的自定义图标URL，就覆盖 serverData 中的 icon
    if (iconUrl.value && /^https?:\/\/.+/.test(iconUrl.value)) {
        data.icon = iconUrl.value;
    }
    return data;
});


// embedUrl 仍然需要，用于生成最终的 iframe 代码
const embedUrl = computed(() => {
    if (!props.address || !config.value) return '';
    const params = new URLSearchParams();
    params.append('ip', props.address);
    if (props.port) params.append('port', props.port);
    if (props.serverType) params.append('stype', props.serverType);
    if (props.isSrv) params.append('srv', String(props.isSrv));
    params.append('dark', String(darkMode.value));
    if (iconUrl.value && /^https?:\/\/.+/.test(iconUrl.value)) {
        params.append('icon', iconUrl.value);
    }
    params.append('source', `mc-status-${props.address}`);
    const fullBaseUrl = window.location.origin + config.value.embed.baseUrl;
    return `${fullBaseUrl}?${params.toString()}`;
});


// iframeCode 计算属性逻辑不变
// const iframeCode = computed(() => {
//     if (!embedUrl.value) return '';
//     // ... (此部分逻辑不变)
//     const uniqueId = `${props.address}-${props.port || ''}`.replace(/[:.]/g, '-');
//     const iframeId = `mc-status-${uniqueId}`;
//     const iframeTag = `<iframe id="${iframeId}" frameborder="0" width="${width.value}" style="max-width:100%;" scrolling="no" src="${embedUrl.value}"></iframe>`;
//     const scriptTag = `
//     <script>
//         window.addEventListener('message', function(event) {
//             var iframe = document.getElementById('${iframeId}');
//             if (event.source === iframe.contentWindow && event.data && event.data.type === 'resize-iframe') {
//                 iframe.style.height = event.data.height + 'px';
//             }
//         });
//     <\/script>`;
//     return iframeTag + scriptTag;
// });

const iframeCode = computed(() => {
    if (!embedUrl.value) return '';
    const uniqueId = `${props.address}-${props.port || ''}`.replace(/[:.]/g, '-');
    const iframeId = `mc-status-${uniqueId}`;
    // [修改] 添加 height 属性，并使用 width.value 和 height.value
    const iframeTag = `<iframe id="${iframeId}" frameborder="0" width="${width.value}" height="${height.value}" style="max-width:100%;" scrolling="no" src="${embedUrl.value}"></iframe>`;
    const scriptTag = `
    <script>
        window.addEventListener('message', function(event) {
            var iframe = document.getElementById('${iframeId}');
            if (event.source === iframe.contentWindow && event.data && event.data.type === 'resize-iframe') {
                iframe.style.height = event.data.height + 'px';
            }
        });
    <\/script>`;
    return iframeTag ;//+ scriptTag;
});


// --- 方法 & 生命周期钩子 ---

// [移除] 不再需要 handleIframeMessage 和相关的 onMounted/onUnmounted
// onMounted(() => { window.addEventListener('message', handleIframeMessage); });
// onUnmounted(() => { window.removeEventListener('message', handleIframeMessage); });


// ... (copyToClipboard 和 handleIframeMessage 等其余函数保持不变)
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
            copyButtonText.value = t('comp.embedG.copyed');
            setTimeout(() => (copyButtonText.value = t("comp.embedG.copy")), 2000);
        })
        .catch((err) => {
            copyButtonText.value = t("comp.embedG.copyFailed");
        });
};
const handleIframeMessage = (event) => {
    if (previewIframe.value && event.source === previewIframe.value.contentWindow && event.data && event.data.type === 'resize-iframe') {
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
        <h3>{{ $t("comp.embedG.title") }}</h3>
        <p class="description">{{ $t("comp.embedG.description") }}</p>

        <div class="options-grid">
            <div class="form-group">
                <label for="embed-width">{{ $t("comp.embedG.width") }} (px)</label>
                <input type="number" id="embed-width" class="form-input" v-model="width">
            </div>
            <div class="form-group icon-group">
                <label for="embed-icon">{{ $t("comp.embedG.iconUrl") }}</label>
                <input type="text" id="embed-icon" class="form-input" v-model="iconUrl"
                    placeholder="https://example.com/icon.png">
            </div>
            <div class="form-group checkbox-group">
                <input type="checkbox" id="dark-mode" class="form-checkbox" v-model="darkMode">
                <label for="dark-mode">{{ $t("comp.embedG.darkMode") }}</label>
            </div>
        </div>

        <div class="preview-area">
            <h4>{{ $t("comp.embedG.preview") }}</h4>
            <div class="component-preview-container" :class="{ 'dark-theme': darkMode }"
                :style="{ maxWidth: width + 'px' }">
                <ServerStatusDisplay :server-data="previewData" :loading="props.loading" />
            </div>
        </div>

        <div class="code-area">
            <h4>{{ $t("comp.embedG.copyCode") }}</h4>
            <textarea readonly class="form-input code-display" :value="iframeCode"></textarea>
            <button class="btn btn-copy" @click="copyToClipboard">{{ copyButtonText }}</button>
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

.component-preview-container {
    border: 1px dashed var(--border-color);
    border-radius: 8px;
    background-color: var(--background-color);
    padding: 1rem;
    margin-top: 1rem;
    /* [新增] 自动外边距，使其水平居中 */
    margin-left: auto;
    margin-right: auto;
    /* [新增] 过渡效果，让宽度变化更平滑 */
    transition: max-width 0.3s ease;
}

/* [新增] 模拟暗黑模式
  当 .dark-theme 类被应用时，它会应用和您全局 html.dark 一样的 CSS 变量。
  确保这里的变量和您主样式文件中的暗黑模式变量一致。
*/
.dark-theme {
    --card-background: #2a2a2a;
    --background-color: #1f1f1f;
    --text-color: #e0e0e0;
    --text-color-light: #a0a0a0;
    --border-color: #444;
    --shadow-color: rgba(0, 0, 0, 0.25);
    --success-color: #4caf50;
    --status-offline-color: #757575;
}

/* ... (其他样式) ... */
.options-grid {
    display: grid;
    /* [修改] 调整网格以适应更少的项目 */
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    align-items: flex-end;
    margin-bottom: 1.5rem;
}

@media (min-width: 680px) {
    .icon-group {
        grid-column: 1 / -1;
    }
}

/* 确保图标输入框能很好地融入网格 */
@media (min-width: 680px) {
    .icon-group {
        grid-column: 1 / -1;
        /* 在较宽屏幕上，让图标输入框占据整行 */
    }
}
</style>