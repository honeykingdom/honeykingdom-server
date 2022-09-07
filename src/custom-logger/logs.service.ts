import { Injectable, LogLevel } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import AxiomClient from '@axiomhq/axiom-node';
import { randomBytes } from 'crypto';
import { Mutex } from 'async-mutex';
import { Config } from '../config/config.interface';

type LogMessage = {
  level: LogLevel;
  context: string;
  message: string;
  _id?: string;
};

@Injectable()
export default class LogsService {
  private readonly axiom: AxiomClient;

  private readonly isProduction: boolean;

  private readonly axiomDataset: string;

  private readonly mutex = new Mutex();

  private readonly _id = randomBytes(4).toString('hex');

  private queue: any[] = [];

  constructor(private readonly configService: ConfigService<Config>) {
    const axiomToken = configService.get('AXIOM_TOKEN', { infer: true });
    const axiomOrgId = configService.get('AXIOM_ORG_ID', { infer: true });
    this.axiomDataset = configService.get('AXIOM_DATASET', { infer: true });
    this.isProduction =
      configService.get('NODE_ENV', { infer: true }) === 'production';
    this.axiom = new AxiomClient(undefined, axiomToken, axiomOrgId);
  }

  async createLog(msg: LogMessage) {
    if (this.isProduction) {
      this.queue.push({ _id: this._id, ...msg });
    }
  }

  @Cron(CronExpression.EVERY_SECOND)
  private async sendLogs() {
    if (this.queue.length === 0 || this.mutex.isLocked()) return;

    const release = await this.mutex.acquire();

    const logs = this.queue;
    this.queue = [];

    try {
      await this.axiom.datasets.ingestEvents(this.axiomDataset, logs);
    } catch (e) {
    } finally {
      release();
    }
  }
}
