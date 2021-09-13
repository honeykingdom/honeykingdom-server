import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { VotingOptionType } from '../../honey-votes.interface';
import {
  VOTING_OPTION_CARD_DESCRIPTION_MAX_LENGTH,
  VOTING_OPTION_CARD_TITLE_MAX_LENGTH,
} from '../entities/VotingOption.entity';

class VotingOptionKinopoiskMovie {
  @IsInt()
  @IsPositive()
  @ApiProperty()
  id: number;
}
class VotingOptionIgdbGame {
  @IsInt()
  @IsPositive()
  @ApiProperty()
  id: number;
}
class VotingOptionCustom {
  @IsString()
  @IsNotEmpty()
  @MaxLength(VOTING_OPTION_CARD_TITLE_MAX_LENGTH)
  @ApiProperty()
  title: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(VOTING_OPTION_CARD_DESCRIPTION_MAX_LENGTH)
  @ApiPropertyOptional()
  description?: string;
}

export class AddVotingOptionDto {
  @IsInt()
  @IsPositive()
  @ApiProperty()
  votingId: number;

  @IsEnum(VotingOptionType)
  @ApiProperty()
  type: VotingOptionType;

  @IsOptional()
  @ValidateNested()
  @Type(() => VotingOptionKinopoiskMovie)
  @ApiPropertyOptional()
  [VotingOptionType.KinopoiskMovie]?: VotingOptionKinopoiskMovie;

  @IsOptional()
  @ValidateNested()
  @Type(() => VotingOptionIgdbGame)
  @ApiPropertyOptional()
  [VotingOptionType.IgdbGame]?: VotingOptionIgdbGame;

  @IsOptional()
  @ValidateNested()
  @Type(() => VotingOptionCustom)
  @ApiPropertyOptional()
  [VotingOptionType.Custom]?: VotingOptionCustom;
}
