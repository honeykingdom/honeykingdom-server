import { IsInt, IsPositive } from 'class-validator';

export class AddVoteDto {
  @IsInt()
  @IsPositive()
  votingOptionId: number;
}
