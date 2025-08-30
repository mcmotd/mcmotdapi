<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useConfig } from '../composables/useConfig';
// 导入 ServerStatusDisplay 组件用于预览
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
const darkMode = ref(false);
const iconUrl = ref('');
const copyButtonText = ref(t("comp.embedG.copy"));


// --- 计算属性 ---

// 创建一个专门给预览组件使用的数据源
const previewData = computed(() => {
    const data = { ...props.serverData };
    // 如果用户提供了有效的自定义图标URL，则在预览中覆盖它
    if (iconUrl.value && /^https?:\/\/.+/.test(iconUrl.value)) {
        data.icon = iconUrl.value;
    }
    return data;
});

// embedUrl 用于生成最终的 iframe 的 src
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
    const fullBaseUrl = window.location.origin + config.value.embed.baseUrl;
    return `${fullBaseUrl}?${params.toString()}`;
});

// 生成最终提供给用户复制的完整嵌入代码
const iframeCode = computed(() => {
    if (!embedUrl.value) return '';

    // 使用地址和端口生成一个唯一的 ID
    const uniqueId = `mc-status-${props.address}-${props.port || ''}`.replace(/[:.]/g, '-');

    // 移除 height 属性，让脚本来完全控制高度，避免页面加载时抖动
    const iframeTag = `<iframe id="${uniqueId}" frameborder="0" width="${width.value}" style="max-width:100%;" scrolling="no" src="${embedUrl.value}"></iframe>`;

    // 这是让 iframe 高度自适应的关键脚本
    const scriptTag = `
    <script>
        window.addEventListener('message', function(event) {
            var iframe = document.getElementById('${uniqueId}');
            if (iframe && event.source === iframe.contentWindow && event.data && event.data.type === 'resize-iframe') {
                iframe.style.height = event.data.height + 'px';
            }
        });
    <\/script>`; // 使用单个反斜杠进行转义，这是最标准和清晰的做法

    // 将 iframe 标签和 script 标签一起返回
    return iframeTag;// + scriptTag;
});


// --- 方法 ---

const copyToClipboard = () => {
    // ... (复制逻辑保持不变)
    if (!iframeCode.value) return;
    const copyText = (text) => {
        if (navigator.clipboard && window.isSecureContext) {
            try{
                return navigator.clipboard.writeText(text);
            }catch{}
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
            // console.error('Could not copy text:', err);
        });
};


// const copyToClipboard = () => {
//if      (!iframeCode.value) return;
//     navigator.clipboard.writeText(iframeCode.value)
//         .then(() => {
//             copyButtonText.value = t('comp.embedG.copyed');
//             setTimeout(() => (copyButtonText.value = t("comp.embedG.copy")), 2000);
//         })
//         .catch(() => {
//             copyButtonText.value = t("comp.embedG.copyFailed");
//         });
// };
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
                <ServerStatusDisplay :server-data="previewData" :has-queried="true" :loading="false" />
                <div class="preview-overlay">{{ $t("comp.embedG.previewText") }}</div>
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
/* 样式部分保持不变 */
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
    position: relative;
    /* Ensure positioning context for the overlay */
}

.component-preview-container {
    border: 1px dashed var(--border-color);
    border-radius: 8px;
    background-color: var(--background-color);
    padding: 1rem;
    margin-top: 1rem;
    margin-left: auto;
    margin-right: auto;
    transition: max-width 0.3s ease;
    overflow: hidden;
    position: relative;
    /* For positioning the overlay */
}

.preview-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(128, 128, 128, 0.2);
    /* 更淡的灰色 */
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1.5rem;
    font-weight: bold;
    text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5);
    pointer-events: none;
    border-radius: inherit;
}

.preview-overlay.small {
    font-size: 1rem;
    background-color: rgba(128, 128, 128, 0.3);
    /* 更淡的灰色 */
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
</style>