import { TwitchUserType, VotingOptionType } from '../honey-votes.interface';
import { UserTypesParams } from './dto/UserTypesParams';

export const VOTE_TABLE_NAME = 'hv_vote';
export const VOTING_TABLE_NAME = 'hv_voting';
export const VOTING_OPTION_TABLE_NAME = 'hv_voting_option';

// voting
export const VOTING_TITLE_MAX_LENGTH = 50;
export const VOTING_DESCRIPTION_MAX_LENGTH = 255;

export const VOTING_OPTIONS_LIMIT_MIN = 2;
export const VOTING_OPTIONS_LIMIT_MAX = 200;

export const VOTING_CAN_MANAGE_VOTES_DEFAULT = true;
export const VOTING_CAN_MANAGE_VOTING_OPTIONS_DEFAULT = true;
export const VOTING_USER_TYPES_PARAMS_DEFAULT: UserTypesParams = {
  [TwitchUserType.Mod]: { canVote: true, canAddOptions: true },
  [TwitchUserType.Vip]: { canVote: true, canAddOptions: true },
  [TwitchUserType.SubTier1]: { canVote: true, canAddOptions: true },
  [TwitchUserType.SubTier2]: { canVote: true, canAddOptions: true },
  [TwitchUserType.SubTier3]: { canVote: true, canAddOptions: true },
  [TwitchUserType.Follower]: {
    canVote: false,
    canAddOptions: false,
    minutesToFollowRequiredToVote: 0,
    minutesToFollowRequiredToAddOptions: 0,
  },
  [TwitchUserType.Viewer]: { canVote: false, canAddOptions: false },
};
export const VOTING_ALLOWED_VOTING_OPTIONS_TYPES_DEFAULT: VotingOptionType[] = [
  VotingOptionType.KinopoiskMovie,
  VotingOptionType.IgdbGame,
  VotingOptionType.Custom,
];
export const VOTING_OPTIONS_LIMIT_DEFAULT = 100;

// voting option
export const VOTING_OPTION_CARD_TITLE_MAX_LENGTH = 50;
export const VOTING_OPTION_CARD_SUBTITLE_MAX_LENGTH = 255;
export const VOTING_OPTION_CARD_DESCRIPTION_MAX_LENGTH = 255;
