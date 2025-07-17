<script setup>
import { defaultConfig } from '../config/app.config.js';
const { title, description } = defaultConfig.header;
</script>

<template>
    <header class="app-header">
        <div class="text-container">
            <h1>{{ title }}</h1>
            <p>{{ description }}</p>
        </div>
    </header>
</template>

<style scoped>
.app-header {
    background-image: url('../assets/head.png');
    background-size: cover;
    background-position: center;
    position: relative;
    min-height: 45vh;
    /* 可以适当调整高度 */
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
}

.app-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.4);
    /* 遮罩可以稍微调淡 */
}

.text-container {
    position: relative;
    text-align: center;
    color: #fff;
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
</style>