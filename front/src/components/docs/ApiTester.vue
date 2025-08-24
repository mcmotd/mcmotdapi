<script setup>
import { ref, computed } from 'vue';
import axios from 'axios';
import { useI18n } from 'vue-i18n'; // 引入 i18n

const { t } = useI18n(); // 获取翻译函数

// --- Component State ---
const testIp = ref('play.easecation.net');
const testPort = ref('');
const testStype = ref('auto');
const testSrv = ref(false);
const testTheme = ref('simple');
const testIcon = ref('');

const jsonResponse = ref(null);
const isJsonLoading = ref(false);
const activeTab = ref('json'); // 'json' or 'image'

// --- Computed URLs ---
const generatedJsonUrl = computed(() => {
    const params = new URLSearchParams();
    if (testIp.value) params.append('ip', testIp.value);
    if (testPort.value) params.append('port', testPort.value);
    if (testStype.value !== 'auto') params.append('stype', testStype.value);
    if (testSrv.value) params.append('srv', 'true');
    if (testIcon.value) params.append('icon', testIcon.value);
    return `/api/status?${params.toString()}`;
});

const generatedImageUrl = computed(() => {
    const params = new URLSearchParams();
    if (testIp.value) params.append('ip', testIp.value);
    if (testPort.value) params.append('port', testPort.value);
    if (testStype.value !== 'auto') params.append('stype', testStype.value);
    if (testSrv.value) params.append('srv', 'true');
    if (testTheme.value) params.append('theme', testTheme.value);
    if (testIcon.value) params.append('icon', testIcon.value);
    return `/api/status_img?${params.toString()}`;
});

// --- Methods ---
const sendJsonRequest = async () => {
    isJsonLoading.value = true;
    jsonResponse.value = null;
    activeTab.value = 'json'; // Switch to JSON tab on new request
    try {
        const { data } = await axios.get(generatedJsonUrl.value);
        jsonResponse.value = data;
    } catch (error) {
        jsonResponse.value = error.response ? error.response.data : { error: '网络请求失败' };
    } finally {
        isJsonLoading.value = false;
    }
};
</script>

<template>
    <div class="api-tester-container">
        <div class="tester-controls">
            <h3>{{ t('comp.apiTester.configTitle') }}</h3>
            <div class="form-grid">
                <div class="form-group"><label>{{ t('comp.apiTester.ipLabel') }}</label><input type="text"
                        v-model="testIp"></div>
                <div class="form-group"><label>{{ t('comp.apiTester.portLabel') }}</label><input type="text"
                        v-model="testPort"></div>
                <div class="form-group"><label>{{ t('comp.apiTester.stypeLabel') }}</label><select v-model="testStype">
                        <option value="auto">auto</option>
                        <option value="je">je</option>
                        <option value="be">be</option>
                    </select></div>
                <div class="form-group"><label>{{ t('comp.apiTester.themeLabel') }}</label><input type="text"
                        v-model="testTheme"></div>
            </div>
            <div class="form-group full-width">
                <label>{{ t('comp.apiTester.iconLabel') }}</label>
                <input type="text" v-model="testIcon" placeholder="https://example.com/icon.png">
            </div>
            <div class="form-group checkbox-group">
                <input id="srv-check-component" type="checkbox" v-model="testSrv">
                <label for="srv-check-component">{{ t('comp.apiTester.srvLabel') }}</label>
            </div>
            <button class="send-btn" @click="sendJsonRequest" :disabled="isJsonLoading">
                <span v-if="isJsonLoading" class="spinner"></span>
                {{ isJsonLoading ? t('comp.apiTester.querying') : t('comp.apiTester.sendRequest') }}
            </button>
        </div>

        <div class="tester-results">
            <div class="tabs">
                <button @click="activeTab = 'json'" :class="{ active: activeTab === 'json' }">{{
                    t('comp.apiTester.jsonResponse') }}</button>
                <button @click="activeTab = 'image'" :class="{ active: activeTab === 'image' }">{{
                    t('comp.apiTester.imagePreview') }}</button>
            </div>
            <div class="tab-content">
                <div v-show="activeTab === 'json'" class="json-result">
                    <div v-if="isJsonLoading" class="loading-overlay">{{ t('comp.apiTester.querying') }}...</div>
                    <pre v-if="jsonResponse"><code>{{ JSON.stringify(jsonResponse, null, 2) }}</code></pre>
                    <div v-else class="placeholder">{{ t('comp.apiTester.placeholder') }}</div>
                </div>
                <div v-show="activeTab === 'image'" class="image-result">
                    <p>{{ t('comp.apiTester.imageHint') }}</p>
                    <div class="image-preview">
                        <img :src="generatedImageUrl" :alt="t('comp.apiTester.imageAlt')" :key="generatedImageUrl">
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.api-tester-container {
    display: grid;
    grid-template-columns: 40% 1fr;
    gap: 2rem;
    background: var(--background-color);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 2rem;
    margin-top: 2rem;
}

.tester-controls h3 {
    font-size: 1.5rem;
    margin: 0 0 1.5rem 0;
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.form-group {
    display: flex;
    flex-direction: column;
}

.form-group.full-width {
    grid-column: 1 / -1;
}

.form-group.checkbox-group {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
}

label {
    font-weight: 500;
    margin-bottom: 0.5rem;
}

input[type="text"],
select {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 1rem;
    background: var(--card-background);
    color: var(--text-color);
}

input[type="checkbox"] {
    width: 1.25rem;
    height: 1.25rem;
}

.send-btn {
    width: 100%;
    padding: 0.8rem;
    margin-top: 1.5rem;
    border: none;
    border-radius: 8px;
    background: var(--primary-color);
    color: #fff;
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.send-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.tester-results {
    background: var(--card-background);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
}

.tabs {
    display: flex;
    border-bottom: 1px solid var(--border-color);
}

.tabs button {
    flex: 1;
    padding: 1rem;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    background: transparent;
    color: var(--text-color-light);
    cursor: pointer;
    border-bottom: 3px solid transparent;
    transition: all 0.2s;
}

.tabs button.active {
    color: var(--primary-color);
    border-bottom-color: var(--primary-color);
}

.tab-content {
    flex-grow: 1;
    padding: 1.5rem;
    position: relative;
    min-height: 300px;
    overflow-x: auto;
}

.json-result pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
    font-family: 'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace;
    font-size: 0.9rem;
}

.placeholder,
.loading-overlay {
    text-align: center;
    color: var(--text-color-light);
    padding-top: 4rem;
}

.image-result p {
    text-align: center;
    color: var(--text-color-light);
    margin: 0 0 1rem 0;
}

.image-preview {
    text-align: center;
}

.image-preview img {
    max-width: 100%;
    border-radius: 8px;
}

.spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

@media (max-width: 900px) {
    .api-tester-container {
        grid-template-columns: 1fr;
    }
}
</style>
