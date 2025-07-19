<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { parseMotdToHtml } from '../utils/motd-parser.js';
import defaultIcon from '/mc.png';
import InfoModal from './InfoModal.vue';
import axios from 'axios';
import { defaultConfig } from '../config/app.config.js';

const emit = defineEmits(['card-click']);

const props = defineProps({
    serverData: {
        type: Object,
        required: true,
    },
});

// [核心改动] 新增计算属性，用于判断服务器是否为离线/失败状态
const isOffline = computed(() => {
    // 我们假设查询失败时，会传递一个带有 status: 'offline' 的对象
    // 或者缺少像版本号这样的关键数据
    return props.serverData?.status === 'offline' || !props.serverData?.version;
});

const isModalVisible = ref(false);

const infoLabels = { host: '服务器地址', version: '版本', protocol: '协议版本', gamemode: '游戏模式', delay: '延迟', mod_info: 'Mod 列表', players: '在线列表' };
const displayKeys = ['host', 'version', 'protocol', 'gamemode', 'delay', 'mod_info', 'players'];

const filteredInfoKeys = computed(() => {
    if (isOffline.value || !props.serverData) return [];
    if (props.serverData.players && props.serverData.players.sample) {
        return displayKeys.filter(key => props.serverData[key] !== undefined && props.serverData[key] !== null);
    }
    return displayKeys.filter(key => key !== 'players' && props.serverData[key] !== undefined && props.serverData[key] !== null);
});

const iconUrl = computed(() => {
    // 离线时也显示默认图标
    if (!isOffline.value && props.serverData && props.serverData.icon) {
        return props.serverData.icon;
    }
    return defaultIcon;
});

const dynamicMotd = ref(null);
const motdHtml = computed(() => {
    if (isOffline.value || !dynamicMotd.value) return '';
    if (dynamicMotd.value.motd_html) { return dynamicMotd.value.motd_html; }
    return dynamicMotd.value.motd ? parseMotdToHtml(dynamicMotd.value.motd) : '';
});

const playerPercentage = computed(() => {
    if (isOffline.value || !props.serverData.players) return 0;
    if (props.serverData.players.max > 0) {
        return (props.serverData.players.online / props.serverData.players.max) * 100;
    }
    return 0;
});

// ==================== [新增] 处理失败标语的逻辑 ====================
// 3. 新增一个 ref，用于存储从 API 获取或默认的标语
const offlineSlogan = ref(defaultConfig.failureState.defaultSlogan);

// 4. 新增一个函数，用于从 API 获取标语
const fetchSlogan = async () => {
    try {
        const response = await axios.get(defaultConfig.failureState.sloganApi);
        if (response.data && response.data.slogan) {
            offlineSlogan.value = response.data;
        }
    } catch (error) {
        console.error("获取离线标语失败:", error);
        // 如果 API 失败，则使用配置文件中的默认标语
        offlineSlogan.value = defaultConfig.failureState.defaultSlogan;
    }
};

// 5. 使用 watch 监听状态变化。当服务器状态变为'offline'时，自动调用 fetchSlogan
watch(() => props.serverData.status, (newStatus) => {
    if (newStatus === 'offline') {
        fetchSlogan();
    }
}, { immediate: true }); // immediate: true 确保组件首次加载时也能根据初始状态执行
// ====================================================================

let motdUpdateInterval = null;

const fetchLatestMotd = async () => {
    if (isOffline.value || !props.serverData?.host) return;
    try {
        const [ip, port] = props.serverData.host.split(':');
        const apiUrl = `${defaultConfig.api.baseUrl}/status`;
        const response = await axios.get(apiUrl, { params: { ip, port: port || undefined } });
        dynamicMotd.value = { motd: response.data.motd, motd_html: response.data.motd_html };
    } catch (error) {
        console.error("后台MOTD刷新失败:", error.message);
    }
};

onMounted(() => {
    // [核心改动] 仅在服务器在线时执行刷新逻辑
    if (!isOffline.value) {
        dynamicMotd.value = { motd: props.serverData.motd, motd_html: props.serverData.motd_html };
        motdUpdateInterval = setInterval(fetchLatestMotd, 5000);
    }
});

onUnmounted(() => {
    if (motdUpdateInterval) {
        clearInterval(motdUpdateInterval);
    }
});
</script>

