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