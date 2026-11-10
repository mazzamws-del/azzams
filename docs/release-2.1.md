# 2.1 review

Based on the saved 2.0 admin/moderator assets plus the courier review branch. No production database reads/writes were performed during implementation.

- Monthly report group labels are values under safe generated keys. Existing saved reports remain readable. Closed financial results have their own accountingClosureId; unsettled courier orders remain current and cannot be booked twice.
- Parallel shifts per moderator, own-shift duplicate prevention, migration of legacy singleton without deleting history. Force-close, handover, value/delivery metrics, edits and refreshable current outcomes.
- Replacement orders store price difference/refund independently from SKU prices and prepayments. Actual label states exchange, pickup description and collection/refund. Courier must explicitly confirm pickup before delivery.
- Returned items credited to stock only after admin inspection, with quantities checked against original delivered order and previous recoveries; recovery cost recognized on inspection date. Damaged/uncredited items remain cost. Original sale not rewritten.
- Courier archive, exchange filter, connectivity indicator; complete details in admin courier list. Same safe save/conflict logic remains.

Compatibility: update both admin and all moderator clients before using concurrent shifts; old 2.0 clients do not understand activeByModerator. Existing orders manually recorded as prepaid cannot be inferred or financially rewritten safely: review those explicitly. Old non-versioned exchanges retain their existing amounts until deliberately edited with the new fields.

No server security/authentication migration or database rules deployment is included. Existing secure-mode backend needs separate exchange/shift support and is not enabled. Local backups remain local; external cloud backups are not configured. APK signature/package compatibility and isolated UI tests are checked before delivery; physical Android and live multi-device Firebase testing remain outstanding.
