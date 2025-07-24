<script setup>
import { ref, onMounted, computed, nextTick, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { marked } from "marked";

// 获取 t 函数和当前的 locale
const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();

const loading = ref(true);
const error = ref(null);
const markdownContent = ref("");
const currentPage = ref("index");
const isSidebarOpen = ref(false); // 控制侧边栏展开/收起状态
const isMobile = ref(false); // 判断是否为移动设备

// 文档页面映射
const pages = {
  index: "首页",
  guide: "入门指南",
  api: "API 参考",
  faq: "常见问题",
};

const currentPageTitle = computed(() => {
  return pages[currentPage.value] || "文档";
});

// 检查是否为移动设备
const checkIsMobile = () => {
  isMobile.value = window.innerWidth < 768;
  if (!isMobile.value) {
    isSidebarOpen.value = true; // 在桌面设备上默认展开侧边栏
  }
};

// 配置 marked 选项
marked.setOptions({
  gfm: true,
  breaks: true,
  smartLists: true,
  smartypants: true,
});

// 动态导入 highlight.js 并进行代码高亮
const highlightCodeBlocks = async () => {
  try {
    const hljs = (await import('highlight.js')).default;
    await import('highlight.js/styles/monokai.css');
    
    document.querySelectorAll('pre code').forEach((block) => {
      if (!block.dataset.highlighted) {
        hljs.highlightElement(block);
        block.dataset.highlighted = "true";
      }
    });
  } catch (err) {
    console.warn('代码高亮加载失败:', err);
  }
};

const loadMarkdown = async (page = "index") => {
  loading.value = true;
  error.value = null;

  try {
    const response = await fetch(`/docs/${page}.md`);
    if (!response.ok) {
      throw new Error(`无法加载文档: ${response.statusText}`);
    }

    const text = await response.text();
    markdownContent.value = marked.parse(text);
    currentPage.value = page;

    // 使用 nextTick 确保 DOM 更新后再进行代码高亮
    nextTick(() => {
      highlightCodeBlocks();
    });
  } catch (err) {
    error.value = err.message;
    console.error("加载文档时出错:", err);
  } finally {
    loading.value = false;
  }
};

const navigateTo = (page) => {
  router.push(`/docs?page=${page}`);
  loadMarkdown(page);
  
  // 在移动设备上点击导航项后关闭侧边栏
  if (isMobile.value) {
    isSidebarOpen.value = false;
  }
};

// 切换侧边栏状态
const toggleSidebar = () => {
  if (isMobile.value) {
    isAnimating.value = true;
    isSidebarOpen.value = !isSidebarOpen.value;
    
    // 动画完成后重置状态
    setTimeout(() => {
      isAnimating.value = false;
    }, 190);
  } else {
    isSidebarOpen.value = !isSidebarOpen.value;
  }
};

onMounted(() => {
  const page = route.query.page || "index";
  loadMarkdown(page);
  
  // 检查设备类型
  checkIsMobile();
  window.addEventListener('resize', checkIsMobile);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkIsMobile);
});
</script>

<template>
  <teleport to="head">
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </teleport>

  <div class="docs-wrapper">
    <!-- 侧边栏 -->
    <aside 
      class="sidebar" 
      :class="{ 'mobile-sidebar': isMobile, 'sidebar-open': isSidebarOpen }"
    >
      <!-- 移动端关闭按钮（位于侧边栏内部） -->
      <button 
        v-if="isMobile && isSidebarOpen" 
        class="mobile-close-button"
        @click="toggleSidebar"
      >
        <svg class="menu-icon" viewBox="0 0 24 24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>

      <h2>文档</h2>
      <nav>
        <ul>
          <li
            v-for="(title, page) in pages"
            :key="page"
            :class="{ active: currentPage === page }"
            @click="navigateTo(page)"
          >
            {{ title }}
          </li>
        </ul>
      </nav>
    </aside>

    <!-- 遮罩层（移动端） -->
    <div 
      v-if="isMobile && isSidebarOpen" 
      class="overlay" 
      @click="toggleSidebar"
    ></div>

    <main class="content" :class="{ 'with-sidebar': !isMobile || isSidebarOpen }">
        <!-- 移动端打开按钮（位于内容区域） -->
        <button 
        v-if="isMobile" 
        class="mobile-open-button"
        @click="toggleSidebar"
        >
        <svg class="menu-icon" viewBox="0 0 24 24">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
        </button>

      <div v-if="loading" class="message-box">
        {{ $t("view.embed.loadingMsg") }}
      </div>

      <div v-else-if="error" class="message-box error-box">
        {{ error }}
      </div>

      <article class="markdown-content" v-html="markdownContent"></article>
    </main>
  </div>
</template>

<style>
.docs-wrapper {
  display: flex;
  min-height: calc(100vh - 100px);
  margin: 20px;
  background-color: var(--card-background);
  border-radius: 12px;
  box-shadow: 0 4px 25px var(--shadow-color);
  overflow: hidden;
  font-family: 'Noto Sans SC', sans-serif;
  position: relative;
}

.sidebar {
  width: 250px;
  background-color: #f4f7f9;
  padding: 20px;
  border-right: 1px solid var(--border-color);
  transition: transform 0.3s ease;
  position: relative; /* 添加相对定位 */
}

/* 移动端侧边栏样式 */
.sidebar.mobile-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  z-index: 99;
  transform: translateX(-100%);
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2);
  margin: 0;
  border-radius: 0;
}

.sidebar.mobile-sidebar.sidebar-open {
  transform: translateX(0);
}

/* 遮罩层 */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 98;
}

.sidebar h2 {
  margin-top: 0;
  color: var(--text-color);
}

