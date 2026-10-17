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
