import { Help, On, Message, Start, Update, Ctx } from 'nestjs-telegraf';
import { TwitchClipsDownloaderService } from './twitch-clips-downloader.service';
import { Context } from './twitch-clips-downloader.interface';
import { TEXT_HELP, TEXT_START } from './twitch-clips-downloader.constants';

@Update()
export class TwitchClipsDownloaderUpdate {
  constructor(
    private readonly twitchClipsDownloaderService: TwitchClipsDownloaderService,
  ) {}

  @Start()
  onStart() {
    return TEXT_START;
  }

  @Help()
  onHelp() {
    return TEXT_HELP;
  }

  @On('text')
  async onMessage(@Ctx() ctx: Context, @Message('text') text: string) {
    const slug = this.twitchClipsDownloaderService.getSlug(text);
    if (!slug) return;
    this.twitchClipsDownloaderService.logger.log(text);
    ctx.sendChatAction('upload_video');
    const response = await this.twitchClipsDownloaderService.getClipInfo(slug);
    if (response.type === 'error') {
      this.twitchClipsDownloaderService.logger.error(response.description);
      ctx.sendMessage(`Error: ${response.description}`, {
        reply_to_message_id: ctx.message.message_id,
        disable_notification: true,
      });
      return;
    }
    const { type, url, caption } = response;
    if (type === 'photo') {
      await ctx.replyWithPhoto(url, {
        caption,
        parse_mode: 'MarkdownV2',
        reply_to_message_id: ctx.message.message_id,
      });
    }
    if (type === 'video') {
      await ctx.replyWithVideo(url, {
        caption,
        parse_mode: 'MarkdownV2',
        reply_to_message_id: ctx.message.message_id,
      });
    }
  }
}
