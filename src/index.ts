import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';
import MyContext from './myctx';

declare global {
  namespace Express {
    interface Request {
      context: MyContext<any>;
    }
  }
}

const asyncLocalStorage = new AsyncLocalStorage<MyContext<any>>();

/**
 * Express middleware for attaching a MyContext instance to each request.
 *
 * @param defaultCtx - The MyContext instance to be used across all requests
 *
 * @example
 * import express from 'express';
 * import { contextMiddleware, MyContext } from 'my-express-context';
 *
 * const app = express();
 * const ctx = new MyContext({
 *   defaultValues: {
 *     appName: 'MyApp',
 *     version: '1.0.0',
 *     environment: process.env.NODE_ENV
 *   },
 *   expiry: 3600000, // 1 hour global expiry
 *   lazy: false // Allow modifications
 * });
 *
 * app.use(contextMiddleware(ctx));
 *
 * // Middleware to set user info in context (e.g., after authentication)
 * app.use((req, res, next) => {
 *   req.context.set('userId', '12345');
 *   req.context.set('userRole', 'admin');
 *   req.context.set('lastAccess', new Date(), 1800000); // 30 minutes TTL
 *   next();
 * });
 *
 * app.get('/dashboard', (req, res) => {
 *   const userId = req.context.get('userId');
 *   const userRole = req.context.get('userRole');
 *   const appName = req.context.get('appName');
 *   const lastAccess = req.context.get('lastAccess');
 *   res.send(`Welcome to ${appName} dashboard, User ${userId} (${userRole}). Last access: ${lastAccess}`);
 * });
 *
 * // Using hooks
 * ctx.hook('beforeGet', (key) => {
 *   console.log(`Accessing key: ${key}`);
 * });
 *
 * ctx.hook('onError', (error) => {
 *   console.error('Context error:', error);
 * });
 *
 * // Clearing specific keys
 * app.post('/logout', (req, res) => {
 *   req.context.clear('userId');
 *   req.context.clear('userRole');
 *   res.send('Logged out');
 * });
 *
 * // Note: The context can be used to share any type of data across your application,
 * // not just user-related information. It's useful for passing request-scoped
 * // data without modifying your function signatures.
 *
 * app.listen(3000, () => {
 *   console.log('Server running on http://localhost:3000');
 * });
 */
export const contextMiddleware = <T extends Record<string, AllowedValueTypes>>(
  defaultCtx: MyContext<T>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    asyncLocalStorage.run(defaultCtx, () => {
      req.context = defaultCtx;

      next();
    });
  };
};

export { MyContext };

/**
 * Helper function to get the current context within the request lifecycle.
 *
 * @returns The current MyContext instance or undefined if called outside the request lifecycle
 *
 * @example
 * import { getContext } from 'my-express-context';
 *
 * function someHelperFunction() {
 *   const ctx = getContext();
 *   if (ctx) {
 *     const userId = ctx.get('userId');
 *     // Do something with userId
 *   }
 * }
 */
export const getContext = <T extends Record<string, AllowedValueTypes>>():
  | MyContext<T>
  | undefined => {
  return asyncLocalStorage.getStore() as MyContext<T> | undefined;
};
