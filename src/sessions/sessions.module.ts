import { Logger, Module } from '@nestjs/common';
import {
  ProfileWarmUpSequence,
  ProfileWarmUpSequenceSchema,
  SessionsExecutionConfig,
  SessionsExecutionConfigSchema,
  SphereSession,
  SphereSessionSchema,
} from './schema';

import { AutomationService } from './automation/automation.service';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: SphereSession.name,
        schema: SphereSessionSchema,
      },
      {
        name: SessionsExecutionConfig.name,
        schema: SessionsExecutionConfigSchema,
      },
      {
        name: ProfileWarmUpSequence.name,
        schema: ProfileWarmUpSequenceSchema,
      },
    ]),
    HttpModule,
  ],
  controllers: [SessionsController],
  providers: [SessionsService, AutomationService, Logger],
})
export class SessionsModule {}
