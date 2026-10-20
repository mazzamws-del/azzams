# Preparation and moderator editing review

This is a review build, not a production recovery or a completed platform rewrite. No production database reads or writes were performed while implementing these changes.

Implemented:
- Group the actual product model/colour names, normalize Arabic spelling and punctuation, and retain quantities and order references. No fuzzy matching that silently merges different variants.
- Item-level `preparationNote` and `customizationQty`; separate ordinary/customized quantities. Generic order notes and ambiguous inventory identities require review.
- Mobile preparation summary and combined printable summary plus the existing order checklist, gift message and wrapping checks.
- Moderator product additions, removals and quantity edits, with totals and stock differences committed together. Current ownership, status, packing, account and snapshot checks run inside the transaction. Preserve actual database keys and existing item prices; price new products from the transaction snapshot.
- Remove two superseded moderator save implementations; keep unsaved form data after failure and prevent duplicate taps.
- Fail closed on null transaction input and invalid output; protect root branches from removal. These guards do not establish the cause of the earlier data loss.

Validation:
```
node tests/finance.test.cjs
node tests/transactions.test.cjs
node tests/preparation.test.cjs
cd tests/ui
npm install
npx playwright install chromium
npm test
```
Browser tests block external network requests and use a Firebase mock. They cover the actual admin/moderator mobile forms, saved preparation instructions, stock changes, printable grouping and horizontal page overflow. Unit tests cover stock insufficiency, stale snapshots, blocked statuses/ownership, prices, partial customization, actual keys and rollback.

Remaining before production use:
- Test with the real Firebase SDK against an isolated emulator/staging database, including concurrent writes, reconnects and cancelled writes. Mock tests are not a substitute.
- Provision and verify database access rules and a backup/restore process. Frontend guards do not secure a publicly writable database.
- The dormant `AZZAMS_SECURE` server mode requires a matching deployed product-edit endpoint; the new UI explicitly refuses product edits in that mode instead of silently discarding them. The active legacy mode remains the tested path.
- Preparation notes are excluded from courier/label rendering, not protected by a separate database permission boundary in legacy mode.
- Audit remaining legacy creation, closing and inventory write paths as part of the broader system rewrite. Existing features were not indiscriminately deleted.
- No recovery of old production data is claimed. Do not begin entering real replacement data using the review APKs.

## Automatic device backups

The admin review build now captures a complete database JSON snapshot into IndexedDB after startup, every 15 minutes while the application is open/visible, and before monthly closing. It retains the latest 48 changed snapshots plus one snapshot per day for 30 days, subject to available device storage. Payloads and metadata are stored separately so listing backups does not load all data into memory. Empty roots and disappearance of all sales/products are rejected; previous snapshots remain. Closing stops if the required local backup fails. Identical snapshots are reused.

Settings includes last result, snapshot selection and JSON export. Android uses the system document picker to save the exported file outside app storage. Uninstalling/clearing app data or losing the device can lose the automatic local copies. Exports contain private business/customer/account data and must be stored privately.

Cloud backup is NOT activated by installing the APK. Enable native Firebase Realtime Database daily backups in Firebase Console → Realtime Database → Backups (Blaze billing required). The app explicitly labels cloud status as unverified. Official guide: https://firebase.google.com/docs/database/backups . No billing settings, cloud scheduler, rules or production database were changed.

Browser validation: `node tests/ui/backups.cjs` with the same Playwright setup. Tests check automatic capture, persistence after reload, exact JSON export, empty/missing-collection protection, deduplication and retention without writing to Firebase. Native document saving is build-checked; actual device testing remains required.

## 1.17.0 review — lifetime analytics and preparation batches

This update is not a complete platform rewrite. Production data, Firebase rules, billing, cloud backups and courier/moderator APK code are untouched. Do not uninstall an existing app or clear its storage to install this review build.

- Analytics defaults to all available history, including archived sales once; the header distinguishes first/last order from last financial activity. Date presets and custom ranges, cohorts vs event-date finance, monthly trends, products/colours, sources, governors, moderators, couriers, campaigns, customers, expenses and data-quality tabs have paginated search and full-table CSV export. Missing historic data cannot be reconstructed. Missing costs/dates label results provisional. Live courier balances are clearly current, not balances reconstructed at the selected end date.
- Shared reporting now includes return losses in grouped contributions and supports `sellerId` and actual product `commName`. Saved historical closing snapshots remain unchanged.
- Picking and order distribution are separate views and prints. Orders are pinned in additive `preparation_batches` records; new arrivals do not enter an existing batch. Duplicate membership in active batches is rejected. Counts persist in the database and stale revisions are rejected. Pick counts never adjust inventory. Distribution requires all counts complete. Changed order contents/status freeze picking; operators can explicitly cancel after physically returning unallocated pieces, preserving the old batch, then create a new one. Completed batches remain retained.
- The ordinary sales-page preparation action now opens/creates a batch instead of printing a second untracked picking list. Existing gift-message and wrapping distribution details remain available.

Validation: finance, transactions, preparation, lifetime analytics and preparation-batch unit suites; isolated browser suites for admin preparation, analytics/batches, moderator products and local backups. Browser fixtures block external network requests and emulate Firebase; no production database reads or writes occur. Mobile 390px and desktop 1440px layouts checked. Desktop bundler includes both new reporting modules and the batch core.

Remaining production gates: actual Firebase SDK/emulator concurrent-client and reconnect tests, database rules for the new branch, external backup and demonstrated restore, and real-device Android installation/printing. Batch snapshots contain customer/order details and must have admin-only access in rules. The legacy broad root transaction is retained for atomic batch/order checks; this does not solve the entire system's performance/security architecture. There is no claim that cloud backup or a full-system rewrite is complete.
