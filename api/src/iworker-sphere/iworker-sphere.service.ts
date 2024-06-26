import { AutomationService } from 'src/sessions/automation/automation.service';
import { HttpService } from '@nestjs/axios';
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
import { filter, groupBy, keys } from 'lodash';

const LINKEN_SHPERE_URL = 'http://127.0.0.1:40080';

@Injectable()
export class IworkerSphereService {
  constructor(
    @InjectModel(ProfileWarmUp.name)
    private profileWarmUpModel: Model<ProfileWarmUp>,
    private configService: ConfigService,
    private sessionsService: SessionsService,
    private automationService: AutomationService,
    private httpService: HttpService,
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

  async getTeams() {
    try {
      const response = await this.httpService.axiosRef.get(
        `${LINKEN_SHPERE_URL}/teams`,
      );
      return response.data;
    } catch (error) {
      HandleCatchException(error);
    }
  }

  async getDesktops() {
    type Desktop = {
      is_active: boolean;
      name: string;
      team_name: string;
      uuid: string;
    };

    try {
      const response = await this.httpService.axiosRef.get(
        `${LINKEN_SHPERE_URL}/desktops`,
      );

      const desktops = response.data as Desktop[];

      const desktop_by_teams = groupBy(
        filter(desktops, 'team_name'),
        'team_name',
      );

      return {
        teams: keys(desktop_by_teams),
        desktops: desktop_by_teams,
        active_desktop: filter(desktops, 'is_active')[0],
      };
    } catch (error) {
      HandleCatchException(error);
    }
  }

  async getSessionsForDesktop(desktopId: string, filter?: string) {
    try {
      const sessions = await this.sessionsService.findManyByDesktopId(
        desktopId,
        filter,
      );

      return sessions;
    } catch (error) {
      HandleCatchException(error);
    }
  }
}
