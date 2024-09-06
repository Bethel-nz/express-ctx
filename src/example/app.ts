import express from 'express';
import userRouter from './userRouter';

const app = express();
const PORT = 3000;

app.use(express.json()); // For parsing application/json
app.use('/api', userRouter);

app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`);
});
