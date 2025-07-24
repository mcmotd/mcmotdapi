<script setup>
import { useConfig } from '../composables/useConfig';

// 从配置中解构出新的对象
const config = useConfig();

const contributors = config.value.contributors;
</script>

<template>
    <div class="contributors-section">
        <h2 class="section-title">{{ $t("comp.contr.title") }}</h2>
        <div class="contributors-grid">
            <div v-for="contributor in contributors" :key="contributor.name" class="contributor-card">
                <a :href="contributor.github" target="_blank" rel="noopener noreferrer" class="card-link">
                    <div class="card-header">
                        <img :src="contributor.avatar" :alt="contributor.name" class="avatar">
                        <div class="identity">
                            <h3 class="name">{{ contributor.name }}</h3>
                            <p class="title">{{ contributor.title }}</p>
                        </div>
                    </div>
                    <div class="card-body">
                        <p class="slogan">“ {{ contributor.slogan }} ”</p>
                    </div>
                </a>
            </div>
        </div>
    </div>
</template>

<style scoped>
.contributors-section {
    width: 100%;
    margin-top: 4rem;
    padding: 2rem 0;
    border-top: 1px solid var(--border-color);
}

.section-title {
    text-align: center;
    font-size: 1.8rem;
    font-weight: 700;
    margin-bottom: 2.5rem;
    color: var(--text-color);
}

.contributors-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
}

.contributor-card {
    background-color: var(--card-background);
    border-radius: 12px;
    box-shadow: 0 4px 25px var(--shadow-color);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.contributor-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 35px var(--shadow-color);
}

.card-link {
    display: block;
    padding: 1.5rem;
    text-decoration: none;
    color: inherit;
    height: 100%;
}

.card-header {
    display: flex;
    align-items: center;
    margin-bottom: 1rem;
}

.avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    margin-right: 1rem;
    border: 2px solid var(--primary-color);
}

.identity {
    display: flex;
    flex-direction: column;
}

.name {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 700;
}

.title {
    margin: 0;
    font-size: 0.9rem;
    color: var(--primary-color);
}

.card-body {
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
}

.slogan {
    margin: 0;
    font-style: italic;
    color: var(--text-color-light);
    line-height: 1.5;
}
</style>