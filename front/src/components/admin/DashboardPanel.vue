<script setup>
defineProps({
    config: {
        type: Object,
        required: true
    }
});
</script>

<template>
    <div class="dashboard-panel">
        <div class="dashboard-grid">

            <div class="info-card tall-card">
                <h3>页眉 (Header)</h3>
                <dl>
                    <dt>主标题</dt>
                    <dd>{{ config.header.title }}</dd>
                    <dt>描述文本</dt>
                    <dd class="description">{{ config.header.description }}</dd>
                    <dt>背景轮播图</dt>
                    <dd>
                        <div class="image-previews">
                            <a v-for="img in config.header.carousel.images" :key="img" :href="img" target="_blank"
                                :title="img">
                                <img :src="img" alt="Carousel Image Preview">
                            </a>
                        </div>
                    </dd>
                </dl>
            </div>

            <div class="info-card tall-card">
                <h3>侧边栏菜单 (Side Menu)</h3>
                <div class="preview-wrapper">
                    <div class="menu-list-preview">
                        <div v-for="item in config.side_menu.items" :key="item.id" class="menu-list-item">
                            <div class="icon-wrapper" v-html="item.svg_icon"></div>
                            <span>{{ item.title }}</span>
                        </div>
                    </div>
                    <div class="preview-overlay">预览图</div>
                </div>
            </div>

            <div class="info-card">
                <h3>默认服务器 (Default Server)</h3>
                <dl>
                    <dt>启用状态</dt>
                    <dd :class="config.defaultServer.enable ? 'status-enabled' : 'status-disabled'">
                        {{ config.defaultServer.enable ? '已启用' : '已禁用' }}
                    </dd>
                    <dt>主机地址</dt>
                    <dd>{{ config.defaultServer.host || '未设置' }}</dd>
                    <dt>端口</dt>
                    <dd>{{ config.defaultServer.port || '未设置' }}</dd>
                </dl>
            </div>

            <div class="info-card">
                <h3>页脚 (Footer)</h3>
                <dl>
                    <dt>技术支持</dt>
                    <dd><a :href="config.footer.poweredBy.url" target="_blank">{{ config.footer.poweredBy.name }}</a>
                    </dd>
                    <dt>公司信息</dt>
                    <dd><a :href="config.footer.company.url" target="_blank">{{ config.footer.company.name }}</a></dd>
                    <dt>自定义HTML (渲染效果)</dt>
                    <dd>
                        <div class="html-preview-wrapper">
                            <div class="html-preview" v-html="config.footer.customHtml"></div>
                            <div class="preview-overlay small">预览</div>
                        </div>
                    </dd>
                </dl>
            </div>

            <div v-if="config.contributors && config.contributors.enable" class="info-card">
                <h3>贡献者 (Contributors)</h3>
                <dl>
                    <div v-for="member in config.contributors.member" :key="member.name" class="contributor-item">
                        <img :src="member.avatar" class="avatar" alt="avatar" />
                        <div>
                            <dt>{{ member.name }} - <span class="title">{{ member.title }}</span></dt>
                            <dd><i>"{{ member.slogan }}"</i></dd>
                        </div>
                    </div>
                </dl>
            </div>

            <div class="info-card">
                <h3>其他配置</h3>
                <dl>
                    <dt>离线标语API</dt>
                    <dd><code>{{ config.failureState.sloganApi }}</code></dd>
                    <dt>默认离线标语</dt>
                    <dd>{{ config.failureState.defaultSlogan }}</dd>
                    <dt>客户端下载链接</dt>
                    <dd><a :href="config.client.downloadUrl" target="_blank">{{ config.client.downloadUrl }}</a></dd>
                </dl>
            </div>

        </div>
    </div>
</template>

<style scoped>
h2,
h3 {
    margin: 0;
}

.dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 1.5rem;
}

.info-card {
    background: var(--card-background);
    padding: 1.5rem 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 15px var(--shadow-color);
    display: flex;
    flex-direction: column;
}

.info-card.tall-card {
    grid-row: span 2;
}

h3 {
    font-size: 1.2rem;
    font-weight: 700;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.8rem;
    margin-bottom: 1rem;
}

dl {
    margin: 0;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
}

dt {
    font-weight: 500;
    color: var(--text-color-light);
    margin-top: 1rem;
    font-size: 0.9rem;
}

dd {
    margin: 0.3rem 0 0 0;
    font-weight: 500;
    color: var(--text-color);
    word-wrap: break-word;
}

dd.description {
    white-space: pre-wrap;
    font-size: 0.95rem;
    line-height: 1.6;
}

dd code {
    font-family: 'Courier New', Courier, monospace;
    background: var(--background-color);
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-size: 0.85rem;
}

a {
    color: var(--primary-color);
    text-decoration: none;
}

a:hover {
    text-decoration: underline;
}

.status-enabled {
    color: var(--success-color);
    font-weight: 700;
}

.status-disabled {
    color: var(--error-color);
    font-weight: 700;
}

/* 轮播图预览 */
.image-previews {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.5rem;
}

.image-previews img {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 8px;
    border: 2px solid var(--border-color);
    transition: transform 0.2s;
}

.image-previews img:hover {
    transform: scale(1.1);
}

/* 通用预览容器和遮罩 */
.preview-wrapper,
.html-preview-wrapper {
    position: relative;
    border: 1px dashed var(--border-color);
    border-radius: 8px;
    padding: 1rem;
}

.preview-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(128, 128, 128, 0.4);
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1.5rem;
    font-weight: bold;
    text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5);
    pointer-events: none;
    border-radius: inherit;
}

.preview-overlay.small {
    font-size: 1rem;
    background-color: rgba(128, 128, 128, 0.5);
}

/* 修改：侧边栏菜单列表预览样式 */
.menu-list-preview {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.menu-list-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    background-color: rgba(128, 128, 128, 0.1);
}

.icon-wrapper {
    width: 20px;
    height: 20px;
    color: var(--text-color);
}

.icon-wrapper :deep(svg) {
    width: 100%;
    height: 100%;
    fill: currentColor;
}

.menu-list-item span {
    font-weight: 500;
}

/* 自定义HTML预览 */
.html-preview {
    color: var(--text-color-light);
    font-size: 0.8rem;
    padding: 0.5rem;
}

.html-preview :deep(a) {
    color: var(--primary-color) !important;
}

/* 贡献者列表 */
.contributor-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
}

.avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    object-fit: cover;
}

.title {
    font-weight: normal;
    font-size: 0.85rem;
    color: var(--text-color-light);
}
</style>