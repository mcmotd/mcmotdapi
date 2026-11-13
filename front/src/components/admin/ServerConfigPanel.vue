<script setup>
import { ref, watch, computed } from 'vue';
import CryptoJS from 'crypto-js';
import api from '../../utils/api';

/**
 * 服务端配置 + 数据库运维面板
 *
 * 之前后台只能改 front.json，config.json 里的超时、缓存、统计参数改了不生效也没有入口。
 * 这里把所有可调项都接出来，并支持在线执行数据库维护动作。
 */

const props = defineProps({
    serverConfig: { type: Object, default: () => ({}) },
    dbInfo: { type: Object, default: null }
});

const emit = defineEmits(['saved', 'refresh-db', 'password-changed']);

const local = ref({});
const message = ref('');
const errorMessage = ref('');
const saving = ref('');
const busy = ref('');
const pwd = ref({ oldPassword: '', newPassword: '', confirm: '' });

watch(() => props.serverConfig, (cfg) => {
    const copy = JSON.parse(JSON.stringify(cfg || {}));
    if (!copy.analytics) copy.analytics = {};
    if (!copy.analytics.raw_log) copy.analytics.raw_log = {};
    if (!copy.analytics.retention) copy.analytics.retention = {};
    if (!copy.caching) copy.caching = {};
    if (!copy.database) copy.database = { driver: 'sqlite', sqlite: {}, mysql: {} };
    if (!copy.database.sqlite) copy.database.sqlite = {};
    if (!copy.database.mysql) copy.database.mysql = {};
    if (!Array.isArray(copy.srvFallbackDns)) copy.srvFallbackDns = [];
    local.value = copy;
}, { immediate: true, deep: true });

const sizeText = computed(() => {
    const bytes = Number(props.dbInfo?.sizeBytes) || 0;
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
});

function flash(text, isError = false) {
    if (isError) {
        errorMessage.value = text;
        message.value = '';
    } else {
        message.value = text;
        errorMessage.value = '';
    }
    setTimeout(() => {
        message.value = '';
        errorMessage.value = '';
    }, 4000);
}

/** 保存若干配置项：[{key, value}] */
async function save(keys, label) {
    saving.value = label;
    try {
        const updates = keys.map(([key, value]) => ({ target: 'config', key, value }));
        const { data } = await api.post('/api/update', { updates });
        flash(data.message + (data.restartRequired ? '（需要重启服务生效）' : ''));
        emit('saved');
    } catch (err) {
        flash(err.response?.data?.error || '保存失败', true);
    } finally {
        saving.value = '';
    }
}

const saveQuery = () => save([
    ['queryTimeout', Number(local.value.queryTimeout)],
    ['bedrockTimeout', Number(local.value.bedrockTimeout)],
    ['srvTimeout', Number(local.value.srvTimeout)],
    ['javaDefaultPort', Number(local.value.javaDefaultPort)],
    ['bedrockDefaultPort', Number(local.value.bedrockDefaultPort)],
    ['autoJavaGraceMs', Number(local.value.autoJavaGraceMs)],
    ['srvFallbackDns', local.value.srvFallbackDns.filter(Boolean)],
    ['log_level', Number(local.value.log_level)],
], '查询参数');

const saveCaching = () => save([
    ['caching', local.value.caching],
], '缓存');

const saveAnalytics = () => save([
    ['analytics', local.value.analytics],
], '统计');

const saveServer = () => save([
    ['serverPort', Number(local.value.serverPort)],
], '服务');

const saveDatabase = () => save([
    ['database', local.value.database],
], '数据库');

const addDns = () => local.value.srvFallbackDns.push('');
const removeDns = (i) => local.value.srvFallbackDns.splice(i, 1);

async function maintain(action, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    busy.value = action;
    try {
        const { data } = await api.post('/api/admin/db/maintain', { action });
        flash(`操作 ${action} 完成: ${JSON.stringify(data.result)}`);
        emit('refresh-db');
    } catch (err) {
        flash(err.response?.data?.error || '操作失败', true);
    } finally {
        busy.value = '';
    }
}

