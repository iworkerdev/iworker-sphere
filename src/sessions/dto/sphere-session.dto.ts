import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateSphereSessionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  session_id: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  user_id?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

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
  status?: string;

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
}

export class UpdateSphereSessionDto extends PartialType(
  CreateSphereSessionDto,
) {}