<template>
    <div>
        <div class="card status-card" :class="{ 'is-offline': isOffline }" @click="$emit('card-click')">

            <div v-if="isOffline" class="offline-container">
                <span class="offline-slogan">{{ offlineSlogan }}</span>
                <span class="offline-subtext">{{ defaultConfig.failureState.subtext }}</span>
            </div>

            <template v-else>
                <div class="icon-container">
                    <img :src="iconUrl" alt="Server Icon" class="server-icon" />
                </div>
                <div class="main-content">
                    <div class="card-header">
                        <div class="motd-display">
                            <span v-html="motdHtml"></span>
                        </div>
                        <div class="status-indicator" :class="serverData.type || serverData.status">
                            <span class="status-dot"></span>
                            {{ serverData.type }}
                        </div>
                    </div>
                    <div class="info-grid">
                        <div v-for="key in filteredInfoKeys" :key="key" class="info-item">
                            <span class="info-label">{{ infoLabels[key] }}</span>
                            <div v-if="key === 'mod_info'" class="info-value">
                                <button @click="isModalVisible = true" class="info-button">
                                    {{ serverData.mod_info.modList.length }} 个 (点击查看)
                                </button>
                            </div>
                            <div v-else-if="key === 'players'" class="info-value players-sample">{{
                                serverData.players.sample }}
                            </div>
                            <span v-else-if="key === 'delay'" class="info-value">{{ serverData[key] }}ms</span>
                            <span v-else class="info-value" :class="{ version: key === 'version' }">{{ serverData[key]
                                }}</span>
                        </div>
                    </div>
                    <div class="players-info">
                        <div class="player-count">
                            玩家: <strong>{{ serverData.players?.online ?? 0 }}</strong> / {{ serverData.players?.max ?? 0
                            }}
                        </div>
                        <div class="progress-bar">
                            <div class="progress-bar-inner" :style="{ width: playerPercentage + '%' }"></div>
                        </div>
                    </div>
                </div>
            </template>
        </div>

        <teleport to="body" v-if="!isOffline && serverData.mod_info?.modList?.length">
            <InfoModal :show="isModalVisible" :title="`Mod 列表 (共 ${serverData.mod_info?.modList?.length ?? 0} 个)`"
                @close="isModalVisible = false">
                <table class="mod-table">
                    <thead>
                        <tr>
                            <th>Mod ID</th>
                            <th>版本</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="mod in serverData.mod_info?.modList" :key="mod.modid">
                            <td>{{ mod.modid }}</td>
                            <td>{{ mod.version }}</td>
                        </tr>
                    </tbody>
                </table>
            </InfoModal>
        </teleport>
    </div>
</template>
<style scoped>
.card {
    background-color: var(--card-background);
    border-radius: 12px;
    /* 不再需要 box-shadow，因为背景是透明的 */
    padding: 0;
    overflow: hidden;
    display: flex;
    user-select: none;
    cursor: default;
    width: 100%;
    height: 100%;
}

.main-content {
    flex-grow: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
}

.icon-container {
    flex-shrink: 0;
    width: 120px;
    padding: 1.5rem;
    border-right: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
}

.server-icon {
    width: 100%;
    max-width: 96px;
    aspect-ratio: 1 / 1;
    border-radius: 8px;
    transition: max-width 0.3s ease;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
}

.motd-display {
    color: var(--text-color);
    font-family: 'Noto Sans SC', sans-serif;
    font-weight: 500;
    line-height: 1.5;
    text-align: left;
    font-size: clamp(0.8rem, 2.5vw, 1rem);
    word-wrap: break-word;
    flex-grow: 1;
    min-width: 0;
}

@keyframes obfuscate-char-anim {
    0% {
        content: "█";
    }

    10% {
        content: "▓";
    }

    20% {
        content: "▒";
    }

    30% {
        content: "░";
    }

    40% {
        content: "█";
    }

    50% {
        content: "▓";
    }

    60% {
        content: "▒";
    }

    70% {
        content: "░";
    }

    80% {
        content: "█";
    }

    90% {
        content: "▓";
    }

    100% {
        content: "▒";
    }
}

:deep(.obfuscated) {
    display: inline-block;
    color: transparent;
    position: relative;
    width: 1ch;
    margin-right: 0.2em;
}

