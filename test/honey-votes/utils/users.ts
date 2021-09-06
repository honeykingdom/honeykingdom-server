export type MockUser = {
  id: string;
  accessToken: string;
  refreshToken: string;
  login: string;
  displayName: string;
  broadcasterType?: string;
  avatarUrl: string;
};

export const users: MockUser[] = [
  {
    id: '38259425',
    accessToken: '',
    refreshToken: '',
    login: 'dmitryscaletta',
    displayName: 'DmitryScaletta',
    avatarUrl:
      'https://static-cdn.jtvnw.net/jtv_user_pictures/dmitryscaletta-profile_image-41b036d0ef640053-300x300.jpeg',
  },
  {
    id: '471434202',
    accessToken: '',
    refreshToken: '',
    login: 'honeykingdombot',
    displayName: 'HoneyKingdomBot',
    avatarUrl:
      'https://static-cdn.jtvnw.net/user-default-pictures-uv/75305d54-c7cc-40d1-bb9c-91fbe85943c7-profile_image-300x300.png',
  },
  {
    id: '60796327',
    accessToken: '',
    refreshToken: '',
    login: 'lasqa',
    displayName: 'Lasqa',
    broadcasterType: 'partner',
    avatarUrl:
      'https://static-cdn.jtvnw.net/jtv_user_pictures/lasqa-profile_image-49dc25f1e724dbd6-300x300.jpeg',
  },
  {
    id: '40298003',
    accessToken: '',
    refreshToken: '',
    login: 'honeymad',
    displayName: 'HoneyMad',
    broadcasterType: 'partner',
    avatarUrl:
      'https://static-cdn.jtvnw.net/jtv_user_pictures/1386b312-d06d-4a21-b314-45bde3713090-profile_image-300x300.png',
  },
  {
    id: '26819117',
    accessToken: '',
    refreshToken: '',
    login: 'melharucos',
    displayName: 'melharucos',
    broadcasterType: 'partner',
    avatarUrl:
      'https://static-cdn.jtvnw.net/jtv_user_pictures/melharucos-profile_image-ee8c1b7c466b0686-300x300.png',
  },
];