async function changePassword() {
    const { oldPassword, newPassword, confirm } = pwd.value;
    if (!oldPassword || !newPassword) return flash('请填写完整', true);
    if (newPassword !== confirm) return flash('两次输入的新密码不一致', true);
    if (newPassword.length < 6) return flash('新密码至少 6 位', true);

    busy.value = 'password';
    try {
        const { data } = await api.post('/api/admin/password', {
            oldPassword: CryptoJS.MD5(oldPassword).toString(),
            newPassword: CryptoJS.MD5(newPassword).toString(),
        });
        if (data.token) {
            sessionStorage.setItem('adminToken', data.token);
            sessionStorage.removeItem('adminMustChangePwd');
        }
        pwd.value = { oldPassword: '', newPassword: '', confirm: '' };
        flash('密码已更新');
        emit('password-changed');
    } catch (err) {
        flash(err.response?.data?.error || '修改失败', true);
    } finally {
        busy.value = '';
    }
}
</script>

<template>
    <div class="server-panel">
        <div v-if="message" class="status-message success">{{ message }}</div>
        <div v-if="errorMessage" class="status-message error">{{ errorMessage }}</div>

        <fieldset class="config-section">
            <legend>查询参数 (Query)</legend>
            <div class="form-grid">
                <div class="form-group">
                    <label>Java 查询超时 (ms)</label>
                    <input type="number" v-model.number="local.queryTimeout">
                </div>
                <div class="form-group">
                    <label>基岩版查询超时 (ms)</label>
                    <input type="number" v-model.number="local.bedrockTimeout">
                </div>
                <div class="form-group">
                    <label>SRV 解析超时 (ms)</label>
                    <input type="number" v-model.number="local.srvTimeout">
                </div>
                <div class="form-group">
                    <label>Java 默认端口</label>
                    <input type="number" v-model.number="local.javaDefaultPort">
                </div>
                <div class="form-group">
                    <label>基岩版默认端口</label>
                    <input type="number" v-model.number="local.bedrockDefaultPort">
                </div>
                <div class="form-group">
                    <label>auto 模式 Java 宽限期 (ms)</label>
                    <input type="number" v-model.number="local.autoJavaGraceMs">
                    <small class="hint">同一域名同时有 Java 与基岩版时，基岩版先回包也会再等 Java 这么久，避免被误判成基岩版</small>
                </div>
                <div class="form-group">
                    <label>日志级别</label>
                    <select v-model.number="local.log_level">
                        <option :value="0">0 错误</option>
                        <option :value="1">1 警告</option>
                        <option :value="2">2 信息</option>
                        <option :value="3">3 调试</option>
                        <option :value="4">4 追踪</option>
                    </select>
                </div>
            </div>
            <div class="array-editor">
                <label class="array-label">SRV 兜底 DNS</label>
                <div v-for="(dns, index) in local.srvFallbackDns" :key="index" class="array-item">
                    <input type="text" v-model="local.srvFallbackDns[index]" class="flex-grow" placeholder="223.5.5.5">
                    <button @click="removeDns(index)" class="delete-btn">×</button>
                </div>
                <button @click="addDns" class="add-btn">新增 DNS</button>
            </div>
            <div class="section-actions">
                <button @click="saveQuery">{{ saving === '查询参数' ? '保存中…' : '保存查询参数' }}</button>
            </div>
        </fieldset>

        <fieldset class="config-section">
            <legend>缓存 (Caching)</legend>
            <div class="form-grid">
                <div class="form-group checkbox-item">
                    <label>启用缓存</label>
                    <input type="checkbox" v-model="local.caching.enable">
                </div>
                <div class="form-group">
                    <label>结果缓存 TTL (秒)</label>
                    <input type="number" v-model.number="local.caching.ttl_seconds">
                </div>
                <div class="form-group">
                    <label>失败结果缓存 TTL (秒)</label>
                    <input type="number" v-model.number="local.caching.negative_ttl_seconds">
                    <small class="hint">0 表示不缓存失败结果</small>
                </div>
                <div class="form-group">
                    <label>SRV 缓存 TTL (秒)</label>
                    <input type="number" v-model.number="local.caching.srv_ttl_seconds">
                </div>
                <div class="form-group">
                    <label>无 SRV 记录缓存 TTL (秒)</label>
                    <input type="number" v-model.number="local.caching.srv_negative_ttl_seconds">
                </div>
                <div class="form-group">
                    <label>最大缓存条目</label>
                    <input type="number" v-model.number="local.caching.max_entries">
                </div>
            </div>
            <div class="section-actions">
                <button @click="saveCaching">{{ saving === '缓存' ? '保存中…' : '保存缓存配置' }}</button>
            </div>
        </fieldset>

        <fieldset class="config-section">
            <legend>统计记录 (Analytics)</legend>
            <p class="hint block">
                现在的记录方式：原始日志只保留短期样本（可按天清理、可采样、可跳过缓存命中），
                长期趋势由小时/天聚合表承担，数据量跟着「服务器 × 时间」走，不再跟请求数线性增长。
            </p>
            <div class="form-grid">
                <div class="form-group checkbox-item">
                    <label>启用统计</label>
                    <input type="checkbox" v-model="local.analytics.enable">
                </div>
                <div class="form-group">
                    <label>落盘间隔 (ms)</label>
                    <input type="number" v-model.number="local.analytics.flush_interval_ms">
                </div>
                <div class="form-group checkbox-item">
                    <label>记录原始日志</label>
                    <input type="checkbox" v-model="local.analytics.raw_log.enable">
                </div>
                <div class="form-group checkbox-item">
                    <label>跳过缓存命中</label>
                    <input type="checkbox" v-model="local.analytics.raw_log.skip_cache_hits">
                </div>
                <div class="form-group">
                    <label>原始日志采样率 (1/N)</label>
                    <input type="number" min="1" v-model.number="local.analytics.raw_log.sample_rate">
                </div>
                <div class="form-group">
                    <label>原始日志保留 (天)</label>
                    <input type="number" min="0" v-model.number="local.analytics.raw_log.retention_days">
                </div>
                <div class="form-group">
                    <label>小时聚合保留 (天)</label>
                    <input type="number" min="0" v-model.number="local.analytics.retention.hourly_days">
                </div>
                <div class="form-group">
                    <label>天聚合保留 (天，0=永久)</label>
                    <input type="number" min="0" v-model.number="local.analytics.retention.daily_days">
                </div>
            </div>
            <div class="section-actions">
                <button @click="saveAnalytics">{{ saving === '统计' ? '保存中…' : '保存统计配置' }}</button>
            </div>
        </fieldset>

        <fieldset class="config-section">
            <legend>服务端口 (Server)</legend>
            <div class="form-grid">
                <div class="form-group">
                    <label>监听端口</label>
                    <input type="number" v-model.number="local.serverPort">
                    <small class="hint">修改后需要重启进程</small>
                </div>
            </div>
            <div class="section-actions">
                <button @click="saveServer">{{ saving === '服务' ? '保存中…' : '保存端口' }}</button>
            </div>
        </fieldset>

        <fieldset class="config-section">
            <legend>数据库 (Database)</legend>
            <div class="form-grid">
                <div class="form-group">
                    <label>驱动</label>
                    <select v-model="local.database.driver">
                        <option value="sqlite">SQLite（零依赖）</option>
                        <option value="mysql">MySQL / MariaDB</option>
                    </select>
                    <small class="hint">切换驱动需要重启；新旧数据不会自动搬运</small>
                </div>
                <div class="form-group">
                    <label>SQLite 文件</label>
                    <input type="text" v-model="local.database.sqlite.file" placeholder="data/mcmotd.db">
                </div>
            </div>
            <div class="form-grid">
                <div class="form-group"><label>MySQL 主机</label><input type="text" v-model="local.database.mysql.host"></div>
                <div class="form-group"><label>端口</label><input type="number" v-model.number="local.database.mysql.port"></div>
                <div class="form-group"><label>用户</label><input type="text" v-model="local.database.mysql.user"></div>
                <div class="form-group"><label>密码</label><input type="password" v-model="local.database.mysql.password"
                        placeholder="保持 ****** 表示不修改"></div>
                <div class="form-group"><label>数据库名</label><input type="text" v-model="local.database.mysql.database"></div>
                <div class="form-group"><label>连接池大小</label><input type="number" v-model.number="local.database.mysql.connectionLimit"></div>
            </div>
            <div class="section-actions">
                <button @click="saveDatabase">{{ saving === '数据库' ? '保存中…' : '保存数据库配置' }}</button>
            </div>
        </fieldset>

        <fieldset class="config-section">
            <legend>数据库状态与维护</legend>
            <div v-if="dbInfo" class="db-grid">
                <div class="db-card">
                    <span class="db-label">驱动</span>
                    <strong>{{ dbInfo.driver }}</strong>
                </div>
                <div class="db-card">
                    <span class="db-label">位置</span>
                    <strong class="mono">{{ dbInfo.target }}</strong>
                </div>
                <div class="db-card">
                    <span class="db-label">占用空间</span>
                    <strong>{{ sizeText }}</strong>
                </div>
                <div class="db-card">
                    <span class="db-label">缓存条目</span>
                    <strong>{{ dbInfo.cache?.entries ?? '—' }}（图标 {{ dbInfo.cache?.icons ?? 0 }}）</strong>
                </div>
                <div class="db-card">
                    <span class="db-label">待落盘事件</span>
                    <strong>{{ dbInfo.pendingBuffer ?? 0 }}</strong>
                </div>
            </div>

            <table v-if="dbInfo && dbInfo.tables" class="db-table">
                <thead><tr><th>表</th><th>行数</th></tr></thead>
                <tbody>
                    <tr v-for="t in dbInfo.tables" :key="t.table">
                        <td class="mono">{{ t.table }}</td>
                        <td>{{ t.rows }}</td>
                    </tr>
                </tbody>
            </table>

            <div class="maintain-actions">
                <button :disabled="busy" @click="maintain('flush')">立即落盘</button>
                <button :disabled="busy" @click="maintain('prune')">清理过期数据</button>
                <button :disabled="busy" @click="maintain('compact')">压缩空间</button>
                <button :disabled="busy" class="warn" @click="maintain('clear-cache', '确定清空所有缓存？')">清空缓存</button>
                <button :disabled="busy" class="warn" @click="maintain('clear-logs', '确定清空原始日志？聚合统计会保留。')">清空原始日志</button>
                <button :disabled="busy" class="danger" @click="maintain('reset-stats', '确定重置全部统计数据？此操作不可恢复。')">重置统计</button>
            </div>
        </fieldset>

        <fieldset class="config-section">
            <legend>修改管理员密码</legend>
            <div class="form-grid">
                <div class="form-group"><label>原密码</label><input type="password" v-model="pwd.oldPassword"></div>
                <div class="form-group"><label>新密码</label><input type="password" v-model="pwd.newPassword"></div>
                <div class="form-group"><label>确认新密码</label><input type="password" v-model="pwd.confirm"></div>
            </div>
            <div class="section-actions">
                <button :disabled="busy === 'password'" @click="changePassword">更新密码</button>
            </div>
        </fieldset>
    </div>
