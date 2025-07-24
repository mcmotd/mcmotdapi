<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { useConfig } from '../composables/useConfig';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const config = useConfig();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();

// 导航菜单项
const navItems = [
  { name: 'home', path: '/', label: '首页' },
  { name: 'docs', path: '/docs', label: '文档' }
];

const headerConfig = computed(() => {
    return config.value?.header || {
        title: '正在加载...',
        description: '',
        carousel: { images: [], duration: 5000 }
    };
});

const currentImageIndex = ref(0);
let intervalId = null;

watch(() => headerConfig.value.carousel, (newCarousel) => {
    clearInterval(intervalId);

    if (newCarousel && newCarousel.images.length > 1) {
        intervalId = setInterval(() => {
            currentImageIndex.value = (currentImageIndex.value + 1) % newCarousel.images.length;
        }, newCarousel.duration);
    }
}, { immediate: true });

onUnmounted(() => {
    clearInterval(intervalId);
});

// 导航函数
const navigateTo = (path) => {
  router.push(path);
};
</script>

<template>
    <header class="app-header">
        <!-- 导航栏 -->
        <nav class="main-nav">
            <ul class="nav-list">
                <li 
                    v-for="item in navItems" 
                    :key="item.name"
                    class="nav-item"
                    :class="{ 'active': route.name === item.name }"
                    @click="navigateTo(item.path)"
                >
                    {{ item.label }}
                </li>
            </ul>
        </nav>

        <div class="carousel-images">
            <div v-for="(image, index) in headerConfig.carousel.images" :key="image" class="carousel-image"
                :class="{ 'is-active': index === currentImageIndex }" :style="{ backgroundImage: `url(${image})` }">
            </div>
        </div>

        <div class="overlay"></div>

        <div class="header-content">
            <div class="text-container">
                <h1>{{ headerConfig.title }}</h1>
                <p>{{ headerConfig.description }}</p>
            </div>
        </div>
    </header>
</template>

<style scoped>
.app-header {
    background-size: cover;
    background-position: center;
    position: relative;
    min-height: 45vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    overflow: hidden;
}

.carousel-images {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
}

.carousel-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    opacity: 0;
    transition: opacity 1.5s ease-in-out;
}

.carousel-image.is-active {
    opacity: 1;
}

.overlay {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.4);
    z-index: 2;
}

.header-content {
    position: relative;
    z-index: 3;
    width: 100%;
    max-width: 1200px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.text-container {
    text-align: center;
    color: #fff;
    margin-bottom: 2rem;
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

/* 导航栏样式 */
.main-nav {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 4;
}

.nav-list {
    display: flex;
    list-style: none;
    background-color: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 10px;
    padding: 0;
    margin: 0;
}

.nav-item {
    padding: 10px 20px;
    color: white;
    cursor: pointer;
    transition: all 0.3s ease;
    border-radius: 10px;
    font-weight: 500;
}

.nav-item:hover {
    background-color: rgba(255, 255, 255, 0.2);
}

.nav-item.active {
    background-color: rgba(255, 255, 255, 0.3);
    font-weight: bold;
}

@media (max-width: 768px) {
    .app-header {
        min-height: 280px;
    }

    h1 {
        font-size: 2.2rem;
    }

    p {
        font-size: 1rem;
    }
    
    .nav-list {
        
        background-color: rgba(0, 0, 0, 0.5);
        border-radius: 10px;
    }
    
    .nav-item {
        text-align: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .nav-item:last-child {
        border-bottom: none;
    }
}
</style>