import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { RabbitMQService } from '@/shared/messaging/rabbitmq.service';
import {
  BINDINGS,
  EXECUTION_QUEUES,
  ROUTING_KEYS,
} from '@/shared/messaging/messaging.constants';
import {
  ExecutionService,
  ExecutionStartedEvent,
} from '../../application/services/execution.service';

@Injectable()
export class OsEventsConsumer implements OnApplicationBootstrap {
  private readonly logger = new Logger(OsEventsConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly executionService: ExecutionService,
  ) {}

  onApplicationBootstrap(): void {
    this.rabbitmq.registerConsumer({
      queue: EXECUTION_QUEUES.OS_EVENTS,
      bindings: [...BINDINGS.OS_EVENTS],
      handle: async (raw, msg) => {
        const routingKey = msg.fields.routingKey;
        const payload = raw as Record<string, unknown>;

        switch (routingKey) {
          case ROUTING_KEYS.EXECUTION_STARTED:
            await this.executionService.handleExecutionStarted(
              payload as unknown as ExecutionStartedEvent,
            );
            break;
          case ROUTING_KEYS.COMPENSATING: {
            const sagaId = (payload as { sagaId?: string }).sagaId;
            if (sagaId) await this.executionService.handleCompensating(sagaId);
            break;
          }
          default:
            this.logger.warn(`Unhandled routing key ${routingKey}`);
        }
      },
    });

    this.logger.log('OsEventsConsumer registered');
  }
}
