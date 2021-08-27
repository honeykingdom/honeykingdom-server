type TelegramPostChannel = {
  id: number;
  name: string;
  title: string;
};
type TelegramPostImage = {
  type: 'image';
  url: string;
};
type TelegramPostVideo = {
  type: 'video';
  url?: string;
  thumbUrl: string;
  duration: string;
};
type TelegramPostAudio = {
  type: 'audio';
  url?: string;
  duration: string;
};
type TelegramPostMedia =
  | TelegramPostImage
  | TelegramPostVideo
  | TelegramPostAudio;

export type TelegramPost = {
  id: number;
  channel: TelegramPostChannel;
  forwardedFrom?: {
    postId: number;
    channelName: string;
    channelTitle: string;
  };
  replyTo?: {
    postId: number;
    channelName: string;
    channelTitle: string;
    bodyText: string;
  };
  date: number;
  link: string;
  bodyText: string;
  media: TelegramPostMedia[];
};
