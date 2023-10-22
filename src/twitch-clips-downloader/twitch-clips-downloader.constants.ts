// https://github.com/honeykingdom/honey-chat/blob/main/src/features/messageCards/messageCardsConstants.ts#L8
// https://regex101.com/r/jGbDV1/5
export const TWITCH_CLIP_REGEX =
  /^(?:https?:\/\/)?(?:clips\.twitch\.tv\/|(?:www\.|m\.)?twitch\.tv\/(?:[\d\w]+)\/clip\/)([\d\w-]+)(?:\?.+)?$/;
// https://regex101.com/r/to9qPx/1
export const THUMBNAIL_REGEX = /(-preview-\d+x\d+\.jpg)$/;

const TEXT_HELP_EN = 'To download a twitch clip just send the link to it.';
const TEXT_HELP_RU =
  'Чтобы скачать twitch клип, просто отправьте ссылку на него.';
export const TEXT_START = `Welcome to the Twitch Clips Downloader.\n${TEXT_HELP_EN}\n\nДобро пожаловать в Twitch Clips Downloader.\n${TEXT_HELP_RU}`;
export const TEXT_HELP = `${TEXT_HELP_EN}\n\n${TEXT_HELP_RU}`;

export const SIZE_20_MB = 1024 * 1024 * 20;
