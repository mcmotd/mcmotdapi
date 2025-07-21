<script setup>
import { ref } from 'vue';

const props = defineProps({
    initialAddress: String,
    initialPort: String,
    initialIcon: String,
    loading: Boolean,
});

const emit = defineEmits(['start-query']);

const address = ref(props.initialAddress);
const port = ref(props.initialPort);
const icon = ref(props.initialIcon);

const submitQuery = () => {
    emit('start-query', { address: address.value, port: port.value, icon: icon.value });
};
</script>

<template>
    <div class="card query-card">
        <div class="form-group">
            <label for="server_field">服务器地址</label>
            <input type="text" id="server_field" class="form-input" v-model="address"
                placeholder="例如: play.hypixel.net">
        </div>
        <div class="form-group">
            <label for="port_field">端口 (可选)</label>
            <input type="text" id="port_field" class="form-input" v-model="port" placeholder="例如: 19132">
        </div>
        <div class="form-group">
            <label for="icon_field">图标 (可选)</label>
            <input type="text" id="icon_field" class="form-input" v-model="icon" placeholder="https://example.com/icon.png">
        </div>
        <button type="button" class="btn btn-primary" :disabled="loading" @click="submitQuery">
            {{ loading ? '查询中...' : '查询服务器状态' }}
        </button>
    </div>
</template>

<style scoped>
.card {
    background-color: var(--card-background);
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 4px 25px var(--shadow-color);
}

.form-group {
    margin-bottom: 1.5rem;
}

.form-group:last-of-type {
    margin-bottom: 2rem;
}

label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: var(--text-color);
}

.form-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 1rem;
    font-family: inherit;
    transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.2);
}

.btn {
    width: 100%;
    padding: 0.8rem 1rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition: background-color 0.2s, opacity 0.2s;
}

.btn-primary {
    background-color: var(--primary-color);
    color: #fff;
}

.btn-primary:hover:not(:disabled) {
    background-color: var(--primary-color-hover);
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}
</style>