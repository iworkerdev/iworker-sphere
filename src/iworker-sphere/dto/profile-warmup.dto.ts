import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateProfileWarmUpDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  team_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  desktop_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  desktop_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  session_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  session_id: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  visited_links_count: number;

  @ApiProperty()
  @IsString({ each: true })
  @IsNotEmpty()
  visited_links_domains: string[];

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  execution_time_in_ms: number;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  warm_up_end_time: Date;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  warmup_start_time: Date;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  user_id: string;
}

export class UpdateProfileWarmUpDTO extends PartialType(
  CreateProfileWarmUpDTO,
) {}

export class WarmUpProfileDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  session_id: string;
}
