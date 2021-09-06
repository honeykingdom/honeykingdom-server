import { User } from './users/entities/User.entity';
import { UserCredentials } from './users/entities/UserCredentials.entity';
// import { ChatVoting } from './chat-votes/entities/ChatVoting.entity';
// import { ChatVote } from './chat-votes/entities/ChatVote.entity';
import { Voting } from './votes/entities/Voting.entity';
import { VotingOption } from './votes/entities/VotingOption.entity';
import { Vote } from './votes/entities/Vote.entity';

export const honeyVotesEntities = [
  User,
  UserCredentials,
  // ChatVoting,
  // ChatVote,
  Voting,
  VotingOption,
  Vote,
];
