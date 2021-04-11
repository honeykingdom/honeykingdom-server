type TelegramPostChannel = {
  id: number;
  name: string;
  title: string;
};
type TelegramPostImage = {
  type: 'image';
  // url: string;
};
type TelegramPostVideo = {
  type: 'video';
  // url?: string;
  // thumbUrl: string;
  // duration: string;
};
type TelegramPostMedia = TelegramPostImage | TelegramPostVideo;

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
