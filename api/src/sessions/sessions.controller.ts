import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  CreateSphereSessionDTO,
  UpdateSphereSessionDTO,
} from './dto/sphere-session.dto';

import { EVENTS, ProfileWarmUpEvent } from '../events-config';

import { SessionsService } from './sessions.service';
import { AutomationService } from './automation/automation.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { find, map } from 'lodash';
import { Throttle } from '@nestjs/throttler';

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly automationService: AutomationService,
    private eventEmitter: EventEmitter2,
  ) {}

  @Get()
  findAll() {
    return this.sessionsService.findAll();
  }

  @Post()
  createOne(@Body() session: CreateSphereSessionDTO) {
    return this.sessionsService.createOne(session);
  }

  @Post('automation/create-sessions')
  createSessions(@Body('count') count: number) {
    this.automationService.createSessions(count);
    return {
      event: 'create-sessions',
      received: true,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('automation/start-sessions')
  startSessions(@Body('count') count: number) {
    this.automationService.startSessions(count);
    return {
      event: 'start-sessions',
      received: true,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('automation/end-sessions')
  endSessions() {
    this.automationService.endSessions();
    return {
      event: 'end-sessions',
      received: true,
      timestamp: new Date().toISOString(),
    };
  }

  @Throttle({ default: { limit: 1, ttl: 15000 } })
  @Get('automation/sync-sessions')
  async syncSessions() {
    const response = await this.automationService.syncSessions();
    return {
      event: 'sync-sessions',
      received: true,
      timestamp: new Date().toISOString(),
      response,
    };
  }
  @Throttle({ default: { limit: 1, ttl: 60000 } })
  @Post('automation/bulk-profile-warm-up')
  async bulkProfileWarmUp(@Body('profiles') profiles: string[]) {
    return await this.automationService.bulkWarmUp(profiles);
  }

  @Throttle({ default: { limit: 1, ttl: 60000 } })
  @Post('automation/trigger-warm-up-execution')
  async triggerWarmUpExecutionForActiveDesktop(
    @Body('profile_name') profile_name: string,
  ) {
    if (!profile_name) {
      throw new BadRequestException({
        message: `Profile name is required to trigger warm up execution. Please provide a valid profile name.`,
      });
    }

    const desktops = await this.automationService.getDesktops();
    const selectedDesktop = find(desktops, { name: profile_name });

    if (!selectedDesktop) {
      throw new NotFoundException({
        message: `Profile ${profile_name} not found in the available Profiles.  Please select a valid profile name.`,
        hint: 'Profile names are case sensitive!!',
        available_desktops: map(desktops, (d) => `${d.name} (${d.team_name})`),
      });
    } else {
      const sphereRunningSessions =
        await this.automationService.getRunningSessions();

      await this.sessionsService.deactivateAllActiveSessions(
        selectedDesktop.uuid,
      );

      if (sphereRunningSessions.length > 0) {
        throw new BadRequestException({
          message: `There are active sessions running for the profile ${profile_name}. Please wait for the active sessions to complete before triggering warm up execution.`,
          active_sessions: sphereRunningSessions,
        });
      }

      this.triggerInnit(selectedDesktop.uuid, profile_name);

      return {
        event: `trigger-warm-up-execution for ${profile_name}`,
        message:
          'Warm up execution triggered for active desktop This will take some time to complete. Please check the logs for more details.',
      };
    }
  }

  async triggerInnit(desktopId: string, profile_name: string) {
    await this.automationService.changeActiveDesktop(desktopId);
    const event = new ProfileWarmUpEvent({ profile_name });
    this.eventEmitter.emit(EVENTS.PROFILE_WARM_UP, event);
  }

  @Get('session/:id')
  findOne(@Param('id') id: string) {
    return this.sessionsService.findOne(id);
  }

  @Patch('session/:id')
  updateOne(@Param('id') id: string, @Body() session: UpdateSphereSessionDTO) {
    return this.sessionsService.updateOne(id, session);
  }

  @Delete('session/:id')
  deleteOne(@Param('id') id: string) {
    return this.sessionsService.deleteOne(id);
  }
}
