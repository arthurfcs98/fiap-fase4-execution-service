# Execution Service — Fase 4 Tech Challenge FIAP

Microsserviço de **execução de OS** — timeline de eventos, notas do mecânico, checklist. Consome `os.saga.execution_started` e publica `execution.saga.completed` quando o mecânico finaliza.

## Responsabilidades

- Escutar `os.saga.execution_started` e criar documento de execução no MongoDB (com checklist inicial)
- Expor API para o mecânico atualizar status / adicionar notas
- Ao marcar `COMPLETED`, publicar `execution.saga.completed` fechando a Saga
- Suportar rollback (`os.saga.compensating` → marca COMPENSATED → publica `execution.saga.compensated`)

## Stack

- **NestJS 10** + TypeScript
- **MongoDB 7** via Mongoose — schema flexível para timeline + checklist livre
- **RabbitMQ** (consumer + publisher)

## Por que MongoDB?

Cada OS gera uma timeline com N eventos (mudanças de status, notas do mecânico, checklists). Cai bem em documento único (evita joins), permite schema flexível conforme os processos internos da oficina evoluem, e o `_id + serviceOrderId` indexados dão consultas O(1). Cumpre também o requisito da Fase 4 de usar **pelo menos 1 NoSQL** na arquitetura.

## Rodando localmente

Da raiz `~/dev/fiap-fase4`:
```bash
docker compose up -d
open http://localhost:3013/api/docs
```

Endpoints:
| Método | Path | Descrição |
|---|---|---|
| GET | `/api/executions` | Lista as 50 execuções recentes |
| GET | `/api/executions/:serviceOrderId` | Timeline completa + checklist |
| PATCH | `/api/executions/:serviceOrderId/status` | Mecânico atualiza status |
| POST | `/api/executions/:serviceOrderId/notes` | Adiciona nota (não muda status) |

Status transitions: `QUEUED → IN_DIAGNOSIS → IN_PROGRESS → COMPLETED` (ou `COMPENSATED`).

## Testes

```bash
npm run test           # 8 testes cobrindo ExecutionService
npm run test:cov       # coverage 80%+
```

Cenários: idempotência do consumer, publish EXECUTION_COMPLETED só em status COMPLETED, rollback, adição de nota sem mudar status, NotFoundException em OS inexistente.

## Deploy K8s

`k8s/deployment.yaml` — Deployment + Service + HPA + Ingress. `MONGODB_URL` via Secret. Uma réplica ativa; a fila do RabbitMQ absorve picos.

## Repositórios relacionados (Fase 4)

- [fiap-fase4-os-service](https://github.com/arthurfcs98/fiap-fase4-os-service)
- [fiap-fase4-billing-service](https://github.com/arthurfcs98/fiap-fase4-billing-service)
- [fiap-fase4-infra-k8s](https://github.com/arthurfcs98/fiap-fase4-infra-k8s)
- [fiap-fase4-infra-db](https://github.com/arthurfcs98/fiap-fase4-infra-db)
