# Governance and approvals

## Policy checks

Call `springroll.policy.check` in exactly one mode:

- Send `manifest` to validate YAML or JSON before creating anything. Read `springroll://manifest/example` for the current shape.
- Send `application` plus the target `environmentType` to explain why an existing app is blocked and obtain remediation.

Treat policy output as authoritative. Do not work around failed gates.

## Approval requests

Supported request types include UAT promotion, UAT sign-off, production promotion, visibility change, ownership transfer, retirement, domain change, and rollback.

1. Inspect application state and policy first.
2. Collect truthful type-specific fields and justification. Rollback and retirement require justification; rollback identifies the target environment and usually the deployment to restore.
3. Ask the user immediately before calling `springroll.approval.submit` because it creates work for named reviewers.
4. Preserve the returned approval request ID.
5. Use `springroll.approval.get` to inspect assignments, decisions, and the submission-time policy snapshot.

An agent may submit and read requests but never decide them. Approval does not itself deploy; call the relevant follow-up tool after approval.
