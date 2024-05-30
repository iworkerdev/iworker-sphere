import { LoggerService } from './logger.service';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionExecutionLogsSchema } from './schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'SessionExecutionLogs', schema: SessionExecutionLogsSchema },
    ]),
  ],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
