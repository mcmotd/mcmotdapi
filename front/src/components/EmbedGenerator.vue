<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useConfig } from "../composables/useConfig";
const { t } = useI18n();
const config = useConfig();

// [核心修正 1] 接收从 HomeView 传来的所有原始查询参数
const props = defineProps({
  serverData: {
    type: Object,
    required: true,
  },
  address: String,
  port: String,
  serverType: String,
  isSrv: Boolean,
});

const width = ref(700);
const height = ref(389);
const darkMode = ref(false);
const copyButtonText_iframeCode = ref(t("comp.embedG.copy"));
const copyButtonText_iframeUrl = ref(t("comp.embedG.copy"));
const previewIframe = ref(null);

// [核心改动 1] 新增 ref 用于绑定图标URL输入框
const iconUrl = ref("");

// watch 侦听器现在只负责同步来自服务器的 iconUrl
watch(
  () => props.serverData.icon,
  (newIcon) => {
    if (newIcon && /^https?:\/\/.+/.test(newIcon)) {
      iconUrl.value = newIcon;
    } else {
      iconUrl.value = "";
    }
  },
  { immediate: true }
);

const embedUrl = computed(() => {
  // 如果 props.address 或全局 config 未加载，则返回空字符串
  if (!props.address || !config.value) {
    return "";
  }

  const params = new URLSearchParams();
  params.append("ip", props.address);

  // ... (其他参数的 append 逻辑保持不变)
  if (props.port) params.append("port", props.port);
  if (props.serverType) params.append("stype", props.serverType);
  if (props.isSrv) params.append("srv", String(props.isSrv));
  params.append("dark", String(darkMode.value));
  const icon = iconUrl.value;
  const isHttpUrl = (url) => url && /^https?:\/\/.+\..+/.test(url);
  if (isHttpUrl(icon)) params.append("icon", icon);
  params.append("source", `mc-status-${props.address}`);

  // [修改] 从动态的 config.value 中获取 embed.baseUrl
  const fullBaseUrl = window.location.origin + config.value.embed.baseUrl;
  return `${fullBaseUrl}?${params.toString()}`;
});

// [核心修正 3] iframeCode 也需要使用原始的 address 和 port
const iframeCode = computed(() => {
  if (!embedUrl.value) return "";
  const uniqueId = `${props.address}-${props.port || ""}`.replace(/[:.]/g, "-");
  const iframeId = `mc-status-${uniqueId}`;

  const iframeTag = `<iframe id="${iframeId}" class="responsive-iframe" frameborder="0" width="${width.value}" height="${height.value}" scrolling="no" src="${embedUrl.value}"></iframe>`;
  const scriptTag = `
    <script>
        window.addEventListener('message', function(event) {
    var iframe = document.getElementById('${iframeId}');
        if (event.source === iframe.contentWindow && event.data && event.data.type === 'resize-iframe') {
            iframe.style.height = event.data.height + 'px';
    }
  });
        <\/script>`;
  return iframeTag + scriptTag;
});

const iframeUrl = ref("");
// [核心修复] 2. 使用 watch 监听 serverData 的变化，来自动更新 imageUrl 的值
// 这样既保留了自动生成的功能，也允许用户手动修改
watch(
  () => embedUrl,
  (newServerData) => {
    const apiUrl = embedUrl.value.replace("/iframe?", "/api/iframe_img?");
    iframeUrl.value = apiUrl;
  },
  { immediate: true }
); // immediate: true 确保组件初始加载时也能执行一次

const copyToClipboard = (textInputValue, copyButtonText) => {
  if (!textInputValue) return;
  const copyText = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        ok ? resolve() : reject(new Error("execCommand failed"));
      } catch (e) {
        document.body.removeChild(ta);
        reject(e);
      }
    });
  };
  copyText(textInputValue)
    .then(() => {
      copyButtonText.value = t("comp.embedG.copyed");
      setTimeout(() => (copyButtonText.value = t("comp.embedG.copy")), 2000);
    })
    .catch((err) => {
      copyButtonText.value = t("comp.embedG.copyFailed");
    });
};
const handleIframeMessage = (event) => {
  if (
    previewIframe.value &&
    event.source === previewIframe.value.contentWindow &&
    event.data &&
    event.data.type === "resize-iframe"
  ) {
    const requiredHeight = event.data.height;
    height.value = Math.round(requiredHeight);
  }
};

const copyToClipboard_iframeCode = () => {
  copyToClipboard(iframeCode.value, copyButtonText_iframeCode);
};

const copyToClipboard_iframeUrl = () => {
  copyToClipboard(iframeUrl.value, copyButtonText_iframeUrl);
};

