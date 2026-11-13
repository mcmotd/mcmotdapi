<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import CryptoJS from 'crypto-js';
import api, { clearToken, setMustChangePassword, mustChangePassword } from '../utils/api';
import AnalyticsPanel from '../components/admin/AnalyticsPanel.vue';
import DashboardPanel from '../components/admin/DashboardPanel.vue';
import ConfigEditor from '../components/admin/ConfigEditor.vue';
import ServerConfigPanel from '../components/admin/ServerConfigPanel.vue';

const router = useRouter();

const frontConfig = ref(null);
const serverConfig = ref(null);
const picConfig = ref(null);
const dbInfo = ref(null);
const isLoading = ref(true);
const loadError = ref('');
const activeTab = ref('analytics');

const pwdRequired = ref(mustChangePassword());
const pwd = ref({ oldPassword: '', newPassword: '', confirm: '' });
const pwdBusy = ref(false);
const pwdError = ref('');

const username = computed(() => sessionStorage.getItem('adminUsername') || 'admin');

const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
if (isDarkMode) document.body.classList.add('dark-theme');

async function loadAll() {
    isLoading.value = true;
    loadError.value = '';
    try {
        const front = await api.get('/api/config');
        frontConfig.value = front.data;
        const admin = await api.get('/api/admin/config');
        serverConfig.value = admin.data.server;
        picConfig.value = admin.data.pic;
        await loadDb();
    } catch (err) {
        const data = err.response?.data;
        if (data?.mustChangePassword) {
            pwdRequired.value = true;
        } else {
            loadError.value = data?.error || '加载配置失败，请重新登录。';
        }
    } finally {
        isLoading.value = false;
    }
}

async function loadDb() {
    try {
        const { data } = await api.get('/api/admin/db');
        dbInfo.value = data;
    } catch (e) {
        // 数据库信息加载失败不阻塞页面
    }
}

async function refreshConfig() {
    try {
        const front = await api.get('/api/config');
        frontConfig.value = front.data;
    } catch (e) { /* ignore */ }
}

async function changePassword() {
    const { oldPassword, newPassword, confirm } = pwd.value;
    pwdError.value = '';
    if (!oldPassword || !newPassword) { pwdError.value = '请填写完整'; return; }
    if (newPassword !== confirm) { pwdError.value = '两次输入的新密码不一致'; return; }
    if (newPassword.length < 6) { pwdError.value = '新密码至少 6 位'; return; }

    pwdBusy.value = true;
    try {
        const { data } = await api.post('/api/admin/password', {
            oldPassword: CryptoJS.MD5(oldPassword).toString(),
            newPassword: CryptoJS.MD5(newPassword).toString(),
        });
        if (data.token) sessionStorage.setItem('adminToken', data.token);
        setMustChangePassword(false);
        pwdRequired.value = false;
        pwd.value = { oldPassword: '', newPassword: '', confirm: '' };
        await loadAll();
    } catch (err) {
        pwdError.value = err.response?.data?.error || '修改失败';
    } finally {
        pwdBusy.value = false;
    }
}

function logout() {
    clearToken();
    router.push('/login');
}

onMounted(loadAll);
</script>

