import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  channelId: number;

  @Column()
  channelName: string;

  @Column()
  userId: number;

  @Column()
  userName: string;

  @Column({ type: 'varchar', length: 512 })
  message: string;

  @Column({ type: 'varchar', length: 2048 })
  raw: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
