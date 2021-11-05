import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class CreateVoteDto {
  @IsInt()
  @IsPositive()
  @ApiProperty()
  votingOptionId: number;
}
