# Order identity hotfix

The legacy edit modal retains an order's embedded `id`, which may differ from its Firebase child key. Saves incorrectly used that embedded display ID as the database path, producing a missing-record error even though the visible order existed.

Both edit forms now pass their actual selected record key explicitly. Sales-only and inventory-changing save paths use that key; the embedded ID is preserved. Regression tests cover mismatched IDs, an unrelated record at the embedded-ID path, unchanged stock on address edits and no duplicate records. The cold-cache transaction fix remains enabled.
