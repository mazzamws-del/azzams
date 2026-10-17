# Administration 1.15.1: order edit hotfix

Firebase RTDB transaction callbacks can receive null or stale local data before the server validates the compare-and-swap. Returning undefined on those provisional values aborted saves with false missing-data/conflict errors, even after a one-shot read.

The shared transaction wrapper now returns the unchanged candidate when validation fails, allowing the server to reject stale hashes and retry with authoritative data. Only a server-confirmed conflict is reported as a conflict. A rejected candidate is never applied, and changes run against a clone so validation failures cannot commit partial mutations. Both sales-only edits and atomic order/inventory changes use this wrapper.

Tests simulate null/stale initial cache, genuine concurrent edits, one stock change across retries, rollback on validation failure, and genuinely absent records. Real Firebase permissions and physical Android installation still require environment verification. This retains 1.15.0 closing and region changes.
