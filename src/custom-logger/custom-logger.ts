import { Injectable, ConsoleLogger } from '@nestjs/common';
import { ConsoleLoggerOptions } from '@nestjs/common/services/console-logger.service';
import LogsService from './logs.service';

@Injectable()
class CustomLogger extends ConsoleLogger {
  private readonly logsService: LogsService;

  constructor(
    context: string,
    options: ConsoleLoggerOptions,
    logsService: LogsService,
  ) {
    super(context, options);

    this.logsService = logsService;
  }

  log(message: string, context?: string) {
    this.logsService.createLog({ level: 'log', message, context });
    super.log(message, context);
  }

  error(message: string, stack?: string, context?: string) {
    this.logsService.createLog({ level: 'error', message, context });
    super.error(message, stack, context);
  }

  warn(message: string, context?: string) {
    this.logsService.createLog({ level: 'warn', message, context });
    super.warn(message, context);
  }

  debug(message: string, context?: string) {
    this.logsService.createLog({ level: 'debug', message, context });
    super.debug(message, context);
  }

  verbose(message: string, context?: string) {
    this.logsService.createLog({ level: 'verbose', message, context });
    super.debug(message, context);
  }
}

export default CustomLogger;
