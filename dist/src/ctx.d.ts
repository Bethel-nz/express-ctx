import { AllowedValueTypes, ContextMiddlewareOptions } from './types';
declare class MyContext<T extends Record<string, AllowedValueTypes>> {
    private storage;
    private hooks;
    private defaultValues;
    constructor(options?: ContextMiddlewareOptions);
    hook<E extends keyof typeof this.hooks>(event: E, fn: (...args: Parameters<(typeof this.hooks)[E][number]>) => void): void;
    private triggerHooks;
    set<K extends keyof T>(key: K, value: T[K]): void;
    get<K extends keyof T>(key: K): T[K] | undefined;
    clear(key: keyof T | '*'): void;
    private clearKey;
}
export default MyContext;
