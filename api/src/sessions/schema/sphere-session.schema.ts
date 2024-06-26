import * as mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SessionStatus, SessionType } from '../dto';

@Schema({
  timestamps: true,
  versionKey: false,
  collection: 'sphere_sessions',
})
export class SphereSession extends mongoose.Document {
  @Prop({ required: true, default: SessionType.NORMAL })
  type: SessionType;

  @Prop({ required: true })
  team_name: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  session_id: string;

  @Prop({ require: true })
  desktop_id: string;

  @Prop({ required: true })
  desktop_name: string;

  @Prop({ required: true, unique: true })
  session_execution_id: number;

  @Prop({ required: true })
  session_execution_batch_id: number;

  @Prop({ required: true })
  user_id: string;

  @Prop({ required: false, default: true })
  headless?: boolean;

  @Prop({ required: true, default: 8089 })
  debug_port?: string;

  @Prop({ required: false, default: SessionStatus.STOPPED })
  status?: SessionStatus;

  @Prop({ required: false, default: null })
  last_activity?: Date;

  @Prop({ required: false, default: null })
  last_topic_of_search?: string;

  @Prop({ required: false, default: null })
  last_run_success_rate?: string;
}

export const SphereSessionSchema = SchemaFactory.createForClass(SphereSession);
