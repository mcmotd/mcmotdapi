<script setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
// [新增] 引入 useConfig Hook
import { useConfig } from '../composables/useConfig';

const { t } = useI18n();
// [新增] 获取全局配置
const config = useConfig();
// 获取 t 函数和当前的 locale
const props = defineProps({
    serverData: {
        type: Object,
        required: true,
    },
    loading: {
        type: Boolean,
        default: false,
    },
    address: String,
    port: String,
    serverType: String,
    isSrv: Boolean,
});

const copyButtonText = ref(t('comp.imgG.copy'));
const imageUrl = ref('');

// [新增] 存储当前选中的主题
const selectedTheme = ref('');

// [新增] 从全局配置中安全地获取可用主题列表
const availableThemes = computed(() => config.value?.image_generator?.themes || []);

// [新增] 监听配置加载，设置默认主题
watch(config, (newConfig) => {
    if (newConfig?.image_generator?.default_theme) {
        selectedTheme.value = newConfig.image_generator.default_theme;
    }
}, { immediate: true });


// [修改] 侦听所有会影响 URL 的 props 和新加的 selectedTheme
watch(() => [props.address, props.port, props.serverType, props.isSrv, selectedTheme.value], () => {
    if (!props.address || !selectedTheme.value) {
        imageUrl.value = '';
        return;
    }

    const params = new URLSearchParams();
    params.append('ip', props.address);
    if (props.port) params.append('port', props.port);
    if (props.serverType) params.append('stype', props.serverType);
    if (props.isSrv) params.append('srv', String(props.isSrv));
    // [新增] 将选中的主题作为 template 参数添加到 URL 中
    params.append('template', selectedTheme.value);

    imageUrl.value = `/api/status_img?${params.toString()}`;

}, { immediate: true, deep: true });

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
            copyButtonText.value = t('comp.imgG.copyed');
            setTimeout(() => (copyButtonText.value = t('comp.imgG.copy')), 2000);
        })
        .catch((err) => {
            copyButtonText.value = t('comp.imgG.copyFailed');
            // console.error('Could not copy text:', err);
        });
};
</script>

<template>
    <div class="card generator-card">
        <h3>{{ $t('comp.imgG.title') }}</h3>
        <p class="description">{{ $t('comp.imgG.description') }}</p>

        <div class="form-group theme-selector">
            <label for="theme-select">{{ $t('comp.imgG.theme') }}</label>
            <select id="theme-select" class="form-input" v-model="selectedTheme">
                <option v-for="theme in availableThemes" :key="theme.value" :value="theme.value">
                    {{ theme.name }}
                </option>
            </select>
        </div>

        <div class="input-with-button">
            <input type="text" readonly class="form-input" :value="imageUrl">
            <button class="btn btn-copy-link" @click="copyToClipboard">{{ copyButtonText }}</button>
        </div>

        <div class="preview-area">
            <h4>{{ $t('comp.imgG.preview') }}</h4>
            <div class="image-container" :class="{ 'is-loading': loading }">
                <img v-if="imageUrl" :src="imageUrl" :key="imageUrl" alt="Server Status Image" class="status-image">
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

/* --- [核心修改] 表单和输入框样式 --- */
.form-group {
    margin-bottom: 2rem;
}

label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
}

/* 通用输入框样式 */
.form-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    /* 为所有输入框添加圆角 */
    font-size: 1rem;
    background-color: var(--background-color);
    color: var(--text-color);
    transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px var(--primary-color-shadow);
}

/* [新增] 专门针对 select 下拉框的样式优化 */
select.form-input {
    /* 1. 移除浏览器默认的下拉箭头 */
    -webkit-appearance: none;
    appearance: none;

    /* 2. 添加自定义的箭头图标 (使用内联 SVG) */
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23888' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;

    /* 3. 定位自定义箭头，让它离右边框有合适的距离 */
    background-position: right 1rem center;

    /* 4. 增加右侧内边距，防止文字和箭头重叠 */
    padding-right: 2.5rem;

    cursor: pointer;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>