:deep(.obfuscated)::before {
    content: "█";
    position: absolute;
    left: 0;
    top: 0;
    color: #aaa;
    text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.2);
    animation: obfuscate-char-anim 0.2s steps(1, end) infinite;
}

.status-indicator {
    display: flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    border-radius: 99px;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.8rem;
    flex-shrink: 0;
}

.status-indicator.online,
.status-indicator.Java,
.status-indicator.Bedrock {
    background-color: #e9f7ec;
    color: var(--success-color);
}

/* .status-indicator.offline {
    background-color: #fbebee;
    color: var(--error-color);
} */

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 0.5rem;
}

.status-indicator.online .status-dot,
.status-indicator.Java .status-dot,
.status-indicator.Bedrock .status-dot {
    background-color: var(--success-color);
}

.status-indicator.offline .status-dot {
    background-color: var(--error-color);
}

.status-card.is-offline {
    /* 设置一个最小高度，以确保在显示标语时组件不会“塌陷” */
    min-height: 225px;
    /* 使用 flex 布局来垂直和水平居中标语 */
    display: flex;
    align-items: center;
    justify-content: center;
    /* 可以给离线状态一个不同的背景色以作区分 */
    background-color: var(--background-color-light, #f8f9fa);
    color: var(--text-color-light);
    transition: all 0.3s ease;
}

.offline-container {
    padding: 2rem;
    text-align: center;
}

.offline-slogan {
    display: block;
    font-size: 1.25rem;
    font-weight: 500;
    color: var(--text-color);
    margin-bottom: 0.5rem;
}

.offline-subtext {
    font-size: 0.9rem;
}


.info-grid {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1.5rem;
}

.info-item {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.info-label {
    font-size: 0.9rem;
    color: var(--text-color-light);
}

.info-value {
    font-weight: 700;
    color: var(--text-color);
    /* <-- 新增此行，明确指定颜色 */
    word-wrap: break-word;
    word-break: break-all;
}
.info-value.version {
    color: var(--primary-color);
}

.players-sample {
    font-size: 0.85rem;
    color: var(--text-color-light);
    font-style: italic;
    white-space: pre-wrap;
    word-break: break-all;
}

.info-button {
    background-color: transparent;
    border: none;
    color: var(--primary-color);
    font-weight: 700;
    padding: 0;
    cursor: pointer;
    text-align: left;
    font-size: inherit;
}

.info-button:hover {
    text-decoration: underline;
}

.players-info {
    margin-top: auto;
    padding: 1.5rem;
}

.player-count {
    margin-bottom: 0.5rem;
    color: var(--text-color);
}

.progress-bar {
    width: 100%;
    height: 8px;
    background-color: var(--border-color);
    border-radius: 4px;
    overflow: hidden;
}

.progress-bar-inner {
    height: 100%;
    background-color: var(--success-color);
    border-radius: 4px;
    transition: width 0.5s ease;
}

.mod-table {
    width: 100%;
    border-collapse: collapse;
}

.mod-table th,
.mod-table td {
    border-bottom: 1px solid var(--border-color);
    padding: 0.75rem 0.5rem;
    text-align: left;
}

.mod-table th {
    font-weight: 700;
    background-color: var(--background-color);
}

.mod-table tr:last-child td {
    border-bottom: none;
}

.mod-table td:first-child {
    word-break: break-all;
}

.status-card.is-clickable {
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.status-card.is-clickable:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px var(--shadow-color);
}

@media (max-width: 550px) {
    .card {
        flex-direction: column;
    }

    .icon-container {
        width: 100%;
        height: 90px;
        padding: 0.75rem;
        border-right: none;
        border-bottom: 1px solid var(--border-color);
    }

    .server-icon {
        max-width: 64px;
    }

    /* [核心改动] 移除 main-content 的 overflow 属性 */
    .main-content {
        /* overflow-y: auto; */
        padding: 0;
        /* 在column布局下，让子元素自己控制padding */
    }

    .card-header,
    .info-grid,
    .players-info {
        padding: 1rem;
        margin: 0;
    }

    .card-header,
    .info-grid {
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 1rem;
        margin-bottom: 0;
    }

    .players-info {
        padding-top: 1rem;
    }
}
</style>