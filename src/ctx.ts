import { AllowedValueTypes, MyContextOptions } from './types';

/**
 * MyContext class for managing context data with hooks and optional configurations.
 * This class is used internally by the contextMiddleware.
 *
 * @example
 * // Import and use the contextMiddleware in your Express app
 * import express from 'express';
 * import { contextMiddleware } from 'my-ctx';
 *
 * const app = express();
 *
 * // Use the middleware with optional configuration
 * app.use(contextMiddleware({
 *   defaultValues: {
 *     userId: null,
 *     theme: 'light',
 *     features: ['dashboard', 'reports'],
 *     lastLogin: new Date()
 *   },
 *   expiry: 3600000, // 1 hour global expiry
 * }));
 *
 * // Set values in a route
 * app.use((req, res, next) => {
 *   req.context.set('userId', '12345');
 *   req.context.set('theme', 'dark');
 *   req.context.set('sessionToken', 'abc123', 1800000); // 30 minutes TTL
 *   next();
 * });
 *
 * // Get values in another route
 * app.get('/dashboard', (req, res) => {
 *   const userId = req.context.get('userId'); // '12345'
 *   const theme = req.context.get('theme'); // 'dark'
 *   const features = req.context.get('features'); // ['dashboard', 'reports']
 *   // ...
 * });
 *
 * // Add hooks (these should be set up in your main application file)
 * import { getContext } from 'my-ctx';
 *
 * const ctx = getContext();
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
 * app.post('/logout', (req, res) => {
 *   req.context.clear('sessionToken');
 *   res.send('Logged out');
 * });
 *
 * // Using getContext() helper in utility functions
 * function someHelperFunction() {
 *   const ctx = getContext();
 *   if (ctx) {
 *     const userId = ctx.get('userId');
 *     // Perform operations with userId
 *
 *     // Clear a specific key
 *     ctx.clear('userId');
 *
 *     // Or clear all keys
 *     ctx.clear();
 *   }
 * }
 *
 * // Clear operations should only be performed in request handlers or middleware
 * app.post('/logout', (req, res) => {
 *   req.context.clear('sessionToken');
 *   // Or clear all keys
 *   req.context.clear();
 *   res.send('Logged out');
 * });
 *
 * // Support for deeply nested objects and arrays
 * req.context.set('preferences', {
 *   theme: 'dark',
 *   notifications: [true, false, true],
 *   categories: ['work', 'personal', ['urgent', 'normal']],
 *   settings: {
 *     display: {
 *       colors: ['red', 'green', 'blue'],
 *       fonts: [{ name: 'Arial', size: 12 }, { name: 'Verdana', size: 10 }]
 *     }
 *   }
 * });
 *
 * // Note: The middleware automatically handles session management and authorization key fallback.
 * // It uses session IDs or falls back to authorization headers, and reuses existing context if a session is still active.
 */
class MyContext<T extends Record<string, AllowedValueTypes>> {
  private storage: Map<string, { value: AllowedValueTypes; expiry?: number }>;
  private hooks: {
    beforeGet: ((key: string) => void)[];
    afterSet: ((key: string, value: AllowedValueTypes) => void)[];
    onClear: ((key?: string) => void)[];
    onSet: ((key: string, value: AllowedValueTypes) => void)[];
    onError: ((error: Error) => void)[];
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
          this.triggerHooks(
            'onError',
            error instanceof Error ? error : new Error(String(error))
          );
        }
      }
    }
  }

  set(key: string | symbol, value: AllowedValueTypes, ttl?: number) {
    try {
      if (!value) return;
      const expiry = ttl ?? this.globalExpiry;
      const stringKey = key.toString();
      this.storage.set(stringKey, { value, expiry });
      this.triggerHooks('afterSet', stringKey, value);
      this.triggerHooks('onSet', stringKey, value);
      if (expiry) {
        setTimeout(() => {
          this.clearKey(stringKey);
        }, expiry);
      }
      //eslint-disable-next-line
    } catch (error: any | Error) {
      this.triggerHooks('onError', error);
    }
  }

  get<K extends keyof T>(key: K): T[K] | undefined {
    try {
      this.triggerHooks('beforeGet', key as string);
      const item = this.storage.get(key.toString());
      if (item) {
        return item.value as T[K];
      }
      if (key in this.defaultValues) {
        return this.defaultValues[key];
      }
      throw new Error(`Key "${String(key)}" not found in context`);
    } catch (error) {
      this.triggerHooks(
        'onError',
        error instanceof Error ? error : new Error(String(error))
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
      this.triggerHooks('onClear', key as string);
    }
  }
}

export default MyContext;
