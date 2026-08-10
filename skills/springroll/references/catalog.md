# MCP catalog

## Tools

| Tool | Purpose | Mode |
|---|---|---|
| `springroll.context` | Acting identity, organization, permissions, runtime readiness | Read |
| `springroll.app.list` | Search or list applications | Read |
| `springroll.app.get` | Application metadata, source, history, status, and grants | Read |
| `springroll.app.update` | Update catalog metadata | Write |
| `springroll.deploy` | Register if needed and deploy to development | Write |
| `springroll.deploy.status` | Refresh deployment state and optionally return logs | Read |
| `springroll.deploy.promote` | Promote an existing artifact to UAT or production | Write |
| `springroll.policy.check` | Validate a manifest or explain policy blockers | Read |
| `springroll.approval.submit` | Submit a human approval request | Write; confirm first |
| `springroll.approval.get` | Read reviewers, decisions, and policy snapshot | Read |
| `springroll.connect.data_products` | Discover governed data products | Read |
| `springroll.connect.request_access` | Request environment-specific field access | Write |
| `springroll.connect.access_status` | Read grant status and approved scope | Read |
| `springroll.app.record_prompts` | Store build transcript turns | Write; confirm first |

Trust the live tool schema over this summary when fields evolve.

## Resources

- `springroll://manifest/example` - canonical example application manifest.
- `springroll://approvals/pending` - approval work assigned to the acting user.
- `springroll://apps/{slug}/provenance` - transcript sessions for an app.
- `springroll://apps/{slug}/provenance/{sessionKey}` - transcript turns in one session.
- `springroll://apps/{slug}/integration-guide/{dataProduct}/{environment}` - generated integration guide for an approved grant.

Use MCP resource-list/read capabilities when available. Resources are read-only.

## Prompts

- `deploy` - guided project deployment.
- `connect-data` - governed enterprise data connection.
- `request-production` - production approval and promotion workflow.

Prompts are optional workflow starters; tools remain authoritative.
