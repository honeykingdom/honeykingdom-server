import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { ChatGoal } from './chat-goal.entity';
import { CHAT_GOAL_DATA_TABLE_NAME } from '../chat-goal.constants';

@Entity(CHAT_GOAL_DATA_TABLE_NAME)
export class ChatGoalData {
  static readonly tableName = CHAT_GOAL_DATA_TABLE_NAME;

  @OneToOne(() => ChatGoal, (chatGoal) => chatGoal.data, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  chatGoal: ChatGoal;

  @PrimaryColumn()
  @ApiProperty()
  chatGoalId: string;

  /** How many votes users already spent */
  @Column({ type: 'jsonb', default: {} })
  @ApiProperty()
  votesCountByUser: Record<string, number>;
}
