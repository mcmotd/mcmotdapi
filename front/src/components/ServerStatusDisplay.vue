<script setup>
import { computed, ref, watch } from 'vue';
import { parseMotdToHtml } from '../utils/motd-parser.js';
import defaultIcon from '/mc.png';
import InfoModal from './InfoModal.vue';
import axios from 'axios';
import { useConfig } from '../composables/useConfig';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const config = useConfig();

const props = defineProps({
  serverData: {
    type: Object,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  hasQueried: {
    type: Boolean,
    default: false,
  }
});

const emit = defineEmits(['card-click']);

const isModalVisible = ref(false);
// isOffline 的计算逻辑保持不变，但其渲染时机将被调整
const isOffline = computed(() => props.serverData?.status === 'offline' || !props.serverData?.version);

// --- MOD 弹窗标题国际化 ---
const modCount = computed(() => props.serverData?.mod_info?.modList?.length ?? 0);
const modalTitle = computed(() => t('comp.serverDis.modCount', modCount.value, { count: modCount.value }));

// --- 其他计算属性 ---
const infoLabels = computed(() => ({
  host: t('comp.serverDis.host'),
  version: t('comp.serverDis.version'),
  protocol: t('comp.serverDis.protocol'),
  gamemode: t('comp.serverDis.gamemode'),
  delay: t('comp.serverDis.delay'),
  mod_info: t('comp.serverDis.modList'),
  players: t('comp.serverDis.onlineList'),
  levelname: t('comp.serverDis.levelname')
}));
const displayKeys = ['host', 'version', 'protocol', 'gamemode', 'delay', 'mod_info', 'players', 'levelname'];
const filteredInfoKeys = computed(() => {
  if (isOffline.value || !props.serverData) return [];
  if (props.serverData.players && props.serverData.players.sample) {
    return displayKeys.filter(key => props.serverData[key] !== undefined && props.serverData[key] !== null);
  }
  return displayKeys.filter(key => key !== 'players' && props.serverData[key] !== undefined && props.serverData[key] !== null);
});
const iconUrl = computed(() => (props.serverData?.icon) ? props.serverData.icon : defaultIcon);
const playerPercentage = computed(() => {
  if (isOffline.value || !props.serverData.players) return 0;
  return props.serverData.players.max > 0 ? (props.serverData.players.online / props.serverData.players.max) * 100 : 0;
});

const motdHtml = computed(() => {
  if (!props.serverData) return '';
  if (props.serverData.motd_html) {
    return props.serverData.motd_html;
  }
  if (props.serverData.motd) {
    return parseMotdToHtml(props.serverData.motd);
  }
  return '';
});

const offlineSlogan = ref('');
const fetchSlogan = async () => {
  if (!config.value?.failureState?.sloganApi) return;
  try {
    const response = await axios.get(config.value.failureState.sloganApi);
    offlineSlogan.value = response.data;
  } catch (error) {
    console.error("获取离线标语失败:", error);
    offlineSlogan.value = config.value.failureState.defaultSlogan;
  }
};

watch(config, (newConfig) => {
  if (newConfig?.failureState) {
    offlineSlogan.value = newConfig.failureState.defaultSlogan;
    fetchSlogan();
  }
}, { immediate: true });
</script>

<template>
  <div>
    <div class="card status-card" :class="{ 'is-clickable': !isOffline && !loading && hasQueried }"
      @click="!isOffline && !loading && hasQueried && $emit('card-click')">

      <div v-if="loading" class="loading-container">
        <p class="loading-text">{{ $t('view.home.connectingMsg') }}</p>
        <div class="loading-bar-container">
          <div class="loading-bar"></div>
        </div>
      </div>

      <div v-else-if="!hasQueried" class="initial-container">
        <span class="initial-prompt-text">{{ t("comp.serverDis.initialPrompt") }}</span>
      </div>

      <div v-else-if="isOffline" class="offline-container">
        <span class="offline-slogan">{{ offlineSlogan || '查询失败' }}</span>
        <span class="offline-subtext">{{ config?.failureState?.subtext }}</span>
      </div>

      <div v-else class="online-content-wrapper">
        <div class="icon-container">
          <img :src="iconUrl" alt="Server Icon" class="server-icon" />
        </div>
        <div class="main-content">
          <div class="card-header">
            <div v-if="motdHtml" class="motd-display" v-html="motdHtml"></div>
            <div class="status-indicator" :class="serverData.type || serverData.status">
              <span class="status-dot"></span>
              {{ serverData.type }}
            </div>
          </div>
          <div class="info-grid">
            <div v-for="key in filteredInfoKeys" :key="key" class="info-item">
              <span class="info-label">{{ infoLabels[key] }}</span>
              <div v-if="key === 'mod_info'" class="info-value">
                <button @click.stop="isModalVisible = true" class="info-button">
                  {{ serverData.mod_info.modList.length }} {{ $t('comp.serverDis.clickToView') }}
                </button>
              </div>
              <div v-else-if="key === 'players'" class="info-value players-sample">
                {{ serverData.players.sample }}
              </div>
              <span v-else-if="key === 'delay'" class="info-value">{{ serverData[key] }}ms</span>
              <span v-else class="info-value" :class="{ version: key === 'version' }">{{ serverData[key]
              }}</span>
            </div>
          </div>
          <div class="players-info">
            <div class="player-count">
              {{ $t('comp.serverDis.players') }}: <strong>{{ serverData.players?.online ?? 0 }}</strong> /
              {{ serverData.players?.max ?? 0 }}
            </div>
            <div class="progress-bar">
              <div class="progress-bar-inner" :style="{ width: playerPercentage + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <teleport to="body" v-if="!isOffline && serverData.mod_info?.modList?.length">
      <InfoModal :show="isModalVisible" :title="modalTitle" @close="isModalVisible = false">
        <table class="mod-table">
          <thead>
            <tr>
              <th>Mod ID</th>
              <th>{{ $t('comp.serverDis.modVersion') }}</th>
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
/* 根元素与状态 */
.card.status-card {
  position: relative;
  background-color: var(--card-background);
  border-radius: 12px;
  padding: 0;
  overflow: hidden;
  display: flex;
  user-select: none;
  cursor: default;
  width: 100%;
  height: 100%;
  min-height: 225px;
  transition: all 0.3s ease;
}

.status-card.is-clickable {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.status-card.is-clickable:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px var(--shadow-color);
}


/* 加载中状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--text-color-light);
  position: relative;
  padding: 2rem;
  box-sizing: border-box;
}

.loading-text {
  font-size: 1.1rem;
  font-weight: 500;
  padding-bottom: 2rem;
}

.loading-bar-container {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background-color: rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.loading-bar {
  width: 50%;
  height: 100%;
  background-color: var(--primary-color);
  border-radius: 2px;
  animation: indeterminate-progress 1.5s ease-in-out infinite;
}

@keyframes indeterminate-progress {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(300%);
  }
}

/* 初始状态容器样式 */
.initial-container {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  box-sizing: border-box;
}

.initial-prompt-text {
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--text-color);
}

