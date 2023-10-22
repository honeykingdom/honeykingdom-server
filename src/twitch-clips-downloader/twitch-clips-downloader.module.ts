import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TwitchClipsDownloaderUpdate } from './twitch-clips-downloader.update';
import { TwitchClipsDownloaderService } from './twitch-clips-downloader.service';

@Module({
  imports: [HttpModule],
  providers: [TwitchClipsDownloaderUpdate, TwitchClipsDownloaderService],
})
export class TwitchClipsDownloaderModule {}
