---
name: springroll
description: Operate SpringRoll at springroll.dev, the enterprise application store and deployment control plane, through its complete MCP surface. Use when Codex needs to connect the production SpringRoll server, inspect context, deploy or promote applications, query or update the app catalog, check governance policy, submit or monitor approval requests, discover or request governed data access, read SpringRoll resources, or record build provenance. Uses the production MCP endpoint https://springroll.dev/api/mcp unless the user explicitly names a self-hosted installation.
---

# Operate SpringRoll

Use the production SpringRoll MCP server as the authoritative interface:

- Product: `https://springroll.dev`
- MCP: `https://springroll.dev/api/mcp`
- Documentation: `https://springroll.dev/docs`

Do not substitute a localhost, preview, example, or repository-defined stub endpoint. Use another origin only when the user explicitly identifies a self-hosted SpringRoll installation. Do not substitute the REST API or direct database access for MCP operations.

## Start every workflow

1. Confirm that `springroll.*` tools are available. If absent, read [setup.md](references/setup.md) and connect `https://springroll.dev/api/mcp` using the client's supported MCP configuration flow.
2. Call `springroll.context` first. State the organization and acting identity before any write.
3. Inspect `permissions` and `runtime`. If `runtime.ok` is false, stop deployment work and report `runtime.errors`.
4. Reuse returned IDs and `nextActions`; do not guess identifiers or policy requirements.

SpringRoll is tenant-scoped and audited. Treat the organization returned by context as a hard boundary.

## Route the request

- Deploy, redeploy, inspect build logs, or promote: read [deployment.md](references/deployment.md).
- Find, inspect, or edit an application: read [applications.md](references/applications.md).
- Check policy or work with approvals: read [governance.md](references/governance.md).
- Discover data products, request access, or integrate an approved grant: read [connect.md](references/connect.md).
- Store or read build transcripts: read [provenance.md](references/provenance.md).
- Connect or troubleshoot the production MCP server: read [setup.md](references/setup.md).
- For the complete tool, resource, and prompt inventory: read [catalog.md](references/catalog.md).

Read only the references needed for the current request.

## Safety rules

- Ask immediately before `springroll.approval.submit`; it creates review work for people.
- Never approve or reject an approval. Agents may submit and inspect requests but may not decide them.
- Ask every time before `springroll.app.record_prompts`. Explain that the transcript is stored and readable by everyone who can see the application. Do not record a conversation containing real secrets.
- Prefer read-only tools for diagnosis. Do not mutate an application merely because inspection found a problem.
- Use a stable, unique `idempotencyKey` for each logical deploy, promotion, approval, or access request; reuse it only when retrying the same operation.
- Never invent owners, support contacts, business justification, requested fields, or approval rationale. Ask when missing.
- Never put secrets in manifests, archives, prompts, or tool arguments. SpringRoll returns no secret values.
- Poll asynchronous deployments or requests at sensible intervals and report the terminal state honestly.

## Finish clearly

Report what changed, the application and environment involved, the current state, any URL or request ID returned, and the next human or agent action. Distinguish a submitted request from an approved request and a queued build from a successful deployment.
