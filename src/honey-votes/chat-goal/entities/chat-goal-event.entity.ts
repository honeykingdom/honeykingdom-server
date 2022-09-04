import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  VersionColumn,
} from 'typeorm';
import { CHAT_GOAL_EVENT_TABLE_NAME } from '../chat-goal.constants';
import { ChatGoalEventType } from '../chat-goal.interface';
import { ChatGoal } from './chat-goal.entity';

/** @deprecated */
@Entity(CHAT_GOAL_EVENT_TABLE_NAME)
export class ChatGoalEvent {
  static readonly tableName = CHAT_GOAL_EVENT_TABLE_NAME;

  @OneToOne(() => ChatGoal, (chatGoal) => chatGoal.event, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'chatGoalId' })
  chatGoal: ChatGoal;

  @PrimaryColumn()
  @ApiProperty()
  chatGoalId: string;

  @VersionColumn({ default: 0 })
  @ApiProperty()
  version: number;

  @Column({ type: 'enum', enum: ChatGoalEventType })
  @ApiProperty({ enum: ChatGoalEventType, enumName: 'ChatGoalEventType' })
  type: ChatGoalEventType;

  @Column({ default: '' })
  @ApiProperty()
  userId: string;

  @Column({ default: '' })
  @ApiProperty()
  userLogin: string;

  @Column({ default: '' })
  @ApiProperty()
  userDisplayName: string;

  @Column({ default: 1 })
  @ApiProperty()
  votesCount: number;
}
