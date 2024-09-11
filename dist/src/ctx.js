class MyContext {
    constructor(options = {}) {
        this.storage = new Map();
        this.hooks = {
            beforeGet: [],
            afterSet: [],
            onClear: [],
            onSet: [],
            onError: [],
        };
        this.defaultValues = options;
    }
    hook(event, fn) {
        //eslint-disable-next-line
        this.hooks[event].push(fn);
    }
    triggerHooks(event, ...args) {
        if (this.hooks[event]) {
            for (const hook of this.hooks[event]) {
                try {
                    //eslint-disable-next-line
                    hook(...args);
                }
                catch (error) {
                    console.error(`Error in ${event} hook:`, error);
                    if (event !== 'onError') {
                        this.triggerHooks('onError', error instanceof Error ? error : new Error(String(error)));
                    }
                }
            }
        }
    }
    set(key, value) {
        try {
            if (value === undefined)
                return;
            const stringKey = String(key);
            this.storage.set(stringKey, { value: value });
            this.triggerHooks('afterSet', stringKey, value);
            this.triggerHooks('onSet', stringKey, value);
        }
        catch (error) {
            this.triggerHooks('onError', error instanceof Error ? error : new Error(String(error)));
        }
    }
    get(key) {
        try {
            this.triggerHooks('beforeGet', String(key));
            const item = this.storage.get(String(key));
            if (item) {
                return item.value;
            }
            if (key in this.defaultValues) {
                return this.defaultValues[key];
            }
            return undefined;
        }
        catch (error) {
            this.triggerHooks('onError', error instanceof Error ? error : new Error(String(error)));
            return undefined;
        }
    }
    clear(key) {
        this.triggerHooks('onClear');
        if (key === '*') {
            this.storage.clear();
        }
        else {
            this.clearKey(String(key));
        }
    }
    clearKey(key) {
        if (this.storage.has(key)) {
            this.storage.delete(key);
            this.triggerHooks('onClear', key);
        }
    }
}
export default MyContext;
//# sourceMappingURL=ctx.js.map