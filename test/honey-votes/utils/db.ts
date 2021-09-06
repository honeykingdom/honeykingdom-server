import { Repository } from 'typeorm';
import { User } from '../../../src/honey-votes/users/entities/User.entity';
import { Voting } from '../../../src/honey-votes/votes/entities/Voting.entity';

export const createUser = (
  userRepo: Repository<User>,
  user: Partial<User>,
): Promise<User> => userRepo.save(user);

export const createVoting = (
  votingRepo: Repository<Voting>,
  voting: Partial<Voting>,
): Promise<Voting> => votingRepo.save(voting);
