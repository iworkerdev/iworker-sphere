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

  @Prop({ required: false, default: 5 })
  executions_per_interval: number;
}

export const SessionsExecutionConfigSchema = SchemaFactory.createForClass(
  SessionsExecutionConfig,
);
