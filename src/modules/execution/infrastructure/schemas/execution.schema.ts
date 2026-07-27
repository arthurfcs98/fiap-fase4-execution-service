import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ExecutionStatus } from '../../domain/enums/execution-status.enum';

export type ExecutionDocument = HydratedDocument<Execution>;

@Schema({ _id: false })
export class TimelineEvent {
  @Prop({ required: true, type: String })
  status!: ExecutionStatus;

  @Prop({ type: String })
  note?: string;

  @Prop({ type: String })
  author?: string;

  @Prop({ required: true, type: Date, default: () => new Date() })
  at!: Date;
}
export const TimelineEventSchema = SchemaFactory.createForClass(TimelineEvent);

@Schema({ _id: false })
export class ChecklistItem {
  @Prop({ required: true })
  label!: string;

  @Prop({ default: false })
  done!: boolean;

  @Prop({ type: Date })
  doneAt?: Date;
}
export const ChecklistItemSchema = SchemaFactory.createForClass(ChecklistItem);

@Schema({ collection: 'executions', timestamps: true })
export class Execution {
  @Prop({ required: true, index: true })
  sagaId!: string;

  @Prop({ required: true, unique: true, index: true })
  serviceOrderId!: string;

  @Prop({ required: true, enum: ExecutionStatus, default: ExecutionStatus.QUEUED, index: true })
  status!: ExecutionStatus;

  @Prop({ type: [TimelineEventSchema], default: [] })
  timeline!: TimelineEvent[];

  @Prop({ type: [ChecklistItemSchema], default: [] })
  checklist!: ChecklistItem[];

  @Prop({ type: String })
  mechanicName?: string;

  @Prop({ type: String })
  summary?: string;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;
}
export const ExecutionSchema = SchemaFactory.createForClass(Execution);
