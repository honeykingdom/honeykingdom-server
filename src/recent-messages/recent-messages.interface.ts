import { ApiProperty } from '@nestjs/swagger';

export class RecentMessagesResponse {
  @ApiProperty({ type: [String] })
  messages: string[];
}
