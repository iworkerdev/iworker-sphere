import { Logger, Module } from '@nestjs/common';
import { SphereSession, SphereSessionSchema } from './schema';

import { AutomationService } from './automation/automation.service';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SphereSession.name, schema: SphereSessionSchema },
    ]),
    HttpModule,
  ],
  controllers: [SessionsController],
  providers: [SessionsService, AutomationService, Logger],
})
export class SessionsModule {}
