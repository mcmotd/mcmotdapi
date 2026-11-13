import axios from 'axios';

/**
 * 带 token 的 axios 实例
 *
 * 后端现在对 /api/admin/* 和 /api/update 做了 HMAC token 校验，
 * 统一在这里注入 Authorization 头，避免每个组件都写一遍。
 */

const TOKEN_KEY = 'adminToken';
const MUST_CHANGE_KEY = 'adminMustChangePwd';

export function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token, expiresAt) {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    if (expiresAt) sessionStorage.setItem('adminTokenExpiresAt', String(expiresAt));
}

export function clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem('adminTokenExpiresAt');
    sessionStorage.removeItem(MUST_CHANGE_KEY);
    sessionStorage.removeItem('isAdminAuthenticated');
}

export function setMustChangePassword(flag) {
    if (flag) sessionStorage.setItem(MUST_CHANGE_KEY, '1');
    else sessionStorage.removeItem(MUST_CHANGE_KEY);
}

export function mustChangePassword() {
    return sessionStorage.getItem(MUST_CHANGE_KEY) === '1';
}

const api = axios.create({ timeout: 30000 });

api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (res) => res,
    (err) => {
        const status = err.response?.status;
        if (status === 401) {
            clearToken();
            // 只在后台页面自动跳登录，前台接口失败不要乱跳
            if (window.location.pathname.startsWith('/admin')) {
                window.location.href = '/login';
            }
        }
        if (status === 403 && err.response?.data?.mustChangePassword) {
            setMustChangePassword(true);
        }
        return Promise.reject(err);
    }
);

export default api;
