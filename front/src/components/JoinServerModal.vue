<script setup>
import { useConfig } from '../composables/useConfig';

import { useI18n } from 'vue-i18n';

// 获取 t 函数和当前的 locale
const { t, locale } = useI18n();
const config = useConfig();

const props = defineProps({
    show: Boolean,
    serverData: Object
});

const emit = defineEmits(['close']);

const handleJoin = () => {
    if (!props.serverData?.host) return;
    // const [ip, port] = props.serverData.host.split(':');
    const host = props.serverData.host;
    let ip, port;

    // 匹配 IPv6 格式：[::1]:19132
    const ipv6Match = host.match(/^\[([a-fA-F0-9:]+)\]:(\d+)$/);
    if (ipv6Match) {
        ip = ipv6Match[1];
        port = ipv6Match[2];
    } else {
        // IPv4 或简单端口分割
        const parts = host.split(':');
        ip = parts.slice(0, -1).join(':'); // 兼容 IPv6 没有端口的情况（不常见）
        port = parts[parts.length - 1];
    }

    // 使用服务器的 MOTD 或名称作为标题，如果没有则使用IP
    const serverName = props.serverData.motd?.clean || ip;
    // 构造特殊的 URL scheme
    const joinUrl = `minecraft:?addExternalServer=${encodeURIComponent(serverName)}|${encodeURIComponent(props.serverData.host)}|${ip}:${port}`;
    // window.location.href = joinUrl;
    window.open(joinUrl, "_blank");
    emit('close'); // 点击后关闭弹窗
};

const handleDownload = () => {
    window.open(config.value.client.downloadUrl, '_blank');
    emit('close'); // 点击后关闭弹窗
};

</script>

<template>
    <transition name="modal-fade">
        <div v-if="show" class="modal-overlay" @click.self="emit('close')">
            <div class="modal-content">
                <h3 class="modal-title">{{ $t('comp.joinM.title') }}</h3>

                <div class="modal-body">
                    <p>{{ $t('comp.joinM.body1') }}</p>

                    <p class="warning-text">
                        {{ $t('comp.joinM.warning1') }}
                        <strong>{{ $t('comp.joinM.warning2') }}</strong>
                        {{ $t('comp.joinM.warning3') }}
                    </p>

                    <p>{{ $t('comp.joinM.body2') }}</p>
                </div>

                <div class="modal-actions">
                    <button class="btn btn-secondary" @click="emit('close')">{{ $t('comp.joinM.cancel') }}</button>
                    <button class="btn btn-download" @click="handleDownload">{{ $t('comp.joinM.download') }}</button>
                    <button class="btn btn-primary" @click="handleJoin">{{ $t('comp.joinM.join') }}</button>
                </div>
            </div>
        </div>
    </transition>
</template>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background: var(--card-background);
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    width: 90%;
    max-width: 500px;
}

.modal-title {
    margin-top: 0;
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
    font-weight: 700;
}

.modal-body p {
    margin: 0.5rem 0;
    line-height: 1.6;
}

.warning-text {
    color: var(--error-color, #d32f2f);
    background-color: var(--status-error-bg, #fbebee);
    padding: 0.5rem 1rem;
    border-radius: 8px;
}

.modal-actions {
    margin-top: 2rem;
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    flex-wrap: wrap;
}

.btn {
    padding: 0.8rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-primary {
    background-color: var(--primary-color);
    color: #fff;
}

.btn-primary:hover {
    background-color: var(--primary-color-hover);
}

.btn-download {
    background-color: var(--success-color, #4caf50);
    color: #fff;
}

.btn-download:hover {
    background-color: #388e3c;
}

.btn-secondary {
    background-color: var(--border-color);
    color: var(--text-color);
}

.btn-secondary:hover {
    background-color: #e0e0e0;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}
</style>