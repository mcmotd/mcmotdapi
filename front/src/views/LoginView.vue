<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import CryptoJS from 'crypto-js';
import api, { setToken, setMustChangePassword, clearToken } from '../utils/api';

const username = ref('');
const password = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

const router = useRouter();

const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
if(isDarkMode) document.body.classList.add('dark-theme');

const handleLogin = async () => {
    if (!username.value || !password.value) {
        errorMessage.value = '请输入用户名和密码。';
        return;
    }

    isLoading.value = true;
    errorMessage.value = '';
    clearToken();

    // 使用 crypto-js 对密码进行 MD5 加密（后端存的就是 md5）
    const hashedPassword = CryptoJS.MD5(password.value).toString();

    try {
        const response = await api.post('/api/login', {
            username: username.value,
            password: hashedPassword
        });

        if (response.data.success) {
            setToken(response.data.token, response.data.expiresAt);
            setMustChangePassword(Boolean(response.data.mustChangePassword));
            sessionStorage.setItem('isAdminAuthenticated', 'true');
            sessionStorage.setItem('adminUsername', response.data.username || username.value);
            router.push('/admin');
        } else {
            errorMessage.value = response.data.error || '登录失败。';
        }

    } catch (err) {
        errorMessage.value = err.response?.data?.error || '登录时发生未知错误。';
    } finally {
        isLoading.value = false;
    }
};
</script>

<template>
    <div class="login-page">
        <div class="login-card">
            <h1>管理员登录</h1>
            <p class="subtitle">访问管理面板需要授权</p>
            <form @submit.prevent="handleLogin">
                <div class="form-group">
                    <label for="username">用户名</label>
                    <input type="text" id="username" v-model="username" required>
                </div>
                <div class="form-group">
                    <label for="password">密码</label>
                    <input type="password" id="password" v-model="password" required>
                </div>
                <div v-if="errorMessage" class="error-message">
                    {{ errorMessage }}
                </div>
                <button type="submit" :disabled="isLoading">
                    {{ isLoading ? '正在登录...' : '登 录' }}
                </button>
            </form>
        </div>
    </div>
</template>

<style scoped>
.login-page {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: var(--background-color);
}

.login-card {
    width: 100%;
    max-width: 400px;
    padding: 3rem;
    background: var(--card-background);
    border-radius: 12px;
    box-shadow: 0 8px 30px var(--shadow-color);
    text-align: center;
}

h1 {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
}

.subtitle {
    color: var(--text-color-light);
    margin-bottom: 2.5rem;
}

.form-group {
    text-align: left;
    margin-bottom: 1.5rem;
}

label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
}

input[type="text"],
input[type="password"] {
    width: 100%;
    padding: 0.8rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 1rem;
}

.error-message {
    background-color: #fbebee;
    color: var(--error-color);
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    font-weight: 500;
}

button {
    width: 100%;
    padding: 0.9rem;
    border: none;
    border-radius: 8px;
    background-color: var(--primary-color);
    color: #fff;
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
    transition: background-color 0.2s;
}

button:hover:not(:disabled) {
    background-color: var(--primary-color-hover);
}

button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}
</style>