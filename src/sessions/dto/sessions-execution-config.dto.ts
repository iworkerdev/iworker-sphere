import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class SessionsExecutionConfigDto {
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
}

export class UpdateSessionsExecutionConfigDto extends PartialType(
  SessionsExecutionConfigDto,
) {}
