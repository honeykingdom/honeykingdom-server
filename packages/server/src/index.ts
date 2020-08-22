import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const app = express();

app.get('/', async (req, res) => {
  res.send('Hello world!');
});

app.listen(parseInt(process.env.PORT!));
