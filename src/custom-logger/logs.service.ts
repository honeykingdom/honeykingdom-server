import { Injectable, LogLevel } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import AxiomClient from '@axiomhq/axiom-node';
import { Mutex } from 'async-mutex';
import { Config } from '../config/config.interface';

@Injectable()
export default class LogsService {
  private readonly axiom: AxiomClient;

  private readonly dataset: string;

  private readonly mutex = new Mutex();

  private queue: any[] = [];

  constructor(private readonly configService: ConfigService<Config>) {
    const axiomToken = configService.get('AXIOM_TOKEN', { infer: true });
    const axiomOrgId = configService.get('AXIOM_ORG_ID', { infer: true });
    this.dataset = configService.get('AXIOM_DATASET', { infer: true });
    this.axiom = new AxiomClient(undefined, axiomToken, axiomOrgId);
  }

  async createLog(msg: { level: LogLevel; context: string; message: string }) {
    this.queue.push(msg);
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  private async sendLogs() {
    if (this.queue.length === 0 || this.mutex.isLocked()) return;

    const release = await this.mutex.acquire();

    const logs = this.queue;
    this.queue = [];

    try {
      await this.axiom.datasets.ingestEvents(this.dataset, logs);
    } catch (e) {
    } finally {
      release();
    }
  }
}
