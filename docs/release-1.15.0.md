# Administration 1.15.0 / Moderator 1.4.3

- Manual closing through today, alongside scheduled calendar periods. Partial-day checkpoints exclude already posted records on repeated closes and carry later activity into the next close.
- Closed terminal orders and expenses disappear from current operational lists. Explicit archive selectors restore access; original records and unsettled courier balances remain intact. Open orders carry forward.
- Calendar-month order count on the dashboard and period order count in closing reports.
- Complete Excel city/area picker in admin and moderator, including edit forms: 392 city/area pairs (390 distinct names), searchable across cities, with province/shipping updates on selection.
- Same-day archived campaign expenses remain locked. Legacy snapshots migrate archive markers by recorded IDs without absorbing newly entered backdated movements.

Validation: shared browser/server accounting tests cover monetary totals, migration, manual retries, late activity, pending orders, courier custody and automatic period continuation. Browser fixtures cover actual transactions, archive views, responsive closing UI and region search. Production permissions and physical Android devices were not tested.

Deployment limits: Firebase scheduled function requires deployment credentials; until deployed automatic closing runs on app open. GitHub debug builds require a compatible installed signing certificate. Website webhook integration is not deployed by this release.

EasyOrders integration plan: configure Public API > Webhooks against a deployed authenticated server endpoint; validate the generated secret server-side; deduplicate by store ID and order ID; map product/variant IDs or SKU to inventory; record incoming orders awaiting confirmation. Never embed the webhook secret in the APK or HTML. Reference: https://public-api-docs.easy-orders.net/docs/webhooks
