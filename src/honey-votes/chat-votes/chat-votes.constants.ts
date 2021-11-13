import { SubTier, TwitchUserType } from '../honey-votes.constants';
import {
  ChatVotingCommands,
  ChatVotingPermissions,
} from './dto/create-chat-voting.dto';

// TODO: export all the constants to the frontend

export const CHAT_VOTING_TABLE_NAME = 'hv_chat_voting';
export const CHAT_VOTE_TABLE_NAME = 'hv_chat_vote';

export const CHAT_VOTING_PERMISSIONS_DEFAULT: ChatVotingPermissions = {
  [TwitchUserType.Viewer]: false,
  [TwitchUserType.Sub]: true,
  [TwitchUserType.Mod]: true,
  [TwitchUserType.Vip]: true,
  subMonthsRequired: 0,
  subTierRequired: SubTier.Tier1,
};

export const CHAT_VOTING_COMMAND_MAX_LENGTH = 50;
export const CHAT_VOTING_COMMANDS_DEFAULT: ChatVotingCommands = {
  vote: '%',
  clearVotes: '!clearvotes',
};

const TWITCH_MESSAGE_MAX_LENGTH = 500;
export const CHAT_VOTE_CONTENT_MAX_LENGTH = TWITCH_MESSAGE_MAX_LENGTH;
