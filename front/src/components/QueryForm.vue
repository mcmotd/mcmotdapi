<script setup>
import { ref,watch } from 'vue';
import { useI18n } from 'vue-i18n';

// 获取 t 函数
const { t } = useI18n();

const props = defineProps({
    initialAddress: String,
    initialPort: String,
    loading: Boolean,
});

const emit = defineEmits(['start-query']);

const address = ref(props.initialAddress);
const port = ref(props.initialPort);

// [核心改动 1] 新增 ref 用于存储查询类型，默认为 'auto'
const serverType = ref('auto');

// [核心改动 2] 定义查询选项，用于下拉框
const queryOptions = [
    { value: 'auto', text: t('comp.queryF.typeAuto') },
    { value: 'je', text: t('comp.queryF.typeJava') },
    { value: 'be', text: t('comp.queryF.typeBedrock') },
    { value: 'srv', text: t('comp.queryF.typeSrv') },
];

watch(serverType, (newType) => {
    if (newType === 'srv') {
        port.value = ''; // 当切换到 SRV 时，清空端口
    }
    if(newType === 'java'){
        port.value = '25565';
    }
    if(newType === 'bedrock'){
        port.value = '19132';
    }
});

// [核心改动 3] 更新 submitQuery 方法以包含新的查询参数
const submitQuery = () => {
    emit('start-query', {
        address: address.value,
        port: port.value,
        serverType: serverType.value,
        isSRV: serverType.value === 'srv'
    });
};
</script>

<template>
    <div class="card query-card">
        <div class="form-grid">
            <div class="form-group address-group">
                <label for="server_field">{{ $t('comp.queryF.ip') }}</label>
                <input type="text" id="server_field" class="form-input" v-model="address"
                    :placeholder="$t('comp.queryF.ipPlaceholder')">
            </div>
            <div class="form-group port-group">
                <label for="port_field">{{ $t('comp.queryF.port') }}</label>
                <input type="text" id="port_field" class="form-input" v-model="port"
                    :placeholder="$t('comp.queryF.portPlaceholder')">
            </div>
            <div class="form-group type-group">
                <label for="type_field">{{ $t('comp.queryF.queryType') }}</label>
                <select id="type_field" class="form-input" v-model="serverType">
                    <option v-for="option in queryOptions" :key="option.value" :value="option.value">
                        {{ option.text }}
                    </option>
                </select>
            </div>
        </div>
        <button type="button" class="btn btn-primary" :disabled="loading" @click="submitQuery">
            {{ loading ? t('comp.queryF.querying') : t('comp.queryF.query') }}
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

.form-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    margin-bottom: 2rem;
}

@media (min-width: 600px) {
    .form-grid {
        grid-template-columns: 2fr 1fr 1fr;
        align-items: flex-end;
    }
}

.form-group {
    margin-bottom: 0;
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
    background-color: var(--card-background);
    color: var(--text-color);
    transition: border-color 0.2s, box-shadow 0.2s;
    /* 添加通用过渡 */
}

select.form-input {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 0.75rem center;
    background-size: 16px 12px;
    padding-right: 2.5rem;
    border-radius: 8px;
    /* 确保 select 也有圆角 */
    transition: border-color 0.2s, box-shadow 0.2s;
    /* 可以再次明确添加过渡，虽然已经在 .form-input 中 */
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