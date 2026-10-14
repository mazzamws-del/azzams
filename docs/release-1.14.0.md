# AZZAMS 1.14.0

Interior redesign for desktop and admin mobile: order customer/shipping/payment groups, separate cart and smart paste column, inventory/expense composer beside records, campaign layout, settings section navigation, mobile record cards, staff/courier/settlement/packing panels, and reorganized order-edit modal. Existing DOM controls, IDs and action handlers are retained.

Notification center now has unread/read views, search, individual read/remove, mark-all-read and remove-all. Stable event IDs use monotonic read/dismiss receipts at admin_notification_state, shared by the administration clients. Existing local read receipts migrate to that path. Offline changes remain queued locally, sync failures are visible and retry is available. Event source records are never deleted. Backend access rules for the new receipt path must allow the existing administration client; production permissions were not exercised. The updated clients are required for shared receipt behavior.

Monthly close is a single summary page with a prominent due-period close action, explicit dates and open/closed state, direct review links and separate saved-period history. The button cannot close a period before its configured end. The existing immutable monthly closing engine and schedule are retained; catchup reports success/failure to the interface. Original records and outstanding courier custody remain intact.

Validation: financial core; simulated Firebase browser tests for edit/concurrency, spend accounting and monthly immutable snapshots; 14 interior routes at desktop/mobile widths; individual/bulk mobile status; thermal/gift/portable printing; local notification read/remove/reload; remote receipt survives cleared local cache and event replay, new events remain visible, failed sync retry; due close action and disabled not-yet-due action. No original static HTML IDs removed. No production data changed. Not physically tested on Android.

Existing blockers: original Android signing key unavailable (debug APK cannot be assumed to update installed app); Firebase monthly scheduler not deployed, so closed-app automatic closing remains unavailable.
