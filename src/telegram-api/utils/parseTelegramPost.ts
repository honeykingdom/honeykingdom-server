import assert from 'assert';
import cheerio from 'cheerio';
import { TelegramPost } from '../telegram-api.interface';

// https://regex101.com/r/dL6xuS/1
const CHANNEL_ID_REGEX = /c(\d+)_-?\d+/;
// https://regex101.com/r/63nXkR/1
const IMAGE_URL_REGEX = /background-image:url\('(.+)'\)/;

const IMAGE_CLASS = 'tgme_widget_message_photo_wrap';
const VIDEO_CLASS = 'tgme_widget_message_video_player';

const parsePostLink = (link: string): [channelName: string, postId: number] => {
  const [, , , channelName, postIdString] = link.split('/');

  return [channelName, Number.parseInt(postIdString)];
};

const parseForwardedFrom = ($: cheerio.Root): TelegramPost['forwardedFrom'] => {
  const forwardedFromElem = $('.tgme_widget_message_forwarded_from_name');

  if (!forwardedFromElem.length) return;

  const [channelName, postId] = parsePostLink(forwardedFromElem.attr('href'));

  return {
    postId,
    channelName,
    channelTitle: forwardedFromElem.text().trim(),
  };
};

const parseReplyTo = ($: cheerio.Root): TelegramPost['replyTo'] => {
  const replyElem = $('.tgme_widget_message_reply');

  if (!replyElem.length) return;

  const [channelName, postId] = parsePostLink(replyElem.attr('href'));
  const channelTitle = $('.tgme_widget_message_author_name').text().trim();
  const bodyText = $('.tgme_widget_message_reply > .tgme_widget_message_text')
    .text()
    .trim();

  return {
    postId,
    channelName,
    channelTitle,
    bodyText,
  };
};

const parseMediaImage = ($: cheerio.Root, elem: cheerio.Cheerio) => {
  const styleAttr = elem.attr('style');
  const m = IMAGE_URL_REGEX.exec(styleAttr);

  return {
    type: 'image' as const,
    url: m[1],
  };
};

const parseMediaVideo = ($: cheerio.Root, elem: cheerio.Cheerio) => {
  const thumbElem = $('.tgme_widget_message_video_thumb', elem);
  const styleAttr = thumbElem.attr('style');
  const m = IMAGE_URL_REGEX.exec(styleAttr);

  const videoElem = $('.tgme_widget_message_video_wrap video', elem);
  const url = videoElem.attr('src');

  const duration = $('.message_video_duration', elem).text().trim();

  return {
    type: 'video' as const,
    url,
    thumbUrl: m[1],
    duration,
  };
};

const parseMedia = ($: cheerio.Root): TelegramPost['media'] => {
  const mediaElems = $(
    '.tgme_widget_message_grouped_wrap > .tgme_widget_message_grouped > .tgme_widget_message_grouped_layer > a',
  );

  if (mediaElems.length) {
    return mediaElems.toArray().map((elem) => {
      const $elem = $(elem);

      if ($elem.hasClass(IMAGE_CLASS)) {
        return parseMediaImage($, $elem);
      }

      if ($elem.hasClass(VIDEO_CLASS)) {
        return parseMediaVideo($, $elem);
      }

      return null as never;
    });
  }

  const imageElem = $(`.${IMAGE_CLASS}`);

  if (imageElem.length) {
    return [parseMediaImage($, imageElem)];
  }

  const videoElem = $(`.${VIDEO_CLASS}`);

  if (videoElem.length) {
    return [parseMediaVideo($, videoElem)];
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

  const forwardedFrom = parseForwardedFrom($);
  const replyTo = parseReplyTo($);
  const media = parseMedia($);

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

  const bodyHtml =
    $('.tgme_widget_message_bubble > .tgme_widget_message_text').html() || '';
  const bodyText = cheerio
    .load(bodyHtml.replace(/<br>/g, ' '))(':root')
    .text()
    .trim()
    .replace(/\s+/g, ' ');

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
