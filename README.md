# Express Context

[![npm version](https://badge.fury.io/js/express-ctx.svg)](https://badge.fury.io/js/express-ctx)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.0%2B-blue)](https://www.typescriptlang.org/)

A flexible Express middleware for managing context data across requests, allowing you to maintain request-scoped data without altering function signatures. It stores each context based on the user's session, enabling you to pass around values specific to a user.

## Features

- **Context Data Management**: Set, get, and clear data with optional TTL (Time To Live).
- **Hooks**: Attach hooks for monitoring actions like get, set, and errors.
- **Global Expiry**: Automatically clear data after a specified time.
- **Ease of Use**: Integrate seamlessly with Express without modifying function signatures.
- **Session-Based Storage**: Automatically stores context data based on user sessions.
- **Authorization Key Fallback**: Uses authorization keys when session IDs are not available.
- **Automatic Session Management**: Reuses existing context if a session ID is still active.
- **Concurrent Request Support**: Handles multiple concurrent requests with isolated contexts.
- **TypeScript Support**: Full TypeScript support for enhanced developer experience.

## Installation

Install the package using npm:

```bash
npm install express-ctx
```

## Usage

### 1. Import the context middleware

```typescript
import { contextMiddleware } from 'express-ctx';
```

### 2. Intitialize the middleware with optional default values

```typescript
import { contextMiddleware } from 'express-ctx';
import express from 'express';

const app = express();

// use with express with optional default values and global expiry
app.use(
  contextMiddleware({
    defaultValues: { userId: null, theme: 'light', lastLogin: new Date() },
    expiry: 3600000, // Optional: 1 hour global expiry
  })
);
```

### 3. Use `contextMiddleware` in Express

Attach the context to each request using `contextMiddleware` function:

```typescript
import express from 'express';
import { contextMiddleware } from 'express-ctx';

const app = express();

app.use(contextMiddleware());

// Middleware to set user info in context (e.g., after authentication)
app.use((req, res, next) => {
  req.context.set('userId', '12345');
  req.context.set('userRole', 'admin');
  req.context.set('lastAccess', new Date(), 1800000); // 30 minutes TTL
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
ctx.hook('beforeGet', (key) => {
  console.log(`Accessing key: ${key}`);
});

ctx.hook('onError', (error) => {
  console.error('Context error:', error);
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
req.context.clear('*'); // Use clear('*') and clear() or clear(key) for clearing all keys or pass a key to clear a specific one
```

## Helpers and API

### `MyContext`

The `MyContext` class is the core of the package, managing the context data across different request lifecycles. It provides a structured way to share data without needing to alter function signatures.

#### Constructor

```typescript
new MyContext({
  defaultValues: { userId: null, last_login: new Date() }, // Optional default values for context keys
  expiry: 3600000, // Optional: Time in milliseconds for context data to expire
});
```

- **`defaultValues`**: Sets initial values for keys in the context.
- **`expiry`**: Defines an expiration time for the context data. After the specified duration, the data is cleared automatically.

#### Methods

- **`set(key: string, value: any)`**:
  Sets a value in the context. If hooks are attached to `afterSet`, they are triggered post-setting. This function can be used to store data relevant to the current request, like user roles or settings.

- **`get(key: string): any`**:
  Retrieves a value from the context. If the key does not exist, it returns the default value specified during context initialization. This is useful when fetching user-specific data or application settings.

- **`clear(key: string) or clear('*')`**:
  Clears all data stored in the context and triggers any attached `onClear` hooks. This is useful for resetting the context between requests or manually clearing data to free up resources.

- **`hook(event: string, fn: Function)`**:
  Allows attaching a function to specific lifecycle events of the context. Events can include `beforeGet`, `onSet`, `afterSet`, `onClear` and `onError`, providing points to execute custom logic at various stages.

### `contextMiddleware`

The `contextMiddleware` function recieves an optional config object and attaches it to each request in the Express application. This middleware ensures that each request has access to a unique context instance.

#### Usage Example

```typescript
import express from 'express';
import { contextMiddleware } from 'express-ctx';

const app = express();

app.use(contextMiddleware()); // Attaches context to each request
```

### `getContext()`

The `getContext` helper function retrieves the current context within the request lifecycle. It is especially useful when you need to access context data outside of Express request handlers, such as within utility functions or business logic layers.

#### Usage Example: getContext()

```typescript
import { getContext } from 'express-ctx';

function someHelperFunction() {
  const ctx = getContext();
  if (ctx) {
    const userId = ctx.get('userId'); // Retrieves the 'userId' from the current context
    // Perform operations with userId
  }
}
```

### Example with Event Hooks

Hooks provide additional control by letting you respond to changes within the context. Here's an example showing how to use hooks:

```typescript
const ctx = getContext();

ctx.hook('afterSet', (key, value) => {
  console.log(`Value set: ${key} = ${value}`);
});

ctx.set('userId', '12345'); // Logs: Value set: userId = 12345
```

- **`beforeGet` Hook**: Can be used to validate or modify retrieval behavior before returning a value.
- **`onSet` Hook**: Triggered every time a value is set in the context, allowing for post-processing or logging.
- **`afterSet` Hook**: Triggered every time a value is set in the context, allowing for post-processing or logging.
- **`onClear` Hook**: Triggered when the context is cleared, enabling cleanup operations.
- **`onError` Hook**: Triggered when an error occurs in the context, allowing for error handling or logging.

### Testing the Context

Testing involves both unit tests for individual components and integration tests for the entire flow in an Express application. The `vi` testing framework, alongside tools like `supertest`, can validate that your context behaves as expected.

- Note: The test cases are written by claude

#### Unit Testing Example

```typescript
// Unit test for contextMiddleware
import { vi, describe, it, expect } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { contextMiddleware } from 'express-ctx';

describe('contextMiddleware', () => {
  it('should attach context to request', () => {
    const middleware = contextMiddleware();

    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn(() => {}) as NextFunction;

    middleware(req, res, next);

    expect(req.context).toBeDefined();
    expect(next).toHaveBeenCalled();
  });
});
```

#### Integration Testing Example

```typescript
// Integration test to verify context data persistence
import express from 'express';
import request from 'supertest';
import { contextMiddleware } from 'express-ctx';

describe('Context Integration', () => {
  it('should maintain context across middleware', async () => {
    const app = express();

    app.use(contextMiddleware());

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

## Performance Considerations and Limitations

While Express Context is designed to be efficient, there are some considerations to keep in mind:

1. **Memory Usage**: The middleware stores context data in memory. For applications with a large number of concurrent users or sessions, monitor your application's memory usage to ensure it stays within acceptable limits.

2. **Data Accuracy**: In certain scenarios, there's a possibility that context data might become stale or inaccurate. This can happen if:

   - The session expires but the user continues to make requests.
   - There are race conditions in highly concurrent environments.

   To mitigate these issues:

   - Implement proper session management and regularly validate session data.
   - Use appropriate locking mechanisms or atomic operations when updating shared context data.
   - Consider using a distributed cache or database for storing context data in large-scale applications.

We're open to suggestions and contributions to improve the reliability and scalability of Express Context. If you have ideas or encounter specific issues, please open an issue or submit a pull request on our GitHub repository.

## Troubleshooting and FAQ

1. **Q: Why is my context data not persisting across requests?**
   A: Ensure that you're using the same session ID or authorization token for all requests. Check if your session management is working correctly.

2. **Q: How can I debug context-related issues?**
   A: Use the `beforeGet` and `afterSet` hooks to log context operations. You can also use the `onError` hook to catch and log any errors occurring within the context operations.

3. **Q: Is it safe to store sensitive information in the context?**
   A: While the context is isolated per session, it's generally not recommended to store highly sensitive information (like passwords) in the context. Use it for session-specific, non-sensitive data.

4. **Q: How can I extend the functionality of Express Context?**
   A: You can extend the `MyContext` class or create wrapper functions around the existing methods to add custom behavior. Make sure to thoroughly test any extensions to ensure they don't introduce bugs or performance issues.

5. **Q: What should I do if I encounter race conditions when updating context data?**
   A: Implement proper locking mechanisms or use atomic update operations. Consider using a database or a distributed cache for storing context data in high-concurrency scenarios.

If you encounter any other issues or have questions not covered here, please check our GitHub issues page or open a new issue for support.
