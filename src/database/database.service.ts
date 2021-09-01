import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { POSTGRES_CONNECTION } from '../app.constants';

@Injectable()
export class DatabaseService {
  constructor(
    @InjectConnection(POSTGRES_CONNECTION)
    private readonly connection: Connection,
  ) {}

  getDbHandle(): Connection {
    return this.connection;
  }
}
