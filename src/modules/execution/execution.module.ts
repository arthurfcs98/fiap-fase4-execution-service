import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Execution, ExecutionSchema } from './infrastructure/schemas/execution.schema';
import { ExecutionRepository } from './infrastructure/repositories/execution.repository';
import { ExecutionService } from './application/services/execution.service';
import { OsEventsConsumer } from './infrastructure/consumers/os-events.consumer';
import { ExecutionController } from './interfaces/controllers/execution.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Execution.name, schema: ExecutionSchema }]),
  ],
  providers: [ExecutionRepository, ExecutionService, OsEventsConsumer],
  controllers: [ExecutionController],
  exports: [ExecutionService],
})
export class ExecutionModule {}
