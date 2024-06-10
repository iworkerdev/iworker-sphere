import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export enum SessionType {
  NORMAL = 'NORMAL',
  API = 'API',
}

export enum SessionStatus {
  ALL = 'ALL',
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  IMPORTED = 'IMPORTED',
  WARMUP = 'WARMUP',
  AUTOMATION_RUNNING = 'AUTOMATION_RUNNING',
  COMPLETED = 'COMPLETED',
}

export const SessionStatusEnumMap = {
  running: SessionStatus.RUNNING,
  stopped: SessionStatus.STOPPED,
  imported: SessionStatus.IMPORTED,
  warmup: SessionStatus.WARMUP,
  automationRunning: SessionStatus.AUTOMATION_RUNNING,
};

export type SessionStatusEnum = keyof typeof SessionStatusEnumMap;

export class CreateSphereSessionDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsIn([SessionType.NORMAL, SessionType.API])
  @IsNotEmpty()
  type: SessionType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  team_name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  session_id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  desktop_id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  desktop_name: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  user_id?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  headless?: boolean;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  debug_port: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @IsIn([SessionStatus.RUNNING, SessionStatus.STOPPED, SessionStatus.WARMUP])
  status?: SessionStatus;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  last_activity?: Date;

  @ApiProperty()
  @IsOptional()
  @IsString()
  last_topic_of_search?: string;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  session_execution_id?: number;

  @ApiProperty()
  @IsNumber()
  session_execution_batch_id?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  last_run_success_rate?: string;
}

export class UpdateSphereSessionDTO extends PartialType(
  CreateSphereSessionDTO,
) {}
