<script setup>
import { computed } from 'vue';
import { useConfig } from '../composables/useConfig';

const config = useConfig();

const poweredBy = computed(() => config.value?.footer?.poweredBy || { name: '', url: '#' });
const company = computed(() => config.value?.footer?.company || { name: '', url: '#' });
// [核心修改] 新增 customHtml，直接读取配置中的 HTML 字符串
const customHtml = computed(() => config.value?.footer?.customHtml || '');

const currentYear = new Date().getFullYear();
</script>

<template>
    <footer class="app-footer">
        <p class="powered-by">
            <i18n-t keypath="comp.footer.poweredBy" tag="span">
                <template #name>
                    <a :href="poweredBy.url" target="_blank" rel="noopener noreferrer">{{ poweredBy.name }}</a>
                </template>
            </i18n-t>
        </p>

        <p class="copyright">
            <span>
                Copyright © {{ currentYear }}
                <a :href="company.url" target="_blank" rel="noopener noreferrer">{{ company.name }}</a>.
                {{ $t('comp.footer.rightsReserved') }}
            </span>

            <template v-if="customHtml">
                <span class="separator">|</span>
                <span class="custom-html-content" v-html="customHtml"></span>
            </template>
        </p>
    </footer>
</template>

<style scoped>
.app-footer {
    text-align: center;
    padding: 2rem 1rem;
    margin-top: 4rem;
    color: var(--text-color-light);
    font-size: 0.9rem;
    border-top: 1px solid var(--border-color);
}

.powered-by {
    margin-bottom: 1rem;
    font-size: 0.9rem;
}

.powered-by a {
    color: var(--text-color);
    font-weight: 500;
    text-decoration: none;
}

.powered-by a:hover {
    color: var(--primary-color);
}

.copyright {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    font-size: 0.8rem;
    opacity: 0.8;
}

.copyright a {
    color: var(--text-color-light);
    text-decoration: none;
    transition: color 0.2s;
}

.copyright a:hover {
    color: var(--text-color);
}

.separator {
    color: var(--text-color);
}

/* [新增] 使用 :deep() 选择器为 v-html 注入的 HTML 内容中的 a 标签设置统一样式 */
.custom-html-content :deep(a) {
    color: var(--text-color-light);
    text-decoration: none;
    transition: color 0.2s;
}

.custom-html-content :deep(a:hover) {
    color: var(--text-color);
}
</style>