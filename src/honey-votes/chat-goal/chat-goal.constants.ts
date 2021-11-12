import { TwitchUserType } from '../honey-votes.interface';
import {
  ChatGoalOptions,
  ChatGoalState,
  ChatGoalStatus,
} from './chat-goal.interface';
import { ChatGoalPermissions } from './classes/chat-goal-permissions';
import { ChatGoal } from './entities/chat-goal.entity';

const TWITCH_MESSAGE_MAX_LENGTH = 500;

export const CHAT_GOAL_TABLE_NAME = 'hv_chat_goal';
export const CHAT_GOAL_EVENT_TABLE_NAME = 'hv_chat_goal_event';
export const CHAT_GOAL_DATA_TABLE_NAME = 'hv_chat_goal_data';

export const CHAT_GOAL_TITLE_MAX_LENGTH = 50;

export const CHAT_GOAL_UPVOTE_COMMAND_DEFAULT = 'VoteYea';
export const CHAT_GOAL_DOWNVOTE_COMMAND_DEFAULT = 'VoteNay';
export const CHAT_GOAL_VOTE_COMMAND_MAX_LENGTH = TWITCH_MESSAGE_MAX_LENGTH;

export const CHAT_VOTES_MAX_VOTES_VALUE_DEFAULT = 100;

export const CHAT_GOAL_PERMISSIONS_DEFAULT: ChatGoalPermissions = {
  [TwitchUserType.Mod]: { canVote: true, votesAmount: 5 },
  [TwitchUserType.Vip]: { canVote: true, votesAmount: 5 },
  [TwitchUserType.SubTier1]: { canVote: true, votesAmount: 5 },
  [TwitchUserType.SubTier2]: { canVote: true, votesAmount: 10 },
  [TwitchUserType.SubTier3]: { canVote: true, votesAmount: 15 },
  [TwitchUserType.Viewer]: { canVote: true, votesAmount: 1 },
};

export const CHAT_GOAL_OPTIONS_DEFAULT: ChatGoalOptions = {
  permissions: CHAT_GOAL_PERMISSIONS_DEFAULT,
  listening: false,
  title: '',
  upvoteCommand: CHAT_GOAL_UPVOTE_COMMAND_DEFAULT,
  downvoteCommand: CHAT_GOAL_DOWNVOTE_COMMAND_DEFAULT,
  timerDuration: 0,
  maxVotesValue: CHAT_VOTES_MAX_VOTES_VALUE_DEFAULT,
};

export const CHAT_GOAL_STATE_DEFAULT: ChatGoalState = {
  status: ChatGoalStatus.Uninitialized,
  endTimerTimestamp: 0,
  remainingTimerDuration: 0,
  votesValue: 0,
};

export const CHAT_GOAL_DEFAULT: Partial<ChatGoal> = {
  ...CHAT_GOAL_OPTIONS_DEFAULT,
  ...CHAT_GOAL_STATE_DEFAULT,
};