onMounted(() => {
  window.addEventListener("message", handleIframeMessage);
});
onUnmounted(() => {
  window.removeEventListener("message", handleIframeMessage);
});
</script>

<template>
  <div class="card generator-card">
    <h3>{{ $t("comp.embedG.title") }}</h3>
    <p class="description">{{ $t("comp.embedG.description") }}</p>

    <div class="options-grid">
      <div class="form-group">
        <label for="embed-width">{{ $t("comp.embedG.width") }} (px)</label>
        <input
          type="number"
          id="embed-width"
          class="form-input"
          v-model="width"
        />
      </div>
      <div class="form-group">
        <label for="embed-height"
          >{{ $t("comp.embedG.height") }} (px) -
          <span class="label-hint">{{
            $t("comp.embedG.autoAdjust")
          }}</span></label
        >
        <input
          type="number"
          id="embed-height"
          class="form-input"
          v-model="height"
        />
      </div>
      <div class="form-group icon-group">
        <label for="embed-icon">{{ $t("comp.embedG.iconUrl") }}</label>
        <input
          type="text"
          id="embed-icon"
          class="form-input"
          v-model="iconUrl"
          placeholder="https://example.com/icon.png"
        />
      </div>
      <div class="form-group checkbox-group">
        <input
          type="checkbox"
          id="dark-mode"
          class="form-checkbox"
          v-model="darkMode"
        />
        <label for="dark-mode">{{ $t("comp.embedG.darkMode") }}</label>
      </div>
    </div>

    <div class="preview-area">
      <h4>{{ $t("comp.embedG.preview") }}</h4>
      <div class="iframe-container" :style="{ height: height + 'px' }">
        <iframe
          ref="previewIframe"
          :key="embedUrl"
          :src="embedUrl"
          width="100%"
          :height="height"
          frameborder="0"
          scrolling="no"
          style="display: block"
        >
        </iframe>
      </div>
    </div>

    <div class="code-area">
      <h4>{{ $t("comp.embedG.copyCode") }}</h4>
      <textarea
        readonly
        class="form-input code-display"
        :value="iframeCode"
      ></textarea>
      <button class="btn btn-copy" @click="copyToClipboard_iframeCode">
        {{ copyButtonText_iframeCode }}
      </button>
    </div>

    <div class="code-area">
      <h4>复制图片链接</h4>
      <input type="text" class="form-input-url" v-model="iframeUrl" />
      <button class="btn btn-copy" @click="copyToClipboard_iframeUrl">
        {{ copyButtonText_iframeUrl }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ... (样式部分保持不变，仅为网格布局和标签提示稍作调整) ... */
.card.generator-card {
  font-family: "Noto Sans SC", sans-serif;
  background-color: var(--card-background);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 25px var(--shadow-color);
}

h3 {
  font-weight: 700;
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

h4 {
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 0.75rem;
  margin-top: 2rem;
  border-top: 1px solid var(--border-color);
  padding-top: 1.5rem;
}

.description {
  color: var(--text-color-light);
  margin-bottom: 2rem;
}

.options-grid {
  display: grid;
  /* 调整网格以更好地适应新项目 */
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  align-items: flex-end;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 0;
}

label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.label-hint {
  font-style: italic;
  color: #999;
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
}

.form-input-url {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  font-family: "Courier New", Courier, monospace;
  flex-grow: 1;
}

.checkbox-group {
  display: flex;
  align-items: center;
  padding-bottom: 0.75rem;
}

.form-checkbox {
  width: 1.25em;
  height: 1.25em;
  margin-right: 0.5rem;
}

.preview-area {
  width: 100%;
}

.iframe-container {
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  background-color: var(--background-color);
  margin: 1rem auto;
  transition: height 0.3s ease;
  box-sizing: border-box;
  overflow: hidden;
  max-width: 100%;
}

.iframe-container iframe {
  display: block;
  border: none;
  transition: height 0.3s ease;
  width: 100%;
  height: 100%;
}

.code-area {
  position: relative;
}

.code-display {
  width: 100%;
  height: 120px;
  resize: vertical;
  font-family: "Courier New", Courier, monospace;
  font-size: 0.9rem;
  color: var(--text-color);
  background-color: var(--background-color);
}

.btn {
  padding: 0.8rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s;
  font-family: inherit;
}

.btn-copy {
  display: block;
  width: 100%;
  margin-top: 1rem;
  background-color: var(--primary-color);
  color: #fff;
}

.btn-copy:hover {
  background-color: var(--primary-color-hover);
}

/* 确保图标输入框能很好地融入网格 */
@media (min-width: 680px) {
  .icon-group {
    grid-column: 1 / -1;
    /* 在较宽屏幕上，让图标输入框占据整行 */
  }
}
</style>
