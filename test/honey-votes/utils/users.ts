export type MockUser = {
  id: string;
  login: string;
  displayName: string;
  broadcasterType?: string;
  avatarUrl: string;
  credentials: {
    scope: string[];
    accessToken: string;
    refreshToken: string;
  };
};

const scope = [
  'channel:read:subscriptions',
  'channel:read:editors',
  'moderation:read',
];

export const users: MockUser[] = [
  {
    id: '38259425',
    login: 'dmitryscaletta',
    displayName: 'DmitryScaletta',
    avatarUrl:
      'https://static-cdn.jtvnw.net/jtv_user_pictures/dmitryscaletta-profile_image-41b036d0ef640053-300x300.jpeg',
    credentials: {
      scope,
      accessToken: '8g8lFEPeBhlhr0lzdXDyGkdgyW7D0n3j',
      refreshToken: '85VRPBr97eniIy6MQkmAs2RhgVgNC5Gs',
    },
  },
  {
    id: '471434202',
    login: 'honeykingdombot',
    displayName: 'HoneyKingdomBot',
    avatarUrl:
      'https://static-cdn.jtvnw.net/user-default-pictures-uv/75305d54-c7cc-40d1-bb9c-91fbe85943c7-profile_image-300x300.png',
    credentials: {
      scope,
      accessToken: '5rIB03aCBDLGw2jVEriQiF2QqERFKfDy',
      refreshToken: 'LygBCFpZn61RMxPrn0IkgxGGdI8HPVRj',
    },
  },
  {
    id: '60796327',
    login: 'lasqa',
    displayName: 'Lasqa',
    broadcasterType: 'partner',
    avatarUrl:
      'https://static-cdn.jtvnw.net/jtv_user_pictures/lasqa-profile_image-49dc25f1e724dbd6-300x300.jpeg',
    credentials: {
      scope,
      accessToken: 's1rrwu7zBvVoD1PfXXGKg4GKkYqgq0yo',
      refreshToken: 'BLSCkcvcFeZLWSmC2x1NBwrSHUiKTYJe',
    },
  },
  {
    id: '40298003',
    login: 'honeymad',
    displayName: 'HoneyMad',
    broadcasterType: 'partner',
    avatarUrl:
      'https://static-cdn.jtvnw.net/jtv_user_pictures/1386b312-d06d-4a21-b314-45bde3713090-profile_image-300x300.png',
    credentials: {
      scope,
      accessToken: 'AYVfcOlj4xs0vW42Aqn2TvqAGTP56Ijp',
      refreshToken: 'r2ZS07kTFu8zjZuPqzeHvdowFXK8gfoz',
    },
  },
  {
    id: '26819117',
    login: 'melharucos',
    displayName: 'melharucos',
    broadcasterType: 'partner',
    avatarUrl:
      'https://static-cdn.jtvnw.net/jtv_user_pictures/melharucos-profile_image-ee8c1b7c466b0686-300x300.png',
    credentials: {
      scope,
      accessToken: '3FJdWDN5AyCEmE2o06PDRWWeohcjBdEC',
      refreshToken: '9bRtdY0mGNRUOIO3dXQ9CDjt7W7vaxZ9',
    },
  },
];
