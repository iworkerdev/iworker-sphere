import * as mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({
  timestamps: true,
  versionKey: false,
  collection: 'profile_warmups',
})
export class ProfileWarmUp extends mongoose.Document {
  @Prop({ required: true })
  team_name: string;

  @Prop({ required: true })
  desktop_name: string;

  @Prop({ require: true })
  desktop_id: string;

  @Prop({ required: true })
  session_name: string;

  @Prop({ required: true, unique: true })
  session_id: string;

  @Prop({ required: true })
  visited_links_count: number;

  @Prop({ required: true })
  visited_links_domains: string[];

  @Prop({ required: true })
  execution_time_in_ms: number;

  @Prop({ required: true })
  warm_up_end_time: Date;

  @Prop({ required: true })
  warmup_start_time: Date;

  @Prop({ required: true })
  user_id: string;
}

export const ProfileWarmUpSchema = SchemaFactory.createForClass(ProfileWarmUp);
