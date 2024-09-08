import { describe, it, expect, vi, beforeEach } from 'vitest';
import { contextMiddleware, MyContext, getContext } from '../src/index';
import { Request, Response, NextFunction } from 'express';

describe('contextMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { headers: {} };
    res = {};
    next = vi.fn(() => {});
  });

  it('should attach context to request', () => {
    const middleware = contextMiddleware();
    middleware(req as Request, res as Response, next);

    expect(req.context).toBeDefined();
    expect(req.context).toBeInstanceOf(MyContext);
    expect(next).toHaveBeenCalled();
  });

  it('should make context available via getContext()', () => {
    const middleware = contextMiddleware();
    middleware(req as Request, res as Response, () => {
      const currentContext = getContext();
      expect(currentContext).toBeDefined();
      expect(currentContext).toBeInstanceOf(MyContext);
      expect(currentContext).toBe(req.context);
    });
  });

  it('should use session ID from x-session-id header if provided', () => {
    const middleware = contextMiddleware();
    req.headers = { 'x-session-id': 'test-session' };

    middleware(req as Request, res as Response, () => {
      const contextFromHeader = getContext('test-session');
      expect(contextFromHeader).toBeDefined();
      expect(contextFromHeader).toBeInstanceOf(MyContext);
      expect(contextFromHeader).toBe(req.context);
    });
  });

  it('should use session ID from authorization header if x-session-id is not provided', () => {
    const middleware = contextMiddleware();
    req.headers = { authorization: 'Bearer test-auth-session' };

    middleware(req as Request, res as Response, () => {
      const contextFromHeader = getContext('test-auth-session');
      expect(contextFromHeader).toBeDefined();
      expect(contextFromHeader).toBeInstanceOf(MyContext);
      expect(contextFromHeader).toBe(req.context);
    });
  });

  it('should create a new context if session ID is not found', () => {
    const middleware = contextMiddleware();
    req.headers = { 'x-session-id': 'new-session' };

    middleware(req as Request, res as Response, next);

    expect(req.context).toBeDefined();
    expect(req.context).toBeInstanceOf(MyContext);
    expect(next).toHaveBeenCalled();
  });

  it('should reuse existing context for the same session ID', () => {
    const middleware = contextMiddleware();
    req.headers = { 'x-session-id': 'reuse-session' };

    middleware(req as Request, res as Response, next);
    const firstContext = req.context;

    // Simulate a second request with the same session ID
    req.context = undefined;
    middleware(req as Request, res as Response, next);

    expect(req.context).toBe(firstContext);
  });

  it('should apply context configuration options', () => {
    const contextConfig = {
      defaultValues: { testKey: 'testValue' },
      expiry: 1000,
    };
    const middleware = contextMiddleware({ contextConfig });
    req.headers = { 'x-session-id': 'config-test-session' };
    middleware(req as Request, res as Response, () => {
      expect(req.context?.get('testKey')).toBe('testValue');
      // Note: Testing expiry might require a more complex setup or mocking
    });
  });

  it('should handle multiple concurrent requests with different session IDs', () => {
    const middleware = contextMiddleware();
    const req1 = {
      headers: { 'x-session-id': 'session1' },
    } as Partial<Request>;
    const req2 = {
      headers: { 'x-session-id': 'session2' },
    } as Partial<Request>;

    middleware(req1 as Request, res as Response, next);
    middleware(req2 as Request, res as Response, next);

    expect(req1.context).not.toBe(req2.context);
    expect(getContext('session1')).toBe(req1.context);
    expect(getContext('session2')).toBe(req2.context);
  });

  it('should return undefined from getContext when called outside request lifecycle', () => {
    const contextOutsideRequest = getContext();
    expect(contextOutsideRequest).toBeUndefined();
  });
});
