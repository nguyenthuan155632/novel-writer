---
type: module
source: apps/api/src/services/queue-client.ts
---

# Module: Queue Client

## Responsibility
BullMQ queue wrappers used by API handlers to enqueue jobs to the worker.

## Source Evidence
`apps/api/src/services/queue-client.ts`

## Queues Wrapped
- `generate-chapter`
- `generate-batch`
- `generate-export`
- `high-stakes-review`

## Depends On
- [[external-services/redis-bullmq]]

## Used By
- [[routes/route-chapters]] — enqueue generate-chapter
- [[routes/route-batches]] — enqueue generate-batch
- [[routes/route-exports]] — enqueue generate-export
- [[routes/route-reviews]] — enqueue high-stakes-review

## Related Flows
- [[flows/job-worker-flow]]
---
type: module
source: apps/api/src/services/queue-client.ts
---

# Module: Queue Client

## Responsibility
BullMQ queue wrappers used by API handlers to enqueue jobs.

## Source Evidence
`apps/api/src/services/queue-client.ts`

## Queues Wrapped
- `generate-chapter`
- `generate-batch`
- `generate-export`
- `high-stakes-review`

## Depends On
- [[external-services/redis-bullmq]]

## Used By
- [[routes/route-chapters]]
- [[routes/route-batches]]
- [[routes/route-exports]]
- [[routes/route-reviews]]

## Related Flows
- [[flows/job-worker-flow]]
