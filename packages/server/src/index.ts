import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import recentMessages from 'recent-messages';

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN }));

app.get(
  '/api/v1/recent-messages/:channel',
  recentMessages({
    channels: process.env.TWITCH_CHANNELS!.split(',').map((s) => s.trim()),
    mongodbUri: process.env.MONGODB_URI!,
    messagesLimit: Number.parseInt(process.env.MESSAGES_LIMIT!, 10),
  }),
);

app.get('*', (req, res) => {
  res.sendStatus(404);
});

app.listen(parseInt(process.env.PORT!));
