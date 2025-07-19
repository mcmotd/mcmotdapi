<script setup>
import { defaultConfig } from '../config/app.config.js';

const props = defineProps({
    show: Boolean,
    serverData: Object
});

const emit = defineEmits(['close']);

const handleJoin = () => {
    if (!props.serverData?.host) return;
    const [ip, port] = props.serverData.host.split(':');
    // 使用服务器的 MOTD 或名称作为标题，如果没有则使用IP
    const serverName = props.serverData.motd?.clean || ip;
    // 构造特殊的 URL scheme
    const joinUrl = `minecraft:?addExternalServer=${encodeURIComponent(serverName)}|${encodeURIComponent(props.serverData.host)}|${ip}:${port}`;
    // window.location.href = joinUrl;
    window.open(joinUrl, "_blank");
    emit('close'); // 点击后关闭弹窗
};

const handleDownload = () => {
    window.open(defaultConfig.client.downloadUrl, '_blank');
    emit('close'); // 点击后关闭弹窗
};
</script>

<template>
    <transition name="modal-fade">
        <div v-if="show" class="modal-overlay" @click.self="emit('close')">
            <div class="modal-content">
                <h3 class="modal-title">即将加入服务器</h3>
                <div class="modal-body">
                    <p>我们将唤起本地的 MinecraftBE 客户端并自动添加服务器信息。</p>
                    <p class="warning-text">如果你同时安装了国际版MC和网易版MC，<strong>请选择国际版MC打开</strong>，否则链接将会失效！</p>
                    <p>若没有下载联机客户端可点击下方按钮下载。若无法唤起请检查浏览器权限或更换浏览器。</p>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" @click="emit('close')">取消</button>
                    <button class="btn btn-download" @click="handleDownload">下载</button>
                    <button class="btn btn-primary" @click="handleJoin">加入服务器</button>
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