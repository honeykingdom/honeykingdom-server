import { Column, Entity, ObjectIdColumn } from 'typeorm';

@Entity()
export class TelegramChannel {
  @ObjectIdColumn()
  _id: string;

  @Column()
  lastPostId: number;
}
