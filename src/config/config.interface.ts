import * as Joi from 'joi';

export interface Config {
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
}

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),

  RECENT_MESSAGES_CHANNELS: Joi.string().required(),
  RECENT_MESSAGES_LIMIT: Joi.number().default(500),
  RECENT_MESSAGES_CORS_ORIGIN: Joi.string().required(),
  RECENT_MESSAGES_MONGODB_URI: Joi.string().required(),
  RECENT_MESSAGES_REDIRECT_URL: Joi.string().required(),

  HEROKU_AWAKE_BASE_URL: Joi.string().required(),
  HEROKU_AWAKE_INTERVAL: Joi.number().default(15 * 60 * 1000), // 15 min

  TELEGRAM_API_CHECK_INTERVAL: Joi.number().default(2 * 60 * 1000), // 2 min

  HONEY_BOT_USERNAME: Joi.string().required(),
  HONEY_BOT_TOKEN: Joi.string().required(),
  HONEY_BOT_CHANNELS: Joi.string().required(),
  HONEY_BOT_TELEGRAM_TO_CHAT: Joi.string().required(),
});
