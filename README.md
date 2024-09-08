# Express Context

A flexible and powerful Express middleware for managing context data across requests, allowing you to maintain request-scoped data without altering function signatures. It stores each context based on the user's session, enabling you to pass around values specific to a user.

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
npm install my-ctx
```

## Usage

### 1. Create a `MyContext` Instance

Initialize a `MyContext` instance with optional default values:

```typescript
import { MyContext } from 'my-ctx';

// Create an instance with optional default values and global expiry
const ctx = new MyContext({
  defaultValues: { userId: null, theme: 'light', lastLogin: new Date() },
  expiry: 3600000, // Optional: 1 hour global expiry
});
```

### 2. Use `contextMiddleware` in Express

Attach the context to each request using the `contextMiddleware` function:

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
  req.context.set('lastAccess', new Date(), 1800000); // 30 minutes TTL
  next();
});
```

### 3. Access Context Data

You can access the context data in your route handlers or other middleware:

```typescript
app.get('/dashboard', (req, res) => {
  const userId = req.context.get('userId');
  const userRole = req.context.get('userRole');
  const lastAccess = req.context.get('lastAccess');

  res.send(`Welcome, User ${userId} (${userRole}). Last access: ${lastAccess}`);
});
```

### 4. Adding Hooks

Hooks can be used to trigger custom behavior during context operations:

```typescript
ctx.hook('beforeGet', (key) => {
  console.log(`Accessing key: ${key}`);
});

ctx.hook('onError', (error) => {
  console.error('Context error:', error);
});
```

### 5. Clearing Context Data

You can clear specific keys or all data stored in the context:

```typescript
// Clear specific keys
app.post('/logout', (req, res) => {
  req.context.clear('userId');
  req.context.clear('userRole');
  res.send('Logged out');
});

// Clear all keys
ctx.clear(); // Use clear('*') for clearing all keys
```

## Helpers and API

### `MyContext`

The `MyContext` class is the core of the package, managing the context data across different request lifecycles. It provides a structured way to share data without needing to alter function signatures.

#### Constructor

```typescript
const ctx = new MyContext({
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

- **`clear()`**:  
  Clears all data stored in the context and triggers any attached `onClear` hooks. This is useful for resetting the context between requests or manually clearing data to free up resources.

- **`hook(event: string, fn: Function)`**:  
  Allows attaching a function to specific lifecycle events of the context. Events can include `beforeGet`, `afterSet`, and `onClear`, providing points to execute custom logic at various stages.

### `contextMiddleware`

The `contextMiddleware` function attaches the `MyContext` instance to each request in the Express application. This middleware ensures that each request has access to a unique context instance.

#### Usage Example

```typescript
import express from 'express';
import { contextMiddleware, MyContext } from 'my-ctx';

const app = express();
const ctx = new MyContext();

app.use(contextMiddleware(ctx)); // Attaches context to each request
```

### `getContext()`

The `getContext` helper function retrieves the current context within the request lifecycle. It is especially useful when you need to access context data outside of Express request handlers, such as within utility functions or business logic layers.

#### Usage Example: getContext()

```typescript
import { getContext } from 'my-ctx';

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
const ctx = new MyContext();

ctx.hook('afterSet', (key, value) => {
  console.log(`Value set: ${key} = ${value}`);
});

ctx.set('userId', '12345'); // Logs: Value set: userId = 12345
```

- **`afterSet` Hook**: Triggered every time a value is set in the context, allowing for post-processing or logging.
- **`beforeGet` Hook**: Can be used to validate or modify retrieval behavior before returning a value.
- **`onClear` Hook**: Triggered when the context is cleared, enabling cleanup operations.

### Testing the Context

Testing involves both unit tests for individual components and integration tests for the entire flow in an Express application. The `vi` testing framework, alongside tools like `supertest`, can validate that your context behaves as expected.

- Note: The test cases are written by claude

#### Unit Testing Example

```typescript
// Unit test for contextMiddleware
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

#### Integration Testing Example

```typescript
// Integration test to verify context data persistence
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
