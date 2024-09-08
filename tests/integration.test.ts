import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import { contextMiddleware, getContext } from '../src/context-middleware';
import MyContext from '../src/ctx';
import { AllowedValueTypes } from '../src/types';

describe('Integration tests', () => {
  let app: Express;
  let server: ReturnType<Express['listen']>;

  beforeAll(() => {
    app = express();
    app.use(contextMiddleware());

    app.get('/test', (req, res) => {
      req.context.set('testKey', 'testValue');
      const ctx = getContext() as MyContext<Record<string, AllowedValueTypes>>;
      res.json({ value: ctx.get('testKey') });
    });

    app.get('/session', (req, res) => {
      const ctx = getContext() as MyContext<Record<string, AllowedValueTypes>>;
      res.json({ sessionId: ctx.get('sessionId') });
    });

    app.get('/multiple-keys', (req, res) => {
      const ctx = getContext() as MyContext<Record<string, AllowedValueTypes>>;
      ctx.set('key1', 'value1');
      ctx.set('key2', 'value2');
      res.json({
        key1: ctx.get('key1'),
        key2: ctx.get('key2'),
      });
    });

    app.get('/expiry', (req, res) => {
      const ctx = getContext() as MyContext<Record<string, AllowedValueTypes>>;
      ctx.set('expiryKey', 'expiryValue', 100); // 100ms expiry
      res.json({ set: true });
    });

    app.get('/check-expiry', (req, res) => {
      const ctx = getContext() as MyContext<Record<string, AllowedValueTypes>>;
      res.json({ value: ctx.get('expiryKey') });
    });

    app.get('/hooks', (req, res) => {
      const ctx = getContext() as MyContext<Record<string, AllowedValueTypes>>;
      ctx.hook('beforeGet', (key) => {
        console.log(`Accessing key: ${key}`);
      });
      ctx.set('hookedKey', 'hookedValue');
      const value = ctx.get('hookedKey');
      res.json({ value });
    });

    app.get('/clear', (req, res) => {
      const ctx = getContext() as MyContext<Record<string, AllowedValueTypes>>;
      ctx.set('clearKey', 'clearValue');
      ctx.clear('clearKey');
      res.json({ value: ctx.get('clearKey') });
    });

    app.get('/default-values', (req, res) => {
      const ctx = getContext() as MyContext<Record<string, AllowedValueTypes>>;
      res.json({ defaultValue: ctx.get('defaultKey') });
    });

    app.get('/get-context-outside', (req, res) => {
      res.json({ hasContext: getContext() !== undefined });
    });

    server = app.listen(3001);
  });

  afterAll(() => {
    server.close();
  });

  it('should have isolated context for different users', async () => {
    const response1 = await request(app)
      .get('/test')
      .set('x-session-id', 'user1');
    expect(response1.body.value).toBe('testValue');

    const response2 = await request(app)
      .get('/test')
      .set('x-session-id', 'user2');
    expect(response2.body.value).toBe('testValue');

    // Ensure contexts are isolated
    const checkResponse1 = await request(app)
      .get('/test')
      .set('x-session-id', 'user1');
    expect(checkResponse1.body.value).toBe('testValue');
  });

  it('should use session ID from headers', async () => {
    const response = await request(app)
      .get('/session')
      .set('x-session-id', 'test-session');
    expect(response.body.sessionId).toBe('test-session');
  });

  it('should handle multiple keys in context', async () => {
    const response = await request(app)
      .get('/multiple-keys')
      .set('x-session-id', 'multi-key-test');
    expect(response.body).toEqual({ key1: 'value1', key2: 'value2' });
  });

  it('should handle key expiry', async () => {
    await request(app).get('/expiry').set('x-session-id', 'expiry-test');

    // Immediately check the value
    let response = await request(app)
      .get('/check-expiry')
      .set('x-session-id', 'expiry-test');
    expect(response.body.value).toBe('expiryValue');

    // Wait for expiry
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Check again after expiry
    response = await request(app)
      .get('/check-expiry')
      .set('x-session-id', 'expiry-test');
    expect(response.body.value).toBeUndefined();
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
    app.use(
      contextMiddleware({
        contextConfig: {
          defaultValues: { defaultKey: 'defaultValue' },
        },
      })
    );
    app.get('/default-values', (req, res) => {
      res.json({ defaultValue: req.context.get('defaultKey') });
    });

    const response = await request(app).get('/default-values');
    expect(response.body.defaultValue).toBe('defaultValue');
  });

  it('should handle concurrent requests with different session IDs', async () => {
    const promises = [
      request(app).get('/test').set('x-session-id', 'concurrent1'),
      request(app).get('/test').set('x-session-id', 'concurrent2'),
      request(app).get('/test').set('x-session-id', 'concurrent3'),
    ];

    const responses = await Promise.all(promises);
    responses.forEach((response) => {
      expect(response.body.value).toBe('testValue');
    });
  });

  it('should handle missing session ID', async () => {
    const response = await request(app).get('/test');
    expect(response.body.value).toBe('testValue');
  });

  it('should use authorization header as fallback for session ID', async () => {
    const response = await request(app)
      .get('/session')
      .set('authorization', 'Bearer auth-session');
    expect(response.body.sessionId).toBe('Bearer auth-session');
  });

  it('should provide context via getContext() within request lifecycle', async () => {
    const response = await request(app)
      .get('/get-context-outside')
      .set('x-session-id', 'context-test');
    expect(response.body.hasContext).toBe(true);
  });

  it('should return the same context for req.context and getContext()', async () => {
    app.get('/compare-contexts', (req, res) => {
      const ctxFromGet = getContext() as MyContext<
        Record<string, AllowedValueTypes>
      >;
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

  it('should maintain separate contexts for different requests', async () => {
    app.get('/separate-contexts', (req, res) => {
      const ctx = getContext() as MyContext<Record<string, AllowedValueTypes>>;
      const value = ctx.get('separateKey') || 'default';
      ctx.set('separateKey', 'set');
      res.json({ value });
    });

    const response1 = await request(app)
      .get('/separate-contexts')
      .set('x-session-id', 'separate1');
    expect(response1.body.value).toBe('default');

    const response2 = await request(app)
      .get('/separate-contexts')
      .set('x-session-id', 'separate2');
    expect(response2.body.value).toBe('default');

    const response1Again = await request(app)
      .get('/separate-contexts')
      .set('x-session-id', 'separate1');
    expect(response1Again.body.value).toBe('set');
  });
});
