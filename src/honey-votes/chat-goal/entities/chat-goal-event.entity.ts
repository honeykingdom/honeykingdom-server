import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { CHAT_GOAL_EVENT_TABLE_NAME } from '../chat-goal.constants';
import { ChatVoteEvent } from '../classes/chat-vote-event';
import { ChatGoal } from './chat-goal.entity';

@Entity(CHAT_GOAL_EVENT_TABLE_NAME)
export class ChatGoalEvent {
  static readonly tableName = CHAT_GOAL_EVENT_TABLE_NAME;

  @OneToOne(() => ChatGoal, (chatGoal) => chatGoal.event, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  chatGoal: ChatGoal;

  @PrimaryColumn()
  @ApiProperty()
  chatGoalId: string;

  @Column({ default: 0 })
  @ApiProperty()
  seed: number;

  @Column({ type: 'jsonb', default: {} })
  @ApiProperty()
  action: ChatVoteEvent;
}
