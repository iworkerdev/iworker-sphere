import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SessionExecutionLogs } from './schema';
import { Model } from 'mongoose';
import { SessionExecutionLogsDTO } from './dto';

@Injectable()
export class LoggerService {
  constructor(
    @InjectModel('SessionExecutionLogs')
    private readonly sessionExecutionLogsModel: Model<SessionExecutionLogs>,
  ) {}

  private readonly logger = new Logger();

  private logEvent(event: string, data: any) {
    this.logger.log(data, `Event: ${event}`);
  }

  private logError(event: string, error: any) {
    this.logger.error(error, `Event: ${event}`);
  }

  private logWarn(event: string, data: any) {
    this.logger.warn(data, `Event: ${event}`);
  }

  private logInfo(event: string, data: any) {
    this.logEvent(event, data);
  }

  async createSessionExecutionErrorLog(
    event: string,
    data: SessionExecutionLogsDTO,
  ) {
    this.logError(event, data);
    try {
      return await this.sessionExecutionLogsModel.create(data);
    } catch (error) {
      this.logError('createSessionExecutionLogs', error);
      return null;
    }
  }

  async createSessionExecutionLog(
    event: string,
    data: SessionExecutionLogsDTO,
  ) {
    this.logInfo(event, data);
    try {
      return await this.sessionExecutionLogsModel.create(data);
    } catch (error) {
      this.logInfo('createSessionExecutionLogs', error);
      return null;
    }
  }
}
