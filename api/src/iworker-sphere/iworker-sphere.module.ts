import { ProfileWarmUp, ProfileWarmUpSchema } from './schema';

import { HttpModule } from '@nestjs/axios';
import { IworkerSphereController } from './iworker-sphere.controller';
import { IworkerSphereService } from './iworker-sphere.service';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionsModule } from 'src/sessions/sessions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ProfileWarmUp.name,
        schema: ProfileWarmUpSchema,
      },
    ]),
    SessionsModule,
    HttpModule,
  ],
  controllers: [IworkerSphereController],
  providers: [IworkerSphereService],
  exports: [IworkerSphereService],
})
export class IworkerSphereModule {}