<template>
    <div class="app-wrapper">
        <!-- 默认密码强制改密 -->
        <div v-if="pwdRequired" class="gate">
            <div class="gate-card">
                <h1>先修改默认密码</h1>
                <p class="gate-desc">当前账号仍在使用默认密码，修改后才能进入管理面板。</p>
                <div class="gate-form">
                    <label>原密码</label>
                    <input type="password" v-model="pwd.oldPassword" placeholder="默认密码为 password">
                    <label>新密码</label>
                    <input type="password" v-model="pwd.newPassword">
                    <label>确认新密码</label>
                    <input type="password" v-model="pwd.confirm">
                    <div v-if="pwdError" class="gate-error">{{ pwdError }}</div>
                    <button :disabled="pwdBusy" @click="changePassword">{{ pwdBusy ? '提交中…' : '确认修改' }}</button>
                </div>
            </div>
        </div>

        <div v-else class="app-content">
            <div class="main-content-area">
                <header class="admin-header">
                    <div class="header-top">
                        <h1>管理员面板</h1>
                        <div class="header-user">
                            <span>{{ username }}</span>
                            <button class="logout-btn" @click="logout">退出登录</button>
                        </div>
                    </div>
                    <nav class="admin-tabs">
                        <button @click="activeTab = 'analytics'" :class="{ active: activeTab === 'analytics' }">数据统计</button>
                        <button @click="activeTab = 'server'" :class="{ active: activeTab === 'server' }">服务端配置</button>
                        <button @click="activeTab = 'editor'" :class="{ active: activeTab === 'editor' }">前台配置</button>
                        <button @click="activeTab = 'overview'" :class="{ active: activeTab === 'overview' }">配置总览</button>
                    </nav>
                </header>

                <main class="admin-main-content">
                    <div v-if="isLoading" class="loading-panel">正在加载配置...</div>
                    <div v-else-if="loadError" class="loading-panel error">{{ loadError }}</div>
                    <div v-else>
                        <div v-show="activeTab === 'analytics'">
                            <AnalyticsPanel />
                        </div>
                        <div v-show="activeTab === 'server'">
                            <ServerConfigPanel :serverConfig="serverConfig" :dbInfo="dbInfo" @saved="loadAll"
                                @refresh-db="loadDb" @password-changed="loadAll" />
                        </div>
                        <div v-show="activeTab === 'editor'">
                            <ConfigEditor v-if="frontConfig" :config="frontConfig" @config-updated="refreshConfig" />
                        </div>
                        <div v-show="activeTab === 'overview'">
                            <DashboardPanel v-if="frontConfig" :config="frontConfig" />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    </div>
</template>

<style scoped>
.app-content { flex-grow: 1; }

.main-content-area {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem 4rem 1rem;
    width: 100%;
}

.admin-header { border-bottom: 2px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 2rem; }
.header-top { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
.header-user { display: flex; align-items: center; gap: 1rem; color: var(--text-color-light); }
.logout-btn {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: transparent;
    color: var(--text-color);
    cursor: pointer;
    font-weight: 500;
}
.logout-btn:hover { background: var(--card-background); }

h1 { font-size: 2.2rem; font-weight: 700; margin: 0 0 0.8rem 0; }

.admin-tabs button {
    font-size: 1.05rem;
    font-weight: 500;
    padding: 0.75rem 1.4rem;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--text-color-light);
    border-bottom: 3px solid transparent;
    transition: color 0.2s, border-color 0.2s;
}
.admin-tabs button:hover { color: var(--text-color); }
.admin-tabs button.active { color: var(--primary-color); border-bottom-color: var(--primary-color); }

.loading-panel { text-align: center; font-size: 1.1rem; padding: 4rem; color: var(--text-color-light); }
.loading-panel.error { color: var(--error-color); }

/* 改密遮罩 */
.gate {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--background-color);
    padding: 2rem;
}
.gate-card {
    width: 100%;
    max-width: 440px;
    background: var(--card-background);
    border-radius: 14px;
    border: 1px solid var(--border-color);
    padding: 2.5rem;
}
.gate-card h1 { font-size: 1.6rem; }
.gate-desc { color: var(--text-color-light); margin-bottom: 1.5rem; line-height: 1.6; }
.gate-form { display: flex; flex-direction: column; gap: 0.5rem; }
.gate-form label { font-weight: 500; margin-top: 0.4rem; }
.gate-form input {
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--background-color);
    color: var(--text-color);
    font-size: 1rem;
}
.gate-form button {
    margin-top: 1.2rem;
    padding: 0.85rem;
    border: none;
    border-radius: 8px;
    background: var(--primary-color);
    color: #fff;
    font-size: 1.05rem;
    font-weight: 700;
    cursor: pointer;
}
.gate-form button:disabled { opacity: 0.6; cursor: not-allowed; }
.gate-error { color: var(--error-color); font-size: 0.9rem; margin-top: 0.5rem; }
</style>
