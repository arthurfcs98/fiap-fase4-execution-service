import { ExecutionService } from '@/modules/execution/application/services/execution.service';
import { ExecutionStatus } from '@/modules/execution/domain/enums/execution-status.enum';

class InMemoryRepo {
  private store = new Map<string, any>();

  async create(data: any) {
    const doc = {
      _id: `exec-${this.store.size + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };
    this.store.set(doc.serviceOrderId, doc);
    return doc;
  }

  async findByServiceOrderId(id: string) {
    return this.store.get(id) ?? null;
  }

  async findBySagaId(sagaId: string) {
    for (const d of this.store.values()) if (d.sagaId === sagaId) return d;
    return null;
  }

  async updateStatus(id: string, status: ExecutionStatus, note?: string) {
    const doc = this.store.get(id);
    if (!doc) return null;
    doc.status = status;
    doc.timeline.push({ status, note, at: new Date() });
    if (status === ExecutionStatus.IN_PROGRESS) doc.startedAt = new Date();
    if (status === ExecutionStatus.COMPLETED) doc.completedAt = new Date();
    return doc;
  }

  async addNote(id: string, note: string) {
    const doc = this.store.get(id);
    if (!doc) return null;
    doc.timeline.push({ status: doc.status, note, at: new Date() });
    return doc;
  }

  async listRecent() {
    return Array.from(this.store.values());
  }
}

class InMemoryRabbitMQ {
  published: Array<{ routingKey: string; payload: any }> = [];
  async publish(routingKey: string, payload: any) {
    this.published.push({ routingKey, payload });
  }
}

describe('ExecutionService', () => {
  let service: ExecutionService;
  let repo: InMemoryRepo;
  let rabbit: InMemoryRabbitMQ;

  beforeEach(() => {
    repo = new InMemoryRepo();
    rabbit = new InMemoryRabbitMQ();
    service = new ExecutionService(repo as any, rabbit as any);
  });

  const event = { sagaId: 'saga-1', serviceOrderId: 'os-1' };

  it('creates execution on EXECUTION_STARTED', async () => {
    await service.handleExecutionStarted(event);
    const doc = await repo.findByServiceOrderId('os-1');
    expect(doc).toBeTruthy();
    expect(doc!.status).toBe(ExecutionStatus.QUEUED);
    expect(doc!.checklist.length).toBeGreaterThan(0);
  });

  it('is idempotent — second EXECUTION_STARTED is a no-op', async () => {
    await service.handleExecutionStarted(event);
    await service.handleExecutionStarted(event);
    const all = await repo.listRecent();
    expect(all).toHaveLength(1);
  });

  it('updateStatus to COMPLETED publishes EXECUTION_COMPLETED', async () => {
    await service.handleExecutionStarted(event);
    await service.updateStatus('os-1', ExecutionStatus.IN_PROGRESS, 'inicio');
    rabbit.published = [];
    await service.updateStatus('os-1', ExecutionStatus.COMPLETED, 'fim');
    expect(rabbit.published[0].routingKey).toBe('execution.saga.completed');
  });

  it('updateStatus to non-COMPLETED does NOT publish', async () => {
    await service.handleExecutionStarted(event);
    rabbit.published = [];
    await service.updateStatus('os-1', ExecutionStatus.IN_DIAGNOSIS);
    expect(rabbit.published).toHaveLength(0);
  });

  it('handleCompensating publishes EXECUTION_COMPENSATED', async () => {
    await service.handleExecutionStarted(event);
    rabbit.published = [];
    await service.handleCompensating('saga-1');
    const doc = await repo.findBySagaId('saga-1');
    expect(doc!.status).toBe(ExecutionStatus.COMPENSATED);
    expect(rabbit.published[0].routingKey).toBe('execution.saga.compensated');
  });

  it('addNote appends to timeline without changing status', async () => {
    await service.handleExecutionStarted(event);
    await service.addNote('os-1', 'Nota do mecânico');
    const doc = await repo.findByServiceOrderId('os-1');
    expect(doc!.timeline).toHaveLength(2);
    expect(doc!.status).toBe(ExecutionStatus.QUEUED);
  });

  it('updateStatus throws NotFoundException when execution missing', async () => {
    await expect(
      service.updateStatus('missing', ExecutionStatus.IN_PROGRESS),
    ).rejects.toThrow(/not found/);
  });

  it('findByServiceOrderId throws NotFoundException when missing', async () => {
    await expect(service.findByServiceOrderId('missing')).rejects.toThrow(
      /not found/,
    );
  });
});
