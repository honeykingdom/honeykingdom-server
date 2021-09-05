import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
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

// https://stackoverflow.com/a/61401118/4687416

// TODO: add @IsNotEmpty()

class BaseVotingOption {
  @IsEnum(VotingOptionType)
  type: VotingOptionType;
}
class VotingOptionMovie extends BaseVotingOption {
  type: VotingOptionType.KinopoiskMovie;

  @IsInt()
  @IsPositive()
  id: number;
}
class VotingOptionGame extends BaseVotingOption {
  type: VotingOptionType.IgdbGame;

  @IsInt()
  @IsPositive()
  id: number;
}
class VotingOptionCustom extends BaseVotingOption {
  type: VotingOptionType.Custom;

  @IsString()
  @MaxLength(VOTING_OPTION_CARD_TITLE_MAX_LENGTH)
  title: string;

  @IsString()
  @MaxLength(VOTING_OPTION_CARD_DESCRIPTION_MAX_LENGTH)
  @IsOptional()
  description?: string;
}

export class AddVotingOptionDto {
  @ValidateNested()
  @Type(() => BaseVotingOption, {
    keepDiscriminatorProperty: true,
    discriminator: {
      property: 'type',
      subTypes: [
        { value: VotingOptionMovie, name: VotingOptionType.KinopoiskMovie },
        { value: VotingOptionGame, name: VotingOptionType.IgdbGame },
        { value: VotingOptionCustom, name: VotingOptionType.Custom },
      ],
    },
  })
  payload: VotingOptionMovie | VotingOptionGame | VotingOptionCustom;
}
