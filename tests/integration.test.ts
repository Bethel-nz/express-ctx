import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import { contextMiddleware, MyContext } from '../src/index';

describe('Integration tests', () => {
  let app: Express;
  let server: any;
  let agent: request.SuperAgentTest;

  beforeAll(() => {
    app = express();
    const defaultCtx = new MyContext({
      defaultValues: {
        appName: 'TestApp',
        version: '1.0.0',
      },
    });

    app.use(contextMiddleware(defaultCtx));

    app.get('/', (req, res) => {
      const appName = req.context.get('appName');
      const version = req.context.get('version');
      res.send(`Welcome to ${appName} v${version}`);
    });

    app.post('/set', (req, res) => {
      const { key, value } = req.query;
      req.context.set(key as string, value as string);
      res.send(`Context value set - Key: ${key}, Value: ${value}`);
    });

    app.get('/get', (req, res) => {
      const { key } = req.query;
      const value = req.context.get(key as string);
      res.send(`Context value - Key: ${key}, Value: ${value}`);
    });

    // New route for setting a shared value
    app.post('/set-shared', (req, res) => {
      const { value } = req.query;
      req.context.set('sharedValue', value as string);
      res.send(`Shared value set: ${value}`);
    });

    // New route for getting the shared value
    app.get('/get-shared', (req, res) => {
      const sharedValue = req.context.get('sharedValue');
      res.send(`Shared value: ${sharedValue}`);
    });

    // New route for testing clear functionality
    app.post('/clear', (req, res) => {
      const { key } = req.query;
      if (key) {
        req.context.clear(key as string);
        res.send(`Cleared key: ${key}`);
      } else {
        req.context.clear();
        res.send('Cleared all keys');
      }
    });

    server = app.listen(0);
    agent = request.agent(app);
  });

  afterAll((done) => {
    server.close(done);
  });

  it('should return default app info', async () => {
    const response = await agent.get('/');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Welcome to TestApp v1.0.0');
  });

  it('should set and get user data in context', async () => {
    const mockUserData = {
      id: '12345',
      name: 'John Doe',
      email: 'john@example.com',
    };

    // Set user data
    const setResponse = await agent
      .post('/set')
      .query({ key: 'userData', value: JSON.stringify(mockUserData) });
    expect(setResponse.status).toBe(200);

    // Get user data
    const getResponse = await agent.get('/get').query({ key: 'userData' });
    expect(getResponse.status).toBe(200);
    expect(getResponse.text).toContain('John Doe');
    expect(getResponse.text).toContain('john@example.com');
  });

  it('should handle multiple requests with shared context', async () => {
    // Set value for first request
    const setResponse1 = await agent
      .post('/set')
      .query({ key: 'requestId', value: 'request1' });
    expect(setResponse1.status).toBe(200);

    // Set value for second request
    const setResponse2 = await agent
      .post('/set')
      .query({ key: 'requestId', value: 'request2' });
    expect(setResponse2.status).toBe(200);

    // Get value (should be the last set value)
    const getResponse = await agent.get('/get').query({ key: 'requestId' });
    expect(getResponse.status).toBe(200);
    expect(getResponse.text).toBe(
      'Context value - Key: requestId, Value: request2'
    );
  });

  it('should share context value between different endpoints', async () => {
    // Set a shared value
    const setResponse = await agent
      .post('/set-shared')
      .query({ value: 'shared-data-123' });
    expect(setResponse.status).toBe(200);
    expect(setResponse.text).toBe('Shared value set: shared-data-123');

    // Get the shared value from a different endpoint
    const getResponse = await agent.get('/get-shared');
    expect(getResponse.status).toBe(200);
    expect(getResponse.text).toBe('Shared value: shared-data-123');

    // Verify that the shared value is also accessible via the original /get endpoint
    const originalGetResponse = await agent
      .get('/get')
      .query({ key: 'sharedValue' });
    expect(originalGetResponse.status).toBe(200);
    expect(originalGetResponse.text).toBe(
      'Context value - Key: sharedValue, Value: shared-data-123'
    );
  });

  it('should handle multiple requests with isolated contexts', async () => {
    // This test remains unchanged, but it's important to verify
    // that each request gets its own context instance
    const setResponse1 = await agent
      .post('/set')
      .query({ key: 'requestId', value: 'request1' });
    expect(setResponse1.status).toBe(200);

    const setResponse2 = await agent
      .post('/set')
      .query({ key: 'requestId', value: 'request2' });
    expect(setResponse2.status).toBe(200);

    const getResponse = await agent.get('/get').query({ key: 'requestId' });
    expect(getResponse.status).toBe(200);
    expect(getResponse.text).toBe(
      'Context value - Key: requestId, Value: request2'
    );
  });

  it('should allow clearing specific key', async () => {
    // Set a value
    await agent.post('/set').query({ key: 'testKey', value: 'testValue' });

    // Clear the specific key
    const clearResponse = await agent.post('/clear').query({ key: 'testKey' });
    expect(clearResponse.status).toBe(200);
    expect(clearResponse.text).toBe('Cleared key: testKey');

    // Verify the key is cleared
    const getResponse = await agent.get('/get').query({ key: 'testKey' });
    expect(getResponse.status).toBe(200);
    expect(getResponse.text).toBe(
      'Context value - Key: testKey, Value: undefined'
    );
  });

  it('should allow clearing all keys', async () => {
    // Set multiple values
    await agent.post('/set').query({ key: 'key1', value: 'value1' });
    await agent.post('/set').query({ key: 'key2', value: 'value2' });

    // Clear all keys
    const clearResponse = await agent.post('/clear');
    expect(clearResponse.status).toBe(200);
    expect(clearResponse.text).toBe('Cleared all keys');

    // Verify all keys are cleared
    const getResponse1 = await agent.get('/get').query({ key: 'key1' });
    const getResponse2 = await agent.get('/get').query({ key: 'key2' });
    expect(getResponse1.text).toBe(
      'Context value - Key: key1, Value: undefined'
    );
    expect(getResponse2.text).toBe(
      'Context value - Key: key2, Value: undefined'
    );
  });
});
