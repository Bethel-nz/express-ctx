import express from 'express';
import userRouter from './userRouter';
import { contextMiddleware } from '../context-middleware';

const app = express();
const PORT = 3001;

app.use(express.json());

// Use contextMiddleware with 'authorization' header
app.use(contextMiddleware());

// Middleware to simulate setting initial data
app.use((req, res, next) => {
  const userId = req.headers['authorization'] || 'anonymous';
  if (!req.context.get('initialData')) {
    req.context.set('initialData', { count: 0, userId });
  }
  next();
});

app.use('/api', userRouter);

app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`);
});

export default app;

/*

import express from 'express';
import userRouter from './userRouter';
import { contextMiddleware } from '../index';

const app = express();

app.use(express.json()); // For parsing application/json
app.use(contextMiddleware());

// Middleware to simulate setting initial data
app.use((req, res, next) => {
  if (!req.context.get('initialData')) {
    req.context.set('initialData', { count: 0 });
  }
  next();
});

app.use('/api', userRouter);

export default app;

*/
