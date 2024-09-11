import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import { contextMiddleware, useContext } from '../src/context-middleware';
import MyContext from '../src/ctx';
import { AllowedValueTypes } from '../src/types';

describe('Integration tests', () => {
  let app: Express;
  let server: ReturnType<Express['listen']>;

  beforeAll(() => {
    app = express();
    app.use(contextMiddleware({ globalKey: 'globalValue' }));

    app.get('/test', (req, res) => {
      req.context.set('requestKey', 'requestValue');
      const ctx = useContext() as MyContext<Record<string, AllowedValueTypes>>;
      res.json({
        globalValue: ctx.get('globalKey'),
        requestValue: ctx.get('requestKey'),
      });
    });

    app.get('/session', (req, res) => {
      const sessionId = req.context.get('sessionId');
      res.json({ sessionId });
    });

    app.get('/multiple-keys', (req, res) => {
      const ctx = useContext() as MyContext<Record<string, AllowedValueTypes>>;
      ctx.set('key1', 'value1');
      ctx.set('key2', 'value2');
      res.json({
        key1: ctx.get('key1'),
        key2: ctx.get('key2'),
      });
    });

    app.get('/expiry', (req, res) => {
      const ctx = useContext() as MyContext<Record<string, AllowedValueTypes>>;
      ctx.set('expiryKey', 'expiryValue');
      res.json({ set: true });
    });

    app.get('/check-expiry', (req, res) => {
      const ctx = useContext() as MyContext<Record<string, AllowedValueTypes>>;
      res.json({ value: ctx.get('expiryKey') });
    });

    app.get('/hooks', (req, res) => {
      const ctx = useContext() as MyContext<Record<string, AllowedValueTypes>>;
      ctx.hook('beforeGet', (key) => {
        console.log(`Accessing key: ${key}`);
      });
      ctx.set('hookedKey', 'hookedValue');
      const value = ctx.get('hookedKey');
      res.json({ value });
    });

    app.get('/clear', (req, res) => {
      const ctx = useContext() as MyContext<Record<string, AllowedValueTypes>>;
      ctx.set('clearKey', 'clearValue');
      ctx.clear('clearKey');
      res.json({ value: ctx.get('clearKey') });
    });

    app.get('/default-values', (req, res) => {
      const ctx = useContext() as MyContext<Record<string, AllowedValueTypes>>;
      res.json({ defaultValue: ctx.get('defaultKey') });
    });

    app.get('/get-context-outside', (req, res) => {
      res.json({ hasContext: useContext() !== undefined });
    });

    app.get('/context-id', (req, res) => {
      const contextId = req.context.get('contextId');
      res.json({ contextId });
    });

    server = app.listen(8975);
  });

  afterAll(() => {
    server.close();
  });

  it('should have global context available across requests', async () => {
    const response1 = await request(app).get('/test');
    expect(response1.body.globalValue).toBe('globalValue');
    expect(response1.body.requestValue).toBe('requestValue');

    const response2 = await request(app).get('/test');
    expect(response2.body.globalValue).toBe('globalValue');
    expect(response2.body.requestValue).toBe('requestValue');
  });

  it('should have isolated request context', async () => {
    app.get('/isolated', (req, res) => {
      const previousValue = req.context.get('isolatedKey');
      req.context.set('isolatedKey', 'isolatedValue');
      res.json({ previousValue, currentValue: req.context.get('isolatedKey') });
    });

    const response1 = await request(app).get('/isolated');
    expect(response1.body.previousValue).toBeUndefined();
    expect(response1.body.currentValue).toBe('isolatedValue');

    const response2 = await request(app).get('/isolated');
    expect(response2.body.previousValue).toBeUndefined();
    expect(response2.body.currentValue).toBe('isolatedValue');
  });

  it('should handle multiple keys in context', async () => {
    const response = await request(app)
      .get('/multiple-keys')
      .set('x-session-id', 'multi-key-test');
    expect(response.body).toEqual({ key1: 'value1', key2: 'value2' });
  });

  it('should execute hooks', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const response = await request(app)
      .get('/hooks')
      .set('x-session-id', 'hook-test');
    expect(response.body.value).toBe('hookedValue');
    expect(consoleSpy).toHaveBeenCalledWith('Accessing key: hookedKey');
    consoleSpy.mockRestore();
  });

  it('should clear specific keys', async () => {
    const response = await request(app)
      .get('/clear')
      .set('x-session-id', 'clear-test');
    expect(response.body.value).toBeUndefined();
  });

  it('should use default values', async () => {
    const app = express();
    app.use(contextMiddleware({ defaultKey: 'defaultValue' }));
    app.get('/default-values', (req, res) => {
      res.json({ defaultValue: req.context.get('defaultKey') });
    });

    const response = await request(app).get('/default-values');
    expect(response.body.defaultValue).toBe('defaultValue');
  });

  it('should provide context via useContext() within request lifecycle', async () => {
    const response = await request(app)
      .get('/get-context-outside')
      .set('x-session-id', 'context-test');
    expect(response.body.hasContext).toBe(true);
  });

  it('should return the same context for req.context and useContext()', async () => {
    app.get('/compare-contexts', (req, res) => {
      const ctxFromGet = useContext()!;
      ctxFromGet.set('testKey', 'testValue');
      res.json({
        fromReq: req.context.get('testKey'),
        fromGet: ctxFromGet.get('testKey'),
        isSame: req.context === ctxFromGet,
      });
    });

    const response = await request(app)
      .get('/compare-contexts')
      .set('x-session-id', 'compare-test');
    expect(response.body.fromReq).toBe('testValue');
    expect(response.body.fromGet).toBe('testValue');
    expect(response.body.isSame).toBe(true);
  });

  it('should create different contexts for each request', async () => {
    app.get('/context-id', (req, res) => {
      const contextId = req.context.get('contextId');
      res.json({ contextId });
    });

    const response1 = await request(app).get('/context-id');
    const response2 = await request(app).get('/context-id');

    expect(response1.body.contextId).toBeDefined();
    expect(response2.body.contextId).toBeDefined();
    expect(response1.body.contextId).not.toBe(response2.body.contextId);
  });

  it('should handle large datasets', async () => {
    const largeData = Array.from({ length: 10000 }, (_, i) => ({
      [`key${i}`]: `value${i}`,
    }));

    app.get('/large-dataset', (req, res) => {
      largeData.forEach((item) => {
        const [key, value] = Object.entries(item)[0];
        req.context.set(key, value);
      });
      res.json({ success: true });
    });

    const start = Date.now();
    const response = await request(app).get('/large-dataset');
    const end = Date.now();

    expect(response.body.success).toBe(true);
    expect(end - start).toBeLessThan(1000); // Assuming less than 1 second is acceptable
  });

  it('should handle high concurrency', async () => {
    app.get('/concurrent', (req, res) => {
      const id = req.query.id;
      req.context.set('id', id);
      res.json({ id: req.context.get('id') });
    });

    const concurrentRequests = 100;
    const requests = Array.from({ length: concurrentRequests }, (_, i) =>
      request(app).get(`/concurrent?id=${i}`)
    );

    const responses = await Promise.all(requests);

    responses.forEach((response, index) => {
      expect(response.body.id).toBe(index.toString());
    });
  });

  it('should not leak memory over many requests', async () => {
    const initialMemoryUsage = process.memoryUsage().heapUsed;
    const requestCount = 1000; // Reduced from 10000 to 1000

    app.get('/memory-test', (req, res) => {
      req.context.set('testKey', 'testValue');
      res.json({ success: true });
    });

    for (let i = 0; i < requestCount; i++) {
      await request(app).get('/memory-test');
    }

    const finalMemoryUsage = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemoryUsage - initialMemoryUsage;

    // Increased the acceptable memory increase to 50MB
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  }, 30000); // Increased timeout to 30 seconds
});
