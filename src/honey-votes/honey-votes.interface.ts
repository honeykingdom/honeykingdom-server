export const API_BASE = '/api/honey-votes';

export enum TwitchUserType {
  Admin = 'admin',
  Editor = 'editor',
  Mod = 'mod',
  Vip = 'vip',
  Sub = 'sub',
  Follower = 'follower',
  Viewer = 'viewer',
}

export enum SubTier {
  Tier1 = 1,
  Tier2 = 2,
  Tier3 = 3,
}

export enum VotingOptionType {
  KinopoiskMovie = 'kinopoiskMovie',
  IgdbGame = 'igdbGame',
  Custom = 'custom',
}
