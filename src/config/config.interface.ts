import { ConfigModuleOptions } from '@nestjs/config';
import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.preprocess(
    (v) => parseInt(v as string, 10),
    z.number().default(3000),
  ),

  APP_BASE_URL: z.string(),

  RECENT_MESSAGES_CHANNELS: z.string(),
  RECENT_MESSAGES_LIMIT: z.preprocess(
    (v) => parseInt(v as string, 10),
    z.number().default(500),
  ),
  RECENT_MESSAGES_CORS_ORIGIN: z.string(),
  RECENT_MESSAGES_REDIRECT_URL: z.string(),

  TELEGRAM_API_CHECK_INTERVAL: z.string().default('2 min'),

  HONEY_BOT_USERNAME: z.string(),
  HONEY_BOT_TOKEN: z.string(),
  HONEY_BOT_CHANNELS: z.string(),
  HONEY_BOT_TELEGRAM_TO_CHAT: z.string(),

  LINK_SHORTENER_ACCESS_TOKEN: z.string(),

  POSTGRES_URL: z.string(),
  MONGODB_URI: z.string(),

  HONEY_VOTES_BASE_URL: z.string(),
  HONEY_VOTES_FRONTEND_BASE_URL: z.string(),
  HONEY_VOTES_ACCESS_TOKEN_SECRET: z.string(),
  HONEY_VOTES_ACCESS_TOKEN_EXPIRE_TIME: z.string(),
  HONEY_VOTES_REFRESH_TOKEN_SECRET: z.string(),
  HONEY_VOTES_REFRESH_TOKEN_EXPIRE_TIME: z.string(),
  HONEY_VOTES_TWITCH_CLIENT_ID: z.string(),
  HONEY_VOTES_TWITCH_CLIENT_SECRET: z.string(),
  HONEY_VOTES_CRYPTO_SECRET: z.string().length(32),

  KINOPOISK_API_KEY: z.string(),

  INSTAGRAM_COOKIE: z.string(),

  F1_COOKIE_GCLB: z.string(),
  F1_CORS_ORIGIN: z.string(),
});

export type Config = z.infer<typeof configSchema>;

export const validate: ConfigModuleOptions['validate'] = (config) =>
  configSchema.parse(config);
