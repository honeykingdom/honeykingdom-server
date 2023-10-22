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
  APP_CORS_ORIGINS: z.string().default(''),

  POSTGRES_URL: z.string(),
  MYSQL_URL: z.string(),
  REDIS_URL: z.string(),

  RECENT_MESSAGES_CHANNELS: z.string(),
  RECENT_MESSAGES_LIMIT: z.preprocess(
    (v) => parseInt(v as string, 10),
    z.number().default(500),
  ),
  RECENT_MESSAGES_REDIRECT_URL: z.string(),

  HONEY_BOT_CLIENT_ID: z.string(),
  HONEY_BOT_CLIENT_SECRET: z.string(),
  HONEY_BOT_CHANNELS: z.string(),
  HONEY_BOT_TELEGRAM_TO_CHAT: z.string(),

  HONEY_VOTES_FRONTEND_BASE_URL: z.string(),
  HONEY_VOTES_ACCESS_TOKEN_SECRET: z.string(),
  HONEY_VOTES_ACCESS_TOKEN_EXPIRE_TIME: z.string(),
  HONEY_VOTES_REFRESH_TOKEN_SECRET: z.string(),
  HONEY_VOTES_REFRESH_TOKEN_EXPIRE_TIME: z.string(),
  HONEY_VOTES_TWITCH_CLIENT_ID: z.string(),
  HONEY_VOTES_TWITCH_CLIENT_SECRET: z.string(),
  HONEY_VOTES_CRYPTO_SECRET: z.string().length(32),

  IGDB_CLIENT_ID: z.string(),
  IGDB_CLIENT_SECRET: z.string(),

  AXIOM_TOKEN: z.string(),
  AXIOM_ORG_ID: z.string(),
  AXIOM_DATASET: z.string(),

  KINOPOISK_API_KEY: z.string(),

  LINK_SHORTENER_ACCESS_TOKEN: z.string(),

  TELEGRAM_API_CHECK_INTERVAL: z.string().default('2 min'),

  INSTAGRAM_COOKIE: z.string(),

  F1_COOKIE: z.string(),

  TG_BOT_TOKEN: z.string(),
  TG_BOT_TWITCH_CLIENT_ID: z.string(),
  TG_BOT_TWITCH_CLIENT_SECRET: z.string(),
});

export type Config = z.infer<typeof configSchema>;

export const validate: ConfigModuleOptions['validate'] = (config) =>
  configSchema.parse(config);
