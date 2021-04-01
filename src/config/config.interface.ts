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
}

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),

  RECENT_MESSAGES_CHANNELS: Joi.string().required(),
  RECENT_MESSAGES_LIMIT: Joi.string().required(),
  RECENT_MESSAGES_CORS_ORIGIN: Joi.string().required(),
  RECENT_MESSAGES_MONGODB_URI: Joi.string().required(),
  RECENT_MESSAGES_REDIRECT_URL: Joi.string().required(),

  HEROKU_AWAKE_BASE_URL: Joi.string().required(),
  HEROKU_AWAKE_INTERVAL: Joi.string().required(),
});
