import { Injectable, Logger } from '@nestjs/common';
import EventEmitter from 'events';
import signalR from 'node-signalr';
import applyChanges from './utils/apply-changes';

@Injectable()
export class Formula1Service extends EventEmitter {
  private static SIGNALR_URL = 'https://livetiming.formula1.com/signalr';

  private readonly logger = new Logger(Formula1Service.name);

  private feed: any = {};
  private connecting = false;
  private connected = false;
  private client: any;

  getFeed() {
    return this.feed;
  }

  isConnected() {
    return this.connected;
  }

  async connect() {
    if (this.connected || this.connecting) return;

    this.connecting = true;

    return new Promise<void>((resolve, reject) => {
      this.client = new signalR.client(Formula1Service.SIGNALR_URL, [
        'streaming',
      ]);

      this.client.headers.Cookie = `GCLB=${process.env.F1_COOKIE_GCLB}`;

      this.client.on('connected', async () => {
        this.logger.log('Connected.');

        try {
          const initialFeed = await this.client.connection.hub.call(
            'streaming',
            'Subscribe',
            ['SPFeed', 'ExtrapolatedClock', 'StreamingStatus'],
          );

          this.feed = initialFeed.SPFeed;
          this.connecting = false;
          this.connected = true;

          resolve();

          this.logger.log('Subscribed to feed.');
        } catch (e) {
          this.connecting = false;
          this.connected = false;

          reject(e);

          this.logger.log('Subscribe error:', e);
        }
      });
      this.client.on('reconnecting', (count) =>
        this.logger.log(`Reconnecting(${count}).`),
      );
      this.client.on('disconnected', (code) =>
        this.logger.log(`Disconnected(${code}).`),
      );
      this.client.on('error', (code, ex) => {
        this.connecting = false;
        this.connected = false;

        reject(code);

        this.logger.log(`Connect error: ${code}.`);
      });

      this.client.connection.hub.on('Streaming', 'feed', (_, changes) => {
        applyChanges(this.feed, changes);

        this.emit('data', changes);
      });

      this.client.start();
    });
  }

  disconnect() {
    if (!this.connected || !this.client) return;

    this.client.end();
    this.client = null;
  }
}
