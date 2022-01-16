import Joi from 'joi';

export type Config = {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: string;

  RECENT_MESSAGES_CHANNELS: string;
  RECENT_MESSAGES_LIMIT: string;
  RECENT_MESSAGES_CORS_ORIGIN: string;
  RECENT_MESSAGES_MONGODB_URI: string;
  RECENT_MESSAGES_REDIRECT_URL: string;

  HEROKU_AWAKE_BASE_URL: string;
  HEROKU_AWAKE_INTERVAL: string;

  TELEGRAM_API_CHECK_INTERVAL: string;

  HONEY_BOT_USERNAME: string;
  HONEY_BOT_TOKEN: string;
  HONEY_BOT_CHANNELS: string;
  HONEY_BOT_TELEGRAM_TO_CHAT: string;

  LINK_SHORTENER_ACCESS_TOKEN: string;

  POSTGRES_HOST: string;
  POSTGRES_PORT: string;
  POSTGRES_DATABASE: string;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;

  HONEY_VOTES_BASE_URL: string;
  HONEY_VOTES_FRONTEND_BASE_URL: string;
  HONEY_VOTES_ACCESS_TOKEN_SECRET: string;
  HONEY_VOTES_ACCESS_TOKEN_EXPIRE_TIME: string;
  HONEY_VOTES_REFRESH_TOKEN_SECRET: string;
  HONEY_VOTES_REFRESH_TOKEN_EXPIRE_TIME: string;
  HONEY_VOTES_TWITCH_CLIENT_ID: string;
  HONEY_VOTES_TWITCH_CLIENT_SECRET: string;
  HONEY_VOTES_CRYPTO_SECRET: string;

  KINOPOISK_API_KEY: string;

  IGDB_CLIENT_ID: string;
  IGDB_CLIENT_SECRET: string;
  IGDB_ACCESS_TOKEN: string;

  INSTAGRAM_SESSION_ID: string;
};

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  RECENT_MESSAGES_CHANNELS: Joi.string().required(),
  RECENT_MESSAGES_LIMIT: Joi.number().default(500),
  RECENT_MESSAGES_CORS_ORIGIN: Joi.string().required(),
  RECENT_MESSAGES_MONGODB_URI: Joi.string().required(),
  RECENT_MESSAGES_REDIRECT_URL: Joi.string().required(),

  HEROKU_AWAKE_BASE_URL: Joi.string().required(),
  HEROKU_AWAKE_INTERVAL: Joi.string().default('15 min'),

  TELEGRAM_API_CHECK_INTERVAL: Joi.string().default('2 min'),

  HONEY_BOT_USERNAME: Joi.string().required(),
  HONEY_BOT_TOKEN: Joi.string().required(),
  HONEY_BOT_CHANNELS: Joi.string().required(),
  HONEY_BOT_TELEGRAM_TO_CHAT: Joi.string().required(),

  LINK_SHORTENER_ACCESS_TOKEN: Joi.string().required(),

  POSTGRES_HOST: Joi.string().required(),
  POSTGRES_PORT: Joi.number().required(),
  POSTGRES_DATABASE: Joi.string().required(),
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().required(),

  HONEY_VOTES_BASE_URL: Joi.string().required(),
  HONEY_VOTES_FRONTEND_BASE_URL: Joi.string().required(),
  HONEY_VOTES_ACCESS_TOKEN_SECRET: Joi.string().required(),
  HONEY_VOTES_ACCESS_TOKEN_EXPIRE_TIME: Joi.string().required(),
  HONEY_VOTES_REFRESH_TOKEN_SECRET: Joi.string().required(),
  HONEY_VOTES_REFRESH_TOKEN_EXPIRE_TIME: Joi.string().required(),
  HONEY_VOTES_TWITCH_CLIENT_ID: Joi.string().required(),
  HONEY_VOTES_TWITCH_CLIENT_SECRET: Joi.string().required(),
  HONEY_VOTES_CRYPTO_SECRET: Joi.string().length(32).required(),

  KINOPOISK_API_KEY: Joi.string().required(),

  IGDB_CLIENT_ID: Joi.string().required(),
  IGDB_CLIENT_SECRET: Joi.string().required(),
  IGDB_ACCESS_TOKEN: Joi.string().required(),

  INSTAGRAM_SESSION_ID: Joi.string().required(),
});
