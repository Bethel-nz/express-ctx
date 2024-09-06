# My Express Context

A flexible Express middleware for context management, allowing you to share data across your application without modifying function signatures.

## Installation

Install the package using npm:

```bash
npm install my-ctx
```

## Usage

### 1. Create a `MyContext` Instance

Initialize a `MyContext` instance with optional default values:

```typescript
import { MyContext } from 'my-ctx';

const ctx = new MyContext({
  defaultValues: { userId: null, theme: 'light' },
  expiry: 3600000, // Optional: 1 hour
});
```

### 2. Use `contextMiddleware` in Express

Attach the context to each request using the `contextMiddleware`:

```typescript
import express from 'express';
import { contextMiddleware } from 'my-ctx';

const app = express();
const ctx = new MyContext(); // Initialize your context instance

app.use(contextMiddleware(ctx));

// Middleware to set user info in context (e.g., after authentication)
app.use((req, res, next) => {
  req.context.set('userId', '12345');
  req.context.set('userRole', 'admin');
  next();
});

app.get('/dashboard', (req, res) => {
  const userId = req.context.get('userId');
  const userRole = req.context.get('userRole');
  const appName = req.context.get('appName');
  res.send(`Welcome to ${appName} dashboard, User ${userId} (${userRole})`);
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

## Helper Functions

- `getContext()`: Retrieve the current context within the request lifecycle.
- `set(key: string, value: any)`: Set a value in the context.
- `get(key: string)`: Retrieve a value from the context.
- `hook(event: string, fn: Function)`: Attach a hook to a specific event in the context lifecycle.
- `clear()`: Clear all data in the context.

## API

### `MyContext`

The `MyContext` class manages the context data. It supports default values, hooks, and expiry options.

#### Constructor

```typescript
const ctx = new MyContext({
  defaultValues: { userId: null, theme: 'light' },
  expiry: 3600000, // Optional: 1 hour
  lazy: true, // Optional: true by default
});
```

#### Methods

- **`set(key: string, value: any)`**: Sets a value in the context and triggers relevant hooks.

- **`get(key: string): any`**: Retrieves a value from the context or returns the default value if the key does not exist.

- **`clear()`**: Clears the context data and triggers the `onClear` hooks.

- **`hook(event: string, fn: Function)`**: Attaches a function to an event hook (e.g., `beforeGet`, `afterSet`).

### `contextMiddleware`

Middleware function to attach the context to each request.

```typescript
import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';
import MyContext from './myctx';

const asyncLocalStorage = new AsyncLocalStorage<MyContext>();

export function contextMiddleware(defaultCtx: MyContext) {
  return (req: Request, res: Response, next: NextFunction) => {
    asyncLocalStorage.run(defaultCtx, () => {
      req.context = defaultCtx;
      next();
    });
  };
}
```

### `getContext()`

Helper function to retrieve the current context.

```typescript
import { getContext } from 'my-ctx';

function someHelperFunction() {
  const ctx = getContext();
  if (ctx) {
    const userId = ctx.get('userId');
    // Do something with userId
  }
}
```

## License

This package is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## Testing

### Unit Testing

To unit test your middleware and context management, you can use mock contexts and the `vi` testing framework. Here's an example of how to set up a test for the middleware:

```typescript:tests/middleware.test.ts
import { vi, describe, it, expect } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { MyContext, contextMiddleware } from 'my-ctx';

describe('contextMiddleware', () => {
  it('should attach context to request', () => {
    const ctx = new MyContext();
    const middleware = contextMiddleware(ctx);

    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn(() => {}) as NextFunction;

    middleware(req, res, next);

    expect(req.context).toBeDefined();
    expect(next).toHaveBeenCalled();
  });
});
```

This test ensures that the middleware correctly attaches the context to the request object and calls the `next` function.

### Integration Testing

For integration tests, you can set up an Express app with the middleware and test the context behavior across multiple requests:

```typescript:tests/integration.test.ts
import express from 'express';
import request from 'supertest';
import { MyContext, contextMiddleware } from 'my-ctx';

describe('MyContext Integration', () => {
  it('should maintain context across middleware', async () => {
    const app = express();
    const ctx = new MyContext();

    app.use(contextMiddleware(ctx));

    app.use((req, res, next) => {
      req.context.set('userId', '12345');
      next();
    });

    app.get('/test', (req, res) => {
      const userId = req.context.get('userId');
      res.json({ userId });
    });

    const response = await request(app).get('/test');
    expect(response.body).toEqual({ userId: '12345' });
  });
});
```
