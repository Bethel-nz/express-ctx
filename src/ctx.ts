import { AllowedValueTypes, ContextMiddlewareOptions } from './types';

class MyContext<T extends Record<string, AllowedValueTypes>> {
  private storage: Map<string, { value: AllowedValueTypes }>;
  private hooks: {
    beforeGet: ((key: string) => void)[];
    afterSet: ((key: string, value: AllowedValueTypes) => void)[];
    onClear: ((key?: string) => void)[];
    onSet: ((key: string, value: AllowedValueTypes) => void)[];
    onError: ((error: Error) => void)[];
  };
  private defaultValues: Partial<T>;

  constructor(options: ContextMiddlewareOptions = {}) {
    this.storage = new Map();
    this.hooks = {
      beforeGet: [],
      afterSet: [],
      onClear: [],
      onSet: [],
      onError: [],
    };
    this.defaultValues = options as Partial<T>;
  }

  hook<E extends keyof typeof this.hooks>(
    event: E,
    fn: (...args: Parameters<(typeof this.hooks)[E][number]>) => void
  ) {
    //eslint-disable-next-line
    this.hooks[event].push(fn as any);
  }

  private triggerHooks<E extends keyof typeof this.hooks>(
    event: E,
    ...args: Parameters<(typeof this.hooks)[E][number]>
  ) {
    if (this.hooks[event]) {
      for (const hook of this.hooks[event]) {
        try {
          //eslint-disable-next-line
          (hook as (...args: any[]) => void)(...args);
        } catch (error) {
          console.error(`Error in ${event} hook:`, error);
          if (event !== 'onError') {
            this.triggerHooks(
              'onError',
              error instanceof Error ? error : new Error(String(error))
            );
          }
        }
      }
    }
  }

  set<K extends keyof T>(key: K, value: T[K]) {
    try {
      if (value === undefined) return;
      const stringKey = String(key);
      this.storage.set(stringKey, { value: value as AllowedValueTypes });
      this.triggerHooks('afterSet', stringKey, value as AllowedValueTypes);
      this.triggerHooks('onSet', stringKey, value as AllowedValueTypes);
    } catch (error) {
      this.triggerHooks(
        'onError',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  get<K extends keyof T>(key: K): T[K] | undefined {
    try {
      this.triggerHooks('beforeGet', String(key));
      const item = this.storage.get(String(key));
      if (item) {
        return item.value as T[K];
      }
      if (key in this.defaultValues) {
        return this.defaultValues[key];
      }
      return undefined;
    } catch (error) {
      this.triggerHooks(
        'onError',
        error instanceof Error ? error : new Error(String(error))
      );
      return undefined;
    }
  }

  clear(key: keyof T | '*') {
    this.triggerHooks('onClear');
    if (key === '*') {
      this.storage.clear();
    } else {
      this.clearKey(String(key));
    }
  }

  private clearKey(key: string) {
    if (this.storage.has(key)) {
      this.storage.delete(key);
      this.triggerHooks('onClear', key);
    }
  }
}

export default MyContext;
