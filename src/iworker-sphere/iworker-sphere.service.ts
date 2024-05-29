import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProfileWarmUp } from './schema';
import { CreateProfileWarmUpDTO } from './dto';
import { HandleCatchException } from 'src/utils';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENTS, RecordProfileWarmUpEvent } from 'src/events-config';
import { SessionsService } from 'src/sessions/sessions.service';
import { PaginatedResponse } from 'src/utils/types';

@Injectable()
export class IworkerSphereService {
  constructor(
    @InjectModel(ProfileWarmUp.name)
    private profileWarmUpModel: Model<ProfileWarmUp>,
    private configService: ConfigService,
    private sessionsService: SessionsService,
  ) {}

  async createProfileWarmUp(
    input: CreateProfileWarmUpDTO,
  ): Promise<ProfileWarmUp> {
    try {
      const profileWarmUp = await this.profileWarmUpModel.create(input);
      return profileWarmUp;
    } catch (error) {
      HandleCatchException(error);
    }
  }

  @OnEvent(EVENTS.RECORD_PROFILE_WARM_UP)
  async handleCreateProfileWarmUpEvent(event: RecordProfileWarmUpEvent) {
    try {
      console.log('Event received', event);
      await this.createProfileWarmUp(event?.payload);
    } catch (error) {
      console.error('Error in handling event', error);
    }
  }

  async getAllProfileWarmUpsByDesktopId(
    desktopId: string,
    page: number = 1,
    limit: number = 100,
  ): Promise<PaginatedResponse<ProfileWarmUp>> {
    try {
      const profileWarmUps = await this.profileWarmUpModel
        .find({ desktop_id: desktopId })
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();

      const total = await this.profileWarmUpModel.countDocuments({
        desktop_id: desktopId,
      });

      return {
        items: profileWarmUps,
        total_count: total,
        page,
        page_size: limit,
        count: profileWarmUps.length,
      };
    } catch (error) {
      HandleCatchException(error);
    }
  }
}
