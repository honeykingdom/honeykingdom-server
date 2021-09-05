export const API_BASE = '/api/honey-votes';

export enum TwitchUserType {
  Admin = 'admin',
  Editor = 'editor',
  Mod = 'mod',
  Vip = 'vip',
  // Sub = 'sub',
  SubTier1 = 'subTier1',
  SubTier2 = 'subTier2',
  SubTier3 = 'subTier3',
  Follower = 'follower',
  Viewer = 'viewer',
}

export enum SubTier {
  t1 = '1000',
  t2 = '2000',
  t3 = '3000',
}

export enum VotingOptionType {
  KinopoiskMovie = 'kinopoiskMovie',
  IgdbGame = 'igdbGame',
  Custom = 'custom',
}
