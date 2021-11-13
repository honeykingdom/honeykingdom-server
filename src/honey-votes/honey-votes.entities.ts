import { User } from './users/entities/user.entity';
import { UserCredentials } from './users/entities/user-credentials.entity';
import { ChatVoting } from './chat-votes/entities/chat-voting.entity';
import { ChatVote } from './chat-votes/entities/chat-vote.entity';
import { Voting } from './votes/entities/voting.entity';
import { VotingOption } from './votes/entities/voting-option.entity';
import { Vote } from './votes/entities/vote.entity';
import { ChatGoal } from './chat-goal/entities/chat-goal.entity';
import { ChatGoalData } from './chat-goal/entities/chat-goal-data.entity';
import { ChatGoalEvent } from './chat-goal/entities/chat-goal-event.entity';

export const honeyVotesEntities = [
  User,
  UserCredentials,
  ChatVoting,
  ChatVote,
  Voting,
  VotingOption,
  Vote,
  ChatGoal,
  ChatGoalEvent,
  ChatGoalData,
];
