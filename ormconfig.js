// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

const config = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE,
  synchronize: false,
  entities: ['dist/**/!(message).entity.js'],
  migrations: ['dist/migrations/*.js'],
  migrationsTableName: '_typeorm_migrations',
  cli: {
    migrationsDir: 'src/migrations',
  },
};

module.exports = config;