</template>

<style scoped>
.server-panel { display: flex; flex-direction: column; gap: 2rem; }

.status-message { padding: 1rem; border-radius: 8px; font-weight: 500; }
.success { background-color: #e9f7ec; color: var(--success-color); }
.error { background-color: #fbebee; color: var(--error-color); }

.config-section {
    background: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1rem 2rem 1.5rem;
}
.config-section legend { font-size: 1.5rem; font-weight: 700; padding: 0 1rem; margin-left: 1rem; }

.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1.25rem;
}
.form-group { display: flex; flex-direction: column; }
.form-group.checkbox-item { flex-direction: row; align-items: center; gap: 1rem; }
label { font-weight: 500; margin-bottom: 0.5rem; }

input[type="text"], input[type="number"], input[type="password"], select {
    width: 100%;
    padding: 0.7rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 1rem;
    background-color: var(--background-color);
    color: var(--text-color);
}

.hint { color: var(--text-color-light); font-size: 0.82rem; margin-top: 0.35rem; }
.hint.block { display: block; margin: 0 0 1rem 0; line-height: 1.7; }

.array-editor { border-top: 1px dashed var(--border-color); padding-top: 1.25rem; margin-top: 1.25rem; }
.array-label { font-size: 1rem; font-weight: 700; margin-bottom: 0.8rem; display: block; }
.array-item { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem; }
.flex-grow { flex-grow: 1; }

button {
    padding: 0.65rem 1.1rem;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 700;
    background-color: var(--primary-color);
    color: #fff;
    transition: opacity 0.2s;
}
button:hover:not(:disabled) { opacity: 0.85; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
.add-btn { background-color: #28a745; align-self: flex-start; margin-top: 0.25rem; }
.delete-btn { background-color: #dc3545; padding: 0.5rem; line-height: 1; font-size: 1.1rem; }
.section-actions { margin-top: 1.5rem; text-align: right; }

.db-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.db-card {
    background: var(--background-color);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}
.db-label { color: var(--text-color-light); font-size: 0.85rem; }
.mono { font-family: 'Courier New', monospace; word-break: break-all; }

.db-table { width: 100%; border-collapse: collapse; }
.db-table th, .db-table td { padding: 0.55rem 0.9rem; text-align: left; border-bottom: 1px solid var(--border-color); }
.db-table th { font-weight: 600; color: var(--text-color-light); font-size: 0.9rem; }

.maintain-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1.5rem; }
.maintain-actions button { background-color: #4a5568; }
.maintain-actions .warn { background-color: #d9822b; }
.maintain-actions .danger { background-color: #c0392b; }
</style>
