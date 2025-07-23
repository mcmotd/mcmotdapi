<script setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

// 获取 t 函数和当前的 locale
const { t, locale } = useI18n();
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

// [核心改动 2] 侦听所有相关的 props，而不仅仅是 serverData
watch(() => [props.address, props.port, props.serverType, props.isSrv], () => {
    if (!props.address) {
        imageUrl.value = '';
        return;
    }

    // [核心改动 3] 使用 URLSearchParams 来构建包含所有参数的 URL
    const params = new URLSearchParams();
    params.append('ip', props.address);
    if (props.port) {
        params.append('port', props.port);
    }
    if (props.serverType) {
        params.append('stype', props.serverType);
    }
    if (props.isSrv) {
        params.append('srv', Boolean(props.isSrv == true));
    }

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

        <div class="input-with-button">
            <input type="text" class="form-input" v-model="imageUrl">
            <button class="btn btn-copy-link" @click="copyToClipboard">{{ copyButtonText }}</button>
        </div>

        <div class="preview-area">
            <h4>{{ $t('comp.imgG.preview') }}</h4>
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