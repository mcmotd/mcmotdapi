<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';

const stats = ref(null);
const isLoading = ref(true);
const error = ref(null);
const openSection = ref(null); // 控制当前展开的部分

const fetchStats = async () => {
    isLoading.value = true;
    error.value = null;
    try {
        const { data } = await axios.get('/api/admin/stats');
        
        if (data) {
            data.dailyCounts = data.dailyCounts || [];
            data.topServers = data.topServers || [];
            data.recentQueries = data.recentQueries || [];
        }

        stats.value = data;
    } catch (err) {
        error.value = '无法加载统计数据。请检查后端服务是否正常。';
    } finally {
        isLoading.value = false;
    }
   
};

const toggleSection = (section) => {
    openSection.value = openSection.value === section ? null : section;
};

const maxDailyCount = computed(() => {
    if (!stats.value || !stats.value.dailyCounts || stats.value.dailyCounts.length === 0) {
        return 1;
    }
    return Math.max(...stats.value.dailyCounts.map(d => d.count));
});

const formatDate = (dateString, withYear = false) => {
    const date = new Date(dateString);
    if (withYear) {
        return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
    return `${date.getMonth() + 1}月${date.getDate()}日`;
};

onMounted(fetchStats);
</script>

<template>
    <div class="analytics-panel">
        <div v-if="isLoading" class="loading-placeholder">正在加载统计数据...</div>
        <div v-else-if="error" class="error-placeholder">{{ error }}</div>
        <div v-else-if="stats">
            <!-- 简洁概览 -->
            <div class="overview-grid">
                <div class="stat-card">
                    <h4>总查询次数</h4>
                    <p class="stat-value">{{ stats.totalQueries }}</p>
                </div>
                <div class="stat-card">
                    <h4>查询成功率</h4>
                    <p class="stat-value success">{{ stats.successRate }}%</p>
                </div>
                <div class="stat-card">
                    <h4>过去24小时查询</h4>
                    <p class="stat-value">{{ stats.queriesLast24h }}</p>
                </div>
            </div>

            <!-- 可展开的详细数据 -->
            <div class="details-accordion">
                <!-- 近7日查询趋势 -->
                <div class="detail-section">
                    <button class="detail-header" @click="toggleSection('daily')">
                        <span>近7日查询趋势</span>
                        <span class="chevron" :class="{ open: openSection === 'daily' }">▼</span>
                    </button>
                    <div class="detail-content" :class="{ open: openSection === 'daily' }">
                        <div class="content-wrapper">
                            <div v-if="stats.dailyCounts && stats.dailyCounts.length > 0" class="chart-container">
                                <div v-for="day in stats.dailyCounts" :key="day.date" class="chart-bar-wrapper">
                                    <div class="chart-bar" :style="{ height: `${(day.count / maxDailyCount) * 100}%` }">
                                        <span class="bar-label">{{ day.count }}</span>
                                    </div>
                                    <span class="date-label">{{ formatDate(day.date) }}</span>
                                </div>
                            </div>
                            <div v-else class="no-data">暂无数据</div>
                        </div>
                    </div>
                </div>

                <!-- Top 10 服务器 -->
                <div class="detail-section">
                    <button class="detail-header" @click="toggleSection('topServers')">
                        <span>查询最多的服务器 Top 10</span>
                        <span class="chevron" :class="{ open: openSection === 'topServers' }">▼</span>
                    </button>
                    <div class="detail-content" :class="{ open: openSection === 'topServers' }">
                        <div class="content-wrapper">
                            <table class="stats-table">
                                <thead>
                                    <tr>
                                        <th>排名</th>
                                        <th>服务器地址</th>
                                        <th>查询次数</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(server, index) in stats.topServers" :key="index">
                                        <td>#{{ index + 1 }}</td>
                                        <td>{{ server.ip_address }}{{ server.port ? ':' + server.port : '' }}</td>
                                        <td>{{ server.count }}</td>
                                    </tr>
                                    <tr v-if="!stats.topServers || stats.topServers.length === 0">
                                        <td colspan="3" class="no-data">暂无数据</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="details-accordion">
                    <div class="detail-section">
                        <button class="detail-header" @click="toggleSection('referrers')">
                            <span>API 调用来源 Top 10</span>
                            <span class="chevron" :class="{ open: openSection === 'referrers' }">▼</span>
                        </button>
                        <div class="detail-content" :class="{ open: openSection === 'referrers' }">
                            <div class="content-wrapper">
                                <table class="stats-table">
                                    <thead>
                                        <tr>
                                            <th>排名</th>
                                            <th>来源网站 (Referrer)</th>
                                            <th>调用次数</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="(ref, index) in stats.topReferrers" :key="index">
                                            <td>#{{ index + 1 }}</td>
                                            <td><a :href="'http://' + ref.referrer" target="_blank">{{ ref.referrer
                                                    }}</a></td>
                                            <td>{{ ref.count }}</td>
                                        </tr>
                                        <tr v-if="!stats.topReferrers || stats.topReferrers.length === 0">
                                            <td colspan="3" class="no-data">暂无外部来源调用记录</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>

            <!-- 最近20次查询 -->
            <div class="detail-section">
                <button class="detail-header" @click="toggleSection('recent')">
                    <span>最近20次查询记录</span>
                    <span class="chevron" :class="{ open: openSection === 'recent' }">▼</span>
                </button>
                <div class="detail-content" :class="{ open: openSection === 'recent' }">
                    <div class="content-wrapper">
                        <table class="stats-table recent-queries">
                            <thead>
                                <tr>
                                    <th>时间</th>
                                    <th>端点</th>
                                    <th>查询地址</th>
                                    <th>状态</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="log in stats.recentQueries" :key="log.id">
                                    <td>{{ formatDate(log.timestamp, true) }}</td>
                                    <td><span class="endpoint-tag">{{ log.endpoint }}</span></td>
                                    <td>{{ log.ip_address }}{{ log.port ? ':' + log.port : '' }}</td>
                                    <td><span :class="log.was_successful ? 'status-success' : 'status-fail'">{{
                                            log.was_successful ? '成功' : '失败' }}</span></td>
                                </tr>
                                <tr v-if="!stats.recentQueries || stats.recentQueries.length === 0">
                                    <td colspan="4" class="no-data">暂无数据</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
    </div>
</template>

<style scoped>
.analytics-panel {
    animation: fadeIn 0.5s ease;
}

.overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.stat-card {
    background: var(--card-background);
    padding: 1.5rem 2rem;
    border-radius: 12px;
    border: 1px solid var(--border-color);
}

.stat-card h4 {
    margin: 0 0 0.5rem 0;
    color: var(--text-color-light);
    font-weight: 500;
    font-size: 1rem;
}

.stat-value {
    font-size: 2.8rem;
    font-weight: 700;
    margin: 0;
    color: var(--primary-color);
    line-height: 1.2;
}

.stat-value.success {
    color: var(--success-color);
}

.details-accordion {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.detail-section {
    background: var(--card-background);
    border-radius: 12px;
    border: 1px solid var(--border-color);
    /* overflow: hidden; */
    transition: background-color 0.2s;
}

.detail-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.2rem 2rem;
    background: transparent;
    border: none;
    font-size: 1.2rem;
    font-weight: 600;
    cursor: pointer;
    color: var(--text-color);
}

.chevron {
    transition: transform 0.3s ease;
}

.chevron.open {
    transform: rotate(180deg);
}

.detail-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease-out;
}

