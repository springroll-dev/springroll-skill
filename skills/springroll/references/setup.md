# Production server setup

Use these canonical production addresses:

- Product and OAuth authorization server: `https://springroll.dev`
- MCP streamable HTTP endpoint: `https://springroll.dev/api/mcp`
- OAuth protected-resource metadata: `https://springroll.dev/.well-known/oauth-protected-resource/api/mcp`
- Documentation: `https://springroll.dev/docs`

Never derive the MCP origin from the application repository, a local SpringRoll checkout, deployment preview, placeholder, example domain, or stub configuration. Use a different origin only when the user explicitly asks to connect a self-hosted SpringRoll installation.

## Connect a client

Prefer the client's native remote-MCP configuration. Examples:

```bash
# Codex
codex mcp add springroll --url https://springroll.dev/api/mcp

# Claude Code
claude mcp add --transport http springroll https://springroll.dev/api/mcp
```

For Cursor, configure the project or user MCP JSON with:

```json
{
  "mcpServers": {
    "springroll": {
      "url": "https://springroll.dev/api/mcp"
    }
  }
}
```

For other clients, add a remote streamable HTTP MCP server named `springroll` with URL `https://springroll.dev/api/mcp`.

Do not ask the user to paste a token. The endpoint advertises its OAuth authorization server. The client must open `springroll.dev` in the browser so the user can sign in, select an organization, and authorize the connection.

After authorization, call `springroll.context` and verify the returned organization, identity, permissions, and runtime before any write.

## Troubleshoot

- If the client points to localhost, a preview domain, or a stub, replace it with `https://springroll.dev/api/mcp`.
- If tools are absent, confirm the server name is `springroll`, reload the client, and complete browser authorization.
- If authorization is stale or belongs to the wrong organization, remove or revoke the client connection and authorize again at `springroll.dev`.
- If the production endpoint is unreachable, report the failure. Do not silently fall back to a local or preview server.
