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
    this.twitchClipsDownloaderService.logger.log(text);
    const slug = this.twitchClipsDownloaderService.getSlug(text);
    if (!slug) {
      ctx.sendMessage('Error: Wrong link');
      return;
    }
    ctx.sendChatAction('upload_video');
    const response = await this.twitchClipsDownloaderService.getClipInfo(slug);
    if (response.type === 'error') {
      this.twitchClipsDownloaderService.logger.error(response.description);
      ctx.sendMessage(`Error: ${response.description}`);
      return;
    }
    const { type, url, caption } = response;
    if (type === 'photo') {
      await ctx.replyWithPhoto(url, { caption, parse_mode: 'MarkdownV2' });
    }
    if (type === 'video') {
      await ctx.replyWithVideo(url, { caption, parse_mode: 'MarkdownV2' });
    }
  }
}
