import { AllowedValueTypes, MyContextOptions } from './types';

/**
 * MyContext class for managing context data with hooks and optional configurations.
 *
 * @example
 * // Create a new context with default values and configurations
 * const ctx = new MyContext({
 *   defaultValues: {
 *     userId: null,
 *     theme: 'light',
 *     features: ['dashboard', 'reports'],
 *     lastLogin: new Date()
 *   },
 *   expiry: 3600000, // 1 hour global expiry
 *   lazy: false // Allow modifications
 * });
 *
 * // Set values
 * ctx.set('userId', '12345');
 * ctx.set('theme', 'dark');
 * ctx.set('sessionToken', 'abc123', 1800000); // 30 minutes TTL
 *
 * // Get values
 * const userId = ctx.get('userId'); // '12345'
 * const theme = ctx.get('theme'); // 'dark'
 * const features = ctx.get('features'); // ['dashboard', 'reports']
 *
 * // Add hooks
 * ctx.hook('beforeGet', (key) => {
 *   console.log(`Accessing key: ${key}`);
 * });
 *
 * ctx.hook('afterSet', (key, value) => {
 *   console.log(`Set ${key} to ${value}`);
 * });
 *
 * ctx.hook('onError', (error) => {
 *   console.error('Context error:', error);
 * });
 *
 * // Clear specific keys
 * ctx.clear('sessionToken');
 *
 * // Clear all keys
 * ctx.clear();
 *
 * // Using with global expiry
 * const expiringCtx = new MyContext({
 *   expiry: 5000 // 5 seconds
 * });
 *
 * expiringCtx.set('tempKey', 'tempValue');
 * // After 5 seconds, tempKey will be automatically removed
 */

class MyContext<T extends Record<string, AllowedValueTypes>> {
  private storage: Map<string, { value: AllowedValueTypes; expiry?: number }>;
  private hooks: {
    beforeGet: Function[];
    afterSet: Function[];
    onClear: Function[];
    onSet: Function[];
    onError: Function[];
  };
  private defaultValues: T;
  private globalExpiry?: number;

  constructor(options: MyContextOptions<T> = {}) {
    this.storage = new Map();
    this.hooks = {
      beforeGet: [],
      afterSet: [],
      onClear: [],
      onSet: [],
      onError: [],
    };
    this.defaultValues = options.defaultValues ?? ({} as T);
    this.globalExpiry = options.expiry;
  }

  hook(event: keyof typeof this.hooks, fn: Function) {
    this.hooks[event].push(fn);
  }

  private triggerHooks(event: keyof typeof this.hooks, ...args: any[]) {
    if (this.hooks[event]) {
      for (const hook of this.hooks[event]) {
        try {
          hook(...args);
        } catch (error) {
          console.error(`Error in ${event} hook:`, error);
          this.triggerHooks('onError', error);
        }
      }
    }
  }

  set(key: string | symbol, value: any | AllowedValueTypes, ttl?: number) {
    try {
      if (!value) return;
      const expiry = ttl ?? this.globalExpiry;
      this.storage.set(key.toString(), { value, expiry });
      this.triggerHooks('afterSet', key, value);
      this.triggerHooks('onSet', key, value);
      if (expiry) {
        setTimeout(() => {
          this.clearKey(key);
        }, expiry);
      }
    } catch (error) {
      this.triggerHooks('onError', error);
    }
  }
  // it should return either allowedValueTypes or undefined or Record<string, AllowedValueTypes>
  get<K extends keyof T>(key: K): T[K] | undefined {
    try {
      this.triggerHooks('beforeGet', key);
      const item = this.storage.get(key.toString());
      if (item) {
        return item.value as T[K];
      }
      if (key in this.defaultValues) {
        return this.defaultValues[key];
      }
      throw new Error(`Key "${String(key)}" not found in context`);
    } catch (error) {
      this.triggerHooks('onError', () =>
        console.error(`Error in get: ${error}`)
      );
      return undefined;
    }
  }

  clear(key?: string | symbol | '*') {
    if (key === '*' || key === undefined) {
      this.triggerHooks('onClear');
      this.storage.clear();
    } else {
      this.clearKey(key);
    }
  }

  private clearKey(key: string | symbol) {
    if (this.storage.has(key.toString())) {
      this.storage.delete(key.toString());
      this.triggerHooks('onClear', key);
    }
  }
}

export default MyContext;