/* 离线状态 */
.offline-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--background-color-light, #f8f9fa);
  color: var(--text-color-light);
  padding: 2rem;
  box-sizing: border-box;
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


/* 在线状态 */
.online-content-wrapper {
  display: flex;
  width: 100%;
  height: 100%;
}

.icon-container {
  flex-shrink: 0;
  width: 120px;
  padding: 1.5rem;
  border-right: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.server-icon {
  width: 100%;
  max-width: 96px;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
}

.main-content {
  flex-grow: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
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
  font-family: "Noto Sans SC", sans-serif;
  font-weight: 500;
  line-height: 1.5;
  text-align: left;
  font-size: clamp(0.8rem, 2.5vw, 1rem);
  word-wrap: break-word;
  flex-grow: 1;
  min-width: 0;
}

/* [核心修改] 最终稳定版的乱码 (Obfuscated) 文本样式 */
:deep(.obfuscated) {
  display: inline-block;
  position: relative;
  width: 0.65em;
  height: 1em;
  /* 高度与字体大小一致 */
  vertical-align: -0.10em;
  /* [核心] 微调垂直对齐，负值向下移动 */
}
:deep(.obfuscated)::before {
  content: " ";
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  color: #AAAAAA;
  font-weight: bold;
  font-family: monospace;
  text-shadow: none;

  /* Flexbox居中，确保动画字符在固定容器内 */
  display: flex;
  align-items: center;
  justify-content: center;

  animation: obfuscate-char-anim 80ms steps(1, end) infinite;
}

@keyframes obfuscate-char-anim {
  0% {
    content: 'A';
  }

  4% {
    content: 'B';
  }

  8% {
    content: 'C';
  }

  12% {
    content: 'D';
  }

  16% {
    content: 'E';
  }

  20% {
    content: 'F';
  }

  24% {
    content: 'G';
  }

  28% {
    content: 'H';
  }

  32% {
    content: 'I';
  }

  36% {
    content: 'J';
  }

  40% {
    content: 'K';
  }

  44% {
    content: 'L';
  }

  48% {
    content: 'M';
  }

  52% {
    content: 'N';
  }

  56% {
    content: 'O';
  }

  60% {
    content: 'P';
  }

  64% {
    content: 'Q';
  }

  68% {
    content: 'R';
  }

  72% {
    content: 'S';
  }

  76% {
    content: 'T';
  }

  80% {
    content: 'U';
  }

  84% {
    content: 'V';
  }

  88% {
    content: 'W';
  }

  92% {
    content: 'X';
  }

  96% {
    content: 'Y';
  }

  100% {
    content: 'Z';
  }
}


/* (以下样式保持不变) */
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

@media (max-width: 550px) {
  .online-content-wrapper {
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

  .main-content {
    padding: 0;
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