.sidebar ul {
  list-style-type: none;
  padding: 0;
}

.sidebar li {
  padding: 10px 15px;
  margin: 5px 0;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.sidebar li:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.sidebar li.active {
  background-color: var(--primary-color);
  color: white;
}

/* 移动端关闭按钮（位于侧边栏内部） */
.mobile-close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 30px;
  height: 30px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}

/* 移动端打开按钮（位于内容区域） */
.mobile-open-button {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 90;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 60px;
  height: 60px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: opacity 0.1s ease;
  opacity: 1;
}

/* 当侧边栏正在展开时隐藏打开按钮 */
.mobile-open-button.hidden {
  opacity: 0;
  pointer-events: none;
}

.menu-icon {
  width: 80%;
  height: 80%;
  fill: currentColor; /* 使用当前颜色填充SVG */
}

.content {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
  transition: all 0.3s ease;
  position: relative;
}

.content.with-sidebar {
  margin-left: 0;
}

.message-box {
  padding: 1rem;
  font-size: 1rem;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.error-box {
  color: var(--error-color);
  background-color: var(--status-error-bg);
}

.markdown-content {
  color: var(--text-color);
}

/* 自定义标题样式 */
.markdown-content h1 {
  font-size: 2.5em;
  border-bottom: 2px solid var(--primary-color);
  padding-bottom: 0.5em;
  margin-bottom: 1em;
}

.markdown-content h2 {
  font-size: 2em;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.3em;
  margin-bottom: 0.8em;
}

.markdown-content h3 {
  font-size: 1.75em;
  margin-bottom: 0.6em;
}

/* 段落和列表样式 */
.markdown-content p {
  line-height: 1.6;
  margin-bottom: 1.2em;
  font-size: 1em;
}

.markdown-content ul,
.markdown-content ol {
  padding-left: 20px;
  margin-bottom: 1em;
}

.markdown-content li {
  margin-bottom: 0.5em;
  font-size: 1em;
}

.markdown-content ul li {
  list-style-type: disc;
}

.markdown-content ol li {
  list-style-type: decimal;
}

/* 代码块样式优化 */
.markdown-content pre {
  background-color: #2d2d2d;
  color: #f8f8f2;
  padding: 15px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 1em 0;
  position: relative;
  font-size: 0.9em;
  line-height: 1.4;
}

.markdown-content pre::before {
  content: attr(data-language);
  position: absolute;
  top: 0;
  right: 0;
  background-color: #3a3a3a;
  color: #fff;
  padding: 2px 6px;
  font-size: 0.8em;
  border-radius: 0 0 4px 4px;
  font-weight: bold;
}

.markdown-content pre code {
  background-color: transparent;
  padding: 0;
  display: block;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 链接样式 */
.markdown-content a {
  color: var(--primary-color);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-bottom 0.2s;
}

.markdown-content a:hover {
  border-bottom: 1px solid var(--primary-color);
}

/* 表格样式 */
.markdown-content table {
  border-collapse: collapse;
  width: 100%;
  margin: 1.5em 0;
  border: 1px solid var(--border-color);
}

.markdown-content th,
.markdown-content td {
  border: 1px solid var(--border-color);
  padding: 8px 12px;
  text-align: left;
  background-color: rgba(0, 0, 0, 0.05);
}

.markdown-content th {
  background-color: rgba(0, 0, 0, 0.1);
  font-weight: bold;
}

.markdown-content tr:nth-child(even) td {
  background-color: rgba(0, 0, 0, 0.03);
}

/* 引用和强调 */
.markdown-content blockquote {
  margin: 1em 0;
  padding: 10px 20px;
  background-color: rgba(0, 0, 0, 0.05);
  border-left: 4px solid var(--primary-color);
  font-style: italic;
}

.markdown-content strong {
  font-weight: bold;
  color: var(--text-color);
}

.markdown-content em {
  font-style: italic;
  color: var(--text-color);
}

/* 语法高亮样式 */
.hljs {
  display: block;
  overflow-x: auto;
  padding: 0.5em;
  color: #abb2bf;
  background: #282c34;
}

.hljs-comment,
.hljs-quote {
  color: #5c6370;
}

.hljs-doctag,
.hljs-keyword,
.hljs-meta .hljs-keyword,
.hljs-tag .hljs-title,
.hljs-variable.language_ {
  color: #c678dd;
}

.hljs-name,
.hljs-section,
.hljs-selector-class,
.hljs-selector-id,
.hljs-title {
  color: #61afef;
}

.hljs-attr,
.hljs-attribute,
.hljs-literal,
.hljs-number,
.hljs-regexp,
.hljs-string,
.hljs-symbol,
.hljs-template-tag,
.hljs-template-variable,
.hljs-type,
.hljs-variable {
  color: #e5c07b;
}

.hljs-built_in,
.hljs-class .hljs-title {
  color: #e06c75;
}

.hljs-bullet,
.hljs-link,
.hljs-meta,
.hljs-selector-attr,
.hljs-selector-pseudo {
  color: #979797;
}

.hljs-addition,
.hljs-emphasis {
  font-style: italic;
}

.hljs-abbr,
.hljs-deletion,
.hljs-strong {
  font-weight: bold;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .mobile-close-button,
  .mobile-open-button {
    display: flex;
  }
  
  .docs-wrapper {
    margin: 10px;
    min-height: calc(100vh - 20px);
  }
  
  .content {
    padding: 20px;
    padding-top: 60px; /* 为菜单按钮留出空间 */
  }
  
  .sidebar {
    width: 250px;
  }
}

@media (min-width: 769px) {
  .sidebar {
    transform: translateX(0) !important;
  }
}
</style>