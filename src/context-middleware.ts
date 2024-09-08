import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';
import MyContext from './ctx';
import { AllowedValueTypes, MyContextOptions } from './types';

const asyncLocalStorage = new AsyncLocalStorage<MyContext<any>>();
const contextStore = new Map<string, MyContext<any>>();

declare global {
  namespace Express {
    interface Request {
      context: MyContext<any>;
    }
  }
}

interface ContextMiddlewareOptions<
  T extends Record<string, AllowedValueTypes>
> {
  contextConfig?: MyContextOptions<T>;
}

/**
 * Express middleware for attaching a MyContext instance to each request.
 *
 * @param options - Configuration options for the middleware
 * @param options.contextConfig - Configuration for the MyContext instance
 *
 * @example
 * import express from 'express';
 * import { contextMiddleware, MyContext } from 'my-express-context';
 *
 * const app = express();
 *
 * app.use(contextMiddleware({
 *   contextConfig: {
 *     defaultValues: {
 *       appName: 'MyApp',
 *       version: '1.0.0',
 *       environment: process.env.NODE_ENV
 *     },
 *     expiry: 3600000, // 1 hour global expiry
 *   },
 * }));
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
 * app.use((req, res, next) => {
 *   req.context.hook('beforeGet', (key) => {
 *     console.log(`Accessing key: ${key}`);
 *   });
 *   next();
 * });
 *
 * // Clearing specific keys
 * app.post('/logout', (req, res) => {
 *   req.context.clear('userId');
 *   req.context.clear('userRole');
 *   res.send('Logged out');
 * });
 *
 * // The context is isolated per session, allowing for concurrent requests
 * // from different users without data interference.
 *
 * app.listen(3000, () => {
 *   console.log('Server running on http://localhost:3000');
 * });
 */
export const contextMiddleware = <T extends Record<string, AllowedValueTypes>>(
  options: ContextMiddlewareOptions<T> = {}
) => {
  const { contextConfig } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const sessionId =
      (req.headers['x-session-id'] as string) ||
      (req.headers.authorization as string) ||
      'default-session';
    if (!contextStore.has(sessionId)) {
      contextStore.set(sessionId, new MyContext(contextConfig));
    }
    const context = contextStore.get(sessionId)!;

    // Store the sessionId in the context
    context.set('sessionId', sessionId);

    asyncLocalStorage.run(context, () => {
      req.context = context;
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
export const getContext = <T extends Record<string, AllowedValueTypes>>(
  sessionId?: string
): MyContext<T> | undefined => {
  const context = asyncLocalStorage.getStore() as MyContext<T> | undefined;
  if (sessionId && contextStore.has(sessionId)) {
    return contextStore.get(sessionId) as MyContext<T>;
  }
  return context;
};
