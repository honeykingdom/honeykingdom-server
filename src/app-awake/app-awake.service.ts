import {
  CACHE_MANAGER,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Cache } from 'cache-manager';
import { lastValueFrom, Subject } from 'rxjs';
import { Config } from '../config/config.interface';

type AppInstances = {
  ids: number[];
  current: number;
};

// https://render.com/docs/free#free-web-services
@Injectable()
export class AppAwakeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppAwakeService.name);

  private readonly url: string;
  private readonly isProd: boolean;
  private readonly appInstanceId: number;
  private isTerminating = false;

  private shutdownListener$: Subject<void> = new Subject();

  constructor(
    private readonly configService: ConfigService<Config>,
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    const baseUrl = this.configService.get('APP_BASE_URL', { infer: true });

    this.url = `${baseUrl}/api/ping`;
    this.appInstanceId = Date.now();
    this.isProd =
      this.configService.get('NODE_ENV', { infer: true }) === 'production';
  }

  async onModuleInit() {
    if (!this.isProd) return;
    const instances = await this.readInstances();
    instances.current = this.appInstanceId;
    instances.ids.push(this.appInstanceId);
    await this.cache.set('app.instances', instances);
    this.logger.log(
      `Registering a new current instance: ${this.appInstanceId}`,
    );
  }

  async onModuleDestroy() {
    const instances = await this.readInstances();
    if (instances.current === this.appInstanceId) {
      instances.current = 0;
      instances.ids = instances.ids.filter((id) => id !== this.appInstanceId);
      await this.writeInstances(instances);
      this.logger.log(`Remove itself from instances: ${this.appInstanceId}`);
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleInstances() {
    if (!this.isProd || this.isTerminating) return;
    const instances = await this.readInstances();
    if (instances.current !== this.appInstanceId) {
      instances.ids = instances.ids.filter((id) => id !== this.appInstanceId);
      await this.writeInstances(instances);
      this.logger.warn(
        `Not a current instance: ${this.appInstanceId}. Terminating the process.`,
      );
      this.isTerminating = true;
      this.shutdownListener$.next();
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  handleAwake() {
    lastValueFrom(this.httpService.get(this.url));
  }

  private async readInstances() {
    let instances = await this.cache.get<AppInstances>('app.instances');
    if (!instances) {
      instances = {
        ids: [],
        current: 0,
      };
    }
    return instances;
  }

  private writeInstances(instances: AppInstances) {
    return this.cache.set<AppInstances>('app.instances', instances);
  }

  // https://stackoverflow.com/a/57151478/4687416
  subscribeToShutdown(shutdownFn: () => void): void {
    this.shutdownListener$.subscribe(() => shutdownFn());
  }
}
