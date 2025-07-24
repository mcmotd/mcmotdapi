<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'; // [修改] 引入 computed 和 watch
import { useConfig } from '../composables/useConfig'; // [新增] 引入 useConfig

const config = useConfig();

// [修改] 使用 computed 创建一个安全的 header 配置对象
const headerConfig = computed(() => {
    // 当 config.value 未加载完成时，提供一个默认的结构，防止模板出错
    return config.value?.header || {
        title: '正在加载...',
        description: '',
        carousel: { images: [], duration: 5000 }
    };
});


// 3. 创建一个响应式变量来追踪当前显示的图片索引
const currentImageIndex = ref(0);
let intervalId = null; // 用于存放定时器ID

// [修改] 使用 watch 替代 onMounted 来启动轮播
watch(() => headerConfig.value.carousel, (newCarousel) => {
    // 先清除旧的定时器，以防配置动态变化
    clearInterval(intervalId);

    // 当新的轮播配置存在，且图片数量大于1时，启动新的定时器
    if (newCarousel && newCarousel.images.length > 1) {
        intervalId = setInterval(() => {
            currentImageIndex.value = (currentImageIndex.value + 1) % newCarousel.images.length;
        }, newCarousel.duration);
    }
}, { immediate: true }); // immediate: true 确保组件加载后能立即检查一次配置

onUnmounted(() => {
    // 组件销毁时，清除定时器，防止内存泄漏
    clearInterval(intervalId);
});
</script>

<template>
    <header class="app-header">
        <div class="carousel-images">
            <div v-for="(image, index) in headerConfig.carousel.images" :key="image" class="carousel-image"
                :class="{ 'is-active': index === currentImageIndex }" :style="{ backgroundImage: `url(${image})` }">
            </div>
        </div>

        <div class="overlay"></div>

        <div class="text-container">
            <h1>{{ headerConfig.title }}</h1>
            <p>{{ headerConfig.description }}</p>
        </div>
    </header>
</template>

<style scoped>
.app-header {
    /* 移除固定的背景图，因为现在由内部的 div 处理 */
    /* background-image: url('../assets/head.png'); */
    background-size: cover;
    background-position: center;
    position: relative;
    /* 关键：作为内部绝对定位元素的锚点 */
    min-height: 45vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    overflow: hidden;
    /* 隐藏可能溢出的部分 */
}

/* [新增] 轮播图片相关的样式 */
.carousel-images {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    /* 图片在最底层 */
}

.carousel-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    /* 默认透明 */
    opacity: 0;
    /* [核心] 定义淡入淡出的过渡效果 */
    transition: opacity 1.5s ease-in-out;
}

/* 当前显示的图片，不透明 */
.carousel-image.is-active {
    opacity: 1;
}

/* [修改] 将遮罩从 ::before 伪元素改为独立的 div，方便控制层级 */
.overlay {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.4);
    z-index: 2;
    /* 遮罩在图片之上 */
}

.text-container {
    position: relative;
    text-align: center;
    color: #fff;
    z-index: 3;
    /* 文字在最上层 */
}

h1 {
    font-size: 3rem;
    font-weight: 700;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

p {
    font-size: 1.2rem;
    font-weight: 400;
    opacity: 0.9;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}
@media (max-width: 768px) {
    .app-header {
        /* 在移动端，使用一个更紧凑的固定高度，而不是vh单位 */
        min-height: 280px;
    }

    /* (可选) 也可以适当减小移动端的标题和描述文字大小，让版面更协调 */
    h1 {
        font-size: 2.2rem;
    }

    p {
        font-size: 1rem;
    }
}
</style>