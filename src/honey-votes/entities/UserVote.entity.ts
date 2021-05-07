import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class UserVote {
  @PrimaryColumn()
  channelId: string;

  @PrimaryColumn()
  channelName: string;

  @PrimaryColumn()
  userId: string;

  @PrimaryColumn()
  userName: string;

  @Column({ nullable: true })
  displayName?: string;

  @Column()
  content: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
