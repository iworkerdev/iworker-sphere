import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
} from '@nestjs/common';
import {
  CreateSphereSessionDto,
  UpdateSphereSessionDto,
} from './dto/sphere-session.dto';

import { SessionsService } from './sessions.service';
import { AutomationService } from './automation/automation.service';

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly automationService: AutomationService,
  ) {}

  @Get()
  findAll() {
    return this.sessionsService.findAll();
  }

  @Post()
  createOne(@Body() session: CreateSphereSessionDto) {
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

  @Get('automation/sync-sessions')
  syncSessions() {
    this.automationService.syncSessions();
    return {
      event: 'sync-sessions',
      received: true,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('session/:id')
  findOne(@Param('id') id: string) {
    return this.sessionsService.findOne(id);
  }

  @Patch('session/:id')
  updateOne(@Param('id') id: string, @Body() session: UpdateSphereSessionDto) {
    return this.sessionsService.updateOne(id, session);
  }

  @Delete('session/:id')
  deleteOne(@Param('id') id: string) {
    return this.sessionsService.deleteOne(id);
  }
}
