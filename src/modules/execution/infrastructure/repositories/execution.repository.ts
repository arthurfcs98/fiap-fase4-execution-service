import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Execution, ExecutionDocument } from '../schemas/execution.schema';
import { ExecutionStatus } from '../../domain/enums/execution-status.enum';

@Injectable()
export class ExecutionRepository {
  constructor(
    @InjectModel(Execution.name)
    private readonly model: Model<ExecutionDocument>,
  ) {}

  async create(data: Partial<Execution>): Promise<ExecutionDocument> {
    const doc = new this.model(data);
    return doc.save();
  }

  async findByServiceOrderId(serviceOrderId: string): Promise<ExecutionDocument | null> {
    return this.model.findOne({ serviceOrderId }).exec();
  }

  async findBySagaId(sagaId: string): Promise<ExecutionDocument | null> {
    return this.model.findOne({ sagaId }).exec();
  }

  async updateStatus(
    serviceOrderId: string,
    status: ExecutionStatus,
    note?: string,
    author?: string,
  ): Promise<ExecutionDocument | null> {
    const update: Record<string, unknown> = {
      status,
      $push: {
        timeline: { status, note, author, at: new Date() },
      },
    };
    if (status === ExecutionStatus.IN_PROGRESS) update.startedAt = new Date();
    if (status === ExecutionStatus.COMPLETED) update.completedAt = new Date();
    return this.model
      .findOneAndUpdate({ serviceOrderId }, update, { new: true })
      .exec();
  }

  async addNote(
    serviceOrderId: string,
    note: string,
    author?: string,
  ): Promise<ExecutionDocument | null> {
    return this.model
      .findOneAndUpdate(
        { serviceOrderId },
        {
          $push: {
            timeline: {
              status: ExecutionStatus.IN_PROGRESS,
              note,
              author,
              at: new Date(),
            },
          },
        },
        { new: true },
      )
      .exec();
  }

  async setSummary(
    serviceOrderId: string,
    summary: string,
  ): Promise<ExecutionDocument | null> {
    return this.model
      .findOneAndUpdate({ serviceOrderId }, { summary }, { new: true })
      .exec();
  }

  async listRecent(limit = 50): Promise<ExecutionDocument[]> {
    return this.model.find().sort({ createdAt: -1 }).limit(limit).exec();
  }
}
