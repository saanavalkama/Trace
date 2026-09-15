## WHAT REDIS BENCHMARK TESTING SHOWS (SINGLE GROUP, SINGLE CONSUMER)
- the latency starts around at 9,000 events/s (from pushing to stream to calling onMessage). If the workload ever got that high adding more consumers for that group would be reasonable. Adding more groups would not affect that issue, since they would independently process all entries. 

## WHAT OUTBOX TAUGHT ME
- Single-instance outbox at a fixed poll interval had bad throughput:
  1000 events would take ~500s. Fixed with multiple parallel lanes that
  each independently claim and process work.
- Two separate safety mechanisms, protecting against two separate risks:
  - Always picking each aggregate's oldest unresolved message first
    (its "head") — protects ORDER, so a newer event for an issue can
    never be processed before an older one for the same issue.
  - Claiming via a conditional update (only succeeds if status/availableAt
    still match what was read) — protects against CONCURRENCY, so two
    lanes can never both process the same message at once.
- availableAt does two jobs: exponential backoff after a genuine
  failure, and a stall timeout (message becomes reclaimable if a lane
  crashes mid-processing without ever marking it done).
- Known limitation: if processing genuinely takes longer than the stall
  timeout (60s) without erroring, a second lane can legitimately
  re-claim and reprocess the same message concurrently — safe for
  idempotent operations, could duplicate array-push fields otherwise.
- Known limitation: once a message permanently fails, that aggregate is
  excluded from further processing entirely (not just delayed) — manual
  resolution required, and resolution means rebuilding the projection
  from full event history, not just retrying the one failed message.

## Optimizations After Outbox-Based Projections
Moving projection updates behind the outbox introduced eventual consistency between writes and the read models. Immediately invalidating and refetching queries after a successful write could therefore return stale projection data, causing the UI to briefly revert before the projection caught up.
To improve read-after-write UX, different strategies are used depending on the data:
Comments, links, and labels use optimistic updates so changes are reflected in the UI immediately.
Links remain projection-backed. Link data is derived from multiple projections, so reconstructing it directly from events would duplicate projection logic. Link queries are therefore not invalidated immediately after a successful mutation. The optimistic state remains visible until the query becomes stale and is refetched, giving the projections time to catch up.
Labels use state derived directly from events where appropriate. Since the event has already been appended when the write completes, current label state can be reconstructed without waiting for the asynchronous projection pipeline.
Comments intentionally deviate from strict CQRS. getComments reconstructs the comment DTOs directly from the event stream rather than reading from a projection. Comment events are available as soon as the write transaction completes, providing read-after-write consistency. This avoids a UI sequence where an optimistic comment appears, disappears after an immediate stale projection fetch, and then reappears once the projection catches up.
This is a deliberate trade-off: projections remain the preferred read model, but for operations where projection lag noticeably harms the user experience, the application uses already-committed event data when doing so is simple and reliable.