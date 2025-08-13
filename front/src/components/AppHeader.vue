<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { useConfig } from '../composables/useConfig';
import { useI18n } from 'vue-i18n';

const config = useConfig();
const { locale } = useI18n();

// --- Header 轮播图逻辑 ---
const headerConfig = computed(() => {
    return config.value?.header || {
        title: '站点名称',
        description: '',
        carousel: { images: [], duration: 5000 }
    };
});
const currentImageIndex = ref(0);
let carouselIntervalId = null;

watch(() => headerConfig.value.carousel, (newCarousel) => {
    clearInterval(carouselIntervalId);
    if (newCarousel && newCarousel.images.length > 1) {
        carouselIntervalId = setInterval(() => {
            currentImageIndex.value = (currentImageIndex.value + 1) % newCarousel.images.length;
        }, newCarousel.duration);
    }
}, { immediate: true });

onUnmounted(() => {
    clearInterval(carouselIntervalId);
});


// --- 导航菜单逻辑 ---
const isMenuOpen = ref(false); // 仅用于移动端下拉菜单
const menuItems = computed(() => config.value?.side_menu?.items || []);
const languages = computed(() => config.value?.i18n?.languages || []);
const nextLanguage = computed(() => {
    if (languages.value.length < 2) return null;
    const currentIndex = languages.value.findIndex(lang => lang.code === locale.value);
    const nextIndex = (currentIndex + 1) % languages.value.length;
    return languages.value[nextIndex];
});

// 动作分发器，桌面和移动端共用
const triggerAction = (item) => {
    if (item.type === 'link' && item.url) {
        window.open(item.url, '_blank');
    } else if (item.type === 'language_switcher') {
        if (nextLanguage.value) {
            locale.value = nextLanguage.value.code;
        }
    }
    isMenuOpen.value = false; // 点击后总是尝试关闭移动端菜单
};

const toggleMenu = () => {
    isMenuOpen.value = !isMenuOpen.value;
};
</script>

<template>
    <header class="app-header">
        <div class="carousel-images">
            <div v-for="(image, index) in headerConfig.carousel.images" :key="image" class="carousel-image"
                :class="{ 'is-active': index === currentImageIndex }" :style="{ backgroundImage: `url(${image})` }">
            </div>
        </div>
        <div class="overlay"></div>

        <div class="navbar">
            <a href="/" class="site-title">{{ headerConfig.title }}</a>

            <nav class="desktop-menu">
                <ul>
                    <li v-for="item in menuItems" :key="item.id">
                        <a @click.prevent="triggerAction(item)" :href="item.url || '#'" :title="item.title">
                            <div class="icon-wrapper" v-html="item.svg_icon"></div>
                            <span>{{ item.title }}</span>
                        </a>
                    </li>
                </ul>
            </nav>

            <div class="mobile-menu">
                <button @click="toggleMenu" class="menu-toggle-button" title="菜单">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>
                <transition name="menu-fade">
                    <ul v-if="isMenuOpen" class="menu-dropdown">
                        <li v-for="item in menuItems" :key="item.id">
                            <a @click.prevent="triggerAction(item)" :href="item.url || '#'" :title="item.title">
                                <div class="icon-wrapper" v-html="item.svg_icon"></div>
                                <span>{{ item.title }}</span>
                            </a>
                        </li>
                    </ul>
                </transition>
            </div>
        </div>

        <div class="text-container">
            <h1>{{ headerConfig.title }}</h1>
            <p>{{ headerConfig.description }}</p>
        </div>
    </header>
</template>

<style scoped>
/* --- 基础样式 --- */
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
    color: #fff;
}

.carousel-images,
.overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

.carousel-images {
    z-index: -2;
}

.carousel-image {
    position: absolute;
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
    background-color: rgba(0, 0, 0, 0.4);
    z-index: -1;
}

/* --- 顶部导航栏 --- */
.navbar {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    box-sizing: border-box;
    z-index: 10;
}

.site-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #fff;
    text-decoration: none;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

.icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
}

.icon-wrapper :deep(svg) {
    width: 100%;
    height: 100%;
    fill: currentColor;
}

/* --- 桌面端菜单 --- */
.desktop-menu {
    display: none;
    /* 默认隐藏 */
}

.desktop-menu ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    align-items: center;
    gap: 1rem;
}

.desktop-menu a {
    color: #fff;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    background-color: transparent;
    transition: background-color 0.2s ease;
    font-weight: 500;
}

.desktop-menu a:hover {
    background-color: rgba(255, 255, 255, 0.15);
}

.desktop-menu .icon-wrapper {
    width: 18px;
    height: 18px;
}

/* --- 移动端菜单 --- */
.mobile-menu {
    position: relative;
    /* 用于定位下拉菜单 */
}

.menu-toggle-button {
    background-color: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    color: white;
    cursor: pointer;
    padding: 10px;
    display: flex;
}

.menu-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 10px;
    background-color: #2c2c2c;
    border-radius: 8px;
    list-style: none;
    padding: 0.5rem;
    width: 200px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.menu-dropdown a {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    color: #e0e0e0;
    text-decoration: none;
    border-radius: 6px;
}

.menu-dropdown a:hover {
    background-color: #3a3a3a;
    color: #fff;
}

.menu-dropdown .icon-wrapper {
    width: 20px;
    height: 20px;
}

.menu-fade-enter-active,
.menu-fade-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

/* --- 居中标题 --- */
.text-container {
    text-align: center;
    /* 确保 z-index 低于导航栏，以免遮挡 */
    z-index: 5;
    padding: 0 1rem;
    /* 避免在窄屏上文字紧贴边缘 */
}

h1 {
    font-size: 3rem;
    font-weight: 700;
}

p {
    font-size: 1.2rem;
    font-weight: 400;
    opacity: 0.9;
}


/* --- 响应式断点 --- */
@media (min-width: 769px) {
    .desktop-menu {
        display: block;
        /* 在桌面端显示 */
    }

    .mobile-menu {
        display: none;
        /* 在桌面端隐藏 */
    }
}

@media (max-width: 768px) {
    .app-header {
        min-height: 280px;
    }

    .navbar {
        padding: 0.75rem 1rem;
    }

    h1 {
        font-size: 2.2rem;
    }

    p {
        font-size: 1rem;
    }
}
</style>