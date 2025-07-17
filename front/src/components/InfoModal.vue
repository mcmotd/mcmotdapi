<script setup>
// 定义组件的props和emits
defineProps({
    show: Boolean, // 控制模态框的显示与隐藏
    title: String, // 模态框的标题
});
const emit = defineEmits(['close']);

// 当点击遮罩层或关闭按钮时，触发 close 事件
const handleClose = () => {
    emit('close');
};
</script>

<template>
    <Transition name="modal-fade">
        <div v-if="show" class="modal-overlay" @click.self="handleClose">
            <div class="modal-content">
                <header class="modal-header">
                    <h3>{{ title }}</h3>
                    <button class="close-button" @click="handleClose">&times;</button>
                </header>
                <main class="modal-body">
                    <slot></slot>
                </main>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background-color: var(--card-background);
    border-radius: 12px;
    box-shadow: 0 5px 30px rgba(0, 0, 0, 0.3);
    width: 90%;
    max-width: 600px;
    /* 限制最大宽度 */
    max-height: 80vh;
    /* 限制最大高度 */
    display: flex;
    flex-direction: column;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
}

.close-button {
    border: none;
    background: none;
    font-size: 2rem;
    font-weight: 300;
    line-height: 1;
    cursor: pointer;
    color: var(--text-color-light);
    padding: 0;
}

.modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    /* 当内容过长时，允许垂直滚动 */
}

/* 定义模态框的过渡效果 */
.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}
</style>