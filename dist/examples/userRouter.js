import express from 'express';
const router = express.Router();
// Get initial data
router.get('/data', (req, res) => {
    const data = req.context.get('initialData');
    res.json(data);
});
// Update data
router.put('/data', (req, res) => {
    const currentData = req.context.get('initialData') || { count: 0 };
    const newCount = currentData.count + 1;
    req.context.set('initialData', { ...currentData, count: newCount });
    res.json({ message: 'Data updated', data: req.context.get('initialData') });
});
// Get user data
router.get('/user', (req, res) => {
    const user = req.context.get('user');
    if (user) {
        res.json({ user });
    }
    else {
        res.status(404).json({ message: 'User not found' });
    }
});
// Set user data
router.post('/user', (req, res) => {
    const { username, email } = req.body;
    req.context.set('user', { username, email });
    res.status(201).json({
        message: 'User data set successfully',
        user: { username, email },
    });
});
export default router;
//# sourceMappingURL=userRouter.js.map