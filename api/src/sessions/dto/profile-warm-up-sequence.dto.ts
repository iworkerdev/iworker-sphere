import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

export class DesktopProfileDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  desktop_id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  desktop_name: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  status: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  execution_sequence: number;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  started_at?: Date;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  finished_at?: Date;
}

export class ProfileWarmUpSequenceDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  sequence_id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  sequence_number: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  status: string;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => DesktopProfileDTO)
  @ValidateNested({ each: true })
  desktop_profiles: DesktopProfileDTO[];

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  started_at?: Date;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  finished_at?: Date;
}

export class UpdateProfileWarmUpSequenceDTO extends PartialType(
  ProfileWarmUpSequenceDTO,
) {}
