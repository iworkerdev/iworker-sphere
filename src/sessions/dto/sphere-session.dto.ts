import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
  @IsString()
  last_activity?: Date;

  @ApiProperty()
  @IsOptional()
  @IsString()
  last_topic_of_search?: string;
}

export class UpdateSphereSessionDto extends PartialType(
  CreateSphereSessionDto,
) {}
