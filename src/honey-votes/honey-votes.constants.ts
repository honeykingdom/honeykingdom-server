export const API_BASE = '/api/honey-votes';

export enum TwitchUserType {
  Broadcaster = 'broadcaster',
  Editor = 'editor',
  Mod = 'mod',
  Vip = 'vip',
  Sub = 'sub',
  SubTier1 = 'subTier1',
  SubTier2 = 'subTier2',
  SubTier3 = 'subTier3',
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

export enum BroadcasterType {
  None = '',
  Partner = 'partner',
  Affiliate = 'affiliate',
}
