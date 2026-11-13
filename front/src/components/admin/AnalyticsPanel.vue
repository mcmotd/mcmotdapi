<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import api from '../../utils/api';

/**
 * 数据统计面板
 *
 * 后端已经改成「聚合 + 短期原始日志」的结构，这里展示：
 * 概览指标、近 24 小时趋势、近 7 日趋势、Top 榜，以及可分页的原始日志。
 */

const stats = ref(null);
const isLoading = ref(true);
const error = ref(null);
const openSection = ref('hourly');
const hoveredLogRowId = ref(null);

// 日志分页
const logs = ref({ items: [], total: 0, limit: 20, offset: 0 });
const logsLoading = ref(false);
const logFilter = ref({ host: '', ok: '' });

async function fetchStats() {
    isLoading.value = true;
    error.value = null;
    try {
        const { data } = await api.get('/api/admin/stats');
        data.dailyCounts = data.dailyCounts || [];
        data.hourlyCounts = data.hourlyCounts || [];
        data.topServers = data.topServers || [];
        data.topReferrers = data.topReferrers || [];
        data.topEndpoints = data.topEndpoints || [];
        data.recentQueries = data.recentQueries || [];
        stats.value = data;
    } catch (err) {
        error.value = err.response?.data?.error || '无法加载统计数据。';
    } finally {
        isLoading.value = false;
    }
}

async function fetchLogs(offset = 0) {
    logsLoading.value = true;
    try {
        const params = { limit: logs.value.limit, offset };
        if (logFilter.value.host) params.host = logFilter.value.host;
        if (logFilter.value.ok !== '') params.ok = logFilter.value.ok;
        const { data } = await api.get('/api/admin/logs', { params });
        logs.value = data;
    } catch (err) {
        error.value = err.response?.data?.error || '无法加载日志。';
    } finally {
        logsLoading.value = false;
    }
}

const maxHourly = computed(() => Math.max(1, ...((stats.value?.hourlyCounts || []).map(d => d.count))));
const maxDaily = computed(() => Math.max(1, ...((stats.value?.dailyCounts || []).map(d => d.count))));

