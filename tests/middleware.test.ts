import { describe, it, expect, vi, beforeEach } from 'vitest';
import { contextMiddleware, useContext } from '../index';
import MyContext from '../src/ctx';
import { Request, Response, NextFunction } from 'express';
import express from 'express';
import request from 'supertest';
import { contextMiddleware as contextMiddlewareImport } from '../src/context-middleware';

describe('contextMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    if (!req) {
      req = { headers: {} };
      res = {
        on: vi.fn().mockReturnThis(),
      } as Partial<Response>;
      next = vi.fn(() => {});
    }
  });

  it('should attach context to request', () => {
    const middleware = contextMiddleware();
    middleware(req as Request, res as Response, next);

    expect(req.context).toBeDefined();
    expect(req.context).toBeInstanceOf(MyContext);
    expect(next).toHaveBeenCalled();
  });

  it('should make context available via useContext()', () => {
    const middleware = contextMiddleware();
    middleware(req as Request, res as Response, () => {
      const currentContext = useContext();
      expect(currentContext).toBeDefined();
      expect(currentContext).toBeInstanceOf(MyContext);
      expect(currentContext).toBe(req.context);
    });
  });

  it('should create a new context for each request', () => {
    const middleware = contextMiddleware();

    middleware(req as Request, res as Response, next);
    const firstContext = req.context;

    // Simulate a second request
    const req2 = { headers: {} } as Partial<Request>;
    const res2 = { on: vi.fn().mockReturnThis() } as Partial<Response>;
    middleware(req2 as Request, res2 as Response, next);

    expect(req2.context).toBeDefined();
    expect(req2.context).toBeInstanceOf(MyContext);
    expect(req2.context).not.toBe(firstContext);
  });

  it('should apply context configuration options', () => {
    const contextConfig = {
      testKey: 'testValue',
      expiry: 1000,
    };
    const middleware = contextMiddleware(contextConfig);
    req.headers = { 'x-session-id': 'config-test-session' };
    middleware(req as Request, res as Response, () => {
      expect(req.context?.get('testKey')).toBe('testValue');
      // Note: Testing expiry might require a more complex setup or mocking
    });
  });

  it('should allow getting and setting context values within request lifecycle', () => {
    const middleware = contextMiddleware();
    middleware(req as Request, res as Response, () => {
      req.context?.set('testKey', 'testValue');
      expect(useContext()?.get('testKey')).toBe('testValue');
    });
    // After the request is finished, the context should be cleared
    expect(useContext()).toBeUndefined();
  });

  it('should return undefined from useContext when called outside request lifecycle', () => {
    const contextOutsideRequest = useContext();
    expect(contextOutsideRequest).toBeUndefined();
  });

  it('should handle setting invalid types', () => {
    const middleware = contextMiddleware();
    middleware(req as Request, res as Response, () => {
      expect(() =>
        //eslint-disable-next-line
        req.context?.set('invalidKey', undefined as any)
      ).not.toThrow();
      expect(req.context?.get('invalidKey')).toBeUndefined();
    });
  });

  it('should handle errors in hooks', () => {
    const middleware = contextMiddleware();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    middleware(req as Request, res as Response, () => {
      req.context?.hook('beforeGet', () => {
        throw new Error('Hook error');
      });
      req.context?.get('someKey');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in beforeGet hook:'),
        expect.any(Error)
      );
    });

    errorSpy.mockRestore();
  });

  it('should execute all hook types', () => {
    const middleware = contextMiddleware();
    middleware(req as Request, res as Response, () => {
      const beforeGet = vi.fn();
      const afterSet = vi.fn();
      const onClear = vi.fn();
      const onError = vi.fn();

      req.context?.hook('beforeGet', beforeGet);
      req.context?.hook('afterSet', afterSet);
      req.context?.hook('onClear', onClear);
      req.context?.hook('onError', onError);

      req.context?.set('testKey', 'testValue');
      req.context?.get('testKey');
      req.context?.clear('testKey');

      expect(beforeGet).toHaveBeenCalledWith('testKey');
      expect(afterSet).toHaveBeenCalledWith('testKey', 'testValue');
      expect(onClear).toHaveBeenCalledWith('testKey');
      expect(onError).not.toHaveBeenCalled();
    });
  });
});

describe('Context Middleware Cleanup', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(contextMiddlewareImport());
  });

  it('should maintain separate contexts for concurrent requests', async () => {
    app.use((req, res, next) => {
      const id = req.query.id as string;
      req.context.set('id', id);
      next();
    });

    app.get('/concurrent', (req, res) => {
      const id = req.context.get('id');
      res.json({ id });
    });

    const [response1, response2] = await Promise.all([
      request(app).get('/concurrent?id=1'),
      request(app).get('/concurrent?id=2'),
    ]);

    expect(response1.body.id).toBe('1');
    expect(response2.body.id).toBe('2');
  });

  it('should clear complex object from context after request', async () => {
    app.use((req, res, next) => {
      req.context.set('user', { id: '123', name: 'Test User' });
      next();
    });

    app.get('/complex', (req, res) => {
      const user = req.context.get('user');
      res.json({ user });
    });

    const response1 = await request(app).get('/complex');
    expect(response1.body.user).toEqual({ id: '123', name: 'Test User' });

    const response2 = useContext()?.get('user');
    console.log('response2', response2);
    expect(response2).toBeUndefined();
  });

  it('should clear context even if an error occurs during request', async () => {
    const ctx = useContext();
    app.use((req, res, next) => {
      req.context.set('sensitive', 'secretData');
      next();
    });

    app.get('/error', (req, res, next) => {
      ctx?.hook('onError', () => ctx.clear('*'));
      next(new Error('Test error'));
    });

    app.use((error: Error, req: express.Request, res: express.Response) => {
      res.status(500).json({ error: error.message });
    });

    await request(app).get('/error');

    app.get('/check', (req, res) => {
      const sensitive = req.context.get('sensitive');
      console.log('sensitive', sensitive);
      res.json(sensitive);
    });

    const response = await request(app).get('/check');
    console.log('response', response.body);
    expect(response.body).to.satisfy(
      (body: any) =>
        body === undefined ||
        body === null ||
        (typeof body === 'object' && Object.keys(body).length === 0)
    );
  });
});
