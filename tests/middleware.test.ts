import { describe, it, expect, vi } from 'vitest';
import { contextMiddleware, MyContext, getContext } from '../src/index';
import { Request, Response, NextFunction } from 'express';

describe('contextMiddleware', () => {
  it('should attach context to request', () => {
    const middleware = contextMiddleware();

    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn(() => {}) as NextFunction;

    middleware(req, res, next);

    expect(req.context).toBeDefined();
    expect(req.context).toBeInstanceOf(MyContext);
    expect(req.context).toBe(new MyContext()); // Should be the same instance
    expect(next).toHaveBeenCalled();
  });

  it('should make context available via getContext()', () => {
    const defaultCtx = new MyContext();
    const middleware = contextMiddleware();

    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn(() => {
      const currentContext = getContext();
      expect(currentContext).toBeDefined();
      expect(currentContext).toBeInstanceOf(MyContext);
      expect(currentContext).toBe(defaultCtx); // Should be the same instance
      expect(currentContext).toBe(req.context); // Should be the same as req.context
    }) as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
