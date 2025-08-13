<script setup>
import { ref, onMounted, onUnmounted, provide, readonly } from 'vue';
import { useI18n } from 'vue-i18n';
import { ConfigKey } from '../composables/useConfig';

const { locale } = useI18n();

// [重要] 请在这里替换为您自己的图片路径！
// 建议将图片放在项目根目录下的 `public` 文件夹中，这样路径就是以 `/` 开头的。
const loadingImagePath = '/loading.png'; // 例如: '/logo.png' 或 '/icon.webp'

// --- 状态定义 ---
const config = ref(null);
const loading = ref(true);
const error = ref(null);
const progress = ref(0); // 进度条状态
let progressInterval = null;

// --- 核心逻辑 ---
onMounted(() => {
    startLoadingAnimation();
    fetch('/api/config')
        .then(response => {
            if (!response.ok) throw new Error('获取配置失败，网络响应错误。');
            return response.json();
        })
        .then(data => {
            config.value = data;

            if (data?.i18n?.default) {
                locale.value = data.i18n.default;
                // console.log(`[ConfigProvider] 全局语言已设置为: ${locale.value}`);
            }
        })
        .catch(err => {
            error.value = err.message;
        })
        .finally(() => {
            completeLoadingAnimation();
        });
});

onUnmounted(() => {
    clearInterval(progressInterval);
});

// --- 动画控制 ---
function startLoadingAnimation() {
    progressInterval = setInterval(() => {
        if (progress.value < 90) {
            progress.value += Math.floor(Math.random() * 3) + 1;
            if (progress.value > 90) progress.value = 90;
        }
    }, 200);
}

function completeLoadingAnimation() {
    clearInterval(progressInterval);
    progress.value = 100;
    setTimeout(() => {
        loading.value = false;
    }, 400);
}

// --- Provide/Inject ---
provide(ConfigKey, readonly(config));
</script>

<template>
    <div>
        <div v-if="loading" class="loading-screen-image-based">
            <div class="loading-content">
                <img :src="loadingImagePath" alt="Loading indicator" class="flicker-image" />

                <div class="progress-bar-container">
                    <div class="progress-bar-fill" :style="{ width: progress + '%' }"></div>
                </div>

                <p class="loading-text">Loading...</p>
            </div>
        </div>

        <div v-else-if="error" class="error-container">
            <h3>配置加载失败</h3>
            <p>{{ error }}</p>
        </div>

        <slot v-else-if="config && Object.keys(config).length > 0"></slot>

        <div v-else class="error-container">
            <h3>致命错误</h3>
            <p>应用配置已加载，但内容为空。请检查后端 /api/config 的返回值。</p>
        </div>
    </div>
</template>

<style scoped>
/* [新] 图片加载动画的专属样式 */
.loading-screen-image-based {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: #0d1b1e;
    /* 暗色背景 */
}

.loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    /* 图片、进度条、文字之间的间距 */
    width: 80%;
    max-width: 250px;
}

.flicker-image {
    max-width: 150px;
    /* 限制图片最大宽度 */
    max-height: 150px;
    /* 限制图片最大高度 */
    /* [核心] 应用动画效果 */
    animation: image-flicker 2.5s infinite ease-in-out;
}

/* [核心] 定义闪烁/呼吸动画 */
@keyframes image-flicker {
    0% {
        opacity: 1;
        /* 增加一个发光效果，让动画更生动 */
        filter: drop-shadow(0 0 5px rgba(0, 255, 136, 0.4));
    }

    50% {
        opacity: 0.7;
        filter: drop-shadow(0 0 15px rgba(0, 255, 136, 0.7));
    }

    100% {
        opacity: 1;
        filter: drop-shadow(0 0 5px rgba(0, 255, 136, 0.4));
    }
}

.progress-bar-container {
    width: 100%;
    height: 8px;
    /* 可以做得细一点 */
    background-color: #2a4a4f;
    border-radius: 4px;
    overflow: hidden;
}

.progress-bar-fill {
    height: 100%;
    /* 基础颜色保持不变 */
    background-color: #4caf50;
    transition: width 0.2s ease-out;

    /* [新增] 使用 repeating-linear-gradient 创建斜向条纹 */
    background-image: repeating-linear-gradient(-45deg,
            rgba(255, 255, 255, 0.2) 0,
            rgba(255, 255, 255, 0.2) 10px,
            transparent 10px,
            transparent 20px);

    /* [新增] 设置背景大小，让条纹可以重复 */
    background-size: 40px 40px;

    /* [新增] 应用动画效果 */
    animation: progress-bar-stripes 1s linear infinite;
}

/* --- [新增] 定义条纹滚动的动画 --- */
@keyframes progress-bar-stripes {
    from {
        background-position: 40px 0;
    }

    to {
        background-position: 0 0;
    }
}
.loading-text {
    color: #a5d6a7;
    /* 稍暗的绿色文本 */
    font-size: 1rem;
    font-family: 'Courier New', Courier, monospace;
}


/* 错误界面的样式 (不变) */
.error-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh;
    font-size: 1.2rem;
    color: #d32f2f;
    background-color: #0d1b1e;
}
</style>