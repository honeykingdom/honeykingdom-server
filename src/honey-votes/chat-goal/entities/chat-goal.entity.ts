import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/User.entity';
import { ChatGoalData } from './chat-goal-data.entity';
import {
  CHAT_GOAL_DOWNVOTE_COMMAND_DEFAULT,
  CHAT_GOAL_PERMISSIONS_DEFAULT,
  CHAT_GOAL_TABLE_NAME,
  CHAT_GOAL_TITLE_MAX_LENGTH,
  CHAT_GOAL_UPVOTE_COMMAND_DEFAULT,
  CHAT_GOAL_VOTE_COMMAND_MAX_LENGTH,
  CHAT_VOTES_MAX_VOTES_VALUE_DEFAULT,
} from '../chat-goal.constants';
import { ChatGoalPermissions } from '../classes/chat-goal-permissions';
import { ChatGoalStatus } from '../chat-goal.interface';
import { ChatGoalEvent } from './chat-goal-event.entity';

@ApiExtraModels(ChatGoalEvent)
@Entity(CHAT_GOAL_TABLE_NAME)
export class ChatGoal {
  static readonly tableName = CHAT_GOAL_TABLE_NAME;

  @OneToOne(() => User, (user) => user.chatVoting, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'broadcasterId' })
  broadcaster: User;

  @PrimaryColumn()
  @RelationId((chatGoal: ChatGoal) => chatGoal.broadcaster)
  @ApiProperty()
  broadcasterId: string;

  @OneToOne(() => ChatGoalEvent, (chatGoalEvent) => chatGoalEvent.chatGoal, {
    onDelete: 'SET NULL',
  })
  event: ChatGoalEvent;

  @OneToOne(() => ChatGoalData, (chatGoalData) => chatGoalData.chatGoal, {
    onDelete: 'SET NULL',
  })
  data: ChatGoalData;

  @Column({ type: 'jsonb', default: CHAT_GOAL_PERMISSIONS_DEFAULT })
  @ApiProperty()
  permissions: ChatGoalPermissions;

  @Column({ default: false })
  @ApiProperty()
  listening: boolean;

  @Column({ default: '', length: CHAT_GOAL_TITLE_MAX_LENGTH })
  @ApiProperty()
  title: string;

  @Column({
    default: CHAT_GOAL_UPVOTE_COMMAND_DEFAULT,
    length: CHAT_GOAL_VOTE_COMMAND_MAX_LENGTH,
  })
  @ApiProperty()
  upvoteCommand: string;

  @Column({
    default: CHAT_GOAL_DOWNVOTE_COMMAND_DEFAULT,
    length: CHAT_GOAL_VOTE_COMMAND_MAX_LENGTH,
  })
  @ApiProperty()
  downvoteCommand: string;

  /** Original timer duration */
  @Column({ default: 0 })
  @ApiProperty()
  timerDuration: number;

  /** How many votes needs to complete the goal */
  @Column({ default: CHAT_VOTES_MAX_VOTES_VALUE_DEFAULT })
  @ApiProperty()
  maxVotesValue: number;

  @Column({ default: ChatGoalStatus.Uninitialized })
  @ApiProperty()
  status: ChatGoalStatus;

  /** Timestamp when timer should finish */
  @Column({ default: 0 })
  @ApiProperty()
  endTimerTimestamp: number;

  /** Remaining timer duration after pause */
  @Column({ default: 0 })
  @ApiProperty()
  remainingTimerDuration: number;

  /** Current full votes value */
  @Column({ default: 0 })
  @ApiProperty()
  votesValue: number;

  @CreateDateColumn({ type: 'timestamptz' })
  @ApiProperty()
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  @ApiProperty()
  updatedAt: Date;
}
