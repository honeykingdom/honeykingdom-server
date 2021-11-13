import { ApiProperty } from '@nestjs/swagger';
import { ChatGoalEventType } from '../chat-goal.interface';

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
  @ApiProperty({ enum: ChatGoalEventType, enumName: 'ChatGoalEventType' })
  type: ChatGoalEventType;

  @ApiProperty()
  payload: ChatVoteEventPayload;
}
