import * as mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({
  timestamps: true,
  versionKey: false,
  collection: 'service_notifications',
})
export class ServiceNotifications extends mongoose.Document {
  @Prop({ required: true })
  status: string;

  @Prop({ required: true })
  service_id: string;

  @Prop({ required: false, default: 3 })
  max_no_of_notifications: number;

  @Prop({ required: false, default: 0 })
  successful_notifications_count: number;
}

export const ServiceNotificationsSchema =
  SchemaFactory.createForClass(ServiceNotifications);
