import express from 'express';
import { MyContext, contextMiddleware } from '../index';

const router = express.Router();
const ctx = new MyContext();

// Middleware to attach context to each request
router.use(contextMiddleware());

// Sign up route (POST /signup)
router.post('/signup', (req, res) => {
  const { username, email } = req.body;

  // Store user details in context
  req.context.set('user', { username, email });

  res.status(201).json({
    message: 'User signed up successfully',
    user: { username, email },
  });
});

// Get user route (GET /user)
router.get('/user', (req, res) => {
  const user = req.context.get('user');

  if (user) {
    res.json({ user });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

// Update user route (PUT /user)
router.put('/user', (req, res) => {
  const currentUser = req.context?.get('user') || {};
  const { username, email } = req.body;
  const updatedUser = {
    ...currentUser,
    username: username || currentUser?.username,
    email: email || currentUser?.email,
  };

  req.context.set('user', updatedUser);

  res.json({ message: 'User updated successfully', user: updatedUser });
});

export default router;
