import { Column, CreateDateColumn, Entity, ObjectIdColumn } from 'typeorm';

@Entity()
export class Message {
  @ObjectIdColumn()
  _id: string;

  @Column()
  raw: string;

  @Column()
  channel: string;

  @Column()
  message: string;

  @Column()
  username: string;

  @CreateDateColumn()
  timestamp: Date;
}