.detail-content.open {
    max-height: 1000px;
    transition: max-height 0.5s ease-in;
}

.content-wrapper {
    padding: 0 2rem 1.5rem 2rem;
    border-top: 1px solid var(--border-color);
}

.stats-table {
    width: 100%;
    border-collapse: collapse;
}

.stats-table th,
.stats-table td {
    padding: 0.8rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
}

.stats-table th {
    font-weight: 600;
}

.stats-table tr:last-child td {
    border-bottom: none;
}

.stats-table.recent-queries {
    font-size: 0.9rem;
}

.endpoint-tag {
    background: var(--background-color);
    padding: 0.2em 0.5em;
    border-radius: 4px;
    font-family: monospace;
}

.status-success {
    color: var(--success-color);
    font-weight: bold;
}

.status-fail {
    color: var(--error-color);
    font-weight: bold;
}

.no-data {
    text-align: center;
    color: var(--text-color-light);
    padding: 2rem;
}

/* [核心修改] 修正图表布局 */
.chart-container {
    display: flex;
    justify-content: space-around;
    height: 200px;
    /* 容器必须有固定高度 */
    padding: 1.5rem 0;
    gap: 0.5rem;
}

.chart-bar-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    /* 将柱子和标签都推到底部 */
    align-items: center;
    text-align: center;
}

.chart-bar {
    width: 50%;
    max-width: 40px;
    background: var(--primary-color);
    border-radius: 4px 4px 0 0;
    position: relative;
    transition: height 0.5s ease-out;
}

.bar-label {
    position: absolute;
    top: -22px;
    /* 调整标签位置 */
    width: 100%;
    color: var(--text-color);
    font-weight: bold;
    font-size: 0.9rem;
}

.date-label {
    margin-top: 0.5rem;
    font-size: 0.8rem;
    color: var(--text-color-light);
}

.loading-placeholder,
.error-placeholder {
    text-align: center;
    padding: 4rem;
    font-size: 1.2rem;
    color: var(--text-color-light);
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}
</style>