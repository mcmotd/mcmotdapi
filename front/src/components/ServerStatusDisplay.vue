<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { parseMotdToHtml } from '../utils/motd-parser.js';
import defaultIcon from '../assets/mc.png';
import InfoModal from './InfoModal.vue';
import axios from 'axios';
import { defaultConfig } from '../config/app.config.js';

const props = defineProps({
    serverData: {
        type: Object,
        required: true,
    },
});

const isModalVisible = ref(false);

const infoLabels = { host: '服务器地址', version: '版本', protocol: '协议版本', gamemode: '游戏模式', delay: '延迟', mod_info: 'Mod 列表', players: '在线列表' };
const displayKeys = ['host', 'version', 'protocol', 'gamemode', 'delay', 'mod_info', 'players'];

const filteredInfoKeys = computed(() => {
    if (!props.serverData) return [];
    if (props.serverData.players && props.serverData.players.sample) {
        return displayKeys.filter(key => props.serverData[key] !== undefined && props.serverData[key] !== null);
    }
    return displayKeys.filter(key => key !== 'players' && props.serverData[key] !== undefined && props.serverData[key] !== null);
});

const iconUrl = computed(() => {
    if (props.serverData && props.serverData.icon) { return props.serverData.icon; }
    return defaultIcon;
});

const dynamicMotd = ref(null);
const motdHtml = computed(() => {
    if (!dynamicMotd.value) return '';
    if (dynamicMotd.value.motd_html) { return dynamicMotd.value.motd_html; }
    return dynamicMotd.value.motd ? parseMotdToHtml(dynamicMotd.value.motd) : '';
});

const playerPercentage = computed(() => {
    if (props.serverData.players?.max > 0) {
        return (props.serverData.players.online / props.serverData.players.max) * 100;
    }
    return 0;
});

let motdUpdateInterval = null;

const fetchLatestMotd = async () => {
    if (!props.serverData?.host) return;
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
    dynamicMotd.value = { motd: props.serverData.motd, motd_html: props.serverData.motd_html };
    if (props.serverData.status === 'online') {
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
    <div class="card status-card">
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
                    <div v-else-if="key === 'players'" class="info-value players-sample">{{ serverData.players.sample }}
                    </div>
                    <span v-else-if="key === 'delay'" class="info-value">{{ serverData[key] }}ms</span>
                    <span v-else class="info-value" :class="{ version: key === 'version' }">{{ serverData[key] }}</span>
                </div>
            </div>
            <div class="players-info">
                <div class="player-count">
                    玩家: <strong>{{ serverData.players?.online ?? 0 }}</strong> / {{ serverData.players?.max ?? 0 }}
                </div>
                <div class="progress-bar">
                    <div class="progress-bar-inner" :style="{ width: playerPercentage + '%' }"></div>
                </div>
            </div>
        </div>
    </div>

    <teleport to="body">
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

.status-indicator.offline {
    background-color: #fbebee;
    color: var(--error-color);
}

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