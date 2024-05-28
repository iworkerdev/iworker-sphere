import * as mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export class SessionExecutionLink {
  @Prop({ required: true })
  url: string;

  @Prop({ required: false })
  domain?: string;
}

@Schema({
  timestamps: true,
  versionKey: false,
  collection: 'session_execution_logs',
})
export class SessionExecutionLogs extends mongoose.Document {
  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SphereSession',
  })
  session_id!: string;

  @Prop({ required: false })
  error?: string;

  @Prop({ required: true })
  log_type: string;

  @Prop({ required: false })
  message: string;

  @Prop({ required: true, type: SessionExecutionLink })
  link!: SessionExecutionLink;

  @Prop({ required: false })
  verbose_error: string;

  @Prop({ required: false, type: Object })
  meta: Record<string, any>;
}

export const SessionExecutionLogsSchema =
  SchemaFactory.createForClass(SessionExecutionLogs);
