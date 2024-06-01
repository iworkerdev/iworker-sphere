import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

import { Type } from 'class-transformer';

export class SessionExecutionLink {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  url: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  domain: string;
}

export class SessionExecutionLogsDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  session_id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  log_type: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  error?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  message: string;

  @ApiProperty()
  @Type(() => SessionExecutionLink)
  link: SessionExecutionLink;

  @ApiProperty()
  @IsOptional()
  @IsString()
  verbose_error?: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, any>;
}

export class UpdateSessionExecutionLogsDto extends PartialType(
  SessionExecutionLogsDto,
) {}
