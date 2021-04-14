import { BitlyClient } from 'bitly';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Config } from 'src/config/config.interface';

@Injectable()
export class LinkShortenerService {
  private readonly bitly: BitlyClient;

  constructor(private readonly configService: ConfigService<Config>) {
    this.bitly = new BitlyClient(
      this.configService.get('LINK_SHORTENER_ACCESS_TOKEN'),
      {},
    );
  }

  async shorten(longUrl: string): Promise<string | null> {
    let shortLink = null;

    try {
      const bitlyLink = await this.bitly.shorten(longUrl);

      shortLink = bitlyLink.link;
    } catch {}

    return shortLink;
  }
}
