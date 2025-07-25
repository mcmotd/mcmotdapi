<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useConfig } from '../composables/useConfig';

// --- 状态与配置 ---
const isOpen = ref(false);
const config = useConfig();
const { locale } = useI18n();

const menuItems = computed(() => config.value?.side_menu?.items || []);
const iconOpen = computed(() => config.value?.side_menu?.toggle_button?.icon_open || '');
const iconClose = computed(() => config.value?.side_menu?.toggle_button?.icon_close || '');
const languages = computed(() => config.value?.i18n?.languages || []);
const nextLanguage = computed(() => {
    if (languages.value.length < 2) return null;
    const currentIndex = languages.value.findIndex(lang => lang.code === locale.value);
    const nextIndex = (currentIndex + 1) % languages.value.length;
    return languages.value[nextIndex];
});


// --- [核心修改] 动作分发器现在变得更通用 ---
const actions = {
    // 只保留组件内部的特殊逻辑
    switchLanguage: () => {
        if (nextLanguage.value) {
            locale.value = nextLanguage.value.code;
        }
    }
};

const triggerAction = (item) => {
    // 1. 优先检查通用类型
    if (item.type === 'link' && item.url) {
        window.open(item.url, '_blank');
        return; // 执行并结束
    }

    // 2. 然后检查其他特殊类型
    if (item.type === 'language_switcher') {
        actions.switchLanguage();
        return; // 执行并结束
    }

    // 3. (可选) 如果未来还有其他 action 名称的配置，可以保留
    if (item.action && actions[item.action]) {
        actions[item.action]();
    } else {
        // 如果没有匹配的动作，可以给一个友好的提示或什么都不做
        console.warn(`未找到为项目 "${item.id}" 定义的动作。`);
    }
};

const toggleMenu = () => { isOpen.value = !isOpen.value; };
</script>


<template>
    <div class="side-menu-container" :class="{ 'is-open': isOpen }">
        <ul class="menu-items-list">
            <li v-for="(item, index) in menuItems" :key="item.id"
                :style="{ 'transition-delay': `${(menuItems.length - index - 1) * 0.1}s` }">
                <button class="menu-item" :title="item.title" :style="{ backgroundColor: item.color }"
                    @click="triggerAction(item)">
                    <div class="icon-wrapper" v-html="item.svg_icon"></div>
                </button>
            </li>
        </ul>

        <button class="menu-toggle-button" @click="toggleMenu" :title="isOpen ? '收起菜单' : '展开菜单'">
            <transition name="icon-fade" mode="out-in">
                <div v-if="isOpen" class="icon-wrapper" v-html="iconClose"></div>
                <div v-else class="icon-wrapper" v-html="iconOpen"></div>
            </transition>
        </button>
    </div>
</template>


<style scoped>
/* --- 变量定义 (保持不变) --- */
:root {
    --menu-fab-size: 64px;
    --menu-item-size: 56px;
    --menu-icon-color: #ffffff;
    --grad-start: #00dc82;
    --grad-end: #1de9b6;
}

/* ... 其他样式 ... */
.side-menu-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.menu-items-list {
    list-style: none;
    padding: 0;
    margin: 0 0 20px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    transform: translateY(10px);
    opacity: 0;
    pointer-events: none;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
}

.side-menu-container.is-open .menu-items-list {
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
}

.menu-items-list li {
    opacity: 0;
    transform: scale(0.8);
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.side-menu-container.is-open .menu-items-list li {
    opacity: 1;
    transform: scale(1);
}

.menu-item {
    width: var(--menu-item-size);
    height: var(--menu-item-size);
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    color: var(--menu-icon-color);
}

.menu-item:hover {
    transform: scale(1.15);
}

.menu-toggle-button {
    width: var(--menu-fab-size);
    height: var(--menu-fab-size);
    border-radius: 50%;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    display: flex;
    justify-content: center;
    align-items: center;
    background-image: linear-gradient(45deg, var(--grad-start), var(--grad-end));
    animation: pulse-glow 2.5s infinite ease-in-out;
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes pulse-glow {
    0% {
        box-shadow: 0 0 0 0 rgba(0, 220, 130, 0.4);
    }

    70% {
        box-shadow: 0 0 0 12px rgba(0, 220, 130, 0);
    }

    100% {
        box-shadow: 0 0 0 0 rgba(0, 220, 130, 0);
    }
}

.menu-toggle-button:hover {
    transform: scale(1.1);
    animation-play-state: paused;
}
/* icon-wrapper 样式现在被主按钮和菜单项共用 */
.icon-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 30px;
    height: 30px;
}

.icon-wrapper:deep(svg) {
    fill: currentColor;
    stroke: var(--menu-icon-color);
    /* 让描边图标也能显示 */
    stroke-width: 2;
    /* 为描边图标设置宽度 */
    stroke-linecap: round;
    stroke-linejoin: round;
    width: 100%;
    height: 100%;
}

/* [新增] 为图标切换增加淡入淡出动画 */
.icon-fade-enter-active,
.icon-fade-leave-active {
    transition: opacity 0.2s ease;
}

.icon-fade-enter-from,
.icon-fade-leave-to {
    opacity: 0;
}
.side-menu-container.is-open .icon-plus {
    transform: rotate(45deg);
}

/* [核心修改] 为 v-html 渲染的 SVG 设置样式 */
.icon-wrapper {
    display: flex;
    /* 让内部的 SVG 能够居中 */
    justify-content: center;
    align-items: center;
    width: 30px;
    /* 控制 SVG 的容器尺寸 */
    height: 30px;
}

.icon-wrapper :deep(svg) {
    /* 使用 >>> 或 ::v-deep 来穿透 scoped 样式，为动态插入的 SVG 上色 */
    fill: currentColor;
    /* 继承按钮的 color 属性 (白色) */
    stroke: none;
    width: 100%;
    height: 100%;
}
/* [新增] 语言切换器按钮的特殊内容样式 */
.language-switcher-content {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
}

.next-lang-name {
    position: absolute;
    font-size: 0.8rem;
    font-weight: bold;
    color: var(--menu-icon-color);
    /* 确保文字不会干扰图标的视觉中心 */
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    /* 让文字不影响点击 */
}

.language-switcher-content .icon-wrapper {
    opacity: 0.3;
    /* 让背景图标稍微暗一点，突出文字 */
}

</style>