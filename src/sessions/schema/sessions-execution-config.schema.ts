import * as mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({
  timestamps: true,
  versionKey: false,
  collection: 'sessions_execution_config',
})
export class SessionsExecutionConfig extends mongoose.Document {
  @Prop({ required: true })
  last_execution_id: number;

  @Prop({ required: true })
  last_execution_date: Date;

  @Prop({ required: true })
  execution_interval: number;

  @Prop({ required: false, default: 10 })
  executions_per_interval: number;

  @Prop({ required: true, unique: true })
  desktop_id: number;

  @Prop({ required: true })
  desktop_name: string;
}

export const SessionsExecutionConfigSchema = SchemaFactory.createForClass(
  SessionsExecutionConfig,
);
