<script setup>
import { ref, watch } from 'vue';
import axios from 'axios';

const props = defineProps({
    config: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['config-updated']);

const statusMessage = ref('');
const errorMessage = ref('');

// 使用一个本地的、可修改的配置对象副本
const localConfig = ref({});

// 深度拷贝props.config，并在配置更新时同步
watch(() => props.config, (newConfig) => {
    localConfig.value = JSON.parse(JSON.stringify(newConfig));
}, { immediate: true, deep: true });


// 通用的保存函数，现在 value 就是更新后的整个对象或数组
const saveSection = async (key) => {
    statusMessage.value = `正在保存 ${key} ...`;
    errorMessage.value = '';

    const keys = key.split('.');
    const valueToSave = keys.reduce((obj, k) => obj[k], localConfig.value);

    try {
        const response = await axios.post('/api/update', { key, value: valueToSave });
        if (response.data.success) {
            statusMessage.value = response.data.message;
            emit('config-updated');
        }
    } catch (err) {
        errorMessage.value = err.response?.data?.error || '保存失败，请检查后端服务。';
        statusMessage.value = '';
    } finally {
        setTimeout(() => {
            statusMessage.value = '';
            errorMessage.value = '';
        }, 3000);
    }
};

// --- 数组操作辅助函数 ---
const addCarouselImage = () => { localConfig.value.header.carousel.images.push(""); };
const deleteCarouselImage = (index) => { localConfig.value.header.carousel.images.splice(index, 1); };

const addMenuItem = () => {
    localConfig.value.side_menu.items.push({ id: `newItem_${Date.now()}`, title: "新菜单项", type: "link", url: "#", color: "#1E88E5", svg_icon: "<svg>...</svg>" });
};
const deleteMenuItem = (index) => { localConfig.value.side_menu.items.splice(index, 1); };

const addContributor = () => {
    localConfig.value.contributors.member.push({ name: "新成员", title: "职位", github: "", slogan: "", avatar: "" });
};
const deleteContributor = (index) => { localConfig.value.contributors.member.splice(index, 1); };

const addLanguage = () => {
    localConfig.value.i18n.languages.push({ name: "New Language", code: "xx-XX" });
};
const deleteLanguage = (index) => { localConfig.value.i18n.languages.splice(index, 1); };
</script>

<template>
    <div class="config-editor">
        <div v-if="statusMessage" class="status-message success">{{ statusMessage }}</div>
        <div v-if="errorMessage" class="status-message error">{{ errorMessage }}</div>

        <fieldset class="config-section">
            <legend>页眉配置 (Header)</legend>
            <div class="form-grid">
                <div class="form-group"><label>主标题</label><input type="text" v-model="localConfig.header.title"></div>
                <div class="form-group"><label>轮播图切换时间 (ms)</label><input type="number"
                        v-model.number="localConfig.header.carousel.duration"></div>
                <div class="form-group full-width"><label>描述文本</label><textarea v-model="localConfig.header.description"
                        rows="3"></textarea></div>
            </div>
            <div class="array-editor">
                <label class="array-label">背景轮播图链接</label>
                <div v-for="(img, index) in localConfig.header.carousel.images" :key="index" class="array-item">
                    <input type="text" v-model="localConfig.header.carousel.images[index]" class="flex-grow"
                        placeholder="请输入图片URL">
                    <button @click="deleteCarouselImage(index)" class="delete-btn" title="删除此项">×</button>
                </div>
                <button @click="addCarouselImage" class="add-btn">新增图片</button>
            </div>
            <div class="section-actions"><button @click="saveSection('header')">保存页眉更改</button></div>
        </fieldset>

        <fieldset class="config-section">
            <legend>默认服务器 (Default Server)</legend>
            <div class="form-grid">
                <div class="form-group">
                    <label>主机地址</label>
                    <input type="text" v-model="localConfig.defaultServer.host">
                </div>
                <div class="form-group">
                    <label>端口</label>
                    <input type="number" v-model.number="localConfig.defaultServer.port">
                </div>
                <div class="form-group checkbox-item">
                    <label>启用自动查询</label>
                    <input type="checkbox" v-model="localConfig.defaultServer.enable">
                </div>
            </div>
            <div class="section-actions"><button @click="saveSection('defaultServer')">保存默认服务器更改</button></div>
        </fieldset>

        <fieldset class="config-section">
            <legend>侧边栏菜单 (Side Menu)</legend>
            <div class="array-editor vertical">
                <div v-for="(item, index) in localConfig.side_menu.items" :key="item.id || index"
                    class="array-item-card">
                    <div class="card-header">
                        <h4>菜单项 #{{ index + 1 }}</h4>
                        <button @click="deleteMenuItem(index)" class="delete-btn" title="删除此菜单项">×</button>
                    </div>
                    <div class="form-grid">
                        <div class="form-group"><label>ID</label><input type="text" v-model="item.id"></div>
                        <div class="form-group"><label>标题 (Title)</label><input type="text" v-model="item.title"></div>
                        <div class="form-group">
                            <label>类型 (Type)</label>
                            <select v-model="item.type">
                                <option value="link">链接</option>
                                <option value="language_switcher">语言切换</option>
                            </select>
                        </div>
                        <div class="form-group"><label>URL</label><input type="text" v-model="item.url"></div>
                        <div class="form-group"><label>颜色 (Color)</label><input type="color" v-model="item.color"
                                class="color-picker"></div>
                    </div>
                    <div class="form-group full-width"><label>SVG 图标代码</label><textarea v-model="item.svg_icon"
                            rows="4"></textarea></div>
                </div>
                <button @click="addMenuItem" class="add-btn">新增菜单项</button>
            </div>
            <div class="section-actions"><button @click="saveSection('side_menu')">保存菜单更改</button></div>
        </fieldset>

        <fieldset class="config-section">
            <legend>贡献者 (Contributors)</legend>
            <div class="form-group checkbox-item solo">
                <label>启用贡献者模块</label>
                <input type="checkbox" v-model="localConfig.contributors.enable">
            </div>
            <div class="array-editor vertical">
                <div v-for="(member, index) in localConfig.contributors.member" :key="index" class="array-item-card">
                    <div class="card-header">
                        <h4>成员 #{{ index + 1 }}</h4>
                        <button @click="deleteContributor(index)" class="delete-btn" title="删除此成员">×</button>
                    </div>
                    <div class="form-grid">
                        <div class="form-group"><label>姓名</label><input type="text" v-model="member.name"></div>
                        <div class="form-group"><label>头衔</label><input type="text" v-model="member.title"></div>
                        <div class="form-group full-width"><label>Github链接</label><input type="text"
                                v-model="member.github"></div>
                        <div class="form-group full-width"><label>头像URL</label><input type="text"
                                v-model="member.avatar"></div>
                        <div class="form-group full-width"><label>Slogan</label><textarea v-model="member.slogan"
                                rows="2"></textarea></div>
                    </div>
                </div>
                <button @click="addContributor" class="add-btn">新增成员</button>
            </div>
            <div class="section-actions"><button @click="saveSection('contributors')">保存贡献者更改</button></div>
        </fieldset>

        <fieldset class="config-section">
            <legend>页脚 (Footer) & 客户端 (Client)</legend>
            <div class="form-grid">
                <div class="form-group"><label>技术支持 名称</label><input type="text"
                        v-model="localConfig.footer.poweredBy.name"></div>
                <div class="form-group"><label>技术支持 URL</label><input type="text"
                        v-model="localConfig.footer.poweredBy.url"></div>
                <div class="form-group"><label>公司 名称</label><input type="text"
                        v-model="localConfig.footer.company.name"></div>
                <div class="form-group"><label>公司 URL</label><input type="text"
                        v-model="localConfig.footer.company.url"></div>
                <div class="form-group"><label>客户端下载 URL</label><input type="text"
                        v-model="localConfig.client.downloadUrl"></div>
                <div class="form-group full-width"><label>自定义HTML</label><textarea
                        v-model="localConfig.footer.customHtml" rows="3"></textarea></div>
            </div>
            <div class="section-actions">
                <button @click="saveSection('footer')">保存页脚更改</button>
                <button @click="saveSection('client')" style="margin-left: 1rem;">保存客户端更改</button>
            </div>
        </fieldset>

        <fieldset class="config-section">
            <legend>国际化 (i18n)</legend>
            <div class="form-grid">
                <div class="form-group"><label>默认语言代码</label><input type="text" v-model="localConfig.i18n.default">
                </div>
            </div>
            <div class="array-editor">
                <label class="array-label">可用语言列表</label>
                <div v-for="(lang, index) in localConfig.i18n.languages" :key="index" class="array-item">
                    <input type="text" v-model="lang.name" placeholder="语言名称 (e.g. English)">
                    <input type="text" v-model="lang.code" placeholder="语言代码 (e.g. en-US)">
                    <button @click="deleteLanguage(index)" class="delete-btn" title="删除此语言">×</button>
                </div>
                <button @click="addLanguage" class="add-btn">新增语言</button>
            </div>
            <div class="section-actions"><button @click="saveSection('i18n')">保存语言更改</button></div>
        </fieldset>
    </div>
</template>

<style scoped>
/* 主容器和消息提示 */
.config-editor {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.status-message {
    padding: 1rem;
    border-radius: 8px;
    font-weight: 500;
}

.success {
    background-color: #e9f7ec;
    color: var(--success-color);
}

.error {
    background-color: #fbebee;
    color: var(--error-color);
}

/* 配置区块 Fieldset */
.config-section {
    background: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1rem 2rem 1.5rem;
}

.config-section legend {
    font-size: 1.5rem;
    font-weight: 700;
    padding: 0 1rem;
    margin-left: 1rem;
}

/* 表单布局 */
.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
}

.form-group {
    display: flex;
    flex-direction: column;
}

.form-group.full-width {
    grid-column: 1 / -1;
}

.form-group.checkbox-item {
    flex-direction: row;
    align-items: center;
    gap: 1rem;
}

.form-group.checkbox-item.solo {
    margin: 1rem 0;
}

label {
    font-weight: 500;
    margin-bottom: 0.5rem;
}

input[type="text"],
input[type="number"],
select,
textarea {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 1rem;
    font-family: inherit;
    background-color: var(--background-color);
    color: var(--text-color);
}

input[type="color"].color-picker {
    padding: 0.25rem;
    height: calc(2.25rem + 2px);
}

/* 调整颜色选择器高度 */
textarea {
    resize: vertical;
    font-family: 'Courier New', Courier, monospace;
}

/* 数组编辑器 */
.array-editor {
    border-top: 1px dashed var(--border-color);
    padding-top: 1.5rem;
    margin-top: 1.5rem;
}

.array-label {
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: 1rem;
    display: block;
}

.array-editor.vertical {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.array-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
}

.array-item-card {
    border: 1px solid var(--border-color);
    padding: 1.5rem;
    border-radius: 8px;
    background-color: var(--background-color);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
}

.card-header h4 {
    margin: 0;
    font-size: 1.1rem;
}

.flex-grow {
    flex-grow: 1;
}

/* 按钮样式 */
button {
    padding: 0.7rem 1.2rem;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 700;
    transition: background-color 0.2s, opacity 0.2s;
}

.add-btn {
    background-color: #28a745;
    color: #fff;
    align-self: flex-start;
    margin-top: 0.5rem;
}

.delete-btn {
    background-color: #dc3545;
    color: #fff;
    padding: 0.5rem;
    line-height: 1;
    font-size: 1.2rem;
}

.section-actions {
    margin-top: 2rem;
    text-align: right;
}

.section-actions button {
    background-color: var(--primary-color);
    color: #fff;
    font-size: 1.1rem;
}

button:hover {
    opacity: 0.85;
}
</style>