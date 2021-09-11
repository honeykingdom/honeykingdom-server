import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class AddVoteDto {
  @IsInt()
  @IsPositive()
  @ApiProperty()
  votingOptionId: number;
}
