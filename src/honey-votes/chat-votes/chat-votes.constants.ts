import { TwitchUserType } from '../honey-votes.interface';
import {
  ChatVotingCommands,
  ChatVotingRestrictions,
} from './dto/addChatVotingDto';

// TODO: export all the constants to the frontend

export const CHAT_VOTING_TABLE_NAME = 'hv_chat_voting';
export const CHAT_VOTE_TABLE_NAME = 'hv_chat_vote';

export const CHAT_VOTING_RESTRICTIONS_DEFAULT: ChatVotingRestrictions = {
  [TwitchUserType.Viewer]: false,
  [TwitchUserType.SubTier1]: true,
  [TwitchUserType.SubTier2]: true,
  [TwitchUserType.SubTier3]: true,
  [TwitchUserType.Mod]: true,
  [TwitchUserType.Vip]: true,
  subMonthsRequired: 0,
};

export const CHAT_VOTING_COMMAND_MAX_LENGTH = 50;
export const CHAT_VOTING_COMMANDS_DEFAULT: ChatVotingCommands = {
  vote: '%',
  clearVotes: '!clearvotes',
};