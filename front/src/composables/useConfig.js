import { inject, readonly } from 'vue';

// 1. 创建一个 Injection Key。
// 使用 Symbol 可以确保 key 的唯一性，避免与其他 provide/inject 冲突。
export const ConfigKey = Symbol('AppConfig');

// 2. 创建 useConfig 这个 Composable 函数。
// 它的唯一职责就是注入由 Provider 提供的数据。
export function useConfig() {
    // inject 会查找父组件链中提供的具有匹配 Key 的值。
    const config = inject(ConfigKey);

    if (!config) {
        // 如果没有找到 config，说明组件没有被 ConfigProvider 包裹，
        // 这通常是一个开发错误，应该抛出异常。
        throw new Error('useConfig() 必须在 ConfigProvider 组件内部使用。');
    }

    // 返回的是一个 ref 对象，我们在 Provider 中会用 readonly 包裹，
    // 确保子组件只能读取配置，不能意外修改。
    return config;
}