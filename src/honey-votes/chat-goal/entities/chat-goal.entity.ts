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
  @ApiProperty({ default: CHAT_GOAL_PERMISSIONS_DEFAULT })
  permissions: ChatGoalPermissions;

  @Column({ default: false })
  @ApiProperty({ default: false })
  listening: boolean;

  @Column({ default: '', length: CHAT_GOAL_TITLE_MAX_LENGTH })
  @ApiProperty({ default: '', maxLength: CHAT_GOAL_TITLE_MAX_LENGTH })
  title: string;

  @Column({
    default: CHAT_GOAL_UPVOTE_COMMAND_DEFAULT,
    length: CHAT_GOAL_VOTE_COMMAND_MAX_LENGTH,
  })
  @ApiProperty({
    default: CHAT_GOAL_UPVOTE_COMMAND_DEFAULT,
    maxLength: CHAT_GOAL_VOTE_COMMAND_MAX_LENGTH,
  })
  upvoteCommand: string;

  @Column({
    default: CHAT_GOAL_DOWNVOTE_COMMAND_DEFAULT,
    length: CHAT_GOAL_VOTE_COMMAND_MAX_LENGTH,
  })
  @ApiProperty({
    default: CHAT_GOAL_DOWNVOTE_COMMAND_DEFAULT,
    maxLength: CHAT_GOAL_VOTE_COMMAND_MAX_LENGTH,
  })
  downvoteCommand: string;

  @Column({ default: 0 })
  @ApiProperty({ description: 'Original timer duration', default: 0 })
  timerDuration: number;

  @Column({ default: CHAT_VOTES_MAX_VOTES_VALUE_DEFAULT })
  @ApiProperty({
    description: 'How many votes needs to complete the goal',
    default: CHAT_VOTES_MAX_VOTES_VALUE_DEFAULT,
  })
  maxVotesValue: number;

  @Column({ default: ChatGoalStatus.Uninitialized })
  @ApiProperty({ default: ChatGoalStatus.Uninitialized })
  status: ChatGoalStatus;

  @Column({ default: 0 })
  @ApiProperty({
    description: 'Timestamp when timer should finish',
    default: 0,
  })
  endTimerTimestamp: number;

  @Column({ default: 0 })
  @ApiProperty({
    description: 'Remaining timer duration after pause',
    default: 0,
  })
  remainingTimerDuration: number;

  @Column({ default: 0 })
  @ApiProperty({ description: 'Current full votes value', default: 0 })
  votesValue: number;

  @CreateDateColumn({ type: 'timestamptz' })
  @ApiProperty()
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  @ApiProperty()
  updatedAt: Date;
}
