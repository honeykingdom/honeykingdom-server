import { Controller, Get, Req, Res } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Request, Response } from 'express';
import { Formula1Service } from './formula1.service';

@Controller('api/f1')
export class Formula1Controller {
  private static SSE_HEADERS = {
    'Content-Type': 'text/event-stream',
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
  };

  private readonly connections = new Set<Response>();

  constructor(private readonly formula1Service: Formula1Service) {
    formula1Service.on('data', (data) => {
      this.broadcast(data);
    });
  }

  @Get('feed')
  async feed(@Req() req: Request, @Res() res: Response) {
    if (!this.formula1Service.isConnected()) {
      await this.formula1Service.connect();
    }

    const initialFeed = this.formula1Service.getFeed();

    res.writeHead(200, Formula1Controller.SSE_HEADERS);
    res.write(`event: init\n`);
    res.write(this.formatSseData(initialFeed));

    this.connections.add(res);

    req.on('close', () => this.connections.delete(res));
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  handleCron() {
    if (this.formula1Service.isConnected() && this.connections.size === 0) {
      this.formula1Service.disconnect();
    }
  }

  private broadcast(data: any) {
    this.connections.forEach((res) => res.write(this.formatSseData(data)));
  }

  private formatSseData(data: any) {
    return `data: ${JSON.stringify(data)}\n\n`;
  }
}
