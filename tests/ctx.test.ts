import { describe, it, expect, vi } from 'vitest';
import MyContext from '../src/ctx';

describe('MyContext', () => {
  it('should set and get values', () => {
    const ctx = new MyContext();
    ctx.set('key', 'value');
    expect(ctx.get('key')).toBe('value');
  });

  it('should use default values', () => {
    const ctx = new MyContext({ defaultValues: { key: 'default' } });
    expect(ctx.get('key')).toBe('default');
  });

  it('should trigger hooks', () => {
    const ctx = new MyContext();
    const beforeGet = vi.fn();
    const afterSet = vi.fn();

    ctx.hook('beforeGet', beforeGet);
    ctx.hook('afterSet', afterSet);

    ctx.set('key', 'value');
    ctx.get('key');

    expect(beforeGet).toHaveBeenCalledWith('key');
    expect(afterSet).toHaveBeenCalledWith('key', 'value');
  });

  it('should clear storage', () => {
    const ctx = new MyContext();
    ctx.set('key', 'value');
    ctx.clear();
    expect(ctx.get('key')).toBeUndefined();
  });

  it('should handle default values', () => {
    const ctx = new MyContext<{ key1: string; key2?: string }>({
      defaultValues: { key1: 'value1' },
    });
    expect(ctx.get('key1')).toBe('value1');
    expect(ctx.get('key2')).toBeUndefined();

    ctx.set('key2', 'value2');
    expect(ctx.get('key2')).toBe('value2');
  });

  it('should allow setting and getting new keys', () => {
    const ctx = new MyContext<Record<string, string>>({
      defaultValues: { key1: 'value1' },
    });
    expect(() => ctx.set('key2', 'value2')).not.toThrow();
    expect(ctx.get('key1')).toBe('value1');
    expect(ctx.get('key2')).toBe('value2');
  });
});
