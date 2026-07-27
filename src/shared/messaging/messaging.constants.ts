export const OFICINA_EVENTS_EXCHANGE = 'oficina.events';
export const OFICINA_DLX = 'oficina.dlx';

export const EXECUTION_QUEUES = {
  OS_EVENTS: 'execution.os-events',
} as const;

export const ROUTING_KEYS = {
  // OS publishes (Execution consumes)
  EXECUTION_STARTED: 'os.saga.execution_started',
  COMPENSATING: 'os.saga.compensating',

  // Execution publishes
  EXECUTION_COMPLETED: 'execution.saga.completed',
  EXECUTION_COMPENSATED: 'execution.saga.compensated',
} as const;

export const BINDINGS = {
  OS_EVENTS: ['os.saga.execution_started', 'os.saga.compensating'],
} as const;
