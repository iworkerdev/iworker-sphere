import { AutomationService } from 'src/sessions/automation/automation.service';
import { IworkerSphereService } from './iworker-sphere.service';
import { SessionsService } from 'src/sessions/sessions.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  NotFoundException,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { WarmUpProfileDTO } from './dto';
import {
  EVENTS,
  StopSessionEvent,
  WarmUpProfileEvent,
} from 'src/events-config';
import { HandleCatchException } from 'src/utils';

@Controller('iworker-sphere')
export class IworkerSphereController {
  constructor(
    private readonly iworkerSphereService: IworkerSphereService,
    private readonly sessionsService: SessionsService,
    private readonly automationService: AutomationService,
    private eventEmitter: EventEmitter2,
  ) {}

  @Post('session/wam-up')
  async warmUpSingleSession(@Body() input: WarmUpProfileDTO) {
    const { session_id } = input;

    try {
      const session = await this.sessionsService.findOneBySessionId(session_id);
      if (!session) {
        throw new NotFoundException('Session not found');
      }

      await this.automationService.changeActiveDesktop(session.desktop_id);

      const startedSessionInstance =
        await this.automationService.startLinkenSphereSession(session.id);

      if (startedSessionInstance) {
        const event = new WarmUpProfileEvent(session);
        this.eventEmitter.emit(EVENTS.WARM_UP_SESSIONS, event);
        return {
          message:
            'Warm up execution triggered for the session. This will take some time to complete. Please check the logs for more details.',
        };
      } else {
        throw new BadRequestException(
          startedSessionInstance,
          'Failed to start the session',
        );
      }
    } catch (error) {
      HandleCatchException(error);
    }
  }

  @Post('session/stop')
  async stopWarmUpSingleSession(@Body() input: WarmUpProfileDTO) {
    const { session_id } = input;

    try {
      const session = await this.sessionsService.findOneBySessionId(session_id);
      if (!session) {
        throw new NotFoundException('Session not found');
      }

      await this.automationService.changeActiveDesktop(session.desktop_id);

      const stopSessionEvent = new StopSessionEvent({
        session_id: session.session_id,
      });
      this.eventEmitter.emit(EVENTS.STOP_SESSION, stopSessionEvent);

      return {
        message: 'Session warm up execution stopped successfully',
      };
    } catch (error) {
      HandleCatchException(error);
    }
  }

  @Get('warm-ups/:desktop_id')
  async getAllProfileWarmUps(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 100,
    @Param('desktop_id') desktop_id: string,
  ) {
    try {
      const profileWarmUps =
        await this.iworkerSphereService.getAllProfileWarmUpsByDesktopId(
          desktop_id,
          page,
          limit,
        );
      return profileWarmUps;
    } catch (error) {
      HandleCatchException(error);
    }
  }
}
