<script setup>
import { computed } from 'vue';
import { useConfig } from '../composables/useConfig'; 

// 从配置中解构出新的对象
const config = useConfig();
const developer = computed(() => config.value?.footer?.developer || { name: '', url: '#' });
const poweredBy = computed(() => config.value?.footer?.poweredBy || { name: '', url: '#' });
const company = computed(() => config.value?.footer?.company || { name: '', url: '#' });

// 动态获取当前年份
const currentYear = new Date().getFullYear();
</script>

<template>
    <footer class="app-footer">
        <div class="credits">
            <i18n-t keypath="comp.footer.developedBy" tag="span">
                <template #name>
                    <a :href="developer.url" target="_blank" rel="noopener noreferrer">{{ developer.name }}</a>
                </template>
            </i18n-t>

            <span class="separator">|</span>

            <i18n-t keypath="comp.footer.poweredBy" tag="span">
                <template #name>
                    <a :href="poweredBy.url" target="_blank" rel="noopener noreferrer">{{ poweredBy.name }}</a>
                </template>
            </i18n-t>
        </div>

        <p class="copyright">
            Copyright © {{ currentYear }}
            <a :href="company.url" target="_blank" rel="noopener noreferrer">{{ company.name }}</a>.
            {{ $t('comp.footer.rightsReserved') }}
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
    /* 加回上边框，让页脚区域更明确 */
}

/* [核心改动] 为署名信息行添加样式 */
.credits {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.75rem;
    /* 使用 gap 控制元素间距 */
    flex-wrap: wrap;
    /* 在小屏幕上允许换行 */
    margin-bottom: 1rem;
}

.credits a {
    color: var(--text-color);
    /* 署名部分的链接颜色可以深一些 */
    font-weight: 500;
}

.credits a:hover {
    color: var(--primary-color);
}

.separator {
    color: var(--border-color);
}

.copyright {
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
</style>