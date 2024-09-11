import { AllowedValueTypes, ContextMiddlewareOptions } from './types';

/**
 * MyContext class for managing context data with hooks and optional configurations.
 * This class is used internally by the contextMiddleware.
 *
 * @example
 * // Import and use the contextMiddleware in your Express app
 * import express from 'express';
 * import { contextMiddleware } from '@bethel-nz/express-ctx';
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
 * import { useContext } from 'my-ctx';
 *
 * const ctx = useContext();
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
 * // Using useContext() helper in utility functions
 * function someHelperFunction() {
 *   const ctx = useContext();
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
