import assert from 'assert';
import cheerio from 'cheerio';
import { TelegramPost as TelegramPost } from '../telegram-api.interface';

// https://regex101.com/r/dL6xuS/1
const CHANNEL_ID_REGEX = /c(\d+)_-?\d+/;

const IMAGE_CLASS = 'tgme_widget_message_photo_wrap';
const VIDEO_CLASS = 'tgme_widget_message_video_player';

const parsePostLink = (link: string): [channelName: string, postId: number] => {
  const [, , , channelName, postIdString] = link.split('/');

  return [channelName, Number.parseInt(postIdString)];
};

const parseMedia = ($: cheerio.Root): TelegramPost['media'] => {
  const mediaElems = $(
    '.tgme_widget_message_grouped_wrap > .tgme_widget_message_grouped > .tgme_widget_message_grouped_layer > a',
  );

  if (mediaElems.length) {
    return mediaElems.toArray().map((elem) => {
      const $elem = $(elem);

      if ($elem.hasClass(IMAGE_CLASS)) {
        return {
          type: 'image',
          // url: '',
        };
      }

      if ($elem.hasClass(VIDEO_CLASS)) {
        return {
          type: 'video',
          // url: '',
          // thumbUrl: '',
          // duration: '',
        };
      }

      return null as never;
    });
  }

  const imageElem = $(`.${IMAGE_CLASS}`);

  if (imageElem.length) {
    return [{ type: 'image' }];
  }

  const videoElem = $(`.${VIDEO_CLASS}`);

  if (videoElem.length) {
    return [{ type: 'video' }];
  }

  return [];
};

type ParseTelegramPostReturnType =
  | { type: 'post'; post: TelegramPost }
  | { type: 'service-message'; post: null }
  | { type: 'not-found'; post: null };

const parseTelegramPost = (html: string): ParseTelegramPostReturnType => {
  if (!html) return { type: 'not-found', post: null };

  const $ = cheerio.load(html);

  if ($('.tgme_widget_message_error').text() === 'Post not found') {
    return { type: 'not-found', post: null };
  }

  if ($('.message_media_not_supported_label').text() === 'Service message') {
    return { type: 'service-message', post: null };
  }

  let forwardedFrom: TelegramPost['forwardedFrom'];
  const forwardedFromElem = $('.tgme_widget_message_forwarded_from_name');

  if (forwardedFromElem.length) {
    const [channelName, postId] = parsePostLink(forwardedFromElem.attr('href'));

    forwardedFrom = {
      postId,
      channelName,
      channelTitle: forwardedFromElem.text().trim(),
    };
  }

  let replyTo: TelegramPost['replyTo'];
  const replyElem = $('.tgme_widget_message_reply');

  if (replyElem.length) {
    const [channelName, postId] = parsePostLink(replyElem.attr('href'));
    const channelTitle = $('.tgme_widget_message_author_name').text().trim();
    const bodyText = $('.tgme_widget_message_reply > .tgme_widget_message_text')
      .text()
      .trim();

    replyTo = {
      postId,
      channelName,
      channelTitle,
      bodyText,
    };
  }

  const widgetMessageElem = $('.tgme_widget_message');
  const peer = widgetMessageElem.data('peer') as string;
  const m = CHANNEL_ID_REGEX.exec(peer);

  assert(m);

  const channelId = Number.parseInt(m[1]);
  const channelTitle = $('.tgme_widget_message_owner_name > span')
    .text()
    .trim();

  const dateTimeAttr = $('.tgme_widget_message_date time').attr(
    'datetime',
  ) as string;
  const date = new Date(dateTimeAttr).getTime();

  const link = $('.tgme_widget_message_link > a').attr('href') as string;

  const [channelName, id] = parsePostLink(link);

  const bodyHtml = $('.tgme_widget_message_bubble > .tgme_widget_message_text')
    .html()
    .replace(/<br>/g, ' ');
  const bodyText = cheerio
    .load(bodyHtml)(':root')
    .text()
    .trim()
    .replace(/\s+/g, ' ');

  const media = parseMedia($);

  const post: TelegramPost = {
    id,
    channel: {
      id: channelId,
      name: channelName,
      title: channelTitle,
    },
    forwardedFrom,
    replyTo,
    date,
    link,
    bodyText,
    media,
  };

  return { type: 'post', post };
};

export default parseTelegramPost;
