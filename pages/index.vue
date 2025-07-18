<template>
  <div class="app-wrapper">
    <header class="app-header">
      <div class="text-container">
        <h1>{{ headerTitle }}</h1>
        <p>{{ headerDescription }}</p>
      </div>
    </header>

    <div class="app-content">
      <div class="main-content-area">
        <div class="top-content-block">
          <div v-if="loading" class="card status-box">
            <p>正在连接服务器...</p>
          </div>
          <div v-else-if="error" class="card status-box error-box">
            <strong>错误</strong>
            <p>{{ error }}</p>
          </div>
          <div v-else-if="serverData" class="card status-card">
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
        </div>

        <div class="bottom-content-block">
          <div class="card query-card">
            <div class="form-group">
              <label for="server_field">服务器地址</label>
              <input type="text" id="server_field" class="form-input" v-model="serverAddress"
                  placeholder="例如: play.hypixel.net">
            </div>
            <div class="form-group">
              <label for="port_field">端口 (可选)</label>
              <input type="text" id="port_field" class="form-input" v-model="port" placeholder="例如: 19132">
            </div>
            <button type="button" class="btn btn-primary" :disabled="loading" @click="handleFetchData">
              {{ loading ? '查询中...' : '查询服务器状态' }}
            </button>
          </div>
        </div>

        <div class="generator-container" v-if="serverData">
          <div class="card generator-card">
            <h3>嵌入到你的网页</h3>
            <p class="description">调整下方选项以实时预览效果，然后复制生成的代码。</p>

            <div class="options-grid">
              <div class="form-group">
                <label for="embed-width">宽度 (px)</label>
                <input type="number" id="embed-width" class="form-input" v-model="embedWidth">
              </div>
              <div class="form-group">
                <label for="embed-height">高度 (px) - <span style="font-style: italic; color: #999;">自动调整</span></label>
                <input type="number" id="embed-height" class="form-input" v-model="embedHeight">
              </div>
              <div class="form-group checkbox-group">
                <input type="checkbox" id="dark-mode" class="form-checkbox" v-model="embedDarkMode">
                <label for="dark-mode">暗色模式</label>
              </div>
            </div>

            <div class="preview-area">
              <h4>实时预览</h4>
              <div class="iframe-container" :style="{ width: embedWidth + 'px', height: embedHeight + 'px' }">
                <iframe ref="previewIframe" v-if="generatedIframeHtml" :key="iframeKey" width="100%"
                    :style="{ height: embedHeight + 'px' }" :srcdoc="generatedIframeHtml" frameborder="0" scrolling="no">
                </iframe>
              </div>
            </div>

            <div class="code-area">
              <h4>复制代码</h4>
              <textarea readonly class="form-input code-display" :value="iframeCode"></textarea>
              <button class="btn btn-copy" @click="copyToClipboard">{{ copyButtonText }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <footer class="app-footer">
      <div class="credits">
        <span>
          由 <a :href="developer.url" target="_blank" rel="noopener noreferrer">{{ developer.name }}</a> 开发
        </span>
        <span class="separator">|</span>
        <span>
          由 <a :href="poweredBy.url" target="_blank" rel="noopener noreferrer">{{ poweredBy.name }}</a> 驱动
        </span>
      </div>

      <p class="copyright">
        Copyright © {{ currentYear }}
        <a :href="company.url" target="_blank" rel="noopener noreferrer">{{ company.name }}</a>.
        All Rights Reserved.
      </p>
    </footer>

    <Transition name="modal-fade">
      <div v-if="isModalVisible" class="modal-overlay" @click.self="isModalVisible = false">
        <div class="modal-content">
          <header class="modal-header">
            <h3>Mod 列表 (共 {{ serverData?.mod_info?.modList?.length ?? 0 }} 个)</h3>
            <button class="close-button" @click="isModalVisible = false">&times;</button>
          </header>
          <main class="modal-body">
            <table class="mod-table">
              <thead>
                <tr>
                  <th>Mod ID</th>
                  <th>版本</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="mod in serverData?.mod_info?.modList" :key="mod.modid">
                  <td>{{ mod.modid }}</td>
                  <td>{{ mod.version }}</td>
                </tr>
              </tbody>
            </table>
          </main>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';

// 配置数据
const headerTitle = 'Minecraft 服务器状态查询';
const headerDescription = '查询任何 Minecraft 服务器的实时状态和玩家信息';
const developer = { name: '开发者', url: '#' };
const poweredBy = { name: '技术', url: '#' };
const company = { name: '公司', url: '#' };

const serverAddress = ref('play.hypixel.net');
const port = ref('');
const loading = ref(false);
const error = ref(null);
const serverData = ref(null);
const dynamicMotd = ref(null);

const isModalVisible = ref(false);

const embedWidth = ref(700);
const embedHeight = ref(225);
const embedDarkMode = ref(false);
const copyButtonText = ref('复制');
const previewIframe = ref(null);
const iframeKey = ref(0);

const currentYear = new Date().getFullYear();
const infoLabels = { host: '服务器地址', version: '版本', protocol: '协议版本', gamemode: '游戏模式', delay: '延迟', mod_info: 'Mod 列表', players: '在线列表' };
const displayKeys = ['host', 'version', 'protocol', 'gamemode', 'delay', 'mod_info', 'players'];

const filteredInfoKeys = computed(() => {
  if (!serverData.value) return [];
  if (serverData.value.players && serverData.value.players.sample) {
    return displayKeys.filter(key => serverData.value[key] !== undefined && serverData.value[key] !== null);
  }
  return displayKeys.filter(key => key !== 'players' && serverData.value[key] !== undefined && serverData.value[key] !== null);
});

const iconUrl = computed(() => {
  if (serverData.value && serverData.value.icon) { return serverData.value.icon; }
  return '/mc.png';
});

const motdHtml = computed(() => {
  if (!dynamicMotd.value) return '';
  if (dynamicMotd.value.motd_html) { return dynamicMotd.value.motd_html; }
  return dynamicMotd.value.motd ? parseMotdToHtml(dynamicMotd.value.motd) : '';
});

const playerPercentage = computed(() => {
  if (serverData.value?.players?.max > 0) {
    return (serverData.value.players.online / serverData.value.players.max) * 100;
  }
  return 0;
});

const generatedIframeHtml = computed(() => {
  if (!serverData.value) return '';

  const infoGridHtml = filteredInfoKeys.value.map(key => {
    let valueHtml = '';
    if (key === 'mod_info') {
      valueHtml = `${serverData.value.mod_info.modList.length} 个 Mod`;
    } else if (key === 'delay') {
      valueHtml = `${serverData.value[key]}ms`;
    } else if (serverData.value.players && key === 'players') {
      valueHtml = serverData.value.players.sample;
    } else {
      valueHtml = serverData.value[key];
    }
    return `<div class="info-item">
      <span class="info-label">${infoLabels[key]}</span>
      <div class="info-value${key === 'version' ? ' version' : ''}">${valueHtml}</div>
    </div>`;
  }).join('');

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Minecraft Server Status</title>
    <style>//这部分需要改，临时编出来的css
      body { margin: 0; font-family: Arial, sans-serif; overflow: hidden; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
      .embed-card {
        background-color: #fff;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        padding: 15px;
        box-sizing: border-box;
        max-width: 100%;
      }
      .embed-card.dark-mode {
        background-color: #2b2b2b;
        color: #eee;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      }
      .server-icon { width: 64px; height: 64px; margin-right: 15px; flex-shrink: 0; }
      .main-content { flex-grow: 1; }
      .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
      .motd-display { font-size: 1.1em; font-weight: bold; line-height: 1.3; margin-right: 10px; flex-grow: 1; }
      .status-indicator {
        display: flex; align-items: center; padding: 4px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold; text-transform: uppercase;
        flex-shrink: 0;
      }
      .status-dot { width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; }
      .status-indicator.Java .status-dot, .status-indicator.online .status-dot { background-color: #4CAF50; } /* 绿色 */
      .status-indicator.Bedrock .status-dot { background-color: #2196F3; } /* 蓝色 */
      .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 0.9em; margin-bottom: 10px; }
      .info-item { display: flex; flex-direction: column; }
      .info-label { color: #888; font-size: 0.85em; }
      .embed-card.dark-mode .info-label { color: #aaa; }
      .info-value { font-weight: bold; }
      .players-info { font-size: 0.9em; }
      .player-count { margin-bottom: 5px; }
      .progress-bar { width: 100%; background-color: #e0e0e0; border-radius: 5px; height: 8px; overflow: hidden; }
      .embed-card.dark-mode .progress-bar { background-color: #555; }
      .progress-bar-inner { height: 100%; background-color: #007bff; border-radius: 5px; }

      /* MOTD 颜色码映射 */
      .motd-text .color-0 { color: #000000; } .motd-text .color-1 { color: #0000AA; } .motd-text .color-2 { color: #00AA00; } .motd-text .color-3 { color: #00AAAA; }
      .motd-text .color-4 { color: #AA0000; } .motd-text .color-5 { color: #AA00AA; } .motd-text .color-6 { color: #FFAA00; } .motd-text .color-7 { color: #AAAAAA; }
      .motd-text .color-8 { color: #555555; } .motd-text .color-9 { color: #5555FF; } .motd-text .color-a { color: #55FF55; } .motd-text .color-b { color: #55FFFF; }
      .motd-text .color-c { color: #FF5555; } .motd-text .color-d { color: #FF55FF; } .motd-text .color-e { color: #FFFF55; } .motd-text .color-f { color: #FFFFFF; }
      .motd-text .color-l { font-weight: bold; } /* bold */
      .motd-text .color-m { text-decoration: line-through; } /* strikethrough */
      .motd-text .color-n { text-decoration: underline; } /* underline */
      .motd-text .color-o { font-style: italic; } /* italic */
      .motd-text .color-r { color: #FFFFFF; } /* reset */
    </style>

  </head>
  <body>
    <div class="embed-card ${embedDarkMode.value ? 'dark-mode' : ''}">
      <div class="icon-container">
          <img src="${iconUrl.value}" alt="Server Icon" class="server-icon" />
      </div>
      <div class="main-content">
          <div class="card-header">
              <div class="motd-display">
                  <span class="motd-text">${motdHtml.value}</span>
              </div>
              <div class="status-indicator ${serverData.value.type || serverData.value.status}">
                  <span class="status-dot"></span>
                  ${serverData.value.type}
              </div>
          </div>
          <div class="info-grid">
              ${infoGridHtml}
          </div>
          <div class="players-info">
              <div class="player-count">
                  玩家: <strong>${serverData.value.players?.online ?? 0}</strong> / ${serverData.value.players?.max ?? 0}
              </div>
              <div class="progress-bar">
                  <div class="progress-bar-inner" style="width: ${playerPercentage.value}%"></div>
              </div>
          </div>
      </div>
    </div>
  </body>
  </html>
`;
  return `data:text/html;base64,${btoa(unescape(encodeURIComponent(html)))}`;
});

const iframeCode = computed(() => {
  if (!generatedIframeHtml.value) return '';
  const iframeId = `mc-status-${serverData.value.host.split(':')[0]}`;
  return `<iframe id="${iframeId}" class="responsive-iframe" frameborder="0" width="${embedWidth.value}" height="${embedHeight.value}" scrolling="no" src="${generatedIframeHtml.value}"></iframe>`;
});


const handleFetchData = async () => {
  loading.value = true;
  error.value = null;
  serverData.value = null;

  try {
    const apiUrl = '/api/status';
    // 改用 $fetch
    const response = await $fetch(apiUrl, {
      method: 'GET',
      query: {
        ip: serverAddress.value,
        port: port.value || undefined
      }
    });
    serverData.value = response;
    dynamicMotd.value = { motd: response.motd, motd_html: response.motd_html };
    iframeKey.value++;
  } catch (err) {
    if (err.response?.data?.error) { // 检查 err.response.data
        error.value = err.response.data.error;
    } else if (err.data?.error) { // 或者 err.data
        error.value = err.data.error;
    }
    else {
      error.value = '无法连接到查询后端或发生未知错误。';
    }
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const copyToClipboard = () => {
  if (!iframeCode.value) return;

  const copyText = (text) => {
    if (process.client) {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
      }

      return new Promise((resolve, reject) => {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();

        try {
          const ok = document.execCommand('copy');
          document.body.removeChild(ta);
          ok ? resolve() : reject(new Error('execCommand failed'));
        } catch (e) {
          document.body.removeChild(ta);
          reject(e);
        }
      });
    }
    return Promise.reject(new Error('Clipboard API not available on server side'));
  };

  copyText(iframeCode.value)
    .then(() => {
      copyButtonText.value = '已复制!';
      setTimeout(() => (copyButtonText.value = '复制'), 2000);
    })
    .catch((err) => {
      copyButtonText.value = '复制失败';
      console.error('Could not copy text:', err);
    });
};

const handleIframeMessage = (event) => {
  if (
    previewIframe.value &&
    event.source === previewIframe.value.contentWindow &&
    event.data &&
    event.data.type === 'resize-iframe'
  ) {
    const requiredHeight = event.data.height + 20;
    embedHeight.value = Math.round(requiredHeight);
  };
};

const fetchLatestMotd = async () => {
  if (!serverData.value?.host) return;
  try {
    const [ip, port] = serverData.value.host.split(':');
    const apiUrl = '/api/status';
    const response = await $fetch(apiUrl, { query: { ip, port: port || undefined } });
    dynamicMotd.value = { motd: response.motd, motd_html: response.motd_html };
  } catch (error) {
    console.error("后台MOTD刷新失败:", error.message);
  }
};

function parseMotdToHtml(motd) {
  let result = '';
  let openSpan = false;
  let lastCode = '';
  for (let i = 0; i < motd.length; i++) {
    if (motd[i] === '§' && i + 1 < motd.length) {
      if (openSpan) result += '</span>';
      lastCode = motd[i + 1];
      result += `<span class="color-${lastCode}">`;
      openSpan = true;
      i++; // skip color code
    } else if (motd[i] === '\n') {
      if (openSpan) result += '</span>';
      result += '<br>';
      openSpan = false;
    } else {
      result += motd[i];
    }
  }
  if (openSpan) result += '</span>';
  return result;
}

onMounted(() => {
  handleFetchData();
  if (process.client) {
    window.addEventListener('message', handleIframeMessage);
  }
});

onUnmounted(() => {
  if (process.client) {
    window.removeEventListener('message', handleIframeMessage);
  }
});
</script>