const formatDate = (dateString, type = 'short') => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '—';
    if (type === 'full') {
        return date.toLocaleString('zh-CN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }
    if (type === 'hour') return `${String(date.getHours()).padStart(2, '0')}:00`;
    return `${date.getMonth() + 1}月${date.getDate()}日`;
};

const formatHour = (ts) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:00`;
};

watch(openSection, (val) => {
    if (val === 'logs' && !logs.value.items.length) fetchLogs(0);
});

onMounted(fetchStats);
</script>

<template>
    <div class="analytics-panel">
        <div v-if="isLoading" class="loading-placeholder">正在加载统计数据...</div>
        <div v-else-if="error" class="error-placeholder">{{ error }}</div>
        <div v-else-if="stats">
            <div class="overview-grid">
                <div class="stat-card">
                    <h4>总查询次数</h4>
                    <p class="stat-value">{{ stats.totalQueries }}</p>
                    <span class="sub">历史累计（含聚合）</span>
                </div>
                <div class="stat-card">
                    <h4>总成功率</h4>
                    <p class="stat-value success">{{ stats.successRate }}%</p>
                    <span class="sub">近 24h：{{ stats.successRate24h }}%</span>
                </div>
                <div class="stat-card">
                    <h4>近 24 小时</h4>
                    <p class="stat-value">{{ stats.queriesLast24h }}</p>
                    <span class="sub">成功 {{ stats.queriesLast24hOk }}</span>
                </div>
                <div class="stat-card">
                    <h4>缓存命中率</h4>
                    <p class="stat-value">{{ stats.cacheHitRate }}%</p>
                    <span class="sub">命中越多，回源越少</span>
                </div>
                <div class="stat-card">
                    <h4>平均响应</h4>
                    <p class="stat-value">{{ stats.avgDelayMs }}<small>ms</small></p>
                    <span class="sub">全部查询平均耗时</span>
                </div>
                <div class="stat-card">
                    <h4>独立客户端</h4>
                    <p class="stat-value">{{ stats.uniqueClients }}</p>
                    <span class="sub">原始日志保留期内</span>
                </div>
            </div>

            <div class="retention-note">
                原始日志保留 {{ stats.retention.raw_log_days }} 天，小时聚合保留 {{ stats.retention.hourly_days }} 天，
                天聚合保留 {{ stats.retention.daily_days === 0 ? '永久' : stats.retention.daily_days + ' 天' }}；
                当前原始日志 {{ stats.rawLogCount }} 条。
            </div>

            <div class="details-accordion">
                <div class="detail-section">
                    <button class="detail-header" @click="openSection = openSection === 'hourly' ? null : 'hourly'">
                        <span>近 24 小时趋势</span><span class="chevron" :class="{ open: openSection === 'hourly' }">▼</span>
                    </button>
                    <div class="detail-content" :class="{ open: openSection === 'hourly' }">
                        <div class="content-wrapper">
                            <div v-if="stats.hourlyCounts.length" class="chart-container">
                                <div v-for="item in stats.hourlyCounts" :key="item.ts" class="chart-bar-wrapper">
                                    <div class="chart-bar" :style="{ height: `${Math.max(2, (item.count / maxHourly) * 100)}%` }">
                                        <span class="bar-label">{{ item.count }}</span>
                                    </div>
                                    <span class="date-label">{{ formatHour(item.ts) }}</span>
                                </div>
                            </div>
                            <div v-else class="no-data">暂无数据</div>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <button class="detail-header" @click="openSection = openSection === 'daily' ? null : 'daily'">
                        <span>近 7 日趋势</span><span class="chevron" :class="{ open: openSection === 'daily' }">▼</span>
                    </button>
                    <div class="detail-content" :class="{ open: openSection === 'daily' }">
                        <div class="content-wrapper">
                            <div v-if="stats.dailyCounts.length" class="chart-container">
                                <div v-for="day in stats.dailyCounts" :key="day.date" class="chart-bar-wrapper">
                                    <div class="chart-bar" :style="{ height: `${Math.max(2, (day.count / maxDaily) * 100)}%` }">
                                        <span class="bar-label">{{ day.count }}</span>
                                    </div>
                                    <span class="date-label">{{ formatDate(day.date) }}</span>
                                </div>
                            </div>
                            <div v-else class="no-data">暂无数据</div>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <button class="detail-header" @click="openSection = openSection === 'topServers' ? null : 'topServers'">
                        <span>查询最多的服务器 Top 10</span><span class="chevron" :class="{ open: openSection === 'topServers' }">▼</span>
                    </button>
                    <div class="detail-content" :class="{ open: openSection === 'topServers' }">
                        <div class="content-wrapper">
                            <table class="stats-table">
                                <thead><tr><th>排名</th><th>服务器地址</th><th>类型</th><th>查询次数</th></tr></thead>
                                <tbody>
                                    <tr v-for="(server, index) in stats.topServers" :key="index">
                                        <td>#{{ index + 1 }}</td>
                                        <td class="mono">{{ server.host }}{{ server.port ? ':' + server.port : '' }}</td>
                                        <td>{{ server.kind || '—' }}</td>
                                        <td>{{ server.count }}</td>
                                    </tr>
                                    <tr v-if="!stats.topServers.length"><td colspan="4" class="no-data">暂无数据</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <button class="detail-header" @click="openSection = openSection === 'endpoints' ? null : 'endpoints'">
                        <span>接口调用分布</span><span class="chevron" :class="{ open: openSection === 'endpoints' }">▼</span>
                    </button>
                    <div class="detail-content" :class="{ open: openSection === 'endpoints' }">
                        <div class="content-wrapper">
                            <table class="stats-table">
                                <thead><tr><th>接口</th><th>调用次数</th></tr></thead>
                                <tbody>
                                    <tr v-for="(ep, index) in stats.topEndpoints" :key="index">
                                        <td class="mono">{{ ep.path }}</td>
                                        <td>{{ ep.count }}</td>
                                    </tr>
                                    <tr v-if="!stats.topEndpoints.length"><td colspan="2" class="no-data">暂无数据</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <button class="detail-header" @click="openSection = openSection === 'referrers' ? null : 'referrers'">
                        <span>API 调用来源 Top 10</span><span class="chevron" :class="{ open: openSection === 'referrers' }">▼</span>
                    </button>
                    <div class="detail-content" :class="{ open: openSection === 'referrers' }">
                        <div class="content-wrapper">
                            <table class="stats-table">
                                <thead><tr><th>排名</th><th>来源网站</th><th>调用次数</th></tr></thead>
                                <tbody>
                                    <tr v-for="(refItem, index) in stats.topReferrers" :key="index">
                                        <td>#{{ index + 1 }}</td>
                                        <td><a :href="'http://' + refItem.referrer" target="_blank">{{ refItem.referrer }}</a></td>
                                        <td>{{ refItem.count }}</td>
                                    </tr>
                                    <tr v-if="!stats.topReferrers.length"><td colspan="3" class="no-data">暂无外部来源调用记录</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <button class="detail-header" @click="openSection = openSection === 'recent' ? null : 'recent'">
                        <span>最近 20 次查询</span><span class="chevron" :class="{ open: openSection === 'recent' }">▼</span>
                    </button>
                    <div class="detail-content" :class="{ open: openSection === 'recent' }">
                        <div class="content-wrapper">
                            <table class="stats-table recent-queries">
                                <thead><tr><th>时间</th><th>查询地址</th><th>耗时</th><th>状态</th></tr></thead>
                                <tbody>
                                    <tr v-if="!stats.recentQueries.length"><td colspan="4" class="no-data">暂无查询记录</td></tr>
                                    <tr v-else v-for="log in stats.recentQueries" :key="log.id" class="main-row"
                                        @mouseenter="hoveredLogRowId = log.id" @mouseleave="hoveredLogRowId = null">
                                        <td>{{ formatDate(log.timestamp, 'full') }}</td>
                                        <td class="mono">{{ log.ip_address }}{{ log.port ? ':' + log.port : '' }}</td>
                                        <td>{{ log.delay_ms != null ? log.delay_ms + 'ms' : '—' }}</td>
                                        <td class="status-cell">
                                            <span :class="log.was_successful ? 'status-success' : 'status-fail'">
                                                {{ log.was_successful ? '成功' : '失败' }}
                                            </span>
                                            <transition name="tooltip-fade">
                                                <div v-if="hoveredLogRowId === log.id" class="tooltip">
                                                    <dl>
                                                        <div><dt>来源 IP</dt><dd>{{ log.client_ip || '未知' }}</dd></div>
                                                        <div><dt>来源网站</dt><dd>{{ log.referrer || '直接访问' }}</dd></div>
                                                        <div><dt>缓存</dt><dd>{{ log.from_cache ? '命中' : '穿透' }}</dd></div>
                                                        <div><dt>接口</dt><dd>{{ log.endpoint }}</dd></div>
                                                        <div><dt>类型</dt><dd>{{ log.server_type || 'N/A' }}</dd></div>
                                                        <div v-if="log.error"><dt>失败原因</dt><dd>{{ log.error }}</dd></div>
                                                    </dl>
                                                </div>
                                            </transition>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <button class="detail-header" @click="openSection = openSection === 'logs' ? null : 'logs'">
                        <span>原始日志（可筛选 / 分页）</span><span class="chevron" :class="{ open: openSection === 'logs' }">▼</span>
                    </button>
                    <div class="detail-content" :class="{ open: openSection === 'logs' }">
                        <div class="content-wrapper">
                            <div class="log-filters">
                                <input type="text" v-model="logFilter.host" placeholder="按域名筛选">
                                <select v-model="logFilter.ok">
                                    <option value="">全部状态</option>
                                    <option value="1">成功</option>
                                    <option value="0">失败</option>
                                </select>
                                <button @click="fetchLogs(0)">查询</button>
                                <span class="log-total">共 {{ logs.total }} 条</span>
                            </div>
                            <table class="stats-table">
                                <thead><tr><th>时间</th><th>地址</th><th>接口</th><th>耗时</th><th>状态</th><th>来源 IP</th></tr></thead>
                                <tbody>
                                    <tr v-if="logsLoading"><td colspan="6" class="no-data">加载中…</td></tr>
                                    <tr v-else-if="!logs.items.length"><td colspan="6" class="no-data">暂无记录</td></tr>
                                    <tr v-for="item in logs.items" :key="item.id">
                                        <td>{{ formatDate(item.timestamp, 'full') }}</td>
                                        <td class="mono">{{ item.host }}{{ item.port ? ':' + item.port : '' }}</td>
                                        <td class="mono">{{ item.endpoint }}</td>
                                        <td>{{ item.delay_ms != null ? item.delay_ms + 'ms' : '—' }}</td>
                                        <td>
                                            <span :class="item.ok ? 'status-success' : 'status-fail'">{{ item.ok ? '成功' : '失败' }}</span>
                                        </td>
                                        <td class="mono">{{ item.client_ip || '—' }}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <div class="pager">
                                <button :disabled="logs.offset === 0" @click="fetchLogs(Math.max(0, logs.offset - logs.limit))">上一页</button>
                                <span>{{ logs.offset + 1 }} - {{ Math.min(logs.offset + logs.limit, logs.total) }}</span>
                                <button :disabled="logs.offset + logs.limit >= logs.total"
                                    @click="fetchLogs(logs.offset + logs.limit)">下一页</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.analytics-panel { animation: fadeIn 0.4s ease; }

.overview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 1.5rem; }
.stat-card { background: var(--card-background); padding: 1.4rem 1.6rem; border-radius: 12px; border: 1px solid var(--border-color); }
.stat-card h4 { margin: 0 0 0.5rem 0; color: var(--text-color-light); font-weight: 500; font-size: 0.95rem; }
.stat-value { font-size: 2.3rem; font-weight: 700; margin: 0; color: var(--primary-color); line-height: 1.2; }
.stat-value.success { color: var(--success-color); }
.stat-value small { font-size: 1rem; margin-left: 0.2rem; }
.sub { display: block; margin-top: 0.35rem; font-size: 0.8rem; color: var(--text-color-light); }

.retention-note {
    background: var(--card-background);
    border: 1px dashed var(--border-color);
    border-radius: 10px;
    padding: 0.9rem 1.2rem;
    margin-bottom: 1.5rem;
    font-size: 0.88rem;
    color: var(--text-color-light);
    line-height: 1.7;
}

.details-accordion { display: flex; flex-direction: column; gap: 1rem; }
.detail-section { background: var(--card-background); border-radius: 12px; border: 1px solid var(--border-color); }
.detail-header { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 1.1rem 1.8rem; background: transparent; border: none; font-size: 1.1rem; font-weight: 600; cursor: pointer; color: var(--text-color); }
.chevron { transition: transform 0.3s ease; display: inline-block; }
.chevron.open { transform: rotate(180deg); }

.detail-content { max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out; }
.detail-content.open { max-height: 2000px; transition: max-height 0.5s ease-in; }
.content-wrapper { padding: 0 1.8rem 1.5rem 1.8rem; border-top: 1px solid var(--border-color); }

.stats-table { width: 100%; border-collapse: collapse; }
.stats-table th, .stats-table td { padding: 0.7rem 0.9rem; text-align: left; border-bottom: 1px solid var(--border-color); }
.stats-table th { font-weight: 600; background: var(--card-background); color: var(--text-color-light); font-size: 0.9rem; }
.stats-table tr:last-child td { border-bottom: none; }
.stats-table a { color: var(--primary-color); text-decoration: none; }
.mono { font-family: 'Courier New', monospace; word-break: break-all; }

.recent-queries .main-row:hover { background-color: var(--background-color); }
.status-cell { position: relative; }

.tooltip {
    position: absolute;
    right: calc(100% + 10px);
    top: 50%;
    transform: translateY(-50%);
    width: 320px;
    background-color: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 1rem;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    z-index: 10;
    pointer-events: none;
}
.tooltip dl { margin: 0; display: grid; grid-template-columns: 80px 1fr; gap: 0.6rem 1rem; font-size: 0.85rem; }
.tooltip dt { font-weight: 500; color: var(--text-color-light); text-align: right; }
.tooltip dd { margin: 0; font-family: monospace; word-break: break-all; font-weight: 600; }
.tooltip-fade-enter-active, .tooltip-fade-leave-active { transition: opacity 0.2s ease; }
.tooltip-fade-enter-from, .tooltip-fade-leave-to { opacity: 0; }

.status-success { color: var(--success-color); font-weight: bold; }
.status-fail { color: var(--error-color); font-weight: bold; }
.no-data { text-align: center; color: var(--text-color-light); padding: 1.5rem; }
.loading-placeholder, .error-placeholder { text-align: center; padding: 4rem; font-size: 1.1rem; color: var(--text-color-light); }

.chart-container { display: flex; justify-content: space-between; align-items: flex-end; height: 200px; padding: 1.5rem 0 0.5rem; gap: 0.3rem; }
.chart-bar-wrapper { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; height: 100%; min-width: 0; }
.chart-bar { width: 60%; max-width: 34px; background: var(--primary-color); border-radius: 4px 4px 0 0; position: relative; transition: height 0.4s ease-out; }
.bar-label { position: absolute; top: -20px; width: 100%; text-align: center; color: var(--text-color); font-weight: 600; font-size: 0.75rem; }
.date-label { margin-top: 0.4rem; font-size: 0.7rem; color: var(--text-color-light); white-space: nowrap; }

.log-filters { display: flex; gap: 0.75rem; align-items: center; margin: 1rem 0; flex-wrap: wrap; }
.log-filters input, .log-filters select { padding: 0.55rem 0.8rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--background-color); color: var(--text-color); }
.log-filters button, .pager button { padding: 0.55rem 1rem; border: none; border-radius: 8px; background: var(--primary-color); color: #fff; font-weight: 600; cursor: pointer; }
.log-filters button:disabled, .pager button:disabled { opacity: 0.5; cursor: not-allowed; }
.log-total { color: var(--text-color-light); font-size: 0.85rem; }
.pager { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 1rem; font-size: 0.9rem; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
