import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class SessionsExecutionConfigDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  last_execution_id: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsOptional()
  @IsDateString()
  last_execution_date: Date;

  @ApiProperty()
  @IsNotEmpty()
  @IsOptional()
  @IsNumber()
  execution_interval: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsOptional()
  @IsNumber()
  executions_per_interval: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  desktop_id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsNumber()
  desktop_name: string;
}

export class UpdateSessionsExecutionConfigDTO extends PartialType(
  SessionsExecutionConfigDTO,
) {}
