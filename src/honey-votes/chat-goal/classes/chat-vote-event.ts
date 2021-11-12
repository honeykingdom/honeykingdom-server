import { ApiProperty } from '@nestjs/swagger';
import { ChatEventType } from '../chat-goal.interface';

class ChatVoteEventPayload {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  userLogin: string;

  @ApiProperty()
  userDisplayName: string;

  @ApiProperty()
  votesCount: number;
}

export class ChatVoteEvent {
  @ApiProperty()
  type: ChatEventType;

  @ApiProperty()
  payload: ChatVoteEventPayload;
}
