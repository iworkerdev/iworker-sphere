import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
  @IsNotEmpty()
  @IsString()
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
}

export class UpdateSessionExecutionLogsDto extends PartialType(
  SessionExecutionLogsDto,
) {}
