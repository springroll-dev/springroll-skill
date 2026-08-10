# SpringRoll Connect

## Request governed data access

1. Call `springroll.connect.data_products` and select a real product from the returned catalog.
2. Determine the application and environment, the minimum fields required, and a truthful purpose. Never request an entire schema for convenience.
3. Call `springroll.connect.request_access` with a stable idempotency key.
4. Preserve the grant ID and report that access is pending human data-owner review.
5. Poll `springroll.connect.access_status` when asked. Distinguish `REQUESTED`, `APPROVED`, `REJECTED`, `REVOKED`, and `EXPIRED`.
6. On approval, use the approved field list and row scope, which may be narrower than requested.
7. Read `springroll://apps/{slug}/integration-guide/{dataProduct}/{environment}` and implement against the Connect gateway exactly as documented.

No credential is returned. A deployed application accesses data through the gateway, which enforces the approved grant on every request. Never bypass it or widen fields or row filters in client code.
