import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RabbitMQService } from '@/shared/messaging/rabbitmq.service';
import { ROUTING_KEYS } from '@/shared/messaging/messaging.constants';
import { ExecutionRepository } from '../../infrastructure/repositories/execution.repository';
import { ExecutionStatus } from '../../domain/enums/execution-status.enum';

export interface ExecutionStartedEvent {
  sagaId: string;
  serviceOrderId: string;
}

@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);

  constructor(
    private readonly repository: ExecutionRepository,
    private readonly rabbitmq: RabbitMQService,
  ) {}

  async handleExecutionStarted(event: ExecutionStartedEvent): Promise<void> {
    const existing = await this.repository.findBySagaId(event.sagaId);
    if (existing) {
      this.logger.warn(
        `Duplicate execution_started for saga ${event.sagaId} — skipping (idempotent)`,
      );
      return;
    }

    await this.repository.create({
      sagaId: event.sagaId,
      serviceOrderId: event.serviceOrderId,
      status: ExecutionStatus.QUEUED,
      timeline: [
        {
          status: ExecutionStatus.QUEUED,
          note: 'Execução criada via evento os.saga.execution_started',
          at: new Date(),
        },
      ],
      checklist: [
        { label: 'Diagnóstico completo', done: false },
        { label: 'Peças confirmadas em estoque', done: false },
        { label: 'Serviço executado', done: false },
        { label: 'Teste final aprovado', done: false },
      ],
    });

    this.logger.log(
      `Execution created for saga ${event.sagaId} (OS ${event.serviceOrderId})`,
    );
  }

  async handleCompensating(sagaId: string): Promise<void> {
    const execution = await this.repository.findBySagaId(sagaId);
    if (!execution) {
      this.logger.warn(`Compensating for unknown saga ${sagaId}`);
      return;
    }

    await this.repository.updateStatus(
      execution.serviceOrderId,
      ExecutionStatus.COMPENSATED,
      'Execução cancelada por rollback da Saga',
    );

    await this.rabbitmq.publish(
      ROUTING_KEYS.EXECUTION_COMPENSATED,
      {
        sagaId,
        serviceOrderId: execution.serviceOrderId,
      },
      { correlationId: sagaId },
    );
  }

  async updateStatus(
    serviceOrderId: string,
    to: ExecutionStatus,
    note?: string,
    author?: string,
  ) {
    const updated = await this.repository.updateStatus(
      serviceOrderId,
      to,
      note,
      author,
    );
    if (!updated) {
      throw new NotFoundException(`Execution for OS ${serviceOrderId} not found`);
    }

    if (to === ExecutionStatus.COMPLETED) {
      await this.rabbitmq.publish(
        ROUTING_KEYS.EXECUTION_COMPLETED,
        {
          sagaId: updated.sagaId,
          serviceOrderId: updated.serviceOrderId,
          summary: updated.summary ?? 'Execução concluída',
        },
        { correlationId: updated.sagaId },
      );
      this.logger.log(
        `Execution ${updated.serviceOrderId} COMPLETED — published execution.saga.completed`,
      );
    }

    return updated;
  }

  async addNote(serviceOrderId: string, note: string, author?: string) {
    const updated = await this.repository.addNote(serviceOrderId, note, author);
    if (!updated) {
      throw new NotFoundException(`Execution for OS ${serviceOrderId} not found`);
    }
    return updated;
  }

  async findByServiceOrderId(serviceOrderId: string) {
    const doc = await this.repository.findByServiceOrderId(serviceOrderId);
    if (!doc) throw new NotFoundException(`Execution for OS ${serviceOrderId} not found`);
    return doc;
  }

  async listRecent(limit = 50) {
    return this.repository.listRecent(limit);
  }
}
