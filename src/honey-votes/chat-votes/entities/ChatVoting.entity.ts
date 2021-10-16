import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { ChatVote } from './ChatVote.entity';
import { User } from '../../users/entities/User.entity';
import {
  ChatVotingCommands,
  ChatVotingRestrictions,
} from '../dto/addChatVotingDto';
import {
  CHAT_VOTING_COMMANDS_DEFAULT,
  CHAT_VOTING_RESTRICTIONS_DEFAULT,
  CHAT_VOTING_TABLE_NAME,
} from '../chat-votes.constants';

@ApiExtraModels(ChatVote)
@Entity(CHAT_VOTING_TABLE_NAME)
export class ChatVoting {
  static readonly tableName = CHAT_VOTING_TABLE_NAME;

  @OneToOne(() => User, (user) => user.chatVoting, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  broadcaster: User;

  @PrimaryColumn()
  @RelationId((chatVoting: ChatVoting) => chatVoting.broadcaster)
  @ApiProperty()
  broadcasterId: string;

  @Column({ type: 'jsonb', default: CHAT_VOTING_RESTRICTIONS_DEFAULT })
  @ApiProperty()
  restrictions: ChatVotingRestrictions;

  @Column({ default: false })
  @ApiProperty()
  listening: boolean;

  @Column({ type: 'jsonb', default: CHAT_VOTING_COMMANDS_DEFAULT })
  @ApiProperty()
  commands: ChatVotingCommands;

  @OneToMany(() => ChatVote, (chatVote) => chatVote.chatVoting)
  votes: ChatVote[];

  @CreateDateColumn({ type: 'timestamptz' })
  @ApiProperty()
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  @ApiProperty()
  updatedAt: Date;
}
