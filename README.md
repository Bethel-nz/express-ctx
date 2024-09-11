# Express Context

A flexible Express middleware for managing context data across requests, allowing you to maintain request-scoped data without altering function signatures. It stores each context based on a unique identifier, enabling you to pass around values specific to a request.

## Features

- **Context Data Management**: Set, get, and clear data.
- **Hooks**: Attach hooks for monitoring actions like get, set, clear, and errors.
- **Ease of Use**: Integrate seamlessly with Express without modifying function signatures.
- **Unique Context per Request**: Automatically generates a unique context ID for each request.
- **Concurrent Request Support**: Handles multiple concurrent requests with isolated contexts.
- **TypeScript Support**: Full TypeScript support for enhanced developer experience.
- **Automatic Cleanup**: Clears context data after the response is finished.

## Installation

Install the package using npm:

```bash
npm install @bethel-nz/express-ctx
```

## Usage

### 1. Import the context middleware

```typescript
import { contextMiddleware } from '@bethel-nz/express-ctx';
```

### 2. Initialize the middleware with optional default values

```typescript
import { contextMiddleware } from '@bethel-nz/express-ctx';
import express from 'express';

const app = express();

// use with express with optional default values
app.use(
  contextMiddleware({
    userId: null,
    theme: 'light',
    lastLogin: new Date(),
  })
);
```

### 3. Use `contextMiddleware` in Express

Attach the context to each request using `contextMiddleware` function:

```typescript
import express from 'express';
import { contextMiddleware } from '@bethel-nz/express-ctx';

const app = express();

app.use(contextMiddleware());

// Middleware to set user info in context (e.g., after authentication)
app.use((req, res, next) => {
  req.context.set('userId', '12345');
  req.context.set('userRole', 'admin');
  req.context.set('lastAccess', new Date());
  next();
});
```

### 4. Access Context Data

You can access the context data in your route handlers or other middleware:

```typescript
app.get('/dashboard', (req, res) => {
  const userId = req.context.get('userId');
  const userRole = req.context.get('userRole');
  const lastAccess = req.context.get('lastAccess');

  res.send(`Welcome, User ${userId} (${userRole}). Last access: ${lastAccess}`);
});
```

### 5. Adding Hooks

Hooks can be used to trigger custom behavior during context operations:

```typescript
app.use((req, res, next) => {
  req.context.hook('beforeGet', (key) => {
    console.log(`Accessing key: ${key}`);
  });

  req.context.hook('onError', (error) => {
    console.error('Context error:', error);
  });

  next();
});
```

### 6. Clearing Context Data

You can clear specific keys or all data stored in the context:

```typescript
// Clear specific keys
app.post('/logout', (req, res) => {
  req.context.clear('userId');
  req.context.clear('userRole');
  res.send('Logged out');
});

// Clear all keys
req.context.clear('*');
```

## Helpers and API

### `MyContext`

The `MyContext` class is the core of the package, managing the context data for each request.

#### Constructor

```typescript
new MyContext({
  userId: null,
  last_login: new Date(), // Optional default values for context keys
});
```

#### Methods

- **`set<K extends keyof T>(key: K, value: T[K])`**:
  Sets a value in the context. Triggers `afterSet` and `onSet` hooks.

- **`get<K extends keyof T>(key: K): T[K] | undefined`**:
  Retrieves a value from the context. Triggers `beforeGet` hook.

- **`clear(key: keyof T | '*')`**:
  Clears specific key or all data stored in the context. Triggers `onClear` hook.

- **`hook(event: string, fn: Function)`**:
  Attaches a function to specific lifecycle events of the context. Events include `beforeGet`, `afterSet`, `onSet`, `onClear`, and `onError`.

### `contextMiddleware`

The `contextMiddleware` function receives an optional config object and attaches a unique context to each request in the Express application.

#### Usage Example - contextMiddleware()

```typescript
import express from 'express';
import { contextMiddleware } from '@bethel-nz/express-ctx';

const app = express();

app.use(contextMiddleware()); // Attaches context to each request
```

### `useContext()`

The `useContext` helper function retrieves the current context within the request lifecycle. It is especially useful when you need to access context data outside of Express request handlers.

#### Usage Example - useContext()

```typescript
import { useContext } from '@bethel-nz/express-ctx';

function someHelperFunction() {
  const ctx = useContext();
  if (ctx) {
    const userId = ctx.get('userId');
    // Perform operations with userId
  }
}
```

## Performance Considerations and Limitations

1. **Memory Usage**: The middleware stores context data in memory for the duration of each request. For applications with a large number of concurrent requests, monitor your application's memory usage.

2. **Request Isolation**: Each request has its own isolated context, which is automatically cleaned up after the response is finished. This prevents data leakage between requests but means that data doesn't persist across multiple requests from the same client.

3. **Hook Performance**: While hooks provide flexibility, excessive use of complex hooks may impact performance. Use hooks judiciously and keep them lightweight.

## Troubleshooting and FAQ

1. **Q: Why is my context data not persisting across requests?**
   A: The context is designed to be request-scoped and is cleared after each response. If you need data to persist across requests, consider using sessions or databases.

2. **Q: How can I debug context-related issues?**
   A: Use the `beforeGet`, `afterSet`, and `onError` hooks to log context operations. You can also use the `onError` hook to catch and log any errors occurring within the context operations.

3. **Q: Is it safe to store sensitive information in the context?**
   A: While the context is isolated per request, it's generally not recommended to store highly sensitive information (like passwords) in the context. Use it for request-specific, non-sensitive data.

4. **Q: How can I extend the functionality of Express Context?**
   A: You can extend the `MyContext` class or create wrapper functions around the existing methods to add custom behavior. Make sure to thoroughly test any extensions to ensure they don't introduce bugs or performance issues.

5. **Q: What happens to the context data after the request is complete?**
   A: The context data is automatically cleared after the response is finished, ensuring that there's no data leakage between requests.

If you encounter any other issues or have questions not covered here, please check our GitHub issues page or open a new issue for support.
