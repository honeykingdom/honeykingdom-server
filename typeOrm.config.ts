// https://wanago.io/2022/07/25/api-nestjs-database-migrations-typeorm/
import 'dotenv/config';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  url: process.env.POSTGRES_URL,
  synchronize: false,
  logging: false,
  entities: ['dist/**/!(message).entity.js'],
  migrations: ['dist/migrations/*.js'],
  subscribers: ['src/subscriber/**/*{.ts,.js}'],
  migrationsTableName: '_typeorm_migrations',
});
