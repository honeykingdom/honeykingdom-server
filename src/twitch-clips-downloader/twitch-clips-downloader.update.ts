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
    const clipInfo = await this.twitchClipsDownloaderService.getClipInfo(text);
    if (!clipInfo) return;
    const { type, url, caption } = clipInfo;
    if (type === 'photo') {
      await ctx.replyWithPhoto(url, { caption, parse_mode: 'MarkdownV2' });
    }
    if (type === 'video') {
      await ctx.replyWithVideo(url, { caption, parse_mode: 'MarkdownV2' });
    }
  }
}
