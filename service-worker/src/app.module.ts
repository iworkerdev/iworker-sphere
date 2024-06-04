import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { GLOBAL_CONFIG } from './configurations';
import { ServiceNotificationsSchema, ServiceNotifications } from './schema';
@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    MongooseModule.forRoot(GLOBAL_CONFIG.MONGODB_URI),
    MongooseModule.forFeature([
      {
        name: ServiceNotifications.name,
        schema: ServiceNotificationsSchema,
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
