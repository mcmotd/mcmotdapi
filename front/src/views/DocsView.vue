<script setup>
import { useI18n } from 'vue-i18n';
import AppHeader from '../components/AppHeader.vue';
import AppFooter from '../components/AppFooter.vue';
import ApiTester from '../components/docs/ApiTester.vue';

const { t } = useI18n(); // 获取翻译函数

const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
if(isDarkMode) document.body.classList.add('dark-theme');
</script>

<template>
    <div class="app-wrapper">
        <div class="app-content">
            <AppHeader />
            <div class="main-content-area">
                <div class="docs-container">
                    <div class="docs-intro">
                        <h1>{{ t('view.docs.title') }}</h1>
                        <p class="subtitle">
                            {{ t('view.docs.subtitle') }}
                        </p>
                    </div>

                    <!-- API Endpoint: /api/status -->
                    <section class="api-section">
                        <div class="api-heading">
                            <span class="api-method get">GET</span>
                            <h2>/api/status</h2>
                        </div>
                        <p class="api-description">
                            {{ t('view.docs.status.description') }}
                        </p>

                        <h3>{{ t('view.docs.common.requestParams') }}</h3>
                        <table class="param-table">
                            <thead>
                                <tr>
                                    <th>{{ t('view.docs.common.param') }}</th>
                                    <th>{{ t('view.docs.common.type') }}</th>
                                    <th>{{ t('view.docs.common.required') }}</th>
                                    <th>{{ t('view.docs.common.description') }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>ip</td>
                                    <td>string</td>
                                    <td>{{ t('view.docs.common.yes') }}</td>
                                    <td>{{ t('view.docs.status.paramIp') }}</td>
                                </tr>
                                <tr>
                                    <td>port</td>
                                    <td>string</td>
                                    <td>{{ t('view.docs.common.no') }}</td>
                                    <td>{{ t('view.docs.status.paramPort') }}</td>
                                </tr>
                                <tr>
                                    <td>host</td>
                                    <td>string</td>
                                    <td>{{ t('view.docs.common.no') }}</td>
                                    <td>{{ t('view.docs.status.paramHost') }}</td>
                                </tr>
                                <tr>
                                    <td>stype</td>
                                    <td>string</td>
                                    <td>{{ t('view.docs.common.no') }}</td>
                                    <td>{{ t('view.docs.status.paramStype') }}</td>
                                </tr>
                                <tr>
                                    <td>srv</td>
                                    <td>boolean</td>
                                    <td>{{ t('view.docs.common.no') }}</td>
                                    <td>{{ t('view.docs.status.paramSrv') }}</td>
                                </tr>
                                <tr>
                                    <td>icon</td>
                                    <td>string</td>
                                    <td>{{ t('view.docs.common.no') }}</td>
                                    <td>{{ t('view.docs.status.paramIcon') }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    <!-- API Endpoint: /api/status_img -->
                    <section class="api-section">
                        <div class="api-heading">
                            <span class="api-method get">GET</span>
                            <h2>/api/status_img</h2>
                        </div>
                        <p class="api-description">
                            {{ t('view.docs.statusImg.description') }}
                        </p>

                        <h3>{{ t('view.docs.common.requestParams') }}</h3>
                        <p>{{ t('view.docs.statusImg.supportsParams') }}</p>
                        <table class="param-table">
                            <thead>
                                <tr>
                                    <th>{{ t('view.docs.common.param') }}</th>
                                    <th>{{ t('view.docs.common.type') }}</th>
                                    <th>{{ t('view.docs.common.required') }}</th>
                                    <th>{{ t('view.docs.common.description') }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>theme</td>
                                    <td>string</td>
                                    <td>{{ t('view.docs.common.no') }}</td>
                                    <td>{{ t('view.docs.statusImg.paramTheme') }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    <!-- Interactive API Tester Section -->
                    <section class="api-section interactive-section">
                        <div class="api-heading">
                            <span class="api-method tool">TOOL</span>
                            <h2>{{ t('view.docs.tester.title') }}</h2>
                        </div>
                        <p class="api-description">
                            {{ t('view.docs.tester.description') }}
                        </p>
                        <ApiTester />
                    </section>
                </div>
            </div>
        </div>
        <AppFooter />
    </div>
</template>

<style scoped>
.app-wrapper {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
}

.app-content {
    flex-grow: 1;
}

.main-content-area {
    max-width: 960px;
    margin: 0 auto;
    padding: 2rem 1rem 4rem 1rem;
}

.docs-container {
    background: var(--card-background);
    border-radius: 16px;
    padding: 3rem;
    box-shadow: 0 8px 40px var(--shadow-color);
    animation: fadeIn 0.8s ease-out;
}

.docs-intro {
    text-align: center;
    margin-bottom: 4rem;
}

h1 {
    font-size: 3rem;
    font-weight: 700;
}

.subtitle {
    font-size: 1.2rem;
    color: var(--text-color-light);
    margin-top: 0.5rem;
}

.api-section {
    margin-bottom: 4rem;
}

.api-heading {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
}

.api-method {
    padding: 0.3rem 0.8rem;
    border-radius: 6px;
    font-weight: bold;
    color: #fff;
    font-size: 0.9rem;
}

.api-method.get {
    background-color: #007bff;
}

.api-method.tool {
    background-color: #6c757d;
}

h2 {
    font-size: 2rem;
    font-weight: 600;
    margin: 0;
}

.api-description {
    font-size: 1.1rem;
    color: var(--text-color-light);
    margin-top: 0.5rem;
    line-height: 1.7;
}

h3 {
    font-size: 1.3rem;
    font-weight: 600;
    margin: 2.5rem 0 1rem 0;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.5rem;
}

.param-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1.5rem;
    font-size: 0.95rem;
}

.param-table th,
.param-table td {
    padding: 0.8rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
}

.param-table th {
    font-weight: 600;
}

.param-table td:nth-child(2) {
    color: #e83e8c;
    font-family: monospace;
}

.param-table td:nth-child(3) {
    font-weight: bold;
}

.param-table code {
    background-color: rgba(128, 128, 128, 0.15);
    padding: 0.1em 0.4em;
    border-radius: 4px;
}

.interactive-section {
    border-top: 2px solid var(--primary-color);
    padding-top: 2rem;
    margin-top: 4rem;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

@media (max-width: 768px) {
    .docs-container {
        padding: 1.5rem;
    }
}
</style>
