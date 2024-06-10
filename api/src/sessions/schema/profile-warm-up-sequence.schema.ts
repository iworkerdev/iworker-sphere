import { SessionStatus } from '../dto';
import * as mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export class DesktopProfile {
  @Prop({ required: true })
  desktop_id: string;

  @Prop({ required: true })
  desktop_name: string;

  @Prop({ required: false, default: SessionStatus.STOPPED })
  status: SessionStatus;

  @Prop({ required: true })
  execution_sequence: number;

  @Prop({ required: false, default: null })
  started_at: Date;

  @Prop({ required: false, default: null })
  finished_at: Date;
}

@Schema({
  timestamps: true,
  versionKey: false,
  collection: 'profile_warm_up_sequence',
})
export class ProfileWarmUpSequence extends mongoose.Document {
  @Prop({ required: true })
  sequence_id: string;

  @Prop({ required: true })
  sequence_number: number;

  @Prop({
    required: true,
    type: String,
    enum: SessionStatus,
    default: SessionStatus.STOPPED,
  })
  status: SessionStatus;

  @Prop({ required: true, type: Array<DesktopProfile>, default: [] })
  desktop_profiles: DesktopProfile[];

  @Prop({ required: false, default: null })
  started_at: Date;

  @Prop({ required: false, default: null })
  finished_at: Date;
}

export const ProfileWarmUpSequenceSchema = SchemaFactory.createForClass(
  ProfileWarmUpSequence,
);
